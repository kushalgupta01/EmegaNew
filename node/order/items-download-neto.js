const {Config} = require('./config');
const Database = require('./connection');
const { NetoAPI } = require("neto-api");




const downloadItemsNeto = async function(req, res, next) {
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

		res.set({
			'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
			'Pragma': 'no-cache',
		});
		res.json(httpStatus, output);
		
		try{
			
			const mySite = new NetoAPI({
			  url: "https://www.hobbyco.com.au/",
			  key: Config.STORES[store].apiKey,
			  //user: "user" // optional
			});

			await conn.connect();

			let sql = 'SELECT JSON_EXTRACT(o.data, "$.OrderLine") as items FROM collecting c, orders o WHERE c.orderID = o.id AND c.status = 0 AND o.store = ' + store;

			let orders = await conn.query(sql);

			let skus = [];

			for (let order of orders) {
				for (let item of JSON.parse(order.items)) {
					skus.push(item.SKU);
				}
			}

			console.log(skus);

			let items = await new Promise((resolve, reject) => {
				mySite.item
					  .get({ SKU: skus,
					  		 OutputSelector: [
							      "ID",
							      "Brand",
							      "Name",
							      "ShippingWeight",
							      "RRP",
							      "ImageURL",
							      "Barcode",
							      "Images",
							      'UPC'
						    ],
					   })
					  .exec()
					  .then(response => {
					     resolve(response.Item);
					  })
			});

			for (let item of items) {
				// console.log(item);
			    var sql1 = 'select 1 from items where sku = ' + conn.connection.escape(item.SKU) + ' and itemStore = ' + store;
			        
	            var result1 = await conn.query(sql1);
	            //console.log(result1);
		        if (result1.length == 0){
	          		
		            let title = conn.connection.escape(item.Name);
		          
		            let	sku = conn.connection.escape(item.SKU);

		            let	barcode = conn.connection.escape(item.UPC);

		            let	weight = conn.connection.escape(item.ShippingWeight);

		            let	price = conn.connection.escape(item.RRP);

		            var picUrl = '';

		            if (item.Images) {
		            	if (item.Images[0]) {
		            		picUrl = conn.connection.escape(item.Images[0].URL);
		            	} else {
		            		picUrl = conn.connection.escape(picUrl);
		            	}
		            }

		            var sql2 = 'INSERT IGNORE INTO items (itemStore, itemName, itemPhoto, sku, customSku, singleItemBarcode, itemWeight) VALUES ('+store+','+ title +','+ picUrl +','+ sku+','+ sku +','+ barcode+','+ weight+')';

	                await conn.query(sql2);
                    console.log("Item " + sku + " inserted");

		        }else if (result1.length == 1){
		            
		            let title = conn.connection.escape(item.Name);

		            let sku = conn.connection.escape(item.SKU);

		            let	barcode = conn.connection.escape(item.UPC);

		            let	weight = conn.connection.escape(item.ShippingWeight);

		            let	price = conn.connection.escape(item.RRP);

		            var picUrl = '';

		            if (item.Images) {
		            	if (item.Images[0]) {
		            		picUrl = conn.connection.escape(item.Images[0].URL);
		            	} else {
		            		picUrl = conn.connection.escape(picUrl);
		            	}
		            }

		            var sql2 = 'UPDATE items SET itemName = ' + title + ', customSku = ' + sku + ', itemPhoto = ' + picUrl + ', singleItemBarcode = ' + barcode+ ', itemWeight = ' + weight  + ' WHERE sku = ' + sku + ' and itemStore = ' + store;
		            //var sql2 = 'UPDATE items SET customSku = ' + sku + ', itemPhoto = ' + picUrl + ', itemBarcode = ' + barcode+ ', itemWeight = ' + weight  + ' WHERE sku = ' + sku + ' and itemStore = ' + store;
	                //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemNo;
	                var result2 = await conn.query(sql2);
                    console.log("Item " + sku + " updated"); 
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


	// Output
	/*res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);*/
	next();
}




module.exports = downloadItemsNeto;