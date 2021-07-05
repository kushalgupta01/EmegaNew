const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const searchInventory = async function (req, res, next) {
    var scanned = req.body.scanned;
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
            /*console.log(searchType);
            console.log(conn.connection.escape(searchType));
            console.log(searchValue);
            console.log(conn.connection.escape(searchValue));*/
            var sql;

            if (scanned) {
                sql = `SELECT * FROM stockinventory WHERE itemBarcode = ` + conn.connection.escape(scanned) + ` OR cartonBarcode = ` + conn.connection.escape(scanned);
            } else {
                if (!store) {
                    if (searchType == 'barcode') {
                        sql = `SELECT * FROM stockinventory WHERE (itemBarcode = ` + conn.connection.escape(searchValue) + ` OR cartonBarcode = ` + conn.connection.escape(searchValue) + `)`;
                    } else if (searchType == 'itemName') {
                        let words = searchValue.split(' ');
                        let sqlwhere = [];
                        for (let w of words) {
                            sqlwhere.push('itemName like "%' + w.trim() + '%"');
                        }
                        sql = `SELECT * FROM stockinventory WHERE ` + sqlwhere.join(' AND ');
                    } else {
                        sql = `SELECT * FROM stockinventory WHERE ` + searchType + ` like "%` + searchValue + `%"`;
                    }
                }
                else if (store=='-') {
                    if (searchType == 'barcode') {
                        sql = `SELECT * FROM stockinventory WHERE itemBarcode = ` + conn.connection.escape(searchValue) + ` OR cartonBarcode = ` + conn.connection.escape(searchValue);
                    } else if (searchType == 'itemName') {
                        let words = searchValue.split(' ');
                        let sqlwhere = [];
                        for (let w of words) {
                            sqlwhere.push('itemName like "%' + w.trim() + '%"');
                        }
                        sql = `SELECT * FROM stockinventory WHERE ` + sqlwhere.join(' AND ');
                    } else {
                        sql = `SELECT * FROM stockinventory WHERE ` + searchType + ` like "%` + searchValue + `%"`;
                    }
                } else {
                    if (searchType == 'barcode') {
                        sql = `SELECT * FROM stockinventory WHERE (itemBarcode = ` + conn.connection.escape(searchValue) + ` OR cartonBarcode = ` + conn.connection.escape(searchValue) + `) AND store = ` + store;
                    } else if (searchType == 'itemName') {
                        let words = searchValue.split(' ');
                        let sqlwhere = [];
                        for (let w of words) {
                            sqlwhere.push('itemName like "%' + w.trim() + '%"');
                        }
                        sql = `SELECT * FROM stockinventory WHERE ` + sqlwhere.join(' AND ');
                    } else {
                        sql = `SELECT * FROM stockinventory WHERE ` + searchType + ` like "%` + searchValue + `%" AND store = ` + store;
                    }
                }
            }
            
            console.log(sql);
            var inventorys = await conn.query(sql);    
              
            if (inventorys.length > 0) {
                let newInventorys = [];
                for (let inv of inventorys) {
                    inv['locations'] = await conn.query('SELECT * FROM inventorylocation WHERE invID=' + inv.id);
                    newInventorys.push(inv);
                }
                output.data = newInventorys;
                output.result = 'success';
                httpStatus = 200;
            }else{
                httpStatus = 404;
                output.result = 'Inventory not found';
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

module.exports = searchInventory;