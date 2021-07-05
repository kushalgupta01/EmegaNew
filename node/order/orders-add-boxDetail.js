const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData} = require('./order-convert');

const addBoxDetails = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();
	var dbid = req.body.dbid;

	var boxDetails = JSON.parse(req.body.boxDetails)

	var output = {result: null};
	var httpStatus = 400;
	try {
		do {
			if (method == 'post') {

				await conn.connect();

				if (boxDetails != null) {
					let oldBoxDetailsResult = await conn.query('SELECT boxDetails from collecting WHERE orderID=' + conn.connection.escape(dbid));
					let oldBoxDetails = JSON.parse(oldBoxDetailsResult[0].boxDetails);
					if (oldBoxDetails==null) {
						oldBoxDetails = [];
					}					

					// boxDetails = boxDetails.map(b => ['BoxNo: ' + b[0] + ' , ' + 'Weight: ' + b[1] + 'kg']);
					 // boxDetails = boxDetails.map(b => [b[0] + ' , ' + b[1]]);

					// boxDetails = oldBoxDetails.concat(boxDetails);
					for (let boxDetail of boxDetails) {
						if (checkIncludes(oldBoxDetails,boxDetail)) continue;
						oldBoxDetails.push(boxDetail);
					}					
												 
					let result = await conn.query('UPDATE collecting SET boxDetails = ' + conn.connection.escape(JSON.stringify(oldBoxDetails)) + '  WHERE orderID=' + conn.connection.escape(dbid));

					if (result.affectedRows > 0) {
						httpStatus = 200;
						output.result = 'success';
						output.boxDetails = oldBoxDetails;
					} else {
						output.result = 'failed';
					}	
				}
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

function checkIncludes(oldBoxDetails,boxDetail) {
	let isIncludes = false;
	for (let oldBoxDetail of oldBoxDetails) {
		if (oldBoxDetail[0]==boxDetail[0] && oldBoxDetail[1]==boxDetail[1]) {
			isIncludes = true;
			break;
		}
	}
	return isIncludes;
}

module.exports = addBoxDetails;