//  Discount Chemist
//  Order System


const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const loadStockBayBulk = async function(req, res, next) {
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
			if (type == 3){
				var sql = 'SELECT bay FROM locationstype WHERE type=3 ORDER BY `locationstype`.`bay` ASC';
			}
			else if (type == 4){
				var sql = "SELECT bay FROM (SELECT bay, LEAST(IF(LOCATE(0, bay)=0,999,LOCATE(0, bay)), IF(LOCATE(1, bay)=0,999,LOCATE(1, bay)), IF(LOCATE(2, bay)=0,999,LOCATE(2, bay)), IF(LOCATE(3, bay)=0,999,LOCATE(3, bay)), IF(LOCATE(4, bay)=0,999,LOCATE(4, bay)), IF(LOCATE(5, bay)=0,999,LOCATE(5, bay)), IF(LOCATE(6, bay)=0,999,LOCATE(6, bay)), IF(LOCATE(7, bay)=0,999,LOCATE(7, bay)), IF(LOCATE(8, bay)=0,999,LOCATE(8, bay)), IF(LOCATE(9, bay)=0,999,LOCATE(9, bay))) lv FROM inventorylocation WHERE bay LIKE 'EMG-%' GROUP BY bay) t ORDER BY SUBSTRING(bay,1,lv-1) ASC, SUBSTRING(bay,lv)+0 ASC ";
			}
			else if (type == 7){
				//var sql = "SELECT bay FROM (SELECT bay, LEAST(IF(LOCATE(0, bay)=0,999,LOCATE(0, bay)), IF(LOCATE(1, bay)=0,999,LOCATE(1, bay)), IF(LOCATE(2, bay)=0,999,LOCATE(2, bay)), IF(LOCATE(3, bay)=0,999,LOCATE(3, bay)), IF(LOCATE(4, bay)=0,999,LOCATE(4, bay)), IF(LOCATE(5, bay)=0,999,LOCATE(5, bay)), IF(LOCATE(6, bay)=0,999,LOCATE(6, bay)), IF(LOCATE(7, bay)=0,999,LOCATE(7, bay)), IF(LOCATE(8, bay)=0,999,LOCATE(8, bay)), IF(LOCATE(9, bay)=0,999,LOCATE(9, bay))) lv FROM inventorylocation WHERE bay LIKE 'RS-%' GROUP BY bay) t ORDER BY SUBSTRING(bay,1,lv-1) ASC, SUBSTRING(bay,lv)+0 ASC ";
				var sql = "SELECT bay FROM inventorylocation WHERE bay LIKE 'RS-%' GROUP BY bay ORDER BY LENGTH(bay), bay"
			}
			else if (type == 5){
				var sql = 'SELECT si.brand as bay FROM inventorylocation il LEFT JOIN stockinventory si ON il.invID=si.id WHERE si.brand is not null GROUP BY si.brand ORDER BY `bay` ASC ';
			}
			else if (type == 6){
				var sql = '(SELECT bay FROM (SELECT bay,sum(`indivQty`) as total FROM `inventorylocation` GROUP BY bay) as first WHERE first.total = 0) UNION (SELECT lt.bay as bay FROM locationstype lt LEFT JOIN inventorylocation il ON lt.bay=il.bay WHERE il.bay IS NULL) ORDER BY `bay` ASC';
			}
			else{
			var sql = 'SELECT bay FROM (SELECT nvs.id,nvs.invID,nvs.customSku,nvs.indivQty,nvs.cartonQty,nvs.bay,mw.type FROM (SELECT * FROM inventorylocation) AS nvs LEFT JOIN locationstype mw ON mw.bay = nvs.bay) as c WHERE c.type='+type+' GROUP BY bay ORDER BY bay;';
			}
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

module.exports = loadStockBayBulk;