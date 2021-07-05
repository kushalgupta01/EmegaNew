const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const getBuyerDetails = async function (req, res, next) {
    var conn = new Database(dbconn);
    var method = req.method.toLowerCase();
    var token = req.header(Config.ACCESS_TOKEN_HEADER);
    var output = {result: null};
    var httpStatus = 400;

    var searchvalue = req.query.searchvalue;

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
         
            let buyers = await conn.query(`SELECT * FROM b2bbuyers WHERE fullname like "%` + searchvalue + `%"`);
      
            if (!buyers.length) {
                httpStatus = 200;
                output.result = 'No buyers.';
                output.buyers = null;
                break;
            }

            output.buyers = buyers;
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

module.exports = getBuyerDetails;