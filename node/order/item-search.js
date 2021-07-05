// Get items from the database
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const searchItems = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var itemNo = null;
	var sku = null;
	var id = null;
	var name = null;
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
				itemNo = req.body.itemNo;
				sku = req.body.sku;
				id = req.body.id;
				name = req.body.name;
				store = req.body.store;
				price = req.body.price;
			}


			try {

				if (!itemNo && !sku && !id && !name) {
					output.result = 'No items selected';
					break;
				}
			}
			catch (e) {
				output.result = 'Invalid item/SKU data.';
				break;
			}

			let itemRows = [];
			let itemIDDone = {};

			await conn.connect();

			if (id) {
				// Get items using SKUs
				itemRows = await conn.query('SELECT * FROM items WHERE itemID=' + conn.connection.escape(id) + ' and itemStore=' + conn.connection.escape(store));

			}else if (itemNo) {
				// Get items using SKUs
				itemRows = await conn.query('SELECT * FROM items WHERE itemNo=' + conn.connection.escape(itemNo) + ' and itemStore=' + conn.connection.escape(store));
			
			}else if (sku) {
				// Get items using SKUs
				itemRows = await conn.query('SELECT * FROM items WHERE sku=' + conn.connection.escape(sku) + ' and itemStore=' + conn.connection.escape(store));
			
			}else if (name) {
				itemRows = await conn.query('SELECT * FROM items WHERE itemName like "%' + name +'%"' + ' and itemStore=' + conn.connection.escape(store));
			}

			/*if (items.length) {
				// Get items using item numbers
				let itemDataRows = await conn.query('SELECT * FROM items WHERE '+items.map(x => "(itemNo = " + conn.connection.escape(x[0]) + " and itemStore = " + conn.connection.escape(x[1])+" )").join(' OR '));
				//itemDataLoop:
				//console.log(itemDataRows.length);
				for (let itemDataRow of itemDataRows) {
					
					itemRows.push(itemDataRow);
				}
			}*/

			//console.log(itemRows);
			if (!itemRows.length) {
				httpStatus = 404;
				output.result = 'No products could not be found in the database.';
				break;
			}
			//console.log(itemRows);

			// Get the requested items
			let itemData = [];
			for (let item of itemRows) {
				let entry = {};
				
				// Item details
				entry.id = item.itemID;
				entry.num = item.itemNo || '';
				entry.name = item.itemName;
				entry.sku = item.sku || '';
				entry.store = item.itemStore;
				entry.pic = item.itemPhoto || '';
				entry.mul = item.itemMultiple || '';
				entry.singlemul = item.singleItemMultiple || '';
				entry.cartonBarcode = item.itemBarcode || '';
				entry.indivBarcode = item.singleItemBarcode || '';
				entry.fp = item.flatpack;
				entry.vr = item.vr;
				entry.fwfp = item.fastwayflatpack;
				entry.bay = item.bay;
				entry.sat = item.satchel;
				entry.weight = item.itemWeight;
				entry.price = item.itemPrice;

				if (item.bundle) {
					let comboItems = JSON.parse(item.bundle);
					let comboItemIds = Object.keys(comboItems);
					let comboItemRows = await conn.query('SELECT * FROM items WHERE itemID in (' + comboItemIds.join(',') + ')');
					entry.comboItems = [];

					for (let comboItemRow of comboItemRows) {
						entry.comboItems.push({
							id: comboItemRow.itemID,
							sku: comboItemRow.sku || '',
							itemName: comboItemRow.itemName,
							itemNo: comboItemRow.itemNo,
							quantity: comboItems[comboItemRow.itemID]
						});
					}
				}
				
				itemData.push(entry);
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

module.exports = searchItems;
