const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const updateStockInventoryLocation = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	
	var invID = req.body.invID;
	var customSku = req.body.customSku;
	var locations = JSON.parse(req.body.locations);
	var poNumber = req.body.poNumber;
	var receivedLocQty = req.body.receivedLocQty ? JSON.parse(req.body.receivedLocQty) : req.body.receivedLocQty;
	var poNo = req.body.poNo;

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
			await conn.connect();
			let user = await userCheckToken(token, true);
			// let result = await conn.query('select 1 from inventorylocation WHERE invID = ' + invID);
			
			for (let location of locations) {

				let id = location.id;
				let indivQty = location.indivQty;
				let bay = location.bay;
				let type = location.type;
				//console.log(invID);
				//console.log(indivQty);
				//console.log(bay);

				if(id != undefined && id != 'undefined') {
					var check = await conn.query('SELECT * from inventorylocation WHERE id = ' + id);
					let oldQty = check[0].indivQty;
					if (oldQty != indivQty){
						await conn.query('UPDATE inventorylocation SET indivQty = ' + indivQty
						//await conn.query('UPDATE inventorylocation SET indivQty = indivQty + ' + indivQty
													  + ', bay = ' + conn.connection.escape(bay)
													  + ', type = ' + conn.connection.escape(type)
													  + ' WHERE invID = ' + invID  + ' and id = ' + id);
						await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
							                              + invID + ', '
							                              + conn.connection.escape(poNumber) + ', '
							                              + oldQty + ', '
							                              + conn.connection.escape(bay) + ', '
							                              + indivQty + ", '" 
							                              + date2 + "', "
							                              + conn.connection.escape(user.username) + ', '
											              + "'PO', " 
											              + null + ', '
											              + null +')');
					}
				}			
				else {
					var checkLoc = await conn.query('SELECT * from inventorylocation WHERE invID='+invID+' and bay='+conn.connection.escape(bay));
					if (checkLoc.length == 0){
						await conn.query('INSERT INTO inventorylocation (invID, customSku, indivQty, bay, type) VALUES (' 
							                              + invID + ', '
											              + conn.connection.escape(customSku) + ', '
											              + indivQty + ', '
											              + conn.connection.escape(bay) + ', '
											              + conn.connection.escape(type) +')');
						await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
						                              + invID + ', '
						                              + conn.connection.escape(poNumber) + ', '
						                              + null + ', '
						                              + conn.connection.escape(bay) + ', '
						                              + indivQty + ", '" 
						                              + date2 + "', "
						                              + conn.connection.escape(user.username) + ', '
										              + "'PO', " 
										              + null + ', '
										              + null +')');
					}
					else if (checkLoc.length == 1){
						let oldQty = checkLoc[0].indivQty;
						let newQty = parseInt(oldQty) + parseInt(indivQty);
						await conn.query('UPDATE inventorylocation SET indivQty=indivQty+'+indivQty+' WHERE invID='+invID+' and bay='+conn.connection.escape(bay));
						await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
						                              + invID + ', '
						                              + conn.connection.escape(poNumber) + ', '
						                              + oldQty + ', '
						                              + conn.connection.escape(bay) + ', '
						                              + newQty + ", '" 
						                              + date2 + "', "
						                              + conn.connection.escape(user.username) + ', '
										              + "'PO', " 
										              + null + ', '
										              + null +')');
					}
				}			
			}

			if (receivedLocQty) {
				let oldReceivedLocQty = await conn.query('SELECT receivedLocQty FROM receivingitems WHERE invID = ' + invID + ' and poNo = ' + conn.connection.escape(poNo));
				// console.log(JSON.parse(oldReceivedLocQty[0].receivedLocQty).concat(receivedLocQty));
				if (oldReceivedLocQty[0].receivedLocQty) {
					await conn.query('UPDATE receivingitems SET receivedLocQty = ' + conn.connection.escape(JSON.stringify(JSON.parse(oldReceivedLocQty[0].receivedLocQty).concat(receivedLocQty))) + ' WHERE invID = ' + invID + ' and poNo = ' + conn.connection.escape(poNo));
				} else {
					await conn.query('UPDATE receivingitems SET receivedLocQty = ' + conn.connection.escape(JSON.stringify(receivedLocQty)) + ' WHERE invID = ' + invID + ' and poNo = ' + conn.connection.escape(poNo));
				}
			}


			let inventorys = await conn.query('SELECT * FROM stockinventory WHERE id = ' + invID);
			let inv = inventorys[0];
			inv['locations'] = await conn.query('SELECT * FROM inventorylocation WHERE invID=' + invID);
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

module.exports = updateStockInventoryLocation;