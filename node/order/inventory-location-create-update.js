const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const updateBayStockInventory = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();
 
	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	var locations = JSON.parse(req.body.inventorylocation);
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
				let invID = location.invID;
				let store = location.store;
				let sku = location.sku;
				let indivQty = location.indivQty;
				let cartonQty = location.cartonQty;
				let bay = location.bay;
				let oldType = null;
				let type = null;

				if(id != undefined) {
					var oldvalues = await conn.query('SELECT il.*,lt.type FROM `inventorylocation` il LEFT JOIN locationstype lt ON il.bay=lt.bay WHERE il.id='+id);
					let oldBay = oldvalues[0].bay;
					let oldQty = oldvalues[0].indivQty;
					await conn.query('UPDATE inventorylocation SET indivQty = ' + indivQty
												  + ', bay = ' + conn.connection.escape(bay)
												  + ' WHERE invID = ' + invID  + ' and id = ' + id);
					let actionType='Update';
					if (store != 8 && typeof store !== 'undefined') {actionType='ReceiveStock';};
					if (actionType == 'ReceiveStock'){indivQty = parseInt(indivQty) - parseInt(oldQty);}
					if (oldBay !== bay || indivQty !== oldQty){
					await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
					                              + invID + ', '
					                              + conn.connection.escape(oldBay) + ', '
					                              + oldQty + ', '
					                              + conn.connection.escape(bay) + ', '
					                              + indivQty + ", '" 
					                              + date2 + "', "
					                              + conn.connection.escape(user.username) + ', '
									              + "'"+actionType+ "', "
									              + oldType + ', '
									              + type +')');
					};
				}
				else {
					await conn.query('INSERT INTO inventorylocation (invID, customSku, indivQty, bay) VALUES (' 
					                              + invID + ', '
									              + conn.connection.escape(sku) + ', '
									              + indivQty + ', '
									              + conn.connection.escape(bay) + ')');
					if (store == 8){
						await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
					                              + invID + ', "",'+null+', '
					                              + conn.connection.escape(bay) + ', '
					                              + indivQty + ", '" 
					                              + date2 + "', "
					                              + conn.connection.escape(user.username) + ', '
									              + "'New',"+null+", "
									              + type +')');
					}
					else {
						await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
					                              + invID + ', "",'+null+', '
					                              + conn.connection.escape(bay) + ', '
					                              + indivQty + ", '" 
					                              + date2 + "', "
					                              + conn.connection.escape(user.username) + ', '
									              + "'ReceiveStock',"+null+", "
									              + type +')');
					}
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

module.exports = updateBayStockInventory;