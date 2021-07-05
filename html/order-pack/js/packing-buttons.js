// Buttons

import {removeNotification} from './utils.js';
//import {loaddata, getRecordData} from './load-data.js';
import {loaddata} from './load-data.js';
import {showTracking} from './show-order.js';


// Listener function for buttons
document.addEventListener('DOMContentLoaded', function () {
    // "Next Order" button
    $('#record-container').on('click', '.next', function () {
        nextOrder(getRecordData());
    });

    // "Override" button
    $('#record-container').on('click', '.override', function () {
        overrideOrder(getRecordData());
    });

    // Do Order later button
    $('#record-container').on('click', '.later', function () {
        //console.log(getRecordData());
        doOrderLater(getRecordData());
    });
    //document.querySelector('#record-container .later').addEventListener('click', doOrderLater(getRecordData()));

    // Save tracking button
    $('#record-container').on('click', '.save-track', function () {
        saveTrack(getRecordData());
    });

    // Logout button
    $('#header').on('click', '.logout', function () {
        logout(getRecordData());
    });

    //increase value
    $('#record-container').on('click', '.increaseValue', function() {
        increaseValue();
    });

    //decrease value
    $('#record-container').on('click', '.decreaseValue', function() {
        decreaseValue();
    });

    //send more labels for printing
    $('#record-container').on('click', '.sendLabels', function() {
        // console.log('111');
        sendMoreLabelOrder(getRecordData());
    });

    $('#record-container').on('click', '.saveWeight', function() {
        // console.log('111');
        saveWeight();
    });

    $('#record-container').on('click', '.saveParcelWeightBtn', function () {
        saveParcelWeights();
    });
});

async function changeStatus(recordData, status) {
    try {
        removeNotification();
        let result = await changeStatusHttp(recordData, status);
        if (result == 'success') {
            return result;
            // loaddata(packername, pageType);
        } else if (result == 'timeout') {
            alert('You have been timed out due to inactivity. ' +
                'You will now be redirected to the main page.');
            window.location.href = 'index.html';
        } else {
            throw 'Failed to update status.';
        }
    } catch (error) {
        console.log(error);
    }
}

async function changeStatusHttp(recordData, status) {
    let response = await fetch(getChangeStatusUrl(recordData,
        status), {method: 'post',
        headers: {'DC-Access-Token': window.userDetails.usertoken}});
    let data = await response.json();

    return data.result;
}

async function saveTrackAction(recordData) {
    
    /*if (pageType != 3) {
        return 'success';
    }*/

    let formData = new FormData();
    let trackingNo = document.querySelector(".save-track").textContent;


    if (!trackingNo) {
        notification.show('Please scan your tracking number!');
        return;
    }

    var recordData = JSON.parse(recordData);
    let obj = {};
    for (let record of recordData) {
        let orderID = record[1];
        obj[orderID] = trackingNo;
    }
    

    let trdata = JSON.stringify(obj);


    formData.append('tdata', trdata);

    let response = await fetch(apiUrls.saveTrackingUrl, {method: 'post',
        headers: {'DC-Access-Token': window.userDetails.usertoken}, body: formData});
    let data = await response.json();

    return data.result;
}

// Changes status of order to the packed status and executes loaddata()
// again to move to next order
async function nextOrder(recordData) {
    try {
        if (!weightDone) {
            notification.show('Save weight before moving to next order.');
            return;
        }
        document.getElementsByClassName('.next').disabled = true;
        if (await changeStatus(recordData, ORDER_STATUS.PACKED)
            == 'success') {
                
                if (scanMode) {
                    window.location.href = PACKING_SCAN_URL;
                } else {
                    window.scanFlatTrack = false;
                    loaddata(packername, pageType);
                    showTracking();
                }     
            
        } else {
            document.getElementsByClassName('.next').disabled = false;
        }
       
    } catch (error) {
        console.log(error);
    }
}

