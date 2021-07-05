const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

// Gets the entire orders details and checks the status in database
const getEntireOrder = async function (req, res, next) {
    var recordData = JSON.parse(req.query.recordData);
    var type = req.query.type;
    var token = req.header(Config.ACCESS_TOKEN_HEADER);
    var output = { result: null };
    var httpStatus = 400;
    
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
                output.result = "No specified record numbers";
                break;
            }

            await conn.connect();

            // Get entire order start
            var entireOrder = [];
            var usernameMS = conn.connection.escape(user.username);
            var recordDataMS = [];
            var check = 0;
            
            for (var i = 0; i < recordData.length; i++) {
                var dataArray = [];
                for (var j = 0; j < recordData[i].length; j++) {
                    var data = conn.connection.escape(recordData[i][j]);

                    dataArray.push(data);
                }
                recordDataMS.push(dataArray);
            }

            var sqlArray = [];
            var sqlSelect;
            var sqlUpdate;
        
            for (var i = 0; i < recordDataMS.length; i++) {
                var orderID = recordDataMS[i][1];

                sqlArray.push('orderID = ' + orderID);
            }

            sqlSelect = "SELECT * FROM collecting WHERE (" +
                sqlArray.join(" OR ") + ")";

            if (await conn.query(sqlSelect)) {
                entireOrder = await conn.query(sqlSelect);
            } else {
                httpStatus = 404;
                output.result = "ORDERS NOT FOUND";
                break;
            }

            // Check status
            for (var i = 0; i < entireOrder.length; i++) {
                // check if status of an order is 
                // in progress (2) with another packer or 
                // if the order is packed (3)
                if (entireOrder[i].status == 2 && entireOrder[i].packer !=
                        user.username || entireOrder[i].status == 3) {
                    check = 1;
                }
            }

            var diffArray = [];
            // Look for orders with different packing type in combined order
            for (let i = 0; i < entireOrder.length; i++) {
                if (entireOrder[i].type != type) {
                    diffArray.push(entireOrder[i]);
                }
            }

            // Remove orders with different packing type in combined order
            // and query array
            for (let i = 0; i < diffArray.length; i++) {
                var orderIDMS = "\'" + diffArray[i].orderID + "\'";
                var sqlItem = 'orderID = ' + orderIDMS;
                entireOrder.splice(entireOrder.indexOf(diffArray[i]), 1);
                sqlArray.splice(sqlArray.indexOf(sqlItem), 1);
            }

            sqlUpdate = "UPDATE collecting SET status = 2, packer = " +
                usernameMS + " WHERE (" + sqlArray.join(" OR ") + ")";

            // If check == Y, then order is taken. 
            // Otherwise, mark the order in progress with packername. 
            if (check == 1) {
                output.check = "Y";
                output.entireOrder = entireOrder;
                output.result = 'success';
                httpStatus = 200;
            } else {
                if (await conn.query(sqlUpdate)) {
                    output.entireOrder = entireOrder;
                    output.result = 'success';
                    httpStatus = 200;
                } else {
                    httpStatus = 404;
                    output.result = "FAILED TO UPDATE";
                    break;
                }
            }
        } while (0);
    } catch (error) {
        httpStatus = 503;
        output.result = error;
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

module.exports = getEntireOrder;