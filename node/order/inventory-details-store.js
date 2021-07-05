
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
 
const inventoryDetailsByStore = async function(req, res, next) {
	var conn = new Database(dbconn);
	var token = req.header(Config.ACCESS_TOKEN_HEADER) || null;
	var output = {result: null};
	var httpStatus = 400;	
	let page = 1;
	let totalRecords = 10;
	let store = null;
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
			
			if(req.query.store){
				let storeVal = null;
				switch(req.query.store){
					case "OzPlaza" :  storeVal = 1; break;
					case "SOSHydration" :  storeVal = 2; break;
					case "Scrub Daddy" :  storeVal = 3; break;
					case "Idirect" :  storeVal = 4; break;
					case "SP Warehouse" :  storeVal = 6; break;
					case "Hobbyco" :  storeVal = 8; break;
					case "Kobayashi" :  storeVal = 7; break;
					case "Habitania eBay" :  storeVal = 9; break;
					case "Catwalk" :  storeVal = 15; break;
					case "Sons of Amazon" :  storeVal = 16; break;
					case "New Store" :  storeVal = 21; break;
					case "Combined Group" :  storeVal = 30; break;
					case "Kitncaboodle" :  storeVal = 31; break;
					case "Packing Sorted" :  storeVal = 32; break;
					case "RoofStuff" :  storeVal = 33; break;
					case "ANKAMe" :  storeVal = 34; break;
					case "CleanHQ" :  storeVal = 35; break;
					case "Evo Build" :  storeVal = 36; break;
					case "BH&G" :  storeVal = 37; break;
					case "Amazon" :  storeVal = 41; break;
					case "Emega-Magento" :  storeVal = 51; break;
					case "CharliChair" :  storeVal = 61; break;
					case "Waterwipes" :  storeVal = 62; break;
					case "Habitania" :  storeVal = 63; break;
					case "SonsOfAmazonShopify" :  storeVal = 64; break;
					case "TrinityconnectShopify" :  storeVal = 65; break;
					case "Hobbyco Website" :  storeVal = 71; break;
					case "B2B-Wholesale" :  storeVal = 81; break;
					case "B2B-Transfer" :  storeVal = 82; break;
					case "Hobbyco Catch" :  storeVal = 91; break;
					case "Trinityconnect Catch" :  storeVal = 92; break;
					case "Emega Catch" :  storeVal = 93; break;
					case "Hobbyco Kogan" :  storeVal = 74; break;
					case "Trinityconnect Kogan" :  storeVal = 75; break;
					case "Autowell" :  storeVal = 101; break;
					case "Circular2nds" :  storeVal = 102; break;
					case "fiestaelectronics" :  storeVal = 103; break;
					case "eliabathrooms" :  storeVal = 104; break;
					case "Spartan" :  storeVal = 105; break;
					case "At Pack" :  storeVal = 106; break;
				}
				let offset = (page - 1) * totalRecords;
				let invertoryDetails = null;
				await conn.connect();
				let method = req.method.toLowerCase();
				if (method == 'get') {
					invertoryDetails = await conn.query('SELECT s.itemName, s.sku, s.itemBarcode, s.indivQty, s.weight FROM stockinventory s WHERE s.store = '+storeVal+' LIMIT ' +totalRecords+ ' OFFSET '+offset);
					if(invertoryDetails != null){
						output.result = "success";
						httpStatus = 200;
						let invData = [];
						for(let data of invertoryDetails)						
							invData.push({ sku : data.sku, itemName : data.itemName, qty : data.indivQty, barcode : data.itemBarcode, weight : data.weight});
							
						
						output.inventoryData = invData; 
						}else{
							output.result = 'No data in the inventory';
							output.status = 204;
						}
					}else{
						output.result = 'Method not allowed';
						output.status = 405;
						httpStatus = 405;
					}
			}else{
				output.result = 'Pass the store value';
				output.status = 503;
				httpStatus = 503;
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

module.exports = inventoryDetailsByStore;