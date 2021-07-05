// Load Data

import { showOrder, showErrorOrder } from './show-order.js';
import { getItemDetails } from './itemsDB.js';
import { getVariation, checkDone, enableNext } from './utils.js';
import {showDone} from './show-done.js';

var RECORD_DATA;
var TRACKING_BARCODES;

// Loads up data and prepares it to be displayed
async function loaddata() {
    var order;
    // let track = 0;
    try {
        // Response Y when server finds an order that's been taken or is completed
        // status = 2, packername !=, status = 3
        if (scanMode) {
            
            let record = JSON.parse(localStorage.getItem('recordID'))
            /*let type = record[0].type;
            localStorage.setItem('pageType', type);
            window.pageType = localStorage.pageType;*/

            //console.log(record);

            var entireOrderRecs = findEntireOrder(record);

            order = await getEntireOrder(entireOrderRecs);
            //console.log(order);
            if (order.check != 'Y') {
                var orderDetails = await getOrderDetails(order.entireOrder);
                window.orderDetails = orderDetails;
                if (orderDetails instanceof Error) {
                    throw orderDetails;
                }
                updateTrackingBarcode(order.entireOrder[0].trackingID);
                await showOrder(orderDetails, TRACKING_BARCODES);
                // Allow for moving to next order if no scanning is required
                enableNext(checkDone());
                
            }

        }else{
            do {
                // Next single order
                var nxtorder = await getNextOrder(pageType, packername);       // return collection.*
                if (nxtorder == null) {
                    break;
                }
                //console.log(nxtorder);
                // Look for entire order (with combined orders)
                var entireOrderRecs = findEntireOrder(nxtorder); 
                //console.log(entireOrderRecs);               
                // [[store,dbid],[store,dbid]]
                order = await getEntireOrder(entireOrderRecs);
                if (order.check != 'Y') {
                    var orderDetails = await getOrderDetails(order.entireOrder);
                    window.orderDetails = orderDetails;
                    if (orderDetails instanceof Error) {
                        throw orderDetails;
                    }
                    updateTrackingBarcode(order.entireOrder[0].trackingID);
                    await showOrder(orderDetails, TRACKING_BARCODES);
                    // Allow for moving to next order if no scanning is required
                    enableNext(checkDone());
                    break;
                }

            // Loop until entire order != 'Y' (order not taken or not completed)
            } while (order.check == 'Y');
        }
    } catch (e) {
        console.log(e);
        if (e.name == 'orderError') showErrorOrder(order.entireOrder);
    }
};

// Get the entire order from connectedRecords (combined orders)
function findEntireOrder(nxtorder) {
    var entireOrderRecs = saleRecords[getStoreNumber(nxtorder[0].orderID)]
            .connected[nxtorder[0].orderID];

	return entireOrderRecs;
}

// Gets the next order (single order, possibly in a combined order)
async function getNextOrder() {
    try {
        let response = await fetch(getNextOrderUrl(),
            {headers: {'DC-Access-Token': window.userDetails.usertoken}});
        let data = await response.json();

        if (data.result === 'NO ORDERS') {
            showDone();
            // window.location.href = 'donescreen.html';
        } else {
            return data.record;
        }
    } catch (e) {
        console.error(e);
        notification.show('Error: Could not retrieve the next order.');
    }
}

// Get URL from config for AJAX (URL function: get next order)
function getNextOrderUrl() {
    var url;
    var sendType = 'type=' + pageType;
    var sendStore = 'store=' + packStore;

    url = apiUrls.getNextUrl + '?' + sendType +'&'+sendStore;
    
    return url;
}

// Check db for status and mark processing if ready to pack or do order later.
// getEntireOrderUrl in config file
async function getEntireOrder(entireOrderRecs) {
	try {
		// json stringify to send and parse json on server
        //console.log(entireOrderRecs);
		var recordData = JSON.stringify(entireOrderRecs);
        //console.log(recordData);
		updateRecordData(recordData);
        let response = await fetch(apiUrls.getEntireOrderUrl + '?recordData=' +
            recordData + '&type=' + pageType,
            {headers: {'DC-Access-Token': userDetails.usertoken}});
        let data = await response.json();
        if (Object.keys(data.result).length == 0 
            && data.result.constructor == Object) {
            throw 'getEntireOrder error: Empty response.';
        }

	    return data;
	} catch (e) {
        console.log(e);
        notification.show('Error: Could not retrieve the entire order.');
	}
}

