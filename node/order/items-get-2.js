//  Discount Chemist
//  Order System

// Get items from the database
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const getItems = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var items = null;
	var skus = null;
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

			if (method == 'get') {
				items = req.query.items;
				skus = req.query.skus;
			}
			else if (method == 'post') {
				items = req.body.items;
				skus = req.body.skus;
			}

			try {
				skus = skus ? JSON.parse(skus) : [];
				items = items ? JSON.parse(items) : [];

				if (!skus.length && !items.length) {
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

			if (skus.length) {
				// Get items using SKUs
				itemRows = await conn.query('SELECT * FROM sku WHERE id IN ('+skus.map(x => conn.connection.escape(x[0])).join(',')+')');
				let itemIDArray = [];

				for (let skuRow of itemRows) {
					// Go through each item ID reference
					skuRow.sku = skuRow.id;
					try {
						skuRow.contains = JSON.parse(skuRow.contains);
						for (let itemID of skuRow.contains) {
							itemIDArray.push(conn.connection.escape(itemID));
						}

						// Add the requested store ID to each entry for checking later
						for (let sku of skus) {
							if (sku[0] == skuRow.id) {
								skuRow.store = sku[1];
								break;
							}
						}
					} catch(e) {}
				}

				let itemDataRows = await conn.query('SELECT * FROM items'+(itemIDArray.length ? ' WHERE itemID IN ('+itemIDArray.join(',')+')' : ''));

				// Add the details of each item row to the associated SKU item row
				for (let itemRow of itemDataRows) {
					for (let skuRow of itemRows) {
						for (let itemID of skuRow.contains) {
							if (itemID == itemRow.itemID && (!skuRow.itemData || skuRow.store == itemRow.itemStore)) {
								if (!skuRow.itemData) skuRow.itemData = [];
								skuRow.itemData.push(itemRow);
								//break;
							}
						}
					}
					itemIDDone[itemRow.itemID] = 1;
				}
			}

			if (items.length) {
				// Get items using item numbers
				let itemDataRows = await conn.query('SELECT * FROM items WHERE itemNo IN ('+items.map(x => conn.connection.escape(x[0])).join(',')+')');
				//itemDataLoop:
				//console.log(itemDataRows.length);
				for (let itemDataRow of itemDataRows) {
					if (itemIDDone[itemDataRow.itemID]) continue;
					itemRows.push({itemData: [itemDataRow]});
				}
			}

			//console.log(itemRows);
			if (!itemRows.length) {
				httpStatus = 404;
				output.result = 'None of the selected products could not be found in the database.';
				break;
			}


			// Get the requested items
			let itemData = [];
			for (let item of itemRows) {
				let entry = {};
				if (item.sku) {
					// SKU details
					entry.sku = item.id;
					entry.upc = item.upc;
					entry.flatpack = !!item.fp;
					entry.instock = !item.quantity;
					entry.weight = item.weight;
				}

				if (item.itemData) {
					// Item details
					entry.id = item.itemData[0].itemID;
					entry.num = item.itemData[0].itemNo;
					entry.name = item.itemData[0].itemName;
					entry.barcode = item.itemData[0].itemBarcode;
					entry.storeID = item.itemData[0].itemStore;
					entry.quantity = item.itemData[0].itemMultiple;
					entry.imageUrl = item.itemData[0].itemPhoto;
					entry.flatpack = item.itemData[0].flatpack;
					entry.bay = item.itemData[0].bay;
					entry.vr = item.itemData[0].vr;
					entry.sku = item.itemData[0].sku || '';
					entry.satchel = item.itemData[0].satchel || '';
					if (!entry.weight) entry.weight = item.itemData[0].itemWeight;
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
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = getItems;
