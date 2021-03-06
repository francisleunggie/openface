
const dateFormat2 = "yyyy-MM-dd h:mtt";

function createSocket(address, name) {
	socket = new WebSocket(address);
	socketName = name;
	socket.binaryType = "arraybuffer";
	socket.onopen = function () {
		sentTimes = [];
		receivedTimes = [];
		// tok = defaultTok;
		numNulls = 0

			socket.send(JSON.stringify({
					'type': 'GET_PEOPLE'
				}));
		sentTimes.push(new Date());
	}
	socket.onmessage = function (e) {
		if (ddebug >= 3) console.log(e);
		j = JSON.parse(e.data)
			if (j.type == "PEOPLE") {
				tabUniqueVisitor = j.people;
				document.getElementById("infoNumber").innerHTML="Number of unique visitor : "+tabUniqueVisitor.length;
				if (ddebug >= 3) console.log("le truc a choper");
				if (ddebug >= 3) console.log(j);
				// setPeople(j);
			} else if (j.type == "ALL_DATA") {
				if (ddebug >= 3) console.log("all data", JSON.stringify(j));
				/*
				j = {"type":'ALL_DATA',"data": data[object]}
				where
				object = {
				name,
				identity,
				cameraIP,
				timestamp
				}
				 */
				dataImported = j.data;
				metadata = processTimeInfo();
				refreshDataCommon();
			} else if (j.type == "NEW_IMAGE") {
				if (ddebug >= 3) console.log(j);
				dataImported.push(j);
				/*{
				name,
				identity,
				cameraIP,
				timestamp,
				}
				 */
				j.time = new Date(parseFloat(j.timestamp) * 1000);
				dataImported.push(j);
				if (metadata.cameraIPs.indexOf(j.cameraIP) === -1) 
					metadata.cameraIPs.push(j.cameraIP);
				if (metadata.visitors.indexOf(j.name) === -1) 
					metadata.visitors.push(j.name);
				refreshDataCommon();
			} else {
				if (ddebug >= 3) console.log("Unrecognized message type: " + j.type);
			}
	}
	socket.onerror = function (e) {
		if (ddebug >= 3) console.log("Error creating WebSocket connection to " + address);
		if (ddebug >= 3) console.log(e);
	}
	socket.onclose = function (e) {}
}


function sortDataByTime(a, b) {
	if (a.time < b.time)
		return -1;
	if (a.time > b.time)
		return 1;
	return 0;
}



function processTimeInfo() {
	let min,
	max, 
	cameraIPs = [],
	visitors = [];
	dataImported.forEach((x) => {
		x.time = new Date(parseFloat(x.timestamp) * 1000);
		if (!min || x.time < min)
			min = x.time;
		if (!max || x.time > max)
			max = x.time;
		if (cameraIPs.indexOf(x.cameraIP) === -1) 
			cameraIPs.push(x.cameraIP);
		if (visitors.indexOf(x.name) === -1) 
			visitors.push(x.name);
	});
	dataImported.sort(sortDataByTime);
	if (ddebug >= 3) console.log("min =", min, "max =", max);
	//if (ddebug >= 3) console.log("sorted data:", JSON.stringify(dataImported));
	return {
		min,
		max,
		cameraIPs,
		visitors
	}
}