// Updates the RECORD_DATA global variable
function updateRecordData(recordData) {
	RECORD_DATA = recordData;
}

// Retrieve current record data (array of orders [storenumber, record number])
function getRecordData() {
	return RECORD_DATA;
}

// Put all data related to the item into item details
async function getOrderDetails(entireOrder) {
    try {
        // Get data from SaleRecords
        var orderDetails = await getSaleRecordsDetails(entireOrder);
        if (orderDetails instanceof Error) throw orderDetails;
        // Only use BuyerFullName, PaidDate and UserID of first order
        orderDetails.BuyerFullName = orderDetails.BuyerFullName[0];
        orderDetails.PaidDate = orderDetails.PaidDate[0];
        orderDetails.UserID = orderDetails.UserID[0];

        await getItemDetails(orderDetails.Items); // Get data from database

        return orderDetails;
    } catch (e) {
        console.log(e);
        notification.show('Error: Could not retrieve order details.');
        var orderError = new Error('Could not retrieve order details.');
        orderError.name = 'orderError';
        return orderError;
    }
}

// Retrieves item details from saleReco rds
async function getSaleRecordsDetails(entireOrder) {
    try {
        var orderDetails = {
            BuyerFullName: [],
            SalesRecordID: [],
            DatabaseID: [],
            UserID: [],
            PaidDate: [],
            Items: [],
            NotesToSelf: [],
            manualMessages: [],
            bucketNumbers: [],
            orderCount: 0,
            variations: [],
            locationSelected: [],
            parcelWeights: [],
        }; // Order details with details to get from sale records
    
        // Finds data from saleRecords/entireOrder to put into orderDetails
        for (var i = 0; i < entireOrder.length; i++) {
            var storeNum = getStoreNumber(entireOrder[i].orderID);
            if (storeNum instanceof Error) {
                throw new Error('Could not find store number.');
            }
            var saleRecord = saleRecords[storeNum]
                    .records[entireOrder[i].orderID];
            var saleRecordToday = saleRecords[storeNum]
                    .today[entireOrder[i].orderID];
    
            orderDetails.BuyerFullName.push(saleRecord.BuyerFullName);
            orderDetails.SalesRecordID.push([
                storeNum,
                saleRecord.SalesRecordID]);
            orderDetails.DatabaseID.push(saleRecord.DatabaseID);
            orderDetails.UserID.push(saleRecord.UserID);
            orderDetails.PaidDate.push(saleRecord.PaidDate);
            orderDetails.locationSelected.push(JSON.parse(saleRecordToday.locationselected));
            orderDetails.parcelWeights.push(saleRecordToday.parcelWeights ? JSON.parse(saleRecordToday.parcelWeights) : []);

            let isReplacement = false;

            for (let item of saleRecord.Items) {
                if (item.ReplacedItem) {
                    isReplacement = true;
                    break;
                }
            }
            
            for (let j = 0; j < saleRecord.Items.length; j++) {
                let split = false;
                saleRecord.Items[j].orderID = entireOrder[i].orderID;
                var orderItem = saleRecord.Items[j];
                if (isReplacement) {
                    if (!orderItem.ReplacedItem) {
                        continue;
                    } else {
                        orderItem.SKU = orderItem.ReplacedItem.sku;
                        orderItem.ItemTitle = orderItem.ReplacedItem.name;
                        orderItem.Sent = orderItem.ReplacedItem.sent;
                        orderItem.SalePrice = orderItem.ReplacedItem.price;
                        orderItem.ItemNum = orderItem.ReplacedItem.itemID;
                        orderItem.Quantity = orderItem.ReplacedItem.quantity;
                    }
                } 
                orderItem.storeID = storeNum;
                let qty = parseInt(orderItem.Quantity);
                let price = parseFloat(orderItem.SalePrice);

                let itemNum = orderItem.ItemNum;
                let itemSku = orderItem.SKU;
                let items = [];
                let skus = [];
                
                if (itemNum) {
                    items.push([itemNum, storeNum]);
                } else if (itemSku) {
                    skus.push([itemSku, storeNum]);
                }

                let formData = new FormData();
                formData.append('items', JSON.stringify(items));
                formData.append('skus', JSON.stringify(skus));

                let response = await fetch(apiUrls.getItemDetailsUrl, {method:'post', headers: {'DC-Access-Token': userDetails.usertoken}, body: formData});
                let data = await response.json();

                if (data.items && data.items.length > 0) {

                    let itemDetails = data.items;

                    //console.log(itemDetails);

                    for (let itemDetail of itemDetails) {
                        if (storeNum==51 & itemDetail.sku == itemSku) {
                            saleRecord.Items[j].ItemTitle = itemDetail.name;
                        }
                        /*if (storeNum==74 & itemDetail.sku == itemSku & itemDetail.storeID == storeNum) {
                            saleRecord.Items[j].ItemTitle = itemDetail.name;
                        }*/
                        if ((itemNum && itemSku && itemDetail.num == itemNum && itemDetail.sku == itemSku) 
                               || ((storeNum==36 || storeNum==37) && storeNum==itemDetail.storeID && itemSku==itemDetail.sku)) {
                            if (itemDetail.bundle) {
                                let bundleItemList = [];
                                let bundle = JSON.parse(itemDetail.bundle);
                                let num = Object.values(bundle).reduce((a,b) => a+b);
                                let count = Object.values(bundle).length;

                                for (let itemID in bundle) {
                                    if (!bundleItemList.includes(itemID)) {
                                        bundleItemList.push(itemID);
                                    }
                                }

                                let formData2 = new FormData();
                                formData2.append('bundleitems', JSON.stringify(bundleItemList));
                                let response2 = await fetch(apiUrls.getBundleItemsUrl, {method: 'post', headers: {'DC-Access-Token': userDetails.usertoken}, body: formData2});
                                let data2 = await response2.json();
                                let bundleItems = data2.items;
                                
                                let k = 1;
                                for (let bundleItemID in bundleItems){
                                    let Item = bundleItems[bundleItemID];
                                
                                    Item['Quantity'] = qty*parseInt(bundle[bundleItemID]);
                                    Item['SalePrice'] = price/num;
                                    Item['storeID'] = storeNum;
                                    Item['VariationDetails'] = "";
                                    Item['Parts'] = itemSku + ' ' + k + '/' + count;
                                    k++;
                                    orderDetails.Items.push(Item);
                                }

                                split = true;

                            }
                        }
                    }
                }

                if (!split) orderDetails.Items.push(saleRecord.Items[j]);
            }

            //console.log(orderDetails);
            orderDetails.NotesToSelf.push(saleRecord.NotesToSelf);
            
            // Push notes > message, push empty message if none.
            if (entireOrder[i].notes != null) {
                orderDetails.manualMessages.push(entireOrder[i].notes);
            } else {
                orderDetails.manualMessages.push('');
            }
            // Get bucket numbers
            if (entireOrder[i].groupID != null) {
                orderDetails.bucketNumbers.push(entireOrder[i].groupID);
            }
            // Get item variations
            for (let j = 0; j < orderDetails.Items.length; j++) {
                if (getVariation(orderDetails.Items[j].ItemTitle) !=  null) {
                    orderDetails.Items[j].Variations = 
                        getVariation(orderDetails.Items[j].ItemTitle);
                } else {
                    orderDetails.Items[j].Variations = null;
                }
            }
            orderDetails.orderCount++;
        }
        return orderDetails;
    } catch (e) {
        console.log(e);
        var sRError = new Error('Unable to retrieve SaleRecords details.');
        return sRError;
    }
}

function getStoreNumber(orderID) {
    for (let key in saleRecords) {
        if (saleRecords[key].records[orderID]) {
            return key;
        } else if (saleRecords[key].connected[orderID]) {
            return key;
        } else if (saleRecords[key].today[orderID]) {
            return key;
        }
    }

    var e = new Error('Unable to find store for orderID: ' + orderID);
    console.log(e);
    return e;
}

// Updates TRACKING_BARCODES
function updateTrackingBarcode(trackingID) {
    TRACKING_BARCODES = trackingID; // Update tracking barcode for current order
}

// Retreive tracking label barcode
function getTrackingBarcodes() {
    return TRACKING_BARCODES;
}

export {
	loaddata,
	getRecordData,
    getTrackingBarcodes,
    getStoreNumber
}