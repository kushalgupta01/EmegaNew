const {Config} = require('./config');
const Database = require('./connection');
const { NetoAPI } = require("neto-api");
const moment = require('moment-timezone');

const downloadOrdersNeto = async function(req, res, next) {
	var conn = new Database(dbconn);

	var service = req.params.service;
	var store = req.params.store || null;
	var storeAll = false;

	var output = {result: null};
	var httpStatus = 400;

	do {
		if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store))) {
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

				const mySite = new NetoAPI({
				  url: "https://www.hobbyco.com.au/",
				  key: Config.STORES[storeID].apiKey,
				  //user: "user" // optional
				});

				orderStores.push(storeID);
				
				orderData.push(mySite.order
				  .get({ OrderStatus: ["New"],
				  		 OutputSelector: [
				  		      "PurchaseOrderNumber",
						      "ShippingOption",
						      "DeliveryInstruction",
						      "Username",
						      "Email",
						      "ShipAddress",
						      "BillAddress",
						      "CustomerRef1",
						      "CustomerRef2",
						      "CustomerRef3",
						      "CustomerRef4",
						      "SalesChannel",
						      "GrandTotal",
						      "ShippingTotal",
						      "ShippingDiscount",
						      "CouponCode",
						      "CouponDiscount",
						      "OrderType",
						      "OrderStatus",
						      "OrderPayment",
						      "OrderPayment.PaymentType",
						      "OrderPayment.DatePaid",
						      "DatePlaced",
						      "DateRequired",
						      "DateInvoiced",
						      "DatePaid",
						      "OrderLine",
						      "OrderLine.ProductName",
						      "OrderLine.PickQuantity",
						      "OrderLine.BackorderQuantity",
						      "OrderLine.UnitPrice",
						      "OrderLine.WarehouseID",
						      "OrderLine.WarehouseName",
						      "OrderLine.WarehouseReference",
						      "OrderLine.Quantity",
						      "OrderLine.PercentDiscount",
						      "OrderLine.ProductDiscount",
						      "OrderLine.CostPrice",
						      "OrderLine.ShippingMethod",
						      "OrderLine.ShippingTracking",
						      "OrderLine.CouponDiscount",
						      "ShippingSignature",
						      "eBay.eBayUsername",
						      "eBay.eBayStoreName",
						      "OrderLine.eBay.eBayTransactionID",
						      "OrderLine.eBay.eBayAuctionID",
						      "OrderLine.eBay.ListingType",
						      "OrderLine.eBay.DateCreated",
						      "OrderLine.eBay.DatePaid"
					    ],
				   })
				  .exec()
				  .then(response => {
				    return response.Order;
				  })
				);
			}

			// Wait for order data to be retrieved
			orderData = await Promise.all(orderData);
			//console.log(JSON.stringify(orderData));
			let noOrder = true;
			for (let storeOrders of orderData) {
				if (storeOrders.length != 0) {
					noOrder = false;
				}
			}

			if (noOrder) {
				output = {result: 'No Orders'};
				httpStatus = 404;
				break;
			}

			// Process orders
			let orderDataNew = {};

			for (let i = 0; i < orderStores.length; i++) {
				orderDataNew[orderStores[i]] = [];
				for (let order of orderData[i]) {
					// Add required extra details
					order.orderID = order.OrderID;
					order.SalesRecordID = order.OrderID;
					order.buyerID = order.Username;
					order.createdDate = order.DatePlaced.replace(' ','T');
					order.postage = order.ShippingTotal;
					order.postage_service = order.ShippingOption;
					order.ShipFullName = order.ShipFirstName + ' ' + order.ShipLastName;
					if (order.ShippingOption=='Electronic Delivery') continue;
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

module.exports = downloadOrdersNeto;