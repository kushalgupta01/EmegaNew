const {Config} = require('./config');
const Database = require('./connection');
const csv = require('csv-streamify');
const fs = require('fs');
const xlsx = require('xlsx');
const {commonData, getConversionData} = require('./order-convert');
const moment = require('moment-timezone');

const ordersImportGroupon = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;
	var success = false;

	await conn.connect();
	
	try {
		do {
			if (method == 'post') {
				let file = req.body || null;
				//console.log(file);
				var d = new Date().toString();
				var name = 'GO-' + d.slice(4,18).split(' ').join('-');
				
				var xlsxFile = '../srv/groupon/'+ name + '.xlsx';
				var csvFile = '../srv/groupon/'+ name + '.csv';
				
				if (!fs.existsSync(csvFile)) {
					fs.writeFileSync(xlsxFile, file);

					var workbook = await xlsx.readFile(xlsxFile);

					fs.writeFileSync(csvFile, await xlsx.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]));
				}

				let orderFile = csvFile;
				//await fs.writeFile('../srv/groupon/1111.csv', file);
				
				let storeID = 11;
				let csvData = await new Promise((resolve, reject) => {
					var csvParser = csv({objectMode: true, columns: true});
					var csvRows = [];

					csvParser.on('data', (row) => {
						// Remove any spaces in the keys
						for (let key in row) {
							let keyTrimmed = key.trim();
							if (key != keyTrimmed) {
								row[keyTrimmed] = row[key];
								delete row[key];
							}
						}

						/*for (let i = 0; i < row.length; i++) {
							row[i] = row[i].replace('&amp;', '&').replace('&quot;', '"').replace('&quot;', '"').replace('&#039;', "'").replace('&lt;', '<').replace('&gt;', '>');
						}

						// Remove \r from last entry
						var indexLast = row.length - 1;
						row[indexLast] = row[indexLast].replace('\r', '');*/

						csvRows.push({
							store: storeID,
							data: row
						});
					})
					.on('end', (err) => {
						if (err) reject(err);
						resolve(csvRows);
					})
					.on('error', (err) => {
						reject(err);
					});

					fs.createReadStream(orderFile).pipe(csvParser);
				});

				var orderDataNew = {};
				var orderListDB = {};
				
				await (async function() {
					
					
					
					let orders = csvData;
					let row = 0, rowCount = orders.length;
					orderDataNew[storeID] = [];

					//await conn.connect();

					while (row < rowCount) {
						let rowEntry = orders[row];
						let rowData = rowEntry.data;

						// Skip order if it doesn't have a sales record ID
						if (!rowData.fulfillment_line_item_id || rowData.fulfillment_line_item_id == '0') {
							row++;
							continue;
						}


						// Collate item data
						rowData.items = [];

						let rawsku = rowData.merchant_sku_item;
						let itemName = rowData.item_name;
						let quantity = rowData.quantity_requested;

						let skus = rawsku.split('x');
						let q = "";

						if (skus.length > 1 && !isNaN(skus[skus.length-1])) {
							q = skus[skus.length-1];
			
						}else{
							skus = rawsku.split('-');
							if (skus.length > 1 && !isNaN(skus[skus.length-1]) && skus[skus.length-1].length<3) {
								q = skus[skus.length-1];
							}else{
								q = 1;
							}
						} 

						let results2 = await conn.query("select itemName from items where sku = " + conn.connection.escape(rawsku));

						if (results2.length == 0) {
							await conn.query("insert ignore into items (sku, itemStore, itemName, itemMultiple) values (" 
								+ conn.connection.escape(rawsku) + ", 11, " + conn.connection.escape(itemName) + ", " + conn.connection.escape(q) +")");
						}else if (results2.length == 1 && results2[0].itemName != itemName) {
							await conn.query("insert ignore into items (sku, itemStore, itemName, itemMultiple) values (" 
								+ conn.connection.escape(rawsku) + ", 11, " + conn.connection.escape(itemName) + ", " + conn.connection.escape(q) +")");
						}else if (results2.length > 1) {
							let itemExist = false;
							for (let item of results2) {
								if (item.itemName == itemName){
									itemExist = true;
								}
							}

							if (!itemExist) {
								await conn.query("insert ignore into items (sku, itemStore, itemName, itemMultiple) values (" 
									+ conn.connection.escape(rawsku) + ", 11, " + conn.connection.escape(itemName) + ", " + conn.connection.escape(q) +")");
							}
						}
						
						
						//console.log(sku);
						//console.log(result2);
						/*if (result2.length == 0) {
							await conn.query("INSERT IGNORE INTO items (sku, itemStore, itemName) values (" +  conn.connection.escape(sku) + ", 11, " + conn.connection.escape(rowData.item_name) + ")");
						}*/

						let itemData = {
							'title': itemName,
							'quantity': quantity,
							'itemID': '',
							'lineItemID': rowData.fulfillment_line_item_id.toString(),
							'unitPrice': parseFloat(rowData.groupon_cost),
							'sku': rawsku,
							//'variationDetails': rowData.variationDetails,
						};

						rowData.items.push(itemData);


						// Check for multiple items
						let multipleAdded = false;
						let nextRow = row + 1;

						// Check for multiple items
						while (nextRow < rowCount) {
							// Skip blank rows
							/*if (!orders[nextRow]) {
								nextRow++;
								continue;
							}*/
							let rowDataNext = orders[nextRow].data;

							if (rowDataNext.fulfillment_line_item_id == rowData.fulfillment_line_item_id) {

								// Collate item data
								let rawsku = rowDataNext.merchant_sku_item;
								let itemName = rowDataNext.item_name;
								let quantity = rowDataNext.quantity_requested;

								let skus = rawsku.split('x');
								let q = "";

								if (skus.length > 1 && !isNaN(skus[skus.length-1])) {
									q = skus[skus.length-1];
					
								}else{
									skus = rawsku.split('-');
									if (skus.length > 1 && !isNaN(skus[skus.length-1]) && skus[skus.length-1].length<3) {
										q = skus[skus.length-1];
									}else{
										q = 1;
									}
								} 

								let results3 = await conn.query("select itemName from items where sku = " + conn.connection.escape(rawsku));

								if (results3.length == 0) {
									await conn.query("insert ignore into items (sku, itemStore, itemName, itemMultiple) values (" 
										+ conn.connection.escape(rawsku) + ", 11, " + conn.connection.escape(itemName) + ", " + conn.connection.escape(q) +")");
								}else if (results3.length == 1 && results3[0].itemName != itemName) {
									await conn.query("insert ignore into items (sku, itemStore, itemName, itemMultiple) values (" 
										+ conn.connection.escape(rawsku) + ", 11, " + conn.connection.escape(itemName) + ", " + conn.connection.escape(q) +")");
								}else if (results3.length > 1) {
									let itemExist = false;
									for (let item of results3) {
										if (item.itemName == itemName){
											itemExist = true;
										}
									}

									if (!itemExist) {
										await conn.query("insert ignore into items (sku, itemStore, itemName, itemMultiple) values (" 
											+ conn.connection.escape(rawsku) + ", 11, " + conn.connection.escape(itemName) + ", " + conn.connection.escape(q) +")");
									}
								}
								
								
								//console.log(sku);
								//console.log(result2);
								/*if (result2.length == 0) {
									await conn.query("INSERT IGNORE INTO items (sku, itemStore, itemName) values (" +  conn.connection.escape(sku) + ", 11, " + conn.connection.escape(rowData.item_name) + ")");
								}*/

								let itemData = {
									'title': itemName,
									'quantity': quantity,
									'itemID': '',
									'lineItemID': rowDataNext.fulfillment_line_item_id.toString(),
									'unitPrice': parseFloat(rowDataNext.groupon_cost),
									'sku': rawsku,
									//'variationDetails': rowData.variationDetails,
								};

								rowData.items.push(itemData);
								multipleAdded = true;
							}
							else {
								break;
							}

							nextRow++;
						}

						// Remove unneeded fields
						rowData.orderID = rowData.fulfillment_line_item_id;
						rowData.SalesRecordID = rowData.fulfillment_line_item_id;
						rowData.buyerID = rowData.shipment_address_name.split(" ").join("_");
						let yy = parseInt(rowData.order_date.substring(0,4));
						let mm = parseInt(rowData.order_date.substring(5,7))-1;
						let dd = parseInt(rowData.order_date.substring(8,10));
						let HH = parseInt(rowData.order_date.substring(11,13));
						let MM = parseInt(rowData.order_date.substring(14,16));
						rowData.createdDate = new Date(yy,mm,dd,HH,MM).toISOString();
						rowData.order_date = rowData.createdDate;
						rowData.Postage = 0;
						rowData.TotalPrice = parseFloat(rowData.groupon_cost)*parseInt(rowData.quantity_requested);
						
						delete rowData.quantity_requested;
						delete rowData.groupon_cost;
						delete rowData.item_name;
						delete rowData.fulfillment_line_item_id;
						delete rowData.merchant_sku_item;


						// Save row
						orderDataNew[storeID].push(rowEntry);

						if (multipleAdded) {
							row = nextRow;
						}
						else {
							row++;
						}


					}

					//orderDataNew[storeID].map((row) => console.log(row.data));
					
					// Check if orders exist in the database
					var ordersInDBWhere = [];
					for (let storeID in orderDataNew) {
						let storeMS = conn.connection.escape(storeID);
						for (let order of orderDataNew[storeID]) {
							ordersInDBWhere.push('(store = '+storeMS+' AND salesRecordID = '+conn.connection.escape(order.data.SalesRecordID)+')');
						}
					}

					var sql = 'SELECT id, store, salesRecordID, data FROM orders'+(ordersInDBWhere.length>1 ? ' WHERE '+ordersInDBWhere.join(' OR ') : ' WHERE store= ' + storeID);
					var ordersInDB = await conn.query(sql);
					
					


					for (let order of ordersInDB) {
						if (!orderListDB[order.store]) orderListDB[order.store] = {};
						orderListDB[order.store][order.salesRecordID] = [order.id, JSON.parse(order.data)];
					}

					var sql5 = 'SELECT itemID, sku, itemName, itemPhoto FROM items WHERE itemStore = 11';
					var goItems = await conn.query(sql5);
					//console.log(goItems);
					for (let goItem of goItems) {
						//console.log(goItem);
						//if (goItem.itemPhoto) {
							let rawsku = goItem.sku;
							let skus = rawsku.split('x');
							let sku = '';
							let q = '';
							if (skus.length > 1 && !isNaN(skus[skus.length-1].trim())) {
									sku = sku = skus.slice(0,-1).join('x');
									q = skus[skus.length-1].trim();
					
							}else{
								skus = rawsku.split('-');
								if (skus.length > 1 && !isNaN(skus[skus.length-1].trim()) && skus[skus.length-1].trim().length<3) {
									sku = skus.slice(0,-1).join('-');
									q = skus[skus.length-1].trim();
								}else{
									sku = rawsku;
									q = 1;
								}
							} 

							var sql6 = 'SELECT itemID, itemName, itemPhoto, itemMultiple FROM items WHERE itemStore = 1 and sku = ' + conn.connection.escape(sku);
							var skuItems = await conn.query(sql6);

							if (skuItems.length == 1) {
								var sql7 = 'update items set itemPhoto = ' + conn.connection.escape(skuItems[0].itemPhoto) + ' WHERE itemStore = 11 and sku = ' + conn.connection.escape(rawsku);
								var result7 = await conn.query(sql7);
								//console.log(result7);
								if (result7.affectedRows > 0) console.log("item " + rawsku + " Updated")
								//if (result7.)
							}else if (skuItems.length > 1) {
								let photo = '';

								for (let skuItem of skuItems) {
									let name = skuItem.itemName;
									name = name.toLowerCase().split('x');
									if (!isNaN(name[0].trim()) && name[0].trim()==q) {
										photo = skuItem.itemPhoto;
									}else if (skuItem.itemMultiple == q) {
										photo = skuItem.itemPhoto;
									}
								}

								var sql7 = 'update items set itemPhoto = ' + conn.connection.escape(photo) + ' WHERE itemStore = 11 and sku = ' + conn.connection.escape(rawsku);
								var result7 = await conn.query(sql7);
								//console.log(result7);
								if (result7.affectedRows > 0) console.log("item " + rawsku + " Updated")
							}

						//}
					}

				})();

				//console.log("orderListDB " + JSON.stringify(orderListDB));
				// Save orders into the database
				await (async function() {
					//console.log("length: "+orderDataNew[storeID].length);
					var transactionResult = await conn.transaction(async function() {
						var errorOccurred = false;

						saveOrdersLoop:
						
						for (let order of orderDataNew[storeID]) {
							//console.log(order.data);
							// Check if the order already exists in the database
							if (orderListDB[order.store] && orderListDB[order.store][order.data.SalesRecordID]) {
								console.log("order " + order.data.SalesRecordID + " exists");
							}
							else {
								let result = await conn.query('INSERT IGNORE INTO orders (store, data, addedDate) VALUES ('+conn.connection.escape(order.store)+','+conn.connection.escape(JSON.stringify(order.data))+','+conn.connection.escape(dateToSql())+');')
								.catch(err => {
									errorOccurred = err;
								}).then(console.log("order " + order.data.SalesRecordID + " added"));
							}

							if (errorOccurred) {
								conn.rollback(errorOccurred);
								break saveOrdersLoop;
							}
						}
						
						if (errorOccurred) return false;

						var commitResult = await conn.commit();
						if (!commitResult) {
							console.log('Could not commit transaction');
							return false;
						}
						return true;
					});


					if (transactionResult) {
						success = true;
						console.log('success');
					}
					else {
						console.log('Could not add data into the database');
					}

				})();

				//**********************************Customer Table********************************************
			  	// Updating customer table
			  	console.log("Updating customer table...");
			  	await (async function() {

			  		try{
			  			let attributesName = Config.attributesName;
			  			let day = moment().format('YYYYMMDD');
			  			let startDay = moment.tz(day, 'YYYYMMDD', Config.TIMEZONE).tz('UTC').format('YYYY-MM-DD')+' 00:00:00';
			  			let orders = await conn.query('SELECT * FROM orders WHERE store=11 AND addedDate>' + conn.connection.escape(startDay));
						for (let order of orders) {
							let data = JSON.parse(order.data);
							//console.log(order.data);
							let customerID = conn.connection.escape(order.buyerID);
							let store = order.store;
							let date = moment.tz(order.addedDate, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('DD-MMM-YY');
							let orderID = order.id;
							let salesRecordID = order.salesRecordID;
							
							let fullname = '';
							let address1 = '';
							let address2 = '';
							let suburb = '';
							let state = '';
							let postcode = '';
							let country = '';
							let phone = '';
							let email = '';

							if (store == 11) {
								fullname = data[attributesName[store]['fullName']];
								address1 = data[attributesName[store]['address1']];
								address2 = data[attributesName[store]['address2']];
								suburb = data[attributesName[store]['suburb']];
								state = data[attributesName[store]['state']];
								postcode = data[attributesName[store]['postcode']];
								country = data[attributesName[store]['country']];
								phone = data[attributesName[store]['phone']];
								email = data[attributesName[store]['email']];
							} 

							
							if (fullname == '' && address1 == '') continue;

							fullname = conn.connection.escape(fullname);
							address1 = conn.connection.escape(address1);
							address2 = conn.connection.escape(address2);
							suburb = conn.connection.escape(suburb);
							state = conn.connection.escape(state);
							postcode = conn.connection.escape(postcode);
							country = conn.connection.escape(country);
							phone = conn.connection.escape(phone);
							email = conn.connection.escape(email);

							let existCustomer = await conn.query('SELECT orders FROM customers WHERE store = ' + conn.connection.escape(store) + ' AND customerId = ' + customerID)
							if (existCustomer.length==1){
								let orderIDs = JSON.parse(existCustomer[0].orders);
								if (orderIDs.hasOwnProperty(orderID)) {
									continue;
								}else{
									let newOrderID = {};
									newOrderID[orderID] = {'date': date, 'srn': salesRecordID};
									orderIDs = Object.assign(orderIDs, newOrderID);
									await conn.query(`UPDATE customers set orders = ${conn.connection.escape(JSON.stringify(orderIDs))} WHERE store = ${conn.connection.escape(store)} AND customerID = ${customerID}`);

									if (fullname != '' && address1 != '') {
										await conn.query(`UPDATE customers set fullname = ${fullname}, address1 = ${address1}, address2 = ${address2},`+
											`suburb = ${suburb}, state = ${state}, postcode = ${postcode}, country = ${country}, phone = ${phone}, email = ${email}`+
											` WHERE store = ${conn.connection.escape(store)} AND customerID = ${customerID}`);
									}

									console.log(`Customer ${customerID} updated`);
								}
							}else if (existCustomer.length==0){
								
								let orderIDs = {};
								orderIDs[orderID] = {'date': date, 'srn': salesRecordID};

								await conn.query(`INSERT INTO customers (customerID, store, orders, fullname, address1, address2, suburb, state, postcode, country, phone, email)  VALUES ` +  
								   `(${customerID}, ${store}, ${conn.connection.escape(JSON.stringify(orderIDs))}, ${fullname}, ${address1}, ${address2}, ${suburb}, ${state} ,${postcode}, ${country}, ${phone}, ${email})`);
								console.log(`Customer ${customerID} inserted`);
							}
						}
					}catch(e){
						console.log(e);
					}
					
				})();


				if (success) {
					output.result = 'success';
					httpStatus = 200;
				}else{
					output.result = 'failed';
				}
									
			}
			else {
				output.result = 'wrong method';
			}
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
		console.log(e);
	}

	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

function dateToSql() {
	return (new Date()).toISOString().replace('T', ' ').replace('Z', '').slice(0, -4);
}

module.exports = ordersImportGroupon;