// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData, orderToRecord} = require('./order-convert');
const moment = require('moment-timezone');

const searchOrders = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Get orders
			let sku = req.body.sku || null;

			// Get orders from the database
			await conn.connect();
			let orders = await conn.query(`SELECT o.id, o.store, o.data, c.* FROM orders o, collecting c WHERE o.id = c.orderID AND LOWER(JSON_EXTRACT(JSON_EXTRACT(o.data,'$.items'),'$[*].sku')) like "%`+sku+`%"`);
			//let orders = await conn.query(`SELECT o.id, o.store, o.data, c.* FROM orders o, collecting c WHERE o.id = c.orderID AND JSON_CONTAINS(JSON_EXTRACT(JSON_EXTRACT(o.data,'$.items'),'$[*].sku'), like "%`+sku+`%")`);

			if (!orders.length) {
				httpStatus = 200;
				output.result = 'No orders.';
				output.orders = null;
				break;
			}	
			let orderData = {};


			for (let order of orders) {
				if (!orderData.hasOwnProperty(order.store)) orderData[order.store] = [];
				orderData[order.store].push({
					id: order.id,
					data: commonData(order.data, order.store),
					packtime: dateSqlToEbay(order.packedTime, 'Australia/Sydney'),
					status: order.status,
					trackingID: order.trackingID
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

module.exports = searchOrders;