function starttimeXnum(min, visitors) {
	// normalize the data to time steps
	let timeStep = timeStep_starttimeXnum,
	next = (new Date(min)).addMinutes(timeStep),
	timeSteps = [min, next],
	timeBuckets = {},
	timeBucketsCount = [],
	engagement = {},
	engagementRaw = {},
	engagementStrengthArr = [],
	engagementStrengths = {},
	engagementFreq = [],
	curr = 0;
	if (ddebug >= 3) console.log("timeSteps=", timeSteps);
	visitors.forEach( (x) => { engagement[x] = []; } );
	dataImported.forEach((x) => {
		if (ddebug >= 3) console.log("x.time =", x.time, "timeSteps[" + curr + "] =", timeSteps[curr], "timeSteps[" + (curr + 1) + "] =", timeSteps[curr + 1]);
		// supposed to be a sure hit
		if (x.time >= timeSteps[curr] && x.time < timeSteps[curr + 1]) {
			if (!timeBuckets[timeSteps[curr]])
				timeBuckets[timeSteps[curr]] = [];
			if (timeBuckets[timeSteps[curr]].indexOf(x.name) === -1)
				timeBuckets[timeSteps[curr]].push(x.name);
		}
		// skip all intervals that has no data
		while (x.time > timeSteps[curr + 1]) {
			if (!timeBuckets[timeSteps[curr + 1]])
				timeBuckets[timeSteps[curr + 1]] = [];
			curr += 1;
			next = (new Date(timeSteps[curr])).addMinutes(timeStep);
			timeSteps[curr + 1] = next;
		}
		engagement[x.name].push(x);
	});
	timeSteps.forEach((x) => {
		let count = timeBuckets[x] ? timeBuckets[x].length : 0;
		timeBucketsCount.push([
			x,//.toString(dateFormat2),
			count
		]);
	});
	visitors.forEach( (x) => {
		let earliest = engagement[x][0].time,
		latest = engagement[x][engagement[x].length-1].time;
		let diff = Math.max(1, Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * timeStep_engagement)));
		if (diff > engagement_threshold) {
			for (let i = 1; i < engagement[x].length; i++) {
				let microDiff = Math.max(1, Math.ceil((engagement[x][i].time.getTime() - engagement[x][i-1].time.getTime()) / (1000 * timeStep_engagement)));
				if (microDiff > engagement_threshold) 
					diff -= microDiff;
			}
		}
		engagement[x] = diff;
		if (!engagementStrengths[engagement[x]]) {
			engagementStrengths[engagement[x]] = 0;
			engagementStrengthArr.push(engagement[x]);
		}
		engagementStrengths[engagement[x]] += 1;
	});
	engagementStrengthArr.sort(function(a, b){return a-b});
	engagementStrengthArr.forEach( (x) => {
		engagementFreq.push([x, engagementStrengths[x]]);
	});
	if (ddebug >= 3) console.log("starttimeXnum, timeSteps", JSON.stringify(timeSteps));
	if (ddebug >= 3) console.log("starttimeXnum, timeBuckets", JSON.stringify(timeBuckets));
	if (ddebug >= 3) console.log("starttimeXnum, timeBucketsCount", timeBucketsCount);
	if (ddebug >= 1) console.log("starttimeXnum, engagementFreq", engagementFreq);
	return {timeBucketsCount, engagementFreq};
}

