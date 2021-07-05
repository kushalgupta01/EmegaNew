const {Config} = require('./config');
const Database = require('./connection');
const request = require('request');
const moment = require('moment-timezone');
const rp = require('request-promise');

const downloadOrdersCatch = async function(req, res, next) {
	var conn = new Database(dbconn);

	var service = req.params.service;
	var store = req.params.store || null;
	var storeAll = false;

	var output = {result: null};
	var httpStatus = 400;

	do {
		if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store)) || store==91) {
			output.result = 'Invalid store.';
			break;
		}

		if (store == 'all') {
			storeAll = true;
		}

		try {
			// Download latest orders
			let orderStores = [];
			let orderData = [];

			for (let storeID in Config.STORES) {
				if ((!storeAll && storeID != store) || Config.STORES[storeID].service != service) continue;
				if (storeID==91) continue;
				orderStores.push(storeID);

				let options = {
				  url: Config.STORES[storeID].url + '/api/orders?' +
					'paginate=false' +
					'&customer_debited=true' +
					'&order_state_codes=SHIPPING' +
					'&sort=dateCreated' +
					'&order=desc'
				  ,
				  headers: {
				    'Content-Type': 'application/json',
				    'Authorization': Config.STORES[storeID].apiKey,
				  }
				};
				
				function callback(error, response, body) {
				   const data = JSON.parse(body);
				   return data.items;
				}

				function getOrders(options) {
					return rp(options).then(body => {
						const data = JSON.parse(body);
						var orders = data.orders ? data.orders : [];
						//
				   		return orders;
					})
				}

				orderData.push(getOrders(options));

				let noOrder = true;

				for  (let orderStoreData of orderData) {
					if (orderStoreData.length > 0) {
						noOrder = false;
					}
				}

				if (noOrder) {
					httpStatus = 404;
					output.result = 'No new orders';
					break;
				}
			}

			// Wait for order data to be retrieved
			orderData = await Promise.all(orderData);
			// Process orders
			let orderDataNew = {};

			for (let i = 0; i < orderStores.length; i++) {
				orderDataNew[orderStores[i]] = [];
				for (let order of orderData[i]) {
					// Add required extra details
					order.orderID = order.order_id;
					order.SalesRecordID = order.order_id;
					order.buyerID = order.customer && order.customer.customer_id ? order.customer.customer_id : '';
					order.createdDate = order.created_date.replace(' ','T').replace('Z','');
					let shippingTotal = 0;
					for (let orderItem of order.order_lines) {
						shippingTotal = shippingTotal + orderItem.quantity;
					}
					order.postage = shippingTotal;
					order.postage_service = order.shipping_type_code;
					order.ShipFullName = order.customer.firstname + ' ' + order.customer.lastname;

					orderDataNew[orderStores[i]].push(order);
				}
			}

			await conn.connect();

			// Check if orders exist in the database
			let ordersInDBWhere = [];
			for (let storeID in orderDataNew) {
				let storeMS = conn.connection.escape(storeID);
				for (let order of orderDataNew[storeID]) {
					ordersInDBWhere.push('(store = '+storeMS+' AND orderID = '+conn.connection.escape(order.orderID)+')');
				}
			}

			let ordersInDB = await conn.query('SELECT id, store, orderID, data FROM orders'+(ordersInDBWhere ? ' WHERE '+ordersInDBWhere.join(' OR ') : ''));
			let orderListDB = {};

			for (let order of ordersInDB) {
				if (!orderListDB[order.store]) orderListDB[order.store] = {};
				orderListDB[order.store][order.orderID] = order.id;
			}


			// Save orders into the database
			let transactionResult = await conn.transaction(async function() {
				var errorOccurred = false;

				saveOrdersLoop:
				for (let storeID in orderDataNew) {
					for (let order of orderDataNew[storeID]) {
						// Check if the order already exists in the database, so not to waste a row ID in the database
						if (!orderListDB[storeID] || !orderListDB[storeID].hasOwnProperty(order.orderID)) {
							let result = await conn.query('INSERT IGNORE INTO orders (store, data, addedDate) VALUES ('+conn.connection.escape(storeID)+','+conn.connection.escape(JSON.stringify(order))+','+conn.connection.escape(dateToSql())+');')
							.catch(err => {
								errorOccurred = err;
							});
						}
	
						if (errorOccurred) {
							httpStatus = 503;
							output.result = 'Could not add entry to database.';
							conn.rollback(errorOccurred);
							break saveOrdersLoop;
						}
					}
				}
				if (errorOccurred) return false;

				var commitResult = await conn.commit();
				if (!commitResult) {
					httpStatus = 503;
					output.result = 'Could not commit transaction';
					return false;
				}
				return true;
			});

			if (transactionResult) {
				httpStatus = 200;
				output.result = 'success';
			}
			else {
				httpStatus = 500;
				output.result = 'Could not add data into the database';
			}

			httpStatus = 200;
			output.result = 'success';
		}
		catch (e) {
			// Error
			httpStatus = 503;
			output.result = e;
			console.log(e);
		}
	} while(0);

	if (conn.connected) conn.release();

	// Output
	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

function dateToSql() {
	return (new Date()).toISOString().replace('T', ' ').replace('Z', '').slice(0, -4);
}

module.exports = downloadOrdersCatch;