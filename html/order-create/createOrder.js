import '/order-collect/js/config.js';
import { NotificationBar } from '/common/notification.js';
// import { apiServer,  apiServerLocal} from '/common/api-server.js';
import { checkLogin } from '/common/tools.js';
import { addListener, removeListener, getDateValue, getQueryValue } from '/common/tools.js';

window.page = {
	//liveMessages: new LiveMessages(wsServer),
	notification: new NotificationBar(),
	els: {},
	orders: {},
	type: 'Ship Stock',
	tab: null,
	user: {
		id: '',
		username: '',
		firstname: '',
		lastname: '',
		type: '',
	},
	userToken: localStorage.getItem('usertoken') || '',
	local: window.location.hostname.startsWith('192.168'),
	localUser: !!localStorage.getItem('local'),
	loadTime: 0,
	customers: {},
};

window.stocks = {};
window.saleRecords = {};
window.cols = ['store', 'title', 'sku', 'barcode', 'quantity', 'image'];
window.selectCols = ['store', 'title', 'sku', 'barcode', 'image'];
window.colsEditable = ['quantity'];
window.header = ['store', 'title', 'sku', 'barcode', 'quantity', 'image'];
if (page.local) {
	apiServer = apiServerLocal;
}


var apiUrl = apiServer;


document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});

	var barcodeScanner = {
        value: '',
        startTime: null,
        timer: null,
        timeLimit: 600,
    };

    let storeSelect = document.querySelector("#buyer-store");
    /*let option = document.createElement('option');
    option.value = '-';
    option.textContent = '-';
    storeSelect.appendChild(option);*/

    for (let store in stores) {
    	if (!['81','82'].includes(store)) continue;
        let option = document.createElement('option');
        option.value = store;
        option.textContent = stores[store].name;
        storeSelect.appendChild(option);
    }

    //await loadNames();

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
                await addToTable(inventorys);
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

        console.log(barcodeScanner.value);
    });

	//document.querySelector('#content-buyer-searchbar').addEventListener('keyup',filterBuyer, false);	
	addListener('#buyerList option', 'click', searchBuyer);
	//document.querySelector('#content-save').addEventListener('click',saveBuyerDetails, false);
	document.querySelector('#content-orders-add-collection').addEventListener('click',addOrderForCollection, false);
	document.getElementById('content-items-selected-remove').addEventListener('click', deleteSelected, false);
	document.querySelector('#order-items thead th.selected-all').addEventListener('click', selectAllOrders, false);
	document.querySelector('#order-items thead th.selected-all input').addEventListener('change', selectAllOrders, false);
	document.querySelector('#content-inventory-searchbar .search').addEventListener('click', searchInventory, false)
	document.querySelector('#box-container .close').addEventListener('click', closeBox);
	addListener('#orderItems-add', 'click', function(e) {
		addSelectedItem(e);
	});
	document.querySelector('#update-excel').addEventListener('click', uploadExcel, false);
	page.els.itemExcelFileInput = document.getElementById('excelFile');
	
});

