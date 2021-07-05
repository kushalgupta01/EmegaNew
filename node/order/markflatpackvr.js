const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData} = require('./order-convert');

const markFlatpack = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	await conn.connect();
	
	try {
		do {
			if (method == 'post') {
				let itemID = req.body.itemID || null;
				let type = req.body.type || null;
				let value = req.body.value;
				var sql = null;

				
				if (type == 'flatpack') {
					sql = 'UPDATE items SET flatpack = '+ value +' WHERE itemID = '+ itemID;
				} else if (type == 'vr') {
					sql = 'UPDATE items SET vr = '+ value +' WHERE itemID = '+ itemID;
				} else if (type == 'fastwayflatpack') {
					sql = 'UPDATE items SET fastwayflatpack = '+ value +' WHERE itemID = '+ itemID;
				} else if (type == 'factory') {
					sql = 'UPDATE items SET factory = '+ value +' WHERE itemID = '+ itemID;
				} else if (type == 'costco') {
					sql = 'UPDATE items SET costco = '+ value +' WHERE itemID = '+ itemID;
				} else if (type == 'fgb') {
					sql = 'UPDATE items SET fgb = '+ value +' WHERE itemID = '+ itemID;
				} else if (type == 'morlife') {
					sql = 'UPDATE items SET morlife = '+ value +' WHERE itemID = '+ itemID;
				}
				 
				

				if (sql == null) {
					output.result = 'wrong type';
					return;
				}

				let result = await conn.query(sql);

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

module.exports = markFlatpack;