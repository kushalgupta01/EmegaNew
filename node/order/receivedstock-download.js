const {Config} = require('./config');
const Database = require('./connection');


const downloadreceivedstock = async function(req, res, next) {
	conn = new Database(dbconn);

	var supplier = req.params.supplier || null;

	var output = {result: null};
	var httpStatus = 400;

	do {
		/*if (!store || (store != 'all' && !Config.STORES.hasOwnProperty(store) && store != 30)) {
			output.result = 'Invalid store.';
			break;
		}*/
		
		try{
			await conn.connect();
			let sql = 'SELECT * FROM stockreceived WHERE supplier = ' + conn.connection.escape(supplier);
			
			let result = await conn.query(sql);
			//console.log(result);
			if (result.length == 0) {
				output.result = 'No stock found';
				httpStatus = 404;
			} else if (result.length > 0) {
				output.result = 'success';
				output.data = result;
				httpStatus = 404;
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




module.exports = downloadreceivedstock;