// Changes status of order to the override status and executes loaddata()
// again to move to next order
async function overrideOrder(recordData) {
    try {
        if (!weightDone) {
            notification.show('Save weight before moving to next order.');
            return;
        }
        document.getElementsByClassName('.override').disabled = true;
        if (await changeStatus(recordData, ORDER_STATUS.OVERRIDE)
            == 'success') {
                
                if (scanMode) {
                    window.location.href = PACKING_SCAN_URL;
                } else {
                    window.scanFlatTrack = false;
                    loaddata(packername, pageType);
                    showTracking();
                }     
        } else {
            document.getElementsByClassName('.override').disabled = false;
        }
        
    } catch (error) {
        console.log(error);
    }
}

// Changes status of order to the do order later status and executes loaddata()
// again to move to next order
async function doOrderLater(recordData) {
    try {

        document.getElementsByClassName('.later').disabled = true;
        if (await changeStatus(recordData, ORDER_STATUS.DO_ORDER_LATER)
            == 'success') {
            if (scanMode) {
                    window.location.href = PACKING_SCAN_URL;
                } else {
                    window.scanFlatTrack = false;
                    loaddata(packername, pageType);
                    showTracking();
                }     
        } else {
            document.getElementsByClassName('.later').disabled = false;
        };
    } catch (error) {
        console.log(error);
    }
}

// Save Tracking
async function saveTrack(recordData) {
    try {
        let trBtn = document.querySelector('.save-track');
        //console.log(trBtn.textContent);
        if (!scanFlatTrack) {
            trBtn.classList.remove('btn-green');
            trBtn.classList.add('btn-dblue');
            trBtn.disabled = true;
            trBtn.textContent = 'Awaiting scan...';
            scanFlatTrack = true;
        }else{
            if (await saveTrackAction(recordData) == 'success') {
                trBtn.classList.remove('btn-dblue');
                trBtn.classList.add('btn-green');
                scanFlatTrack = false;
                notification.show('Tracking Number saved!');
                document.querySelector('.next').disabled = false;
            } else {
                trBtn.disabled = false;
            };
            
        }
        
        
    } catch (error) {
        console.log(error);
    }
}

// Changes status of order to the ready to pack status and redirects to index
async function logout(recordData) {
    try {
        removeNotification();
        if (getRecordData() == undefined) {
            window.location.href = 'index.html';
        } else {
            if (await changeStatus(recordData, ORDER_STATUS.READY_TO_PACK)
                == 'success') {
                window.location.href = 'index.html'
            }
        }
    } catch (error) {
        console.log(error);
    }
}

// Returns the URL for changing a status in the database
function getChangeStatusUrl(recordData, status) {
    return apiUrls.changeStatusUrl + '?recordData=' + recordData +
        '&status=' + status;
}

function getRecordData() {
    return document.querySelector('.record-title') ? document.querySelector('.record-title').dataset.records : undefined;
}

