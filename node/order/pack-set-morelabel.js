const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData} = require('./order-convert');

const setMorelabel = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();
	var dbid = req.body.dbid;
	var morelabel = req.body.morelabel;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (method == 'post') {

				await conn.connect();
				let dbids  = dbid.split(', ');
				let idSQL = [];
				for (let db of dbids) {
					idSQL.push('orderID='+db)
				}
				 
				let result = await conn.query('UPDATE collecting SET morelabel = ' + morelabel + '  WHERE '+ idSQL.join(' OR '));

				if (result.affectedRows > 0) {
					httpStatus = 200;
					output.result = 'success';
				} else {
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

module.exports = setMorelabel;