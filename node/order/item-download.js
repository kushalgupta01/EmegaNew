const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData} = require('./order-convert');
const ebay = require('ebay-api');
const { NetoAPI } = require("neto-api");
const Shopify = require('shopify-api-node');
const BigCommerceAPI = require('node-bigcommerce');
const WooCommerceAPI = require('woocommerce-api');
const request = require('request');

const itemDownload = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;
	var tokens = Config.ebayAPI.tokens;

	await conn.connect();
	
	try {
		do {
			if (method == 'post') {
				let itemNo = req.body.itemNo || null;
				let store = req.body.store || null;
				let sku = req.body.sku || null;
				/*let lineitemid = req.body.lineitemid || null;
				let orderID = req.body.orderID || null;*/

				if (Config.STORES[store].service == Config.SERVICE_IDS.EBAY) {
					let result = await new Promise((resolve, reject) => {
				        ebay.xmlRequest({
				          serviceName : 'Trading',
				          //opType : 'GetOrders',
				          opType : 'GetItem',

				          // app/environment
				          devId: Config.ebayAPI.devID,
				          certId: Config.ebayAPI.certID,
				          appId: Config.ebayAPI.appID,
				          sandbox: false,

				          // per user
				          authToken: tokens[store],

				          params: {
				            'ItemID': itemNo,
				            'DetailLevel': 'ItemReturnAttributes'
				          }
				        }, function(error, results) {
				            //console.log(JSON.stringify(results));
				            //if (error) reject(error);
				            resolve(results);
				      
				         });
				    });
				    //console.log(JSON.stringify(result));
				   	
				   	let item = result.Item;

				   	if (!item) {
				   		output.result = JSON.stringify(result);
				   		if (result.Errors) {
				   			output.result = result.Errors.LongMessage;
				   		}
				    	httpStatus = 400;
				    	break;
				   	}
					
					var sql1 = 'select 1 from items where itemNo = ' + itemNo + ' and itemStore = ' + store;
						        
		            var result1 = await conn.query(sql1);
		            //console.log(result1);
			        if (result1.length == 0){
		          		if(!item.Variations) {
				            var title = conn.connection.escape(item.Title);

				            let sku = conn.connection.escape(null);

				            if (item.SKU) {
				            	sku = conn.connection.escape(item.SKU);
				            }

				            var picUrl = '';

				            if (item.PictureDetails) {
				            	picUrl = conn.connection.escape(item.PictureDetails.GalleryURL);
				            }

				            let ebayqty = parseInt(item.Quantity) - parseInt(item.SellingStatus.QuantitySold) - parseInt(item.SellingStatus.QuantitySoldByPickupInStore);

				            var price = conn.connection.escape(item.SellingStatus.CurrentPrice.amount);

				            var sql2 = 'INSERT IGNORE INTO items (itemNo, itemStore, itemName, itemPhoto, sku, customSku, ebayquantity, itemPrice) VALUES ('+ itemNo +','+store+','+ title +','+ picUrl +','+ sku+','+ sku+','+ ebayqty+','+ price+')';

			                await conn.query(sql2);
		                    console.log("Item " + itemNo + " inserted");
					            
				        }else{
			          		var variations = item.Variations.Variation;
			          		var pictures = item.Variations.Pictures;
			          		let picUrls = {};
			          		let picSpecificName = pictures ? pictures.VariationSpecificName : '';
			          		if (pictures && pictures.VariationSpecificPictureSet) {
			          			for (let pic of item.Variations.Pictures.VariationSpecificPictureSet) {
			          				//console.log(pic.PictureURL);
			          				picUrls[pic.VariationSpecificValue] = Array.isArray(pic.PictureURL) ? pic.PictureURL[0] : pic.PictureURL;
				          		}
			          		}
				          		
			          		for (let k=0; k<variations.length; k++) {
			          			let picUrl = '';
			          			var variation = variations[k];
			          			let nameValueList = variation.VariationSpecifics.NameValueList;
			          			let valueList = [];
			          			for (let nameValuepair of nameValueList) {
			          				valueList.push(nameValuepair.Value);
			          				if (picSpecificName) {
			          					if (nameValuepair.Name==picSpecificName) {
				          					picUrl = picUrls.hasOwnProperty(nameValuepair.Value) ? picUrls[nameValuepair.Value] : item.PictureDetails.GalleryURL;
				          					picUrl = conn.connection.escape(picUrl);
				          				}
				          			} else {
				          				picUrl = conn.connection.escape(item.PictureDetails.GalleryURL);
				          			}
			          			}
				          			
			          			var title = conn.connection.escape(item.Title + '[' + valueList.join(',') +']');
			          			let sku = conn.connection.escape(null);
					            if (variation.SKU) {
					            	sku = conn.connection.escape(variation.SKU);
					            }
					            let ebayqty = parseInt(variation.Quantity) - parseInt(variation.SellingStatus.QuantitySold) - parseInt(variation.SellingStatus.QuantitySoldByPickupInStore);

					            var price = conn.connection.escape(variation.StartPrice.amount);
					            
					            var sql3 = 'INSERT IGNORE INTO items (itemNo, itemStore, itemName, itemPhoto, sku, customSku, ebayquantity, itemPrice) VALUES ('+ itemNo +',' + store + ','+ title +','+ picUrl +','+ sku+','+ sku+','+ ebayqty+','+ price+')';
				                //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemNo;

				                await conn.query(sql3);
			                    console.log("Item " + itemNo +" variation " + sku + " inserted");
			          		}

				        }
		                  

			        }else if (result1.length == 1){
			            if(!item.Variations) {
				            var title = conn.connection.escape(item.Title);

				            let sku = conn.connection.escape(null);

				            if (item.SKU) {
				            	sku = conn.connection.escape(item.SKU);
				            }

				            var picUrl = '';

				            if (item.PictureDetails) {
				            	picUrl = conn.connection.escape(item.PictureDetails.GalleryURL);
				            }

				            let ebayqty = parseInt(item.Quantity) - parseInt(item.SellingStatus.QuantitySold) - parseInt(item.SellingStatus.QuantitySoldByPickupInStore);

				            var price = conn.connection.escape(item.SellingStatus.CurrentPrice.amount);

				            var sql2 = 'UPDATE items SET itemName = ' + title + ', sku = ' + sku+ ', customSku = ' + sku + ', itemPhoto = ' + picUrl + ', ebayquantity = ' + ebayqty+ ', itemPrice = ' + price+ ' WHERE itemNo = ' + conn.connection.escape(itemNo);
			                //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemNo;

			                var result2 = await conn.query(sql2);
		                    console.log("Item " + itemNo + " updated");
						            
					     }
			        }else if (result1.length > 1){
			            if(item.Variations) {
			            	let picUrl;
			              	let variations = item.Variations.Variation;
			              	var pictures = item.Variations.Pictures;
			          		let picUrls = {};
			          		let picSpecificName = pictures ? pictures.VariationSpecificName : '';
			          		if (pictures && pictures.VariationSpecificPictureSet) {
			          			if (Array.isArray(pictures.VariationSpecificPictureSet)) {
			          				for (let pic of pictures.VariationSpecificPictureSet) {
				          				picUrls[pic.VariationSpecificValue] = Array.isArray(pic.PictureURL) ? pic.PictureURL[0] : pic.PictureURL;
					          		}
			          			} else {
			          				let pic = pictures.VariationSpecificPictureSet;
			          				picUrls[pic.VariationSpecificValue] = Array.isArray(pic.PictureURL) ? pic.PictureURL[0] : pic.PictureURL;
			          			}
			          		}
		              	    for (let variation of variations) {
		              	  		let nameValueList = variation.VariationSpecifics.NameValueList;
			          			let valueList = [];
			          			 
		          				for (let nameValuepair of nameValueList) {
			          				valueList.push(nameValuepair.Value);
			          				if (picSpecificName) {
			          					if (nameValuepair.Name==picSpecificName) {
				          					picUrl = picUrls.hasOwnProperty(nameValuepair.Value) ? picUrls[nameValuepair.Value] : item.PictureDetails.GalleryURL;
				          					picUrl = conn.connection.escape(picUrl);
				          				}
				          			} else {
				          				picUrl = conn.connection.escape(item.PictureDetails.GalleryURL);
				          			}
			          			}
			          			var title = conn.connection.escape(item.Title + '[' + valueList.join(',') +']');

					            let sku = conn.connection.escape(null);

					            if (variation.SKU) {
					            	sku = conn.connection.escape(variation.SKU);
					            }

					            let ebayqty = parseInt(variation.Quantity) - parseInt(variation.SellingStatus.QuantitySold) - parseInt(variation.SellingStatus.QuantitySoldByPickupInStore);

					            var price = conn.connection.escape(variation.StartPrice.amount);

					            let sql2 = 'SELECT 1 from items WHERE itemNo = ' + itemNo + ' and sku = ' + sku;
					            var result2 = await conn.query(sql2);
					            if (result2.length>0) {
					            	var sql3 = 'UPDATE items SET itemName = ' + title + ', itemPhoto = ' + picUrl+ ', ebayquantity = ' + ebayqty + ', customSku = ' + sku+ ', itemPrice = ' + price+ ' WHERE sku = ' + sku + ' and itemNo = ' + conn.connection.escape(itemNo);
					                //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemNo;
					                console.log(sql3);
					                var result3 = await conn.query(sql3);
				                    console.log("Item " + sku + " updated");
					            }else{
					            	var sql3 = 'INSERT IGNORE INTO items (itemNo, itemStore, itemName, itemPhoto, sku, customSku, ebayquantity, itemPrice) VALUES ('+ itemNo +','+store+','+ title +','+ picUrl +','+ sku+','+ sku+','+ ebayqty+','+ price+')';
					                //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemNo;

					                var result3 = await conn.query(sql3);
				                    console.log("Item " + sku + " updated");
					            }

					            
		              	    }
						            
						            
					     }
			        }

			        output.result = 'success';
				    httpStatus = 200;

				} else if (Config.STORES[store].service == Config.SERVICE_IDS.NETO) {
					const mySite = new NetoAPI({
					  url: "https://www.hobbyco.com.au/",
					  key: Config.STORES[store].apiKey,
					  //user: "user" // optional
					});

					//await conn.connect();

					let items = await new Promise((resolve, reject) => {
						mySite.item
							  .get({ SKU: [sku],
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

					let item = items[0];
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

			            var sql2 = 'INSERT IGNORE INTO items (itemStore, itemName, itemPhoto, sku, customSku, singleItemBarcode, itemWeight, itemPrice) VALUES ('+store+','+ title +','+ picUrl +','+ sku+','+ sku +','+ barcode+','+ weight+','+ price+')';

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

			            var sql2 = 'UPDATE items SET itemName = ' + title + ', customSku = ' + sku + ', itemPhoto = ' + picUrl + ', singleItemBarcode = ' + barcode+ ', itemWeight = ' + weight+ ', itemPrice = ' + price  + ' WHERE sku = ' + sku + ' and itemStore = ' + store;
		                //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemNo;
		                var result2 = await conn.query(sql2);
	                    console.log("Item " + sku + " updated"); 
			        }

					output.result = 'success';
				    httpStatus = 200;
				
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.KOGAN) {

					let itemName = '';
					let barcode = null;
					let itemPhoto = null;

					const options = {
						url: Config.STORES[store].url + '/api/marketplace/v2/products?' +
						  'sku=' + sku +
						  '&detail=true'
						,
						headers: {
						  'Content-Type': 'application/json',
						  'SellerID': Config.STORES[store].username,
						  'SellerToken': Config.STORES[store].password,
						},
					};

					//await conn.connect();

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
					
					let result = await conn.query('SELECT 1 FROM items WHERE itemStore = ' + store + ' AND sku = ' +  conn.connection.escape(sku));

					if (result.length==0) {
						let sql = `INSERT IGNORE INTO items (itemNo, sku, customSku, itemName, singleItemBarcode, itemPhoto, itemStore) 
						  VALUES (` + conn.connection.escape(itemNo) + `, ` + conn.connection.escape(sku) + `, ` + conn.connection.escape(sku) + `, ` + conn.connection.escape(itemName) + `, ` + conn.connection.escape(barcode) + `, ` + conn.connection.escape(itemPhoto) + `, ` + store + `)`;
					    await conn.query(sql);
					} else if (result.length == 1){

			            var sql2 = 'UPDATE items SET itemName = ' + conn.connection.escape(itemName) + ', customSku = ' + conn.connection.escape(sku) + ', itemPhoto = ' + conn.connection.escape(itemPhoto) + ', singleItemBarcode = ' + conn.connection.escape(barcode) + ' WHERE sku = ' + conn.connection.escape(sku) + ' and itemStore = ' + store;
		                //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemNo;
		                var result2 = await conn.query(sql2);
	                    console.log("Item " + sku + " updated"); 
			        }

					output.result = 'success';
				    httpStatus = 200;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.CATCH) {

					let itemName = '';
					let barcode = null;
					let itemPhoto = 'https://www.hobbyco.com.au/assets/full/'+sku+'.jpg'; 

					const options = {
						url: Config.STORES[store].url + '/api/offers/'+ itemNo,
						headers: {
							'Content-Type': 'application/json',
							'Authorization': Config.STORES[store].apiKey,
						}
					};

					//await conn.connect();

					/*let sql1 = 'SELECT data FROM orders WHERE id = ' + orderID;
					let data = await conn.query(sql1);
					if (data) {
						let orderData = JSON.parse(data[0].data);
						let items = orderData.order_lines;
						for (let item of items) {
							if (item.order_line_id==lineitemid) {
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
							}
						}
					}*/


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
							itemName = data.product_title;

						}
						resolve(true);
					}));
					
					let result = await conn.query('SELECT 1 FROM items WHERE itemStore = ' + store + ' AND sku = ' +  conn.connection.escape(sku));

					if (result.length==0) {
						let sql = `INSERT IGNORE INTO items (itemNo, sku, customSku, itemName, singleItemBarcode, itemPhoto, itemStore) 
						  VALUES (` + conn.connection.escape(itemNo) + `, ` + conn.connection.escape(sku) + `, ` + conn.connection.escape(sku) + `, ` + conn.connection.escape(itemName) + `, ` + conn.connection.escape(barcode) + `, ` + conn.connection.escape(itemPhoto) + `, ` + store + `)`;
					    await conn.query(sql);
					} else if (result.length == 1){

			            var sql2 = 'UPDATE items SET itemName = ' + conn.connection.escape(itemName) + ', customSku = ' + conn.connection.escape(sku) + ', itemPhoto = ' + conn.connection.escape(itemPhoto) + ', singleItemBarcode = ' + conn.connection.escape(barcode) + ' WHERE sku = ' + conn.connection.escape(sku) + ' and itemStore = ' + store;
		                //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemNo;
		                var result2 = await conn.query(sql2);
	                    console.log("Item " + sku + " updated"); 
			        }

					output.result = 'success';
				    httpStatus = 200;
				} else if (Config.STORES[store].service == Config.SERVICE_IDS.SHOPIFY) {
					const shopify = new Shopify({
					    shopName: Config.STORES[store].shopName,
					    apiKey: Config.STORES[store].apiKey,
					    password: Config.STORES[store].password
					    //apiVersion: '2020-10'
					});

					const item = await shopify.product.get(itemNo);

					// console.log(item);

					var itemId = item.id;
					var title = item.title;

					if (item.variants) {
						if (item.variants.length == 1) {
							let sku = conn.connection.escape(item.variants[0].sku != '' ? item.variants[0].sku : item.id);
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
								let sku = conn.connection.escape(vari.sku != '' ? vari.sku : variID);
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

					output.result = 'success';
				    httpStatus = 200;

				} else if (Config.STORES[store].service == Config.SERVICE_IDS.BIGCOMMERCE) {
					var BigCommerce = new BigCommerceAPI({
						clientId: Config.STORES[store].clientId,
						accessToken: Config.STORES[store].accessToken,
						storeHash: Config.STORES[store].storeHash,
						responseType: 'json',
						apiVersion: 'v3'
					});

					await BigCommerce.get('/catalog/products/'+ itemNo +'/variants').then(async (data) => {
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

					output.result = 'success';
				    httpStatus = 200;

				} else if (Config.STORES[store].service == Config.SERVICE_IDS.WOOCOMMERCE) {
					var WooCommerce = new WooCommerceAPI({
					  url: Config.STORES[store].url,
					  consumerKey: Config.STORES[store].consumerKey,
					  consumerSecret: Config.STORES[store].consumerSecret,
					  wpAPI: true,
					  version: 'wc/v2'
					});

					let item = await WooCommerce.getAsync('products/'+itemNo).then( function(response) {
						return response.body;
					});

					item = JSON.parse(item);
					
					// var variations = conn.connection.escape(item.variations);
					if(item.variations.length > 0){
						// console.log(JSON.stringify(item));
						// console.log(item.id,item.variations);
						
						let resNested =	await WooCommerce.getAsync('products/'+item.id+'/variations/').then(function(response){
							return response.body;
						});

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
							

					}else{
						var itemId = conn.connection.escape(item.id);
						var title = conn.connection.escape(item.name);
						var picUrl = conn.connection.escape(item.images[0].src);
						let sku = conn.connection.escape(item.sku);
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
						

					output.result = 'success';
				    httpStatus = 200;

				} else if (Config.STORES[store].service == Config.SERVICE_IDS.MAGENTO) {
					var attributesLabels = {};
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
					  url: Config.STORES[store].url + '/rest/V1/products/'+sku,
					  headers: {
					    'Content-Type': 'application/json',
					    'Authorization': 'Bearer ' + Config.STORES[store].AccessToken,
					  }
					};

					await new Promise((resolve, reject) => request(options2, async (error, response, body) => {
					  if (!error && response.statusCode == 200) {
					    const item = JSON.parse(body);
					    
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
					    
					    resolve(true);
					  } else {
					  	reject(error);
					  }
					}));

					output.result = 'success';
				    httpStatus = 200;

				} else {
					output.result = 'Function not support this store.';
				    httpStatus = 400;
				}
					
				let itemRows = await conn.query('SELECT * FROM items WHERE sku = ' + conn.connection.escape(sku) + ' AND itemStore = ' + store);
				
				let itemData = [];
				for (let item of itemRows) {
					let entry = {};
					
					// Item details
					entry.id = item.itemID;
					entry.num = item.itemNo;
					entry.name = item.itemName;
					entry.barcode = item.itemBarcode;
					entry.storeID = item.itemStore;
					entry.quantity = item.itemMultiple;
					entry.imageUrl = item.itemPhoto;
					entry.flatpack = item.flatpack;
					entry.bay = item.bay;
					entry.vr = item.vr;
					entry.fwfp = item.fwfp;
					entry.sku = item.sku || '';
					entry.customSku = item.customSku || '';
					entry.satchel = item.satchel || '';
					if (!entry.weight) entry.weight = item.itemWeight;
					entry.stock = item.stock || '';
					entry.bundle = item.bundle;
					entry.factory = item.factory;
					entry.costco = item.costco;
					entry.inventory = item.inventory;
					// entry.fgb = item.fgb;
					// entry.morlife = item.morlife;
					entry.singleItemBarcode = item.singleItemBarcode;
					entry.singleItemMultiple = item.singleItemMultiple;
					entry.ebayquantity = item.ebayquantity;
					
					itemData.push(entry);
				}
				
				output.items = itemData;
									
			}
			else {
				output.result = 'wrong method';
			}
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		console.log(e);
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

module.exports = itemDownload;