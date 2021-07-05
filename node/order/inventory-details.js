
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
 
const inventoryDetails = async function(req, res, next) {
	var conn = new Database(dbconn);
	var token = req.header(Config.ACCESS_TOKEN_HEADER) || null;
	var output = {result: null};
	var httpStatus = 400;	
	let page = 1;
	let totalRecords = 20;
	try {
		do {
			let user = await userCheckToken(token, true);
			
			if (!user) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}
			else if (user.type != Config.USER_TYPE.ADMIN && user.type != Config.USER_TYPE.USER && user.type != Config.USER_TYPE.SUPPLIER && user.type != Config.USER_TYPE.CLIENT) {
				httpStatus = 403;
				output.result = 'Action not allowed.';
				break;
			}
			if(req.query.page)
				page = req.query.page;				
				
			if(req.query.limit)
				totalRecords = req.query.limit;
			
			let offset = (page - 1) * totalRecords;
			let invertoryDetails = null;
			await conn.connect();
			let method = req.method.toLowerCase();
			if (method == 'get') {
				invertoryDetails = await conn.query('SELECT inv.sku, inv.itemName, il.indivQty, it.itemBarcode, it.itemWeight from inventory inv, inventorylocation il, items it where inv.id = il.invID AND inv.data -> "$[0].itemNo" = it.itemNo LIMIT '+totalRecords+' OFFSET '+offset);
				if(invertoryDetails != null){
					output.result = "success";
					httpStatus = 200;
					let arr = [];
					for(let data of invertoryDetails)
						arr.push({ sku : data.sku, itemName : data.itemName, qty : data.indivQty, barcode : data.itemBarcode, weight : data.itemWeight});
					
					output.inventoryData = arr; 
					}else{
						output.result = 'No data in the inventory';
						output.status = 204;
					}
				}else{
					output.result = 'Method not allowed';
					output.status = 405;
					httpStatus = 405;
				}
			
			
		}while(0);
	}catch(e){
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

module.exports = inventoryDetails;