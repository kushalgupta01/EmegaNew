//  Discount Chemist
//  Order System


const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const loadStockInventory = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var store = req.params.store;
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

			var sql = 'SELECT * FROM stockinventory WHERE store = ' + store;
			await conn.connect();
			var stocks = await conn.query(sql);

			if (stocks.length==0) {
				httpStatus = 404;
				output.result = 'Not stock found.';
				break;
			}

			var stockData = {};
			for (let stock of stocks) {
				/*if (stock.itemBarcode) {
					stockData[stock.itemBarcode] = stock;
				} else if (stock.sku) {
					stockData[stock.sku] = stock;
				}*/
				stock['locations'] = await conn.query('SELECT * FROM inventorylocation WHERE invID=' + stock.id);
				stockData[stock.id] = stock;
			}

			output.stocks = stockData;
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

module.exports = loadStockInventory;