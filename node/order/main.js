// Discount Chemist
// Order System

const restify = require('restify');
const fs = require('fs');
const corsMiddleware = require('restify-cors-middleware');
const DBConnection = require('./dbconnection');
const cron = require('cron');
var compression = require('compression');
//const https = require('https');

// General
const getStores = require('./stores-get');
const getStoresByClient = require('./stores-get-by-client');
const emailSender = require('./email-sender');

const checkMorelabel = require('./check-morelabel');

const userOrderTrackingStatus = require('./userOrderTrackingStatus');

// Orders
const downloadOrders = require('./orders-download');
const downloadOrdersEbay = require('./orders-download-ebay');
const getOrders = require('./orders-get');
const getCollectedOrders = require('./orders-get-collected');
const removeOrders = require('./orders-remove');
const addOrdersCollect = require('./orders-add-collect');
const addOrdersPrint = require('./orders-add-print');
const getUnsentOrders = require('./orders-unsent-get');
const markOrdersSent = require('./orders-unsent-marksent');
const loadManageOrdersTransLogs = require('./orders-manage-load-translogs');
const loadOrders = require('./orders-load');
const manageOrders = require('./orders-manage');
const getOrderIDs = require('./orders-get-order-ids');
const getOrder = require('./order-get');
const changeallorderstatus = require('./order-all-change-status');
//const recordsToOrdersEbay = require('./util-records-to-orders-ebay');
//const utilScript = require('./util-script');
const ordersImportGroupon = require('./orders-import-groupon');
const ordersImportMydeal = require('./orders-import-mydeal');
const orderAdd = require('./order-add');
const searchOrder = require('./orders-search');
const searchPurchaseOrder = require('./orders-purchase-search');
const {getOrderTrackingStatus} = require('./orders-tracking-status');

const addOrderItem = require('./order-add-item');
const modifyOrderItem = require('./order-modify-item');
const addOrderOriginalItem = require('./order-add-original-item');
const updateAlternativeItems = require("./order-update-alternative-items");
const updateReplacementItems = require("./order-update-replacememt-items");
const deleteReplacementItems = require("./order-delete-replacememt-items");
const deleteItem = require("./order-item-delete");
const orderUpdateItem = require("./order-item-update");
const orderCreate = require('./order-create');
const receiveOrders = require('./orders-receive');

const requestAmazonReport = require('./orders-amazon-request');
const donwloadAmazonOrder = require('./orders-amazon-download');

const downloadPackedOrders = require('./orders-packed-download');

const downloadNewOrders = require('./orders-new-download');
const downloadB2BNewOrders = require('./orders-b2b-new-download');
const downloadB2BPackedOrders = require('./orders-b2b-packed-download');

const downloadB2BWeights = require('./b2b-weights-download');

const uploadOrder = require('./order-b2b-upload-csv');

const addBoxDetails = require('./orders-add-boxDetail');

const saveLocationSelected = require('./order-save-locationselected');

const orderDetails = require("./order-details-byorderid");
const orderType = require("./order-type");
const orderStatusFun = require("./order-status");
const trackingNumber = require("./tracking-number");

// Tracking
const getTrackingOrders = require('./orders-tracking-get');
const uploadTracking = require('./orders-tracking-upload');

const getTracking = require('./getTracking');
const downloadTracking = require('./tracking-download');
const downloadDispatched = require('./dispatched-download');

const { 
  downloadInvoice, 
  markOrdersInvoiced, 
  importImvoice, 
  importAusPost, 
  listAusPostLogs,
  getCostWeights,
  saveCostWeights,
  downloadExportFile
} = require('./invoices');

// Collecting
const loadbrands = require('./loadbrands');
const getItems = require('./items-get');
const saveItem = require('./items-save');
const readytopack = require('./readytopack');
const savetracking = require('./savetracking');
const updateOrder = require('./order-update');
const getrecord = require('./getrecord');
//const getItem = require('./item-get');
const markflatpackvr = require('./markflatpackvr');
const downloadItems = require('./items-download');
const setBay = require('./set_bay');
const setSat = require('./set_sat');
const setFWFP = require('./set_fwfp');
const searchItems = require('./item-search');
const addItem = require('./item-add');
const updateItem = require('./item-update');
const getBundleItems = require('./item-get-bundleitems');
const itemDownload = require('./item-download');

