const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const removeBayStockInventory = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();
	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	
	var invID = req.body.invID;
	//var locations = JSON.parse(req.body.locations);
	var loc = JSON.parse(req.body.location);

	var reason = req.body.reason;

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
			/*for (let location of locations) {

				let id = location.id;

					await conn.query('DELETE FROM inventorylocation WHERE invID = ' + invID  + ' and id = ' + id);				
			}*/
				
			if(loc.id != undefined) {
			await conn.query('DELETE FROM inventorylocation WHERE invID = ' + invID  + ' and id = ' + loc.id);

			if (reason && reason != undefined) {
				await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType, reason) VALUES (' 
						                              + invID + ', '
						                              + conn.connection.escape(loc.bay) + ', '
						                              + loc.indivQty + ', "", '+null+", '"					      
						                              + date2 + "', "
						                              + conn.connection.escape(user.username) + ', '
										              + "'Delete','4', "+null+ ','+conn.connection.escape(reason) + ')');
				
			} else {
				await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
						                              + invID + ', '
						                              + conn.connection.escape(loc.bay) + ', '
						                              + loc.indivQty + ', "", '+null+", '"					      
						                              + date2 + "', "
						                              + conn.connection.escape(user.username) + ', '
										              + "'Delete','4', "+null+')');
				}
			}

			/*let sqlSET;
			if (loc.type == 'B2B' || loc.type == '-') {
				sqlSET = 'indivQty = indivQty - ' + loc.indivQty + ', cartonQty = cartonQty - '+ loc.cartonQty;
			} else if (loc.type == 'B2C') {
				sqlSET = '3PLIndivQty = 3PLIndivQty - ' + loc.indivQty + ', 3PLCartonQty = 3PLCartonQty - '+ loc.cartonQty;
			}
			let sql = 'UPDATE stockinventory SET ' + sqlSET + ' WHERE id = ' + invID;	
			await conn.query(sql);*/
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

module.exports = removeBayStockInventory;