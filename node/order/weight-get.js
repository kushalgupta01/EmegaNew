const {Config} = require('./config');
const Database = require('./connection');
const {commonData, getConversionData} = require('./order-convert');

const getWeight = async function(req, res, next) {
	var conn = new Database(dbconn);
	var method = req.method.toLowerCase();

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (method == 'post') {
				try {
					let store = req.body.store || null;
					let storeWHERE = '';
					if (store==30) {
						storeWHERE = '(itemStore = 31 OR itemStore = 32 OR itemStore = 33 OR itemStore = 34)';
					} else {
						storeWHERE = 'itemStore = ' + store;
					}
					let page = req.body.page || null;
					let perpage = req.body.perpage || null;
					await conn.connect();
					var sql = 'SELECT * from items WHERE ' + storeWHERE + ' LIMIT ' + (page-1)*perpage + ', ' + perpage;
					var sql2 = 'SELECT count(*)/' + perpage + ' as totalPage from items WHERE ' + storeWHERE;
					//console.log(sql);
				
					var result = await conn.query(sql);
					var result2 = await conn.query(sql2);
					if (result && result2) {
						output.result = 'success';
						httpStatus = 200;

					}else{
						output.result = 'failed';
					}
						
					
				}catch(e){
					console.log(e);
				}

				var items = {};
				for (let item of result) {
					items[item.itemID] = item;
				}

				//console.log(items);
				output.items = items;
				output.totalPage = Math.ceil(result2[0].totalPage);
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

module.exports = getWeight;