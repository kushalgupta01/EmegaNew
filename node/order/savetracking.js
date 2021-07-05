
//  Discount Chemist
//  Order System

// Save tracking data to the database 
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const savetracking = async function(req, res, next) {
	var conn = new Database(dbconn);
	var trackingData = req.body.tdata;
	var token = req.header(Config.ACCESS_TOKEN_HEADER);

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

			try {
				trackingData = JSON.parse(trackingData);
			} catch (e) {
				trackingData = null;
			}


			if (!trackingData) {
				output.result = 'Tracking data is not valid.';
				break;
			}

			await conn.connect();

			// Get existing tracking data
			let trackingIDData = await conn.query('SELECT orderID, trackingID FROM collecting WHERE orderID IN ('+Object.keys(trackingData).map(x => conn.connection.escape(x)).join(',')+');');
			let trackingIDs = {};

			try {
				for (let row of trackingIDData) {
					trackingIDs[row.orderID] = JSON.parse(row.trackingID);
				}
			}
			catch (e) {
				httpStatus = 500;
				output.result = 'Invalid tracking data is present in the database for the given orders.';
				break;
			}

			// Save the tracking numbers to the database
			var transactionResult = await conn.transaction(async function() {
				var errorOccurred = false;

				for (let id in trackingData) {
					// Prepare the new tracking data
					let currentTrackingID = trackingData[id].trim();
					let trackingDataNew = [];
					if (trackingIDs[id]) {
						for (let tid of trackingIDs[id]) {
							if (tid != currentTrackingID) {
								trackingDataNew.push(tid);
							}
						}
					}
					trackingDataNew.push(currentTrackingID);

					// Save the tracking numbers
					await conn.query('UPDATE collecting SET trackingID = '+conn.connection.escape(JSON.stringify(trackingDataNew))+' WHERE orderID = '+conn.connection.escape(id)+';')
					.catch(err => {
						errorOccurred = true;
					});

					if (errorOccurred) {
						httpStatus = 503;
						output.result = 'Could not save tracking data into the database.';
						conn.rollback(errorOccurred);
						return false;
					}
				}

				var commitResult = await conn.commit();
				if (!commitResult) {
					httpStatus = 503;
					output.result = 'Could not commit transaction.';
					return false;
				}
				return true;
			});
	
			if (transactionResult) {
				httpStatus = 200;
				output.result = 'success';
			}
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = JSON.stringify(e);
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = savetracking;
