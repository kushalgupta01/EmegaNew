const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const downloadStock = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();
	var store = (req.params.store == 'null' || req.params.store == '')? null: req.params.store;
	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	// var store = req.params.store;
	var output = {result: null};
	var httpStatus = 400;
	try {
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}
			if (store){
				var sql = "SELECT i.invID, s.store, s.itemName, s.sku, sum(i.indivQty) as emegaQty FROM inventorylocation i left join stockinventory s on i.invID=s.id where i.bay like 'EMG-%' and s.store="+store+" GROUP BY invID ORDER BY s.sku ASC ";
			}
			else {
				var sql ="SELECT i.invID, s.store, s.itemName, s.sku, sum(i.indivQty) as emegaQty FROM inventorylocation i left join stockinventory s on i.invID=s.id where i.bay like 'EMG-%' GROUP BY invID ORDER BY s.sku ASC "
			}
			//var sql = "SELECT store,itemName,sku,newBay,newQty,actionTime,actionBy,actionType FROM `transferlogs` tl LEFT JOIN stockinventory si ON tl.invID = si.id WHERE (newBay LIKE 'emg-%' or newBay LIKE 'a%') AND actionTime >= '"+date+" 00:00:00' AND actionTime < '"+date+" 23:59:59' ORDER BY `tl`.`newBay` ASC ";
			await conn.connect();
			var stocks = await conn.query(sql);
			if (stocks.length==0) {
				httpStatus = 404;
				output.result = 'No records.';
				break;
			}
			var locations = [];
			let i=0;
			for (let stock of stocks) {
				stock['locations'] = await conn.query('SELECT bay,indivQty FROM inventorylocation WHERE invID='+stock.invID+" AND bay LIKE 'EMG-%' GROUP BY bay ORDER BY SUBSTR(bay FROM 1 FOR 6), CAST(SUBSTR(bay FROM 6) AS UNSIGNED)");
				locations[i] = stock;
				i++;
			}
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

module.exports = downloadStock;