const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const searchPackorder = async function (req, res, next) {
    var store = req.body.store;
    var searchType = req.body.searchType;
    var searchValue = req.body.searchValue;
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

            await conn.connect();

            var sql;
            if (searchType=='TrackingID') {
                sql = `SELECT o.store, c.orderID, c.type, c.status, o.salesRecordID FROM collecting c, orders o WHERE o.id = c.orderID AND JSON_CONTAINS(trackingID,'"` + searchValue + `"')` + `ORDER BY c.orderID ASC LIMIT 1`;
            }else if (searchType=='SalesRecordID'){
                sql = `SELECT o.store, c.orderID, c.type, c.status, o.salesRecordID FROM collecting c, orders o WHERE o.id = c.orderID AND o.salesRecordID = ` + conn.connection.escape(searchValue) + ` AND o.store = ` + store;
            }
            

            var records = await conn.query(sql);    
              
            if (records.length > 0) {
                output.record = records;
                output.result = 'success';
                httpStatus = 200;
            }else{
                httpStatus = 404;
                output.result = 'Orders not found';
            }
        } while (0)
    } catch (err) {
        // Error
        httpStatus = 503;
        output.result = err;
        console.log(err);
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

module.exports = searchPackorder;