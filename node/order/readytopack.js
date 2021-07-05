
//  Discount Chemist
//  Order System

// Set multiple orders as ready to be packed in the database
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
const moment = require('moment-timezone');

const readytopack = async function(req, res, next) {
	var conn = new Database(dbconn);
	var records = req.body.records; // Contains a list of [store, database ID, order type]
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

			try {
				records = JSON.parse(records);
			} catch (e) {
				records = null;
			}

			if (!records) {
				output.result = 'Record details are empty or not valid.';
				break;
			}


			await conn.connect();
			let user = await userCheckToken(token, true);

			// Prepare record data
			let recordsMS = [];
			for (let record of records) {
				let entry = [];
				for (let value of record) {
					entry.push(value);
				}
				recordsMS.push(entry);
			}

			// Set the rows in the collecting table as ready to packing and set the packing ID
			let lastPackingID = (await conn.query('SELECT MAX(packingID) AS lastPackingID FROM collecting'))[0].lastPackingID;

			let transactionResult = await conn.transaction(async function() {
				var errorOccurred = false;
				for (let i = 0; i < recordsMS.length; i++) {
					let result;
					if (recordsMS[i][0] == '81' || recordsMS[i][0] == '82') {
						result = await conn.query('UPDATE collecting SET status = 3, morelabel = 0, packingID = '+(++lastPackingID)+' WHERE orderID = '+recordsMS[i][1]+';')
						.catch(err => {
							errorOccurred = true;
						});
						//log status 3 (Packed)
						await conn.query('INSERT INTO translogs(orderId, field, oldValue, newValue, actionBy, actionTime) VALUES ('
											+ conn.connection.escape(recordsMS[i][1]) + ','
											+ conn.connection.escape('status') + ','
											+ conn.connection.escape(recordsMS[i][3]) + ','
											+ conn.connection.escape('Packed') + ','
											+ conn.connection.escape(user.username) + ','
											+ conn.connection.escape(date2) + ')');
					} else {
						result = await conn.query('UPDATE collecting SET status = 10, morelabel = 0, packingID = '+(++lastPackingID)+' WHERE orderID = '+recordsMS[i][1]+' AND status != 10;')
						.catch(err => {
							errorOccurred = true;
						});
						//log status 10 (Ready to pack)
						await conn.query('INSERT INTO translogs(orderId, field, oldValue, newValue, actionBy, actionTime) VALUES ('
											+ conn.connection.escape(recordsMS[i][1]) + ','
											+ conn.connection.escape('status') + ','
											+ conn.connection.escape(recordsMS[i][3]) + ','
											+ conn.connection.escape('Ready to pack') + ','
											+ conn.connection.escape(user.username) + ','
											+ conn.connection.escape(date2) + ')');
					}

					if (!result.changedRows) {
						// Order was not updated so decrement the last packing ID 
						lastPackingID--;
					}

					if (errorOccurred) {
						httpStatus = 503;
						output.result = 'Could not update entries in the collecting table.';
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
		output.result = e;
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = readytopack;
