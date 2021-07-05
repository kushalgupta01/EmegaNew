const {Config} = require('./config');
const Database = require('./connection');
const request = require('request');
const moment = require('moment-timezone');


const downloadItemsKogan = async function(req, res, next) {
	conn = new Database(dbconn);

	var service = req.params.service;
	var store = req.params.store || null;
	var storeAll = false;

	var output = {result: "success"};
	var httpStatus = 200;

	do {
		if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store))) {
			output.result = 'Invalid store.';
			break;
		}

		if (store == 'all') {
			storeAll = true;
		}

		res.set({
			'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
			'Pragma': 'no-cache',
		});
		res.json(httpStatus, output);
		
		try{
			// Download latest orders
			let orderStores = [];
			let orderData = [];
			
			for (let storeID in Config.STORES) {
				if ((!storeAll && storeID != store) || Config.STORES[storeID].service != service) continue;
				
				orderStores.push(storeID);
				
				await conn.connect();
				let sql = 'SELECT JSON_EXTRACT(o.data, "$.Items") as items FROM collecting c, orders o WHERE c.orderID = o.id AND (c.status = 0 OR c.status = 17 OR c.status = 18) AND o.store = ' + conn.connection.escape(storeID);

				let orders = await conn.query(sql);

				for (let order of orders) {
					for (let item of JSON.parse(order.items)) {

						if (!conn.connected) await conn.connect();

						let sku = item.SellerSku;
						let itemNo = item.SellerSku;
						let itemName = '';
						let barcode = null;
						let itemPhoto = null;

						//Get item detail
						const options = {
							url: Config.STORES[storeID].url + '/api/marketplace/v2/products?' +
							  'sku=' + sku +
							  '&detail=true'
							,
							headers: {
							  'Content-Type': 'application/json',
							  'SellerID': Config.STORES[storeID].username,
							  'SellerToken': Config.STORES[storeID].password,
							},
						};

						await new Promise((resolve, reject) => request(options, (error, response, body) => {
							if (!error && response.statusCode == 200) {
								const data = JSON.parse(body);
								const results = data.body.results;
								if(results && results.length > 0) {
									let productItem = results[0];

									itemName = productItem.product_title;
									barcode = productItem.product_gtin ? productItem.product_gtin : '';
									itemPhoto = productItem.images && Array.isArray(productItem.images) && productItem.images.length > 0 ?
										productItem.images[0] : '';
								}
								
								resolve(true);
							}
						}));
						
						let result = await conn.query('SELECT 1 FROM items WHERE itemStore = ' + storeID + ' AND sku = ' +  conn.connection.escape(sku));

						if (result.length==0) {
							let sql = `INSERT IGNORE INTO items (itemNo, sku, customSku, itemName, singleItemBarcode, itemPhoto, itemStore) 
							  VALUES (` + conn.connection.escape(itemNo) + `, ` + conn.connection.escape(sku) + `, ` + conn.connection.escape(sku) + `, ` + conn.connection.escape(itemName) + `, ` + conn.connection.escape(barcode) + `, ` + conn.connection.escape(itemPhoto) + `, ` + store + `)`;
						    await conn.query(sql);
						} 	
					}
				}
			}			
		}catch (e) {
			// Error
			httpStatus = 503;
			output.result = e;
			console.log(e);
		}
		
	} while(0);

	if (conn.connected) conn.release();

	next();
}




module.exports = downloadItemsKogan;