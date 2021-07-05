// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const {userCheckToken} = require('./users-token');
const {orderToRecord} = require('./order-convert');


const getOrder = async function(req, res, next) {
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
				let store = req.body.store;
				let srn = req.body.salesRecordID || null;
				let dbID = req.body.dataBaseID || null;
				
				await conn.connect();
				
				var sql = 'SELECT * FROM orders WHERE store=' + conn.connection.escape(store) + ' AND ';

				if (srn != null) sql += 'salesRecordID=' + conn.connection.escape(srn);
				else if (dbID != null) sql += 'id=' + conn.connection.escape(dbID);
				
				
				let result = await conn.query(sql);
				
				if (result.length>0) {
					output.result = 'success';
					let order = orderToRecord(result[0])
					order.storeID = result[0].store;
					output.order = order;
					httpStatus = 200;
				}else{
					output.result = 'failed';
				}
				
			}
			else {
				output.result = 'wrong method';
			}
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

module.exports = getOrder;