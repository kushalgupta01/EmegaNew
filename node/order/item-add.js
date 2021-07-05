//  Discount Chemist
//  Order System

const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const addItem = async function(req, res, next) {
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
				var store = req.body.store;
				var itemNum = req.body.itemNum;
				var sku = req.body.sku;
				var itemTitle = req.body.itemTitle;
				var itemMultiple = req.body.itemMultiple;
				var barcode = req.body.barcode;
				var itemPhoto = req.body.itemPhoto;
			}


			await conn.connect();

			let result = await conn.query('select 1 from items where itemStore=' + conn.connection.escape(store) + ' and itemNo=' +
				conn.connection.escape(itemNum) + ' and sku=' + conn.connection.escape(sku));

			if (result.length > 0) {
				httpStatus = 200;
				output.result = 'Item exists.';
				break;
			}
			
			await conn.query('INSERT INTO items (itemNo, sku, singleItemBarcode, itemStore, itemName, singleItemMultiple, itemPhoto) values (' + 
				conn.connection.escape(itemNum) + ', ' + conn.connection.escape(sku) + ', ' + conn.connection.escape(barcode) + ', ' +
				conn.connection.escape(store) + ', ' + conn.connection.escape(itemTitle) + ', ' + conn.connection.escape(itemMultiple) + 
				', ' + conn.connection.escape(itemPhoto)+ ')');
				

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

function dateToSql() {
	let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    let localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
	return localISOTime.replace('T', ' ').replace('Z', '').slice(0, -4);
}

module.exports = addItem;