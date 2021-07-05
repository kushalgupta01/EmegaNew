// Discount Chemist
// Order System

// Upload order tracking details

const {Config} = require('./config');
const Database = require('./connection');
const uploadTrackingEbay = require('./orders-tracking-upload-ebay');
const uploadTrackingWooCommerce = require('./orders-tracking-upload-woocommerce');
const uploadTrackingBigCommerce = require('./orders-tracking-upload-bigcommerce');
const uploadTrackingMagento = require('./orders-tracking-upload-magento');
const uploadTrackingNeto = require('./orders-tracking-upload-neto');
const uploadTrackingCatch = require('./orders-tracking-upload-catch');
const uploadTrackingShopify = require('./orders-tracking-upload-shopify');
const uploadTrackingKogan = require('./orders-tracking-upload-kogan');

const uploadTracking = async function(req, res, next) {
	var conn = new Database(dbconn);

	//var store = req.params.store || null;
	var orderListData = req.body.orders || null;
	var updateDBOnly = !!req.body.dbonly;

	var output = {result: null};
	var httpStatus = 400;

	try {
		doLoop:
		do {
			await conn.connect();

			/*if (!store || !Config.STORES.hasOwnProperty(store)) {
				output.result = 'Invalid store.';
				break;
			}*/

			var orderListArray = [];
			var orderListDone = [];

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
			var orders = await conn.query('SELECT o.id, o.store, o.data, o.orderID, c.trackingID FROM collecting c, orders o WHERE c.orderID IN ('+orderListArray.join(',')+') AND c.trackingUploaded = 0 AND c.orderID = o.id');

			if (!orders.length) {
				httpStatus = 200;
				output.result = 'No orders.';
				break;
			}

			var orderData = {};
			for (let order of orders) {
				if (!orderData.hasOwnProperty(order.store)) orderData[order.store] = [];
				let trackingID = order.trackingID ? JSON.parse(order.trackingID).slice(-1)[0] : null;

				

				if ( Config.STORES[order.store].service==Config.SERVICE_IDS['BIGCOMMERCE']) {
					let data = JSON.parse(order.data);
					let shipping_address_id = data.shipping_address.id;
					let items = data.items;
					let itemsData = [];
					for (let item of items) {
						let itemData = {};
						itemData['order_product_id'] = item.id;
						itemData['quantity'] = item.quantity;
						itemsData.push(itemData);
					}

					orderData[order.store].push({
						id: order.id,
						orderID: order.orderID,
						trackingID: trackingID,
						postageCourier: getPostageCourier(Config.STORES[order.store].service, trackingID),
						shipping_address_id: shipping_address_id,
						itemsData: itemsData,
					});

				}else if ( Config.STORES[order.store].service==Config.SERVICE_IDS['NETO']) {
					let data = JSON.parse(order.data);
					let items = data.OrderLine;
					let skus = [];
					for (let item of items) {
						skus.push(item.SKU);
					}

					orderData[order.store].push({
						id: order.id,
						orderID: order.orderID,
						trackingID: trackingID ? trackingID : (order.type==3 ? 'Flatpack' : 'Dispatched'),
						postageCourier: data.ShippingOption,
						skus: skus,
					});

				}else if ( Config.STORES[order.store].service==Config.SERVICE_IDS['KOGAN']) {
					let data = JSON.parse(order.data);
					let items = data.Items;
					let itemsData = [];
					for (let item of items) {
						let itemData = {};
						itemData['sku'] = item.SellerSku;
						itemData['quantity'] = item.Quantity;
						itemsData.push(itemData);
					}

					orderData[order.store].push({
						id: order.id,
						salesRecordID: order.salesRecordID,
						orderID: order.orderID,
						trackingID: trackingID,
						postageCourier: getPostageCourier(Config.STORES[order.store].service, trackingID),
						itemsData: itemsData,
					});

				}else{
					orderData[order.store].push({
						id: order.id,
						orderID: order.orderID,
						trackingID: trackingID,
						postageCourier: getPostageCourier(Config.STORES[order.store].service, trackingID),
					});
				}
			}


			if (!updateDBOnly) {
				// Upload tracking details
				let uploadQueue = [];

				for (let storeID in orderData) {
					if (!orderData[storeID].length || !Config.STORES[storeID] || !Config.SERVICES[Config.STORES[storeID].service]) continue;
					let service = Config.STORES[storeID].service;
					let done = false;

					if (service == Config.SERVICE_IDS.EBAY) {
						uploadQueue.push(uploadTrackingEbay(storeID, orderData[storeID]));
						done = true;
					}
					/*else if (service == Config.SERVICE_IDS.AMAZON) {
						done = true;
					}*/
					else if (service == Config.SERVICE_IDS.WOOCOMMERCE) {
						uploadQueue.push(uploadTrackingWooCommerce(storeID, orderData[storeID]));
						done = true;
					}
					else if (service == Config.SERVICE_IDS.BIGCOMMERCE) {
						uploadQueue.push(uploadTrackingBigCommerce(storeID, orderData[storeID]));
						done = true;
					}
					else if (service == Config.SERVICE_IDS.MAGENTO) {
						uploadQueue.push(uploadTrackingMagento(storeID, orderData[storeID]));
						done = true;
					}
					else if (service == Config.SERVICE_IDS.NETO) {
						uploadQueue.push(uploadTrackingNeto(storeID, orderData[storeID]));
						done = true;
					}
					else if (service == Config.SERVICE_IDS.CATCH) {
                        uploadQueue.push(uploadTrackingCatch(storeID, orderData[storeID]));
                        done = true;
                    }
                    else if (service == Config.SERVICE_IDS.SHOPIFY) {
                        uploadQueue.push(uploadTrackingShopify(storeID, orderData[storeID]));
                        done = true;
                    }
                    else if (service == Config.SERVICE_IDS.KOGAN) {
                        uploadQueue.push(uploadTrackingKogan(storeID, orderData[storeID]));
                        done = true;
                    }  
					else {
						output.result = 'Service not supported.';
						break doLoop;
					}

					if (done) {
						for (let order of orderData[storeID]) {
							orderListDone.push(order.id);
						}
					}
				}

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


			if (orderListDone.length) {
				// Set orders as having tracking uploaded
				let result = await conn.query('UPDATE collecting SET trackingUploaded = 1 WHERE orderID IN ('+orderListDone.join(',')+')');

				if (result.affectedRows == 0) {
					httpStatus = 503;
					output.result = 'Orders do not exist in the database or their tracking details have already been uploaded.';
					break;
				}

				httpStatus = 200;
				output.result = 'success';
			}
			else {
				output.result = 'No orders were processed.';
			}
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

const getPostageCourier = (service, trackingID) => {
	let courier = null;
	if (trackingID) {
		if (trackingID.startsWith('NZ') || trackingID.startsWith('IZ') || trackingID.startsWith('RZ') 
			|| trackingID.startsWith('BZ') || trackingID.startsWith('BN') || trackingID.startsWith('MP')
			|| trackingID.startsWith('QX') || trackingID.startsWith('QC')) {
			courier = Config.POSTAGE_COURIER_IDS.FASTWAY;
		}
		else {
			courier = Config.POSTAGE_COURIER_IDS.AUSPOST;
		}
	}
	return courier !== null ? Config.POSTAGE_COURIERS[service][courier] : '';
}

module.exports = uploadTracking;