async function searchInventory() {
	stocks = {};

	var keywords = document.querySelector('#content-inventory-searchbar input').value.toLowerCase();
	if ( keywords.trim() == "" ) { return };
	var field = document.querySelector('#content-inventory-searchfield input[name="searchfield"]:checked').value;

	let response = await fetch(apiServer + 'stockInventory/search/' + '?searchfield=' + field + '&searchvalue=' + keywords, {headers: {'DC-Access-Token': page.userToken}});
	let stockData = await response.json();

	if (response.ok && stockData.result == 'success') {		
		stocks = stockData.stocks;
		if (document.querySelector('#content-inventory-searchbar input') != null) { document.querySelector('#content-inventory-searchbar input').value = ''; }
	}
	else {
		page.notification.show(stockData.result);
	}

	let tbody = document.querySelector('#order-items tbody');

	addToTable(Object.values(stocks));
	/*for (let item in stocks) {
		var tr = document.createElement('tr');
		var stock = stocks[item];
		console.log(stock);

		tr.dataset.invid = stock.id;
		for (let attr in stock) {
			if (attr == 'locations') {
				tr.dataset[item] = JSON.stringify(stock[attr]);
			} else {
				tr.dataset[attr] = stock[attr];
			}
		}

		let td = document.createElement('td');
		let input = document.createElement('input');
		td.className = 'selected';
		input.type = 'checkbox';
		input.autocomplete = 'off';
		td.appendChild(input);
		tr.appendChild(td);

		for (let col of cols) {
			let td = document.createElement('td');
			td.classList.add(col);
			if (colsEditable.includes(col)) {
				td.contentEditable = true;
			}

			if (col == 'store') {
				td.textContent = stores[stock[col]] ? stores[stock[col]].name : '';
			} 
			else if (col == 'title') {
				td.textContent = stock['itemName'];		
			} 
			else if (col == 'sku') {
				td.textContent = stock['sku'];		
			} 
			else if (col == 'barcode') {
				td.textContent = stock['itemBarcode'];		
			} 
			else if (col == 'quantity') {
				td.textContent = '0';
			} 
			else if (col == 'image') {
				let img = document.createElement('img');
				img.src = stock[col];
				td.appendChild(img);
			} 
	    	tr.appendChild(td);
		}
		tbody.appendChild(tr);
	}*/
}

function deleteSelected() {
	let tbody = document.querySelector('#order-items tbody');
	let selected = tbody.querySelectorAll('tr');
	for (let tr of selected) {
		if (tr.firstChild.querySelector('input').checked) {
			tbody.removeChild(tr);
		}
	}
}

async function addSelectedItem(e) {
	let searchTableBody = document.querySelector('#order-stock-items tbody');
	let itemTrs = searchTableBody.querySelectorAll('tr');

	for (let itemTr of itemTrs) {
		if (itemTr.querySelector('.selected input').checked == true) {
			await addToTable([stocks[itemTr.dataset.invid]]);
			document.getElementById('box-outer').classList.remove('flex');
			document.getElementById('orderItems').classList.add('hide');
		} 
	}
}

function selectAllOrders(e) {
	var tagIsInput = e.target.tagName.toLowerCase() == 'input';
	if (!tagIsInput) e.target.firstChild.checked = !e.target.firstChild.checked;

	var checked = tagIsInput ? e.target.checked : e.target.firstChild.checked;

	if (checked) {
		// Select
		let tableBodyTrs = e.target.closest('.content-page').querySelectorAll('table tbody tr:not(.hide)');
		for (let tr of tableBodyTrs) {
			tr.firstChild.firstChild.checked = true;
		}
	}
	else {
		// De-select
		let tableBodyTrs = e.target.closest('.content-page').querySelectorAll('table tbody tr');
		for (let tr of tableBodyTrs) {
			tr.firstChild.firstChild.checked = false;
		}
	}
}