const requestAmazonProductsReport = require('./items-amazon-request');
const downloadAmazonProducts = require('./items-amazon-download');
const downloadAmazonProductsImages = require('./items-amazon-images');

const updateMorelabel = require('./morelabel-update');

const saveScanned = require('./save-scanned');
const resetScanned = require('./reset-scanned');

const saveLocationSorted = require('./order-save-locationsorted');

// Packing
const getNextRecord = require('./pack-get-nextrecord');
const getEntireOrder = require('./pack-get-entireorder');
const changeStatus = require('./pack-change-status');
const getTrackorder = require('./pack-get-trackorder');
const searchPackOrder = require('./pack-search-order');
const getOrdersLeft = require('./pack-get-ordersleft');
const setMorelabel = require('./pack-set-morelabel');

const updateOrder2 = require('./order-update2');

const savePackScanned = require('./save-pack-scanned');

//Packer
const searchPacker = require('./packers-search');

// Management
const manageConfig = require('./manage-config');
const userGet = require('./users-get');
const userLogin = require('./users-login');
const userSave = require('./users-save');
const userRemove = require('./users-remove');
const login = require('./login');

// Inventory
const getInventory = require('./inventory-get');
const getStock = require('./stock-get');
const updateStock = require('./stock-update');
const updateStockItemTable = require('./stock-update-itemtable');
const updateStockQuantity = require('./stock-update-quantity');
const getInventoryStock = require('./inventory-getstock');
const updateInventoryStock = require('./inventory-updatestock');

const getStockInventory = require('./stock-get-inventory');
const getMultiStockInventory = require('./stock-get-multi-inventory');
const loadStockInventory = require('./stock-load-inventory');
const loadStockBay = require('./stock-load-bay');
const loadStockBayStage = require('./stock-load-bay-stage');
const loadStockItemsID = require('./stock-load-item-id');
const loadStockInventoryAll = require('./stock-load-inventory-all');
const loadPageItemIDbyBarcode = require('./stock-load-page-item-barcode');
const loadStockBayBulk = require('./stock-load-bay-bulk');
const updateBayTransferItem = require('./transfer-item-bay-update');
const bulkUpdateBayTransferItem = require('./transfer-item-bay-update-bulk');
const updateBayType = require('./update-type-bay');
const checkLocationExist = require('./check-exist-location');
const createNewBay = require('./create-new-location');
const createIfHasItemNewBay = require('./create-new-location-if-has-item');
const checkTypeLocation = require('./check-location-type');
const updateQtyinBay = require('./inventory-location-update-item-qty');
const removeIdInventoryLocation = require('./inventory-location-id-remove');
const loadStockBayInventory = require('./stock-load-bay-inventory');
const loadStockBayInventory2 = require('./stock-load-bay-inventory2');
const searchStockInventory = require('./stock-inventory-search');
const updateStockInventory = require('./stock-inventory-update');
const updateStockInventory2 = require('./stock-inventory-update2');
const updateStockInventory3 = require('./stock-inventory-update3');
const updateBayStockInventory = require('./stock-inventory-bay-update');
const removeBayStockInventory = require('./stock-inventory-bay-remove');
const updateStockInventoryLocation = require('./stock-inventory-update-location');

const getStoreNameHasInventory = require('./store-name-inventory-get');

const addProduct = require('./item-add-product');

const loadStockByBrand = require('./stock-load-brand');
const getStockInventory2 = require('./stock-get-inventory2');

const stockReceivedByDay = require('./stockreceived-byday');

const downloadStock = require('./download-stock');

const inventoryDetails = require("./inventory-details");
const inventoryDetailsStore = require("./inventory-details-store");
const inventoryDetailsStroeSku = require("./inventory-details-store-sku");

