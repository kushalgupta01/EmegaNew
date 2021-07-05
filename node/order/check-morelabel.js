const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const checkMorelabel = async function (req, res, next) {
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
           
            var sql = 'SELECT 1 FROM collecting WHERE morelabel > 0';

            var oreders = await conn.query(sql);    
              
            if (oreders.length > 0) {
                output.result = 'success';
                output.morelabel = true;
                httpStatus = 200;
            }else{
                output.result = 'success';
                output.morelabel = false;
                httpStatus = 200;
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

module.exports = checkMorelabel;