async function updateStock() {
    //console.log(window.orderDetails);
    let items = window.orderDetails.Items;
    //console.log(items);
    let locationSelected = window.orderDetails.locationSelected;
    
    let uselocselected = true;

    for (let locsel of locationSelected) {
        if (locsel==null) {
            uselocselected = false;
        }
    }

    let lineitemLocation = {};

    for (let orderLocation of locationSelected) {
        for (let lineitemid in orderLocation) {
            lineitemLocation[lineitemid] = orderLocation[lineitemid];
        }
    }
    
    if (uselocselected) {
        /*let qvbQtys = [];
        let whQtys = [];
        for (let locsel of locationSelected) {
            for (let lineitemid in locsel) {
                for (let loc of locsel[lineitemid]) {
                    if (loc.id=='qvb') {
                        qvbQtys.push([loc.invid, loc.indivQty]);
                    } else {
                        whQtys.push([loc.id, loc.indivQty, loc.cartonQty]);
                    }
                }
            }
        }

        let formData = new FormData();
        formData.append('subtractfromqvbqtys', JSON.stringify(qvbQtys));
        formData.append('subtractfromwhqtys', JSON.stringify(whQtys));

        let response = await fetch(apiServer+'stockInventory/update', {method: 'post', body: formData});
        let updateStockInventoryData = await response.json();

        if (response.ok && updateStockInventoryData.result == 'success') {
            //await loadInventoryDetails({'singleItemBarcode': singleItemBarcode, 'sku': sku, 'customSku': customSku})
            notification.show("Item updated successfully.");
        }
        else {
            notification.show(updateStockInventoryData.result);
            return 'success';
        }*/

        let qvbQtys = [];
        let pickQtys = [];
        let bulkQtys = [];
        let locQtys = [];
        for (let item of items) {
            if (item.partialrefund=='1') continue;

            if (lineitemLocation.hasOwnProperty(item.LineItemID)) {
                let itemLocations = lineitemLocation[item.LineItemID];
                if (itemLocations.length) {
                    for (let loc of itemLocations) {
                        if (loc.id=='qvb') {
                            qvbQtys.push([loc.invid, loc.indivQty]);
                        } else if (loc.id=='pick') {
                            pickQtys.push([loc.invid, loc.indivQty]);
                        } else if (loc.id=='bulk') {
                            bulkQtys.push([loc.invid, loc.indivQty]);
                        } else {
                            locQtys.push([loc.id, loc.indivQty])
                        }
                    }
                    continue;
                }
            }     
            
            let store = item.storeID;
            let sku = item.SKU;
            let customSku = item.customSku;
            let itemNum = item.ItemNum;
            let cartonBarcode = item.barcode;
            let singleItemBarcode = item.singleItemBarcode;
            let cartonMultiple = item.multiple || 0;
            let singleItemMultiple = item.singleItemMultiple;
            let qtyOrdered =  item.Quantity;
            await loadInventoryDetails({'singleItemBarcode': singleItemBarcode, 'sku': sku, 'customSku': customSku});

            let inventoryDetail = inventoryDetails[customSku || singleItemBarcode]
            if (!inventoryDetail) continue;
            let quantityPerCarton = inventoryDetail[0].quantityPerCarton;

            //console.log(inventoryDetails);
            let indivQty = singleItemMultiple*qtyOrdered;
            let cartonQty = cartonMultiple*qtyOrdered;

            let qty = cartonBarcode  != "null" ? (quantityPerCarton*cartonMultiple+singleItemMultiple)*qtyOrdered : singleItemMultiple*qtyOrdered;
                   
            if (checkExistsInInventory(singleItemBarcode,sku,customSku)) {
                // Update the database
                let formData = new FormData();
                formData.append('store', store);
                formData.append('itemBarcode', singleItemBarcode);
                formData.append('customSku', customSku);
                formData.append('sku', sku);
                /*formData.append('stockInHand', window.inventoryDetails[inventoryItem].stockInHand);
                formData.append('stockSent', window.inventoryDetails[inventoryItem].stockSent);*/
           
                formData.append('subtractReservedQuantity', qty);
                formData.append('subtractfromwhlooseQty', indivQty);
                formData.append('subtractfromwhcartonQty', cartonQty);
                //formData.append('subtractfromstock', qty);
                let response = await fetch(apiServer+'stockInventory/update', {method: 'post', body: formData});
                let updateStockInventoryData = await response.json();

                if (response.ok && updateStockInventoryData.result == 'success') {
                    //await loadInventoryDetails({'singleItemBarcode': singleItemBarcode, 'sku': sku, 'customSku': customSku})
                    notification.show("Item updated successfully.");
                }
                else {
                    notification.show(updateStockInventoryData.result);
                    //return 'success';
                }

            }
            
        }

        let formData = new FormData();
        let reservedQtys = qvbQtys.concat(pickQtys).concat(bulkQtys);
        formData.append('subtractfromqvbqtys', JSON.stringify(qvbQtys));
        formData.append('subtractfrompickqtys', JSON.stringify(pickQtys));
        formData.append('subtractfrombulkqtys', JSON.stringify(bulkQtys));
        formData.append('subtractfromlocqtys', JSON.stringify(locQtys));
        formData.append('subtractfromReservedQtys', JSON.stringify(reservedQtys));

        let response = await fetch(apiServer+'stockInventory/update', {method: 'post', body: formData});
        let updateStockInventoryData = await response.json();

        if (response.ok && updateStockInventoryData.result == 'success') {
            
        }
        else {
            notification.show(updateStockInventoryData.result);
        }

    } else {
        
        for (let item of items) {
            if (item.partialrefund=='1') continue;
        
            let store = item.storeID;
            let sku = item.SKU;
            let customSku = item.customSku;
            let itemNum = item.ItemNum;
            let cartonBarcode = item.barcode;
            let singleItemBarcode = item.singleItemBarcode;
            let cartonMultiple = item.multiple || 0;
            let singleItemMultiple = item.singleItemMultiple;
            let qtyOrdered =  item.Quantity;
            await loadInventoryDetails({'singleItemBarcode': singleItemBarcode, 'sku': sku, 'customSku': customSku});

            let inventoryDetail = inventoryDetails[customSku || singleItemBarcode]
            if (!inventoryDetail) continue;
            let quantityPerCarton = inventoryDetail[0].quantityPerCarton;

            //console.log(inventoryDetails);
            let indivQty = singleItemMultiple*qtyOrdered;
            let cartonQty = cartonMultiple*qtyOrdered;

            let qty = cartonBarcode  != "null" ? (quantityPerCarton*cartonMultiple+singleItemMultiple)*qtyOrdered : singleItemMultiple*qtyOrdered;
                   
            if (checkExistsInInventory(singleItemBarcode,sku,customSku)) {
                // Update the database
                let formData = new FormData();
                formData.append('store', store);
                formData.append('itemBarcode', singleItemBarcode);
                formData.append('customSku', customSku);
                formData.append('sku', sku);
                /*formData.append('stockInHand', window.inventoryDetails[inventoryItem].stockInHand);
                formData.append('stockSent', window.inventoryDetails[inventoryItem].stockSent);*/
           
                formData.append('subtractReservedQuantity', qty);
                formData.append('subtractfromlooseQty', indivQty);
                formData.append('subtractfromcartonQty', cartonQty);
                //formData.append('subtractfromstock', qty);
                let response = await fetch(apiServer+'stockInventory/update', {method: 'post', body: formData});
                let updateStockInventoryData = await response.json();

                if (response.ok && updateStockInventoryData.result == 'success') {
                    //await loadInventoryDetails({'singleItemBarcode': singleItemBarcode, 'sku': sku, 'customSku': customSku})
                    notification.show("Item updated successfully.");
                }
                else {
                    notification.show(updateStockInventoryData.result);
                    //return 'success';
                }

            }
            
        }

    }

    return 'success';
  
}

