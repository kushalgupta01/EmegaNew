const {Config} = require('./config');
const Database = require('./connection');
const Shopify = require('shopify-api-node');

const limit = 250;



const downloadItemsShopify = async function(req, res, next) {
	conn = new Database(dbconn);

	var service = req.params.service;
	var store = req.params.store || null;
	var storeAll = false;

	var total;

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

		/*if (!keys.hasOwnProperty(store)) {
			output.result = 'Invalid store.';
			break;
		}*/

		res.set({
			'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
			'Pragma': 'no-cache',
		});
		res.json(httpStatus, output);
		
		try{
			
			await conn.connect();
			const shopify = new Shopify({
			    shopName: Config.STORES[store].shopName,
			    apiKey: Config.STORES[store].apiKey,
			    password: Config.STORES[store].password
			    //apiVersion: '2020-10'
			});

			let params = {limit: limit};

			do {
				const items = await shopify.product.list(params);
				console.log('----');
				for (const item of items) {
				  	// console.log(item);
				  	var itemId = item.id;
					var title = item.title;

					if (item.variants) {
						if (item.variants.length == 1) {
							var sku = conn.connection.escape(item.variants[0].sku != '' ? item.variants[0].sku : item.id);
							var picUrl = conn.connection.escape(item.image ? item.image.src : '');
							var sql2 = 'select itemID from items where itemNo = ' + itemId + ' and itemStore = ' + store;

							var sql2result = await conn.query(sql2);
									
							if (sql2result.length == 0){
						        var sql = 'INSERT IGNORE INTO items (itemNo, itemStore, itemName, itemPhoto, sku, customSku) VALUES ('+ itemId +', '+ store +', '+ conn.connection.escape(title) +', '+ picUrl +', '+ sku+', '+ sku+')';
						        //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemId;

						        var sqlresult = await conn.query(sql);
						        if (sqlresult.affectedRows > 0) {
						        	console.log(`Item ${item.title} inserted.`);
						        }
						    }else{
						        var sql = 'UPDATE items SET itemName = ' + conn.connection.escape(title) + ', sku = ' + sku + ', itemPhoto = ' + picUrl + ' WHERE itemID = ' + sql2result[0].itemID;
						        //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemId;

						        var sqlresult = await conn.query(sql);
						        if (sqlresult.affectedRows > 0) {
						        	console.log(`Item ${item.title} updated.`);
						        }
						    }
						} else {
							let variImages = {};
							for (let image of item.images) {
								if (image.variant_ids.length > 0) {
									let variant_ids = image.variant_ids;
									for (let variant_id of variant_ids) {
										if (!variImages.hasOwnProperty(variant_id)) {
											variImages[variant_id] = image.src;
										}
									}
								}
							}
							for (let vari of item.variants) {
								var variID = vari.id;
								var sku = conn.connection.escape(vari.sku != '' ? vari.sku : variID);
								var picUrl = conn.connection.escape(variImages.hasOwnProperty(variID) ? variImages[variID] : '');
								var sql2 = 'select itemID from items where itemNo = ' + itemId + ' and sku = ' + sku + ' and itemStore = ' + store;

								var sql2result = await conn.query(sql2);
										
								if (sql2result.length == 0){
							        var sql = 'INSERT IGNORE INTO items (itemNo, itemStore, itemName, itemPhoto, sku, customSku) VALUES ('+ itemId +', '+ store +', '+ conn.connection.escape(title + vari.title) +', '+ picUrl +', '+ sku+', '+ sku+')';
							        //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemId;

							        var sqlresult = await conn.query(sql);
							        if (sqlresult.affectedRows > 0) {
							        	console.log(`Item ${title + vari.title} inserted.`);
							        }
							    }else{
							        var sql = 'UPDATE items SET itemName = ' + conn.connection.escape(title + vari.title) + ', sku = ' + sku + ', itemPhoto = ' + picUrl + ' WHERE itemID = ' + sql2result[0].itemID;
							        //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemId;

							        var sqlresult = await conn.query(sql);
							        if (sqlresult.affectedRows > 0) {
							        	console.log(`Item ${title + vari.title} updated.`);
							        }
							    }
							}
						}
					}
						
			    }

				params = items.nextPageParameters;
			} while (params !== undefined);

	
		}catch (e) {
			// Error
			httpStatus = 503;
			output.result = e;
			console.log(e);
		}
	} while(0);

	if (conn.connected) conn.release();


	// Output
	/*res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);*/
	next();
}

module.exports = downloadItemsShopify;