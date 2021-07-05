const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const transferUpdateLocation = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	
	var invId = req.body.invId;
	var invLocId = req.body.invLocId;
	var customSku = req.body.customSku;
	var oldType = req.body.invType;
	var oldQty = req.body.oldQty;
	var oldBay = req.body.oldBay;
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
			for (let location of locations) {

				let indivQty = location.indivQty;
				let locationName = location.locationName;
				let type = location.type;

				if( locationName == null || indivQty == null || indivQty <= 0) {
					//do not insert or update
				}			
				else {
					var results = await conn.query('SELECT COUNT(id) as resultado FROM inventorylocation WHERE invID='+invId+' AND bay='+conn.connection.escape(locationName));
					// console.log(results);
					var result = JSON.stringify(results[0].resultado);
					// console.log('customSku is: '+conn.connection.escape(customSku));
					// console.log('locationName is: '+conn.connection.escape(locationName));
					// console.log(result);
					if (result == 1){
						// console.log('ONE existed entry FOUND for item ('+customSku+') at bay: ('+locationName+')');
						await conn.query('UPDATE inventorylocation SET indivQty=indivQty+'+indivQty+' WHERE invID='+invId+' AND bay='+conn.connection.escape(locationName)/*+' AND type='+conn.connection.escape(invType)*/);
						await conn.query('UPDATE inventorylocation SET indivQty=indivQty-'+indivQty+' WHERE id='+invLocId);
						await conn.query('DELETE FROM inventorylocation WHERE id='+invLocId+' AND indivQty=0');
					}
					else {
						// console.log('did NOT find entry for item ('+customSku+') at bay: ('+locationName+')');
						await conn.query('INSERT INTO inventorylocation (invID, customSku, indivQty, cartonQty, bay) VALUES (' 
					                              + invId + ', '
									              + conn.connection.escape(customSku) + ', '
									              + indivQty + ', '
									              + '0, '
									              + conn.connection.escape(locationName) + ')');
						await conn.query('UPDATE inventorylocation SET indivQty=indivQty-'+indivQty+' WHERE id='+invLocId);
						await conn.query('DELETE FROM inventorylocation WHERE id='+invLocId+' AND indivQty=0');
					}
					let destTypeQ = await conn.query('SELECT * FROM locationstype WHERE bay='+conn.connection.escape(locationName));
					numRows = destTypeQ.length;
					if (numRows > 0) {
						var destType = destTypeQ[0].type;
					}
					if (destType != 3){
						await conn.query('INSERT INTO locationstype (bay, type) VALUES('
										+ conn.connection.escape(locationName) + ', '
										+ type + ') ON DUPLICATE KEY UPDATE type='+type);
					}
					else{
						type=3;
					}
					await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
					                              + invId + ', '
					                              + conn.connection.escape(oldBay) + ', '
					                              + oldQty + ', '
					                              + conn.connection.escape(locationName) + ', '
					                              + indivQty + ", '" 
					                              + date2 + "', "
					                              + conn.connection.escape(user.username) + ', '
									              + "'Transfer', " 
									              + oldType + ', '
									              + type +')');

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

module.exports = transferUpdateLocation;