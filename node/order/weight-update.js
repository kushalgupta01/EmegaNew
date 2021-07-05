const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData} = require('./order-convert');

const updateWeight = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (method == 'post') {
				try {

					let weight = req.body.weight || null;
					let itemID = req.body.itemID || null;
					
					await conn.connect();
					var sql = 'UPDATE items SET itemWeight = ' + weight + ' WHERE itemID = ' + itemID;
					//console.log(sql);
				
					var result = await conn.query(sql);
					if (result.affectedRows == 1) {
						output.result = 'success';
						httpStatus = 200;

					}else{
						output.result = 'failed';
					}
						
					
				}catch(e){
					console.log(e);
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

module.exports = updateWeight;