const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const getAllPurchaseOrders = async function (req, res, next) {
    var conn = new Database(dbconn);
    var method = req.method.toLowerCase();
    var token = req.header(Config.ACCESS_TOKEN_HEADER);
    var output = {result: null};
    var httpStatus = 400;
    var type = req.query.type;
    // console.log(type);
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
            
            let purchaseorders;

            if (type == "Generate-Reports"){
                // purchaseorders = await conn.query(`SELECT * FROM purchaseorder WHERE type in ('Loose','Container') GROUP BY poNo ORDER BY createdDate DESC`);
                purchaseorders = await conn.query(`SELECT * FROM purchaseorder GROUP BY poNo ORDER BY createdDate DESC`);
            }
            else if (type == 'Purchase Order'){
                purchaseorders = await conn.query(`SELECT * FROM receivingitems WHERE type in ('Receiving') and received = 0 GROUP BY poNo ORDER BY createdDate DESC`);
            }
            // else {
            //     purchaseorders = await conn.query(`SELECT * FROM purchaseorder GROUP BY poNo ORDER BY createdDate DESC`);
            // }

            if (!purchaseorders.length) {
                httpStatus = 200;
                output.result = 'No purchase orders found.';
                output.purchaseorders = null;
                break;
            } 

            output.purchaseorders = purchaseorders;
            // console.log(purchaseorders);
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

module.exports = getAllPurchaseOrders;