/*async function saveBuyerDetails() {
	// console.log('11');

	let addTable = document.querySelector('#delivery-address');
	
	let send = true;
	let formData = new FormData();

	let id = addTable.dataset.id;
	// console.log(id);

	formData.append('id',id);


	let refNo = document.querySelector('#buyer-refNo').value;
	if (refNo == '') {
		send = false;
		let refNofeed = document.querySelector('#refNo-feedback');
		refNofeed.textContent = 'Please enter Reference No.';
		refNofeed.classList.remove('hide');
	}
	formData.append('refNo',refNo);
	
	let poNo = document.querySelector('#buyer-poNo').value;
	if (poNo == '') {
		send = false;
		let poNofeed = document.querySelector('#poNo-feedback');
		poNofeed.textContent = 'Please enter PO No.';
		poNofeed.classList.remove('hide');
	}
	formData.append('poNo',poNo);

	let firstname = document.querySelector('#buyer-firstname').value;
	if (firstname == '') {
		send = false;
		let fullnamefeed = document.querySelector('#firstname-feedback');
		fullnamefeed.textContent = 'Please enter First Name.';
		fullnamefeed.classList.remove('hide');
	}
	formData.append('firstname',firstname);

	let lastname = document.querySelector('#buyer-lastname').value;
	formData.append('lastname',lastname);

	let companyname = document.querySelector('#companyname').value;
	if (companyname == '') {
		send = false;
		let companyNamefeed = document.querySelector('#companyname-feedback');
		companyNamefeed.textContent = 'Please enter company Name.';
		companyNamefeed.classList.remove('hide');
	}
	formData.append('companyname',companyname);

	let address1 = document.querySelector('#buyer-address1').value;
	if (address1 == '') {
		send = false;
		let address1feed = document.querySelector('#addr1-feedback');
		address1feed.textContent = "Please fill in Address1.";
		address1feed.classList.remove('hide');
	}
	formData.append('address1',address1);

	let address2 = document.querySelector('#buyer-address2').value;	
	formData.append('address2',address2);

	let suburb = document.querySelector('#buyer-suburb').value;
	if (suburb == '') {
		send = false;
		let suburbfeed = document.querySelector('#suburb-feedback');
		suburbfeed.textContent = "Please fill in Suburb.";
		suburbfeed.classList.remove('hide');
	}
	formData.append('suburb',suburb);

	let state = document.querySelector('#buyer-state').value;
	if (state == '-') {
		send = false;
		let statefeed = document.querySelector('#state-feedback');
		statefeed.textContent = "Please choose a state.";
		statefeed.classList.remove('hide');
	}
	formData.append('state',state);

	let postcode = document.querySelector('#buyer-postcode').value;
	if (postcode == '') {
		send = false;
		let postcodefeed = document.querySelector('#postcode-feedback');
		postcodefeed.textContent = "Please fill in postcode.";
		postcodefeed.classList.remove('hide');
	}
	formData.append('postcode',postcode);

	let country = document.querySelector('#buyer-country').value;
	if (country == '-') {
		send = false;
		let countryfeed = document.querySelector('#country-feedback');
		countryfeed.textContent = "Please choose a country.";
		countryfeed.classList.remove('hide');
	}
	formData.append('country',country);

	let phone = document.querySelector('#buyer-phone').value;	
	formData.append('phone',phone);

	let email = document.querySelector('#buyer-email').value;	
	formData.append('email',email);

	let notes = document.querySelector('#buyer-note').value;	
	formData.append('notes',notes);

	let store = document.querySelector('#buyer-store').value;	
	if (store == '-') {
		send = false;
		let storefeed = document.querySelector('#store-feedback');
		storefeed.textContent = 'Please choose a store.';
		storefeed.classList.remove('hide');
	}
	formData.append('store',store);
	


	if (!send) {
		page.notification.show("Please complete the form.");
		return;
	} else {
		let response = await fetch(apiServer+'addbuyerdata', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let data = await response.json();


		if (response.ok && data.result == 'success') {
		
			page.notification.show("Buyer added successfully.");
			clearForm();
			clearFeedback();
			window.location.reload();
		}
		else {
			page.notification.show(data.result);
		}
	}

}*/


