const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const loadManageOrdersTransLogs = async function (req, res, next) {
    var conn = new Database(dbconn);
    var method = req.method.toLowerCase();
    var token = req.header(Config.ACCESS_TOKEN_HEADER);
    var output = {result: null};
    var httpStatus = 400; 

    let orderId = req.body.orderId;
    // console.log(orderId);
    
    try {
        do {
            // Check token
            let user = await userCheckToken(token, true);

            if (!user) {
                httpStatus = 401;
                output.result = 'Not logged in.';
                break;
            }
            await conn.connect();

                let transactions = await conn.query('SELECT * FROM translogs WHERE orderId = ' + conn.connection.escape(orderId) + ' ORDER BY actionTime DESC');
                console.log(transactions);

            if (!transactions.length) {
                httpStatus = 200;
                output.result = 'No transaction.';
                output.transactions = null;
                break;
            }

            output.transactions = transactions;
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

module.exports = loadManageOrdersTransLogs;