// Items DB

import {getVariation, checkSameVariation, checkItemBarcode} from './utils.js';

// Get details of items from the database
async function getItemDetails(Items) {
    var itemList = [];
    var itemDBDetails;

    itemList = getItemNums(Items);
    itemDBDetails = await getItemDBDetails(itemList);

    if (itemDBDetails.length > 0) {
        fixDCChar(itemDBDetails); // Fix ? to ツ (Symbol for DC)
        mergeItemDetails(Items, itemDBDetails);
        for (let i = 0; i < Items.length; i++) {
            if (!checkItemBarcode(Items[i].barcode)) {
                notification.show('One or more items do not have a barcode. ' +
                    'Please make sure to pack the correct item with the ' +
                    'correct amount.', {hide: false});
            }
        }
    }
}

// Retrieve item data from database
async function getItemDBDetails(itemList) {
    try {
        let response = await fetch(getItemsUrl(itemList),
            {headers: {'DC-Access-Token': window.userDetails.usertoken}});
        let itemData = await response.json();

        if (itemData.result == 'success' && 
            Object.keys(itemData.items[0]).length > 0 &&
            itemData.items[0].constructor === Object) {
            return itemData.items;
        } else {
            notification.show('One or more items could not be found in the ' +
                'database. Please make sure to pack the correct item with' +
                ' the correct amount.', {hide: false});
            return []; // Return empty array if item number(s) do not exist
        }
    } catch (error) {
        console.log(error);
        // Returns empty array if error
        return [];
    }
}

// Retrieve list of item numbers
function getItemNums(Items) {
    var itemList = [];

    for (let i = 0; i < Items.length; i++) {
        var item = {
            ItemNum: Items[i].ItemNum,
            SKU: Items[i].SKU,
            storeID: Items[i].storeID == 81 ? 71 : Items[i].storeID
        };
        itemList.push(item);
    }

    return itemList;
}

// Merge details from database into the Items object
function mergeItemDetails(Items, itemDBDetails) {
    for (let i = 0; i < Items.length; i++) {
        for (let j = 0; j < itemDBDetails.length; j++) {
            var saleRecordsVariation = Items[i].Variations;
            var itemDBVariation = getVariation(itemDBDetails[j].name);
            if ((checkSameValues(Items[i].ItemNum, itemDBDetails[j].num) && checkSameValues(Items[i].SKU, itemDBDetails[j].sku)) ||
                (!Items[i].SKU && checkSameValues(Items[i].ItemNum, itemDBDetails[j].num) && checkSameVariation(saleRecordsVariation, itemDBVariation)) ||
                (!Items[i].ItemNum  &&  checkSameValues(Items[i].SKU, itemDBDetails[j].sku) && checkSameVariation(saleRecordsVariation, itemDBVariation))) {
                Items[i].barcode = itemDBDetails[j].barcode;
                Items[i].singleItemBarcode = itemDBDetails[j].singleItemBarcode;
                Items[i].imageUrl = itemDBDetails[j].imageUrl;
                Items[i].id = itemDBDetails[j].id;
                Items[i].multiple = itemDBDetails[j].quantity;
                Items[i].singleItemMultiple = itemDBDetails[j].singleItemMultiple;
                Items[i].storeID = itemDBDetails[j].storeID;
                Items[i].weight = itemDBDetails[j].weight;
                Items[i].stock = itemDBDetails[j].stock;
                Items[i].factory = itemDBDetails[j].factory;
                Items[i].customSku = itemDBDetails[j].customSku;
                break;
            } 
        } 
    }
}

function checkSameValues(num1, num2) {
    if (num1 == null || num2 == null) return false;
    if (num1.toString() === num2.toString()) return true;
    return false;
}

// Prepare Url for server fetch to get item details from database
function getItemsUrl(itemList) {
    var itemNumList = [];
    var skuList = [];
    var itemUrlParamsS = '';

    for (let i = 0; i < itemList.length; i++) {
        if (itemList[i].ItemNum) {
            itemNumList.push([itemList[i].ItemNum, itemList[i].storeID]);
        } else {
            skuList.push([itemList[i].SKU, itemList[i].storeID]);
        }
    }
    itemUrlParamsS = 
        'items=' + encodeURIComponent(JSON.stringify(itemNumList)) +
        '&skus=' + encodeURIComponent(JSON.stringify(skuList));

    return apiUrls.getItemDetailsUrl + '?' + itemUrlParamsS;
}

// '?' replaces 'ツ' so change it back
function fixDCChar(itemDBDetails) {
	for (let i = 0; i < itemDBDetails.length; i++) {
        // Fix flatpack symbol for DC
        // Symbol is always the first character in the item title
        if (itemDBDetails[i].name) {
            if (itemDBDetails[i].name[0] == '?') {
                itemDBDetails[i].name = 'ツ' + 
                    itemDBDetails[i].name.substring(1);
            }
        }
	}
}

export {
    getItemDetails
}