
//  Discount Chemist
//  Order System

// Get brands from the database
const Database = require('./connection');

const loadbrands = async function(req, res, next) {
	var conn = new Database(dbconn);
	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			await conn.connect();
			var records = await conn.query('SELECT brandName FROM brands ORDER BY LENGTH(brandName) DESC, brandName');

			if (!records.length) {
				httpStatus = 404;
				output.result = 'No brands listed in the database.';
				break;
			}

			// Get the brands
			var brandList = [];
			for (let record of records) {
				brandList.push(record.brandName);
			}

			output.brands = brandList;
			output.result = 'success';
			httpStatus = 200;
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

module.exports = loadbrands;