function addToTable(inventorys) {
	if (inventorys.length == 1) {
		let inventoryDetail = inventorys[0];
		let tbody = document.querySelector('#order-items tbody');
		let trs = document.querySelectorAll('#order-items tbody tr');

		let existStock = false;
		for (let tr of trs) {
			if (tr.dataset.invid == inventoryDetail.id) {
				existStock = true;
				if (inventoryDetail.orderQuantity) { 
					tr.querySelector('.quantity').textContent = parseInt(tr.querySelector('.quantity').textContent) + parseInt(inventoryDetail.orderQuantity);
				}
				else { 
					tr.classList.add('bg-red');
				};
				// let currentlooseQty = parseInt(tr.querySelector('.looseQty').textContent);
				// tr.querySelector('.looseQty').textContent =  currentlooseQty + 1;
				break;


			} else {
				tr.classList.remove('bg-red');
			}
		}

		if (!existStock) {
			let tr = document.createElement('tr');
			tr.dataset.invid = inventoryDetail.id;
			for (let attr in inventoryDetail) {
				// console.log(attr);
				if (attr=='locations') {
					tr.dataset[attr] = JSON.stringify(inventoryDetail[attr]);
				} else {
					tr.dataset[attr] = inventoryDetail[attr];
				}
				
			}
			let td = document.createElement('td'), input = document.createElement('input');
			td.className = 'selected';
			input.type = 'checkbox';
			input.autocomplete = 'off';
			td.appendChild(input);
			tr.appendChild(td);
			for (let col of cols) {
				let td = document.createElement('td');
				td.classList.add(col);
				if (colsEditable.includes(col)) {
					td.contentEditable = true;
				}
				let text = '';
				switch (col) {
					case 'store':
						text = inventoryDetail.store ? stores[inventoryDetail.store].name : '';
						break;
					case 'title':
						text = inventoryDetail.itemName;
						break;
					case 'sku':
						text = inventoryDetail.customSku;
						break;
					case 'barcode':
						text = inventoryDetail.itemBarcode;
						break;					
					case 'quantity':
						text = inventoryDetail.orderQuantity ? inventoryDetail.orderQuantity : '0';
						break;					
					default:
						text = '';
				}

				if (col == 'image' ) {
					let img = document.createElement('img');
					img.src = inventoryDetail.image;
					td.appendChild(img);
				} 				
				else {
					td.textContent = text || '';
				}				
				tr.appendChild(td);
			}
			tbody.appendChild(tr);
		}

	} else {
		window.inventoryDetails = {};

		let tbody = document.querySelector('#order-stock-items tbody');
		while (tbody.firstChild) {
			tbody.removeChild(tbody.firstChild);
		}

		for (let inv of inventorys) {
			if (!inventoryDetails.hasOwnProperty(inv.id)) {
				inventoryDetails[inv.id] = inv;

				document.getElementById('box-outer').classList.add('flex');
				document.getElementById('orderItems').classList.remove('hide');
				
				let tr = document.createElement('tr');
				tr.dataset.invid = inv.id;
				for (let attr in inv) {
					tr.dataset[attr] = typeof inv[attr] != "string" ? JSON.stringify(inv[attr]) : inv[attr];
				}

				let td = document.createElement('td'), input = document.createElement('input');
				td.className = 'selected';
				input.type = 'checkbox';
				input.autocomplete = 'off';
				td.appendChild(input);
				tr.appendChild(td);

				let cols = ['store', 'itemName', 'sku', 'barcode', 'image'];

				for (let col of cols) {		
					let td = document.createElement('td');
					td.classList.add(col);
					let text = '';
					switch (col) {
						case 'store':
							text = inv.store ? stores[inv.store].name : '';
							break;
						case 'itemName':
							text = inv.itemName;
							break;
						case 'sku':
							text = inv.customSku;
							break;
						case 'barcode':
							text = inv.itemBarcode;
							break;					
						default:
							text = '';
					}

					if (col == 'image') {
						let img = document.createElement('img');
						img.src = inv.image;
						td.appendChild(img);
					} 

					else {
						td.textContent = text || '';					
					}
					tr.appendChild(td);
				}
				tbody.appendChild(tr);
			}
		}
	}
}


async function searchBuyer() {

	// console.log('11');
 		let buyerList = document.getElementById('buyerList');
 		let result = buyerList.options[buyerList.selectedIndex].value;
		let buyer = page.customers[result];

			document.querySelector('#buyer-refNo').value = buyer.refNo;
			document.querySelector('#buyer-poNo').value = buyer.poNo;
			document.querySelector('#delivery-address').dataset.id = buyer.id;
			document.querySelector('#buyer-firstname').value = buyer.firstname;
			document.querySelector('#buyer-lastname').value = buyer.lastname;
			document.querySelector('#companyname').value = buyer.companyname;
			document.querySelector('#buyer-address1').value = buyer.address1;	
			document.querySelector('#buyer-address2').value = buyer.address2;	
			document.querySelector('#buyer-suburb').value = buyer.suburb;
			document.querySelector('#buyer-state').value = buyer.state;	
			document.querySelector('#buyer-postcode').value = buyer.postcode;	
			document.querySelector('#buyer-country').value = buyer.country;	
			document.querySelector('#buyer-phone').value = buyer.phone;
			document.querySelector('#buyer-email').value = buyer.email;	
			document.querySelector('#buyer-note').value = buyer.notes;
			document.querySelector('#buyer-store').value = buyer.store;		
}

