//  Discount Chemist
//  Order System

// Get items from the database
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const getBundleItems = async function(req, res, next) {
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

			var	items = req.body.bundleitems;

			try {
				items = items ? JSON.parse(items) : [];

				if (!items.length) {
					output.result = 'No items selected';
					break;
				}
			}
			catch (e) {
				output.result = 'Invalid item data.';
				break;
			}

			let itemRows = [];

			await conn.connect();

			if (items.length) {
				// Get items using item numbers
				let itemDataRows = await conn.query('SELECT * FROM items WHERE '+items.map(x => "itemID = " + conn.connection.escape(x)).join(' OR '));
				//itemDataLoop:
				//console.log(itemDataRows.length);
				for (let itemDataRow of itemDataRows) {
					
					itemRows.push(itemDataRow);
				}
			}

			//console.log(itemRows);
			if (!itemRows.length) {
				httpStatus = 404;
				output.result = 'None of the selected products could not be found in the database.';
				break;
			}
			//console.log(itemRows);

			// Get the requested items
			let itemData = {};
			for (let item of itemRows) {
				let entry = {};
				
				// Item details
				entry.storeID = item.itemStore;
				entry.ItemNum = item.itemNo;
				entry.ItemTitle = item.itemName;
				entry.Quantity = 0;
				entry.SKU = item.sku;
				
				itemData[item.itemID] = entry;
			}

			output.items = itemData;
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

module.exports = getBundleItems;