// inventory logs
const loadLogBay = require('./transactionlogs-load-bay');
const loadLogBayDetails = require('./transactionlogs-load-bay-details');
const transferLogBayDetails = require("./transferlogsbaydetails-get"); 
const getTransferLogs = require("./transferlogs-get");

const checkInventoryExist = require('./inventory-check-exist');
const updateInventoryQuantity = require('./inventory-update-quantity');

const updateCreateInventoryLocation = require('./inventory-location-create-update');

const searchInventory = require('./inventory-search');
const searchInventory2 = require('./inventory-search2');

const downloadInventory = require('./inventory-download');

const getWeight = require('./weight-get');
const updateWeight = require('./weight-update');
const updateAwait = require('./await-update');

const clientStat = require("./clients-stat");
const clientInventory = require("./clients-inventory");
const clientInventoryDetail = require("./clients-inventory-detail");
const clientAddProduct = require('./clients-add-product');
const clientAddOrder = require('./clients-addorder'); 

const ordersStat = require("./orders-stat");
const ordersPackedByUser = require('./orderspacked-byday');

const upload = require('./upload');

// Customers

const updateCustomers = require('./customers-update');
const getCustomers = require('./customers-get');

const addBuyerDetails = require('./b2bbuyers-add');
const getBuyerNames = require('./b2bbuyernames-get');
const addSupplierDetails = require('./suppliers-add');
const getSuppliers = require('./suppliers-get');
const getAllPurchaseOrders = require('./purchaseorders-all-get');
const getPurchaseOrders = require('./purchaseorders-get');
const downloadreceivedstock = require('./receivedstock-download');
const downloadqvbstocksent = require('./qvbstocksent-download');

const getTransactionLogs = require("./transactionlogs-get");
const getTransactionLogsByDocketNo = require("./transactionlogs-getbydocketno");

const loadManageOrdersCollectLogs = require('./orders-manage-load-collectlogs');

const autoAcceptCatchOrders = require("./orders-catch-auto-accept");

//buyer
const buyerDetails = require("./buyer-details-byorderid");

//brand
const brandDetails = require("./brand-details");

const categoryDetails = require("./category");

//Fullfilled orders
const fullfilledOrderDetailsByStore = require("./fullfilled-orders");
const orderByStoreOrderid = require("./order-by-store-orderid"); 
// Database
const dbconn = new DBConnection();
global.dbconn = dbconn;

/*const fs = require('fs');
cert: fs.readFileSync('/etc/dehydrated/certs/local.discountchemist.com.au/fullchain.pem')
key: fs.readFileSync('/etc/dehydrated/certs/local.discountchemist.com.au/privkey.pem')*/


// Server
const server =  restify.createServer({name: ''});

const cors = corsMiddleware({
    allowHeaders: ['DC-Access-Token'],
    origins: ['*'],
    //origins: ['https://server.discountchemist.com.au', 'https://local.discountchemist.com.au'],
    preflightMaxAge: 3600
});

server.pre(cors.preflight);
server.use(compression());
server.use([cors.actual, restify.plugins.queryParser(), restify.plugins.bodyParser()]);

// General
server.get('/api/stores/get', getStores);
server.get('/api/stores/:client', getStoresByClient);
server.post('/api/email-sender', emailSender);

server.get('/api/check/morelabel', checkMorelabel);

