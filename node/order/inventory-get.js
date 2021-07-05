// Discount Chemist
// Order System

// Get/update orders from the database

const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData} = require('./order-convert');

const getInventory = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (method == 'get') {
				// Get skus
				let sku = req.params.sku || null;
				let itemNo = req.params.itemNo || null;
				
				if (!sku || !itemNo) {
					output.result = 'Invalid sku/item number.';
					break;
				}

				// Get order from the database
				await conn.connect();
				let items = await conn.query('SELECT * FROM inventory  WHERE ' + sku ? 'sku = '+sku : 'itemNo = ' + itemNo );

				if (!order) {
					httpStatus = 200;
					output.result = 'Order not found';
					output.orders = null;
					break;
				}
				

				output.items = items;
				output.result = 'success';
				httpStatus = 200;
			}
			else if (method == 'post') {
				try {
					let skus = req.body.skus || null;
					await conn.connect();
					var sql = 'SELECT sku, itemName, quantity from inventory WHERE sku in ('+ JSON.parse(skus).map(x => conn.connection.escape(x[0])).join(',') + ')';
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
			}
			else {
				output.result = 'wrong method';
			}
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

module.exports = getInventory;