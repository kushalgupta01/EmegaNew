//  Discount Chemist
//  Order System

const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require("moment-timezone");

const updateStockInventory = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Check token
			/*if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}*/

			if (method == 'post') {
				var docketNo = req.body.docketNo;
				var store = req.body.store;
				var itemNo = req.body.itemNo;
				var itemName = (req.body.itemName == 'null' || req.body.itemName == '')? null : req.body.itemName;
				var sku = (req.body.sku == 'null' || req.body.sku == '')? null : req.body.sku;
				var customSku = (req.body.customSku == 'null' || req.body.customSku == '')? null : req.body.customSku;
				var itemBarcode = (req.body.itemBarcode == 'null' || req.body.itemBarcode == '')? null : req.body.itemBarcode;
				var cartonBarcode = (req.body.cartonBarcode == 'null' || req.body.cartonBarcode == '')? null : req.body.cartonBarcode;
				var stockInHand = (req.body.stockInHand == 'null' || req.body.stockInHand == '')? null : req.body.stockInHand;
				var indivQty = (req.body.indivQty == 'null' || req.body.indivQty == '')? null : req.body.indivQty;
				var cartonQty = (req.body.cartonQty == 'null' || req.body.cartonQty == '')? null : req.body.cartonQty;
				var quantityPerCarton = (req.body.quantityPerCarton == 'null' || req.body.quantityPerCarton == '')? null : req.body.quantityPerCarton;
				var innerQty = (req.body.innerQty == 'null' || req.body.innerQty == '')? null : req.body.innerQty;
				var reservedQuantity = (req.body.reservedQuantity == 'null' || req.body.reservedQuantity == '')? null : req.body.reservedQuantity;
				var damagedItemQuantity = (req.body.damagedItemQuantity == 'null' || req.body.damagedItemQuantity == '')? null : req.body.damagedItemQuantity;
				var damagedCartonQuantity = (req.body.damagedCartonQuantity == 'null' || req.body.damagedCartonQuantity == '')? null : req.body.damagedCartonQuantity;
				var stockReceived = (req.body.stockReceived== 'null' || req.body.stockReceived == '')? null : req.body.stockReceived;
				var stockSent = (req.body.stockSent == 'null' || req.body.stockSent == '')? null : req.body.stockSent;
				var weight = (req.body.weight == 'null' || req.body.weight == '')? null : req.body.weight;
				var bay = (req.body.bay == 'null' || req.body.bay == ''  )? null :req.body.bay;
				var expiry = (req.body.expiry == 'null' || req.body.expiry == '')? null : req.body.expiry;
				var coreCloseout = (req.body.coreCloseout == 'null' || req.body.coreCloseout == '')? null : req.body.coreCloseout;
				var clearance = (req.body.clearance == 'null' || req.body.clearance == '')? null : req.body.clearance;
				var supplier = (req.body.supplier == 'null' || req.body.supplier == '')? null : req.body.supplier;
				var subtractfromstock = (req.body.subtractfromstock == 'null' || req.body.subtractfromstock == '')? null : req.body.subtractfromstock;
				var packsize = (req.body.packsize == 'null' || req.body.packsize == '')? null : req.body.packsize;
				var addReservedQuantity = (req.body.addReservedQuantity == 'null' || req.body.addReservedQuantity == '')? null : req.body.addReservedQuantity;
				var subtractReservedQuantity = (req.body.subtractReservedQuantity == 'null' || req.body.subtractReservedQuantity == '')? null : req.body.subtractReservedQuantity;
				var subtractfromindivStock = (req.body.subtractfromindivStock == 'null' || req.body.subtractfromindivStock == '')? null : req.body.subtractfromindivStock;
				var subtractfromcartonStock = (req.body.subtractfromcartonStock == 'null' || req.body.subtractfromcartonStock == '')? null : req.body.subtractfromcartonStock;
				var addfromindivStock = (req.body.addfromindivStock == 'null' || req.body.addfromindivStock == '')? null : req.body.addfromindivStock;
				var addfromcartonStock = (req.body.addfromcartonStock == 'null' || req.body.addfromcartonStock == '')? null : req.body.addfromcartonStock;
				var addfromdamagedStock = (req.body.addfromdamagedStock == 'null' || req.body.addfromdamagedStock == '')? null : req.body.addfromdamagedStock;
				var notes = (req.body.notes == 'null' || req.body.notes == '')? null : req.body.notes;
				var subtractfromlooseQty = (req.body.subtractfromlooseQty == 'null' || req.body.subtractfromlooseQty == '')? null : req.body.subtractfromlooseQty;
				var subtractfromcartonQty = (req.body.subtractfromcartonQty == 'null' || req.body.subtractfromcartonQty == '')? null : req.body.subtractfromcartonQty;
				var subtractfromqvbqtys = (req.body.subtractfromqvbqtys == 'null' || req.body.subtractfromqvbqtys == '')? null : req.body.subtractfromqvbqtys;
				var subtractfromwhqtys = (req.body.subtractfromwhqtys == 'null' || req.body.subtractfromwhqtys == '')? null : req.body.subtractfromwhqtys;
				var subtractfromwhlooseQty = (req.body.subtractfromwhlooseQty == 'null' || req.body.subtractfromwhlooseQty == '')? null : req.body.subtractfromwhlooseQty;
				var subtractfromwhcartonQty = (req.body.subtractfromwhcartonQty == 'null' || req.body.subtractfromwhcartonQty == '')? null : req.body.subtractfromwhcartonQty;
				var subtractfromReservedQtys = (req.body.subtractfromReservedQtys == 'null' || req.body.subtractfromReservedQtys == '')? null : req.body.subtractfromReservedQtys;
				var subtractfrompickqtys = (req.body.subtractfrompickqtys == 'null' || req.body.subtractfrompickqtys == '')? null : req.body.subtractfrompickqtys;
				var subtractfrombulkqtys = (req.body.subtractfrombulkqtys == 'null' || req.body.subtractfrombulkqtys == '')? null : req.body.subtractfrombulkqtys;
				var subtractfromlocqtys = (req.body.subtractfromlocqtys == 'null' || req.body.subtractfromlocqtys == '')? null : req.body.subtractfromlocqtys;
				var orderID = (req.body.orderID == 'null' || req.body.orderID == '')? null: req.body.orderID;
				var pageType = (req.body.pageType == 'null' || req.body.pageType == '')? null: req.body.pageType;
			}


			await conn.connect();
			if (subtractfromqvbqtys == null && subtractfromwhqtys == null) {
				if (customSku) {
					var result = await conn.query('select 1 from stockinventory where customSku=' + conn.connection.escape(customSku));
				} else {
					httpStatus = 200;
					output.result = 'CustomSku not found.';
					break;
				}
				

				if (result.length == 0) {
					httpStatus = 200;
					output.result = 'Inventory does not exist.';
					break;
				}
			}

			if (itemNo != null) {
				await conn.query('UPDATE stockinventory SET itemNo = ' + conn.connection.escape(itemNo) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (itemName != null) {
				await conn.query('UPDATE stockinventory SET itemName = ' + conn.connection.escape(itemName) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (sku != null) {
				await conn.query('UPDATE stockinventory SET sku  = ' + conn.connection.escape(sku ) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (customSku  != null) {
				await conn.query('UPDATE stockinventory SET customSku  = ' + conn.connection.escape(customSku ) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (itemBarcode != null) {
				await conn.query('UPDATE stockinventory SET itemBarcode = ' + conn.connection.escape(itemBarcode) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (cartonBarcode != null) {
				await conn.query('UPDATE stockinventory SET cartonBarcode = ' + conn.connection.escape(cartonBarcode) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (quantityPerCarton != null) {
				await conn.query('UPDATE stockinventory SET quantityPerCarton = ' + conn.connection.escape(quantityPerCarton) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (innerQty != null) {
				await conn.query('UPDATE stockinventory SET innerQty = ' + conn.connection.escape(innerQty) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (weight != null) {
				await conn.query('UPDATE stockinventory SET weight = ' + conn.connection.escape(weight) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (stockInHand != null) {
				await conn.query('UPDATE stockinventory SET stockInHand = ' + conn.connection.escape(stockInHand) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (stockReceived != null) {
				let oldStockReceivedResult = await conn.query('SELECT stockReceived FROM stockinventory WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
				let oldStockReceived = JSON.parse(oldStockReceivedResult[0].stockReceived);
				if (oldStockReceived==null) {
					oldStockReceived = [];
				}
				oldStockReceived.push(stockReceived);
				await conn.query('UPDATE stockinventory SET stockReceived = ' + conn.connection.escape(JSON.stringify(oldStockReceived)) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			} 

			if (stockSent != null) {
				await conn.query('UPDATE stockinventory SET stockSent = ' + conn.connection.escape(stockSent) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
            }

            if (reservedQuantity != null) {
				await conn.query('UPDATE stockinventory SET reservedQuantity = ' + conn.connection.escape(reservedQuantity) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
            }

            if (indivQty != null) {
				await conn.query('UPDATE stockinventory SET indivQty = ' + conn.connection.escape(indivQty) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
            }

            if (cartonQty != null) {
				await conn.query('UPDATE stockinventory SET cartonQty = ' + conn.connection.escape(cartonQty) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
            }
            
			if (bay != null) {
				await conn.query('UPDATE stockinventory SET bay = ' + conn.connection.escape(bay) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (expiry != null) {
				await conn.query('UPDATE stockinventory SET expiry = ' + conn.connection.escape(expiry) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (coreCloseout != null) {
				await conn.query('UPDATE stockinventory SET coreCloseout = ' + conn.connection.escape(coreCloseout) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (clearance != null) {
				await conn.query('UPDATE stockinventory SET clearance = ' + conn.connection.escape(clearance) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (supplier != null) {
				await conn.query('UPDATE stockinventory SET supplier = ' + conn.connection.escape(supplier) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (subtractfromstock != null) {
				await conn.query('UPDATE stockinventory SET stockInHand = stockInHand - ' + subtractfromstock + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (subtractfromindivStock != null) {
				if (store != 8 && store != 71) {
					let currentIndivQty = await conn.query('SELECT indivQty FROM stockinventory WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					let indivQuantity = currentIndivQty[0].indivQty;
					if (subtractfromindivStock <= indivQuantity) {
						await conn.query('UPDATE stockinventory SET indivQty = indivQty - ' + subtractfromindivStock + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					} else {
						await conn.query('UPDATE stockinventory SET indivQty = indivQty + quantityPerCarton - ' + subtractfromindivStock + ', cartonQty = cartonQty - 1 WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					}
				} else {
					/*let currentThreePLQty = await conn.query('SELECT 3PLQty FROM stockinventory WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					let ThreePLQty = currentThreePLQty[0]['3PLQty'];

					if (subtractfromindivStock <= ThreePLQty) {
						await conn.query('UPDATE stockinventory SET 3PLQty = 3PLQty - ' + subtractfromindivStock + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					} else {
						await conn.query('UPDATE stockinventory SET QVBQty = QVBQty + 3PLQty - ' + subtractfromindivStock + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					}*/

					await conn.query('UPDATE stockinventory SET QVBQty = QVBQty - ' + subtractfromindivStock + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
				}
					
				
			}

			if (subtractfromcartonStock != null) {
				if (store != 8 && store != 71) {
					await conn.query('UPDATE stockinventory SET cartonQty = cartonQty - ' + subtractfromcartonStock + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
				}	
			}

			if (addfromindivStock != null) {
				await conn.query('UPDATE stockinventory SET indivQty = indivQty + ' + addfromindivStock + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (addfromcartonStock != null) {
				await conn.query('UPDATE stockinventory SET cartonQty = cartonQty + ' + addfromcartonStock + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (addfromdamagedStock != null) {
				await conn.query('UPDATE stockinventory SET damagedQty = damagedQty + ' + addfromdamagedStock + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (packsize != null) {
				await conn.query('UPDATE stockinventory SET packsize = ' + conn.connection.escape(packsize) + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (subtractReservedQuantity != null) {
				await conn.query('UPDATE stockinventory SET reservedQuantity = reservedQuantity - ' + subtractReservedQuantity + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (addReservedQuantity != null) {
				await conn.query('UPDATE stockinventory SET reservedQuantity = reservedQuantity + ' + addReservedQuantity + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (damagedItemQuantity != null) {
				let indivQuantityResult = await conn.query('SELECT indivQty FROM stockinventory WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
				//let qtyPerCartonResult = await conn.query('SELECT quantityPerCarton FROM stockinventory WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
				
				let indivQuantity = indivQuantityResult[0].indivQty;
				//let qtyPerCarton = qtyPerCartonResult[0].quantityPerCarton;
				//console.log(damagedItemQuantity);
				if (damagedItemQuantity <= indivQuantity) {
					await conn.query('UPDATE stockinventory SET indivQty = indivQty - ' + damagedItemQuantity + ', damagedQty = damagedQty + '+damagedItemQuantity+' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
				} else {
					await conn.query('UPDATE stockinventory SET indivQty = indivQty + quantityPerCarton - ' + damagedItemQuantity + ', cartonQty = cartonQty - 1 , damagedQty = damagedQty + '+damagedItemQuantity+' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
				}
			}

			if (damagedCartonQuantity != null) {
				let qtyPerCartonResult = await conn.query('SELECT quantityPerCarton FROM stockinventory WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
				let quantityPerCarton = qtyPerCartonResult[0].quantityPerCarton;
				// console.log(quantityPerCarton);
				await conn.query('UPDATE stockinventory SET cartonQty = cartonQty - ' + damagedCartonQuantity + ', damagedQty = damagedQty + '+damagedCartonQuantity*quantityPerCarton+' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (notes != null) {
				await conn.query('UPDATE stockinventory SET notes = ' + conn.connection.escape(notes) +'  WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
			}

			if (subtractfromlooseQty && subtractfromcartonQty && docketNo) {
				let loggedInUser = await userCheckToken(token);
				if (!loggedInUser) {
					httpStatus = 401;
					output.result = 'Not logged in.';
					break;
				}

				let actionTime = moment.tz(new Date(), 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');
				let actionBy = '';

				let users = await conn.query('SELECT * FROM users WHERE id = ' + conn.connection.escape(loggedInUser.id) + ' AND type != ' + conn.connection.escape(Config.USER_TYPE.DISABLED));

				if (users.length == 1) {
					actionBy = users[0].username;
				}


				let docketNoData = conn.connection.escape(docketNo);
				let customSkuData = conn.connection.escape(customSku);
				let skuData = conn.connection.escape(sku);
				let result = await conn.query("SELECT * FROM stockinventory WHERE " + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));

				let qtyPerCarton = (result[0] && result[0].quantityPerCarton) ? result[0].quantityPerCarton : 0 ;
				let looseQty = result[0]["indivQty"];
        		let cartonQty = result[0]["cartonQty"];
				let stockInHand = looseQty + cartonQty * qtyPerCarton;
				
				let b2cLooseQty = result[0]['3PLIndivQty'];
				let b2cCartonQty = result[0]["3PLCartonQty"];
				let b2cTotalQty = b2cLooseQty + b2cCartonQty * qtyPerCarton;
				let totalQty = stockInHand + b2cTotalQty;

				let actionLooseQty = subtractfromlooseQty;
		        let actionCartonQty = subtractfromcartonQty;
		        let type = 'B2B';

				await conn.query(`INSERT INTO transactionlogs (docketNo, sku, customSku, type, totalQty, stockInHand, looseQty, cartonQty, b2cTotalQty, b2cLooseQty, b2cCartonQty, qtyPerCarton, actionLooseQty, actionCartonQty, actionTime, actionBy) 
				VALUES (${docketNoData}, ${skuData}, ${customSkuData}, '${type}', '${totalQty}', '${stockInHand}', '${looseQty}', '${cartonQty}', '${b2cTotalQty}', '${b2cLooseQty}', '${b2cCartonQty}', '${qtyPerCarton}', 
				'${actionLooseQty}', '${actionCartonQty}', '${actionTime}', '${actionBy}')`);
			}

			if (subtractfromlooseQty != null) {
				if (store != 8 && store != 71 && store != 91) {
					let currentInv = await conn.query('SELECT indivQty, cartonQty, quantityPerCarton FROM stockinventory WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					let indivQuantity = parseInt(currentInv[0].indivQty);
					let cartonQuantity = parseInt(currentInv[0].cartonQty);
					let quantityPerCarton = parseInt(currentInv[0].quantityPerCarton);
					
					if (subtractfromlooseQty <= indivQuantity) {
						await conn.query('UPDATE stockinventory SET indivQty = indivQty - ' + subtractfromlooseQty + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					} else {
						if (quantityPerCarton > 0) {
							let curstockonhand = indivQuantity + cartonQuantity*quantityPerCarton - subtractfromlooseQty;
							let curCartonQty = curstockonhand / quantityPerCarton;
							if (curCartonQty>0) {
								curCartonQty = Math.floor(curCartonQty);
							} else {
								curCartonQty = Math.ceil(curCartonQty);
							}
							let curLooseQty = curstockonhand % quantityPerCarton;
							await conn.query('UPDATE stockinventory SET indivQty = ' + curLooseQty + ', cartonQty = '+curCartonQty+' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
						} else {
							await conn.query('UPDATE stockinventory SET indivQty = indivQty - ' + subtractfromlooseQty + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
						}
					}
				} else {
					let currentInv = await conn.query('SELECT 3PLIndivQty, 3PLCartonQty, quantityPerCarton FROM stockinventory WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					let indivQuantity = parseInt(currentInv[0]['3PLIndivQty']);
					let cartonQuantity = parseInt(currentInv[0]['3PLCartonQty']);
					let quantityPerCarton = parseInt(currentInv[0].quantityPerCarton);

					if (indivQuantity<=0 && cartonQuantity<=0) {
						await conn.query('UPDATE stockinventory SET QVBQty = QVBQty - ' + subtractfromlooseQty + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					} else {
						if (subtractfromlooseQty <= indivQuantity) {
							await conn.query('UPDATE stockinventory SET 3PLIndivQty = 3PLIndivQty - ' + subtractfromlooseQty + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
						} else {
							if (quantityPerCarton > 0) {
								let curstockonhand = indivQuantity + cartonQuantity*quantityPerCarton - subtractfromlooseQty;
								let curCartonQty = curstockonhand / quantityPerCarton;
								if (curCartonQty>0) {
									curCartonQty = Math.floor(curCartonQty);
								} else {
									curCartonQty = Math.ceil(curCartonQty);
								}
								let curLooseQty = curstockonhand % quantityPerCarton;
								await conn.query('UPDATE stockinventory SET 3PLIndivQty = ' + curLooseQty + ', 3PLCartonQty = '+curCartonQty+' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
							} else {
								await conn.query('UPDATE stockinventory SET 3PLIndivQty = 3PLIndivQty - ' + subtractfromlooseQty + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
							}
						}
						
				    }				
			    }
			}

			if (subtractfromcartonQty != null) {
				if (store != 8  && store != 71  && store != 91) {
					await conn.query('UPDATE stockinventory SET cartonQty = cartonQty - ' + subtractfromcartonQty + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));	
				} else {
					let currentInv = await conn.query('SELECT 3PLIndivQty, 3PLCartonQty, quantityPerCarton FROM stockinventory WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					let indivQuantity = parseInt(currentInv[0]['3PLIndivQty']);
					let cartonQuantity = parseInt(currentInv[0]['3PLCartonQty']);
					let quantityPerCarton = parseInt(currentInv[0].quantityPerCarton);

					if (indivQuantity>0 || cartonQuantity>0) {
						await conn.query('UPDATE stockinventory SET 3PLCartonQty = 3PLCartonQty - ' + subtractfromcartonQty + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
				    }
				}
			}

			if (subtractfromlocqtys != null) {
				let notEnoughQty = false;
				let actionTime = moment.tz(new Date(), 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');
				let dateNow = new Date();
				let actionTime5minute = moment.tz(new Date(dateNow.getTime() - 5 * 60000), 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');
				let user = await userCheckToken(token, true);

				let locQtys = JSON.parse(subtractfromlocqtys);
				for (let checkLocQty of locQtys){
					let check = await conn.query('SELECT * FROM inventorylocation WHERE id = ' + checkLocQty[0]);
					if (check.length == 1){
						checkQty = check[0].indivQty;
						if (checkQty < checkLocQty[1]){
							output.result = check[0].customSku + ' Location ' + check[0].bay +' does not have enough quantity';
							notEnoughQty = true;
							break;
							httpStatus = 200;
						}
					}
					else {
						output.result = checkLocQty.length>2 ? (checkLocQty[2].replace(/\"/g, '') + ' Location not found.') : 'Location not found.';
						notEnoughQty = true;
						httpStatus = 200;
						break;
					}
				}

				if (notEnoughQty) {
					break;
				}

				if (locQtys && locQtys.length > 0) {
					let details = await conn.query('SELECT * FROM inventorylocation WHERE id = ' + locQtys[0][0]);
					
					if (details.length == 1) {
						invID = details[0].invID;
					}

					let result = await conn.query('SELECT * FROM transferlogs WHERE invID = ' + invID + ' AND newBay = ' + conn.connection.escape(orderID) + ' AND actionTime > ' + conn.connection.escape(actionTime5minute));
					console.log(result);
					if (result.length == 0) {
						for (let locQty of locQtys) {

							let details = await conn.query('SELECT * FROM inventorylocation WHERE id = ' + locQty[0]);
							if (details.length == 1) {
								invID = details[0].invID;
								oldBay = details[0].bay;
								oldQty = details[0].indivQty;
								newQty = -locQty[1];
							}
							await conn.query('UPDATE inventorylocation SET indivQty = indivQty - ' + locQty[1] + ' WHERE id = ' + locQty[0]);
							await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType, reason) VALUES (' 
							                              + invID + ', '
							                              + conn.connection.escape(oldBay) + ', '
							                              + oldQty + ', '
							                              + conn.connection.escape(orderID) + ', '
							                              + newQty + ", '" 
							                              + actionTime + "', "
							                              + conn.connection.escape(user.username) + ', '
											              + "'Collect', " 
											              + null + ', '
											              + null + ', '
											              + conn.connection.escape(pageType) +')');
							await conn.query('DELETE FROM inventorylocation WHERE id='+locQty[0]+' AND indivQty=0');
					    }
					}
				}
					
			}

			if (subtractfromqvbqtys != null) {
				let actionTime = moment.tz(new Date(), 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');
				let user = await userCheckToken(token, true);
				let qvbQtys = JSON.parse(subtractfromqvbqtys);
				for (let qvbQty of qvbQtys) {
					await conn.query('UPDATE stockinventory SET QVBQty = QVBQty - ' + qvbQty[1] + ' WHERE id = ' + qvbQty[0]);
					await conn.query('INSERT INTO stocksentqvblog (invID, qty, orderID, actionTime, actionBy, pageType) VALUES (' 
							                              + qvbQty[0] + ', '
							                              + conn.connection.escape(qvbQty[1]) + ', '
							                              + conn.connection.escape(orderID) + ', '
							                              + conn.connection.escape(actionTime) + ", "
							                              + conn.connection.escape(user.username)+','
			    										  + conn.connection.escape(pageType) +')');
			    }
				
			}

			if (subtractfromwhqtys != null) {
				let whQtys = JSON.parse(subtractfromwhqtys);
				for (let whQty of whQtys) {
					let indivQty = parseInt(whQty[1]);
					let cartonQty = parseInt(whQty[2]);
					let locid = whQty[0];

					let location = await conn.query('SELECT * FROM inventorylocation WHERE id = ' + locid);

					let invid = location[0].invID;
					let curIndivQty = location[0].indivQty;
					let curCartonQty = location[0].cartonQty;

					let qpc =  await conn.query('SELECT quantityPerCarton FROM stockinventory WHERE id = ' + invid);
					qpc = qpc[0].quantityPerCarton || 0;

					let currentStock = curIndivQty + curCartonQty*qpc;
					let qtyPicked = indivQty + cartonQty*qpc;

					let qtyLeft = currentStock - qtyPicked;

					let indQtyLeft, cartonQtyLeft;

					if (qpc>0) {
						if (qtyLeft >= 0) {
							cartonQtyLeft = Math.floor(qtyLeft / qpc);
						} else {
							cartonQtyLeft = Math.ceil(qtyLeft / qpc);
						}

						indQtyLeft = qtyLeft % qpc;
					} else {
						indQtyLeft = qtyLeft;
						cartonQtyLeft = 0;
					}
					await conn.query('UPDATE inventorylocation SET indivQty = ' + indQtyLeft + ', cartonQty = ' + cartonQtyLeft + ' WHERE id = ' + locid);
					
			    }
				
			}

			if (subtractfromwhlooseQty != null) {
				if (store != 8 && store != 71 && store != 91) {
					let currentInv = await conn.query('SELECT indivQty, cartonQty, quantityPerCarton FROM stockinventory WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					let indivQuantity = parseInt(currentInv[0].indivQty);
					let cartonQuantity = parseInt(currentInv[0].cartonQty);
					let quantityPerCarton = parseInt(currentInv[0].quantityPerCarton);
					
					if (subtractfromwhlooseQty <= indivQuantity) {
						await conn.query('UPDATE stockinventory SET indivQty = indivQty - ' + subtractfromwhlooseQty + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					} else {
						if (quantityPerCarton > 0) {
							let curstockonhand = indivQuantity + cartonQuantity*quantityPerCarton - subtractfromwhlooseQty;
							let curCartonQty = curstockonhand / quantityPerCarton;
							if (curCartonQty>0) {
								curCartonQty = Math.floor(curCartonQty);
							} else {
								curCartonQty = Math.ceil(curCartonQty);
							}
							let curLooseQty = curstockonhand % quantityPerCarton;
							await conn.query('UPDATE stockinventory SET indivQty = ' + curLooseQty + ', cartonQty = '+curCartonQty+' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
						} else {
							await conn.query('UPDATE stockinventory SET indivQty = indivQty - ' + subtractfromwhlooseQty + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
						}
					}
				} else {
					let currentInv = await conn.query('SELECT 3PLIndivQty, 3PLCartonQty, quantityPerCarton FROM stockinventory WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					let indivQuantity = parseInt(currentInv[0]['3PLIndivQty']);
					let cartonQuantity = parseInt(currentInv[0]['3PLCartonQty']);
					let quantityPerCarton = parseInt(currentInv[0].quantityPerCarton);

					
					if (subtractfromwhlooseQty <= indivQuantity) {
						await conn.query('UPDATE stockinventory SET 3PLIndivQty = 3PLIndivQty - ' + subtractfromwhlooseQty + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					} else {
						if (quantityPerCarton > 0) {
							let curstockonhand = indivQuantity + cartonQuantity*quantityPerCarton - subtractfromwhlooseQty;
							let curCartonQty = curstockonhand / quantityPerCarton;
							if (curCartonQty>0) {
								curCartonQty = Math.floor(curCartonQty);
							} else {
								curCartonQty = Math.ceil(curCartonQty);
							}
							let curLooseQty = curstockonhand % quantityPerCarton;
							await conn.query('UPDATE stockinventory SET 3PLIndivQty = ' + curLooseQty + ', 3PLCartonQty = '+curCartonQty+' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
						} else {
							await conn.query('UPDATE stockinventory SET 3PLIndivQty = 3PLIndivQty - ' + subtractfromwhlooseQty + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
						}
					}
						
				    				
			    }
			}

			if (subtractfromwhcartonQty != null) {
				if (store != 8  && store != 71  && store != 91) {
					await conn.query('UPDATE stockinventory SET cartonQty = cartonQty - ' + subtractfromwhcartonQty + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));	
				} else {
					let currentInv = await conn.query('SELECT 3PLIndivQty, 3PLCartonQty, quantityPerCarton FROM stockinventory WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
					let indivQuantity = parseInt(currentInv[0]['3PLIndivQty']);
					let cartonQuantity = parseInt(currentInv[0]['3PLCartonQty']);
					let quantityPerCarton = parseInt(currentInv[0].quantityPerCarton);

					if (indivQuantity>0 || cartonQuantity>0) {
						await conn.query('UPDATE stockinventory SET 3PLCartonQty = 3PLCartonQty - ' + subtractfromwhcartonQty + ' WHERE ' + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
				    }
				}
			}

			if (subtractfrompickqtys != null) {
				let pickQtys = JSON.parse(subtractfrompickqtys);
				for (let pickQty of pickQtys) {
					await conn.query('UPDATE stockinventory SET pickQty = pickQty - ' + pickQty[1] + ' WHERE id = ' + pickQty[0]);
			    }
				
			}
			if (subtractfrombulkqtys != null) {
				let bulkQtys = JSON.parse(subtractfrombulkqtys);
				for (let bulkQty of bulkQtys) {
					await conn.query('UPDATE stockinventory SET bulkQty = bulkQty - ' + bulkQty[1] + ' WHERE id = ' + bulkQty[0]);
			    }
				
			}


			if (subtractfromReservedQtys != null) {
				let reserveQtys = JSON.parse(subtractfromReservedQtys);
				for (let reserveQty of reserveQtys) {
					await conn.query('UPDATE stockinventory SET reservedQuantity = reservedQuantity - ' + reserveQty[1] + ' WHERE id = ' + reserveQty[0]);
			    }
				
			}

			output.result = 'success';
			httpStatus = 200;
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
	let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    let localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
	return localISOTime.replace('T', ' ').replace('Z', '').slice(0, -4);
}

module.exports = updateStockInventory;