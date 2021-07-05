// Discount Chemist
// Order System

// Mark orders as sent

const {Config} = require('./config');
const Database = require('./connection');
const markOrdersSentEbay = require('./orders-unsent-marksent-ebay');
const markOrdersSentWooCommerce = require('./orders-unsent-marksent-woocommerce');
const markOrdersSentBigCommerce = require('./orders-unsent-marksent-bigcommerce');
const markOrdersSentMagento = require('./orders-unsent-marksent-magento');
const markOrdersSentShopify = require('./orders-unsent-marksent-shopify');
const markOrdersSentNeto = require('./orders-unsent-marksent-neto');
const markOrdersSentCatch = require('./orders-unsent-marksent-catch');

const markOrdersSent = async function(req, res, next) {
	var conn = new Database(dbconn);

	//var store = req.params.store || null;
	var orderListData = req.body.orders || null;
	var updateDBOnly = !!req.body.dbonly;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			await conn.connect();

			/*if (!store || !Config.STORES.hasOwnProperty(store)) {
				output.result = 'Invalid store.';
				break;
			}*/

			let orderListArray = [];
			let orderListDone = [];

			try {
				orderListData = JSON.parse(orderListData);
				for (let entry of orderListData) {
					orderListArray.push(conn.connection.escape(entry));
				}
			}
			catch (e) {
				output.result = 'Invalid order data.';
				break;
			}


			// Get orders from the database
			let orders = await conn.query('SELECT o.id, o.store, o.orderID, c.trackingID FROM orders o LEFT JOIN collecting c ON (o.id = c.orderID) WHERE o.id IN ('+orderListArray.join(',')+') AND o.sent = 0 AND o.cancelled = 0');

			if (!orders.length) {
				httpStatus = 200;
				output.result = 'No orders.';
				break;
			}

			let orderData = {};
			for (let order of orders) {
				if (!orderData.hasOwnProperty(order.store)) orderData[order.store] = [];
				orderData[order.store].push({
					id: order.id,
					orderID: order.orderID,
					trackingID: order.trackingID ? JSON.parse(order.trackingID).slice(-1)[0] : null,
				});
			}


			if (!updateDBOnly) {
				// Mark orders as sent
				let uploadQueue = [];

				for (let storeID in orderData) {
					if (!orderData[storeID].length || !Config.STORES[storeID] || !Config.SERVICES[Config.STORES[storeID].service]) continue;
					let service = Config.STORES[storeID].service;
					let done = false;

					if (service == Config.SERVICE_IDS.EBAY || service == Config.SERVICE_IDS.EBAYAPI) {
						uploadQueue.push(markOrdersSentEbay(storeID, orderData[storeID]));
						done = true;
					}
					else if (service == Config.SERVICE_IDS.AMAZON) {
						done = true;
					}
					else if (service == Config.SERVICE_IDS.WOOCOMMERCE) {
						uploadQueue.push(markOrdersSentWooCommerce(storeID, orderData[storeID]));
						done = true;
					}
					else if (service == Config.SERVICE_IDS.BIGCOMMERCE) {
						uploadQueue.push(markOrdersSentBigCommerce(storeID, orderData[storeID]));
						done = true;
					}
					else if (service == Config.SERVICE_IDS.MAGENTO) {
						uploadQueue.push(markOrdersSentMagento(storeID, orderData[storeID]));
						done = true;
					}
					else if (service == Config.SERVICE_IDS.SHOPIFY) {
						//uploadQueue.push(markOrdersSentShopify(storeID, orderData[storeID]));
						done = true;
					}
					else if (service == Config.SERVICE_IDS.NETO) {
						uploadQueue.push(markOrdersSentNeto(storeID, orderData[storeID]));
						done = true;
					}
					else if (service == Config.SERVICE_IDS.CATCH) {
                        uploadQueue.push(markOrdersSentCatch(storeID, orderData[storeID]));
                        done = true;
                    }
					else if (service == Config.SERVICE_IDS.GROUPON || service == Config.SERVICE_IDS.MYDEAL) {
						done = true;
					}
					else if (service == Config.SERVICE_IDS.NEWSERVICE) {
						done = true;
					}
					else if (service == Config.SERVICE_IDS.KOGAN) {
						done = true;
					}
					/*else {
						output.result = 'Service not supported.';
						break doLoop;
					}*/

					if (done) {
						for (let order of orderData[storeID]) {
							orderListDone.push(order.id);
						}
					}
				}
				//console.log(orderListDone);

				// Wait for queue to finish
				if (uploadQueue.length) await Promise.all(uploadQueue);
			}
			else {
				// Prepare order list for updating the database
				for (let storeID in orderData) {
					if (!Config.STORES[storeID] || !Config.SERVICES[Config.STORES[storeID].service]) continue;
					for (let order of orderData[storeID]) {
						orderListDone.push(order.id);
					}
				}
			}
			httpStatus = 200;
			output.result = 'success';


			if (orderListDone.length) {
				// Set orders as sent in the database
				let result = await conn.query('UPDATE orders SET sent = 1 WHERE id IN ('+orderListDone.join(',')+')');

				if (result.affectedRows == 0) {
					httpStatus = 503;
					output.result = 'Orders do not exist in the database or they have already been marked as sent.';
					break;
				}
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

module.exports = markOrdersSent;
