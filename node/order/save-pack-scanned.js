//  Discount Chemist
//  Order System

const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const savePackScanned = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

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

			await conn.connect();
			
			var orderID = req.body.orderID;
			var lineitemid = req.body.lineitemid;
			var qty = req.body.qty;
			var type = req.body.type;

			let oldScanned = await conn.query('SELECT packScanned from collecting WHERE orderID = ' + orderID);

			if (oldScanned.length>0) {
				oldScanned = oldScanned[0].packScanned;
				if (oldScanned) {
					oldScanned = JSON.parse(oldScanned);
				} else {
					oldScanned = {};
				}

				if (oldScanned[lineitemid]) {
					oldScanned[lineitemid][type] = qty;
				} else {
					oldScanned[lineitemid] = {};
					oldScanned[lineitemid][type] = qty;
				}

				await conn.query('UPDATE collecting SET packScanned = '+conn.connection.escape(JSON.stringify(oldScanned)) + ' WHERE orderID = ' + orderID);

			} else {
				output.result = 'Orders not found.';
				break;
			}

			output.result = 'success';
			output.data = await conn.query('SELECT packScanned FROM collecting WHERE orderID = ' + orderID);
			httpStatus = 200;
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
		console.log(e);
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = savePackScanned;
