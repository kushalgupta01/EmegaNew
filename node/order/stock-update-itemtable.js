//  Discount Chemist
//  Order System


const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const itemToStock = require('./itemToStock');

const updateStockItemTable = async function(req, res, next) {
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
			await conn.connect();

			var stores = [31, 32, 33, 34];
			var storeSQL = stores.map(x => 'itemStore = ' + x + ' AND ISNULL(stock)').join(' OR ');

			var sql = 'SELECT itemID, sku, itemStore FROM items WHERE ' + storeSQL;

			let items = await conn.query(sql);

			var sql2 = 'SELECT * FROM stock';

			let stocks = await conn.query(sql2);

			let stocksData = {};
			for (let stock of stocks) {
				stocksData[stock.sku] = stock.id; 
			}

			for (let item of items) {
				let store = item.itemStore;
				let sku = item.sku;
				let stockSkus = itemToStock[store][sku];
				let stockValues = {};
				if (stockSkus) {
					for (let stockSku in stockSkus) {
						if (stocksData[stockSku]) {
							stockValues[stocksData[stockSku]] = stockSkus[stockSku];
						}
					}
				}

				if (Object.keys(stockValues).length > 0) {
					let sql3 = "UPDATE items set stock = '" + JSON.stringify(stockValues) + "' WHERE itemID = " + item.itemID;
					await conn.query(sql3); 
				}
				
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

module.exports = updateStockItemTable;