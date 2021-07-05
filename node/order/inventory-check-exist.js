
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const checkInventoryExist = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var barcode = req.body.barcode;
	var sku = req.body.sku;
	var customSku = req.body.customSku;
	var token = req.header(Config.ACCESS_TOKEN_HEADER);

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

			let inventoryRow;

			if (customSku != "null") {
				
				inventoryRow = await conn.query('SELECT 1 FROM stockinventory WHERE customSku=' + conn.connection.escape(customSku));
			
			} else if ((barcode != "null" || sku != "null") && barcode != "0123456789") {
				let WHERESQL = [];
				if (barcode != "null" && barcode != "0123456789") WHERESQL.push('itemBarcode=' + conn.connection.escape(barcode));
				if (sku != "null") WHERESQL.push('sku=' + conn.connection.escape(sku));
				inventoryRow = await conn.query('SELECT 1 FROM stockinventory WHERE ' + WHERESQL.join(' OR '));

			}

			
			if (!inventoryRow.length) {
				output.exist = 'false';
			} else {
				output.exist = 'true';
			}
			
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

module.exports = checkInventoryExist;
