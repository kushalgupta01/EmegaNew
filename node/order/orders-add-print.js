// Discount Chemist
// Order System

// Mark orders as sent

const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');
const {getConversionData, getField} = require('./order-convert');

const addOrdersPrint = async function(req, res, next) {
	var conn = new Database(dbconn);
	var orderListData = req.body.orders || null;
	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	let date = new Date();
	let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');

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
			let user = await userCheckToken(token, true);
			
			let orderList = {};
			let orderListArray = [];
			let orderListStr;

			try {
				orderListData = JSON.parse(orderListData);
				for (let entry of orderListData) {
					orderList[entry] = true;
					orderListArray.push(conn.connection.escape(entry));
				}
			}
			catch (e) {
				output.result = 'Invalid order data.';
				break;
			}

			orderListStr = orderListArray.join(',');

			// Get orders from the database
			await conn.query('UPDATE collecting SET status = 12 WHERE orderID IN ('+orderListStr+')');

			for (let order of orderListArray){
				await conn.query('INSERT INTO translogs(orderId, field, oldValue, newValue, actionBy, actionTime) VALUES ('
											+ order + ','
											+ conn.connection.escape('status') + ','
											+ conn.connection.escape('Collected') + ','
											+ conn.connection.escape('Ready to print') + ','
											+ conn.connection.escape(user.username) + ','
											+ conn.connection.escape(date2) + ')');
			}

			httpStatus = 200;
			output.result = 'success';
		
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

module.exports = addOrdersPrint;
