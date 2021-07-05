// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData, orderToRecord, getConversionDataByService} = require('./order-convert');
const moment = require('moment-timezone');

const searchPurchaseOrder = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Get orders
			let keywords = req.body.keywords;
			let field = req.body.field;

			// Get orders from the database
			await conn.connect();

			let orders;
			if (field=='poNum') {

			orders = await conn.query(`SELECT s.*, p.poNo, p.data, p.createdDate, p.type FROM purchaseorder p, suppliers s WHERE p.supplierID = s.id AND p.poNo like "%`+keywords+`%"`);
				console.log(orders);
			}
			
			let orderData = {}; 

			for (let order of orders) {
				if (!orderData.hasOwnProperty(order.store)) orderData[order.store] = [];
				orderData[order.store].push({
					id: order.id,
					data: commonData(order.data, order.store),
					poNo: order.poNo,
					createdDate: order.createdDate,
					type: order.type,
				});
			}
			
			if (!orders.length) {
				httpStatus = 200;
				output.result = 'No PO Number.';
				output.orders = null;
				break;
			}	
	
			output.result = 'success';
			output.orders = orderData;
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

module.exports = searchPurchaseOrder;