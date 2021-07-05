import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener} from '/common/tools.js';


window.page = {
	//liveMessages: new LiveMessages(wsServer),
	els: {},
	notification: new NotificationBar(),
	user: {
		id: '',
		username: '',
		firstname: '',
		lastname: '',
		type: '',
	},
	userToken: localStorage.getItem('usertoken') || '',
	local: window.location.hostname.startsWith('192.168'),
	localUser: !!localStorage.getItem('local')
	
};

window.convert = {"itemno": "ItemNo", "itemname": "ItemName", "sku": "Sku" , "customsku": "CustomSku", "itembarcode": "ItemBarcode", "cartonbarcode": "CartonBarcode"};
window.saleRecords = {};
window.header = ['Store', 'ItemNo', 'ItemName', 'SKU', 'CustomSKU', 'Item Barcode', 'Carton Barcode', 'Stock on Hand', 'Individual Quantity', 'Carton Quantity', 'Quantity per Carton', 'Reserved Quantity', 'Damaged Quantity', 'Stock Received', 'Stock Sent', 'Item Weight', 'Bay', 'Expiry', 'Core/ Closeout', 'Clearance', 'Supplier', 'Image'];

window.perpages = [20, 50, 100];
window.totalPage = 0;

window.inventoryData = [];

if (page.local) {
	apiServer = apiServerLocal;
}

const apiUrl = window.apiServer;

document.addEventListener('DOMContentLoaded', async function() {
	// back to menu button
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/inventory/inventorymanagement.html';
	});

	// back to inventory button
	addListener('#header .back-to-inv', 'click', function(e) {
		window.location.href = '/inventory/inventory.html';
	});

	var barcodeScanner = {
        value: '',
        startTime: null,
        timer: null,
        timeLimit: 600,
    };

    document.addEventListener('keypress', async function(e) {
        if (e.charCode == 13 || e.charCode == 0) { // 13, 0; Enter key
            e.preventDefault();
            e.stopPropagation();

            clearTimeout(barcodeScanner.timer);
            barcodeScanner.timer = null;
            console.log(barcodeScanner.value);
            let formData = new FormData();
            formData.append('scanned', barcodeScanner.value);
           

            let response = await fetch(apiUrl+'inventory/search', {method: 'post', headers: {'DC-Access-Token': localStorage.getItem('usertoken')}, body: formData});
            let data = await response.json();
            if (data.result == 'success') {
                let inventorys = data.data;
                console.log(inventorys);
                window.inventoryData = inventorys;
				let resultCurrent = 1;
				fillForm(resultCurrent);
            }else{
                page.notification.show(data.result, {hide: false});
            }
            

            barcodeScanner.value = ''; // Reset barcode scanner value
        } else {
            // Save the character
            barcodeScanner.value += e.key.toString();

            if (!barcodeScanner.timer) {
                // Reset scanner value if timeout
                barcodeScanner.timer = setTimeout(function () {
                    barcodeScanner.timer = null;
                    //barcodeScanner.value = '';
                }, barcodeScanner.timeLimit);
            }
        }

        //console.log(barcodeScanner.value);
    });

    document.querySelector('.nav-left').addEventListener('click', function() {
		navigation('left');
	});
	document.querySelector('.nav-right').addEventListener('click', function() {
		navigation('right');
    });

    addListener('#content-action-btns .add-stock-received-btn', 'click', function(e) {
		addStockReceived();
	});

});