async function loadNames() {

	let response = await fetch(apiServer + 'b2bbuyernames/get', {method: 'get', headers: {'DC-Access-Token': page.userToken}});
	let data = await response.json();

	if (response.ok && data.result == 'success') {		
		 for (let buyer of data.buyers) {
		 	page.customers[buyer.id] = buyer;
		 }
		 console.log(data);
	}
	else {
		page.notification.show(data.result);
	}

	let buyerList = document.querySelector('#buyerList');
	if (data.buyers) {
		for(let buyer of data.buyers) {
			let option = document.createElement('option');
			option.value = buyer.id;
			//option.textContent = buyer.firstname + ' '  + buyer.lastname + ' ' + buyer.address1;
			option.textContent = buyer.companyname;
			buyerList.appendChild(option);
		}	
	} 
}

/*function filterBuyer() {

	let keyword = document.getElementById("content-buyer-searchbar").value;
	let buyerList = document.getElementById("buyerList");

	for (let i = 0; i < buyerList.length; i++) {
		let txtvalue = buyerList.options[i].text;

		if(txtvalue.substring(0, keyword.length).toLowerCase() !== keyword.toLowerCase() && keyword.trim() !== "") {
			buyerList.options[i].style.display = 'none';
		} else {
			buyerList.options[i].style.display = '';
		}
	}
 }*/


