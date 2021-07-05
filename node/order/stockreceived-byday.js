const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const stockReceivedByDay = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();
	var date = req.params.date;
	var store = (req.params.store == 'null' || req.params.store == '')? null: req.params.store;
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
			var sql;
		
			if (store != 0){
				sql = "SELECT first.invID,store,itemName,first.sku,stockreceived,IFNULL(emegaQty,0) as emegaQty FROM (SELECT store,invID,itemName,sku,sum(CASE WHEN tl.actionType = 'ReceiveStock' THEN tl.newQty END) as stockreceived FROM `transferlogs` tl LEFT JOIN stockinventory si ON tl.invID = si.id WHERE (newBay LIKE 'emg-%' or newBay LIKE 'RS-%') AND actionTime >= '"+date+" 00:00:00' AND actionTime < '"+date+" 23:59:59' AND store = "+store+" GROUP BY si.id) as first LEFT JOIN (SELECT invID, sum(CASE WHEN bay LIKE 'EMG-%' THEN indivQty END) as emegaQty FROM inventorylocation GROUP BY invID) as second ON second.invID=first.invID where stockreceived is not NULL ORDER BY `first`.`sku` ASC ";
			}
			else{
				sql = "SELECT first.invID,store,itemName,first.sku,stockreceived,IFNULL(emegaQty,0) as emegaQty FROM (SELECT store,invID,itemName,sku,(CASE WHEN tl.actionType = 'PO' THEN sum(tl.newQty - (CASE WHEN tl.oldQty is null THEN 0 WHEN tl.oldQty is NOT null THEN tl.oldQty END)) WHEN tl.actionType <> 'PO' THEN sum(tl.newQty) END) as stockreceived FROM `transferlogs` tl LEFT JOIN stockinventory si ON tl.invID = si.id WHERE newBay LIKE 'emg-%' AND oldbay NOT LIKE 'emg-%' AND actionTime >= '"+date+" 00:00:00' AND actionTime < '"+date+" 23:59:59' AND store in (8,71,81,91) GROUP BY si.id) as first LEFT JOIN (SELECT invID, sum(CASE WHEN bay LIKE 'EMG-%' THEN indivQty END) as emegaQty FROM inventorylocation GROUP BY invID) as second ON second.invID=first.invID ORDER BY `first`.`sku` ASC";
			}
			//var sql = "SELECT first.invID,store,itemName,first.sku,stockreceived,IFNULL(emegaQty,0) as emegaQty FROM (SELECT store,invID,itemName,sku,sum(tl.newQty) as stockreceived FROM `transferlogs` tl LEFT JOIN stockinventory si ON tl.invID = si.id WHERE newBay LIKE 'emg-%' AND oldbay NOT LIKE 'emg-%' AND actionTime >= '"+date+" 00:00:00' AND actionTime < '"+date+" 23:59:59' AND store in (8,71,81,91) GROUP BY si.id) as first LEFT JOIN (SELECT invID, sum(CASE WHEN bay LIKE 'EMG-%' THEN indivQty END) as emegaQty FROM inventorylocation GROUP BY invID) as second ON second.invID=first.invID ORDER BY `first`.`sku` ASC";
			//var sql = "SELECT first.invID,store,itemName,first.sku,stockreceived,IFNULL(emegaQty,0) as emegaQty FROM (SELECT store,invID,itemName,sku,sum(tl.newQty) as stockreceived FROM `transferlogs` tl LEFT JOIN stockinventory si ON tl.invID = si.id WHERE newBay LIKE 'emg-%' AND oldbay NOT LIKE 'emg-%' AND actionTime >= '"+date+" 00:00:00' AND actionTime < '"+date+" 23:59:59' AND store in (8,71,81,91) AND actionType <> 'PO' GROUP BY si.id) as first LEFT JOIN (SELECT invID, sum(CASE WHEN bay LIKE 'EMG-%' THEN indivQty END) as emegaQty FROM inventorylocation GROUP BY invID) as second ON second.invID=first.invID ORDER BY `first`.`sku` ASC";
			//var sql = "SELECT store,itemName,sku,newBay,newQty,actionTime,actionBy,actionType FROM `transferlogs` tl LEFT JOIN stockinventory si ON tl.invID = si.id WHERE (newBay LIKE 'emg-%' or newBay LIKE 'a%') AND actionTime >= '"+date+" 00:00:00' AND actionTime < '"+date+" 23:59:59' ORDER BY `tl`.`newBay` ASC ";
			await conn.connect();
			var stocks = await conn.query(sql);

			if (stocks.length==0) {
				httpStatus = 404;
				output.result = 'No records.';
				break;
			}
			var locations = {};
			for (let stock of stocks) {
				stock['locations'] = await conn.query('SELECT bay,indivQty FROM inventorylocation WHERE invID='+stock.invID+" AND bay LIKE 'EMG-%'");
				locations[stock.invID] = stock;
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

module.exports = stockReceivedByDay;