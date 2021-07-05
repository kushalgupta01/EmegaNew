const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const removeIdInventoryLocation = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();
	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	
	var id = req.body.id;
	var type = req.body.type;

	var bay = req.body.bay;
	var pageType = (req.body.pageType == 'null' || req.body.pageType == '')? null : req.body.pageType;

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
			if (pageType == 'Locations'){
				var rows = await conn.query('SELECT * FROM inventorylocation WHERE bay = ' + conn.connection.escape(bay));
				for (i=0; i< rows.length; i++) {
					let oldQty = rows[i].indivQty;
					let invID = rows[i].invID;

					await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
							                              + invID + ', '
							                              + conn.connection.escape(bay) + ', '
							                              + oldQty + ', "", '+null+", '"					      
							                              + date2 + "', "
							                              + conn.connection.escape(user.username) + ', '
											              + "'Delete',"+null+", "+null+')');
				}
				await conn.query('DELETE FROM inventorylocation WHERE bay = ' + conn.connection.escape(bay));
				await conn.query('DELETE FROM locationstype WHERE bay = ' + conn.connection.escape(bay));
			}
			else {
				if(typeof id !== "undefined"){
				var rowselected = await conn.query('SELECT * FROM inventorylocation WHERE id = ' + id);
				let oldQty = rowselected[0].indivQty;
				let invID = rowselected[0].invID;
				let bay = rowselected[0].bay;
				await conn.query('DELETE FROM inventorylocation WHERE id = ' + id);

				await conn.query('INSERT INTO transferlogs (invID, oldBay, oldQty, newBay, newQty, actionTime, actionBy, actionType, oldType, newType) VALUES (' 
						                              + invID + ', '
						                              + conn.connection.escape(bay) + ', '
						                              + oldQty + ', "", '+null+", '"					      
						                              + date2 + "', "
						                              + conn.connection.escape(user.username) + ', '
										              + "'Delete',"+type+", "+null+')');
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

module.exports = removeIdInventoryLocation;