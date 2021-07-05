// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData} = require('./order-convert');

const getCollectedOrders = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (method == 'get') {
				// Get orders from the database
				await conn.connect();
				let orders = await conn.query('SELECT o.id, o.store, o.data, o.deliveryNote, c.notes, c.status FROM orders o, collecting c WHERE o.cancelled = 0 AND c.orderID = o.id AND (c.status = 1 OR c.status = 19 OR c.status = 20)');

				if (!orders.length) {
					httpStatus = 200;
					output.result = 'No orders.';
					output.orders = null;
					break;
				}

				let orderData = {};

				
				for (let storeID in Config.STORES) {
					orderData[storeID] = [];
				}
				

				for (let order of orders) {
					if (!orderData.hasOwnProperty(order.store)) orderData[order.store] = [];
					orderData[order.store].push({
						id: order.id,
						data: commonData(order.data, order.store),
						notes: order.notes,
						status: order.status,
					});
				}

				output.orders = orderData;
				output.result = 'success';
				httpStatus = 200;
			}
			else {
				output.result = 'wrong method';
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

module.exports = getCollectedOrders;