function starttimeXcameraIPXnum(min, cameraIPs, visitors) {
	// normalize the data to time steps
	let timeStep = timeStep_starttimeXcameraIPXnum,
	next = (new Date(min)).addMinutes(timeStep),
	timeSteps = [min, next],
	timeBuckets = {},
	timeBucketsCount = [],
	engagement = {},
	engagementRaw = {},
	engagementStrengthArrs = {},
	engagementStrengths = {},
	engagementFreq = [],
	curr = 0;
	if (ddebug >= 3) console.log("timeSteps=", timeSteps);
	cameraIPs.forEach( (y) => {
		engagement[y] = {};
		visitors.forEach( (x) => { engagement[y][x] = []; } );
	});
	dataImported.forEach((x) => {
		if (ddebug >= 3) console.log("x.time =", x.time, "timeSteps[" + curr + "] =", timeSteps[curr], "timeSteps[" + (curr + 1) + "] =", timeSteps[curr + 1]);
		// supposed to be a sure hit
		if (x.time >= timeSteps[curr] && x.time < timeSteps[curr + 1]) {
			if (!timeBuckets[timeSteps[curr]]) {
				timeBuckets[timeSteps[curr]] = {};
				cameraIPs.forEach( (y) => {
					timeBuckets[timeSteps[curr]][y] = [];
				});
			}
			if (timeBuckets[timeSteps[curr]][x.cameraIP].indexOf(x.name) === -1)
				timeBuckets[timeSteps[curr]][x.cameraIP].push(x.name);
		}
		// skip all intervals that has no data
		while (x.time > timeSteps[curr + 1]) {
			if (!timeBuckets[timeSteps[curr + 1]]) {
				timeBuckets[timeSteps[curr + 1]] = {};
				cameraIPs.forEach( (y) => {
					timeBuckets[timeSteps[curr + 1]][y] = [];
				});
			}
			curr += 1;
			next = (new Date(timeSteps[curr])).addMinutes(timeStep);
			timeSteps[curr + 1] = next;
		}
		engagement[x.cameraIP][x.name].push(x);
	});
	timeSteps.forEach((x) => {
		cameraIPs.forEach( (y) => {
			let count = timeBuckets[x] && timeBuckets[x][y] ? timeBuckets[x][y].length : 0;
			timeBucketsCount.push([
				y,
				x,//.toString(dateFormat2),
				count
			]);
		});
	});
	cameraIPs.forEach( (y) => {
		engagementStrengths[y] = {};
		engagementStrengthArrs[y] = [];
	});
	cameraIPs.forEach( (cam) => {
		visitors.forEach( (vis) => {
			let diff;
			if (engagement[cam][vis][0]) {
				let earliest = engagement[cam][vis][0].time,
				latest = engagement[cam][vis][engagement[cam][vis].length-1].time;
				diff = Math.max(1, Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * timeStep_engagement)));
				if (diff > engagement_threshold) {
					for (let i = 1; i < engagement[cam][vis].length; i++) {
						let microDiff = Math.max(1, Math.ceil((engagement[cam][vis][i].time.getTime() - engagement[cam][vis][i-1].time.getTime()) / (1000 * timeStep_engagement)));
						if (microDiff > engagement_threshold) 
							diff -= microDiff;
					}
				}
			} else {
				diff = 0;
			}
			engagement[cam][vis] = diff;
			if (!engagementStrengths[cam][diff]) {
				engagementStrengths[cam][diff] = 0;
				engagementStrengthArrs[cam].push(diff);
			}
			engagementStrengths[cam][diff] += 1;
		});
	});
	cameraIPs.forEach( (x) => {
		engagementStrengthArrs[x].sort(function(a, b){return a-b});
	});
	cameraIPs.forEach( (cam) => {
		engagementStrengthArrs[cam].forEach( (strength) => {
			engagementFreq.push([Math.max(0, Math.log(strength)), cam, engagementStrengths[cam][strength]]);
		});
	});
	if (ddebug >= 3) console.log("starttimeXnum, timeSteps", JSON.stringify(timeSteps));
	if (ddebug >= 3) console.log("starttimeXnum, timeBuckets", JSON.stringify(timeBuckets));
	if (ddebug >= 3) console.log("starttimeXmnum, timeBucketsCount", timeBucketsCount);
	if (ddebug >= 1) console.log("starttimeXnum, engagementFreq", engagementFreq);
	return {timeBucketsCount, engagementFreq};
}

