const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const searchInventory2 = async function (req, res, next) {
    var conn = new Database(dbconn);
    // var scanned = req.body.scanned;
    // var store = req.body.store;

    var token = req.header(Config.ACCESS_TOKEN_HEADER);
    var output = {result: null};
    var httpStatus = 400;

    var keyword = req.query.keyword || null;
    var field = req.query.field || '';

    try {
        do {
			// Check token
            let user = await userCheckToken(token, true);
            var record = null;

			if (!user) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
            }

            await conn.connect();
            
            var sql = `SELECT * FROM stockinventory`;

            if(keyword != null && keyword != '') {

                if(keyword == 'itemname') {
                    sql = sql + ` WHERE ` + keyword + ` like "%` + field + `%"`;
                }

                if(keyword == 'sku') {
                    sql = sql + ` WHERE ` + keyword + ` like "%` + field + `%"`;
                }

                if(keyword == 'customsku') {
                    sql = sql + ` WHERE ` + keyword + ` like "%` + field + `%"`;
                }

            }
            await conn.connect();
            var stocks = await conn.query(sql);

            if (stocks.length==0) {
                httpStatus = 404;
                stockData.result = 'Inventory not found.';
                break;
            }

            var stockData = {};
            for (let stock of stocks) {
                stockData[stock.id] = stock;
            }

            output.stocks = stockData;
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

module.exports = searchInventory2;