// Orders
server.get('/api/orders/download/:service/:store', downloadOrders);
server.get('/api/orders/download/:store', downloadOrdersEbay);
server.get('/api/orders/get/:store', getOrders);
server.get('/api/orders/getcollected', getCollectedOrders);
server.put('/api/orders/save', getOrders);
server.del('/api/orders/remove', removeOrders);
server.post('/api/orders/addcollect', addOrdersCollect);
server.post('/api/orders/addprint', addOrdersPrint);
server.get('/api/orders/unsent/get/:store', getUnsentOrders);
server.post('/api/orders/unsent/marksent', markOrdersSent);
server.get('/api/orders/load', loadOrders);
server.get('/api/orders/manage', manageOrders);
server.post('/api/orders/manage/:type', manageOrders);
server.post('/api/orders/manage/translogs/load', loadManageOrdersTransLogs);
server.get('/api/orders/orderids', getOrderIDs);
server.post('/api/changeallorderstatus',changeallorderstatus);
//server.get('/api/order/:srn', getOrder);
//server.post('/api/order/:srn', getOrder);
//server.get('/api/convert-records', recordsToOrdersEbay);
server.post('/api/orders/import/groupon', ordersImportGroupon);
server.post('/api/orders/import/mydeal', ordersImportMydeal);
server.post('/api/addOrder', orderAdd);
server.post('/api/order/get', getOrder);
server.post('/api/orders/search', searchOrder);
server.post('/api/orders/purchase/search', searchPurchaseOrder);
server.post('/api/order/additem', addOrderItem);
server.post('/api/order/modifyitem', modifyOrderItem);
server.post('/api/order/addoriginalitem', addOrderOriginalItem);
server.post("/api/order/updatealternativeitems", updateAlternativeItems);
server.post("/api/order/updatereplacementitems", updateReplacementItems);
server.post("/api/order/deletereplacementitems", deleteReplacementItems);
server.post("/api/order/itemdelete", deleteItem);
server.post("/api/order/itemupdate", orderUpdateItem);
server.post('/api/createOrder', orderCreate);
server.post('/api/receiveOrders', receiveOrders);
server.post('/api/orders/trackingstatus', getOrderTrackingStatus);

server.get('/api/orders/amazon/request', requestAmazonReport);
server.post('/api/orders/amazon/download', donwloadAmazonOrder);

server.get('/api/downloadPackedOrders/:store', downloadPackedOrders);

server.get('/api/downloadNewOrders/:store',downloadNewOrders);
server.get('/api/downloadB2BNewOrders/:store',downloadB2BNewOrders);
server.get('/api/downloadB2BPackedOrders/:store',downloadB2BPackedOrders);

server.post('/api/uploadorder', uploadOrder);

server.post('/api/addBoxDetails', addBoxDetails);

server.post('/api/order/saveLocationSelected', saveLocationSelected);

server.get("/api/order-details", orderDetails);
server.get("/api/order-type", orderType);
server.get("/api/order-status", orderStatusFun);
server.get("/api/tracking-number", trackingNumber);


// Tracking
server.get('/api/orders/tracking/get/:store', getTrackingOrders);
server.put('/api/orders/tracking/save', getTrackingOrders);
server.post('/api/orders/tracking/upload', uploadTracking);
server.post('/api/gettracking', getTracking);

server.get('/api/trackings/:store/:substore', downloadTracking);
server.get('/api/dispatched/:store/:substore', downloadDispatched);

server.post('/api/invoices/markinvoiced', markOrdersInvoiced);
server.post('/api/invoices/getCostWeights', getCostWeights);
server.post('/api/invoices/saveCostWeights', saveCostWeights);
server.post('/api/invoices/downloadInvoice', downloadInvoice);
server.get('/api/invoices/downloadExportFile/:file', downloadExportFile);
server.post('/api/invoices/importImvoice', importImvoice);
server.post('/api/invoices/importAusPost', importAusPost);
server.get('/api/invoices/listAusPostLogs', listAusPostLogs);

// Collecting
server.get('/api/loadbrands', loadbrands);
server.get('/api/items/get', getItems);
server.post('/api/items/get', getItems);
server.post('/api/items/save', saveItem);
server.post('/api/readytopack', readytopack);
server.post('/api/savetracking', savetracking);
server.post('/api/order/update', updateOrder);
server.get('/api/getrecord', getrecord);
//server.get('/api/item/:itemID', getItem);
server.post('/api/markflatpackvr', markflatpackvr);
server.get('/api/items/download/:service/:store', downloadItems);
server.post('/api/setbay', setBay);
server.post('/api/setsat', setSat);
server.post('/api/setfwfp', setFWFP);
server.post('/api/searchitem', searchItems);
server.post('/api/additem', addItem);
server.post('/api/item/update', updateItem);
server.post('/api/bundleitems/get', getBundleItems);
server.post('/api/itemdownload', itemDownload);

