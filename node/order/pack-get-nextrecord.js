const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const getNextRecord = async function (req, res, next) {
    var type = req.query.type;
    var store = req.query.store;
    var token = req.header(Config.ACCESS_TOKEN_HEADER);
    var output = {result: null};
    var httpStatus = 400;

	var conn = new Database(dbconn);

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
            if (!type) {
				httpStatus = 501;
                output.result = 'No specified type';
                break;
            }

            await conn.connect();

            do {
                var typeMS = conn.connection.escape(type);
                var storeMS = 'o.store = ' + conn.connection.escape(store);
                if (store==30) storeMS = '(o.store = 31 OR o.store = 32 OR o.store = 33 OR o.store = 34 OR o.store = 35)';
                var usernameMS = conn.connection.escape(user.username);
                var intervalMS = conn.connection.escape((Config.PACKING.TIMEOUT
                    + Config.PACKING.MINUTES_RELATIVE_TO_UTC).toString());
                /*var sql1 = 'SELECT c.* FROM collecting c, orders o WHERE c.status = 2 AND c.type = '
                    + typeMS + ' AND c.packer = ' + usernameMS + ' AND o.store = ' + storeMS +' AND c.orderID = o.id LIMIT 1';
                var sql2 = 'SELECT c.* FROM collecting c, orders o WHERE c.status = 10 AND c.type = '
                    + typeMS + ' AND o.store = ' + storeMS +' AND c.orderID = o.id ORDER BY packingID ASC LIMIT 1';  
                var sql3 = 'SELECT c.* FROM collecting c, orders o WHERE c.packedTime <= '
                    + 'DATE_SUB(NOW(), INTERVAL ' + intervalMS
                    + ' MINUTE) AND c.status = 2 AND c.type = ' + typeMS +' AND o.store = ' + storeMS 
                    + ' AND c.orderID = o.id ORDER BY packedTime ASC LIMIT 1';
                var sql4 = 'SELECT c.* FROM collecting c, orders o WHERE c.status = 9 AND c.type = '
                    + typeMS + ' AND o.store = ' + storeMS +' AND c.orderID = o.id ORDER BY packedTime ASC LIMIT 1';*/

                var sql1 = 'SELECT c.* FROM collecting c, orders o WHERE c.status = 2 AND c.type = '
                    + typeMS + ' AND c.packer = ' + usernameMS + ' AND ' + storeMS + ' AND c.orderID = o.id LIMIT 1';
                var sql2 = 'SELECT c.* FROM collecting c, orders o WHERE c.status = 10 AND c.type = '
                    + typeMS + ' AND ' + storeMS +' AND c.orderID = o.id ORDER BY packingID ASC LIMIT 1';  
                var sql3 = 'SELECT c.* FROM collecting c, orders o WHERE c.packedTime <= '
                    + 'DATE_SUB(NOW(), INTERVAL ' + intervalMS
                    + ' MINUTE) AND c.status = 2 AND c.type = ' + typeMS +' AND ' + storeMS 
                    + ' AND c.orderID = o.id ORDER BY packedTime ASC LIMIT 1';
                var sql4 = 'SELECT c.* FROM collecting c, orders o WHERE c.status = 9 AND c.type = '
                    + typeMS + ' AND ' + storeMS +' AND c.orderID = o.id ORDER BY packedTime ASC LIMIT 1';



                var sql1result = await conn.query(sql1);
                if (sql1result && typeof sql1result != 'undefined' &&
                    sql1result.length > 0) {
                    record = sql1result;
                    break;
                }
                var sql2result = await conn.query(sql2);
                if (sql2result && typeof sql2result != 'undefined' &&
                    sql2result.length > 0) {
                    record = sql2result;
                    break;
                }
                var sql3result = await conn.query(sql3);
                if (sql3result && typeof sql3result != 'undefined' &&
                    sql3result.length > 0) {
                    record = sql3result;
                    break;
                }
                var sql4result = await conn.query(sql4);
                if (sql4result && typeof sql4result != 'undefined' &&
                    sql4result.length > 0) {
                    record = sql4result;
                    break;
                }
                
                httpStatus = 404;
                output.result = 'NO ORDERS';
            } while (0);
            if (httpStatus !== 404) {
                output.record = record;
                output.result = 'success';
                httpStatus = 200;
            }
        } while (0)
    } catch (err) {
        // Error
        httpStatus = 503;
        output.result = err;
    }

	if (conn.connected) conn.release();

    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0,' +
            ' post-check=0, pre-check=0',
		'Pragma': 'no-cache',
    });
    res.json(httpStatus, output);
    
    next();
}

module.exports = getNextRecord;