async function checkExistsInInventory(barcode, sku, customSku) {
    var exists = false;

    try {

        let formData = new FormData();
        formData.append('barcode', barcode);
        formData.append('sku', sku);
        formData.append('customSku', customSku);

        let response = await fetch(apiServer+'inventory/check', {method: 'post', body: formData})

        let data = await response.json();

        if (response.ok) {
            if (data.result == 'success') {
                exists = data.exist == 'true' ? true : false;
            }
            else {
                notification.show(data.result);
            }
        }
        else {
            notification.show('Error: '+data.result);
        }

        

    } catch(e) {
        notification.show('Error: Could not connect to the server.');
        console.log(e);
    }

    /*if (exists) {
        document.getElementById('exists-inventory').innerText = "This item already exists in the inventory. Please only update the quantities.";
    } else {
        document.getElementById('exists-inventory').innerText = "This item is not in the inventory";
    }*/
    
    return exists;
}

function getStock(recordData) {
    let records = JSON.parse(recordData);
    let stockData = {};
    try {
        for (let record of records) {
            let store = record[0];
            let orderID = record[1];
            let items = saleRecords[store].records[orderID].Items;
            for (let item of items) {
                let stocks = JSON.parse(item.stock);
                let qunatity = item.Quantity;

                for (let stock in stocks) {
                    //console.log(stock);
                    let multiple = stocks[stock];
                    if (stockData.hasOwnProperty(stock)) {
                        stockData[stock] = stockData[stock] + multiple*qunatity;
                    }else{
                        stockData[stock] = multiple*qunatity;
                    }
                    //console.log(stockData);
                }

            }
        }

        return stockData;
    }catch(e){
        return 'nostockdata';
    }
}

