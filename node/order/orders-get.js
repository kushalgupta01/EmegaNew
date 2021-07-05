// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData} = require('./order-convert');

const getOrders = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (method == 'get') {
				// Get orders
				let store = req.params.store || null;
				let storeAll = false;

				if (!store || (store != 'all' && store != 'bigcommerce' && store != 'habitania' && store != 'catwalk' && store != 'rrv'  && store != 'paco' && store != 'atpack' && !Config.STORES.hasOwnProperty(store))) {
					output.result = 'Invalid store.';
					break;
				}

				if (store == 'all') {
					storeAll = true;
				}

				let bigcommerce_store_ids = Config.SUPPLIERS[Config.SUPPLIER_IDS.COMBINEDGROUP].stores;
				let habitania_store_ids = Config.SUPPLIERS[Config.SUPPLIER_IDS.Habitania].stores;
				let catwalk_store_ids = Config.SUPPLIERS[Config.SUPPLIER_IDS.CATWALK].stores;
				let rrv_store_ids = Config.SUPPLIERS[Config.SUPPLIER_IDS.RRV].stores;
				let atpack_store_ids = Config.SUPPLIERS[Config.SUPPLIER_IDS.ATPACK].stores;

				let sql_where = '';
				if (!storeAll) {
					if (store == 'bigcommerce') {
						sql_where = ' AND o.store in (' + bigcommerce_store_ids.join(',') + ')';
					} else if (store == 'habitania') {
						sql_where = ' AND o.store in (' + habitania_store_ids.join(',') + ')';
					} else if (store == 'catwalk') {
						sql_where = ' AND o.store in (' + catwalk_store_ids.join(',') + ')';
					} else if (store == 'rrv') {
						sql_where = ' AND (o.store = 102 OR (o.store = 1 AND LOWER(JSON_EXTRACT(JSON_EXTRACT(o.data,"$.items"),"$[*].sku")) like "%rrv_%"))';
					} else if (store == 'atpack') {
						sql_where = ' AND o.store in (' + atpack_store_ids.join(',') + ')';
					} else if (store == 'paco') {
						sql_where = ' AND (o.store = 1 AND LOWER(JSON_EXTRACT(JSON_EXTRACT(o.data,"$.items"),"$[*].sku")) like "%pj_%")';
					} else {
						sql_where = ' AND o.store = ' + conn.connection.escape(store);
					}
				}
				// Get orders from the database
				await conn.connect();
				let orders = await conn.query('SELECT o.id, o.store, o.data, o.deliveryNote FROM orders o WHERE o.sent = 0 AND o.cancelled = 0'
					+ sql_where + ' AND o.id NOT IN (SELECT c.orderID FROM collecting c)'
				);

				if (!orders.length) {
					httpStatus = 200;
					output.result = 'No orders.';
					output.orders = null;
					break;
				}

				let orderData = {};

				if (storeAll) {
					for (let storeID in Config.STORES) {
						orderData[storeID] = [];
					}
				}

				for (let order of orders) {
					if (!orderData.hasOwnProperty(order.store)) orderData[order.store] = [];
					orderData[order.store].push({
						id: order.id,
						data: commonData(order.data, order.store),
						deliveryNote: order.deliveryNote,
					});
				}

				output.orders = orderData;
				output.result = 'success';
				httpStatus = 200;
			}
			else if (method == 'put') {
				// Update orders
				let orderData = req.body.orders || null;

				try {
					orderData = JSON.parse(orderData);
				}
				catch (e) {
					orderData = null;
				}

				if (!orderData || !orderData.length) {
					output.result = 'Invalid order data';
					break;
				}


				await conn.connect();

				// Get order conversion data
				let orderStoreData = await conn.query('SELECT id, store FROM orders WHERE id IN ('+orderData.map(x => conn.connection.escape(x.id)).join(',')+')');
				let orderStores = {};
				for (let order of orderStoreData) {
					orderStores[order.id] = order.store;
				}

				// Update orders in the database
				let transactionResult = await conn.transaction(async function() {
					var errorOccurred = false;
		
					for (let order of orderData) {
						// Prepare query data
						let replaceData = [];

						// ID
						let orderID = order.id;
						delete order.id;

						// Delivery note
						let deliveryNote = order.deliveryNote;
						delete order.deliveryNote;

						// Order data fields
						let CD = getConversionData(orderStores[orderID]);
						for (let field in order) {
							replaceData.push(conn.connection.escape('$.'+(Array.isArray(CD[field]) ? CD[field].join('.') : CD[field])), conn.connection.escape(order[field]));
						}

						let result = await conn.query('UPDATE orders SET data = JSON_REPLACE(data, '+replaceData.join(',')+'), deliveryNote = '+(deliveryNote ? conn.connection.escape(deliveryNote) : 'NULL')+' WHERE id = '+conn.connection.escape(orderID)+';')
						.catch(err => {
							errorOccurred = err;
						});
	
						if (errorOccurred) {
							httpStatus = 503;
							output.result = 'Could not add entry to database.';
							conn.rollback(errorOccurred);
							break;
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
					output.result = 'Could not update orders in the database';
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

module.exports = getOrders;
