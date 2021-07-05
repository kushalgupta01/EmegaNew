// Set multiple orders as ordered in the database
const Database = require('./connection');
const {Config} = require('./config');
const moment = require('moment-timezone');

const changeallorderstatus = async function(req, res, next) {
	var conn = new Database(dbconn);
	var records = req.body.records; 
	var method = req.method.toLowerCase();
	var orderStatus = req.body.status;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
	
			if (method == 'post') {

				await conn.connect();
				
			    let record = records.replace(']','').replace('[','').split(',');
				//let record = JSON.parse(records);
				let recordsMS = [];
				for (let reco of record) {
					recordsMS.push('orderID='+reco);
				}
				
					let result = await conn.query('UPDATE collecting SET status = 11 WHERE ' + recordsMS.join(' OR '));
					//let result = await conn.query('UPDATE collecting SET status = 11, notes = '+conn.connection.escape(notes)+' WHERE ' + recordsMS.join(' OR '));

					for (let rec of recordsMS) {
						let oldnote = await conn.query('SELECT notes FROM collecting WHERE ' + rec);
						oldnote = oldnote[0].notes;
						
						let date = new Date();
						let date2 = moment.tz(date, 'YYYY/MM/DD', 'UTC').tz('Australia/Sydney').format('YYYY/MM/DD');
						let datenotes = 'Ordered' + '- ' + date2 ;
						// console.log(datenotes);
						

						if (!oldnote) {
							notes = datenotes;
						} else {
							notes = (oldnote + '\n' + datenotes);
						}
						console.log(notes);
						let result2 = await conn.query('UPDATE collecting SET notes = '+conn.connection.escape(notes)+' WHERE ' + rec);
					}					

						if (result.affectedRows > 0) {
							httpStatus = 200;
							output.result = 'success';
						} else {
							output.result = 'failed';
						}		
				// }
			}
			else {
				output.result = 'wrong method';
			}
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

module.exports = changeallorderstatus;