server.get('/api/items/amazon/request', requestAmazonProductsReport);
server.post('/api/items/amazon/download', downloadAmazonProducts);
server.get('/api/items/amazon/images', downloadAmazonProductsImages);

server.post('/api/morelabel/update', updateMorelabel);

server.post('/api/saveScanned', saveScanned);
server.post('/api/resetScanned', resetScanned);

server.post('/api/order/saveLocationSorted', saveLocationSorted);

// Packing
server.get('/api/getnextrecord', getNextRecord);
server.get('/api/getentireorder', getEntireOrder);
server.post('/api/changestatus', changeStatus);
server.post('/api/gettrackorder', getTrackorder);
server.post('/api/searchpackorder', searchPackOrder);
server.get('/api/getordersleft', getOrdersLeft);
server.post('/api/setmorelabel', setMorelabel);

server.post('/api/order/update2', updateOrder2);

server.post('/api/savePackScanned', savePackScanned);

//Packer
server.post('/api/packers/search', searchPacker);

// Management
server.get('/api/config/get', manageConfig);
server.post('/api/config/save', manageConfig);
server.get('/api/users/get', userGet);
server.post('/api/users/login', userLogin);
server.post('/api/users/save', userSave);
server.del('/api/users/remove', userRemove);
server.post('/api/login', login);

// Inventory
server.post('/api/inventory/get', getInventory);
server.get('/api/stock/get', getStock);
server.post('/api/stock/update', updateStock);
server.get('/api/stock/updateitemtable', updateStockItemTable);
server.post('/api/stock/updatequantity', updateStockQuantity);
server.post('/api/inventory/updatestock', updateInventoryStock);

server.post('/api/addproduct', addProduct);
server.post('/api/stockInventory/update', updateStockInventory);
server.post('/api/stockInventory/update2', updateStockInventory2);
server.post('/api/stockInventory/update3', updateStockInventory3);
server.post('/api/stockInventoryBay/update',updateBayStockInventory);
server.del('/api/stockInventoryBay/remove',removeBayStockInventory);
server.post('/api/stockInventoryLocation/update', updateStockInventoryLocation);

server.get('/api/getstorename/hasinventory', getStoreNameHasInventory);

server.post('/api/stockInventory/get', getStockInventory);
server.post('/api/stockInventory/multiget', getMultiStockInventory);
server.get('/api/stockInventory/load/:store', loadStockInventory);
server.get('/api/stockBay/load', loadStockBay);
server.get('/api/stockBayStage/load', loadStockBayStage);
server.get('/api/stockItem/load/:id', loadStockItemsID);
server.get('/api/stockInventory/loadAll/:invID', loadStockInventoryAll);
server.get('/api/pageitemid/load', loadPageItemIDbyBarcode);
server.get('api/stockBayBulk/load/:type', loadStockBayBulk);
server.post('/api/itemTransferBay/update',updateBayTransferItem);
server.post('/api/itemTransferBayBulk/update', bulkUpdateBayTransferItem);
server.get('/api/stockBayInventory/load/:bay', loadStockBayInventory);
server.post('/api/stockBayInventory/load', loadStockBayInventory2);

server.post('/api/updatelocationtype/:bay', updateBayType);
server.get('/api/checklocationvalid/:bay', checkLocationExist);
server.post('/api/createnewlocation', createNewBay);
server.post('/api/createifhasitem', createIfHasItemNewBay);
server.get('/api/checklocationtype/:bay', checkTypeLocation);
server.post('/api/inventorylocation/updateqty', updateQtyinBay);
server.del('/api/inventorylocationid/remove', removeIdInventoryLocation);

