//  Discount Chemist
//  Order System

// Get order/record IDs from the database for a given list of database IDs
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const getOrderIDs = async function(req, res, next) {
	var conn = new Database(dbconn);
	var dbIDs = req.query.ids || '[]';
	var recordData = req.query.records || '[]';
	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			try {
				dbIDs = JSON.parse(dbIDs);
				recordData = JSON.parse(recordData);
			}
			catch (e) {
				output.result = 'Invalid data.';
				break;
			}

			await conn.connect();

			var orderData = {};

			if (dbIDs.length) {
				let dbIDsArray = [];
				for (let id of dbIDs) {
					dbIDsArray.push(conn.connection.escape(id));
				}

				let orders = await conn.query('SELECT id, store, orderID, salesRecordID FROM orders WHERE id IN ('+dbIDsArray.join(',')+')');

				if (!orders.length) {
					httpStatus = 404;
					output.result = 'Could not find the provided database IDs in the database.';
					break;
				}

				// Get the requested items
				for (let order of orders) {
					orderData[order.id] = {
						store: order.store,
						orderID: order.orderID,
						salesRecordID: order.salesRecordID,
					};
				}
			}

			if (recordData.length) {
				let recordDataArray = [];
				for (let record of recordData) {
					recordDataArray.push('(store = '+conn.connection.escape(record[0])+' AND salesRecordID = '+conn.connection.escape(record[1])+')');
				}

				let orders = await conn.query('SELECT id, store, orderID, salesRecordID FROM orders WHERE '+recordDataArray.join(' OR '));

				if (!orders.length) {
					httpStatus = 404;
					output.result = 'Could not find the provided records in the database.';
					break;
				}

				// Get the requested items
				for (let order of orders) {
					orderData[order.id] = {
						store: order.store,
						orderID: order.orderID,
						salesRecordID: order.salesRecordID,
					};
				}
			}

			output.orders = orderData;
			output.result = 'success';
			httpStatus = 200;
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = getOrderIDs;