/*
dataImported = JSON.parse('[{"name":"visitor_QXPJDB","timestamp":"1500016461.91","phash":"9dbe324e666b2909","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016477.65","phash":"bf00bd42f50b313b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029629.19","phash":"353d70c7cea1e341","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029295.69","phash":"bf3018f656eb8129","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_L6EGR7","timestamp":"1500029699.54","phash":"9f999a5c424d2bc9","cameraIP":"10.143.163.74","identity":2},{"name":"visitor_9YANTL","timestamp":"1500029447.27","phash":"757d3066cc8f81c9","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500029434.94","phash":"3d311276c6eb81e9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029418.01","phash":"7571b2e6cc84c999","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_GMS53B","timestamp":"1500016582.71","phash":"9db80e64e233b731","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_DQ897T","timestamp":"1500029558.07","phash":"b795d667682b3908","cameraIP":"10.143.163.74","identity":4},{"name":"visitor_GMS53B","timestamp":"1500016438.73","phash":"17f804e27813bb5b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_DQ897T","timestamp":"1500029468.45","phash":"353576d6cecf2120","cameraIP":"10.143.163.74","identity":4},{"name":"visitor_QXPJDB","timestamp":"1500029294.66","phash":"3f311af6c669a129","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016569.62","phash":"9db8b664e28a9999","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500016416.09","phash":"3d3f3077646ba049","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016538.84","phash":"8710b4c4632ebbbb","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_9YANTL","timestamp":"1500029720.86","phash":"37358e674cab3149","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500023218.46","phash":"bd301276cee4e1c9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_L6EGR7","timestamp":"1500029707.66","phash":"757172c6cce5c131","cameraIP":"10.143.163.74","identity":2},{"name":"visitor_9YANTL","timestamp":"1500029772.36","phash":"7775fac7cc854041","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_9YANTL","timestamp":"1500029446.0","phash":"353770c7cce1a721","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_GMS53B","timestamp":"1500016485.09","phash":"1d3894ee4532373b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029096.27","phash":"3f31127ec6e9a129","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016447.01","phash":"ad1a24ef02b1bf1a","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029270.84","phash":"3d31327ec6a9a1a9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500023204.28","phash":"3d3570c6e0eba1c9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029325.95","phash":"3d313276e6e981a9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500023163.62","phash":"bdb112fe466b8149","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029734.9","phash":"37359e474ec1b249","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_GMS53B","timestamp":"1500016487.13","phash":"9d58a442a53337bb","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500023219.49","phash":"bdb01af64a6f8149","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029678.9","phash":"3777de4dc6830942","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500029299.36","phash":"3f311af6c6e98129","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500016549.11","phash":"bdb8302ed46ba549","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029443.62","phash":"353770c7cce1b541","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_9YANTL","timestamp":"1500029428.42","phash":"3734ccc66ac9b169","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500016419.15","phash":"9db4387656e181e9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016463.95","phash":"bd02bd026a9f989b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029415.88","phash":"3db13276c4eba149","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500025651.0","phash":"95ba14fac12bc1ad","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500023164.64","phash":"bdb0327ec669a149","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029733.45","phash":"3d3132566ec4e999","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500029702.1","phash":"3f3132f6c66d80c9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029432.87","phash":"3d303a76cee183a9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029698.27","phash":"9f999a5446496acb","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500016548.34","phash":"9db83678a6c12bc5","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029753.27","phash":"37359ec6ccc1e341","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_GMS53B","timestamp":"1500016539.88","phash":"0390b444e3aebbbb","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_9YANTL","timestamp":"1500029755.21","phash":"77f55c0e4cc9b061","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_GMS53B","timestamp":"1500016564.02","phash":"013a7e6e6d23313b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029290.56","phash":"3f311af6c6698169","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016581.7","phash":"9fa80e646b333713","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016573.54","phash":"9db0b66463859d99","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016464.96","phash":"a59a24f5428bbf91","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029695.71","phash":"959d9ed4444ac9ea","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016542.19","phash":"9d18066e4b263f3b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016571.5","phash":"9db0b464e28f9999","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029127.91","phash":"3f31127ee6a9a189","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016490.2","phash":"9d58a44e6632373b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029407.31","phash":"3d30327ce6e9e1a1","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_DQ897T","timestamp":"1500029474.87","phash":"bd393276676320a9","cameraIP":"10.143.163.74","identity":4},{"name":"visitor_9YANTL","timestamp":"1500029426.79","phash":"7735dcc64cc9a149","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_GMS53B","timestamp":"1500016537.82","phash":"9da894ee456e129b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029774.15","phash":"bd31307fc661a389","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500016420.68","phash":"9d9c909c464b6bcb","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016480.93","phash":"5d78046ae523373b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_L6EGR7","timestamp":"1500029758.65","phash":"753370c7cce1c361","cameraIP":"10.143.163.74","identity":2},{"name":"visitor_QXPJDB","timestamp":"1500023102.48","phash":"353370e7c6e9a249","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029718.98","phash":"7735dc4eccc9a141","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500023162.35","phash":"bd3012b656eba169","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016540.66","phash":"0b3834c64b26bbbb","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029429.52","phash":"3d35704ec4eba0cb","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016465.98","phash":"a51a20ff02eb9f91","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016561.07","phash":"e1071ec64b63333b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016541.42","phash":"9db8266663263d39","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_L6EGR7","timestamp":"1500029700.82","phash":"9711ba54464b8deb","cameraIP":"10.143.163.74","identity":2},{"name":"visitor_QXPJDB","timestamp":"1500029116.55","phash":"3db11cfec649a981","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029681.97","phash":"37259e474ccb316a","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_L6EGR7","timestamp":"1500029740.51","phash":"75313256ecc6c5c9","cameraIP":"10.143.163.74","identity":2},{"name":"visitor_QXPJDB","timestamp":"1500016417.62","phash":"bd353077e4e9a089","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016620.46","phash":"9d90a0446f833bfb","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500016547.56","phash":"9db81674a6f1618d","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016615.35","phash":"010efaee47271979","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029437.8","phash":"3d353276c2eba129","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029686.94","phash":"9f919c4e444f69c5","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_L6EGR7","timestamp":"1500029751.72","phash":"75717266ccccc919","cameraIP":"10.143.163.74","identity":2},{"name":"visitor_GMS53B","timestamp":"1500016481.95","phash":"1d38066ee5333739","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029408.36","phash":"3d303856cee9c1e9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016449.12","phash":"bd1224ef02b1bf1a","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016435.33","phash":"f18f2cee52319139","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016619.47","phash":"9d8022466fa3b9f9","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029706.37","phash":"9b99ba54c24d2bc9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029713.41","phash":"97959cf6444a6bc4","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500023160.33","phash":"bd31307ee62ba189","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_R9X5T4","timestamp":"1500029273.16","phash":"0fbbb896ce0dc341","cameraIP":"10.143.163.74","identity":5},{"name":"visitor_QXPJDB","timestamp":"1500029401.4","phash":"3d303af6cae4a169","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016467.01","phash":"a9889ace6d861b9b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_TGRQYA","timestamp":"1500016425.31","phash":"a917b842a95badc9","cameraIP":"10.143.163.74","identity":6},{"name":"visitor_GMS53B","timestamp":"1500016577.63","phash":"5db80ee4e2333339","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016575.58","phash":"1d380a6ee3373339","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GHFAZ4","timestamp":"1500016618.41","phash":"b5b0606462ef999b","cameraIP":"10.143.163.74","identity":7},{"name":"visitor_QXPJDB","timestamp":"1500029118.86","phash":"1db018fed64b83a9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016434.3","phash":"31e38e6666319b39","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500023098.06","phash":"353370e7c4e9e249","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029093.97","phash":"3f31327ee6a9a181","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029742.23","phash":"7771f266cc8e4149","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500016415.33","phash":"3db7307fc4692889","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500023188.55","phash":"3d357276e22ba129","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029696.99","phash":"9f911a7f40cbc9a2","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029680.18","phash":"3735dec7c483014f","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_GMS53B","timestamp":"1500016570.44","phash":"9520b46cc39b9d9b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016583.74","phash":"b5d0a4e6609b9c9b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500023086.04","phash":"bd36305e64ad49b1","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016452.71","phash":"69d6986492cb4dd3","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_DQ897T","timestamp":"1500029763.35","phash":"7775dc4fcc819340","cameraIP":"10.143.163.74","identity":4},{"name":"visitor_L6EGR7","timestamp":"1500029716.17","phash":"7571f2e6cc84c1c9","cameraIP":"10.143.163.74","identity":2},{"name":"visitor_QXPJDB","timestamp":"1500029079.45","phash":"3f311a76c66985a9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029416.94","phash":"757d306ecc9561c1","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500016473.35","phash":"bd903a36424fabc9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016433.54","phash":"39e38e66633199a3","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_TGRQYA","timestamp":"1500016424.53","phash":"15177eeac2e9a189","cameraIP":"10.143.163.74","identity":6},{"name":"visitor_QXPJDB","timestamp":"1500023217.45","phash":"bd35723ee02ba189","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029694.32","phash":"979d9cd6444acbe0","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016472.29","phash":"573854eec522353b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500023205.29","phash":"3d353276e669a129","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500016545.74","phash":"953a30677883e8af","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_DQ897T","timestamp":"1500029464.08","phash":"7575f2c4cf888163","cameraIP":"10.143.163.74","identity":4},{"name":"visitor_GMS53B","timestamp":"1500016580.68","phash":"9fa896646b313713","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016616.38","phash":"9598e064e30b3bdb","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500016462.93","phash":"9d98325e666ba989","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500023101.42","phash":"353370c7c6e9e249","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500016413.81","phash":"bdbd32746bea0089","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029442.36","phash":"353770c6cce1bd41","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_C42QKT","timestamp":"1500029766.42","phash":"3f37f6c0cbab8180","cameraIP":"10.143.163.74","identity":8},{"name":"visitor_QXPJDB","timestamp":"1500023095.75","phash":"3d33b44de6a16b81","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029548.02","phash":"3537dcc7cec8214a","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_GMS53B","timestamp":"1500016565.29","phash":"01b83eee6b333139","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_9YANTL","timestamp":"1500029749.56","phash":"75f55e0e4ccda141","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_9YANTL","timestamp":"1500029709.05","phash":"37759ec7cea16041","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_GMS53B","timestamp":"1500016468.02","phash":"a30898c8ef8e1bbb","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016448.03","phash":"bd0aa4ef02b1bf0a","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029431.84","phash":"3d313a76c6e98169","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500016414.58","phash":"bd353077e669a281","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029768.81","phash":"3d313a56e66d8169","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500023436.66","phash":"bdb01afe466981c9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016476.63","phash":"bd12ac42e51b959b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029438.91","phash":"3d353076e0eba1a9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029272.12","phash":"1db038d6664b8bcb","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016491.22","phash":"9d98ac46e632363b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_TGRQYA","timestamp":"1500016423.51","phash":"ffbf3ac0caa12121","cameraIP":"10.143.163.74","identity":6},{"name":"visitor_QXPJDB","timestamp":"1500023088.9","phash":"3d33746fe6c12a81","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_L6EGR7","timestamp":"1500029689.64","phash":"9f919adc066d6703","cameraIP":"10.143.163.74","identity":2},{"name":"visitor_QXPJDB","timestamp":"1500023096.77","phash":"3d33344fe6c92a91","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500023220.76","phash":"bd313276e629a1a9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029494.5","phash":"35373664cfcc8147","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_9YANTL","timestamp":"1500029618.55","phash":"3735cc4f6ceb8148","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_DQ897T","timestamp":"1500029448.34","phash":"353b3265c6e4619d","cameraIP":"10.143.163.74","identity":4},{"name":"visitor_QXPJDB","timestamp":"1500016459.87","phash":"373833e61ce189a7","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029710.46","phash":"95999ad544cb09eb","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029433.94","phash":"3d303a76c6e981e9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029731.58","phash":"77755e0eccc9a141","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_GMS53B","timestamp":"1500016445.93","phash":"07a01ec7ea39a33d","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029117.81","phash":"3db1147ec64ba9a1","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029730.04","phash":"37359ec6cec1a341","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500029430.52","phash":"3d313276c6e9a1a9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016543.21","phash":"011ebe6e6b26139b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_9YANTL","timestamp":"1500029414.53","phash":"3735d2664ab1a1e9","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500016418.4","phash":"3d373076e46ba0c9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029691.73","phash":"9dbbb05e44432ec9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029723.74","phash":"3735cccfccc9b041","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_GMS53B","timestamp":"1500016479.9","phash":"1f3806e847b13f39","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029444.89","phash":"353770e7cce1a701","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500016546.51","phash":"b53c706e30c369c7","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029717.7","phash":"77355e0eccc9a161","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500029693.04","phash":"9d9d9ed4444a4be2","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016617.4","phash":"b790e06c6a8b19bb","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_9YANTL","timestamp":"1500029747.86","phash":"75f5f066cc8d21c1","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_DQ897T","timestamp":"1500029495.76","phash":"3537be44cf8c8147","cameraIP":"10.143.163.74","identity":4},{"name":"visitor_GMS53B","timestamp":"1500016482.97","phash":"9d38846e67323739","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016568.6","phash":"011f7e6e4b23313b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500023090.95","phash":"3d33346fe6c12a51","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016488.15","phash":"9d58a462e52237bb","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500016419.92","phash":"bdb4387666e18169","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029727.66","phash":"7775d6c7cc816148","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_9YANTL","timestamp":"1500029441.09","phash":"353f30e6cce3b501","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_GMS53B","timestamp":"1500016432.51","phash":"e10f3ececcc19b21","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_DQ897T","timestamp":"1500029503.97","phash":"353376c4ceec6903","cameraIP":"10.143.163.74","identity":4},{"name":"visitor_QXPJDB","timestamp":"1500016458.85","phash":"37b833e63c63e109","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029704.82","phash":"bdb1187664efa049","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016471.22","phash":"9daa94eac5223733","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_9YANTL","timestamp":"1500029421.66","phash":"353db066cc85e1e9","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_9YANTL","timestamp":"1500029746.44","phash":"75f55c0e4c9ba149","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500029703.4","phash":"9f999a5c424d6b89","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029478.81","phash":"bdb1127ec06ba1c9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016444.41","phash":"05b81ee67833b339","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016572.52","phash":"bdb8b4e4e2819999","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500016544.98","phash":"953e704778c3c82f","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500023187.53","phash":"3d357256e6a9a189","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016470.12","phash":"17aabc47e01b15b9","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029095.01","phash":"3f3112fec669a129","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029619.95","phash":"37359cc7cccba148","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500016555.0","phash":"9badd05cb60b29e1","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500016416.86","phash":"3d37307ee46ba089","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016556.02","phash":"01e0e66c6e8b99db","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029714.74","phash":"9711bedf44ca89c2","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029439.99","phash":"3d377066e8e3a1a1","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029129.17","phash":"3f3112fee629a189","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016486.11","phash":"9d1894cec56e163b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029400.13","phash":"3db11a76c66981e9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_9YANTL","timestamp":"1500029477.43","phash":"9d9f905c42436bcb","cameraIP":"10.143.163.74","identity":3},{"name":"visitor_QXPJDB","timestamp":"1500016457.83","phash":"b518765c66c129cf","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016443.39","phash":"15a81ce6f813b979","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_L6EGR7","timestamp":"1500029738.89","phash":"f5f7f06ecc8d0081","cameraIP":"10.143.163.74","identity":2},{"name":"visitor_QXPJDB","timestamp":"1500023161.34","phash":"bdb1107ee66ba109","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500023100.37","phash":"353370c7e4e9e249","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029712.01","phash":"959d9ad5444ae9e2","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029476.15","phash":"8d9658d64c4b8b6b","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029436.53","phash":"3d353276c669a1a9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016483.99","phash":"1da814ea55a237bb","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_DQ897T","timestamp":"1500029451.48","phash":"353572e4c5cbd149","cameraIP":"10.143.163.74","identity":4},{"name":"visitor_QXPJDB","timestamp":"1500016413.04","phash":"999b94695b94cac9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029688.35","phash":"9f999e564c4329c3","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016574.56","phash":"9db8366443a79999","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029502.69","phash":"35377644c2e5e943","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016469.04","phash":"07a894eac7a43fb1","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029296.96","phash":"3db038f646ed8169","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016460.89","phash":"e13ac6ee4c63303b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500023088.1","phash":"3d33746fe6c12a41","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016579.66","phash":"9fb80e646b313731","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016441.84","phash":"952af50af817a91b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500023089.92","phash":"3d33346fe6c12ac1","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500029770.45","phash":"3d31305ee46fc0e9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016475.76","phash":"bd1aa44ae50a3db3","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_QXPJDB","timestamp":"1500029406.04","phash":"3d30307ce6e9a1b9","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_QXPJDB","timestamp":"1500023099.08","phash":"353370c7cee9e209","cameraIP":"10.143.163.74","identity":0},{"name":"visitor_GMS53B","timestamp":"1500016478.75","phash":"1fe815e857223733","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_GMS53B","timestamp":"1500016578.64","phash":"9db8a6e462333393","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_L6EGR7","timestamp":"1500029761.75","phash":"77759cc7cca96041","cameraIP":"10.143.163.74","identity":2},{"name":"visitor_GMS53B","timestamp":"1500016489.18","phash":"9f18846e6632373b","cameraIP":"10.143.163.74","identity":1},{"name":"visitor_DQ897T","timestamp":"1500029450.4","phash":"7535f6e4cfc80123","cameraIP":"10.143.163.74","identity":4},{"name":"visitor_GMS53B","timestamp":"1500016576.61","phash":"5db85ee442363633","cameraIP":"10.143.163.74","identity":1}]');

metadata = processTimeInfo();
refreshDataCommon();
*/

