const {Config} = require('./config');
const Database = require('./connection');
const eBaySession = require('./eBaySession');
const parseString = require('xml2js').parseString;
const ebay = require('ebay-api');
const mysql = require('mysql');




const downloadItemsEbay = async function(req, res, next) {
	conn = new Database(dbconn);

	var service = req.params.service;
	var store = req.params.store || null;
	var storeAll = false;

	var output = {result: "success"};
	var httpStatus = 200;
	var tokens = Config.ebayAPI.tokens;


	do {
		if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store))) {
			output.result = 'Invalid store.';
			break;
		}

		if (store == 'all') {
			storeAll = true;
		}

		if (!tokens.hasOwnProperty(store)) {
			output.result = 'Invalid store.';
			break;
		}

		res.set({
			'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
			'Pragma': 'no-cache',
		});
		res.json(httpStatus, output);

		await conn.connect();
		
		try{
			// Get selling manager listing
			var apiCall = 'GetMyeBaySelling';
			var requestBody = '<?xml version="1.0" encoding="utf-8" ?>\
			<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">\
			<RequesterCredentials><eBayAuthToken>'+tokens[store]+'</eBayAuthToken></RequesterCredentials>\
			<ActiveList><Include>true</Include><Pagination><EntriesPerPage>2</EntriesPerPage><PageNumber>1</PageNumber></Pagination></ActiveList>\
			<ErrorLanguage>en_AU</ErrorLanguage><WarningLevel>High</WarningLevel>\
			</GetMyeBaySellingRequest>';

			// Create eBay session
			var session = new eBaySession(Config.ebayAPI.devID, Config.ebayAPI.appID, Config.ebayAPI.certID, Config.ebayAPI.siteID);
			var responseXml = await session.sendHttpRequest(apiCall, requestBody);

			// Get sales record response
			if (!responseXml || responseXml.toUpperCase().includes('HTTP 404')) {
				output.result = 'Error sending request';
				break;
			}

			var responseJson = await new Promise((resolve, reject) => {
				parseString(responseXml, function (err, result) {
					//console.log(result);
					if (err) reject(err);
					resolve(result);
				});
			});

			const totalNumOfItems = responseJson.GetMyeBaySellingResponse.ActiveList[0].PaginationResult[0].TotalNumberOfEntries[0];
			const totalNumOfPages = Math.ceil(totalNumOfItems/200);
			console.log("totalNumOfPages: " + totalNumOfPages);
		

		
			//console.log('saving');
			await conn.connect();
			await (async function() {
				for (let j=1; j<=totalNumOfPages; j++){
					console.log("Page Number: " + j);
				    // Get selling manager listing
					var apiCall = 'GetMyeBaySelling';
					var requestBody = '<?xml version="1.0" encoding="utf-8" ?>\
					<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">\
					<RequesterCredentials><eBayAuthToken>'+tokens[store]+'</eBayAuthToken></RequesterCredentials>\
					<ActiveList><Include>true</Include><Pagination><EntriesPerPage>200</EntriesPerPage><PageNumber>'+j+'</PageNumber></Pagination></ActiveList>\
					<ErrorLanguage>en_AU</ErrorLanguage><WarningLevel>High</WarningLevel>\
					</GetMyeBaySellingRequest>';

					// Create eBay session
					var session = new eBaySession(Config.ebayAPI.devID, Config.ebayAPI.appID, Config.ebayAPI.certID, Config.ebayAPI.siteID);
					var responseXml = await session.sendHttpRequest(apiCall, requestBody);

					// Get sales record response
					if (!responseXml || responseXml.toUpperCase().includes('HTTP 404')) {
						output.result = 'Error sending request';
						break;
					}

					var responseJson = await new Promise((resolve, reject) => {
						parseString(responseXml, function (err, result) {
							//console.log(result);
							if (err) reject(err);
							resolve(result);
						});
					});

					var items = responseJson.GetMyeBaySellingResponse.ActiveList[0].ItemArray[0].Item;
					//console.log(JSON.stringify(items));
					try{
						for (i=0; i<items.length; i++){
				          var item = items[i];
				          
				          var itemId = conn.connection.escape(item.ItemID[0]);
				          var picUrl = conn.connection.escape(item.PictureDetails[0].GalleryURL[0]);
				          
				          var sql1 = 'select 1 from items where itemNo = ' + itemId + 'and itemStore = ' + store;
					        
			              var result1 = await conn.query(sql1);
			              //console.log(result1);
				          if (result1.length == 0){
				          		if(!item.Variations) {
							            var title = conn.connection.escape(item.Title[0]);

							            var sku = conn.connection.escape(null);

							            if (item.SKU) {
							            	sku = conn.connection.escape(item.SKU[0]);
							            }

							            var sql2 = 'INSERT IGNORE INTO items (itemNo, itemStore, itemName, itemPhoto, sku) VALUES ('+ itemId +','+store+','+ title +','+ picUrl +','+ sku+')';
						                //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemId;

						                var result = await conn.query(sql2);
					                    console.log("Item " + itemId + " inserted");
							            
						         }else{
						          		var variations = item.Variations[0].Variation;
						          		for (let k=0; k<variations.length; k++) {
						          			var variation = variations[k];

						          			var title = conn.connection.escape(variation.VariationTitle[0]);
						          			var sku = conn.connection.escape(null);
								            if (variation.SKU) {
								            	sku = conn.connection.escape(variation.SKU[0]);
								            }

								            var sql3 = 'INSERT IGNORE INTO items (itemNo, itemStore, itemName, itemPhoto, sku) VALUES ('+ itemId +',' + store + ','+ title +','+ picUrl +','+ sku+')';
							                //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemId;

							                var result = await conn.query(sql3);
						                    console.log("Item " + itemId +" variation " + sku + " inserted");
						          		}

						         }
			                  

				          }else if (result1.length == 1){
				              if(!item.Variations) {
							            var title = conn.connection.escape(item.Title[0]);

							            var sku = conn.connection.escape(null);

							            if (item.SKU) {
							            	sku = conn.connection.escape(item.SKU[0]);
							            }

							            var sql2 = 'UPDATE items SET itemName = ' + title + ', sku = ' + sku + ' WHERE itemNo = ' + itemId;
						                //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemId;

						                var result2 = await conn.query(sql2);
					                    console.log("Item " + itemId + " updated");
							            
						         }
				          }else if (result1.length > 1){
				              if(item.Variations) {
				              	let variations = item.Variations[0].Variation;
				              	  for (let variation of variations) {
				              	  		let title = conn.connection.escape(variation.VariationTitle[0]);

							            var sku = conn.connection.escape(null);

							            if (variation.SKU) {
							            	sku = conn.connection.escape(variation.SKU[0]);
							            }

							            let sql2 = 'SELECT 1 from items WHERE itemNo = ' + itemId + ' and sku = ' + sku;
							            var result2 = await conn.query(sql2);
							            if (result2.length>0) {
							            	var sql3 = 'UPDATE items SET itemName = ' + title + ' WHERE sku = ' + sku + ' and itemNo = ' + itemId;
							                //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemId;

							                var result3 = await conn.query(sql3);
						                    console.log("Item " + sku + " updated");
							            }else{
							            	var sql3 = 'INSERT IGNORE INTO items (itemNo, itemStore, itemName, itemPhoto, sku) VALUES ('+ itemId +','+store+','+ title +','+ picUrl +','+ sku+')';
							                //var sql = 'UPDATE items set sku = ' + sku + ' where itemNo = ' + itemId;

							                var result3 = await conn.query(sql3);
						                    console.log("Item " + sku + " updated");
							            }

							            
				              	  }
							            
							            
						        }
				          }

				          
					          
				              
				       }


				       httpStatus = 200;
					   output.result = "success";
				   }catch(e){
				   		console.log(e);
				   }
				
				}
			})();

			//****************updating images**********************
			
				console.log("Updating images...");

				await (async function() {
					try {
					    var sql4 = 'SELECT * from items where itemStore =' + store;

					    var results4 = await conn.query(sql4);
					    //console.log(results4);
					    if (results4.length != 0) {
					        for (let i=0; i<results4.length; i++){
					            if (results4[i].itemPhoto == "0" || results4[i].itemPhoto.substring(7,13) == "thumbs"){
					                var itemID = results4[i].itemNo;
					                	console.log(itemID);
						                let result5 = await new Promise((resolve, reject) => {
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
									            'ItemID': itemID,
									            'DetailLevel': 'ItemReturnAttributes'
									          }
									        }, function(error, results) {
									            //console.log(JSON.stringify(results));
									            //if (error) reject(error);
									            resolve(results);
									      
									         });
									      });
									      //console.log(JSON.stringify(result5));
									      
									      if (result5.Ack != 'Failure') {
									           let url = conn.connection.escape(result5.Item.PictureDetails.GalleryURL);

									           let sql6 = 'UPDATE items SET itemPhoto = ' + url + ' WHERE itemNo = ' + itemID + ' AND itemStore = ' + store;

									           let results6 = await conn.query(sql6);
									           if (results6.affectedRows > 0) console.log("Url Updated for item " + itemID);
									           
									      }else{
									        console.log("Item " + itemID + " not found");
									      }
								    
					            }
					        }
					    }
				    } catch(e) {
					    console.log(e);
					}
			    })();

			  

			  //******************create inventory table************************

			 /*if (store==1) {
			  	console.log("Creating inventory table...");
			  	await (async function() {
			  		try {
			  			console.log("Truncate inventory table...");
				  		var sql10 = 'truncate inventory';
						await conn.query(sql10);
						var sql11 = 'select itemNo, sku, itemName from items where itemStore = 1';
						var items = await conn.query(sql11);		
						//console.log(items11);
						var data = {};
						var itemdata = {};
						for (let i=0; i<items.length; i++) {
							let item = items[i]; 
							if (item.sku) {
								var sku = (item.sku).replace(/flatpack/ig,'').trim();
								sku = sku.split('_');
								if (!isNaN(sku[1])) {
									sku = sku[0].trim();
								}
								if (!data.hasOwnProperty(sku)) {
									data[sku] = [item];
								}else{
									data[sku] = data[sku].concat([item]);
								}
							} else if (item.itemNo) {
								var itemNo = item.itemNo;
								if (!itemdata.hasOwnProperty(itemNo)) {
									itemdata[itemNo] = [item];
								}else{
									itemdata[itemNo] = itemdata[itemNo].concat([item]);
								}
							}	
						}

						
						for (let k in data) {
							let item = data[k];
							var sql12 = 'insert into inventory (sku, itemName, data) values (' + conn.connection.escape(k) + ', ' + conn.connection.escape(getItemName(item)) + ', ' + conn.connection.escape(JSON.stringify(item)) + ' )';
							let results12 = await conn.query(sql12);
							if (results12.affectedRows>0)	console.log("item inserted");
							
						}

						for (let m in itemdata) {
							let item = itemdata[m];
							var sql13 = 'insert into inventory (itemNo, itemName, data) values (' + conn.connection.escape(m) + ', ' + conn.connection.escape(getItemName(item)) + ', ' + conn.connection.escape(JSON.stringify(item)) + ' )';
							
							let results13 = await conn.query(sql13);
							if (results13.affectedRows>0)	console.log("item inserted");
							
						}
					}catch(e){
					  	console.log(e);
					}

			  	})();
			  }*/

			  	//**********************update sku table*******************************	
			  	/*console.log("Updating sku table...");
			  	await (async function() {
			  		try {

						var sql21 = 'SELECT * from items';
						var items = await conn.query(sql21);		
						//console.log(items);
						var data = {};
						var itemdata = {};
						for (let i=0; i<items.length; i++) {
							let item = items[i]; 
							if (!item.itemNo) continue;	
							var sku = item.sku;
						  	var itemID = parseInt(item.itemNo);

						  	if (sku != "" && sku) {
						  		var sql22 = 'SELECT * from sku where id = ' + conn.connection.escape(sku);
						  		var result22 = await conn.query(sql22);
						  		
						  		//console.log(JSON.stringify(result22) + ": " + itemID);
								
								if (result22.length == 0) {
									var contains = [itemID];
									var sql23 = 'insert into sku (id,contains) values (' + conn.connection.escape(sku) + ', "[' + contains + ']" )';
									//console.log(sql23);
									await conn.query(sql23);
									console.log("SKU " + sku + " inserted");
								}else if (result22.length > 0){
									var contains = JSON.parse(result22[0].contains);
									//console.log("IFCONTAINS: " + (contains.indexOf(itemID) == -1));
									if (contains.indexOf(itemID) == -1) {
										var contains = JSON.parse(result22[0].contains).concat(itemID);
										//console.log(contains);
										var sql23 = 'UPDATE sku set contains = "['+ contains  + ']" where id = ' + conn.connection.escape(sku) ;
										let results23 = conn.query(sql23);
										if (results23.affectedRows > 0) {
											console.log("SKU " + sku + " updated");
										}
									}
									
								}
						  			
						  	
							}
						}

					}catch(e){
					  	console.log(e);
					}

			  	})();		*/


				  		
					
	
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



function getItemName(items) {
	//console.log(items);
	let shortest = 1000;
	let itemName = '';
	for (let item of items) {
		//item = JSON.parse(item);
		//console.log(item);
		if (item.itemName.length < shortest) {
			shortest = item.itemName.length;
			itemName = item.itemName;
		}
	}

	return itemName;
}


module.exports = downloadItemsEbay;