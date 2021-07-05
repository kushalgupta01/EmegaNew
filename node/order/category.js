
const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');
 
const categorySku = async function(req, res, next) {
	var conn = new Database(dbconn);
	var token = req.header(Config.ACCESS_TOKEN_HEADER) || null;
	var output = {result: null};
	var httpStatus = 400;	
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
			
			if(req.query.sku){
				let sku = req.query.sku;
				let categoryDetails = null;
				await conn.connect();
				let method = req.method.toLowerCase();
				if (method == 'get') {
					categoryDetails = await conn.query('SELECT s.category FROM stockinventory s where s.sku ='+conn.connection.escape(sku));
					if(categoryDetails != null){
						output.result = "success";
						httpStatus = 200;						
						output.categoryData = {
							categoryName : categoryDetails[0].category
						}; 
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
				output.result = 'Pass the sku ';
				output.status = 404;
				httpStatus = 404;
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

module.exports = categorySku;