server.post('/api/inventory/check', checkInventoryExist);
server.post('/api/inventory/updatequantity', updateInventoryQuantity);
server.post('/api/inventory/search', searchInventory);
server.get('/api/inventory/search2', searchInventory2);
server.get('/api/stockInventory/search/:store', searchStockInventory);

server.post('/api/inventoryLocation/createupdate', updateCreateInventoryLocation);

server.get('/api/stockBrand/load/:brand', loadStockByBrand);
server.post('/api/stockInventory2/get', getStockInventory2);

server.post('/api/stockreceived/byday/:date/:store', stockReceivedByDay);

server.post('/api/download-stock/:store', downloadStock);

server.get("/api/inventory-details", inventoryDetails);
server.get("/api/inventory-details-store", inventoryDetailsStore);
server.get("/api/inventory-details-store-sku", inventoryDetailsStroeSku);

// inventory logs
server.get('/api/transactionlogsBay/load/:type', loadLogBay);
server.get('/api/logBayDetails/load/:bay', loadLogBayDetails);
server.get("/api/transferlogs-baydetails/:bay", transferLogBayDetails);
server.get("/api/transferlogs/get", getTransferLogs);

server.get('/api/downloadinventory/:type', downloadInventory);

server.get('/api/downloadreceivedstock/:supplier', downloadreceivedstock);
server.get('/api/downloadqvbstocksent', downloadqvbstocksent);
server.get('/api/downloadb2bweights/:store', downloadB2BWeights);

// Customers
server.get('/api/updatecustomers', updateCustomers);
server.get('/api/getcustomers', getCustomers);
server.post('/api/getcustomers', getCustomers);

server.post('/api/addbuyerdata',addBuyerDetails);
server.get('/api/b2bbuyernames/get',getBuyerNames);
server.post('/api/addsupplierdata',addSupplierDetails);
server.get('/api/suppliers/get',getSuppliers);
server.get('/api/purchaseordersAll/get',getAllPurchaseOrders);
server.post('/api/purchaseorders/get',getPurchaseOrders);
server.get("/api/transactionlogs/get", getTransactionLogs);
server.get("/api/transactionlogs/getbydocketno", getTransactionLogsByDocketNo);

server.post('/api/orders/manage/collectlogs/load', loadManageOrdersCollectLogs);

server.post('/api/weight/get', getWeight);
server.post('/api/weight/update', updateWeight);

server.post('/api/await/update', updateAwait);

server.get("/api/clients/stat/:client", clientStat);
server.get("/api/clients/inventory", clientInventory);
server.get("/api/clients/inventorydetail", clientInventoryDetail); 
server.post('/api/clients/addproduct', clientAddProduct);
server.post('/api/clients/addorder', clientAddOrder);

server.get("/api/orders/stat/:store", ordersStat);
//total orders packed by user
server.post('/api/totalpacked/:date', ordersPackedByUser);

server.get("/api/buyer-details-byorderid", buyerDetails);

//brand
server.get("/api/brand-details", brandDetails);

//category
server.get("/api/category-details", categoryDetails);


server.get("/api/user-order-status-tracking", userOrderTrackingStatus);

//Fullfilled orders
server.get("/api/fullfilled-orders", fullfilledOrderDetailsByStore);
server.get("/api/order-by-store-orderid", orderByStoreOrderid);
// Get Pictures
server.get(/\/pictures\/(.*)?.*/, restify.plugins.serveStatic({
  directory: '../'
}))

server.get('/pictures/', (req, res, next) => {
	fs.readdir('../pictures', (err, files) => {
		res.set({
			'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
			'Pragma': 'no-cache',
		});
		res.json(200, files);
		next();
	});

})

var job = new cron.CronJob({
	cronTime: '00 00,30 * * * 1-5',
	onTick: function() {
		autoAcceptCatchOrders();
	},
	start: true, 
	timeZone: 'Australia/Sydney'
});
job.start()


server.post('/api/upload', upload);

server.listen(8006);
//server.listen(8001);
 
 