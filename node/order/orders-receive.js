//  Discount Chemist
//  Order System

const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const receiveOrders = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	let date = new Date();
	let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY-MM-DD HH:mm:ss');

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

			if (method == 'post') {
				// var store = req.body.store;
				var poNo = req.body.poNo;
				var supplierName = req.body.supplierName;
				var itemLocations = req.body.itemLocations;
				var itemLocationsSaving = req.body.itemLocationsSaving;
				var createdDate = req.body.createdDate;
				var createdBy = req.body.createdBy;
				var deliveryNotes = req.body.deliveryNotes;
				var store = req.body.store;
				var type = req.body.type;
				// var invID = req.body.invID;
				var pageType = req.body.pageType;
				var iteminvIDQty = req.body.iteminvIDQty;
				var itemBayQtys = req.body.itemBayQtys;

			}
			await conn.connect();
			let user = await userCheckToken(token, true);
			
			if (itemLocations) {
				itemLocations = JSON.parse(itemLocations);
				for (let itemLocation of itemLocations) {
					await conn.query('INSERT INTO purchaseorder (invID, poNo, supplierName, bay, indivQty, createdDate, createdBy, deliveryNotes, store, type) values ('
						+ conn.connection.escape(itemLocation[0]) + ', '+ conn.connection.escape(poNo) + ','
						+ conn.connection.escape(supplierName) + ',' + conn.connection.escape(itemLocation[1]) + ','
						+ conn.connection.escape(itemLocation[2]) + ', ' + conn.connection.escape(date2) + ', ' 
						+ conn.connection.escape(createdBy) + ', ' + conn.connection.escape(deliveryNotes) + ', '
						+ conn.connection.escape(store) +', ' + conn.connection.escape(type) + ')');
				}
				if (itemLocationsSaving) { 
					itemLocationsSaving = JSON.parse(itemLocationsSaving);
					for (let itemLocationSaving of itemLocationsSaving){
						//console.log(itemLocationSaving);//id,invID,bay,sku,indivQty
						if (itemLocationSaving.id != 'undefined' && itemLocationSaving.hasOwnProperty('id') == true){
							var check = await conn.query('SELECT * from inventorylocation WHERE id = ' + itemLocationSaving.id);
							let oldQty = check[0].indivQty;
							let newQty = parseInt(oldQty) + parseInt(itemLocationSaving.indivQty);
							await conn.query('UPDATE inventorylocation SET indivQty=indivQty+'+itemLocationSaving.indivQty+' WHERE id='+itemLocationSaving.id);
							await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
						                              + itemLocationSaving.invID + ', '
						                              + conn.connection.escape(poNo) + ', '
						                              + oldQty + ', '
						                              + conn.connection.escape(itemLocationSaving.bay) + ', '
						                              + newQty + ", '" 
						                              + date2 + "', "
						                              + conn.connection.escape(user.username) + ', '
										              + "'PO', " 
										              + null + ', '
										              + null +')');
						}
						else{
							var checkLoc = await conn.query('SELECT * from inventorylocation WHERE invID='+itemLocationSaving.invID+' and bay='+conn.connection.escape(itemLocationSaving.bay));
							if (checkLoc.length == 0){
								await conn.query('INSERT INTO inventorylocation (invID, customSku, indivQty, cartonQty, bay, type) VALUES ('+itemLocationSaving.invID+','+conn.connection.escape(itemLocationSaving.sku)+','+itemLocationSaving.indivQty+','+0+','+conn.connection.escape(itemLocationSaving.bay)+','+null+')');
								await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
						                              + itemLocationSaving.invID + ', '
						                              + conn.connection.escape(poNo) + ', '
						                              + null + ', '
						                              + conn.connection.escape(itemLocationSaving.bay) + ', '
						                              + itemLocationSaving.indivQty + ", '" 
						                              + date2 + "', "
						                              + conn.connection.escape(user.username) + ', '
										              + "'PO', " 
										              + null + ', '
										              + null +')');
							}
							else if (checkLoc.length == 1){
								let oldQty = checkLoc[0].indivQty;
								let newQty = parseInt(oldQty) + parseInt(itemLocationSaving.indivQty);
								await conn.query('UPDATE inventorylocation SET indivQty=indivQty+'+itemLocationSaving.indivQty+' WHERE invID='+itemLocationSaving.invID+' and bay='+conn.connection.escape(itemLocationSaving.bay));
								await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
						                              + itemLocationSaving.invID + ', '
						                              + conn.connection.escape(poNo) + ', '
						                              + oldQty + ', '
						                              + conn.connection.escape(itemLocationSaving.bay) + ', '
						                              + newQty + ", '" 
						                              + date2 + "', "
						                              + conn.connection.escape(user.username) + ', '
										              + "'PO', " 
										              + null + ', '
										              + null +')');
							}
						}
					}
				}

			}

			// if (pageType = 'Receive Stock') 
			if (iteminvIDQty) {
				iteminvIDQty = JSON.parse(iteminvIDQty);
				//console.log(iteminvIDQty);
				let received = 0;
				for (let invid of iteminvIDQty) {
					await conn.query('INSERT INTO receivingitems (invID, poNo, supplierName, orderedQty, createdDate, createdBy, deliveryNotes, store, type, received) values ('
						+ conn.connection.escape(invid[0]) + ', '+ conn.connection.escape(poNo) + ','
						+ conn.connection.escape(supplierName) + ', ' + conn.connection.escape(invid[1]) + ', '
						+ conn.connection.escape(date2) + ', ' + conn.connection.escape(createdBy) + ', '
						+ conn.connection.escape(deliveryNotes) + ', ' + conn.connection.escape(store) +', ' 
						+ conn.connection.escape(type) + ', ' + conn.connection.escape(received) +')');
				}
					
			}

			if (itemBayQtys) {
				itemBayQtys = JSON.parse(itemBayQtys);
				for (let itembq of itemBayQtys) {
					await conn.query('INSERT INTO purchaseorder (invID, poNo, supplierName, bay, indivQty, createdDate, createdBy, store, orderedQty) values ('
						+ conn.connection.escape(itembq[0]) + ', '+ conn.connection.escape(poNo) + ','
						+ conn.connection.escape(supplierName) + ',' + conn.connection.escape(itembq[1]) + ','
						+ conn.connection.escape(itembq[2]) + ', ' + conn.connection.escape(date2) + ', ' 
						+ conn.connection.escape(createdBy) + ', ' +  conn.connection.escape(itembq[3]) +', '
						 + conn.connection.escape(itembq[4]) + ')');

					
				}
			}

			if (pageType == 'Purchase Order') {
				await conn.query('UPDATE receivingitems	set received = 1 WHERE poNo = '+ conn.connection.escape(poNo));
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

/*function dateToSql2() {
	let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    let localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
	return localISOTime.replace('T', ' ').replace('Z', '').slice(0, -4);
}

function dateToSql() {
	return (new Date()).toISOString().replace('T', ' ').replace('Z', '').slice(0, -4);
}*/

module.exports = receiveOrders;