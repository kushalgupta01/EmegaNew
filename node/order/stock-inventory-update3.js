const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const updateInventory = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var id = req.body.id;
	var poNo = req.body.poNo;
	var itemNo = req.body.itemNo;
	var itemName = req.body.itemName;
	var sku = req.body.sku;
	var customSku = req.body.customSku;
	var itemBarcode = req.body.itemBarcode;
	var cartonBarcode = req.body.cartonBarcode;
	var type = req.body.type != '' ? req.body.type : null;
	var quantityPerCarton = req.body.quantityPerCarton != '' ? req.body.quantityPerCarton : 0;
	var weight = req.body.weight != '' ? req.body.weight : 0; 
	var indivQty = req.body.indivQty;
	var cartonQty = req.body.cartonQty;
	var stockSent = req.body.stockSent != '' ? req.body.stockSent : 0;
	var bay = req.body.bay;
	var expiry = req.body.expiry;
	var coreCloseout = req.body.coreCloseout != '' ? req.body.coreCloseout : 0;
	var clearance = req.body.clearance != '' ? req.body.clearance : 0;
	var supplier = req.body.supplier;
	var action = req.body.action;

	let date = new Date();
    let date2 = moment.tz(date, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');


	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}
			await conn.connect();
			
			if (customSku && indivQty && cartonQty && poNo) {

				let loggedInUserId = await userCheckToken(token);
				if (!loggedInUserId) {
					httpStatus = 401;
					output.result = 'Not logged in.';
					break;
				}

				let actionTime = moment.tz(new Date(), 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');
				let actionBy = '';
				let actionType = 'Addition';

				let users = await conn.query('SELECT * FROM users WHERE id = ' + conn.connection.escape(loggedInUserId) + ' AND type != ' + conn.connection.escape(Config.USER_TYPE.DISABLED));

				if (users.length == 1) {
					actionBy = users[0].username;
				}


				let poNoData = conn.connection.escape(poNo);
				let customSkuData = conn.connection.escape(customSku);
				let skuData = conn.connection.escape(sku);
				let result = await conn.query("SELECT * FROM stockinventory WHERE " + (customSku ? 'customSku=' + conn.connection.escape(customSku) : 'sku=' + conn.connection.escape(sku)));
        		let qtyPerCarton = (result[0] && result[0].quantityPerCarton) ? result[0].quantityPerCarton : 0 ;
        
				let looseQty = result[0]["indivQty"];
        		let currentCartonQty = result[0]["cartonQty"];
				let stockInHand = looseQty + currentCartonQty * qtyPerCarton;
				
				let b2cLooseQty = result[0]['3PLIndivQty'];
				let b2cCartonQty = result[0]["3PLCartonQty"];
				let b2cTotalQty = b2cLooseQty + b2cCartonQty * qtyPerCarton;
				let totalQty = stockInHand + b2cTotalQty;

				let actionLooseQty = indivQty;
        		let actionCartonQty = cartonQty;

				await conn.query(`INSERT INTO transactionlogs (poNo, sku, customSku, type, totalQty, stockInHand, looseQty, cartonQty, b2cTotalQty, b2cLooseQty, b2cCartonQty, qtyPerCarton, actionLooseQty, actionCartonQty, actionTime, actionBy, actionType) 
				VALUES (${poNoData}, ${skuData}, ${customSkuData}, '${type}', '${totalQty}', '${stockInHand}', '${looseQty}', '${currentCartonQty}', '${b2cTotalQty}', '${b2cLooseQty}', '${b2cCartonQty}', '${qtyPerCarton}', 
				'${actionLooseQty}', '${actionCartonQty}', '${actionTime}', '${actionBy}', '${actionType}')`);
			}
			
			let sql = '';
			if (type == 'B2C') {
				sql = 'UPDATE stockinventory SET 3PLIndivQty = 3PLIndivQty + ' + indivQty 
								              + ', 3PLCartonQty = 3PLCartonQty + ' + cartonQty 
								              + ' WHERE id = ' + id;
			} else {
				sql = 'UPDATE stockinventory SET indivQty = indivQty + ' + indivQty
								              + ', cartonQty = cartonQty + ' + cartonQty
								              + ' WHERE id = ' + id;
			}

			let	sql1 = 'INSERT INTO stockreceived (itemNo, itemName, sku, customSku, itemBarcode, cartonBarcode, quantityPerCarton, indivQty, cartonQty, bay, supplier, receivedTime, type) VALUES (' 
								              + conn.connection.escape(itemNo) + ', '
								              + conn.connection.escape(itemName) + ', '
								              + conn.connection.escape(sku) + ', '
								              + conn.connection.escape(customSku) + ', '
								              + conn.connection.escape(itemBarcode) + ', '
								              + conn.connection.escape(cartonBarcode) + ', '
								              + conn.connection.escape(quantityPerCarton) + ', '								           
								              + conn.connection.escape(indivQty) + ', '
								              + conn.connection.escape(cartonQty) + ', ' 
								              + conn.connection.escape(bay) + ', '						           
								              + conn.connection.escape(supplier) + ', '
								              + conn.connection.escape(date2) + ', '
								              + conn.connection.escape(type) + ')';					        
			//} else if (action == 'savelocation') {
			let	sql2 = 'INSERT INTO inventorylocation (invID, customSku, indivQty, cartonQty, bay, type) VALUES (' 
				                              + id + ', '
								              + conn.connection.escape(customSku) + ', '
								              + indivQty + ', '
								              + cartonQty + ', '
								              + conn.connection.escape(bay) + ', '
								              + conn.connection.escape(type) + ')';
			//}
			await conn.query(sql);
			await conn.query(sql1);
			await conn.query(sql2);
			let inventorys = await conn.query('SELECT * FROM stockinventory WHERE id = ' + id);
			let inv = inventorys[0];
			inv['locations'] = await conn.query('SELECT * FROM inventorylocation WHERE invID=' + inv.id);
			output.result = 'success';
			output.data = inv;
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

module.exports = updateInventory;