//  Discount Chemist
//  Order System


const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const searchStockInventory = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var store = req.params.store;
	var output = {result: null};
	var httpStatus = 400;

	var searchField = req.query.searchfield || null
	var searchValue = req.query.searchvalue || ''
	try {
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			var sql = `SELECT * FROM stockinventory WHERE `;
			if(searchField != null && searchField != '') {
				if(searchField == 'itemno') {
					sql = sql + ` itemNo like "%` + searchValue + `%"`;
				}

				if(searchField == 'itemname') {
					sql = sql + ` itemName like "%` + searchValue + `%"`;
				}

				if(searchField == 'sku') {
					sql = sql + ` sku like "%` + searchValue + `%"`;
				}

				if(searchField == 'customsku') {
					sql = sql + ` customSku like "%` + searchValue + `%"`;
				}

				if(searchField == 'itembarcode') {
					sql = sql + ` itemBarcode like "%` + searchValue + `%"`;
				}

				if(searchField == 'cartonbarcode') {
					sql = sql + ` cartonBarcode like "%` + searchValue + `%"`;
				}

				if(searchField == 'brand') {
					sql = sql + ` brand like "%` + searchValue + `%"`;
				}

				if(searchField == 'category') {
					sql = sql + ` category like "%` + searchValue + `%"`;
				}
			}
			await conn.connect();
			var stocks = await conn.query(sql);

			if (stocks.length==0) {
				httpStatus = 404;
				output.result = 'Not stock found.';
				break;
			}

			var stockData = {};
			for (let stock of stocks) {
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

module.exports = searchStockInventory;
