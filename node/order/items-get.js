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
				/*// Get items using SKUs
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
				}*/

				// Get items using SKUs
				let skusData = {}
				for (let sku of skus) {
					let store = sku[1];
					let itemSku = sku[0];
					if (skusData.hasOwnProperty(store)) {
						skusData[store].push(itemSku);
					} else {
						skusData[store] = [];
						skusData[store].push(itemSku);
					}
				}

				let sqlWHERE = [];
				for (let storeID in skusData) {
					let itemSkus = skusData[storeID];
					sqlWHERE.push(' ( sku in (' + itemSkus.map(x => conn.connection.escape(x)).join(',')+') AND itemStore = '+storeID+') ');
				}				
				//itemRows = await conn.query('SELECT * FROM items WHERE sku IN ('+skus.map(x => conn.connection.escape(x[0])).join(',')+')');
				// itemRows = await conn.query('SELECT * FROM items WHERE '+skus.map(x => "(sku = " + conn.connection.escape(x[0]) + " and itemStore = " + x[1]+" )").join(' OR '));
				itemRows = await conn.query('SELECT * FROM items WHERE '+sqlWHERE.join(' OR '));
			}

			if (items.length) {
				// Get items using item numbers
				let itemsData = {}
				for (let item of items) {
					// console.log(item);
					let store = item[1];
					let itemNum = item[0];
					if (itemsData.hasOwnProperty(store)) {
						itemsData[store].push(itemNum);
					} else {
						itemsData[store] = [];
						itemsData[store].push(itemNum);
					}
				}

				let sqlWHERE = [];
				for (let storeID in itemsData) {
					let itemNums = itemsData[storeID];
					sqlWHERE.push(' ( itemNo in (' + itemNums.map(x => conn.connection.escape(x)).join(',')+') AND itemStore = '+storeID+') ');
				}				
				let itemDataRows = await conn.query('SELECT * FROM items WHERE '+sqlWHERE.join(' OR '));
				
				// let itemDataRows = await conn.query('SELECT * FROM items WHERE '+items.map(x => "(itemNo = " + conn.connection.escape(x[0]) + " and itemStore = " + x[1]+" )").join(' OR '));
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
			let itemData = [];
			for (let item of itemRows) {
				let entry = {};
				
				// Item details
				entry.id = item.itemID;
				entry.num = item.itemNo;
				entry.name = item.itemName;
				entry.barcode = item.itemBarcode;
				entry.storeID = item.itemStore;
				entry.quantity = item.itemMultiple;
				entry.imageUrl = item.itemPhoto;
				entry.flatpack = item.flatpack;
				entry.bay = item.bay;
				entry.vr = item.vr;
				entry.fwfp = item.fwfp;
				entry.sku = item.sku || '';
				entry.customSku = item.customSku || '';
				entry.satchel = item.satchel || '';
				if (!entry.weight) entry.weight = item.itemWeight;
				entry.stock = item.stock || '';
				entry.bundle = item.bundle;
				entry.factory = item.factory;
				entry.costco = item.costco;
				entry.inventory = item.inventory;
				// entry.fgb = item.fgb;
				// entry.morlife = item.morlife;
				entry.singleItemBarcode = item.singleItemBarcode;
				entry.singleItemMultiple = item.singleItemMultiple;
				entry.ebayquantity = item.ebayquantity;
				
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

module.exports = getItems;
