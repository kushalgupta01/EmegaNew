const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData} = require('./order-convert');

const markFlatpack = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (method == 'post') {
				let itemNo = req.body.itemNo || null;

				var sql = 'UPDATE items SET flatpack = 1 WHERE itemNo = '+ itemNo;
				
				await conn.connect();
			
				let result = conn.query(sql);
				
				if (result) {
					output.result = 'success';
					httpStatus = 200;
				}else{
					output.result = 'failed';
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
	}
	if (conn.connected) conn.release();

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = markFlatpack;