//  Discount Chemist
//  Order System

// Get items from the database
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');
const { getConversionData } = require('./order-convert');

const updateItem = async function(req, res, next) {
	var conn = new Database(dbconn);
	var recordID = req.body.record;
	var storeID = req.body.store;
	var updateItems = JSON.parse(req.body.updateItems);
	

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	

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

			await conn.connect();

			let resultData = await conn.query('select data from orders where id= '+ conn.connection.escape(recordID));

			let data = JSON.parse(resultData[0].data);

			let convertData = getConversionData(storeID);
			let itemConvert = convertData.ItemData;

			let lineItems = data[convertData.Items];

			let lineItemFound = false;
			if(lineItems != undefined) {
				for (let updateItem of updateItems) {
					let lineitemid = updateItem[0];
					let sku = updateItem[1];
					let price = updateItem[2];
					let quantity = updateItem[3];
					for (let i=0; i<lineItems.length; i++) {
						let lineItem = lineItems[i];
						if (lineItem[itemConvert.LineItemID] == lineitemid && lineItem[itemConvert.SKU] == sku) {
							lineItem[itemConvert.Price] = price;
							lineItem[itemConvert.Quantity] = quantity;
							break;
						}
					}
				}
					
			}

			
			recalcuteTotalPrice(lineItems, data, convertData);

			let result = await conn.query('UPDATE orders set data = ' + conn.connection.escape(JSON.stringify(data)) + ' WHERE id = ' +conn.connection.escape(recordID));

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

module.exports = updateItem;