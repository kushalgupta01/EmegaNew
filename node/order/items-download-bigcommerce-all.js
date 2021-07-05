const {Config} = require('./config');
const Database = require('./connection');
//const mysql = require('mysql');
const BigCommerceAPI = require('node-bigcommerce');




const downloadItemsBigCommerceAll = async function(req, res, next) {
	conn = new Database(dbconn);

	var service = req.params.service;
	var store = req.params.store || null;
	var storeAll = false;

	var total;

	var output = {result: "success"};
	var httpStatus = 200;

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);

	let BigCommerceStores = [31, 32, 33, 34, 35];

	for (let store of BigCommerceStores) {
		var BigCommerce = new BigCommerceAPI({
			clientId: Config.STORES[store].clientId,
			accessToken: Config.STORES[store].accessToken,
			storeHash: Config.STORES[store].storeHash,
			responseType: 'json',
			apiVersion: 'v3'
		});


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

			
			
			try{
				await BigCommerce.get('/catalog/variants?limit=100')
				   .then(data => {
				  		total = data.meta.pagination.total;
			       });
				let page = Math.ceil(total/100);
				await (async function(){
					for (let i=1; i<=page; i++) {
						await BigCommerce.get('/catalog/variants?page='+i+'&limit=100').then(async (data) => {
						  await conn.connect();
						  for (const item of data.data) {
						  	var itemId = conn.connection.escape(item.product_id);
							var title = conn.connection.escape('');
							var sku = conn.connection.escape(item.sku);

							var picUrl = conn.connection.escape(item.image_url);
							var sql2 = 'select itemID from items where sku = ' + sku + ' and itemStore = ' + store;

							var sql2result = await conn.query(sql2);
									
							if (sql2result.length == 0){
						        var sql = 'INSERT IGNORE INTO items (itemNo, itemStore, itemName, itemPhoto, sku, customSku) VALUES ('+ itemId +', '+ store +', '+ title +', '+ picUrl +', '+ sku+', '+ sku+')';
						        //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemId;

						        var sqlresult = await conn.query(sql);
						        if (sqlresult.affectedRows > 0) {
						        	console.log(`Item ${item.sku} inserted.`);
						        }
						    }else{
						        var sql = 'UPDATE items SET itemNo = ' + itemId + ' WHERE itemID = ' + sql2result[0].itemID;
						        //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemId;

						        var sqlresult = await conn.query(sql);
						        if (sqlresult.affectedRows > 0) {
						        	console.log(`Item ${item.sku} updated.`);
						        }
						    }
					       }
					    });
					}

					// Update Names
					var sql3 = 'SELECT itemID, itemNo, sku FROM items WHERE itemName = ' + conn.connection.escape('') + ' AND itemStore = ' +  conn.connection.escape(store);
					let items = await conn.query(sql3);
					let name;
					for (let item of items) {
						let variation = item.sku.split('-').slice(1).join('-');
						await BigCommerce.get('/catalog/products/'+item.itemNo)
						   .then(data => {
						  		name = data.data.name;
					       });
					    let result4 = await conn.query('UPDATE items SET itemName='+conn.connection.escape(variation ? name+' ['+variation+']' : name)+' WHERE itemID=' + conn.connection.escape(item.itemID));
					    if (result4.affectedRows > 0) {
					    	console.log('item ' + name + ' updated');
					    }
					}

					// Update image
					var sql5 = 'SELECT itemID, itemNo FROM items WHERE itemPhoto = ' + conn.connection.escape('') + ' AND itemStore = ' +  conn.connection.escape(store);
					let itemsNopic = await conn.query(sql5);
					let imgUrl;
					for (let item of itemsNopic) {
						await BigCommerce.get('/catalog/products/'+item.itemNo+'/images')
						   .then(data => {
						  		let imgs = data.data;
						  		for (let img of imgs) {
						  			if (img.is_thumbnail) {
						  				imgUrl = img.url_zoom;
						  				break;
						  			}
						  		}
					       });
					    let result6 = await conn.query('UPDATE items SET itemPhoto='+conn.connection.escape(imgUrl)+' WHERE itemID=' + conn.connection.escape(item.itemID));
					    if (result6.affectedRows > 0) {
					    	console.log('item ' + item.itemID + ' updated');
					    }
					}

				})();
		
			}catch (e) {
				// Error
				httpStatus = 503;
				output.result = e;
				console.log(e);
			}
		} while(0);
	}

		

	if (conn.connected) conn.release();


	// Output
	/*res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);*/
	next();
}




module.exports = downloadItemsBigCommerceAll;