const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const loadLogBay = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();
	var type = req.params.type;
	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	// var store = req.params.store;
	var output = {result: null};res
	var httpStatus = 400;

	try {
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			// var sql = 'SELECT * FROM stockinventory WHERE store = ' + store;
			var sql = "(SELECT newBay FROM transferlogs WHERE newType="+type+" or newBay LIKE 'Pallet%' GROUP BY newBay) UNION (SELECT oldBay FROM transferlogs WHERE oldBay LIKE 'Pallet%' GROUP BY oldBay) ORDER BY LENGTH(newBay), `newBay`";
			//var sql = "SELECT newBay FROM transferlogs WHERE newBay LIKE 'Pallet%' GROUP BY newBay ORDER BY `transferlogs`.`newBay` ASC ";
			await conn.connect();
			var locations = await conn.query(sql);

			if (locations.length==0) {
				httpStatus = 404;
				output.result = 'Not bay found.';
				break;
			}

			// var stockData = {};
			// for (let stock of stocks) {
				// stock['locations'] = await conn.query('SELECT * FROM inventorylocation WHERE invID=' + stock.id);
				// stockData[stock.id] = stock;		
			output.locations = locations;
			output.result = 'success';
			httpStatus = 200;
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

module.exports = loadLogBay;