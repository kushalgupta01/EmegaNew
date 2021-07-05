//  Discount Chemist
//  Order System

// Get items from the database
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');
const { getConversionData } = require('./order-convert');

const updateOrderAlternativeItems = async function(req, res, next) {
	var conn = new Database(dbconn);
	var recordID = req.body.record;
	var storeID = req.body.store;
	var items = JSON.parse(req.body.items);
	//var orderStatus = req.body.status;
	var transaction = req.body.transaction || null;

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	//var saveAdminUsername = !req.body.dontsaveadmin;

	var output = {result: null};
	var httpStatus = 400;

	do {
		try {
			// Check token
			let user = await userCheckToken(token, true);

			if (!user) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			/*const reAlphaNum = /^[a-z0-9-_,]+$/i;
			if (!recordID || !reAlphaNum.test(recordID) || (!orderStatus && orderStatus != 0) || isNaN(parseInt(orderStatus, 10))) {
				output.result = 'Record number, order status and/or order type is invalid.';
				break;
			}*/

			await conn.connect();

			let resultData = await conn.query('select data from orders where id= '+ conn.connection.escape(recordID));

			let data = JSON.parse(resultData[0].data);
			//console.log(data);
			//console.log(items);

			let convertData = getConversionData(storeID);
			let itemConvert = convertData.ItemData;

			let lineItems = data[convertData.Items];
			if(lineItems != undefined) {
				for (let lineItem of lineItems) {
					for(let item of items) {
						if (lineItem[itemConvert.LineItemID] == item.lineitemid) {
							let alterItem = {};
							alterItem.sku = item.alterSku;
							alterItem.name = item.alterName;
							alterItem.price = item.alterPrice;
							alterItem.quantity = item.alterQty;
							if (storeID != 71) {
								alterItem.itemID = item.alterItemNo;
								lineItem[itemConvert.ItemID] = item.itemNo;
							}
						
							
							lineItem[itemConvert.SKU] = item.sku;
							lineItem[itemConvert.Name] = item.name;
							lineItem[itemConvert.Price] = item.price;
							lineItem[itemConvert.Quantity] = item.quantity;
							lineItem.alterItem = alterItem;
						}
					}
				}
			}

			recalcuteTotalPrice(lineItems, data, convertData);

			transaction = JSON.parse(transaction);
			console.log(transaction);
			let actionTime = moment.tz(new Date(), 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');
			let actionBy = user.username;

			if (transaction) {
				for (let trans of transaction) {
					await conn.query('INSERT INTO translogs(orderId, field, oldValue, newValue, actionBy, actionTime) VALUES ('
									+ conn.connection.escape(recordID) + ','
									+ conn.connection.escape(trans.field) + ','
									+ conn.connection.escape(trans.oldValue) + ','
									+ conn.connection.escape(trans.newValue) + ','
									+ conn.connection.escape(actionBy) + ','
									+ conn.connection.escape(actionTime) + ')');
				}
			}

			let result = await conn.query('UPDATE orders set data = ' + conn.connection.escape(JSON.stringify(data)) + ' WHERE id = ' +conn.connection.escape(recordID));
			//let result = await conn.query('UPDATE collecting SET status = ' + conn.connection.escape(orderStatus) + ' WHERE orderID = '+ conn.connection.escape(recordID));

			if (result.affectedRows > 0) {
				httpStatus = 200;
				output.result = 'success';
			}
			else {
				httpStatus = 202;
				output.result = 'No changes made.';
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

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

const recalcuteTotalPrice = (lineItems, data, convertData) => {
	let totalPrice = 0;
	let itemConvert = convertData.ItemData;
	for (let lineItem of lineItems) {
		totalPrice = totalPrice + (lineItem[itemConvert.Price] * lineItem[itemConvert.Quantity]);
	}

	totalPrice = totalPrice + parseFloat(data[convertData.Postage]);
	data[convertData.TotalPrice] = totalPrice;
}

module.exports = updateOrderAlternativeItems;
