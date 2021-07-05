const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
// const moment = require('moment-timezone');

const saveLocationSorted = async function(req, res, next) {
	var conn = new Database(dbconn);
	var orderID = req.body.orderID;
	var lineItemID = req.body.lineItemID;
	var sorted = req.body.sorted;
	
	// var locationSave = req.body.locationSave;
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

			await conn.connect();
			
			// let result = await conn.query('UPDATE collecting SET locationselected = '+conn.connection.escape(locationselected)+' OR locationNotes = '+conn.connection.escape(locationNotes)+' WHERE orderID = '+orderID);
			let sqlSetData = [];

			let oldlocationNotes = await conn.query('SELECT locationNotes FROM collecting WHERE orderID = '+conn.connection.escape(orderID));

			oldlocationNotes = oldlocationNotes[0].locationNotes ? JSON.parse(oldlocationNotes[0].locationNotes) : {};

			oldlocationNotes[lineItemID][0].sorted = sorted
			

			sqlSetData.push('locationNotes = '+ conn.connection.escape(JSON.stringify(oldlocationNotes)));		
			

			// if (locationSave != undefined) {			
			// 		sqlSetData.push('locationSave = '+ conn.connection.escape(locationSave));				
			// }

			let whereSQL = [];

			whereSQL.push('orderID='+conn.connection.escape(orderID));
			// console.log(sqlSetData);
			let result = await conn.query('UPDATE collecting SET '+sqlSetData.join(',')+' WHERE '+whereSQL.join(' OR '));

			if (result.affectedRows > 0) {
				console.log(result);
				httpStatus = 200;
				output.allLocations = result;
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

module.exports = saveLocationSorted;