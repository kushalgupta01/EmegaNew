const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const { getConversionData } = require('./order-convert');
const moment = require('moment-timezone');

const modifyOrderItem = async function(req, res, next) {
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
				var itemsModify = JSON.parse(req.body.items);
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

			for (let itemModify of itemsModify) {
				let item = {};

				item[itemConvert.SKU] = itemModify.sku;
				item[itemConvert.Name] = itemModify.title;
				item[itemConvert.Price] = itemModify.unitPrice;
				item[itemConvert.Quantity] = itemModify.quantity;
				if (store != 71) {
					item[itemConvert.ItemID] = itemModify.itemID;
				}

				items.push(item);
			}

			

			data[convertData.Items] = items;
			//console.log(data.items);
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

module.exports = modifyOrderItem;