async function loadInventoryDetails(item) {
    //console.log(item);
    let formData = new FormData();
    /*if (item.singleItemBarcode) {
        formData.append('barcode', item.singleItemBarcode);
    } else if (item.sku) {
        var sku = formatSku(item.sku);
        formData.append('sku', sku);
    } else if (item.num) {
        formData.append('itemNum', item.num);
    }*/

    if (item.singleItemBarcode) {
        formData.append('barcode', item.singleItemBarcode);
    } 
    if (item.sku) {
        var sku = formatSku(item.sku);
        formData.append('sku', sku);
    }
    if (item.customSku) {
        formData.append('customSku', item.customSku);
    }

    let response = await fetch(apiServer+'stockInventory/get', {method: 'post', body: formData});
    let inventoryData = await response.json();
    //console.log(inventoryData);
    if (response.ok && inventoryData.result == 'success') { 
        let inventorys = inventoryData.inventory;
        for (let inv in inventorys) {
            if (!inventoryDetails[inv]) {
                inventoryDetails[inv] = [];
                inventoryDetails[inv].push(inventorys[inv]);
            } else {
                let invens = inventoryDetails[inv];
                //console.log(invens);
                let exist = false;
                for (let i=0; i<invens.length; i++) {
                    if (invens[i].id == inventorys[inv].id) {
                        exist = true;
                        invens.splice(i,1);
                        invens.push(inventorys[inv]);
                        break;
                    }
                }
                if (!exist) {
                    inventoryDetails[inv] = invens.push(inventorys[inv]);
                }
            }
        }
    }
    else {
        notification.show(inventoryData.result);
    }
}


function formatSku(itemSku) {
    if (itemSku == undefined) return itemSku;
    let sku = (itemSku).replace(/flatpack/ig,'').replace(/ff/ig,'').replace(/parcel/ig,'').trim();
    let skus = sku.split('-');

    if (!isNaN(skus[1]) && parseInt(skus[1])>100000000000) {
        sku = skus[0].trim();
    }
    let skus2 = sku.split('_');
    if (!isNaN(skus2[1])) {
        sku = skus2[0].trim();
    }

    return sku;
}

function increaseValue() {
    // console.log('inc');
    let value = parseInt(document.getElementById('labelTextBox').value, 10);
    value = isNaN(value) ? 0: value;
    value++;

    document.getElementById('labelTextBox').value = value;

}

function decreaseValue() {
    // console.log('dec');
    let value = parseInt(document.getElementById('labelTextBox').value, 10);
    value = isNaN(value) ? 0: value;
    value < 1 ? value = 1 : '';
    value--;

    document.getElementById('labelTextBox').value = value;
}

async function sendMoreLabelOrder(recordData) {
    
    let value = document.getElementById('labelTextBox').value;
    let dbid = document.querySelector('.record-db-id').textContent;
    // console.log(value);
    
    let formData = new FormData();
    
    formData.append('dbid', dbid);
    formData.append('morelabel', value);
    

    let response = await fetch(apiServer+'setmorelabel', {method: 'post', body: formData});
    let result = await response.json();

    if (response.ok && result.result == 'success') { 
        notification.show('Order updated!');
    }
    else {
        notification.show(result.result);
    }
}

