//  Discount Chemist
//  Order System

const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const orderCreate = async function(req, res, next) {
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

			if (method == 'post') {
				var data = JSON.parse(req.body.data);
				console.log(data);
				var store = req.body.store;
				// var salesRecordID = req.body.salesRecordID;
			}

			// var dataObj = JSON.parse(data);
			// var salesRecordID = dataObj.SalesRecordID;

			await conn.connect();

			// let result = await conn.query('select 1 from orders where store=' + conn.connection.escape(store) + ' and salesRecordID=' +
			// 	conn.connection.escape(salesRecordID));

			// if (result.length > 0) {
			// 	output.result = 'Order exists.';
			// 	break;
			// }
			
			await conn.query('INSERT INTO orders (store, data, addedDate) values ('+ conn.connection.escape(store) + ', ' + conn.connection.escape(JSON.stringify(data)) + ', ' + conn.connection.escape(dateToSql()) + ')');

			output.result = 'success';
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

function dateToSql2() {
	let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    let localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
	return localISOTime.replace('T', ' ').replace('Z', '').slice(0, -4);
}

function dateToSql() {
	return (new Date()).toISOString().replace('T', ' ').replace('Z', '').slice(0, -4);
}

module.exports = orderCreate;