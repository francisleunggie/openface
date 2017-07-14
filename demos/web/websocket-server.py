#!/usr/bin/env python2
#
# Copyright 2015-2016 Carnegie Mellon University
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#	  http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import sys
fileDir = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.join(fileDir, "..", ".."))

import txaio
txaio.use_twisted()

from autobahn.twisted.websocket import WebSocketServerProtocol, \
	WebSocketServerFactory
from twisted.internet import task, defer
from twisted.internet.ssl import DefaultOpenSSLContextFactory

from twisted.python import log

import argparse
import cv2
import imagehash
import json
from PIL import Image
import numpy as np
import os
import StringIO
import urllib
import base64
import time
import datetime
import redis
import pickle
import string
import random

from sklearn.decomposition import PCA
from sklearn.grid_search import GridSearchCV
from sklearn.manifold import TSNE
from sklearn.svm import SVC

import matplotlib as mpl
mpl.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.cm as cm

import openface
from myColors import myColors
myColors.init()

r = redis.StrictRedis(host='localhost', port=6379, db=0)

modelDir = os.path.join(fileDir, '..', '..', 'models')
dlibModelDir = os.path.join(modelDir, 'dlib')
openfaceModelDir = os.path.join(modelDir, 'openface')
# For TLS connections
tls_crt = os.path.join(fileDir, 'tls', 'server.crt')
tls_key = os.path.join(fileDir, 'tls', 'server.key')

parser = argparse.ArgumentParser()
parser.add_argument('--dlibFacePredictor', type=str, help="Path to dlib's face predictor.",
					default=os.path.join(dlibModelDir, "shape_predictor_68_face_landmarks.dat"))
parser.add_argument('--networkModel', type=str, help="Path to Torch network model.",
					default=os.path.join(openfaceModelDir, 'nn4.small2.v1.t7'))
parser.add_argument('--imgDim', type=int,
					help="Default image dimension.", default=96)
parser.add_argument('--cuda', action='store_true')
parser.add_argument('--unknown', type=bool, default=False,
					help='Try to predict unknown people')
parser.add_argument('--port', type=int, default=9000,
					help='WebSocket Port')

args = parser.parse_args()

align = openface.AlignDlib(args.dlibFacePredictor)
net = openface.TorchNeuralNet(args.networkModel, imgDim=args.imgDim,
							  cuda=args.cuda)
							  
colorListLen = len(myColors.colorList)
							  
class Face:

	def __init__(self, rep, identity, name, cameraIP, timestamp):
		self.rep = rep
		self.identity = identity
		self.name = name
		self.cameraIP = cameraIP
		self.timestamp = timestamp

	def __repr__(self):
		return "{{id: {}, rep[0:5]: {}, name: {}, from {} at {}}}".format(
			str(self.identity),
			self.rep[0:5], 
			self.name,
			self.cameraIP,
			datetime.datetime.fromtimestamp(float(self.timestamp)).strftime('%Y-%m-%d %H:%M:%S')
		)	
	
	def jsonify(self):
		repJ = self.rep.tolist()
		j = self.__dict__
		j["rep"] = repJ
		j["name"] = j["name"].encode('ascii', 'ignore')
		j["cameraIP"] = j["cameraIP"].encode('ascii', 'ignore')
		j["timestamp"] = j["timestamp"].encode('ascii', 'ignore')
		return j
		
	def dump(self):
		repJ = self.rep.tolist()
		j = self.jsonify()
		return json.dumps(j)
		
	@classmethod
	def load(cls, j):
		j = json.loads(j)
		j["rep"] = np.array(j["rep"])
		return Face(j["rep"], j["identity"], j["name"], j["cameraIP"], j["timestamp"])
							  
def getI(key):
	val = r.get(key)
	#print("self-images[{}] = {}".format(key, val))
	if val is not None:
		return Face.load(val)
		
def setI(key, val):
	#r.set(key, pickle.dumps(val))			
	r.set(key, val.dump())			
	
def getNumIdentities():
	X = []
	y = []
	keys = r.keys('*')
	for key in keys:
		img = getI(key)
		X.append(img.rep)
		y.append(img.identity)

	numIdentities = len(set(y + [-1])) - 1
	return numIdentities
	
def resyncIdentities():
	y = []
	keys = r.keys('*')
	for key in keys:
		img = getI(key)
		if img.name not in y:
			y.append(img.name)
		img.identity = y.index(img.name)
		setI(key, img)
	return y
	
def getUniqueIdentities():
	numIdentities = getNumIdentities()
	y = ["" for x in range(numIdentities)]
	keys = r.keys('*')
	for key in keys:
		img = getI(key)
		#print("saved face is {}".format(img))
		#print(img.__dict__)
		if img.name not in y: 
			y[img.identity] = img.name
	return y
	

