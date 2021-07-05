//  Discount Chemist
//  Order System


const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const loadStockBay = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	// var store = req.params.store;
	var output = {result: null};res
	var httpStatus = 400;

	try {
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			// DELETE from INVENTORYLOCATION if inventory id is null:
			var sql2 = 'DELETE b FROM inventorylocation b LEFT JOIN stockinventory f ON f.id = b.invID WHERE f.id IS NULL';
			await conn.connect();
			var pronto = await conn.query(sql2);
			var sql = "(SELECT bay FROM (SELECT nvs.id,nvs.invID,nvs.customSku,nvs.indivQty,nvs.cartonQty,nvs.bay,mw.type FROM (SELECT * FROM inventorylocation) AS nvs LEFT JOIN locationstype mw ON mw.bay = nvs.bay) as c WHERE c.type!='2' or c.type is null GROUP BY bay) UNION (SELECT bay FROM locationstype WHERE type IN (0,1) GROUP BY bay) ORDER BY bay";
			
			var locations = await conn.query(sql);

			if (locations.length==0) {
				httpStatus = 404;
				output.result = 'Not bay found.';
				break;
			}

			// var stockData = {};
			// for (let stock of stocks) {
				// stock['locations'] = await conn.query('SELECT * FROM inventorylocation WHERE invID=' + stock.id);
				// stockData[stock.id] = stock;		
			output.locations = locations;
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

module.exports = loadStockBay;