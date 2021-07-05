const {Config} = require('./config');
const Database = require('./connection');
const request = require('request');



const downloadItemsMagento = async function(req, res, next) {
	conn = new Database(dbconn);

	var service = req.params.service;
	var store = req.params.store || null;
	var storeAll = false;

	var total;
	var attributesLabels = {};

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

			
			const options = {
			  url: Config.STORES[store].url + '/rest/V1/products/attributes?'+
			  'searchCriteria=all',
			  
			  headers: {
			    'Content-Type': 'application/json',
			    'Authorization': 'Bearer ' + Config.STORES[store].AccessToken,
			  }
			};

			await new Promise((resolve, reject) => request(options, (error, response, body) => {
			  if (!error && response.statusCode == 200) {
			    const data = JSON.parse(body);
			    for (let item of data.items) {
			    	if (item.options) {
			    		for (let opt of item.options) {
			    			attributesLabels[opt.value] = opt.label;
			    		}
			    	}
			    }
			    resolve(true);
			  }
			}));


			const options2 = {
			  url: Config.STORES[store].url + '/rest/V1/products?'+
			  'searchCriteria[filter_groups][0][filters][0][field]=status&'+
			  'searchCriteria[filter_groups][0][filters][0][value]=1&'+
			  'searchCriteria[filter_groups][0][filters][0][condition_type]=eq&'+
			  'searchCriteria[filter_groups][1][filters][0][field]=category_id&'+
			  'searchCriteria[filter_groups][1][filters][0][value]=376,3,5,7,14,24,41,44,60&'+
			  'searchCriteria[filter_groups][1][filters][0][condition_type]=nin&'+
			  'searchCriteria[pageSize]=1',
			  
			  headers: {
			    'Content-Type': 'application/json',
			    'Authorization': 'Bearer ' + Config.STORES[store].AccessToken,
			  }
			};

			var total = await new Promise((resolve, reject) => request(options2, (error, response, body) => {
			  if (!error && response.statusCode == 200) {
			    const data = JSON.parse(body);
			    resolve(data.total_count);
			  }
			}));
			
			let totalPage = Math.ceil(parseInt(total)/200);

			//console.log(total, totalPage);

			//break;

			let items = [];
			let count = 0;
            await conn.connect();

			await (async function()  {
				for (let page=1; page<=totalPage; page++) {
					const options = {
					  url: Config.STORES[store].url + '/rest/V1/products?'+
					  'searchCriteria[filter_groups][0][filters][0][field]=status&'+
					  'searchCriteria[filter_groups][0][filters][0][value]=1&'+
					  'searchCriteria[filter_groups][0][filters][0][condition_type]=eq&'+
					  'searchCriteria[filter_groups][1][filters][0][field]=category_id&'+
					  'searchCriteria[filter_groups][1][filters][0][value]=376,3,5,7,14,24,41,44,60&'+
					  'searchCriteria[filter_groups][1][filters][0][condition_type]=nin&'+
					  'searchCriteria[currentPage]='+page+'&'+
					  'searchCriteria[pageSize]=200',
					  
					  headers: {
					    'Content-Type': 'application/json',
					    'Authorization': 'Bearer ' + Config.STORES[store].AccessToken,
					  }
					};
					await new Promise((resolve, reject) => request(options, async (error, response, body) => {
					  if (!error && response.statusCode == 200) {
					    const data = JSON.parse(body);
					    for (let item of data.items) {
					    	count++;
					    	if (!conn.connected) await conn.connect();
					    	let sku = conn.connection.escape(item.sku);
					    	let itemNo = conn.connection.escape(item.id);
					    	let itemName = conn.connection.escape(item.name);
					    	let barcode = null;
					    	let itemPhoto = null;
					    	let vari = [];
					    	for (let attribute of item.custom_attributes) {
					    		if (attribute.attribute_code == 'image') itemPhoto = conn.connection.escape('https://www.emega.com.au/pub/media/catalog/product'+attribute.value);
					    		if (attribute.attribute_code == 'barcode') barcode = conn.connection.escape(attribute.value);
					    		if (attribute.attribute_code.substring(0,5) == 'conf_') vari.push(attributesLabels[attribute.value]);
					    	}

					    	if (vari.length > 0) {
					    		itemName = conn.connection.escape(item.name + '[' + vari.join(',') + ']');
					    	}
					    	let sql1 = 'select 1 from items where sku = ' + sku + ' and itemStore = ' + store;
					    	let result1 = await conn.query(sql1);
					    	if (result1.length > 0) {
					    		let sql2 = 'UPDATE items SET itemName = ' + itemName + ', itemBarcode = ' + barcode + ', itemPhoto = ' + itemPhoto + ' WHERE sku = ' + sku + ' and itemStore = ' + store;
					    		let result2 = await conn.query(sql2);
					    		if (result2.affectedRows > 0) {
					    			console.log('Item ' + item.sku + ' updated.');
					    		}
					    		//resolve(true);
					    	}else{
					    		let sql2 = 'INSERT IGNORE INTO items (itemNo, sku, itemName, itemBarcode, itemPhoto, itemStore) VALUES (' + itemNo + ', ' + sku + ', ' + itemName + ', ' + barcode + ', ' + itemPhoto + ', ' + store + ')';
					    		let result2 = await conn.query(sql2);
					    		//resolve(true);
					    		console.log('Item ' + item.sku + ' inserted.');
					    		
					    	}
					    }
					    resolve(true);
					  } else {
					  	reject(error);
					  }
					}));
					
				}
			})();
			//await Promise.all(items);
			//console.log(items[1]);
			console.log(count);
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




module.exports = downloadItemsMagento;