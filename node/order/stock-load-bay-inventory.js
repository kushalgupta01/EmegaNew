const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const loadStockBayInventory = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var bay = req.params.bay;

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

			await conn.connect();
			var sql = 'SELECT nvs.*,mw.type FROM (SELECT i.id, i.invID, i.customSku, i.indivQty, i.cartonQty, i.bay, s.store, s.sku, s.itemName, s.itemBarcode, s.quantityPerCarton, s.image FROM inventorylocation i, stockinventory s WHERE i.invID = s.id  AND i.bay = ' + conn.connection.escape(bay) + ') as nvs LEFT JOIN locationstype mw ON mw.bay = nvs.bay ';
			 
			var stocks = await conn.query(sql);

			if (stocks.length==0) {
				httpStatus = 404;
				output.result = 'No inventory found.';
				break;
			}
			
			output.stocks = stocks;
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

module.exports = loadStockBayInventory;