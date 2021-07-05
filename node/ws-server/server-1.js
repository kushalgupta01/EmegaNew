//  Discount Chemist
//  Order System

const LIVE_ACTIONS = {
	STATUS_CHANGED: 1,
	RECORD_OPENED: 2,
	RECORD_CLOSED: 3,
	RECORD_ALL: 4,
};

const https = require('https');
const fs = require('fs');
const WebSocket = require('uws');

const server = https.createServer({
	//cert: fs.readFileSync('/etc/letsencrypt/live/discountchemist.com.au/fullchain.pem'),
	//key: fs.readFileSync('/etc/letsencrypt/live/discountchemist.com.au/privkey.pem')
});
server.listen(8443);

const wss = new WebSocket.Server({ server });
const pingInterval = 20000;
var userRecordData = new Map();

console.log('Order System websocket server started');


// Messages
wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(data) {
		// Save the data
		userRecordData.set(ws, data);
		console.log(data);
		// Broadcast data to everyone else
		wss.clients.forEach(function each(client) {
			if (client !== ws && client.readyState === WebSocket.OPEN) {
				client.send(data);
			}
		});
	});
	
	ws.on('close', function close() {
		userRecordClosed(ws);
	});

	ws.isAlive = true;
	ws.on('pong', heartbeat);

	// Send all of the data to the client
	ws.send(JSON.stringify({ action: LIVE_ACTIONS.RECORD_ALL, entries: Array.from(userRecordData.values()) }));
});

function userRecordClosed(ws) {
	// Get the data
	var userRecordDataEntry = null;
	try {
		userRecordDataEntry = JSON.parse(userRecordData.get(ws));
	}
	catch (e) {}

	// Delete the data
	userRecordData.delete(ws);

	if (userRecordDataEntry) {
		// Change action
		userRecordDataEntry.action = LIVE_ACTIONS.RECORD_CLOSED;

		// Broadcast record close message to everyone else
		var data = JSON.stringify(userRecordDataEntry);
		wss.clients.forEach(function each(client) {
			if (client !== ws && client.readyState === WebSocket.OPEN) {
				client.send(data);
			}
		});
	}
}


const interval = setInterval(function ping() {
	wss.clients.forEach(function each(ws) {
		if (ws.isAlive === false) {
			// Delete data
			userRecordClosed(ws);
			return ws.terminate();
		}
		ws.isAlive = false;
		ws.ping('', false, true);
	});
}, pingInterval);

function heartbeat() {
	this.isAlive = true;
}
