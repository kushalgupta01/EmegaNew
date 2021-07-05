//  Discount Chemist
//  Order System

const Database = require('./connection');
const {Config} = require('./config');
const { userCheckToken } = require('./users-token');
const moment = require('moment-timezone');

const addOrder = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	var output = {result: null};
	var httpStatus = 400;

	async function generateOrderId(store) {
		let sql = "SELECT orderID from orders where store = " + store + " order by id desc limit 0, 1";
		let rs = await conn.query(sql);

		if (rs && rs[0] && rs[0].orderID) {
			let maxId = parseInt(rs[0].orderID);
			return (maxId + 1);
		}

		return 1001;
	}

	try {
		do {
			// await conn.connect();
			// const testOrderId = await generateOrderId(62);
			// console.log(testOrderId);
			// if (conn.connected) conn.release();
			// break;
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}


			if (method == 'post') {
				const customer = JSON.parse(req.body.customer);
				const items = JSON.parse(req.body.items);

				const orderItems = [];

				for (let j = 0; j < items.length; j++) {
					var item = items[j];

					const _item = {
						sku: item.itemSKU,
						title: item.itemName,
						itemID: item.itemNo,
						currency: "AUD",
						quantity: item.itemQty,
						unitPrice: item.itemPrice,
					};

					orderItems.push(_item);
				}

				await conn.connect();

				let date = new Date();
				let currentDate = date;

				var errorOccurred = false;
				const store = 62;
				const isSent = 0;
				const orderSumTotal = 0;
				const paidDate = '';
				const saleDate = '';
				const customerID = '';
				const orderID = await generateOrderId(store);
				const salesRecordID = orderID;
				const collectingStatus = 0;

				let transactionResult = await conn.transaction(async function () {

					const data = {
						note: "",
						items: orderItems,
						buyerID: customerID,
						orderID: orderID,
						paidDate: paidDate,
						saleDate: saleDate,
						paymentID: "000000",
						buyerEmail: customer.email,
						createdDate: currentDate,
						checkoutDate: currentDate,
						clickCollect: "",
						PaymentMethod: "Standard",
						SalesRecordID: salesRecordID,
						buyerLastName: customer.lastname,
						orderSumTotal: orderSumTotal,
						buyerFirstName: customer.firstname,
						shippingMethod: "",
						lineItemSumTotal: "",
						cashOnDeliveryFee: 0,
						clickCollectRefNum: "",
						orderPaymentStatus: "PAID",
						orderShippingPrice: "",
						finalDestinationCity: customer.suburg,
						orderSumTotalCurrency: "AUD",
						finalDestinationCountry: customer.country,
						finalDestinationPostalCode: customer.postcode,
						finalDestinationAddressName: customer.lastname + " " + customer.firstname,
						finalDestinationAddressLine1: customer.address1,
						finalDestinationAddressLine2: customer.address2,
						finalDestinationAddressPhone: customer.phone,
						finalDestinationStateOrProvince: customer.state,
					};
					
					// 1. Save Order
					let sqlInsertOrder = 'insert into orders(store, sent, data) values(' + store + ', ' + isSent + ', ' + conn.connection.escape(JSON.stringify(data)) + ')';
					
					const rsOrder = await conn.query(sqlInsertOrder)
						.catch(err => {
							errorOccurred = err;
						});

					// 2. Save Collecting
					let sqlInsertCollecting = 'insert into collecting(orderID, status) values(' + rsOrder.insertId + ', ' + collectingStatus + ')';
					const rsCollecting = await conn.query(sqlInsertCollecting)
						.catch(err => {
							errorOccurred = err;
						});

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
					output.result = 'Could not create order in the database';
				}
			} else {
				output.result = 'wrong method';
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

function dateToSql() {
	let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    let localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
	return localISOTime.replace('T', ' ').replace('Z', '').slice(0, -4);
}

module.exports = addOrder;