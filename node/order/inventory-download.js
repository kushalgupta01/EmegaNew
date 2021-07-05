const {Config} = require('./config');
const Database = require('./connection');


const downloadInventory = async function(req, res, next) {
	conn = new Database(dbconn);

	var type = req.params.type || null;

	var output = {result: null};
	var httpStatus = 400;

	do {
		if (!type) {
			output.result = 'Invalid type.';
			break;
		}
		
		try{
			await conn.connect();

			let sql;
			if (type=='hobbycob2b') {
				sql = 'SELECT * FROM stockinventory WHERE store = 8 AND (indivQty>0 OR cartonQty>0)';
			} else if (type=='hobbycob2c') {
				sql = 'SELECT * FROM stockinventory WHERE store = 8 AND (3PLIndivQty>0 OR 3PLCartonQty>0)';
			} else if (type=='hobbycoall') {
				sql = 'SELECT * FROM stockinventory WHERE store = 8';
			}
			 
			
			let result = await conn.query(sql);
			//console.log(result);
			if (result.length == 0) {
				output.result = 'No inventory found';
				httpStatus = 404;
			} else if (result.length > 0) {
				output.result = 'success';
				output.data = result;
				httpStatus = 200;
			}
	
		}catch (e) {
			// Error
			httpStatus = 503;
			output.result = e;
			console.log(e);
		}
	} while(0);

	if (conn.connected) conn.release();


	// Output
	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}




module.exports = downloadInventory;