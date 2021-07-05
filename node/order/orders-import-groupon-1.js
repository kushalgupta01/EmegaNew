const {Config} = require('./config');
const Database = require('./connection');
const csv = require('csv-streamify');
const fs = require('fs');
const xlsx = require('xlsx');
const {commonData, getConversionData} = require('./order-convert');

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
						if (!rowData.groupon_number || rowData.groupon_number == '0') {
							row++;
							continue;
						}


						// Collate item data
						rowData.items = [];

						let skus = rowData.merchant_sku_item.split('x');
						let sku = "";
						let q = "";

						if (skus.length > 1 && !isNaN(skus[skus.length-1])) {
							q = skus[skus.length-1];
							sku = rowData.merchant_sku_item.replace("x"+ q, "");
						}else{
							skus = rowData.merchant_sku_item.split('-');
							if (skus.length > 1 && !isNaN(skus[skus.length-1]) && skus[skus.length-1].length<3) {
								q = skus[skus.length-1];
								sku = rowData.merchant_sku_item.replace("-"+ q, "");
							}else{
								q = 1;
								sku = rowData.merchant_sku_item;
							}
						} 

						//console.log(sku);
						let result2 = await conn.query("select itemNo, itemName from items where sku = " + conn.connection.escape(sku));
						//console.log(result2);
						/*if (result2.length == 0) {
							await conn.query("INSERT IGNORE INTO items (sku, itemStore, itemName) values (" +  conn.connection.escape(sku) + ", 11, " + conn.connection.escape(rowData.item_name) + ")");
						}*/
						let shortName = result2.length>0 ? result2[0].itemName : "";
						let shortItemNo = result2.length>0 ? result2[0].itemNo : "";

						for (let item of result2) {
							if (item.itemName.length < shortName.length) {
								shortName = item.itemName
								shortItemNo = item.itemNo;
							}
						}

						let itemData = {
							'title': result2.length>0 ? shortName : rowData.item_name,
							'quantity': parseInt(q, 10),
							'itemID': result2.length>0 ? shortItemNo : '',
							'lineItemID': rowData.fulfillment_line_item_id.toString(),
							'unitPrice': parseFloat(rowData.groupon_cost),
							'sku': sku,
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

							if (rowDataNext.groupon_number == rowData.groupon_number) {

								// Collate item data
								let skus = rowDataNext.merchant_sku_item.split('x');
								let sku = "";
								let q = "";

								if (skus.length > 1 && !isNaN(skus[skus.length-1])) {
									q = skus[skus.length-1];
									sku = rowDataNext.merchant_sku_item.replace("x"+ q, "");
								}else{
									skus = rowDataNext.merchant_sku_item.split('-');
									if (skus.length > 1 && !isNaN(skus[skus.length-1]) && skus[skus.length-1].length<3) {
										q = skus[skus.length-1];
										sku = rowDataNext.merchant_sku_item.replace("-"+ q, "");
									}else{
										q = 1;
										sku = rowDataNext.merchant_sku_item;
									}
								} 
								let result3 = await conn.query("select itemNo, itemName from items where sku = " + conn.connection.escape(sku));
								/*if (result3.length == 0) {
									await conn.query("INSERT IGNORE INTO items (sku, itemStore, itemName) values (" +  conn.connection.escape(sku) + ", 11, " + conn.connection.escape(rowData.item_name) + ")");
								}*/
								//console.log(result3);

								let shortName2 = result3.length>0 ? result3[0].itemName : "";
								let shortItemNo2 = result3.length>0 ? result3[0].itemNo : "";

								for (let item of result3) {
									if (item.itemName.length < shortName2.length) {
										shortName2 = item.itemName
										shortItemNo2 = item.itemNo;
									}
								}
								let itemData = {
									'title': result3.length>0 ? shortName2 : rowDataNext.item_name,
									'quantity': parseInt(q, 10),
									'itemID': result3.length>0 ? shortItemNo2 : '',
									'lineItemID': rowDataNext.fulfillment_line_item_id.toString(),
									'unitPrice': parseFloat(rowDataNext.groupon_cost),
									'sku': sku,
									//'variationDetails': rowDataNext.variationDetails,
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
						delete rowData.item_name;
						delete rowData.quantity_requested;
						delete rowData.fulfillment_line_item_id;
						delete rowData.groupon_cost;
						delete rowData.merchant_sku_item;

						rowData.orderID = rowData.groupon_number;
						rowData.SalesRecordID = rowData.groupon_number;
						rowData.buyerID = rowData.shipment_address_name.split(" ").join("_");
						let yy = parseInt(rowData.order_date.substring(0,4));
						let mm = parseInt(rowData.order_date.substring(5,7))-1;
						let dd = parseInt(rowData.order_date.substring(8,10));
						let HH = parseInt(rowData.order_date.substring(11,13));
						let MM = parseInt(rowData.order_date.substring(14,16));
						rowData.createdDate = new Date(yy,mm,dd,HH,MM).toISOString();
						rowData.order_date = rowData.createdDate;
						rowData.Postage = 0;


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
							ordersInDBWhere.push('(store = '+storeMS+' AND orderID = '+conn.connection.escape(order.data.groupon_number)+')');
						}
					}

					var sql = 'SELECT id, store, orderID, data FROM orders'+(ordersInDBWhere.length>1 ? ' WHERE '+ordersInDBWhere.join(' OR ') : ' WHERE store= ' + storeID);
					var ordersInDB = await conn.query(sql);
					
					


					for (let order of ordersInDB) {
						if (!orderListDB[order.store]) orderListDB[order.store] = {};
						orderListDB[order.store][order.orderID] = [order.id, JSON.parse(order.data)];
					}
				})();

				//console.log("orderListDB " + JSON.stringify(orderListDB));
				// Save orders into the database
				await (async function() {
					var transactionResult = await conn.transaction(async function() {
						var errorOccurred = false;

						saveOrdersLoop:
						
						for (let order of orderDataNew[storeID]) {
							//console.log(order.data);
							// Check if the order already exists in the database
							if (orderListDB[order.store] && orderListDB[order.store][order.data.groupon_number]) {
								console.log("order " + order.data.groupon_number + " exists");
							}
							else {
								let result = await conn.query('INSERT IGNORE INTO orders (store, data, addedDate) VALUES ('+conn.connection.escape(order.store)+','+conn.connection.escape(JSON.stringify(order.data))+','+conn.connection.escape(dateToSql())+');')
								.catch(err => {
									errorOccurred = err;
								}).then(console.log("order " + order.data.groupon_number + " added"));
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