const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const { getConversionData } = require('./order-convert');
const moment = require('moment-timezone');

const addOrderItem = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			if (method == 'post') {
				var dbID = req.body.dbID;
				var store = req.body.store;
				var salesrecord = req.body.salesrecord;
				var itemsAdd = JSON.parse(req.body.items);
			}


			await conn.connect();

			let result = await conn.query('select data from orders where id=' + dbID);

			if (result.length == 0) {
				output.result = 'Order not exist.';
				break;
			}

			let data = JSON.parse(result[0].data);
			let convertData = getConversionData(store);

			let itemConvert = convertData.ItemData;
			
			let items = [];
			

			let lineitemids = [];
			for (let itemdata of data[convertData.Items]) {
				lineitemids.push(itemdata[itemConvert.LineItemID]);
			}

			let numOfItems = data[convertData.Items].length;

			for (let itemAdd of itemsAdd) {
				let item = {};
				let lineitemid = getLineItemID(lineitemids, salesrecord, numOfItems);
				lineitemids.push(lineitemid);
				item[itemConvert.LineItemID] = lineitemid;
				numOfItems = numOfItems + 1;
				item[itemConvert.SKU] = itemAdd.sku;
				item[itemConvert.Name] = itemAdd.title;
				item[itemConvert.Price] = itemAdd.unitPrice;
				item[itemConvert.Quantity] = itemAdd.quantity;
				if (store != 71) {
					item[itemConvert.ItemID] = itemAdd.itemID;
				}

				items.push(item);
			}

			

			data[convertData.Items] = data[convertData.Items].concat(items);
			recalcuteTotalPrice(data[convertData.Items], data, convertData);
			
			await conn.query('UPDATE orders set data = ' + conn.connection.escape(JSON.stringify(data)) + ' WHERE id = ' + dbID);		

			output.result = 'success';
			httpStatus = 200;
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

const recalcuteTotalPrice = (lineItems, data, convertData) => {
	let totalPrice = 0;
	let itemConvert = convertData.ItemData;
	for (let lineItem of lineItems) {
		totalPrice = totalPrice + (lineItem[itemConvert.Price] * lineItem[itemConvert.Quantity]);
	}

	totalPrice = totalPrice + parseFloat(data[convertData.Postage]);
	data[convertData.TotalPrice] = totalPrice;
}

function getLineItemID(lineitemids, salesrecord, n) {
	let newlineitemid = salesrecord + '-' + n;
	while (lineitemids.includes(salesrecord+'-'+n)) {
		n = n + 1;
		newlineitemid = salesrecord + '-' + n;
	}
	return newlineitemid;
}

module.exports = addOrderItem;