var dataImported;
var tabUniqueVisitor;

function createSocket(address, name) {
	socket = new WebSocket(address);
	socketName = name;
	socket.binaryType = "arraybuffer";
	socket.onopen = function() {
		sentTimes = [];
		receivedTimes = [];
		// tok = defaultTok;
		numNulls = 0

		socket.send(JSON.stringify({'type': 'GET_PEOPLE'}));
		sentTimes.push(new Date());
	}
	socket.onmessage = function(e) {
		console.log(e);
		j = JSON.parse(e.data)
		if (j.type == "PEOPLE") {
			tabUniqueVisitor=j.people;
			console.log("le truc a choper");
			console.log(j);
			// setPeople(j);
		}
		else if (j.type == "ALL_DATA") {
			console.log("all data", JSON.stringify(j));
			/*
				j = {"type":'ALL_DATA',"data": data[object]}
				
object = {
				name,
				identity,
				cameraIP,
				timestamp,
				
		}
			*/
			dataImported= j.data;
			
		} 

		else if (j.type == "NEW_IMAGE") {
			console.log(j);
			dataImported.push(j);
			/*
				name,
				identity,
				cameraIP,
				timestamp,
			*/
			
		} 

		else {
			console.log("Unrecognized message type: " + j.type);
		}
	}
	socket.onerror = function(e) {
		console.log("Error creating WebSocket connection to " + address);
		console.log(e);
	}
	socket.onclose = function(e) {

	}
}
createSocket("wss://" + window.location.hostname + ":9000", "Local");
