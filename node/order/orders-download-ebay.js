// Discount Chemist
// Order System

// Download orders

const {Config} = require('./config');
const Database = require('./connection');
const SSHClient = require('ssh2-promise');
const csv = require('csv-streamify');
const fs = require('fs');
const glob = require('glob'); 
const {getDateValue} = require('./utils');
const moment = require('moment-timezone');


const downloadOrdersEbay = async function(req, res, next) {
	var conn = new Database(dbconn);

	var service = req.params.service;
	var store = req.params.store || null;
	var saveToDBOnly = req.query.savedbonly || false;
	var processAllFiles = req.query.saveall || false;
	var storeAll = false;

	var output = {result: null};
	var httpStatus = 400;


	do {
		if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store))) {
			output.result = 'Invalid store.';
			break;
		}

		if (store == 'all') {
			storeAll = true;
		}

		if (store==8 || store==16) {
			output.result = 'Not avaliable.';
			break;
		}

		try {

			var orderFiles = {};

			if (!saveToDBOnly) {
				// Download latest orders from ebay
				//var baseFolder = '/store/order/output/';
				//console.log('downloading');

				let sshData = {
					ssh: [],
					queue: [],
					close: [],
					queue2: []
				};

				for (let storeID in Config.STORES) {

					if ((!storeAll && storeID != store) || Config.STORES[storeID].service != service) continue;
					if (storeID==8 || storeID==16) continue;
					let sshSettings = {
						host: Config.EBAY_MIP_SETTINGS.host,
						port: Config.EBAY_MIP_SETTINGS.port,
						username: Config.STORES[storeID].id,
						password: Config.STORES[storeID].mipPassword,
					}

					let ssh = new SSHClient(sshSettings);
					let sftp = new SSHClient.SFTP(ssh), sftp2 = new SSHClient.SFTP(ssh);

					// Download the latest order file
					let recordFile = '../srv/records/'+storeID+'-'+getDateValue(new Date(), true, true)+'.csv';
					let recordFileEOD = '../srv/records/'+storeID+'-'+getDateValue(new Date(), true, true)+'-eod.csv';

					sshData.ssh.push(ssh);
					sshData.queue.push(sftp.fastGet('/store/order/output/order-latest', recordFile));                 //fastGet(remote path, local path)
					sshData.queue.push(sftp2.fastGet('/store/order/output/order-latest-eod', recordFileEOD));

					orderFiles[storeID] = [recordFile, recordFileEOD];

					//***********************************************************************************
					//Get last 7 days order
					/*var Mon = {
						0: "Jan",
						1: "Feb",
						2: "Mar",
						3: "Apr",
						4: "May",
						5: "Jun",
						6: "Jul",
						7: "Aug",
						8: "Sep",
						9: "Oct",
						10: "Nov",
						11: "Dec"
					};

					try {
							for (let nd = 5; nd < 11; nd=nd+5) {
								var d = new Date();
								d.setDate(d.getDate()-nd);

								var date = d.getDate();
								if (date < 10) {
									date = "0" + date;
								}

								var mon = Mon[d.getMonth()];


								var year = d.getFullYear();

								var f = '/store/order/output/' + mon + '-' + date + '-' + year;
								var df = '../srv/records/'+ storeID +'-order-' + mon + '-' + date + '-' + year + '.csv';

								//console.log(f);

								let sftp3 = new SSHClient.SFTP(ssh);
							    var list = await sftp3.readdir(f);
							    if (list) {
							    	let sfile = '';
							    	for (let fil of list) {
								    	let filename = fil.filename;
								    	let strs = filename.split('-');
								    	if (strs[5] == '01') {
								    		let min = parseInt(strs[6]);
								    		if (min > 5 && min < 25) {
								    			sfile = filename;
								    			break;
								    		}
								    	}
								    }
								    if (!fs.existsSync(df) && sfile != '') {
								    	let sftp4 = new SSHClient.SFTP(ssh);
								    	await sftp4.fastGet(f + '/' + sfile, df);
								    	orderFiles[storeID] = orderFiles[storeID].concat([df]);
								    }
							    }	    	

							}
							console.log(orderFiles[storeID]);

					
					}catch(e){
						console.log(e);
					}*/
					//********************************************************************
					
					// Find the latest date folder
					/*let dateFolders = await sftp.readdir(baseFolder);
					let latestDateFolder = null;
					let latestDate = 0;

					for (let dateFolder of dateFolders) {
						if (!dateFolder.attrs.isDirectory()) continue;
						let modTime = dateFolder.attrs.mtime;

						if (modTime > latestDate) {
							latestDate = modTime;
							latestDateFolder = dateFolder.filename;
						}
					}

					if (!latestDateFolder) continue; // No orders

					let datePath = baseFolder+latestDateFolder;


					// Find the latest order file
					let orderFileList = await sftp.readdir(datePath);
					let orderFile = null;
					latestDate = 0;

					for (let orderFileItem of orderFileList) {
						if (orderFileItem.attrs.isDirectory()) continue;
						let modTime = orderFileItem.attrs.mtime;

						if (modTime > latestDate) {
							latestDate = modTime;
							orderFile = orderFileItem.filename;
						}
					}

					// Download the file
					let recordFile = '/srv/records/'+orderFile;
					sshData.ssh.push(ssh);
					sshData.queue.push(sftp.fastGet(datePath+'/'+orderFile, recordFile));
					orderFiles[storeID] = [recordFile];*/
				}

				// Wait for queue to finish
				await Promise.all(sshData.queue);

				// Close connections
				for (let ssh of sshData.ssh) {
					sshData.close.push(ssh.close());
				}

				await Promise.all(sshData.close);

			}


			if (saveToDBOnly || processAllFiles) {
				// Get order files from the records folder
				for (let storeID in Config.STORES) {
					if (!storeAll && storeID != store) continue;
					if (storeID == 8 || storeID == 16) continue;
					let files = glob.sync('../srv/records/'+storeID+'-*');

					if (processAllFiles) {
						orderFiles[storeID] = files;
					}
					else {
						// Get the latest order file
						let latestOrderFile = null;
						let latestDate = 0;

						for (let file of files) {
							let stats = fs.statSync(file);
							if (stats.mtime > latestDate) {
								latestDate = stats.mtime;
								latestOrderFile = file;
							}
						}

						if (latestOrderFile) {
							orderFiles[storeID] = [latestOrderFile];
						}
						else {
							orderFiles[storeID] = [];
						}

						// Get all other order files from within 5 minutes of the latest (to account for the time different of the EOD file)
						latestDate -= 300;
						for (let file of files) {
							let stats = fs.statSync(file);
							if (stats.mtime > latestDate && file != latestOrderFile) {
								orderFiles[storeID].push(file);
							}
						}
					}

				}
			}


			// Get orders from the csv file(s)
			var orderData = {};

			for (let storeID in orderFiles) {
				orderData[storeID] = [];
				for (let orderFile of orderFiles[storeID]) {
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

					orderData[storeID] = orderData[storeID].concat(csvData);
				}
			}


			// Process orders - combine orders with multiple items and collate the item details
			//console.log('processing');
			var orderDataNew = {};

			for (let storeID in orderData) {
				let orders = orderData[storeID];
				let row = 0, rowCount = orders.length;
				orderDataNew[storeID] = [];

				while (row < rowCount) {
					let rowEntry = orders[row];
					let rowData = rowEntry.data;

					// Skip order if it doesn't have a sales record ID
					if (!rowData.SalesRecordID || rowData.SalesRecordID == '0') {
						row++;
						continue;
					}

					// Skip order if it hasn't been paid for yet
					/*if (rowData.orderPaymentStatus.toUpperCase() != 'PAID') {
						row++;
						continue;
					}*/

					// Line item prices, order price lines
					try {
						rowData.lineItemPriceLines = JSON.parse(rowData.lineItemPriceLines);
						rowData.orderPriceLines = JSON.parse(rowData.orderPriceLines);

						/*if (rowData.shipToAddressLine1.startsWith('ebay:')) {
							rowData['shipToAddressLine3'] = rowData.shipToAddressLine1;
							rowData['shipToAddressLine1'] = rowData.shipToAddressLine2;
							rowData['shipToAddressLine2'] = '';
						}

						if (rowData.finalDestinationAddressLine1.startsWith('ebay:')) {
							rowData['finalDestinationAddressLine3'] = rowData.finalDestinationAddressLine1;
							rowData['finalDestinationAddressLine1'] = rowData.finalDestinationAddressLine2;
							rowData['finalDestinationAddressLine2'] = '';
						}*/
					}
					catch(e) {}

					// Collate item data
					rowData.items = [];

					let transactionID = rowData.lineItemID.split('-');

					let itemData = {
						'title': rowData.title,
						'quantity': parseInt(rowData.quantity, 10),
						'itemID': rowData.itemID.toString(),
						'lineItemID': rowData.lineItemID.toString(),
						'transactionID': transactionID.length > 1 ? transactionID[1] : transactionID[0],
						'unitPrice': parseFloat(rowData.unitPrice),
						'currency': rowData.paymentCurrency,
						'sku': rowData.SKU,
						//'variationDetails': rowData.variationDetails,
					};

					// Item postage
					for (let lineItemPriceLine of rowData.lineItemPriceLines) {
						if (lineItemPriceLine.pricelineType.toUpperCase() == 'SHIPPING') {
							itemData.shippingPrice = parseFloat(lineItemPriceLine.amount);
						}
					}

					// Total postage
					for (let orderPriceLine of rowData.orderPriceLines) {
						if (orderPriceLine.pricelineType.toUpperCase() == 'SHIPPING') {
							rowData.orderShippingPrice = parseFloat(orderPriceLine.amount);
						}
					}

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

						if (rowDataNext.orderID == rowData.orderID && rowDataNext.lineItemID != rowData.lineItemID) {
							// Line item prices, order price lines
							try {
								rowDataNext.lineItemPriceLines = JSON.parse(rowDataNext.lineItemPriceLines);
								rowDataNext.orderPriceLines = JSON.parse(rowDataNext.orderPriceLines);
							}
							catch(e) {}

							// Collate item data
							let transactionID = rowDataNext.lineItemID.split('-');

							let itemData = {
								'title': rowDataNext.title,
								'quantity': parseInt(rowDataNext.quantity, 10),
								'itemID': rowDataNext.itemID,
								'lineItemID': rowDataNext.lineItemID,
								'transactionID': transactionID.length > 1 ? transactionID[1] : transactionID[0],
								'unitPrice': parseFloat(rowDataNext.unitPrice),
								'currency': rowDataNext.paymentCurrency,
								'sku': rowDataNext.SKU,
								//'variationDetails': rowDataNext.variationDetails,
							};

							// Item postage
							for (let lineItemPriceLine of rowDataNext.lineItemPriceLines) {
								if (lineItemPriceLine.pricelineType.toUpperCase() == 'SHIPPING') {
									itemData.shippingPrice = parseFloat(lineItemPriceLine.amount);
								}
							}

							rowData.items.push(itemData);
							multipleAdded = true;
						}
						else {
							break;
						}

						nextRow++;
					}

					// Remove unneeded fields
					delete rowData.title;
					delete rowData.quantity;
					delete rowData.itemID;
					delete rowData.lineItemID;
					delete rowData.unitPrice;
					delete rowData.SKU;

					// Save row
					orderDataNew[storeID].push(rowEntry);

					if (multipleAdded) {
						row = nextRow;
					}
					else {
						row++;
					}
				}
			}


			//console.log('saving');
			await conn.connect();

			// Check if orders exist in the database
			var ordersInDBWhere = [];
			for (let storeID in orderDataNew) {
				let storeMS = conn.connection.escape(storeID);
				for (let order of orderDataNew[storeID]) {
					ordersInDBWhere.push('(store = '+storeMS+' AND orderID = '+conn.connection.escape(order.data.orderID)+')');
					//ordersInDBWhere.push('(store = '+storeMS+' AND salesRecordID = '+conn.connection.escape(order.data.orderID)+')');
				}
			}

			//console.log(orderDataNew);

			var ordersInDB = await conn.query('SELECT id, store, orderID, data FROM orders'+(ordersInDBWhere.length ? ' WHERE '+ordersInDBWhere.join(' OR ') : ''));
			var orderListDB = {};

			for (let order of ordersInDB) {
				if (!orderListDB[order.store]) orderListDB[order.store] = {};
				orderListDB[order.store][order.orderID] = [order.id, JSON.parse(order.data)];
			}


			// Save orders into the database
			var transactionResult = await conn.transaction(async function() {
				var errorOccurred = false;

				saveOrdersLoop:
				for (let storeID in orderDataNew) {
					for (let order of orderDataNew[storeID]) {
						//console.log(order.data);
						// Check if the order already exists in the database
						if (orderListDB[order.store] && orderListDB[order.store][order.data.orderID]) {
							let orderListDBEntry = orderListDB[order.store][order.data.orderID];
							if (orderListDBEntry[1].orderPaymentStatus.toUpperCase() != 'PAID' && order.data.orderPaymentStatus.toUpperCase() == 'PAID') {
								// Order is now paid so update it
								let result = await conn.query('UPDATE orders SET data = '+conn.connection.escape(JSON.stringify(order.data))+' WHERE id = '+conn.connection.escape(orderListDBEntry[0])+';')
								.catch(err => {
									errorOccurred = err;
								});
							}
							else {
								// Skip the order so that it doesn't waste a row ID in the database
								continue;
							}
						}
						else {
							if (order.data.orderPaymentStatus.toUpperCase() == 'PAID' && order.data.orderSumTotal == '0.0') continue;
							let result = await conn.query('INSERT IGNORE INTO orders (store, data, addedDate) VALUES ('+conn.connection.escape(order.store)+','+conn.connection.escape(JSON.stringify(order.data))+','+conn.connection.escape(dateToSql())+');')
							.catch(err => {
								errorOccurred = err;
							});
						}
	
						if (errorOccurred) {
							httpStatus = 503;
							output.result = 'Could not add entry to database.';
							conn.rollback(errorOccurred);
							break saveOrdersLoop;
						}
					}
				}
				if (errorOccurred) return false;

				var commitResult = await conn.commit();
				if (!commitResult) {
					httpStatus = 503;
					output.result = 'Could not commit transaction';
					return false;
				}
				return true;
			});

			if (transactionResult) {
				httpStatus = 200;
				output.result = 'success';
			}
			else {
				httpStatus = 500;
				output.result = 'Could not add data into the database';
			}
			//console.log('saving done');

			//**********************************Customer Table********************************************
		  	// Updating customer table
		 //  	console.log("Updating customer table...");
		 //  	await (async function() {

		 //  		try{
		 //  			let attributesName = Config.attributesName;
		 //  			let day = moment().format('YYYYMMDD');
		 //  			let startDay = moment.tz(day, 'YYYYMMDD', Config.TIMEZONE).tz('UTC').format('YYYY-MM-DD')+' 00:00:00';
		 //  			let storeWHERE = '';
		 //  			if (store != 'all') {
		 //  				storeWHERE = ' store=' + store;
		 //  			} else {
		 //  				let stores = [];
		 //  				for (let storeID in Config.STORES) {
		 //  					if (Config.STORES[storeID].service == service) stores.push(storeID);
		 //  				}
		 //  				storeWHERE = '(' + stores.map(storeID => 'store=' + storeID).join(' OR ') + ')'
		 //  			}
		 //  			let orders = await conn.query('SELECT * FROM orders WHERE ' + storeWHERE + ' AND addedDate>' + conn.connection.escape(startDay));
			// 		for (let order of orders) {
			// 			let data = JSON.parse(order.data);
			// 			//console.log(order.data);
			// 			let customerID = conn.connection.escape(order.buyerID);
			// 			let store = order.store;
			// 			let date = moment.tz(order.addedDate, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('DD-MMM-YY');
			// 			let orderID = order.id;
			// 			let salesRecordID = order.salesRecordID;
			// 			//let service = Config.STORES[store].service;
						
			// 			let fullname = '';
			// 			let address1 = '';
			// 			let address2 = '';
			// 			let suburb = '';
			// 			let state = '';
			// 			let postcode = '';
			// 			let country = '';
			// 			let phone = '';
			// 			let email = '';

						
			// 			fullname = data[attributesName[service]['fullName']];
			// 			address1 = data[attributesName[service]['address1']];
			// 			address2 = data[attributesName[service]['address2']];
			// 			suburb = data[attributesName[service]['suburb']];
			// 			state = data[attributesName[service]['state']];
			// 			postcode = data[attributesName[service]['postcode']];
			// 			country = data[attributesName[service]['country']];
			// 			phone = data[attributesName[service]['phone']];
			// 			email = data[attributesName[service]['email']];
						

						
			// 			if (fullname == '' && address1 == '') continue;

			// 			fullname = conn.connection.escape(fullname);
			// 			address1 = conn.connection.escape(address1);
			// 			address2 = conn.connection.escape(address2);
			// 			suburb = conn.connection.escape(suburb);
			// 			state = conn.connection.escape(state);
			// 			postcode = conn.connection.escape(postcode);
			// 			country = conn.connection.escape(country);
			// 			phone = conn.connection.escape(phone);
			// 			email = conn.connection.escape(email);

			// 			let existCustomer = await conn.query('SELECT id, orders FROM customers WHERE store = ' + conn.connection.escape(store) + ' AND customerID = ' + customerID + ' AND address1 = ' + address1 + ' AND address2 = ' + address2)
			// 			if (existCustomer.length==1){
			// 				let orderIDs = JSON.parse(existCustomer[0].orders);
			// 				let customerDBID = existCustomer[0].id;
			// 				if (orderIDs.hasOwnProperty(orderID)) {
			// 					continue;
			// 				}else{
			// 					let newOrderID = {};
			// 					newOrderID[orderID] = {'date': date, 'srn': Config.STORES[store].recID + salesRecordID};
			// 					orderIDs = Object.assign(orderIDs, newOrderID);
			// 					await conn.query(`UPDATE customers set orders = ${conn.connection.escape(JSON.stringify(orderIDs))} WHERE id = ${customerDBID}`);

			// 					if (fullname != '' && address1 != '') {
			// 						await conn.query(`UPDATE customers set fullname = ${fullname}, address1 = ${address1}, address2 = ${address2},`+
			// 							`suburb = ${suburb}, state = ${state}, postcode = ${postcode}, country = ${country}, phone = ${phone}, email = ${email}`+
			// 							` WHERE store = ${conn.connection.escape(store)} AND customerID = ${customerID}`);
			// 					}

			// 					console.log(`Customer ${customerID} updated`);
			// 				}
			// 			}else if (existCustomer.length==0){
							
			// 				let orderIDs = {};
			// 				orderIDs[orderID] = {'date': date, 'srn': Config.STORES[store].recID + salesRecordID};

			// 				await conn.query(`INSERT INTO customers (customerID, store, orders, fullname, address1, address2, suburb, state, postcode, country, phone, email)  VALUES ` +  
			// 				   `(${customerID}, ${store}, ${conn.connection.escape(JSON.stringify(orderIDs))}, ${fullname}, ${address1}, ${address2}, ${suburb}, ${state} ,${postcode}, ${country}, ${phone}, ${email})`);
			// 				console.log(`Customer ${customerID} inserted`);
			// 			}
			// 		}
			// 	}catch(e){
			// 		console.log(e);
			// 	}
				
			// })();


		}
		catch (e) {
			// Error
			httpStatus = 503;
			output.result = e;
		}
	} while(0);

	if (conn.connected) conn.release();


	// Output
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

module.exports = downloadOrdersEbay;
