const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
// const moment = require('moment-timezone');

const saveLocationSelected = async function(req, res, next) {
	var conn = new Database(dbconn);
	var orderID = req.body.orderID;
	var locationselected = req.body.locationselected;
	var locationNotes = req.body.locationNotes;
	var singlelocationselected = req.body.singlelocationselected;
	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var saveAdminUsername = !req.body.dontsaveadmin;

	var output = {result: null};
	var httpStatus = 400;
	var allLocations;

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

			if (locationselected != undefined) {
				sqlSetData.push('locationselected = '+ conn.connection.escape(locationselected));
			}
			
			if (singlelocationselected != undefined) {
				singlelocationselected = JSON.parse(singlelocationselected);
				let oldlocationSelected = await conn.query('SELECT locationselected FROM collecting WHERE orderID = '+orderID);
				//console.log(oldlocationSelected);
				oldlocationSelected = oldlocationSelected[0].locationselected ? JSON.parse(oldlocationSelected[0].locationselected) : {};
				for (let locSelected in singlelocationselected) {
						oldlocationSelected[locSelected] = singlelocationselected[locSelected];
				}
				allLocations = JSON.stringify(oldlocationSelected);
				sqlSetData.push('locationselected = '+ conn.connection.escape(JSON.stringify(oldlocationSelected)));
			}

			if (locationNotes != undefined) {
				locationNotes = JSON.parse(locationNotes);
				let oldlocationNotes = await conn.query('SELECT locationNotes FROM collecting WHERE orderID = '+conn.connection.escape(orderID));
				//console.log(oldlocationNotes);
				oldlocationNotes = oldlocationNotes[0].locationNotes ? JSON.parse(oldlocationNotes[0].locationNotes) : {};
				for (let locationNote in locationNotes) {
					/*if (oldlocationNotes.hasOwnProperty(locationNote)) {
						oldlocationNotes[locationNote] = oldlocationNotes[locationNote].concat(locationNotes[locationNote]);
					} else {*/
						oldlocationNotes[locationNote] = locationNotes[locationNote];
					// }
				}
					sqlSetData.push('locationNotes = '+ conn.connection.escape(JSON.stringify(oldlocationNotes)));	
			}

			let whereSQL = [];

			whereSQL.push('orderID='+conn.connection.escape(orderID));

			// console.log(sqlSetData);
			let result = await conn.query('UPDATE collecting SET '+sqlSetData.join(',')+' WHERE '+whereSQL.join(' OR '));

			if (result.affectedRows > 0) {
				httpStatus = 200;
				output.allLocations = allLocations;
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

module.exports = saveLocationSelected;