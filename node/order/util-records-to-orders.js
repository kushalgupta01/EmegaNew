// Discount Chemist
// Order System

// Convert records to orders

const Database = require('./connection');
const csv = require('csv-streamify');
const readline = require('readline');
const fs = require('fs');
const glob = require('glob');
const md5 = require('md5');
const {Config} = require('./config');
const {postageServices, dateEbayToSql} = require('./utils');
const moment = require('moment-timezone');

moment.tz.setDefault(Config.TIMEZONE);
const reComma = /,/g;

const recordsToOrders = async function(req, res, next) {
	console.info('started');
	var conn = new Database(dbconn);

	var store = req.query.store || null;
	var day = req.query.day || null;
	var endday = req.query.endday || null;
	var orderStatus = req.query.status || null;

	var storeAll = false;

	var orderData = {
		saleRecords: {}
	};

	var output = {result: null};
	var httpStatus = 400;


	try {
		do {
			if (!store || (day !== null && day != 'all' && isNaN(parseInt(day, 10)))) {
				output.result = 'Invalid data.';
				break;
			}
			else if (endday !== null && isNaN(parseInt(endday, 10))) {
				output.result = 'Invalid end day.';
				break;
			}

			// Check order status and convert them to integers
			var orderStatusValid = true;
			if (orderStatus !== null) {
				if (Array.isArray(orderStatus)) {
					for (let os_i = 0; os_i < orderStatus.length; os_i++) {
						let orderStatusTemp = parseInt(orderStatus[os_i], 10);
						if (!isNaN(orderStatusTemp)) {
							orderStatus[os_i] = orderStatusTemp;
						}
						else {
							orderStatusValid = false;
							break;
						}
					}
				}
				else {
					orderStatus = parseInt(orderStatus, 10);
					if (!isNaN(orderStatus)) {
						orderStatus = [orderStatus];
					}
					else {
						orderStatusValid = false;
					}
				}
			}

			if (!orderStatusValid) {
				output.result = 'Invalid order status.';
				break;
			}


			// Day
			var today = moment().format('YYYYMMDD');
			switch (day) {
				case 'all':
					day = null;
					break;
				case 'today':
					day = today;
					break;
			}

			var dateList = {};
			var cacheID = '';

			if (day && endday) {
				// Create list of the dates in between
				cacheID = '-'+day+'-'+endday;
				var dateRange = getDates(day, endday, 'YYYYMMDD');
				for (let dateItem of dateRange) {
					dateList[dateItem] = 1;
				}
			}
			else if (day) {
				cacheID = '-'+day;
				dateList[day] = 1;
			}


			// Load records from excel sheets
			console.info('loading records');
			var recordsFolder = '/tmp/records-ebay/';
			var filenames = fs.readdirSync(recordsFolder);
			if (!filenames.length) break;


			// Get records from files
			var recordData = {};
			var todaysList = {};

			if (store != 'all') {
				// Set to get records for specific store
				recordData[store] = [];
				todaysList[store] = [];
			}
			else {
				storeAll = true;
			}


			// Get records
			console.info('processing csv rows');
			var reField = /".*?"(,|$)/g, reDate = /\d{8}/;

			for (let i = 0; i < filenames.length; i++) {
			//for (let i = 0; i < 1; i++) {
				//var fileStore = filenames[i].split('-')[0];
				//var storeID = Config.STORE_IDS[fileStore];
				var filenameParts = filenames[i].split('-');
				var storeID = filenameParts[0];
				var fileDate = null;

				// Check store
				if (!storeAll) {
					if (storeID != store) {
						continue;
					}
				}
				else if (!recordData.hasOwnProperty(storeID)) {
					recordData[storeID] = [];
					todaysList[storeID] = [];
				}

				// Get date from filename
				var matches = filenameParts[1].match(reDate);
				if (matches) fileDate = matches[0];

				if (!Object.keys(dateList).length || dateList.hasOwnProperty(fileDate)) {
					var csvData = await new Promise((resolve, reject) => {
						var data = [], currentRow = '';
						var rl = readline.createInterface({
							input: fs.createReadStream(recordsFolder+filenames[i])
						});

						rl.on('line', (line) => {
							if (!line) return;

							if (currentRow) {
								// Append current line to last line
								currentRow += ' ' + line;

								if (line[line.length-1] != '"') {
									// Current row continues on the next line
									return;
								}
								else {
									line = currentRow;
									currentRow = '';
								}
							}
							else if (line[0] == '"' && line[line.length-1] != '"' && !line.endsWith('"","",')) {
								// Current row continues on the next line so save it and get the next one
								currentRow = line;
								return;
							}


							// Split up csv fields
							var lineFields = line.match(reField);
							if (!lineFields || !lineFields.length) return;

							var data = lineFields.map(s => {
								if (s[0] == '"') s = s.slice(1);
								if (s[s.length-1] == '"') {
									s = s.slice(0, -1);
								}
								else if (s.endsWith('",')) {
									s = s.slice(0, -2);
								}

								return s.replace(/""/g, '"').replace('&amp;', '&').replace('&quot;', '"').replace('&quot;', '"').replace('&#039;', "'").replace('&lt;', '<').replace('&gt;', '>');
							});

							if (data.length < 15 || data[0] == null || isNaN(parseInt(data[0], 10))) return;

							// Remove \r from last entry
							//var indexLast = row.length - 1;
							//row[indexLast] = row[indexLast].replace('\r', '');

							recordData[storeID].push(data);
						})
						.on('close', (err) => {
							resolve(true);
						})
						.on('error', (err) => {
							reject(err);
						});


						/*var data = [], firstLine = true;
						var csvParser = csv({objectMode: true});

						csvParser.on('data', (row) => {
							if (firstLine) {
								firstLine = false;
								return;
							}

							if (row.length < 15 || row[0] == null || isNaN(parseInt(row[0], 10))) return;

							for (let i = 0; i < row.length; i++) {
								row[i] = row[i].replace('&amp;', '&').replace('&quot;', '"').replace('&quot;', '"').replace('&#039;', "'").replace('&lt;', '<').replace('&gt;', '>');
							}

							// Remove \r from last entry
							var indexLast = row.length - 1;
							row[indexLast] = row[indexLast].replace('\r', '');

							recordData[storeID].push(row);
						})
						.on('end', (err) => {
							resolve(true);
						})
						.on('error', (err) => {
							reject(err);
						});

						fs.createReadStream(recordsFolder+filenames[i]).pipe(csvParser);*/
					});
				}
			}


			// Process the records
			console.info('processing records');
			var processedRecords = processRecords(recordData, null);

			for (let storeID in processedRecords) {
				if (!orderData.saleRecords.hasOwnProperty(storeID)) orderData.saleRecords[storeID] = {};
				orderData.saleRecords[storeID].records = processedRecords[storeID];
			}

			// Prepare postage service data
			var postageServicesR = {};
			for (let postageService in postageServices) {
				postageServicesR[postageServices[postageService]] = postageService;
			}


			await conn.connect();

			// Save each record into the orders table
			console.info('saving to database');
			var transactionResult = await conn.transaction(async function() {
				var errorOccurred = false;
				//var count = 0;
		
				saveOrdersLoop:
				for (let storeID in orderData.saleRecords) {
					for (let recordNum in orderData.saleRecords[storeID].records) {
						// Convert the format of the data
						let record = orderData.saleRecords[storeID].records[recordNum];
						let rowData = {
							orderID: record.RecordNum,
							SalesRecordID: record.RecordNum,
							buyerID: record.UserID,
							buyerName: record.BuyerFullName,
							buyerPhone: record.PhoneNum,
							buyerEmail: record.Email,
							buyerAddressLine1: record.BuyerAddress1,
							buyerAddressLine2: record.BuyerAddress2,
							buyerCity: record.BuyerCity,
							buyerStateOrProvince: record.BuyerState,
							buyerPostalCode: record.BuyerPostCode,
							buyerCountry: record.BuyerCountry,
							customLabel: record.CustomLabel,
							orderShippingPrice: record.Postage,
							orderInsurancePrice: record.Insurance,
							cashOnDeliveryFee: record.CashOnDeliveryFee,
							paymentTotal: record.TotalPrice,
							orderSumTotal: record.TotalPrice,
							lineItemSumTotal: record.TotalPrice,
							PaymentMethod: record.PaymentMethod,
							saleDate: record.SaleDate ? (new Date(dateEbayToSql(record.SaleDate, Config.TIMEZONE))).toISOString() : null,
							createdDate: (record.CheckoutDate || record.SaleDate) ? (new Date(dateEbayToSql(record.CheckoutDate || record.SaleDate, Config.TIMEZONE))).toISOString() : null,
							paymentClearedDate: record.PaidDate ? (new Date(dateEbayToSql(record.PaidDate, Config.TIMEZONE))).toISOString() : null,
							postedDate: record.PostDate ? (new Date(dateEbayToSql(record.PostDate, Config.TIMEZONE))).toISOString() : null,
							orderPaymentStatus: 'PAID',
							fulfillmentType: 'SHIP',
							feedbackLeft: record.FeedbackLeft,
							feedbackReceived: record.FeedbackReceived,
							note: record.NotesToSelf,
							uniqueProduceID: record.UniqueProduceID,
							privateField: record.PrivateField,
							productIDType: record.ProductIDType,
							productIDValue: record.ProductIDValue,
							productIDValue2: record.ProductIDValue2,
							paymentID: record.PaypalTransID,
							shippingMethod: postageServicesR[record.PostService] || record.PostService,
							cashOnDeliveryOpt: record.CashOnDeliveryOpt,
							variationDetails: record.VariationDetails,
							globalShippingProg: record.GlobalShippingProg,
							globalShippingRefID: record.GlobalShippingRefID,
							clickCollect: record.ClickCollect,
							clickCollectRefNum: record.ClickCollectRefNum,
							finalDestinationAddressName: record.BuyerFullName,
							finalDestinationAddressPhone: record.PhoneNum,
							finalDestinationAddressLine1: record.PostAddress1,
							finalDestinationAddressLine2: record.PostAddress2,
							finalDestinationCity: record.PostCity,
							finalDestinationStateOrProvince: record.PostState,
							finalDestinationPostalCode: record.PostPostcode,
							finalDestinationCountry: record.PostCountry,
							ebayPlus: record.EbayPlus,
							items: [],
						};

						// Items
						for (let item of record.Items) {
							rowData.items.push({
								title: item.ItemTitle,
								quantity: item.Quantity,
								itemID: item.ItemNum.toString(),
								lineItemID: null,
								transactionID: item.TransID,
								unitPrice: item.SalePrice,
								shippingPrice: null,
								currency: null,
								variationDetails: item.VariationDetails,
								sku: record.CustomLabel,
							});
						}

						// Save to database
						let result = await conn.query('INSERT IGNORE INTO orders (store, data, addedDate) VALUES ('+conn.connection.escape(storeID)+', '+conn.connection.escape(JSON.stringify(rowData))+', '+conn.connection.escape(rowData.paymentClearedDate)+');')
						.catch(err => {
							errorOccurred = err;
						});

						if (errorOccurred) {
							httpStatus = 503;
							output.result = 'Could not add entry to database.';
							conn.rollback(errorOccurred);
							break saveOrdersLoop;
						}

						//count++;
						//if (count > 1000) break saveOrdersLoop;
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
				output.result = 'success';
				httpStatus = 200;
			}
			else {
				output.result = 'Could not add data into the database';
				httpStatus = 500;
			}
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
	}

	if (conn.connected) conn.release();
	console.info('done');

	// Output
	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});

	res.json(httpStatus, output);
	return next();
}

// Process sales records
const processRecords = function(recordData, todayLists) {
	var recordDataNew = {};
	var todayRecordNums = {};

	if (todayLists) {
		// Create objects for the today lists
		for (let storeID in todayLists) {
			let recordNums = todayLists[storeID];
			todayRecordNums[storeID] = {};
			let rowCount = Object.keys(recordNums).length;

			for (let i = 0; i < rowCount; i++) {
				todayRecordNums[storeID][recordNums[i]] = 1;
			}
		}
	}

	for (let storeID in recordData) {
		let records = recordData[storeID];
		let rowCount = records.length;
		recordDataNew[storeID] = {};

		for (let row = 0; row < rowCount; row++) {
			let rowItem = records[row];
			// Skip row if its records isn't in the today list
			if (todayLists && !todayRecordNums[storeID].hasOwnProperty(rowItem[0])) continue;

			let rowData = new createRecord(rowItem, rowItem.length == 50);

			// Skip row if it's part of an order with multiple items
			if (!rowData.BuyerFullName) continue;

			// Check for multiple items
			let nextRow = row + 1;
			let lastRow = rowCount - 1;

			// Change values into arrays if needed
			if (!Array.isArray(rowData.ItemNum)) {
				rowData.Items = [];
				rowData.Items.push({
					'Quantity': rowData.Quantity,
					'ItemTitle': rowData.ItemTitle,
					'ItemNum': rowData.ItemNum,
					'SalePrice': rowData.SalePrice,
					'TransID': rowData.TransID,
					'VariationDetails': rowData.VariationDetails,
				});
			}

			// Item data arrays
			let multipleAdded = false;
			let newItems = [];

			// Check for multiple items
			while (nextRow <= lastRow) {
				if (!records[nextRow][0]) continue; // Skip blank rows
				let rowDataNext = createRecord(records[nextRow], records[nextRow].length == 50);

				if (rowDataNext.UserID == rowData.UserID && !rowDataNext.BuyerFullName) {
					// Append item data
					multipleAdded = true;
					newItems.push({
						'Quantity': rowDataNext.Quantity,
						'ItemTitle': rowDataNext.ItemTitle,
						'ItemNum': rowDataNext.ItemNum.toString(),
						'SalePrice': rowDataNext.SalePrice.toString(),
						'TransID': rowDataNext.TransID.toString(),
						'VariationDetails': rowDataNext.VariationDetails.toString(),
					});
				}
				else {
					break;
				}

				nextRow++;
			}

			if (multipleAdded) {
				// Update the record with the new values
				rowData.Items = newItems;
			}

			recordDataNew[storeID][rowData.RecordNum] = rowData;
		}
	}

	return recordDataNew;
}

// Create a sales record from sales data
const createRecord = function(row, productFields) {
	var record = new SaleRecord();
	var baseRowNum = 0;

	record.RecordNum = row[0];
	record.UserID = row[1];
	record.BuyerFullName = row[2];
	record.PhoneNum = row[3];
	record.Email = row[4];
	record.BuyerAddress1 = row[5];
	record.BuyerAddress2 = row[6];
	record.BuyerCity = row[7];
	record.BuyerState = row[8];
	record.BuyerPostCode = row[9];
	record.BuyerCountry = row[10];

	record.ItemNum = row[11];
	record.ItemTitle = row[12];
	record.CustomLabel = row[13];
	record.Quantity = parseInt(row[14], 10);

	if (row[15]) record.SalePrice = parseFloat(row[15].replace(reComma, '').split('$')[1]);
	if (row[16]) record.Postage = parseFloat(row[16].replace(reComma, '').split('$')[1]);
	if (row[17]) record.Insurance = parseFloat(row[17].replace(reComma, '').split('$')[1]);
	if (row[18]) record.CashOnDeliveryFee = parseFloat(row[18].replace(reComma, '').split('$')[1]);
	if (row[19]) record.TotalPrice = parseFloat(row[19].replace(reComma, '').split('$')[1]);
	record.PaymentMethod = row[20];

	if (row[21]) record.SaleDate = row[21];
	if (row[22]) record.CheckoutDate = row[22];
	if (row[23]) record.PaidDate = row[23];
	if (row[24]) record.PostDate = row[24];

	record.FeedbackLeft = (row[25] == 'Yes');
	record.FeedbackReceived = (row[26] == 'Yes');
	record.NotesToSelf = row[27];

	if (productFields) {
		record.UniqueProduceID = row[28];
		record.PrivateField = row[29];
		record.ProductIDType = row[30];
		record.ProductIDValue = row[31];
		record.ProductIDValue2 = row[32];
		baseRowNum = 33;
	}
	else {
		baseRowNum = 28;
	}

	record.PaypalTransID = row[baseRowNum++];
	record.PostService = row[baseRowNum++];
	record.CashOnDeliveryOpt = row[baseRowNum++];
	record.TransID = row[baseRowNum++];
	record.OrderID = row[baseRowNum++];
	record.VariationDetails = row[baseRowNum++];
	record.GlobalShippingProg = (row[baseRowNum++] == 'Yes');
	record.GlobalShippingRefID = row[baseRowNum++];
	record.ClickCollect = (row[baseRowNum++] == 'Yes');
	record.ClickCollectRefNum = row[baseRowNum++];

	record.PostAddress1 = row[baseRowNum++];
	record.PostAddress2 = row[baseRowNum++];
	record.PostCity = row[baseRowNum++];
	record.PostState = row[baseRowNum++];
	record.PostPostcode = row[baseRowNum++];
	record.PostCountry = row[baseRowNum++];
	record.EbayPlus = (row[baseRowNum++] == 'Yes');

	return record;
}

// Sale record
const SaleRecord = function() {
	this.RecordNum = null;
	this.UserID = null;
	this.BuyerFullName = null;
	this.PhoneNum = null;
	this.Email = null;
	this.BuyerAddress1 = null;
	this.BuyerAddress2 = null;
	this.BuyerCity = null;
	this.BuyerState = null;
	this.BuyerPostCode = null;
	this.BuyerCountry = null;

	this.ItemNum = null;
	this.ItemTitle = null;
	this.CustomLabel = null;
	this.Quantity = 0;
	this.SalePrice = 0;
	this.Postage = 0;
	this.Insurance = 0;
	this.CashOnDeliveryFee = 0;
	this.TotalPrice = 0;
	this.PaymentMethod = null;
	this.SaleDate = null;
	this.CheckoutDate = null;
	this.PaidDate = null;
	this.PostDate = null;

	this.FeedbackLeft = false;
	this.FeedbackReceived = false;
	this.NotesToSelf = null;
	this.UniqueProduceID = null;
	this.PrivateField = null;
	this.ProductIDType = null;
	this.ProductIDValue = null;
	this.ProductIDValue2 = null;

	this.PaypalTransID = null;
	this.PostService = null;
	this.CashOnDeliveryOpt = null;
	this.TransID = null;
	this.OrderID = null;
	this.VariationDetails = null;
	this.GlobalShippingProg = false;
	this.GlobalShippingRefID = null;
	this.ClickCollect = false;
	this.ClickCollectRefNum = null;

	this.PostAddress1 = null;
	this.PostAddress2 = null;
	this.PostCity = null;
	this.PostState = null;
	this.PostPostcode = null;
	this.PostCountry = null;
	this.EbayPlus = false;

	this.Items = []; // Extra
}

function getDates(start, end, format) {
    var current = moment(start), end = moment(end);
    var dateRange = [];
    while (current <= end) {
        dateRange.push(moment(current).format(format));
        current = moment(current).add(1, 'days');
    }
    return dateRange;
}

module.exports = recordsToOrders;