async function saveWeight() {
    
    let value = document.getElementById('weightTextBox').value;
    if (isNaN(value) == true){
        alert(value+' is not a valid number.');
        document.getElementById('weightTextBox').value = null;
        return;
    }
    else if (value < 0.05 || value > 30){
        alert(value+'kg is out of range.');
        document.getElementById('weightTextBox').value = null;
        return;
    }
    let dbidstr = document.querySelector('.record-db-id').textContent;
    // console.log(value);
    
    let dbids = dbidstr.split(', ');

    
    let formData = new FormData();
    
    formData.append('record', JSON.stringify(dbids));
    formData.append('weight', value);
    
    let response = await fetch(apiServer+'order/update2', {method: 'post', headers: {'DC-Access-Token': userDetails.usertoken}, body: formData});
    let result = await response.json();

    if (response.ok && result.result == 'success') { 
        window.weightDone = true;
        notification.show('Parcel weight updated.');
    }
    else {
        notification.show(result.result);
    }
    

    if (dbids.length==1) {
        let trs = document.querySelectorAll('.record-items tbody tr');
        if (trs.length == 1) {
            let itemID = trs[0].dataset.id;
            let qty = trs[0].dataset.quantity;

            let actualWeight = parseFloat(value)/parseInt(qty);

            let formData1 = new FormData();
        
            formData1.append('id', itemID);
            formData1.append('itemWeight', actualWeight);
            
            let response1 = await fetch(apiServer+'item/update', {method: 'post', headers: {'DC-Access-Token': userDetails.usertoken}, body: formData1});
            let result1 = await response1.json();

            if (response1.ok && result1.result == 'success') { 
                notification.show('Item actual weight updated.');
            }
            else {
                notification.show(result1.result);
            }
        }
    }
        
}

async function saveParcelWeights() {

    let dbidstr = document.querySelector('.record-db-id').textContent;
    // console.log(value);

    let dbids = dbidstr.split(', ');

    let trackingNumbers = [];
    let weights = [];
    let types = [];

    let parcelWeights = [];

    $('.parcelWeight').each(function (index, item) {
        let parcelWeight = {};
        parcelWeight['type'] = $(item).parent().prev().text().trim();
        parcelWeight['weight'] = parseFloat($(item).val());
        parcelWeight['trackingNumber'] = $(item).parent().prev().prev().text().trim();
        parcelWeights.push(parcelWeight);
    });

    for (let pw of parcelWeights) {
        let value = pw.weight;
        if (isNaN(value) == true){
            alert(value+' is not a valid number.');
            return;
        }
        else if (value < 0 || value > 30){
            alert(value+'kg is out of range.');
            return;
        }
    }
        

    let formData = new FormData();

    formData.append('record', JSON.stringify(dbids));
    formData.append('parcelWeights', JSON.stringify(parcelWeights));

    let response = await fetch(apiServer + 'order/update2', { method: 'post', headers: { 'DC-Access-Token': userDetails.usertoken }, body: formData });
    let result = await response.json();

    if (response.ok && result.result == 'success') {
        window.weightDone = true;
        notification.show('Parcel weight updated.');
    }
    else {
        notification.show(result.result);
    }

    if (dbids.length == 1) {
        let trs = document.querySelectorAll('.record-items tbody tr');
        if (trs.length == 1 && parcelWeights.length==1) {
            let itemID = trs[0].dataset.id;
            let qty = trs[0].dataset.quantity;

            let actualWeight = parseFloat(parcelWeights[0].weight) / parseInt(qty);

            let formData1 = new FormData();

            formData1.append('id', itemID);
            formData1.append('itemWeight', actualWeight);

            let response1 = await fetch(apiServer + 'item/update', { method: 'post', headers: { 'DC-Access-Token': userDetails.usertoken }, body: formData1 });
            let result1 = await response1.json();

            if (response1.ok && result1.result == 'success') {
                notification.show('Item actual weight updated.');
            }
            else {
                notification.show(result1.result);
            }
        }
    }
}

export {
    nextOrder,
    overrideOrder,
    doOrderLater,
    logout
}