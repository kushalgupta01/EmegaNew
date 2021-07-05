const Database = require('./connection');
const { Config } = require('./config');
const { userCheckToken } = require('./users-token');

const searchLogs = async function (req, res, next) {
    var conn = new Database(dbconn);
    var token = req.header(Config.ACCESS_TOKEN_HEADER);
    var output = { result: null };
    var httpStatus = 400;

    var docketNo = req.query.docketNo || null;

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

            var sql = `SELECT si.store, si.itemName, si.customSku, si.itemBarcode, si.cartonBarcode, si.bay, si.image, tl.actionLooseQty, tl.actionCartonQty
                        FROM transactionlogs tl join stockinventory si on si.customSku = tl.customSku where tl.docketNo = '` + docketNo + `'`;

            await conn.connect();
            var logs = await conn.query(sql);

            output.logs = logs;
            output.result = 'success';
            httpStatus = 200;
        } while (0);
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

module.exports = searchLogs;