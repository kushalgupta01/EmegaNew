// Discount Chemist
// Order System

// Get unsent orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const {commonData} = require('./order-convert');

const getUnsentOrders = async function(req, res, next) {
	var conn = new Database(dbconn);
	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Get unsent orders
			let store = req.params.store || null;
			let storeAll = false;

			if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store))) {
				output.result = 'Invalid store.';
				break;
			}
	
			if (store == 'all') {
				storeAll = true;
			}

			// Get unsent orders from the database
			await conn.connect();
			let orders = await conn.query('SELECT o.id, o.store, o.data, o.deliveryNote, c.status, c.trackingID FROM orders o, collecting c WHERE '+(!storeAll ? 'o.store = '+conn.connection.escape(store)+' AND ' : '')+'o.sent = 0 AND o.cancelled = 0 AND o.id = c.orderID');

			if (!orders.length) {
				httpStatus = 200;
				output.result = 'No unsent orders.';
				output.orders = null;
				break;
			}

			let orderData = {};
			for (let order of orders) {
				if (!orderData.hasOwnProperty(order.store)) orderData[order.store] = [];
				orderData[order.store].push({
					id: order.id,
					data: commonData(order.data, order.store),
					deliveryNote: order.deliveryNote,
					status: order.status,
					trackingID: order.trackingID ? JSON.parse(order.trackingID).slice(-1)[0] : order.trackingID,
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

module.exports = getUnsentOrders;