async function fillForm(resultCurrent) {
	clearForm();
	let inventory = window.inventoryData[resultCurrent-1];
	document.querySelector('#result-total').textContent = window.inventoryData.length;
	document.querySelector('#result-current').textContent = resultCurrent;
	document.querySelector('#inventoryid').dataset.id = inventory.id;
	document.querySelector('#itemName').value = inventory.itemName;
	document.querySelector('#customsku').value = inventory.customSku;
	document.querySelector('#itemBarcode').value = inventory.itemBarcode;
	document.querySelector('#cartonBarcode').value = inventory.cartonBarcode;
	document.querySelector('#quantityPerCarton').value = inventory.quantityPerCarton;
	document.querySelector('#notes').value = inventory.notes;

	document.querySelector('#bay').value = inventory.bay;
	let today = new Date();
	let y = today.getFullYear();
	let m = today.getMonth() + 1;
	let d = today.getDate();
	document.querySelector('#dateReceived').value = y + '-' + (m<10 ? '0' : '') + m +  '-' + (d<10 ? '0' : '') + d;
	document.querySelector('#supplier').value = inventory.supplier;
	let imageContainer = document.querySelector('#image-container');
	while (imageContainer.firstChild) {
		imageContainer.removeChild(imageContainer.firstChild);
	}
	let img = document.createElement('img');
	img.src = inventory.image;
	img.classList.add('detailImg');
	imageContainer.appendChild(img);
}

async function navigation(direction) {
	let currentResult = document.querySelector('#result-current').textContent;
	let totalResult = window.inventoryData.length;
	if (direction=='left') {
		currentResult = parseInt(currentResult) - 1;
		if (currentResult<1) {
			currentResult = currentResult + totalResult;
		}
	} else if (direction=='right') {
		currentResult = parseInt(currentResult) + 1;
		if (currentResult > totalResult) {
			currentResult = currentResult - totalResult;
		}
	}

	fillForm(currentResult);

}

async function addStockReceived() {

	let send = true;
	let formData = new FormData();

	let customsku = document.querySelector('#customsku').value;
	if (customsku == '') {
		send = false;
		let customSkuFeed = document.querySelector('#customsku-feedback');
		customSkuFeed.textContent = "Please fill in Custom SKU.";
		customSkuFeed.classList.remove('hide');
	}

	let itemsReceived = document.querySelector('#indivQty').value || 0;
	
	let cartonsReceived = document.querySelector('#cartonQty').value || 0; 
	let damagedQty = document.querySelector('#damagedQty').value || 0; 
	let quantityPerCarton = document.querySelector('#quantityPerCarton').value || 0; 
	let bay = document.querySelector('#bay').value; 
	let notes = document.querySelector('#notes').value; 

	let dateReceived = document.querySelector('#dateReceived').value; 
	if (dateReceived == '') {
		send = false;
		let dateReceivedFeed = document.querySelector('#dateReceived-feedback');
		dateReceivedFeed.textContent = "please fill in Date Received.";
		dateReceivedFeed.classList.remove('hide');
	}
	var stockReceived = [itemsReceived, cartonsReceived, dateReceived]; //[indivQty,cartonQty,dateReceived]
	
	formData.append('customSku', customsku);
	formData.append('stockReceived',stockReceived);
	formData.append('addfromindivStock', itemsReceived);
	formData.append('addfromcartonStock', cartonsReceived);
	formData.append('addfromdamagedStock', damagedQty);
	formData.append('quantityPerCarton', quantityPerCarton);
	formData.append('bay', bay);
	formData.append('notes', notes);

	let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
    let updateStockInventoryData = await response.json();

    if (response.ok && updateStockInventoryData.result == 'success') {
        page.notification.show("Item updated successfully.");
    }
    else {
        page.notification.show(updateStockInventoryData.result);
    }
}

function clearForm() {
	document.querySelector('#result-total').textContent = '';
	document.querySelector('#result-current').textContent = '';
	document.querySelector('#inventoryid').dataset.id = '';
	document.querySelector('#itemName').value = '';
	document.querySelector('#customsku').value = '';
	document.querySelector('#itemBarcode').value = '';
	document.querySelector('#cartonBarcode').value = '';
	document.querySelector('#indivQty').value = 0;
	document.querySelector('#cartonQty').value = 0;
	document.querySelector('#bay').value = '';
	document.querySelector('#dateReceived').value = '';
	document.querySelector('#supplier').value = '-';
	document.querySelector('#quantityPerCarton').value = 0;
	document.querySelector('#notes').value = '';
	document.querySelector('#damagedQty').value = 0;
}