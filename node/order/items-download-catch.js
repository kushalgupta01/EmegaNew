const {Config} = require('./config');
const Database = require('./connection');
const request = require('request');
const moment = require('moment-timezone');


const downloadItemsCatch = async function(req, res, next) {
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
				let sql = 'SELECT JSON_EXTRACT(o.data, "$.order_lines") as items FROM collecting c, orders o WHERE c.orderID = o.id AND (c.status = 0 OR c.status = 17 OR c.status = 18) AND o.store = ' + conn.connection.escape(storeID);

				let orders = await conn.query(sql);

				for (let order of orders) {
					for (let item of JSON.parse(order.items)) {

						if (!conn.connected) await conn.connect();

						let sku = conn.connection.escape(item.offer_sku);
						let itemNo = conn.connection.escape(item.offer_id);
						let itemName = conn.connection.escape(item.product_title);
						let barcode = null;
						let itemPhoto = null;
						if(Array.isArray(item.product_medias) && item.product_medias.length > 0){
							let productMedia;
							for (let media of item.product_medias) {
								if (media.type=='LARGE') {
									productMedia = media;
									break;
								}
							}

							itemPhoto = conn.connection.escape('https://marketplace.catch.com.au/mmp' + productMedia.media_url);
						}

						sql = 'select 1 from items where sku = ' + sku + ' and itemStore = ' + store;
						let result = await conn.query(sql);
						if (result.length > 0) {
							let sql2 = 'UPDATE items SET itemName = ' + itemName + ', itemPhoto = ' + itemPhoto + ' WHERE sku = ' + sku + ' and itemStore = ' + store;
							let result2 = await conn.query(sql2);
							if (result2.affectedRows > 0) {
								console.log('Item ' + sku + ' updated.');
							}
						}else{
							//Get barcode
							const options = {
								url: Config.STORES[store].url + '/api/offers/'+ itemNo,
								headers: {
									'Content-Type': 'application/json',
									'Authorization': Config.STORES[storeID].apiKey,
								}
							};

							await new Promise((resolve, reject) => request(options, (error, response, body) => {
								if (!error && response.statusCode == 200) {
									const data = JSON.parse(body);
									if(Array.isArray(data.product_references) && data.product_references.length > 0){
										for (let product_reference of data.product_references) {
											if(product_reference.reference_type == 'UPC' || product_reference.reference_type == 'EAN'){
												barcode = product_reference.reference;
											}
										}
									} else {
										barcode = '';
									}

								}
								resolve(true);
							}));
							
							let sql2 = 'INSERT IGNORE INTO items (itemNo, sku, customSku, itemName, singleItemBarcode, itemPhoto, itemStore) VALUES (' + itemNo + ', ' + sku + ', ' + sku + ', ' + itemName + ', ' + conn.connection.escape(barcode) + ', ' + itemPhoto + ', ' + store + ')';
							let result2 = await conn.query(sql2);
							if (result2) {
								console.log('Item ' + sku + ' inserted.');
							}								
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




module.exports = downloadItemsCatch;