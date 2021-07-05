const Database = require('./connection');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const getPurchaseOrders = async function (req, res, next) {
    var conn = new Database(dbconn);
    var method = req.method.toLowerCase();
    var token = req.header(Config.ACCESS_TOKEN_HEADER);
    var output = {result: null};
    var httpStatus = 400;
    var poNo = req.body.poNo;
    var type = req.query.type;

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
            if (type == 'Generate-Reports'){
                purchaseorder = await conn.query('SELECT p.id, p.invID, p.poNo, p.supplierName, p.bay, p.indivQty AS qty, p.createdDate, p.createdBy, p.store, p.orderedQty, s.id, s.itemNo, s.sku, s.customSku, s.itemBarcode, s.cartonBarcode, s.itemName, s.image FROM purchaseorder p, stockinventory s WHERE p.invID = s.id and p.poNo = ' +conn.connection.escape(poNo) ); //+ " GROUP BY s.sku, p.bay");
                // purchaseorder = await conn.query('SELECT p.id, p.invID, p.poNo, p.supplierName, p.bay, SUM(p.indivQty) AS qty, p.createdDate, p.createdBy, p.store, s.id, s.itemNo, s.sku, s.customSku, s.itemBarcode, s.cartonBarcode, s.itemName, s.image FROM purchaseorder p, stockinventory s WHERE p.invID = s.id and p.poNo = ' +conn.connection.escape(poNo)+ " and p.`type` in ('Container','Loose') GROUP BY s.sku, p.bay");
            }
            if (type == 'Purchase Order'){
                purchaseorder = await conn.query("SELECT  r.id, r.invID, r.poNo, r.supplierName, r.orderedQty, r.createdDate, r.createdBy, r.store, r.type, r.receivedLocQty, s.id, s.itemNo, s.sku, s.customSku, s.itemBarcode, s.cartonBarcode, s.itemName, s.image FROM receivingitems r, stockinventory s WHERE r.invID = s.id and r.poNo = " +conn.connection.escape(poNo)+ " GROUP BY s.sku");
            }


            if (!purchaseorder.length) {
                httpStatus = 200;
                output.result = 'No po found.';
                output.purchaseorder = null;
                break;
            }

            var poData = {};
            for (let po of purchaseorder) {
                po['locations'] = await conn.query('SELECT * FROM inventorylocation WHERE invID=' + po.id);
                if (poData.hasOwnProperty(po.id)) {
                    poData[po.id].push(po);
                } else {
                    poData[po.id] = [];
                    poData[po.id].push(po);
                }
                
            } 

            output.purchaseorder = poData;
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

module.exports = getPurchaseOrders;