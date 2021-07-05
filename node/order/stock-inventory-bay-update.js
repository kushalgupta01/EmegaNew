const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const updateBayStockInventory = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);

	/*var id = req.body.id;
	var sku = req.body.sku;
	var indivQty = req.body.indivQty;
	var cartonQty = req.body.cartonQty;
	var bay = req.body.bay;*/
	
	var invID = req.body.invID;
	var customSku = req.body.customSku;
	var locations = JSON.parse(req.body.locations);
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
				// let cartonQty = location.cartonQty;
				let bay = location.bay;
				let type = 0;
				let reason = (location.reason == 'null' || location.reason == '')? null: location.reason;
				if (location.reason) { let reason = location.reason }
				
				if(id != undefined) {
					var oldvalues = await conn.query('SELECT il.id, il.invID, il.customSku, il.indivQty, il.bay, lt.type FROM `inventorylocation` il LEFT JOIN locationstype lt ON il.bay=lt.bay WHERE il.id='+id);
					let oldBay = oldvalues[0].bay;
					let oldQty = oldvalues[0].indivQty;
					if (typeof oldvalues[0].type == "undefined"){
						var oldType = 0;
					}
					else{
						var oldType = oldvalues[0].type;
					}
					await conn.query('UPDATE inventorylocation SET indivQty = ' + indivQty
												  + ', bay = ' + conn.connection.escape(bay)
												  + ' WHERE invID = ' + invID  + ' and id = ' + id);
					var resultados = await conn.query('SELECT COUNT(id) as resultado,type FROM locationstype WHERE bay='+conn.connection.escape(bay));
					var result = JSON.stringify(resultados[0].resultado);
					let checkpallet = bay.toUpperCase();
					if (typeof resultados[0].type === "undefined"){
						var newType = 0;
					}
					else if (checkpallet.startsWith('PALLET') == true){
						var newType = 3;
						type = 3;
					}
					else if (checkpallet.startsWith('STAGE') == true){
						var newType = 2;
						type = 2;
					}
					else {
						var newType = resultados[0].type;
					}
					if (result == 0 || result === null || result == '0'){
						await conn.query('INSERT INTO locationstype (bay,type) VALUES ('+conn.connection.escape(bay)+','+type+')');
					}
					else {
						await conn.query('UPDATE locationstype SET type='+type+' WHERE bay='+conn.connection.escape(bay));
					}
					let actionType='Transfer';
					if ( (oldBay !== bay) || (oldQty !== indivQty) || (oldType !== type) ) {
						if (oldBay == bay && oldQty == indivQty){actionType='Update'};
						if (oldBay == bay && oldQty != indivQty){

						}
						else{
						// console.log('item sku = '+customSku+' on InvLoc id = '+id+' was modified');
						await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
					                              + invID + ', '
					                              + conn.connection.escape(oldBay) + ', '
					                              + oldQty + ', '
					                              + conn.connection.escape(bay) + ', '
					                              + oldQty + ", '" 
					                              + date2 + "', "
					                              + conn.connection.escape(user.username) + ', '
									              + "'"+actionType+ "', "
									              + oldType + ', '
									              + type +')');			              
					    }
						let balance = indivQty - oldQty;
						if (balance > 0){
							//addition
							actionType='Addition';
						}
						else if (balance < 0){
							//deduction
							actionType='Deduction';
						}
						if (balance != 0){
						await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType, reason) VALUES (' 
					                              + invID + ', '
					                              + conn.connection.escape(bay) + ', '
					                              + oldQty + ', '
					                              + conn.connection.escape(bay) + ', '
					                              + balance + ", '" 
					                              + date2 + "', "
					                              + conn.connection.escape(user.username) + ', '
									              + "'"+actionType+ "', "
									              + type + ', '
									              + type + ', '
									              + conn.connection.escape(reason) +')');
						}
					}
				}			
				else {
					await conn.query('INSERT INTO inventorylocation (invID, customSku, indivQty, bay) VALUES (' 
					                              + invID + ', '
									              + conn.connection.escape(customSku) + ', '
									              + indivQty + ', '
									              + conn.connection.escape(bay) + ')'); 
					var resultados = await conn.query('SELECT COUNT(id) as resultado FROM locationstype WHERE bay='+conn.connection.escape(bay));
					var result = JSON.stringify(resultados[0].resultado);
					if (result == 0 || result === null || result == '0'){
						let checkstage = bay.toUpperCase();
						if (checkstage.startsWith('STAGE') == true){
							type = 2;
							await conn.query('INSERT INTO locationstype (bay,type) VALUES ('+conn.connection.escape(bay)+',2)');
						}
						else if (checkstage.startsWith('PALLET') == true){
							type = 3;
							await conn.query('INSERT INTO locationstype (bay,type) VALUES ('+conn.connection.escape(bay)+',3)');
						}
						else{
							if (type == 0){
								await conn.query('INSERT INTO locationstype (bay,type) VALUES ('+conn.connection.escape(bay)+',0)');
							}
							if (type == 1){
								await conn.query('INSERT INTO locationstype (bay,type) VALUES ('+conn.connection.escape(bay)+',1)');
							}
							if (type == 2){
								await conn.query('INSERT INTO locationstype (bay,type) VALUES ('+conn.connection.escape(bay)+',2)');
							}
						}
					}
					else {
						await conn.query('UPDATE locationstype SET type='+type+' WHERE bay='+conn.connection.escape(bay));
					}
					await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
					                              + invID + ', "",'+null+', '
					                              + conn.connection.escape(bay) + ', '
					                              + indivQty + ", '" 
					                              + date2 + "', "
					                              + conn.connection.escape(user.username) + ', '
									              + "'New',"+null+", "
									              + type +')');
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

module.exports = updateBayStockInventory;