async function addOrderForCollection() {
	clearFeedback();
 	let send = true;
	let formData = new FormData();
	let data = {};
	data.items = [];

	let refNo = document.querySelector('#buyer-refNo').value;


	if (refNo == '') {
		send = false;
		let refNofeed = document.querySelector('#refNo-feedback');
		refNofeed.textContent = 'Please enter Reference No.';
		refNofeed.classList.remove('hide');
	}


	data.SalesRecordID = refNo;


	let poNo = document.querySelector('#buyer-poNo').value;


	if (poNo == '') {
		send = false;
		let poNofeed = document.querySelector('#poNo-feedback');
		poNofeed.textContent = 'Please enter PO No.';
		poNofeed.classList.remove('hide');
	}


	data.orderID = poNo;
	// formData.append('salesRecordID',salesRecordID);

	let firstname = document.querySelector('#buyer-firstname').value;
	if (firstname == '') {
		send = false;
		let firstnamefeed = document.querySelector('#firstname-feedback');
		firstnamefeed.textContent = 'Please enter First Name.';
		firstnamefeed.classList.remove('hide');
	}
	data.buyerFirstName = firstname;
	data.buyerLastName = document.querySelector('#buyer-lastname').value;
	data.finalDestinationAddressName = data.buyerFirstName + ' ' + data.buyerLastName;
	data.finalDestinationAddressPhone = document.querySelector('#buyer-phone').value;
	data.buyerEmail = document.querySelector('#buyer-email').value;	
	data.note = document.querySelector('#buyer-note').value;



	let companyName = document.querySelector('#companyname').value;
	if (companyName == '') {
		send = false;
		let companyNamefeed = document.querySelector('#companyname-feedback');
		companyNamefeed.textContent = 'Please enter Company Name.';
		companyNamefeed.classList.remove('hide');
	}
	data.buyerID = companyName;


	let address1 = document.querySelector('#buyer-address1').value;
	if (address1 == '') {
		send = false;
		let address1feed = document.querySelector('#addr1-feedback');
		address1feed.textContent = "Please fill in Address1.";
		address1feed.classList.remove('hide');
	}
	data.finalDestinationAddressLine1 = address1;

	let address2 = document.querySelector('#buyer-address2').value;
	
	data.finalDestinationAddressLine2 = address2;
		
	let suburb = document.querySelector('#buyer-suburb').value;
	if (suburb == '') {
		send = false;
		let suburbfeed = document.querySelector('#suburb-feedback');
		suburbfeed.textContent = "Please fill in Suburb.";
		suburbfeed.classList.remove('hide');
	}
	data.finalDestinationSuburb = suburb;

	let state = document.querySelector('#buyer-state').value;
	if (state == '-') {
		send = false;
		let statefeed = document.querySelector('#state-feedback');
		statefeed.textContent = "Please choose a state.";
		statefeed.classList.remove('hide');
	}
	data.finalDestinationStateOrProvince = state;

	let postcode = document.querySelector('#buyer-postcode').value;
	if (postcode == '') {
		send = false;
		let postcodefeed = document.querySelector('#postcode-feedback');
		postcodefeed.textContent = "Please fill in postcode.";
		postcodefeed.classList.remove('hide');
	}
	data.finalDestinationPostalCode = postcode;

	let country = document.querySelector('#buyer-country').value;
	if (country == '-') {
		send = false;
		let countryfeed = document.querySelector('#country-feedback');
		countryfeed.textContent = "Please choose a country.";
		countryfeed.classList.remove('hide');
	}
	data.finalDestinationCountry = country;	

	let store = document.querySelector('#buyer-store').value;	
	if (store == '-') {
		send = false;
		let storefeed = document.querySelector('#store-feedback');
		storefeed.textContent = 'Please choose a store.';
		storefeed.classList.remove('hide');
	}
	formData.append('store',store);

	let itemTrs = document.querySelectorAll('#order-items-body tr');
	//console.log(itemTrs);
	if (itemTrs.length == 0) {
		send = false;
		let itemfeed = document.querySelector('#item-feedback');
		itemfeed.textContent = 'Please add items.';
		itemfeed.classList.remove('hide');
	}

	let date = document.querySelector('#buyer-date').value;
	
	if (date == '') {
		send = false;
		let datefeed = document.querySelector('#date-feedback');
		datefeed.textContent = "Please choose a date.";
		datefeed.classList.remove('hide');
	}

	data.createdDate = date;
	data.checkoutDate = date;
	data.saleDate = date;
	data.paidDate = date;
	data.PaymentMethod = 'Standard';
	data.orderPaymentStatus = 'PAID';
	data.paymentID = '000000';
	data.clickCollect = '';
	data.clickCollectRefNum = '';


	let hasQuantity = true;
	// let storeMatch = true;
	let orderSum = 0;

	let i=0;
	for (let itemTr of itemTrs) {
		let item = {};
		// if(store != itemTr.dataset.store) {
		// 	storeMatch = false;
		// }
		item.sku = itemTr.dataset.sku;
		item.itemID = itemTr.dataset.itemNo;
		item.title = itemTr.dataset.itemName;

		let quantity = itemTr.querySelector('[class="quantity"]').textContent;
		if (quantity == '' || isNaN(quantity) || quantity == 0) {
			hasQuantity = false;
		}
		item.quantity = quantity;
		item.unitPrice = itemTr.dataset.price;
		orderSum = orderSum + parseFloat(item.unitPrice)*parseInt(item.quantity);
		item.currency = 'AUD';
		item.lineItemID = refNo + '-' + i;
		data.items.push(item);
		i = i + 1;
	}

	data.lineItemSumTotal = '';
	data.cashOnDeliveryFee = 0;
	data.orderSumTotal = orderSum;
	data.orderSumTotalCurrency = 'AUD';
	data.orderShippingPrice = 0;
	data.shippingMethod = '';

	if (!hasQuantity) {
		send = false;
		let quantityfeed = document.querySelector('#item-quan-feedback');
		quantityfeed.textContent = 'Invalid quantities';
		quantityfeed.classList.remove('hide');
	}

	// if (!storeMatch) {
	// 	send = false;
	// 	let itemfeed = document.querySelector('#item-feedback');
	// 	itemfeed.textContent = 'Store not match.';
	// 	itemfeed.classList.remove('hide');
	// }


	formData.append('data', JSON.stringify(data));
	//console.log(formData.get('data'));
	if (!send) {
		page.notification.show("Please complete the form.");
		return;
	}else{
		clearForm();
	}

	let response = await fetch(apiServer+'createOrder', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let createOrderData = await response.json();

	if (response.ok && createOrderData.result == 'success') {		
		page.notification.show("Order added successfully.");		
	}
	else {
		page.notification.show(createOrderData.result);
	}

 }

 function clearFeedback() {
	let feedbacks = document.querySelectorAll('.feedback');
	//console.log(feedbacks);
	for (let fd of feedbacks) {
		fd.classList.add('hide');
		fd.textContent = '';
	}
}

// Close popup box
function closeBox() {
	document.getElementById('box-outer').classList.remove('flex');
	setTimeout(function() {
		for (let el of document.querySelectorAll('#box-container > div:not(.close)')) {
			el.classList.add('hide');
		}
	}, 400);
}

function clearForm() {

	if (document.querySelector('#buyer-refNo') != null) { document.querySelector('#buyer-refNo').value = ''; }
	if (document.querySelector('#buyer-poNo') != null) { document.querySelector('#buyer-poNo').value = ''; }
	if (document.querySelector('#buyer-firstname') != null) { document.querySelector('#buyer-firstname').value = ''; }
	if (document.querySelector('#buyer-lastname') != null) { document.querySelector('#buyer-lastname').value = ''; }
	if (document.querySelector('#companyname') != null) { document.querySelector('#companyname').value = ''; }
	if (document.querySelector('#buyer-address1') != null) { document.querySelector('#buyer-address1').value = ''; }
	if (document.querySelector('#buyer-address2') != null) { document.querySelector('#buyer-address2').value = ''; }
	if (document.querySelector('#buyer-suburb') != null) { document.querySelector('#buyer-suburb').value = ''; }
	if (document.querySelector('#buyer-state') != null) { document.querySelector('#buyer-state').value = '-'; }
	if (document.querySelector('#buyer-postcode') != null) { document.querySelector('#buyer-postcode').value = ''; }
	if (document.querySelector('#buyer-country') != null) { document.querySelector('#buyer-country').value = '-'; }
	if (document.querySelector('#buyer-phone') != null) { document.querySelector('#buyer-phone').value = ''; }
	if (document.querySelector('#buyer-email') != null) { document.querySelector('#buyer-email').value = ''; }
	if (document.querySelector('#buyer-note') != null) { document.querySelector('#buyer-note').value = ''; }
	if (document.querySelector('#buyer-store') != null) { document.querySelector('#buyer-store').value = '-'; }
	if (document.querySelector('#buyer-data') != null) { document.querySelector('#buyer-data').value = ''; }

	let orderTableBody = document.querySelector('#order-items-body');
	while (orderTableBody.firstChild) {
		orderTableBody.removeChild(orderTableBody.firstChild);
	}
}

async function uploadExcel() {
	if (document.querySelectorAll('#order-items-body>tr').length == 0) {
		try {
			let files = page.els.itemExcelFileInput.files;
			if ( isCSV(files[0].name) == false ){
				alert('file format unaceptable');
				return;
			}
			let formData = new FormData();

			formData.append('file', files[0]);
			
			let response = await fetch(apiServer+'uploadorder', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});

			let excelData = await response.json();

			if (!response.ok) {
				if (excelData.result) {
					page.notification.show('Error: '+JSON.stringify(excelData.result), {hide: false});
				}
				else {
					page.notification.show('Error: Could not upload the excel.', {hide: false});
				}
			}

			if (excelData.result == 'success' && excelData.order) {
				page.notification.show('The order has been uploaded.', {background: 'bg-lgreen'});
				let order = excelData.order;
				//order no
				document.querySelector('#buyer-refNo').value = order.refNo;
				//buyer-docknum
				document.querySelector('#buyer-poNo').value = order.customerPONum;
				//companyname
				document.querySelector('#companyname').value = order.companyName;
				//buyer-firstname
				document.querySelector('#buyer-firstname').value = order.firstName;
				//buyer-lastname
				document.querySelector('#buyer-lastname').value = order.lastName;
				//buyer-address1
				document.querySelector('#buyer-address1').value = order.deliveryAddress1;
				//buyer-address2
				document.querySelector('#buyer-address2').value = order.deliveryAddress2;
				//buyer-suburb
				document.querySelector('#buyer-suburb').value = order.suburb;
				//buyer-state
				document.querySelector('#buyer-state [value="' + stateNameToOption(order.deliveryState) + '"]').selected = true;
				//buyer-postcode
				document.querySelector('#buyer-postcode').value = order.deliveryPostalCode;
				//buyer-country
				document.querySelector('#buyer-country [value="' + countryNameToOption(order.deliveryCountry) + '"]').selected = true;
				//buyer-phone
				document.querySelector('#buyer-phone').value = order.phone;
				//buyer-email
				document.querySelector('#buyer-email').value = order.emailAddress;
				/*//buyer-note
				document.querySelector('#buyer-note').textContent = order.refNo;*/
				//supplier-name
				document.querySelector('#buyer-store [value="' + refNoToSupplierName(order.refNo) + '"]').selected = true;
				//buyer-date
				document.getElementById('buyer-date').value = new Date().toDateInputValue();
				for (let item of order.items){
					// let inventorys = [];
					await addToTable(item);			
				}
				if (order.dif){
					let response = document.querySelector('#response');
					response.classList.remove("hide");
					response.textContent = "Warning: "+order.dif+" sku(s) not found! : " +order.skus;
				}
			}
			else {
				page.notification.show(JSON.stringify(excelData.result), {hide: false});
			}

		}
		catch(e){
			console.log(e);
		}
	}
}

