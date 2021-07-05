//  Discount Chemist
//  Order System


const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const getStockInventory = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var barcode = req.body.barcode || '';
	var sku = req.body.sku || '';
	var itemName = req.body.itemName || '';
	// console.log(itemName);
	var customSku = req.body.customSku || '';
	var id = (req.body.id == 'null' || req.body.id == '')? null: req.body.id;
	var itemno = (req.body.itemno == 'null' || req.body.itemno == '')? null: req.body.itemno;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Check token
			/*if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}*/

			await conn.connect();
			var sql = 'SELECT * FROM stockinventory';
			if (customSku && customSku.length >= 3) {
				// console.log('customSku');
				sql = sql + ' WHERE customSku LIKE "%'+customSku+'%"';
			} 
			else if (sku && sku.length >= 3) {
				// console.log('sku');
				sql = sql + ' WHERE sku LIKE "%' +sku+'%"';
			}  
			else if (barcode && barcode != '0123456789') {
				// console.log('barcode');
				sql = sql + ' WHERE itemBarcode = ' + conn.connection.escape(barcode);
			}
			else if (id) {
				sql = sql + ' WHERE id = ' + id;
			}
			else if (itemName && itemName.length >= 4) {
				// console.log('item name');
				sql = sql + ' WHERE itemName LIKE "%'+itemName+'%"';
			}
			else if (itemno) {
				// console.log('item number');
				sql = sql + ' WHERE itemNo = ' + conn.connection.escape(itemno);
			}  
			else {
				// console.log('11111');
				output.result = 'Invalid parameter.';
				break;
			}
			
			var inventorys = await conn.query(sql);

			// console.log(sql);
			if (inventorys.length==0) {
				httpStatus = 404;
				output.result = 'Not inventory found.';
				break;
			}

			var inventoryData = {};
			for (let inventory of inventorys) {
				inventory['pickLocation'] = null;
				inventory['bulkLocation'] = null;
				inventory['pickQty'] = 0;
				inventory['bulkQty'] = 0;
				var pickLoc = await conn.query('SELECT bay, indivQty FROM (SELECT nvs.id, nvs.invID, nvs.customSku, nvs.indivQty, nvs.cartonQty, nvs.bay, mw.type FROM (SELECT * FROM inventorylocation WHERE invID='+inventory.id+') AS nvs LEFT JOIN locationstype mw ON mw.bay = nvs.bay) as c WHERE c.type=0 AND c.indivQty = (SELECT max(c.indivQty) FROM (SELECT nvs.id, nvs.invID, nvs.customSku, nvs.indivQty, nvs.cartonQty, nvs.bay, mw.type FROM (SELECT * FROM inventorylocation WHERE invID='+inventory.id+') AS nvs LEFT JOIN locationstype mw ON mw.bay = nvs.bay) as c WHERE c.type=0)');
				var bulkLoc = await conn.query('SELECT bay, indivQty FROM (SELECT nvs.id, nvs.invID, nvs.customSku, nvs.indivQty, nvs.cartonQty, nvs.bay, mw.type FROM (SELECT * FROM inventorylocation WHERE invID='+inventory.id+') AS nvs LEFT JOIN locationstype mw ON mw.bay = nvs.bay) as c WHERE c.type=1 AND c.indivQty = (SELECT max(c.indivQty) FROM (SELECT nvs.id, nvs.invID, nvs.customSku, nvs.indivQty, nvs.cartonQty, nvs.bay, mw.type FROM (SELECT * FROM inventorylocation WHERE invID='+inventory.id+') AS nvs LEFT JOIN locationstype mw ON mw.bay = nvs.bay) as c WHERE c.type=1)');
				if (pickLoc.length) {inventory['pickLocation'] = pickLoc[0].bay; inventory['pickQty'] = pickLoc[0].indivQty;};
				if (bulkLoc.length) {inventory['bulkLocation'] = bulkLoc[0].bay; inventory['bulkQty'] = bulkLoc[0].indivQty;};
				inventory['locations'] = await conn.query('SELECT nvs.id, nvs.invID, nvs.customSku, nvs.indivQty, nvs.cartonQty, nvs.bay, mw.type FROM (SELECT * FROM inventorylocation WHERE invID='+inventory.id+') AS nvs LEFT JOIN locationstype mw ON mw.bay = nvs.bay ORDER BY type,indivQty DESC');
				if (inventory.store==8) {
					inventory['locations'].push({'id':'qvb', 'invID': inventory.id, 'customSku': inventory.customSku, 'indivQty': inventory.QVBQty, 'cartonQty':0,'bay':'QVB','type':'QVB'});
					//inventory['locations'].push({'id':'pick', 'invID': inventory.id, 'customSku': inventory.customSku, 'indivQty': inventory.pickQty, 'cartonQty':0,'bay': inventory.pickLocation,'type':'PicLoc'});
					//inventory['locations'].push({'id':'bulk', 'invID': inventory.id, 'customSku': inventory.customSku, 'indivQty': inventory.bulkQty, 'cartonQty':0,'bay': inventory.bulkLocation,'type':'BulLoc'});
					//console.log(inventory['locations']);
				}
				if (inventory.customSku && inventory.customSku != 'NULL') {
					inventoryData[inventory.customSku] = inventory;
				} else if (inventory.itemBarcode && inventory.itemBarcode != 'NULL' && inventory.itemBarcode != '0123456789' && inventory.itemBarcode != '123456789') {
					inventoryData[inventory.itemBarcode] = inventory;
				} 		
			}
			output.inventory = inventorys;
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

module.exports = getStockInventory;