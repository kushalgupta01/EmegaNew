// Discount Chemist
// Order System

// Get/update packer from the database

const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData, orderToRecord} = require('./order-convert');
const moment = require('moment-timezone');

const searchPackers = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Get packers
			let keywords = req.body.keywords || null;
			let field = req.body.field;

			// Get packers from the database
			await conn.connect();
			let orders;
			if (field=='name') {
				orders = await conn.query(`SELECT o.*, c.packer, c.packedTime, c.status, c.trackingID, c.type FROM orders o, collecting c WHERE o.id = c.orderID AND c.packer like "%`+keywords+`%"`);
			}

			if (!orders.length) {
				httpStatus = 200;
				output.result = 'No packer.';
				output.orders = null;
				break;
			}	
			let orderData = {};


			for (let order of orders) {
				if (!orderData.hasOwnProperty(order.store)) orderData[order.store] = [];
				orderData[order.store].push({
					// id: order.id,
					data: orderToRecord(order),
					packtime: dateSqlToEbay(order.packedTime, 'Australia/Sydney'),
					packer: order.packer,
					status: order.status,
					trackingID: order.trackingID,
					type: order.type
				});
			}

			output.orders = orderData;
			output.result = 'success';
			httpStatus = 200;
			
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

const dateSqlToEbay = function(date, toTimezone) {
	return moment.tz(date, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz(toTimezone).format('YYYY-MM-DD HH:mm:ss');
}

module.exports = searchPackers;