//  Discount Chemist
//  Order System


const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

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
				if (stocksData.hasOwnProperty(item.sku.toUpperCase())) {
					let stockID = stocksData[item.sku.toUpperCase()];
					let stockValue = {};
					stockValue[stockID] = 1;
					var sql3 = "UPDATE items set stock = '"+JSON.stringify(stockValue)+"' WHERE itemID = " + item.itemID;
					await conn.query(sql3);
				}else{
					let containStocks = [];
					let itemSku = item.sku;
					let itemskus = itemSku.split('-');
					let itemskus2 = itemSku.split(' ');
					if (itemskus[0]=='SKU') {
						
						if (item.itemStore == "31") {
							itemSku = itemSku.replace("SKU","POKITO");
						}else if (item.itemStore == "32") {
							itemSku = itemSku.replace("SKU","SDC");
						}
						
						if (stocksData[itemSku]) {
							containStocks.push(itemSku);
						}
						
					}else if (itemskus[0]=='ORIGINAL') {

						if (itemskus[1]=='PASTEL') {
							containStocks.push('TBOrigPast');
						}else if (itemskus[1]=='VIBE') {
							containStocks.push('TBOrigVibe');
						}

						if (itemskus[2]=='EXPRESS') {
							containStocks.push('TBExpVibe');
						}else if (itemskus[2]=='XTRA') {
							containStocks.push(itemskus[2] + '-' + itemskus[3]);
						}
					
					}else if (itemskus[0]=='PASTEL') {

						containStocks.push('TBOrigPast');
						containStocks.push('XTRA-'+itemskus[1]);
					
					}else if (itemskus2[0]=='TBBundle'){

						let itemskus3 = itemskus2[0].split('+');
						
						if (itemskus3[0]=='OrigPastel') {
							containStocks.push('TBOrigPast');
						}else if (itemskus3[0]=='OrigVibe') {
							containStocks.push('TBOrigVibe');
						}

						if (itemskus3[1]=='cool') {
							containStocks.push('TBOrigCool');
						}else if (itemskus3[1]=='ExprVibe') {
							containStocks.push('TBExpVibe');
						}
					
					}else if (itemskus[0]=='TBCOOL'){

						containStocks.push('TBOrigCool');
						if (itemskus[1]=='PASTEL') {
							containStocks.push('TBOrigPast');
						}else if (itemskus[1]=='VIBE') {
							containStocks.push('TBOrigVibe');
						}

					}else if (itemskus[0]=='TBX') {
						if (itemskus[1] != '$10') {
							containStocks.push('XTRA-'+itemskus[1]);
						}
						
					}else if (itemskus[0]=='ULTIMATE') {

						containStocks.push('TBOrigCool');

						if (itemskus[1]=='PASTEL') {
							containStocks.push('TBOrigPast');
						}else if (itemskus[1]=='VIBE') {
							containStocks.push('TBOrigVibe');
						}

						containStocks.push('XTRA-'+itemskus[2]);

					}else if (itemskus[0]=='VIBE') {

						containStocks.push('TBOrigVibe');
						containStocks.push('XTRA-'+itemskus[1]);
					
					}

					let stockValue = {};
					for (let contain of containStocks) {
						stockValue[stocksData[contain]] = 1;
					}
					
					if (Object.keys(stockValue).length > 0) {
						var sql3 = "UPDATE items set stock = '"+JSON.stringify(stockValue)+"' WHERE itemID = " + item.itemID;
						await conn.query(sql3);
					}
					

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