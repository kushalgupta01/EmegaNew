const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const loadLogBayDetails = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var bay = req.params.bay;

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
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

			await conn.connect();
			var sql = "SELECT invID as id,store,itemName,sku, invID, max(actionTime) as actionTime, actionBy, COALESCE(sum(CASE WHEN `actionType`='New' or `actionType`='Transfer' or `actionType`='Addition' THEN newQty END),0) as TotalAdded FROM `transferlogs` tl LEFT JOIN stockinventory si ON tl.invID = si.id WHERE newBay='"+bay+"' GROUP BY invID ORDER BY tl.invID ASC ";	
			var sql2 = "SELECT invID as id,store,itemName,sku, invID, SUM(TotalRemoved) TotalRemoved, actionBy,max(actionTime) as actionTime FROM ( (SELECT * FROM (SELECT si.store, si.itemName, si.sku, tl.invID,sum(CASE WHEN `actionType`='Deduction' THEN abs(newQty) END) as TotalRemoved, tl.actionBy, tl.actionTime FROM `transferlogs` tl LEFT JOIN stockinventory si ON tl.invID = si.id WHERE newBay='"+bay+"' GROUP BY invID) as res WHERE res.TotalRemoved is NOT null) UNION ALL (SELECT * FROM (SELECT si.store, si.itemName, si.sku, tl.invID, sum(CASE WHEN `actionType`='Transfer' THEN newQty WHEN actionType='Delete' THEN oldQty END) as TotalRemoved, tl.actionBy, tl.actionTime FROM `transferlogs` tl LEFT JOIN stockinventory si ON tl.invID = si.id WHERE oldBay='"+bay+"' GROUP BY invID) as res WHERE res.TotalRemoved is NOT null) ) a GROUP BY invID ORDER BY id ASC" 
			var stocks = await conn.query(sql);
			var stocks2 = await conn.query(sql2);

			if (stocks.length==0) {
				//await conn.query('DELETE FROM inventorylocation WHERE bay='+conn.connection.escape(bay));
				httpStatus = 404;
				output.result = 'No inventory found.';
				break;
			}
			
			output.stocks = stocks;
			output.stocks2 = stocks2;
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

module.exports = loadLogBayDetails;