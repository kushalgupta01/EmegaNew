// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const {commonData} = require('./order-convert');
const moment = require('moment-timezone');

const getTrackingOrders = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (method == 'get') {
				// Get orders
				var store = req.params.store || null;

				if (!store || !Config.STORES.hasOwnProperty(store)) {
					output.result = 'Invalid store.';
					break;
				}

				// Get orders from the database
				await conn.connect();
				var orders = await conn.query('SELECT o.id, o.store, o.data, o.createdDate, o.salesRecordID, c.type, c.status, c.trackingID, c.packedData FROM collecting c, orders o WHERE c.trackingUploaded = 0 AND c.orderID = o.id AND o.cancelled = 0 AND o.store = '+conn.connection.escape(store) +' ORDER BY o.salesRecordID ASC');

				if (!orders.length) {
					httpStatus = 200;
					output.result = 'No orders.';
					output.orders = null;
					break;
				}

				var orderData = {};
				for (let order of orders) {
					if (!orderData.hasOwnProperty(order.store)) orderData[order.store] = [];
					let packedData = JSON.parse(order.packedData);
					let packedTime = '';
					if (packedData) {
						for (let pacT of packedData)  {
							pacTSplit = pacT.split(' - ');
							if (pacTSplit[2] == 'PACKED' || pacTSplit[2] == 'OVERRIDE') {
								packedTime = pacTSplit[1];
								break;
							}
						}
					}
					orderData[order.store].push({
						id: order.id,
						data: commonData(order.data, order.store),
						trackingID: order.trackingID ? JSON.parse(order.trackingID).slice(-1)[0] : order.trackingID,
						type: order.type,
						status: order.status,
						orderedTime: dateUTCConvert(order.createdDate,'Australia/Sydney'),
						packedTime: packedTime,
					});
				}

				output.orders = orderData;
				output.result = 'success';
				httpStatus = 200;
			}
			else if (method == 'put') {
				// Update orders
				var orderData = req.body.orders || null;

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

				// Get existing tracking data
				let trackingIDData = await conn.query('SELECT orderID, trackingID FROM collecting WHERE orderID IN ('+orderData.map(x => conn.connection.escape(x.id)).join(',')+');');
				let trackingIDs = {};

				try {
					for (let row of trackingIDData) {
						trackingIDs[row.orderID] = JSON.parse(row.trackingID);
					}
				}
				catch (e) {
					httpStatus = 500;
					output.result = 'Invalid tracking data is present in the database for the given orders.';
					break;
				}

				// Update orders in the database
				var transactionResult = await conn.transaction(async function() {
					var errorOccurred = false;
		
					for (let order of orderData) {
						let trackingIDMS = 'NULL';

						if (order.trackingID) {
							// Prepare new tracking data
							let currentTrackingID = order.trackingID.trim();
							let trackingDataNew = [];
							if (trackingIDs[order.id]) {
								for (let tid of trackingIDs[order.id]) {
									if (tid != currentTrackingID) {
										trackingDataNew.push(tid);
									}
								}
							}
							trackingDataNew.push(currentTrackingID);
							trackingIDMS = conn.connection.escape(JSON.stringify(trackingDataNew));
						}

						let result = await conn.query('UPDATE collecting SET trackingID = '+trackingIDMS+' WHERE orderID = '+conn.connection.escape(order.id)+';')
						.catch(err => {
							errorOccurred = err;
						});
	
						if (errorOccurred) {
							httpStatus = 503;
							output.result = 'Could not update database entries.';
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

const dateUTCConvert = function(date, toTimezone) {
	return moment.tz(date, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz(toTimezone).format('YYYY-MM-DD HH:mm:ss');
}

module.exports = getTrackingOrders;
