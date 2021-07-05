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
	var customSku = req.body.customSku || '';

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
			if (customSku) {
				sql = sql + ' WHERE customSku = ' + conn.connection.escape(customSku);
			}  else if (barcode && barcode != '0123456789') {
				sql = sql + ' WHERE itemBarcode = ' + conn.connection.escape(barcode);
			}  else {
				output.result = 'Invalid parameter.';
				break;
			}
			
			var inventorys = await conn.query(sql);

			if (inventorys.length==0) {
				httpStatus = 404;
				output.result = 'Not inventory found.';
				break;
			}

			var inventoryData = {};
			for (let inventory of inventorys) {
				inventory['locations'] = await conn.query('SELECT * FROM inventorylocation WHERE invID='+inventory.id+' AND indivQty > 0');
				if (inventory.store==8) {
					inventory['locations'].push({'id':'qvb', 'invID': inventory.id, 'customSku': inventory.customSku, 'indivQty': inventory.QVBQty, 'cartonQty':0,'bay':'QVB','type':'QVB'});
					/*inventory['locations'].push({'id':'pick', 'invID': inventory.id, 'customSku': inventory.customSku, 'indivQty': inventory.pickQty, 'cartonQty':0,'bay': inventory.pickLocation,'type':'PicLoc'});
					inventory['locations'].push({'id':'bulk', 'invID': inventory.id, 'customSku': inventory.customSku, 'indivQty': inventory.bulkQty, 'cartonQty':0,'bay': inventory.bulkLocation,'type':'BulLoc'});*/
				}
				if (inventory.customSku && inventory.customSku != 'NULL') {
					inventoryData[inventory.customSku] = inventory;
				} else if (inventory.itemBarcode && inventory.itemBarcode != 'NULL' && inventory.itemBarcode != '0123456789' && inventory.itemBarcode != '123456789') {
					inventoryData[inventory.itemBarcode] = inventory;
				} 		
			}

			output.inventory = inventoryData;
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