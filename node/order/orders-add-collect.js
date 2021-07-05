// Discount Chemist
// Order System

// Mark orders as sent

const Database = require('./connection');
const { getConversionData, getField } = require('./order-convert');
const { Config } = require('./config');
const { userCheckToken } = require('./users-token');
const moment = require('moment-timezone');
const sendMailForTracking = require("./tracking-status-mail");

const addOrdersCollect = async function (req, res, next) {
	var conn = new Database(dbconn);
	var orderListData = req.body.orders || null;
	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	let orderData = null;
	let date = new Date();
	let host=req.header("host")
	let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');

	var output = { result: null };
	var httpStatus = 400;

	try {
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}
			await conn.connect();
			let user = await userCheckToken(token, true);

			let orderList = {};
			let orderListArray = [];
			let orderListStr;


			try {
				orderListData = JSON.parse(orderListData);
				for (let entry of orderListData) {
					orderList[entry] = true;
					orderListArray.push(conn.connection.escape(entry));
				}
			}
			catch (e) {
				output.result = 'Invalid order data.';
				break;
			}

			orderListStr = orderListArray.join(',');


			// Get orders from the database
			let orders = await conn.query('SELECT o.id, o.store, data FROM orders o WHERE o.id IN (' + orderListStr + ') AND o.sent = 0 AND o.cancelled = 0 AND o.id NOT IN (SELECT c.orderID FROM collecting c)');

			if (!orders.length) {
				httpStatus = 200;
				output.result = 'No orders.';
				break;
			}

			// Check if buyer details are present
			let buyerDetailsValid = true;
			try {
				for (let orderEntry of orders) {
					let store = orderEntry.store.toString();

					let sigma = 0;
					let hyclor = 0;

					let wv = 0;
					let me = 0;
					let lpg = 0;
					let hob = 0;


					orderData = JSON.parse(orderEntry.data);
					let CD = getConversionData(orderEntry.store);
					//console.log(CD);
					let items = getField(orderData, CD.Items);
					for (let item of items) {
						//console.log(item);
						let sku = item[CD.ItemData.SKU];
						if (Config.SUPPLIERS[Config.SUPPLIER_IDS.EMEGA].stores.includes(store)) {
							if (sku.startsWith('SI-')) {
								sigma = 1;
							} else if (sku.startsWith('HYCH_')) {
								hyclor = 1;
							}
						}

						if (Config.SUPPLIERS[Config.SUPPLIER_IDS.HOBBYCO].stores.includes(store)) {
							if (sku.startsWith('WV-')) {
								wv = 1;
							} else if (sku.startsWith('ME-')) {
								me = 1;
							} else if (sku.startsWith('LPG-')) {
								lpg = 1;
							} else {
								hob = 1;
							}
						}

					}

					if (hob == 1) {
						orderEntry['wv'] = 0;
						orderEntry['me'] = 0;
						orderEntry['lpg'] = 0;
					} else if (wv == 1 && me == 0 && lpg == 0) {
						orderEntry['wv'] = 1;
						orderEntry['me'] = 0;
						orderEntry['lpg'] = 0;
					} else if (wv == 0 && me == 1 && lpg == 0) {
						orderEntry['wv'] = 0;
						orderEntry['me'] = 1;
						orderEntry['lpg'] = 0;
					} else if (wv == 0 && me == 0 && lpg == 1) {
						orderEntry['wv'] = 0;
						orderEntry['me'] = 0;
						orderEntry['lpg'] = 1;
					} else if (wv == 0 && me == 0 && lpg == 0) {
						orderEntry['wv'] = 0;
						orderEntry['me'] = 0;
						orderEntry['lpg'] = 0;
					} else {
						orderEntry['wv'] = 0;
						orderEntry['me'] = 0;
						orderEntry['lpg'] = 0;
					}

					orderEntry['status'] = 0;

					if (sigma == 1 && hyclor == 0) {
						orderEntry['sigma'] = 1;
						orderEntry['hyclor'] = 0;
					} else if (sigma == 0 && hyclor == 1) {
						orderEntry['sigma'] = 0;
						orderEntry['hyclor'] = 1;
					} else {
						orderEntry['sigma'] = 0;
						orderEntry['hyclor'] = 0;
					}

					if (store == 81) {
						orderEntry['type'] = 13;
					} else if (store == 82) {
						orderEntry['type'] = 14;
					} else {
						orderEntry['type'] = null;
					}

					if (!CD || !getField(orderData, CD.BuyerFullName) || !getField(orderData, CD.BuyerAddress1) || !getField(orderData, CD.BuyerCountry)) {
						buyerDetailsValid = false;
						break;
					}

					// if(!getField(orderData, CD.Email)){
					// 	buyerDetailsValid = false;
					// 	break;
					// }
				}
			}
			catch (e) {
				buyerDetailsValid = false;
				console.log(e);
			}

			if (!buyerDetailsValid) {
				output.result = 'One or more orders has missing address details. Please make sure to save any changes you have made.';
				break;
			}


			// Add orders to the collecting table
			let transactionResult = await conn.transaction(async function () {
				var errorOccurred = false;
				let i = 0;
				for (let orderEntry of orders) {

					await conn.query('INSERT INTO collecting (orderID,sigma,wv,me,hyclor,lpg,status,type) VALUES (' + conn.connection.escape(orderEntry.id) + ',' + orderEntry['sigma'] + ',' + orderEntry['wv'] + ',' + orderEntry['me'] + ',' + orderEntry['hyclor'] + ',' + orderEntry['lpg'] + ',' + orderEntry['status'] + ',' + orderEntry['type'] + ');')
						.catch(err => {
							console.log(err);
							errorOccurred = true;
						});

					let status;
					if (orderEntry.status == 18) {
						status = 'Warehouse Collect';
					}
					else {
						status = 'New order'
					}
					await conn.query('INSERT INTO translogs(orderId, field, oldValue, newValue, actionBy, actionTime) VALUES ('
						+ conn.connection.escape(orderEntry.id) + ','
						+ conn.connection.escape('status') + ','
						+ null + ','
						+ conn.connection.escape(status) + ','
						+ conn.connection.escape(user.username) + ','
						+ conn.connection.escape(date2) + ')');


					if (orders[i].id == orderEntry.id) {
					
						let emailOrderRecord = await conn.query("SELECT data FROM orders o WHERE o.id='" + orders[i].id + "'");
						let emailOrderData = null;
						for (let orderEntry of emailOrderRecord) {
							emailOrderData = JSON.parse(orderEntry.data);
						}

						if(emailOrderData.buyerEmail){
							console.log(emailOrderData.buyerEmail)
						}
						if (emailOrderData && emailOrderData.buyerEmail) {
							let emailData = {
								//uncomment below line to sent email to actual buyer
								//to:emailOrderData.buyerEmail,
								to: "info@emega.com.au",
								fullName: emailOrderData.buyerFirstName + " " + emailOrderData.buyerLastName,
								sellerName: emailOrderData.sellerID,
								orderId: emailOrderData.orderID,
								dbNum: orders[i].id,
								orderDate: emailOrderData.createdDate,
								orderSumTotal: emailOrderData.orderSumTotal,
								host:host
							};
							emailData.fullName = emailData.fullName.toString().replace(/"/g, '');
							emailData.orderId = emailData.orderId.toString().replace(/"/g, '');
							if (!emailData.sellerName) {
								emailData.sellerName = emailOrderData.buyerFirstName;
							}
							if (emailData.to)
								sendMailForTracking(emailData);
						} else {
							console.log('Tracking mail not sent to buyer due to inadequate data of an order '+emailOrderData.orderID)
							output.result = 'Tracking mail not sent to buyer due to inadequate data of an order';
						}
					}

					if (errorOccurred) {
						httpStatus = 500;
						output.result = 'Could not add orders to the collecting table in the database.';
						conn.rollback(errorOccurred);
						return false;
					}
					i++;
				}

				var commitResult = await conn.commit();
				if (!commitResult) {
					httpStatus = 500;
					output.result = 'Could not commit database transaction.';
					return false;
				}
				return true;
			});

			if (transactionResult) {
				httpStatus = 200;
				output.result = 'success';
			}
		} while (0);
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

module.exports = addOrdersCollect;