people = resyncIdentities()	
clients = []

class OpenFaceServerProtocol(WebSocketServerProtocol):
	def __init__(self):
		super(OpenFaceServerProtocol, self).__init__()	
		self.images = {}
		self.training = True
		self.svm = None
		if args.unknown:
			self.unknownImgs = np.load("./examples/web/unknown.npy")

	def onConnect(self, request):
		print("Client connecting: {0}".format(request.peer))
		self.training = True
		self.register(request.peer)
		#self.cameraIP = str(request.peer)
		
	def register(self, client):
		if client not in clients:
			print("registered client {}".format(client))
			clients.append(client)

	def unregister(self, client):
		if client in clients:
			print("unregistered client {}".format(client.peer))
			clients.remove(client)	
			
	 def broadcast(self, msg):
		print("broadcasting message '{}' ..".format(msg))
		for c in self.clients:
			c.sendMessage(msg)
			#print("message sent to {}".format(c.peer))
	
	def onOpen(self):
		print("WebSocket connection open.")
		self.sendPeople(people)
		try:
			self.sendAllData()
		except Exception as e:
			print "Error: {}".format(str(e))
		

	def onMessage(self, payload, isBinary):
		raw = payload.decode('utf8')
		msg = json.loads(raw)
		print("Received {} message of length {}.".format(
			msg['type'], len(raw)))
		if msg['type'] == "ALL_STATE":
			self.loadState(msg['images'], msg['training'], msg['people'], msg['cameraIP'])
		elif msg['type'] == "NULL":
			self.sendMessage('{"type": "NULL"}')
		elif msg['type'] == "GET_PEOPLE":
			self.sendPeople(people)
		elif msg['type'] == "FRAME":
			self.processFrame(msg['dataURL'], msg['identity'], msg['cameraIP'], str(time.time()))
			self.sendMessage('{"type": "PROCESSED"}')
		elif msg['type'] == "TRAINING":
			self.training = msg['val']
			if not self.training:
				self.trainSVM()
		elif msg['type'] == "ADD_PERSON":
			newPerson = msg['val'].encode('ascii', 'ignore')
			if newPerson not in people:
				people.append(newPerson)
			print(people)
		elif msg['type'] == "DELETE_PEOPLE":
			toDelete = msg['name']
			print("people is {}".format(people))
			if toDelete in people:
				people.remove(toDelete)
			keys = r.keys('*')
			for hash in keys:
				face = getI(hash)		
				if face.name == toDelete:
					r.delete(hash)
			#resyncIdentities()
			self.sendPeople(people)
		elif msg['type'] == "UPDATE_IDENTITY":
			h = msg['hash'].encode('ascii', 'ignore')
			selfImage = getI(h)
			if selfImage is not None:
				selfImage.identity = msg['idx']
				if not self.training:
					self.trainSVM()
			else:
				print("Image not found.")
		elif msg['type'] == "REMOVE_IMAGE":
			h = msg['hash'].encode('ascii', 'ignore')
			selfImage = getI(h)
			if selfImage is not None:
				r.delete(h)
				if not self.training:
					self.trainSVM()
			else:
				print("Image not found.")
		elif msg['type'] == 'REQ_TSNE':
			self.sendTSNE(msg['people'])
		else:
			print("Warning: Unknown message type: {}".format(msg['type']))

	def onClose(self, wasClean, code, reason):
		unregister(self)
		print("WebSocket connection closed: {0}".format(reason))

	def loadState(self, jsImages, training, jsPeople, jscameraIP):
		self.training = training

		for jsImage in jsImages:
			h = jsImage['hash'].encode('ascii', 'ignore')
			setI(h, Face(np.array(jsImage['representation']),
									jsImage['identity'],
									jsPeople[jsImage['identity']].encode('ascii', 'ignore'),
									jscameraIP,
									str(time.time())))

		for jsPerson in jsPeople:
			if jsPerson not in people:
				people.append(jsPerson.encode('ascii', 'ignore'))

		if not training:
			self.trainSVM()
	
	
	def getData(self):
		X = []
		y = []
		keys = r.keys('*')
		for key in keys:
			img = getI(key)
			X.append(img.rep)
			y.append(img.identity)

		numIdentities = len(set(y + [-1])) - 1
		if numIdentities == 0:
			return None

		if args.unknown:
			numUnknown = y.count(-1)
			numIdentified = len(y) - numUnknown
			numUnknownAdd = (numIdentified / numIdentities) - numUnknown
			if numUnknownAdd > 0:
				print("+ Augmenting with {} unknown images.".format(numUnknownAdd))
				for rep in self.unknownImgs[:numUnknownAdd]:
					# print(rep)
					X.append(rep)
					y.append(-1)

		X = np.vstack(X)
		y = np.array(y)
		return (X, y)

	def sendTSNE(self, people):
		d = self.getData()
		if d is None:
			return
		else:
			(X, y) = d

		X_pca = PCA(n_components=50).fit_transform(X, X)
		tsne = TSNE(n_components=2, init='random', random_state=0)
		X_r = tsne.fit_transform(X_pca)

		yVals = list(np.unique(y))
		colors = cm.rainbow(np.linspace(0, 1, len(yVals)))

		# print(yVals)

		plt.figure()
		for c, i in zip(colors, yVals):
			name = "Unknown" if i == -1 else people[i]
			plt.scatter(X_r[y == i, 0], X_r[y == i, 1], c=c, label=name)
			plt.legend()

		imgdata = StringIO.StringIO()
		plt.savefig(imgdata, format='png')
		imgdata.seek(0)

		content = 'data:image/png;base64,' + \
				  urllib.quote(base64.b64encode(imgdata.buf))
		msg = {
			"type": "TSNE_DATA",
			"content": content
		}
		self.sendMessage(json.dumps(msg))

	def trainSVM(self):
		#print("+ Training SVM on {} labeled images.".format(len(self.images)))
		print("+ Training SVM on labeled images.")
		d = self.getData()
		if d is None:
			self.svm = None
			return
		else:
			(X, y) = d
			numIdentities = len(set(y + [-1]))
			print("numIdentities = {}".format(numIdentities))
			print("x = {}, y = {}".format(len(X),len(y)))
			if numIdentities <= 1:
				return

			param_grid = [
				{'C': [1, 10, 100, 1000],
				 'kernel': ['linear']},
				{'C': [1, 10, 100, 1000],
				 'gamma': [0.001, 0.0001],
				 'kernel': ['rbf']}
			]
			self.svm = GridSearchCV(SVC(C=1), param_grid, cv=5).fit(X, y)
		
	
	
	def comparison(self, identity, phash, rep, cameraIP, timestamp):
		comparison = {}
		# change to looping the whole images arr
		keys = r.keys('*')
		for hash in keys:
			face = getI(hash)		
			rep1 = face.rep
			diff = rep - rep1
			diff = np.dot(diff, diff)
			if face.identity not in comparison:
				comparison[face.identity] = { "diff": diff, "denom": 1}
			else: 
				comparison[face.identity]["diff"] += diff
				comparison[face.identity]["denom"] += 1
		min = 0.8				
		diffs = {}
		for id, calc in comparison.iteritems():
			avgDiff = calc["diff"] / calc["denom"]
			print("diff[{}] = {}".format(id,avgDiff))
			if avgDiff < min:
				min = avgDiff
				identity = id
			
		if identity > -1:
			setI(phash, Face(rep, identity, people[identity], cameraIP, timestamp))
		print("comparison result: identity is {}, min is {}".format(identity, min))
		return identity
		
	def tryTrain(self):
		try:
			self.trainSVM()
		except Exception as e:
			print "Error: {}".format(str(e))
			
	def sendNewImage(self, phash, identity, rep, alignedFace, cameraIP):
		content = [str(x) for x in alignedFace.flatten()]
		msg = {
			"type": "NEW_IMAGE",
			"hash": phash,
			"content": content,
			"identity": identity,
			"representation": rep.tolist(),
			"cameraIP": cameraIP
		}
		self.factory.broadcast(json.dumps(msg))
		#self.sendMessage(json.dumps(msg))
	
	def sendAllData(self):
		y = []
		keys = r.keys('*')
		for hash in keys:
			face = getI(hash)
			face = face.jsonify()
			face["phash"] = hash
			del face["rep"]
			y.append(face)
		msg = {
			"type": "ALL_DATA",
			"data": y
		}
		self.sendMessage(json.dumps(msg))
	
	def sendPeople(self, people):
		msg = {
			"type": "PEOPLE",
			"people": people
		}
		self.sendMessage(json.dumps(msg))
		
	def randomName(self, n=6, chars=string.ascii_uppercase + string.digits):
		return ''.join(random.choice(chars) for _ in range(n))
	
	def processFrame(self, dataURL, identity, cameraIP, timestamp):
		head = "data:image/jpeg;base64,"
		assert(dataURL.startswith(head))
		imgdata = base64.b64decode(dataURL[len(head):])
		imgF = StringIO.StringIO()
		imgF.write(imgdata)
		imgF.seek(0)
		img = Image.open(imgF)

		buf = np.fliplr(np.asarray(img))
		rgbFrame = np.zeros((300, 400, 3), dtype=np.uint8)
		rgbFrame[:, :, 0] = buf[:, :, 2]
		rgbFrame[:, :, 1] = buf[:, :, 1]
		rgbFrame[:, :, 2] = buf[:, :, 0]

		if not self.training:
			annotatedFrame = np.copy(buf)

		# cv2.imshow('frame', rgbFrame)
		# if cv2.waitKey(1) & 0xFF == ord('q'):
		#	  return

		identities = []
		#bbs = align.getAllFaceBoundingBoxes(rgbFrame)
		bb = align.getLargestFaceBoundingBox(rgbFrame)
		bbs = [bb] if bb is not None else []
		#i = 0
		for bb in bbs:
			# print(len(bbs))
			#i = i + 1
			landmarks = align.findLandmarks(rgbFrame, bb)
			alignedFace = align.align(args.imgDim, rgbFrame, bb,
									  landmarks=landmarks,
									  landmarkIndices=openface.AlignDlib.OUTER_EYES_AND_NOSE)
			if alignedFace is None:
				continue

			phash = str(imagehash.phash(Image.fromarray(alignedFace)))
			numIdentities = getNumIdentities()
			pastImage = getI(phash)
			if pastImage is not None:
				identity = pastImage.identity
			else:
				rep = net.forward(alignedFace)
				# print(rep)
				# if self.training:
				if identity == -1:
					if self.svm and identity > 0: 
						# disable this branch
						print("predicting")
						try:
							identity = self.svm.predict(rep)[0]
							print("prediction result: identity is {}".format(identity))
							self.tryTrain()
						except:							
							identity = self.comparison(identity, phash, rep, cameraIP, timestamp)
							self.tryTrain()
					else:
						if numIdentities >= 1:
							identity = self.comparison(identity, phash, rep, cameraIP, timestamp)
							self.tryTrain()
					if identity == -1:
						identity = numIdentities
						identities.append(identity)
						newPerson = "visitor_" + self.randomName(6)
						if newPerson not in people:
							people.append(newPerson)
						setI(phash, Face(rep, identity, newPerson, cameraIP, timestamp))
						print("new identity = {}, new person = {}".format(identity, newPerson))
						self.tryTrain()						
						msg = {
							"type": "NEW_PERSON",
							"hash": phash,
							"identities": identities,
							"newPerson": newPerson,
							"cameraIP": cameraIP
						}
						self.sendMessage(json.dumps(msg))
						# TODO: Transferring as a string is suboptimal.
						# content = [str(x) for x in cv2.resize(alignedFace, (0,0),
						# fx=0.5, fy=0.5).flatten()]
						self.sendNewImage(phash, identity, rep, alignedFace, cameraIP)
					else:
						self.sendNewImage(phash, identity, rep, alignedFace, cameraIP)
				else:
					if len(people) == 0:
						identity = -1
					elif len(people) == 1:
						identity = 0
					elif self.svm:
						print("predicting")
						identity = self.svm.predict(rep)[0]
					else:
						print("hhh")
						identity = -1
					if identity not in identities:
						identities.append(identity)

			if not self.training:
				bl = (bb.left(), bb.bottom())
				tr = (bb.right(), bb.top())
				#cv2.rectangle(annotatedFrame, bl, tr, color=(153, 255, 204),
				bColor = (153, 255, 204)
				if identity != -1:
					bColor = myColors.colorList[identity % colorListLen]
				cv2.rectangle(annotatedFrame, bl, tr, color=bColor,
							  thickness=3)
				for p in openface.AlignDlib.OUTER_EYES_AND_NOSE:
					cv2.circle(annotatedFrame, center=landmarks[p], radius=3,
							   color=(102, 204, 255), thickness=-1)
				if identity == -1:
					if len(people) == 1:
						name = people[0]
					else:
						name = "Unknown"
				else:
					name = people[identity]
					#name = getI(phash).name
				cv2.putText(annotatedFrame, name, (bb.left(), bb.top() - 10),
							cv2.FONT_HERSHEY_SIMPLEX, fontScale=0.75,
							color=(152, 255, 204), thickness=2)

		if not self.training:
			msg = {
				"type": "IDENTITIES",
				"identities": identities
			}
			self.sendMessage(json.dumps(msg))

			plt.figure()
			plt.imshow(annotatedFrame)
			plt.xticks([])
			plt.yticks([])

			imgdata = StringIO.StringIO()
			plt.savefig(imgdata, format='png')
			imgdata.seek(0)
			content = 'data:image/png;base64,' + \
				urllib.quote(base64.b64encode(imgdata.buf))
			msg = {
				"type": "ANNOTATED",
				"content": content,
				"cameraIP": cameraIP
			}
			plt.close()
			self.sendMessage(json.dumps(msg))


def main(reactor):
	log.startLogging(sys.stdout)
	factory = WebSocketServerFactory()
	factory.protocol = OpenFaceServerProtocol
	ctx_factory = DefaultOpenSSLContextFactory(tls_key, tls_crt)
	reactor.listenSSL(args.port, factory, ctx_factory)
	return defer.Deferred()

if __name__ == '__main__':
	task.react(main)
