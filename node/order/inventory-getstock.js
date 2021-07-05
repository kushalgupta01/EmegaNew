// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');

const getInventoryStock = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			try {
				await conn.connect();
				var sql = 'SELECT sku, itemName, quantity from inventory';
				//console.log(sql);
			
				var result = await conn.query(sql);
				if (result) {
					output.result = 'success';
					httpStatus = 200;

				}else{
					output.result = 'failed';
				}	
				
			}catch(e){
				console.log(e);
			}

			var items = {};
			for (let item of result) {
				items[item.sku] = item;
			}

			//console.log(items);
			output.items = items;
			
		} while(0);


	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = JSON.stringify(e);
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = getInventoryStock;