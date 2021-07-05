// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData} = require('./order-convert');
const moment = require('moment-timezone');

const getOrders = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();
	var clientId = req.params.client || null;

	var output = {result: null};
	var httpStatus = 400;

	var startday = new Date();
	startday.setDate(startday.getDate() - 75);
	
	var endday = getDateValue(new Date());
	var startday = getDateValue(startday);
	
	startday = moment.tz(startday, 'YYYYMMDD', Config.TIMEZONE).tz('UTC').format('YYYY-MM-DD')+' 00:00:00';
	
	
	endday = moment.tz(endday+' 23:59:59', 'YYYYMMDD HH:mm:ss', Config.TIMEZONE).format('YYYY-MM-DD')+' 23:59:59';

	try {
		do {
			if (method == 'get') {

				if (!clientId) {
					httpStatus = 500;
					output.result = 'Could not update orders in the database';
					break;
				}

				await conn.connect();

				let sqlStores = "select * from store_clients where client_id = " + clientId;
				let rsStores = await conn.query(sqlStores);
				let store_ids = [];

				for (let store of rsStores) {
					store_ids.push(store.store_id);
				}
				let limit = 50;

				let sql_where = " AND o.store in (" + store_ids.join(",") + ")";

				if (clientId==171) sql_where = ' AND (o.store = 102 OR (o.store = 1 AND LOWER(JSON_EXTRACT(JSON_EXTRACT(o.data,"$.items"),"$[*].sku")) like "%rrv_%"))'
				if (clientId==182) sql_where = ' AND (o.store = 1 AND LOWER(JSON_EXTRACT(JSON_EXTRACT(o.data,"$.items"),"$[*].sku")) like "%pj_%")'
				
				// Get orders from the database

				let latests_orders = await conn.query('SELECT o.id, o.store, o.data, o.deliveryNote FROM orders o WHERE o.sent = 0 AND o.cancelled = 0'
					+ sql_where + ' AND o.id NOT IN (SELECT c.orderID FROM collecting c) order by o.id desc'
				);

				let total_new_orders = await conn.query('SELECT count(o.id) total FROM orders o WHERE o.sent = 0 AND o.cancelled = 0'
					+ sql_where + ' AND o.id NOT IN (SELECT c.orderID FROM collecting c)'
				);

				let latest_collect_orders = await conn.query('SELECT o.id, o.store, o.data, o.deliveryNote FROM orders o inner join collecting c on o.id = c.orderID WHERE  o.cancelled = 0'
					+ ' AND c.status=0 AND o.addedDate >= ' + conn.connection.escape(startday) + ' AND o.addedDate <= ' + conn.connection.escape(endday)
					+ sql_where + 'order by c.id desc'
				);

				let total_collect_orders = await conn.query('SELECT count(o.id) total FROM orders o inner join collecting c on o.id = c.orderID WHERE o.cancelled = 0'
					+ ' AND c.status=0 AND o.addedDate >= ' + conn.connection.escape(startday) + ' AND o.addedDate <= ' + conn.connection.escape(endday)
					+ sql_where
				);

				let latest_collected_orders = await conn.query('SELECT o.id, o.store, o.data, o.deliveryNote FROM orders o inner join collecting c on o.id = c.orderID WHERE  o.cancelled = 0'
					+ ' AND c.status=1 AND o.addedDate >= ' + conn.connection.escape(startday) + ' AND o.addedDate <= ' + conn.connection.escape(endday)
					+ sql_where + 'order by c.id desc'
				);

				let total_collected_orders = await conn.query('SELECT count(o.id) total FROM orders o inner join collecting c on o.id = c.orderID WHERE o.cancelled = 0'
					+ ' AND c.status=1 AND o.addedDate >= ' + conn.connection.escape(startday) + ' AND o.addedDate <= ' + conn.connection.escape(endday)
					+ sql_where
				);

				let total_sent_orders = await conn.query('select count(distinct inv.orderId) total from invoices inv join orders o on inv.orderId = o.id where (1 = 1)'
					+ sql_where
				);

				let total_cost = await conn.query('select sum(inv.totalCost) total from invoices inv join orders o on inv.orderId = o.id where (1 = 1)'
					+ sql_where
				);

				let no_replacements = await conn.query('select count(distinct o.id) total'
					+ ' from invoices inv join orders o on inv.orderId = o.id'
					+ ' join collecting cl on cl.orderID = o.id'
					+ ' where JSON_CONTAINS(parcelWeights, JSON_OBJECT(\'type\', 1))'
					+ sql_where
				);

				let latestOrderData = {};

				for (let order of latests_orders) {
					if (!latestOrderData.hasOwnProperty(order.store)) latestOrderData[order.store] = [];
					latestOrderData[order.store].push({
						id: order.id,
						data: commonData(order.data, order.store),
						deliveryNote: order.deliveryNote,
					});
				}

				let latestCollectOrderData = {};

				for (let order of latest_collect_orders) {
					if (!latestCollectOrderData.hasOwnProperty(order.store)) latestCollectOrderData[order.store] = [];
					latestCollectOrderData[order.store].push({
						id: order.id,
						data: commonData(order.data, order.store),
						deliveryNote: order.deliveryNote,
					});
				}

				let latestCollectedOrderData = {};

				for (let order of latest_collected_orders) {
					if (!latestCollectedOrderData.hasOwnProperty(order.store)) latestCollectedOrderData[order.store] = [];
					latestCollectedOrderData[order.store].push({
						id: order.id,
						data: commonData(order.data, order.store),
						deliveryNote: order.deliveryNote,
					});
				}

				output.total_new_orders = total_new_orders[0].total;
				output.total_collect_orders = total_collect_orders[0].total;
				output.total_collected_orders = total_collected_orders[0].total;
				output.total_sent_orders = total_sent_orders[0].total;
				output.total_cost = total_cost[0].total;
				output.no_replacements = no_replacements[0].total;

				output.latest_orders = latestOrderData;
				output.latest_collect_orders = latestCollectOrderData;
				output.latest_collected_orders = latestCollectedOrderData;
				
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

function getDateValue(date) {
	return date.getFullYear().toString()+('00'+(date.getMonth()+1)).slice(-2)+('00'+date.getDate()).slice(-2);
}

module.exports = getOrders;
