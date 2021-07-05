//  Discount Chemist
//  Order System

// Get items from the database
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');
const { getConversionData } = require('./order-convert');

const updateOrder = async function(req, res, next) {
	var conn = new Database(dbconn);
	var recordID = req.body.record;
	var orderID = req.body.salesrecordid;
	var store = req.body.store;
	var sku = req.body.sku;
	var orderType = req.body.type;
	var orderStatus = req.body.status;
	var group = req.body.group;
	var notes = req.body.notes;
	var dailyorder = req.body.dailyorder == 0 ? 0 : (req.body.dailyorder|| undefined);
	var fgb = req.body.fgb || undefined;
	var morlife = req.body.morlife || undefined;
	var spwarehouse = req.body.spwarehouse || undefined;
	var orbit = req.body.orbit || undefined;
	var wv = req.body.wv || undefined;
	var me = req.body.me || undefined;
	var scholastic = req.body.scholastic || undefined;
	var korimco = req.body.korimco || undefined;
	var hyclor = req.body.hyclor || undefined;
	var splosh = req.body.splosh || undefined;
	var sigma = req.body.sigma || undefined;
	var misc = req.body.misc || undefined;
	var intertrading = req.body.intertrading || undefined;
	var factory =  req.body.factory || undefined;
	var jv =  req.body.jv || undefined;
	// var sixpack = req.body.sixpack || undefined;
	// var tenpack = req.body.tenpack || undefined;
	// var twentypack = req.body.twentypack || undefined;
	// var thirtypack = req.body.thirtypack || undefined;
	// var sixtypack = req.body.sixtypack || undefined;
	// var gucci = req.body.gucci || undefined;
	var kobayashi = req.body.kobayashi || undefined;
	var tprolls = req.body.tprolls || undefined ;
	var resendRts = req.body.resendRts || undefined;
	var rts = req.body.rts || undefined;
	var addBackToInventory = req.body.addBackToInventory || undefined;
	var partialrefund = req.body.partialrefund || undefined;
	var lineItemID = req.body.lineItemID || undefined;
	var locationSelected = req.body.locationSelected;
	var partialcollectTime = req.body.partialcollectTime;
	var transaction = req.body.transaction || null;
	var scannedQtys = req.body.scannedQtys || null;
	var partialRefundDone = req.body.partialRefundDone || null;
	var inventoryBack = req.body.inventoryBack || null;
	var page = req.body.page || null;

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var saveAdminUsername = !req.body.dontsaveadmin;

	var output = {result: null};
	var httpStatus = 400;

	do {
		try {
			// Check token
			let user = await userCheckToken(token, true);

			if (!user) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			const reAlphaNum = /^[a-z0-9-_,]+$/i;
			if (!recordID || !reAlphaNum.test(recordID) || (!orderStatus && orderStatus != 0) || isNaN(parseInt(orderStatus, 10))) {
				output.result = 'Record number, order status and/or order type is invalid.';
				break;
			}

			await conn.connect();

			// Update rows
			let addUsername = user.type != Config.USER_TYPE.ADMIN || saveAdminUsername;
			let sqlSetData = [];

			// Type
			if (orderType) {
				if (isNaN(parseInt(orderType, 10))) {
					output.result = 'Order type is invalid.';
					break;
				}
				sqlSetData.push('type = '+conn.connection.escape(orderType));
			}
			
			if (orderStatus != -1) {
				sqlSetData.push('status = '+conn.connection.escape(orderStatus));
		
				if (orderStatus == 1 || orderStatus == 19 || orderStatus == 20) {
					// Status is 'collected' so update the collected time
					if (addUsername) sqlSetData.push('collector = '+conn.connection.escape(user.username));
					sqlSetData.push('collected = UTC_TIMESTAMP()');
				}
				else if (orderStatus == 0) {
					// Status is 'none' so clear the collected time
					sqlSetData.push('collector = NULL');
					sqlSetData.push('collected = NULL');
				}
			}
			if (group) {
				sqlSetData.push('groupID = '+(group ? conn.connection.escape(group) : 'NULL'));
			}
			if (notes) {
				sqlSetData.push('notes = '+((notes && notes != '*blank*') ? conn.connection.escape(notes) : 'NULL'));
				if (orderStatus == 11) {
					let date = new Date();
					let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY/MM/DD');
					let datenotes = 'Ordered' + '- ' + date2 ;
					sqlSetData.push('notes = '+conn.connection.escape(datenotes+'\n'+notes));
				} 
				else if (orderStatus == 5) {
					let date = new Date();
					let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY/MM/DD');
					let datenotes = 'Pending Refund' + '- ' + date2 + ' By ' + user.username;
					sqlSetData.push('notes = '+conn.connection.escape(datenotes+'\n'+notes));
				}
				else if (orderStatus == 7) {
					let date = new Date();
					let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY/MM/DD');
					let datenotes = 'Refunded By' + ': ' + user.username + '- ' + date2 ;
					sqlSetData.push('notes = '+conn.connection.escape(datenotes+'\n'+notes));
				}

			} else {
				if (orderStatus == 11) {
					let date = new Date();
					let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY/MM/DD');
					let datenotes = 'Ordered' + '- ' + date2 ;
					let oldnote = await conn.query('SELECT notes FROM collecting WHERE orderID = '+conn.connection.escape(recordID));
	    			oldnote = oldnote[0].notes;
	    			if (oldnote) {
	    				sqlSetData.push('notes = '+conn.connection.escape(datenotes+ '\n'+ oldnote));
	    			} else {
	    				sqlSetData.push('notes = '+conn.connection.escape(datenotes));
	    			}					
				}
				else if (orderStatus == 5) {
					let date = new Date();
					let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY/MM/DD');
					let datenotes = 'Pending Refund' + '- ' + date2 + ' By ' + user.username;
					let oldnote = await conn.query('SELECT notes FROM collecting WHERE orderID = '+conn.connection.escape(recordID));
	    			oldnote = oldnote[0].notes;
	    			if (oldnote) {
	    				sqlSetData.push('notes = '+conn.connection.escape(datenotes+ '\n'+ oldnote));
	    			} else {
	    				sqlSetData.push('notes = '+conn.connection.escape(datenotes));
	    			}					
				}
				else if (orderStatus == 7) {
					let date = new Date();
					let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY/MM/DD');
					let datenotes = 'Refunded By' + ': ' + user.username + '- ' + date2 ;
					let oldnote = await conn.query('SELECT notes FROM collecting WHERE orderID = '+conn.connection.escape(recordID));
	    			oldnote = oldnote[0].notes;
	    			if (oldnote) {
	    				sqlSetData.push('notes = '+conn.connection.escape(datenotes+ '\n'+ oldnote));
	    			} else {
	    				sqlSetData.push('notes = '+conn.connection.escape(datenotes));
	    			}	
				} 
			}
			if (dailyorder != undefined) {
				sqlSetData.push('dailyorder = '+ conn.connection.escape(dailyorder));
			}
			if (fgb != undefined) {
				sqlSetData.push('fgb = '+ conn.connection.escape(fgb));
			}
			if (morlife != undefined) {
				sqlSetData.push('morlife = '+ conn.connection.escape(morlife));
			}
			if(spwarehouse != undefined) {
				sqlSetData.push('spwarehouse = '+ conn.connection.escape(spwarehouse));
			}
			if(orbit != undefined) {
				sqlSetData.push('orbit = '+ conn.connection.escape(orbit));
			}
			if(wv != undefined) {
				sqlSetData.push('wv = '+ conn.connection.escape(wv));
			}
			if(me != undefined) {
				sqlSetData.push('me = '+ conn.connection.escape(me));
			}
			if(scholastic != undefined) {
				sqlSetData.push('scholastic = '+ conn.connection.escape(scholastic));
			}
			if(korimco != undefined) {
				sqlSetData.push('korimco = '+ conn.connection.escape(korimco));
			}

			if (hyclor != undefined) {
				sqlSetData.push('hyclor = '+ conn.connection.escape(hyclor));
			}

			if (splosh != undefined) {
				sqlSetData.push('splosh = '+ conn.connection.escape(splosh));
			}

			if (sigma != undefined) {
				sqlSetData.push('sigma = '+ conn.connection.escape(sigma));
			}

			if (misc != undefined) {
				sqlSetData.push('misc = '+ conn.connection.escape(misc));
			}

			if (intertrading != undefined) {
				sqlSetData.push('intertrading = '+ conn.connection.escape(intertrading));
			}

			if (factory != undefined) {
				sqlSetData.push('factory = '+ conn.connection.escape(factory));
			}

			if (jv != undefined) {
				sqlSetData.push('jv = '+ conn.connection.escape(jv));
			}

			// if (sixpack != undefined) {
			// 	sqlSetData.push('sixpack = '+ conn.connection.escape(sixpack));
			// }

			// if (tenpack != undefined) {
			// 	sqlSetData.push('tenpack = '+ conn.connection.escape(tenpack));
			// }

			// if (twentypack != undefined) {
			// 	sqlSetData.push('twentypack = '+ conn.connection.escape(twentypack));
			// }

			// if (thirtypack != undefined) {
			// 	sqlSetData.push('thirtypack = '+ conn.connection.escape(thirtypack));
			// }

			// if (sixtypack != undefined) {
			// 	sqlSetData.push('sixtypack = '+ conn.connection.escape(sixtypack));
			// }

			// if (gucci != undefined) {
			// 	sqlSetData.push('gucci = '+ conn.connection.escape(gucci));
			// }

			if (kobayashi != undefined) {
				sqlSetData.push('kobayashi = '+ conn.connection.escape(kobayashi));
			}

			if (tprolls != undefined) {
				sqlSetData.push('tprolls = ' + conn.connection.escape(tprolls));
			}

			if (partialrefund != undefined) {

				let result = await conn.query('select data from orders where id= '+ conn.connection.escape(recordID));

				data = JSON.parse(result[0].data);
				let convertData = getConversionData(store);

			    let itemConvert = convertData.Items;
			    let items = data[itemConvert];
				if (!lineItemID) continue;

				for (let item of items) {
					if (item[convertData.ItemData.LineItemID]==lineItemID) {
						item.partialrefund = partialrefund;
					}
				}

				let totalPar = 0;

				for (let item of items) {
					if (item.partialrefund==1) {
						totalPar = 1;
					}
				}
				sqlSetData.push('partialrefund = ' + conn.connection.escape(totalPar));
				await conn.query('UPDATE orders set data = ' + conn.connection.escape(JSON.stringify(data)) + ' WHERE id = ' +conn.connection.escape(recordID));

					let date = new Date();
					let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY/MM/DD');
					let datenotes = sku + '- ' + 'Partial Refund' + '- ' + date2 + ' By ' + user.username;
					let oldnote = await conn.query('SELECT notes FROM collecting WHERE orderID = '+conn.connection.escape(recordID));
	    			oldnote = oldnote[0].notes;
	    			if (oldnote) {
	    				sqlSetData.push('notes = '+conn.connection.escape(datenotes + '\n'+ oldnote));
	    			} else {
	    				sqlSetData.push('notes = '+conn.connection.escape(datenotes));
	    			}

	    			let actionTime = moment.tz(new Date(), 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');
					let field = sku;
					let oldValue = '';
					let newValue = 'Partial Refund';

					await conn.query('INSERT INTO translogs(orderId, field, oldValue, newValue, actionBy, actionTime) VALUES ('
									+ conn.connection.escape(recordID) + ','
									+ conn.connection.escape(field) + ','
									+ conn.connection.escape(oldValue) + ','
									+ conn.connection.escape(newValue) + ','
									+ conn.connection.escape(user.username) + ','
									+ conn.connection.escape(actionTime) + ')');
			}
			
			if (resendRts != undefined) {
				sqlSetData.push('resendRts = '+ conn.connection.escape(resendRts));

				let packedDatas = await conn.query('SELECT packedData FROM collecting WHERE orderID = '+conn.connection.escape(recordID));
    			let packedData = packedDatas[0].packedData;
    			let date = new Date();
				let date2 = moment.tz(date, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');

    			if (!packedData) {
							packedData = [user.username + ' - ' + date2 + ' - ' +  'Resend RTS'];
						} else {
							packedData = JSON.parse(packedData);
							packedData.push(user.username + ' - ' + date2 + ' - ' +  'Resend RTS');	
						}

						await conn.query('UPDATE collecting SET packedData = '+ conn.connection.escape(JSON.stringify(packedData)) +' WHERE orderID = '+conn.connection.escape(recordID));
						
			}

			if (rts != undefined) {
				sqlSetData.push('rts = '+ conn.connection.escape(rts));
			}

			if (addBackToInventory != undefined) {
				sqlSetData.push('addBackToInventory = '+ conn.connection.escape(addBackToInventory));

				let packedDatas = await conn.query('SELECT packedData FROM collecting WHERE orderID = '+conn.connection.escape(recordID));
    			let packedData = packedDatas[0].packedData;
    			let date = new Date();
				let date2 = moment.tz(date, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');

    			if (!packedData) {
							packedData = [user.username + ' - ' + date2 + ' - ' +  'Add Back To Inventory'];
						} else {
							packedData = JSON.parse(packedData);
							packedData.push(user.username + ' - ' + date2 + ' - ' +  'Add Back To Inventory');	
						}

						await conn.query('UPDATE collecting SET packedData = '+ conn.connection.escape(JSON.stringify(packedData)) +' WHERE orderID = '+conn.connection.escape(recordID));
			}

			if (locationSelected != undefined) {
				sqlSetData.push('locationselected = '+ conn.connection.escape(locationSelected));
			}

			if (partialcollectTime) {
				sqlSetData.push('partialcollected = UTC_TIMESTAMP()');
			}

			if (transaction) {
				transaction = JSON.parse(transaction);
				let actionTime = moment.tz(new Date(), 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');
				let actionBy = '';

				let users = await conn.query('SELECT * FROM users WHERE id = ' + conn.connection.escape(user.id) + ' AND type != ' + conn.connection.escape(Config.USER_TYPE.DISABLED));

				if (users.length == 1) {
					actionBy = users[0].username;
				}
							
				for (let trans of transaction) {
					if (!trans.newValue) continue;
					await conn.query('INSERT INTO translogs(orderId, field, oldValue, newValue, actionBy, actionTime) VALUES ('
									+ conn.connection.escape(recordID) + ','
									+ conn.connection.escape(trans.field) + ','
									+ conn.connection.escape(trans.oldValue) + ','
									+ conn.connection.escape(trans.newValue) + ','
									+ conn.connection.escape(actionBy) + ','
									+ conn.connection.escape(actionTime) + ')');
					if (trans.newValue == 'Packed') {
						// console.log(trans.newValue);
						await conn.query('UPDATE collecting SET packer = ' + conn.connection.escape(actionBy) + ', packedTime = '+ conn.connection.escape(actionTime) +' WHERE orderID = '+conn.connection.escape(recordID));
					}
				}
			} 

			if (scannedQtys) {
				scannedQtys = JSON.parse(scannedQtys);

				let result = await conn.query('SELECT data FROM orders WHERE id = ' + recordID);
				let data = result[0].data;

				data = JSON.parse(data);
				let convertData = getConversionData(store);

			    let itemConvert = convertData.Items;
			    let items = data[itemConvert];

				for (let item of items) {
					for (let scannedQty in scannedQtys) {
						if (item[convertData.ItemData.LineItemID]==scannedQty) {
							item.scannedQty = scannedQtys[scannedQty];
							break;
						}
					}	
				}

				let fullyCollected = true;
				for (let item of items) {
					for (let scannedQty in scannedQtys) {
						if (item[convertData.ItemData.LineItemID]==scannedQty) {
							item.scannedQty = scannedQtys[scannedQty];
							// console.log(item.scannedQty);
							if (scannedQtys[scannedQty][0] != scannedQtys[scannedQty][1]) {
								fullyCollected = false;
								break;
							}
						break;
						}
					}	
				}

				if (fullyCollected) {
					await conn.query('UPDATE collecting SET status = 22 WHERE orderID = ' + recordID);

					let date = new Date();
					let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY/MM/DD');
					let datenotes = 'Fully Picked By' + ': ' + user.username + '- ' + date2 ;
					let oldnote = await conn.query('SELECT notes FROM collecting WHERE orderID = '+conn.connection.escape(recordID));
	    			oldnote = oldnote[0].notes;
	    			if (oldnote) {
	    				sqlSetData.push('notes = '+conn.connection.escape(oldnote + '\n'+ datenotes));
	    			} else {
	    				sqlSetData.push('notes = '+conn.connection.escape(datenotes));
	    			}	
				
					if (transaction) {
						let actionTime = moment.tz(new Date(), 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');
						let newValue = 'Fully Picked';

						for (let trans of transaction) {
							await conn.query('INSERT INTO translogs(orderId, field, oldValue, newValue, actionBy, actionTime) VALUES ('
											+ conn.connection.escape(recordID) + ','
											+ conn.connection.escape(trans.field) + ','
											+ conn.connection.escape(trans.oldValue) + ','
											+ conn.connection.escape(newValue) + ','
											+ conn.connection.escape(user.username) + ','
											+ conn.connection.escape(actionTime) + ')');
						}
					} 
				}
				else {
					await conn.query('UPDATE collecting SET status = 21 WHERE orderID = ' + recordID);

					let date = new Date();
					let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY/MM/DD');
					let datenotes = 'Partially Picked By' + ': ' + user.username + '- ' + date2 ;
					let oldnote = await conn.query('SELECT notes FROM collecting WHERE orderID = '+conn.connection.escape(recordID));
	    			oldnote = oldnote[0].notes;
	    			if (oldnote) {
	    				sqlSetData.push('notes = '+conn.connection.escape(oldnote + '\n'+ datenotes));
	    			} else {
	    				sqlSetData.push('notes = '+conn.connection.escape(datenotes));
	    			}	
									
					if (transaction) {		
						let actionTime = moment.tz(new Date(), 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');
						let newValue = 'Partially Picked';

						for (let trans of transaction) {
							await conn.query('INSERT INTO translogs(orderId, field, oldValue, newValue, actionBy, actionTime) VALUES ('
											+ conn.connection.escape(recordID) + ','
											+ conn.connection.escape(trans.field) + ','
											+ conn.connection.escape(trans.oldValue) + ','
											+ conn.connection.escape(newValue) + ','
											+ conn.connection.escape(user.username) + ','
											+ conn.connection.escape(actionTime) + ')');
						}
					} 
						
				}
				//console.log(JSON.stringify(items,null,4));

				await conn.query('UPDATE orders set data = ' + conn.connection.escape(JSON.stringify(data)) + ' WHERE id = ' +conn.connection.escape(recordID));

				sqlSetData.push('collector = '+conn.connection.escape(user.username));
				sqlSetData.push('collected = UTC_TIMESTAMP()');
				
			}

			if (partialRefundDone) {
				sqlSetData.push('partialrefund = 0');
			}

			if (inventoryBack) {
				
				let locations = await conn.query('SELECT locationselected FROM collecting WHERE orderID = ' + recordID);
				if (locations.length>0) {
					let locationselected = JSON.parse(locations[0].locationselected);
					for (let lineitemid in locationselected) {
						let locs = locationselected[lineitemid];
						console.log(locs);
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
								await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
								                              + invID + ', '
								                              + conn.connection.escape(oldBay) + ', '
								                              + oldQty + ', '
								                              + conn.connection.escape(orderID) + ', '
								                              + newQty + ", '" 
								                              + actionTime + "', "
								                              + conn.connection.escape(user.username) + ', '
												              + "'Outofstock', " 
												              + null + ', '
												              + null +')');

								await conn.query('UPDATE inventorylocation SET indivQty = indivQty + ' + loc.indivQty + ' WHERE id = ' + loc.id);
							}
						}

					}
				}
					
			} 

			if (page) {
				sqlSetData.push('page = ' + conn.connection.escape(page));
			}
			
			let result = await conn.query('UPDATE collecting SET '+sqlSetData.join(',')+' WHERE orderID = '+conn.connection.escape(recordID));

			if (result.affectedRows > 0) {
				httpStatus = 200;
				output.result = 'success';
			}
			else {
				httpStatus = 202;
				output.result = 'No changes made.';
			}
		}
		catch (e) {
			// Error
			httpStatus = 503;
			output.result = e;
			console.log(e);
		}
	} while(0);
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = updateOrder;
