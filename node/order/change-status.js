const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const changeStatus = async function (req, res, next) {
    var recordData = JSON.parse(req.query.recordData);
    var token = req.header(Config.ACCESS_TOKEN_HEADER);
    var status = req.query.status;
    var output = { result: null };
    var httpStatus = 400;

    var ORDER_STATUS = {
        PACKED: 3,
        OUT_OF_STOCK: 4,
        CANCELLED_OOS: 5,
        CANCELLED_DISCONTINUED: 6,
        CANCELLED: 7,
        OVERRIDE: 8
    };

    var conn = new Database(dbconn);

    try {
        do {
			// Check token
			let user = await userCheckToken(token, true);

			if (!user) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
            }
            if (!recordData) {
                httpStatus = 501;
                output.result = 'No specified record numbers';
                break;
            }
            if (!status) {
                httpStatus = 501;
                output.result = 'No specified status';
                break;
            }

            await conn.connect();

            var usernameMS = conn.connection.escape(user.username);
            var statusMS = conn.connection.escape(status);
            var recordDataMS = [];
            var sqlArray = [];
            var sqlUpdate;
            var sqlSelect;

            for (var i = 0; i < recordData.length; i++) {
                var dataArray = [];
                for (var j = 0; j < recordData[i].length; j++) {
                    var data = conn.connection.escape(recordData[i][j]);

                    dataArray.push(data);
                }
                recordDataMS.push(dataArray);
            }
        
            for (var i = 0; i < recordDataMS.length; i++) {
                var orderID = recordDataMS[i][1];

                sqlArray.push('orderID = ' + orderID);
            }
            sqlUpdate = 'UPDATE collecting SET status = ' + statusMS +
                ', packer = ' + usernameMS + ', packedTime = UTC_TIMESTAMP()' +
                ' WHERE (' + sqlArray.join(' OR ') + ')';
            sqlSelect = 'SELECT * FROM collecting WHERE (' +
                sqlArray.join(' OR ') + ')';

            var sqlSelectData = await conn.query(sqlSelect);
            var check = false;

            for (let i = 0; i < sqlSelectData.length; i++) {
                let rowStatus = sqlSelectData[i].status;
                if (rowStatus == ORDER_STATUS.OUT_OF_STOCK
                    || rowStatus == ORDER_STATUS.CANCELLED_OOS
                    || rowStatus == ORDER_STATUS.CANCELLED_DISCONTINUED
                    || rowStatus == ORDER_STATUS.CANCELLED
                    || rowStatus == ORDER_STATUS.OVERRIDE
                    || rowStatus == ORDER_STATUS.PACKED) {
                    check = true;
                }
            }

            // Status changed
            if (check) {
                output.result = 'success';
                httpStatus = 200;
                break;                
            }

            // Update successful
            if (await conn.query(sqlUpdate)) {
                output.result = 'success';
                httpStatus = 200;
            } else {
                httpStatus = 404;
                output.result = 'FAILED TO UPDATE';
                break;
            }
        } while (0);
    } catch (error) {
        httpStatus = 503;
        output.result = error;
    }
    
    if (conn.connected) conn.release();

    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, ' +
            ' post-check=0, pre-check=0',
		'Pragma': 'no-cache',
    });
    res.json(httpStatus, output);
    
    next();
}

module.exports = changeStatus;