var dataImported;
var tabUniqueVisitor;
const timeStep_starttimeXnum = 5;
const timeStep_starttimeXcameraIPXnum = 60;

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
		console.log(e);
		j = JSON.parse(e.data)
			if (j.type == "PEOPLE") {
				tabUniqueVisitor = j.people;
				console.log("le truc a choper");
				console.log(j);
				// setPeople(j);
			} else if (j.type == "ALL_DATA") {
				console.log("all data", JSON.stringify(j));
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
				let minmax = processTimeInfo();
				starttimeXnum(minmax.min);
			} else if (j.type == "NEW_IMAGE") {
				console.log(j);
				dataImported.push(j);
				/*{
				name,
				identity,
				cameraIP,
				timestamp,
				}
				 */

			} else {
				console.log("Unrecognized message type: " + j.type);
			}
	}
	socket.onerror = function (e) {
		console.log("Error creating WebSocket connection to " + address);
		console.log(e);
	}
	socket.onclose = function (e) {}
}
createSocket("wss://" + window.location.hostname + ":9000", "Local");

function sortDataByTime(a, b) {
	if (a.time < b.time)
		return -1;
	if (a.time > b.time)
		return 1;
	return 0;
}

function processTimeInfo() {
	let min,
	max;
	dataImported.forEach((x) => {
		x.time = new Date(x.timestamp);
		if (!min || x.time < min)
			min = x.time;
		if (!max || x.time > max)
			max = x.time;
	});
	dataImported.sort(sortDataByTime);
	console.log("min =", min, "max =", max);
	return {min, max}
}

function starttimeXnum(min) {
	// normalize the data to time steps
	let timeStep = timeStep_starttimeXnum,
	timeSteps = [min, min.addMinutes(timeStep)], 
	timeBuckets = {}, 
	curr = 0;
	dataImported.forEach((x) => {
		// skip all intervals that has no data
		while (x.time > timeSteps[curr + 1]) {
			if (!timeBuckets[timeSteps[curr + 1]]) 
				timeBuckets[timeSteps[curr + 1]] = 0;
			curr += 1;
			timeSteps[curr + 1] = timeSteps[curr].addMinutes(timeStep);
		}
		// supposed to be a sure hit
		if (x.time >= timeSteps[curr] && x.time < timeSteps[curr + 1]) {
			if (!timeBuckets[timeSteps[curr]]) 
				timeBuckets[timeSteps[curr]] = 0;
			timeBuckets[timeSteps[curr]] += 1;
		} 
		
	});
	console.log("dataImported, normalized data", timeBuckets);
	return {timeSteps, timeBuckets};
}
