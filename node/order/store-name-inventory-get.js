// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const {userCheckToken} = require('./users-token');
const {commonData, getConversionData} = require('./order-convert');
const moment = require('moment-timezone');

const getStoreNameHasInventory = async function(req, res, next) {
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
			if (method == 'get') {

				await conn.connect();
				let sql = await conn.query("SELECT store FROM `stockinventory` s INNER JOIN inventorylocation i ON s.id = i.invID WHERE store <> 8 and (i.bay like 'EMG-%' or i.bay like 'RS-%') GROUP BY store");
				output.stores = sql;
				output.result = 'success';
				httpStatus = 200;
			}

		
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = JSON.stringify(e);
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

module.exports = getStoreNameHasInventory;
