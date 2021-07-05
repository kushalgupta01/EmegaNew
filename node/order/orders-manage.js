//  Discount Chemist
//  Order System

// Load records from the database
const Database = require('./connection');
const {Config} = require('./config');
const {getConversionData, getField, orderToRecord} = require('./order-convert');
const {findConnectedOrders} = require('./processrecords');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const ACTION_TYPE = {
	RECORD: 'record',
	BUYERINFO: 'buyerinfo',
};
const RECORDNUM_TYPE_ID = 'id';
const RECORDNUM_TYPE_RECORD = 'record';
const RECORDNUM_TYPE_BUYERID = 'buyerid';
const RECORDNUM_TYPE_ORDERID = 'orderid';
const RECORDNUM_TYPE_PURCHASEORDERID = 'poid';

const manageOrders = async function(req, res, next) {
	var conn = new Database(dbconn);
	var token = req.header(Config.ACCESS_TOKEN_HEADER) || null;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Check token
			let user = await userCheckToken(token, true);

			if (!user) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}
			else if (user.type != Config.USER_TYPE.ADMIN && user.type != Config.USER_TYPE.USER && user.type != Config.USER_TYPE.SUPPLIER && user.type != Config.USER_TYPE.CLIENT) {
				httpStatus = 403;
				output.result = 'Action not allowed.';
				break;
			}

			// Get parameters
			let actionType, recordNum, recordNumType, store, orderType, orderStatus, group, notes, tracking, weight, parcelWeights;
			let buyerInfo = null;
			let transaction = null;
			let inventoryBack, salesRecordID;

			if (req.query && Object.keys(req.query).length) {
				if (req.query.id) {
					recordNum = req.query.id;
					recordNumType = RECORDNUM_TYPE_ID;
				}
				else if (req.query.record) {
					recordNum = req.query.record;
					recordNumType = RECORDNUM_TYPE_RECORD;
				}
				else if (req.query.buyerid) {
					recordNum = req.query.buyerid;
					recordNumType = RECORDNUM_TYPE_BUYERID;
				}
				else if (req.query.orderid) {
					recordNum = req.query.orderid;
					recordNumType = RECORDNUM_TYPE_ORDERID;
					//console.log(recordNum);
				}
				else if (req.query.poid) {
					recordNum = req.query.poid;
					recordNumType = RECORDNUM_TYPE_PURCHASEORDERID;
					//console.log(recordNum);
				}
				else {
					output.result = 'Invalid data.';
					break;
				}

				store = req.query.store;
				orderType = req.query.type;
				orderStatus = req.query.status;
				group = req.query.group;
				notes = req.query.notes;
				tracking = req.query.tracking;
				weight = req.query.weight;
			}
			else if (req.body && Object.keys(req.body).length) {
				actionType = req.params.type || '';
				
				if (req.body.id) {
					recordNum = req.body.id;
					recordNumType = RECORDNUM_TYPE_ID;
				}
				else if (req.body.record) {
					recordNum = req.body.record;
					recordNumType = RECORDNUM_TYPE_RECORD;
				}
				else if (req.body.buyerid) {
					recordNum = req.body.buyerid;
					recordNumType = RECORDNUM_TYPE_BUYERID;
				}
				else if (req.body.orderid) {
					recordNum = req.body.orderid;
					recordNumType = RECORDNUM_TYPE_ORDERID;
				}
				else if (req.body.buyerinfo) {
					buyerInfo = req.body.buyerinfo || null;
				}
				else {
					output.result = 'Invalid data.';
					break;
				}

				store = req.body.store;
				orderType = req.body.type;
				orderStatus = req.body.status;
				group = req.body.group;
				notes = req.body.notes;
				tracking = req.body.tracking;
				weight = req.body.weight;
				boxDetails = req.body.boxDetails ? JSON.parse(req.body.boxDetails) : req.body.boxDetails;
				transaction = req.body.transaction || null;
				inventoryBack = req.body.inventoryBack || null;
				salesRecordID = req.body.salesRecordID || null;
				parcelWeights = req.body.parcelWeights || null;
			}
			else {
				output.result = 'Invalid data.';
				break;
			}


			await conn.connect();
			let method = req.method.toLowerCase();

			let skuSQL = [];
			if (method == 'get') {
				// Get buyer details (and order ID if needed) from orders table
				let orderData = null;
				let itemsData = [];
				/*if (recordNumType == RECORDNUM_TYPE_ID) {
					// Get buyer details and order ID
					itemsData = await conn.query('SELECT o.* FROM orders o, collecting c WHERE o.id = '+conn.connection.escape(recordNum)+' AND o.id = c.orderID');
					itemsData = itemsData[0];
					let itemData = itemsData ? JSON.parse(itemsData.data) : '';
					let invenItems = (itemData.items);
					for (let invItem of invenItems) {
						let sku = invItem.sku;
						// console.log(sku);
						if (sku) {
							skuSQL.push(conn.connection.escape(sku));
						}
					}

					orderData = await conn.query('SELECT o.*, i.bundle FROM orders o, collecting c, items i WHERE o.id = '+conn.connection.escape(recordNum)+' AND o.id = c.orderID AND sku in ('+ skuSQL.join(',') +')');
					// console.log(orderData);
				}*/
				if (recordNumType == RECORDNUM_TYPE_ID) {
					// Get buyer details and order ID
					orderData = await conn.query('SELECT o.* FROM orders o, collecting c WHERE o.id = '+conn.connection.escape(recordNum)+' AND o.id = c.orderID');
					orderData = orderData[0];
					if (orderData) {
						let orderData2 = orderData ? JSON.parse(orderData.data) : '';
						let invenItems = orderData2[getConversionData(orderData.store).Items];
						for (let invItem of invenItems) {
							let sku = invItem[getConversionData(orderData.store).ItemData.SKU];
							// console.log(sku);
							if (sku) {
								skuSQL.push(conn.connection.escape(sku));
							}
						}
						if (skuSQL.length) {
							itemsData = await conn.query('SELECT * FROM items WHERE itemStore = '+conn.connection.escape(orderData.store)+' AND sku in ('+ skuSQL.join(',') +')');
						}
						// console.log(itemsData);
					}
						
				}
				else if (recordNumType == RECORDNUM_TYPE_RECORD) {
					// Get buyer details
					orderData = await conn.query('SELECT o.* FROM orders o, collecting c WHERE o.store = '+conn.connection.escape(store)+' AND (o.salesRecordID = '+conn.connection.escape(recordNum)+' OR o.orderID = '+conn.connection.escape(recordNum)+') AND o.id = c.orderID');
					orderData = orderData[0];
					if (orderData) {
						let orderData2 = orderData ? JSON.parse(orderData.data) : '';
						let invenItems = orderData2[getConversionData(orderData.store).Items];
						for (let invItem of invenItems) {
							let sku = invItem[getConversionData(orderData.store).ItemData.SKU];
							// console.log(sku);
							if (sku) {
								skuSQL.push(conn.connection.escape(sku));
							}
						}
						if (skuSQL.length) {
							itemsData = await conn.query('SELECT * FROM items WHERE itemStore= '+conn.connection.escape(store)+' AND sku in ('+ skuSQL.join(',') +')');
						}
						// console.log(itemsData);
					}
				}
				else if (recordNumType == RECORDNUM_TYPE_BUYERID) {
					// Get buyer details
					orderData = await conn.query('SELECT o.* FROM orders o, collecting c WHERE o.store = '+conn.connection.escape(store)+' AND o.buyerID = '+conn.connection.escape(recordNum)+' AND o.id = c.orderID');
					orderData = orderData[0];
					if (orderData) {
						//console.log('SELECT o.* FROM orders o, collecting c WHERE o.store = '+conn.connection.escape(store)+' AND o.buyerID = '+conn.connection.escape(recordNum)+' AND o.id = c.orderID');
						let orderData2 = orderData ? JSON.parse(orderData.data) : '';
						let invenItems = orderData2[getConversionData(orderData.store).Items];
						for (let invItem of invenItems) {
							let sku = invItem[getConversionData(orderData.store).ItemData.SKU];
							// console.log(sku);
							if (sku) {
								skuSQL.push(conn.connection.escape(sku));
							}
						}
						if (skuSQL.length) {
							itemsData = await conn.query('SELECT * FROM items WHERE itemStore = '+conn.connection.escape(store)+' AND sku in ('+ skuSQL.join(',') +')');
						}
						// console.log(orderData);
					}
				}
				else if (recordNumType == RECORDNUM_TYPE_ORDERID) {
					// Get buyer details
					orderData = await conn.query('SELECT o.* FROM orders o, collecting c WHERE o.store = '+conn.connection.escape(store)+' AND o.orderID = '+conn.connection.escape(recordNum)+' AND o.id = c.orderID');
					orderData = orderData[0];
					if (orderData) {
						let orderData2 = orderData ? JSON.parse(orderData.data) : '';
						let invenItems = orderData2[getConversionData(orderData.store).Items];
						for (let invItem of invenItems) {
							let sku = invItem[getConversionData(orderData.store).ItemData.SKU];
							// console.log(sku);
							if (sku) {
								skuSQL.push(conn.connection.escape(sku));
							}
						}
						if (skuSQL.length) {
							itemsData = await conn.query('SELECT * FROM items WHERE itemStore = '+conn.connection.escape(store)+' AND sku in ('+ skuSQL.join(',') +')');
						}
						// console.log(orderData);
					}
				}
				else if (recordNumType == RECORDNUM_TYPE_PURCHASEORDERID) {
					// Get buyer details
					orderData = await conn.query('SELECT o.* FROM orders o, collecting c WHERE o.store = '+conn.connection.escape(store)+' AND JSON_EXTRACT(o.data,"$.PurchaseOrderNumber") = '+conn.connection.escape(recordNum)+' AND o.id = c.orderID');
					orderData = orderData[0];
					if (orderData) {
						//console.log('SELECT o.* FROM orders o, collecting c WHERE o.store = '+conn.connection.escape(store)+' AND o.buyerID = '+conn.connection.escape(recordNum)+' AND o.id = c.orderID');
						let orderData2 = orderData ? JSON.parse(orderData.data) : '';
						let invenItems = orderData2[getConversionData(orderData.store).Items];
						for (let invItem of invenItems) {
							let sku = invItem[getConversionData(orderData.store).ItemData.SKU];
							// console.log(sku);
							if (sku) {
								skuSQL.push(conn.connection.escape(sku));
							}
						}
						if (skuSQL.length) {
							itemsData = await conn.query('SELECT * FROM items WHERE itemStore = '+conn.connection.escape(store)+' AND sku in ('+ skuSQL.join(',') +')');
						}
						// console.log(orderData);
					}
				}

				let newItemsData = {}
				for (let id of itemsData) {
					if (!newItemsData.hasOwnProperty(id.itemID)) {
						newItemsData[id.itemID] = id;
						if (id.bundle) {
							let bundle = JSON.parse(id.bundle);
							let bundleItemsData = await conn.query('SELECT * FROM items WHERE itemStore = '+id.itemStore+' AND itemID in ('+ Object.keys(bundle).join(',') +')');
							for (let bid of bundleItemsData) {
								if (!newItemsData.hasOwnProperty(bid.itemID)) {
									newItemsData[bid.itemID] = bid;
								}
							}
						}
					}
				}

				// console.log(orderData);

				if (!orderData) {
					httpStatus = 404;
					output.result = 'Cannot find the specified ID in the database.';
					break;
				}


				let recordList = [];

				// Collate order data
				let orderDataCollated = await collateOrderData(orderData, conn);

				if (Array.isArray(orderDataCollated)) {
					httpStatus = orderDataCollated[0];
					output.result = orderDataCollated[1];
					break;
				}

				recordList.push(orderDataCollated);

				// Find connected records
				let connectedOrders = await findConnectedOrders(orderDataCollated);

				for (let connectedOrder of connectedOrders) {
					let connectedOrderData = await collateOrderData(connectedOrder, conn)
					if (!Array.isArray(connectedOrderData)) recordList.push(connectedOrderData);
				}
				// console.log(recordList);

				for (let record of recordList) {
					if (Array.isArray(record)) continue;
					if (Config.SUPPLIERS[Config.SUPPLIER_IDS.HOBBYCO].stores.includes(record.StoreID.toString()) && record.StoreID != 81 && record.StoreID != 82) {
						if (record.OrderStatus==0 || record.OrderStatus==18) {
							let items = record.RecordData.Items;
							let skulist = [];
							for (let item of items) {
								skulist.push(conn.connection.escape(item.SKU));
							}
							let stockData = {};
							let sql2 = 'SELECT s.customSku, sum(i.indivQty) as total FROM stockinventory s, inventorylocation i WHERE s.id = i.invID AND s.store = 8 AND s.customSku in ('+skulist.join(',')+') AND i.bay like "EMG%" GROUP BY i.invID';
							let stocks = await conn.query(sql2);
							for (let stock of stocks) {
								let customSku = stock.customSku;
								let total = stock.total;
								stockData[customSku] = total;
							}
							let warehousecollect = true;
							let issupplier = true;
							for (let item of items) {
								if (stockData.hasOwnProperty(item.SKU)) {
									if (stockData[item.SKU] <= 0) {
										warehousecollect = false;
									}
								} else {
									warehousecollect = false;
								}
								if (!item.SKU.startsWith('WV-') && !item.SKU.startsWith('ME-') && !item.SKU.startsWith('LPG-')) {
									issupplier = false;
								}
							}

							if (!record.page) {
								record.isAutoPage = true;
								if (issupplier) {
									record.page = 'warehousecollect';
								} else {
									if (warehousecollect) {
										record.page = 'warehousecollect';
									} else {
										record.page = 'collect';
									}
								}
							} else {
								record.isAutoPage = false;
							}
						} else {
							delete record.page;
						}
					}
				}

				output.records = recordList;
				output.items = newItemsData;
				output.result = 'success';
				httpStatus = 200;
			}
			else if (method == 'post') {
				if (actionType == ACTION_TYPE.RECORD) {
					// Check order ID
					let orderIDMS = recordNum;
					let orderData = await conn.query('SELECT * FROM orders WHERE id = '+orderIDMS);

					if (!orderData.length) {
						httpStatus = 404;
						output.result = 'Cannot find the specified ID in the database.';
						break;
					}

					// Update record data
					let orderTypeMS = (orderType != -1) ? conn.connection.escape(orderType) : 'NULL';
					let orderStatusMS = conn.connection.escape(orderStatus);
					let groupMS = group ? conn.connection.escape(group) : 'NULL';
					let notesMS = notes ? conn.connection.escape(notes) : 'NULL';
					let trackingMS = 'NULL';
					let weightMS = weight ? conn.connection.escape(weight) : 0;
					let boxDetailsMS = boxDetails ? conn.connection.escape(JSON.stringify(boxDetails)) : 'NULL';
					transaction = JSON.parse(transaction);
					parcelWeights = JSON.parse(parcelWeights);
					parcelWeights = (parcelWeights && parcelWeights.length) ? conn.connection.escape(JSON.stringify(parcelWeights)) : 'NULL';

					if (tracking) {
						try {
							tracking = JSON.parse(tracking);
						}
						catch (e) {
							output.result = 'Invalid tracking data.';
							break;
						}
						
						let trackingData = [];
						for (let entry of tracking) {
							let value = entry.trim();
							if (!value) continue;
							trackingData.push(value);
						}
						if (trackingData.length) trackingMS = conn.connection.escape(JSON.stringify(trackingData));
					}

					let actionTime = moment.tz(new Date(), 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');

					let actionBy = user.username;

					if (transaction) {
						for (let trans of transaction) {
							await conn.query('INSERT INTO translogs(orderId, field, oldValue, newValue, actionBy, actionTime) VALUES ('
											+ conn.connection.escape(orderIDMS) + ','
											+ conn.connection.escape(trans.field) + ','
											+ conn.connection.escape(trans.oldValue) + ','
											+ conn.connection.escape(trans.newValue) + ','
											+ conn.connection.escape(actionBy) + ','
											+ conn.connection.escape(actionTime) + ')');
						}
					}

					

					// Update the collecting table
					await conn.query('UPDATE collecting SET type = '+orderTypeMS+', status = '+orderStatusMS+', groupID = '+groupMS+', notes = '+notesMS+', trackingID = '+trackingMS+', weight = '+weightMS+', parcelWeights = '+parcelWeights +', boxDetails = '+boxDetailsMS+' WHERE orderID = '+orderIDMS);

					let packedDatas = await conn.query('SELECT packedData FROM collecting WHERE orderID = '+orderIDMS);
    				let packedData = packedDatas[0].packedData;
    				let date = new Date();
					let date2 = moment.tz(date, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');

					if (orderStatus == 13) {

						if (!packedData) {
							packedData = [user.username + ' - ' + date2 + ' - ' +  'RTS'];
						} else {
							packedData = JSON.parse(packedData);
							packedData.push(user.username + ' - ' + date2 + ' - ' +  'RTS');	
						}

						console.log(packedData);
						await conn.query('UPDATE collecting SET rts = 1, damagedRts = 0, resendRts = 0, packedData = '+ conn.connection.escape(JSON.stringify(packedData)) +' WHERE orderID = '+orderIDMS);
						// sqlSelect = 'SELECT * FROM collecting WHERE (' + sqlArray.join(' OR ') + ')';

					} else if (orderStatus == 14) {

						if (!packedData) {
							packedData = [user.username + ' - ' + date2 + ' - ' + 'Damaged RTS'];
						} else {
							packedData = JSON.parse(packedData);
							packedData.push(user.username + ' - ' + date2 + ' - ' + 'Damaged RTS');;
						}

						await conn.query('UPDATE collecting SET damagedRts = 1, rts = 0, resendRts = 0, packedData = '+  conn.connection.escape(JSON.stringify(packedData)) + 'WHERE orderID = '+orderIDMS);
					} else if (orderStatus == 15) {

						if (!packedData) {
							packedData = [user.username + ' - ' + date2 + ' - ' + 'Resend RTS'];
						} else {
							packedData = JSON.parse(packedData);
							packedData.push(user.username + ' - ' + date2 + ' - ' + 'Resend RTS');;
						}

						await conn.query('UPDATE collecting SET resendRts = 1, damagedRts = 0, rts = 0, packedData = '+  conn.connection.escape(JSON.stringify(packedData)) + 'WHERE orderID = '+orderIDMS);
					}

					if (inventoryBack == 'true') {
						let locations = await conn.query('SELECT locationselected FROM collecting WHERE orderID = ' + recordNum);
						if (locations.length>0) {
							let locationselected = JSON.parse(locations[0].locationselected);
							for (let lineitemid in locationselected) {
								let locs = locationselected[lineitemid];
								// console.log(locs);
								for (let loc of locs) {
									if (loc.id == 'qvb') {
										await conn.query('UPDATE stockinventory SET QVBQty = QVBQty + ' + loc.indivQty + ' WHERE id = ' + loc.invid);
									} else if (loc.id == 'pick') {
										await conn.query('UPDATE stockinventory SET pickQty = pickQty + ' + loc.indivQty + ' WHERE id = ' + loc.invid);
									} else if (loc.id == 'bulk') {
										await conn.query('UPDATE stockinventory SET bulkQty = bulkQty + ' + loc.indivQty + ' WHERE id = ' + loc.invid);
									} else if (loc.id != 'noloc') {
										let actionTime = moment.tz(new Date(), 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');
										let details = await conn.query('SELECT * FROM inventorylocation WHERE id = ' + loc.id);
										if (details.length == 1) {
											invID = details[0].invID;
											oldBay = details[0].bay;
											oldQty = details[0].indivQty;
											newQty = +loc.indivQty;
										}
										await conn.query('UPDATE inventorylocation SET indivQty = indivQty + ' + loc.indivQty + ' WHERE id = ' + loc.id);
										await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
										                              + invID + ', '
										                              + conn.connection.escape(oldBay) + ', '
										                              + oldQty + ', '
										                              + conn.connection.escape(salesRecordID) + ', '
										                              + newQty + ", '" 
										                              + actionTime + "', "
										                              + conn.connection.escape(user.username) + ', '
														              + "'Outofstock', " 
														              + null + ', '
														              + null +')');
									}
								}

							}
						}
					}
					
					output.result = 'success';
					httpStatus = 200;
				}
				else if (actionType == ACTION_TYPE.BUYERINFO) {
					// Update buyer info for the given order
					try {
						if (!buyerInfo) throw 'error';
						buyerInfo = JSON.parse(buyerInfo);
						transaction = JSON.parse(transaction);
					}
					catch (e) {
						output.result = 'Invalid buyer info.';
						break;
					}

					let orderStore = await conn.query('SELECT store FROM orders WHERE id = '+conn.connection.escape(buyerInfo.rowID));
					let CD = orderStore.length ? getConversionData(orderStore[0].store) : null;
					
					if (!CD) {
						output.result = 'Could not retrieve conversion data.';
						break;
					}

					let actionTime = moment.tz(new Date(), 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');

					let actionBy = user.username;

					// Prepare buyer data
					/*let buyerInfoFields = {};
					buyerInfoFields[CD.BuyerFullName] = buyerInfo.name;
					buyerInfoFields[CD.BuyerAddress1] = buyerInfo.address1;
					buyerInfoFields[CD.BuyerAddress2] = buyerInfo.address2;
					buyerInfoFields[CD.BuyerCity] = buyerInfo.city;
					buyerInfoFields[CD.BuyerState] = buyerInfo.state;
					buyerInfoFields[CD.BuyerPostcode] = buyerInfo.postcode;
					buyerInfoFields[CD.BuyerCountry] = buyerInfo.country;
					buyerInfoFields[CD.PhoneNumber] = buyerInfo.phone;*/

					let buyerInfoFields = [
						[CD.BuyerFullName, buyerInfo.name],
						[CD.BuyerAddress1, buyerInfo.address1],
						[CD.BuyerAddress2, buyerInfo.address2],
						[CD.BuyerCity, buyerInfo.city],
						[CD.BuyerState, buyerInfo.state],
						[CD.BuyerPostcode, buyerInfo.postcode],
						[CD.BuyerCountry, buyerInfo.country],
						[CD.PhoneNumber, buyerInfo.phone],
					];

					if (CD.Email) {
						buyerInfoFields.push([CD.Email, buyerInfo.email])
					}

					// Update orders in the database
					let replaceData = [];
					for (let field of buyerInfoFields) {
						replaceData.push(conn.connection.escape('$.'+(Array.isArray(field[0]) ? field[0].join('.') : field[0])), conn.connection.escape(field[1]));
					}

					if (transaction) {
						for (let trans of transaction) {
							await conn.query('INSERT INTO translogs(orderId, field, oldValue, newValue, actionBy, actionTime) VALUES ('
											+ conn.connection.escape(buyerInfo.rowID) + ','
											+ conn.connection.escape(trans.field) + ','
											+ conn.connection.escape(trans.oldValue) + ','
											+ conn.connection.escape(trans.newValue) + ','
											+ conn.connection.escape(actionBy) + ','
											+ conn.connection.escape(actionTime) + ')');
						}
					}

						

					let result = await conn.query('UPDATE orders SET data = JSON_REPLACE(data, '+replaceData.join(',')+'), deliveryNote = '+(buyerInfo.deliveryNote ? conn.connection.escape(buyerInfo.deliveryNote) : 'NULL')+' WHERE id = '+conn.connection.escape(buyerInfo.rowID));

					if (result.affectedRows > 0) {
						httpStatus = 200;
						output.result = 'success';
					}
					else {
						httpStatus = 202;
						output.result = 'No changes made.';
					}
				}
				else {
					output.result = 'Unsupported action.';
				}
			}
			else {
				output.result = 'Unsupported method.';
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

const collateOrderData = async (orderData, conn) => {
	if (!Config.STORES[orderData.store]) return null;

	try {
		// Get record data from the collecting table
		let records = await conn.query('SELECT * FROM collecting WHERE orderID = '+conn.connection.escape(orderData.id));
		let orderDataContent = {};

		if (!records.length) {
			return [404, 'Cannot find the specified record.'];
		}

		try {
			orderDataContent = JSON.parse(orderData.data);
		}
		catch (e) {
			return [500, 'Could not retrieve order data.'];
		}

		let recordData = {};
		let CD = getConversionData(orderData.store);
		if (!CD) return [500, 'Could not retrieve conversion data.'];

		recordData.Buyer = {
			ID: getField(orderDataContent, CD.UserID),
			FullName: getField(orderDataContent, CD.BuyerFullName),
			AddressLine1: getField(orderDataContent, CD.BuyerAddress1),
			AddressLine2: getField(orderDataContent, CD.BuyerAddress2),
			City: getField(orderDataContent, CD.BuyerCity),
			State: getField(orderDataContent, CD.BuyerState),
			Postcode: getField(orderDataContent, CD.BuyerPostcode),
			Country: getField(orderDataContent, CD.BuyerCountry),
			Phone: getField(orderDataContent, CD.PhoneNumber),
			Email: getField(orderDataContent, CD.Email),
			DeliveryNote: orderData.deliveryNote,
		};

		// Record data
		let record = records[0];

		if (record.trackingID) {
			let trackingIDs = JSON.parse(record.trackingID);
			let invoices = await conn.query('SELECT * FROM invoices WHERE trackingNumber in (' + trackingIDs.map(tid => '"' + tid + '"').join(',') + ') order by invoicedTime desc');
			
			invoices = invoices ? invoices : [];

			for (let trackingNumber of trackingIDs) {
				if (!invoices.find(inv => inv.trackingNumber == trackingNumber)) {
					invoices.push({
						orderId: record.orderID,
						trackingNumber: trackingNumber
					});
				}
			}

			recordData.Invoices = invoices;
		}

		recordData = Object.assign({
			DatabaseID: orderData.id,
			SalesRecordID: orderData.salesRecordID || null,
			RecordNum: orderData.orderID,
			StoreID: orderData.store,
			OrderType: record.type,
			OrderStatus: record.status,
			GroupID: record.groupID,
			Weight: record.weight,
			parcelWeights: record.parcelWeights ? JSON.parse(record.parcelWeights) : record.parcelWeights,
			Notes: record.notes,
			TrackingID: record.trackingID ? JSON.parse(record.trackingID) : record.trackingID,
			Collector: record.collector,
			Collected: record.collected,
			Packer: record.packer,
			PackedTime: record.packedTime,
			PackedData: record.packedData ? JSON.parse(record.packedData) : record.packedData,
			OriginalItems: record.originalItems ? JSON.parse(record.originalItems) : record.originalItems,
			RecordData: orderToRecord(orderData),
			boxDetails: record.boxDetails,
			page: record.page,
		}, recordData);

		return recordData;
	}
	catch (e) {
		// Error
		return [503, e];
	}
}

module.exports = manageOrders;
