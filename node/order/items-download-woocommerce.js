const {Config} = require('./config');
const Database = require('./connection');
//const mysql = require('mysql');
const WooCommerceAPI = require('woocommerce-api');




const downloadItemsWooCommerce = async function(req, res, next) {
	conn = new Database(dbconn);

	var service = req.params.service;
	var store = req.params.store || null;
	var storeAll = false;

	var output = {result: "success"};
	var httpStatus = 200;
	//var keys = Config.woocommerceAPI;


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
			var WooCommerce = new WooCommerceAPI({
			  url: Config.STORES[store].url,
			  consumerKey: Config.STORES[store].consumerKey,
			  consumerSecret: Config.STORES[store].consumerSecret,
			  wpAPI: true,
			  version: 'wc/v2'
			});

			await (async function(){
				WooCommerce.get('products?status=publish&per_page=100', async function(err, data, res) {
					// console.log(res);
					await conn.connect();
					for (const item of JSON.parse(res)) {
						// var variations = conn.connection.escape(item.variations);
						if(item.variations.length > 0){
							// console.log(JSON.stringify(item));
							// console.log(item.id,item.variations);
							await (async function(){
								WooCommerce.get('products/'+item.id+'/variations/', async function(errNested, dataNested, resNested){
									// console.log(resNested,'\n\n');//+item.variations[variation]
									for(const itemNested of JSON.parse(resNested)){
										var itemIdNested = conn.connection.escape(itemNested.id);
										var titleNested = conn.connection.escape(item.name)+' - '+conn.connection.escape(itemNested.attributes[0].option);
										var picUrlNested = conn.connection.escape(itemNested.image.src);
										var skuNested = conn.connection.escape(itemNested.sku);
										titleNested = titleNested.replace(/'/g,'');
										titleNested = '\''+titleNested+'\'';
										// console.log(item.id,itemIdNested,skuNested,titleNested);
										var sql2 = 'select 1 from items where itemNo = ' + item.id + ' and itemStore = ' + store + ' and sku = ' + skuNested + ' and itemName = ' + titleNested;

										var sql2result = await conn.query(sql2);
												
										if (sql2result.length == 0){
									        var sql = 'INSERT IGNORE INTO items (itemNo, itemStore, itemName, itemPhoto, sku) VALUES ('+ item.id +', '+ store +', '+ titleNested +', '+ picUrlNested +', '+ skuNested+')';
									        //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemId;

									        var sqlresult = await conn.query(sql);
									        if (sqlresult.affectedRows > 0) {
									        	console.log(`Item ${titleNested} inserted.`);
									        }
									    }
									    else{
									      console.log(`Item ${titleNested} exists.`);
									    }
									}
								});
							})();
						}else{
							var itemId = conn.connection.escape(item.id);
							var title = conn.connection.escape(item.name);
							var picUrl = conn.connection.escape(item.images[0].src);
							var sku = conn.connection.escape(item.sku);
							var sql2 = 'select 1 from items where itemNo = ' + itemId + ' and itemStore = ' + store + ' and sku = ' + sku;

							var sql2result = await conn.query(sql2);
									
							if (sql2result.length == 0){
						        var sql = 'INSERT IGNORE INTO items (itemNo, itemStore, itemName, itemPhoto, sku) VALUES ('+ itemId +', '+ store +', '+ title +', '+ picUrl +', '+ sku+')';
						        //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemId;

						        var sqlresult = await conn.query(sql);
						        if (sqlresult.affectedRows > 0) {
						        	console.log(`Item ${item.name} inserted.`);
						        }
						    }else{
						      console.log(`Item ${item.name} exists.`);
						    }
						}
					}
			    });
			})();
	
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




module.exports = downloadItemsWooCommerce;