function getExtension(filename) {
	var parts = filename.split('.');
	return parts[parts.length - 1];
}

function isCSV(filename) {
  var ext = getExtension(filename);
  switch (ext.toLowerCase()) {
    case 'csv':
      //etc
      return true;
  }
  return false;
}

function stateNameToOption(stateName){
	stateName = stateName.toLowerCase();
	if (stateName == 'vic' || stateName == 'victoria' || stateName == 'vi'){
		return "Victoria"
	}
	else if (stateName == 'nsw' || stateName == 'new south wales' || stateName == 'ns'){
		return "New South Wales";
	}
	else if (stateName == 'qld' || stateName == 'queensland' || stateName == 'ql'){
		return "Queensland";
	}
	else if (stateName == 'wa' || stateName == 'western australia'){
		return "Western Australia";
	}
	else if (stateName == 'sa' || stateName == 'south australia'){
		return "South Australia";
	}
	else if (stateName == 'tas' || stateName == 'tasmania' || stateName == 'ta'){
		return "Tasmania";
	}
	else if (stateName == 'nt' || stateName == "northern territory"){
		return "Northern Territory";
	}
	else if (stateName == 'act' || stateName == "australian capital territory"){
		return "Australian Capital Territory";
	}
	else{
		return;
	}
}

function countryNameToOption(countryName){
	countryName = countryName.toLowerCase();
	if (countryName == 'au' || countryName == 'australia' || countryName == 'aus'){
		return "AU";
	}
	else if (countryName == 'uk' || countryName == 'united kingdom'){
		return "UK";
	}
	else if (countryName == 'nl' || countryName == 'new zealand' || countryName == 'new zeland' || countryName == 'nzl' || countryName == 'nz'){
		return "New Zealand";
	}
	else{
		return;
	}
}

function refNoToSupplierName(refNo){
	refNo = refNo.toLowerCase();
	if (refNo.startsWith('trf')){
		return 82;
	}
	else {
		return 81;
	}
}

Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,10);
});