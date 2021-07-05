import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener, checkLogin} from '/common/tools.js';
import {getItemDetails} from '../order-collect/js/item-details.js';



window.page = {
	//liveMessages: new LiveMessages(wsServer),
	els: {},
	notification: new NotificationBar(),
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
};

window.itemDetails = {}; 
window.stores = {
	"1" : "OzPlaza",
	"4" : "Idirect",
	"9" : 'Habitania eBay',
	"21": "New Store",
	"35": "CleanHQ",
	"36": "Evo Build",
	"37": "BH&G",
}


if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});

	var today = new Date();
	


	

	page.els.searchTableBody = document.querySelector('#search-table #search-table-body');
	page.els.itemTableBody = document.querySelector('#item-table-body');
	page.els.searchStoreSelect = document.querySelector('#search-store');
	page.els.orderStoreSelect = document.querySelector('#order-store');

	let searchStoreSelect = page.els.searchStoreSelect;
	let orderStoreSelect = page.els.orderStoreSelect;

	for (let store in stores) {
		let storeOption = document.createElement('option');
		storeOption.value =  store;
		storeOption.textContent = stores[store];
		searchStoreSelect.appendChild(storeOption);
		orderStoreSelect.appendChild(storeOption.cloneNode(true));
	}


	/*document.querySelector('#search-id').addEventListener('keyup', searchItems, false);
	document.querySelector('#search-name').addEventListener('keyup', searchItems, false);
	document.querySelector('#search-sku').addEventListener('keyup', searchItems, false);
	document.querySelector('#search-itemNum').addEventListener('keyup', searchItems, false);*/

	document.querySelector('#search-item').addEventListener('click', searchItems, false);

	document.querySelector('#content-items-add').addEventListener('click', showAddItemBox, false);
	document.querySelector('#content-items-selected-remove').addEventListener('click', deleteItem, false);

	document.querySelector('#add-item').addEventListener('click', addItem, false);
	document.querySelector('#add-item-cancel').addEventListener('click', closeBox, false);

	document.querySelector('#content-orders-add').addEventListener('click', addOrder, false);


	
});

async function searchItems() {
	let store = document.querySelector('#search-store').value;
	//console.log(store);
	if (store == '-') {
		page.notification.show('Please select store.');
		return;
	}
	let id = document.querySelector('#search-id').value;
	let name = document.querySelector('#search-name').value;
	let sku = document.querySelector('#search-sku').value;
	let itemNo = document.querySelector('#search-itemNum').value;
	let searchTableBody = page.els.searchTableBody;

	while (searchTableBody.firstChild) {
	    searchTableBody.removeChild(searchTableBody.firstChild);
	}
	
	let formData = new FormData();
	formData.append('store', store);
	formData.append('id', id);
	formData.append('name', name);
	formData.append('sku', sku);
	formData.append('itemNo', itemNo);

    let cols = ['id', 'store', 'name', 'sku', 'itemNo'];
	let response = await fetch(apiServer+'searchitem', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let itemData = await response.json();

	if (response.ok && itemData.result == 'success') {
		// Enable tracking buttons
		//page.notification.show('Records have been marked as ready to be packed.');
		let items = itemData.items;
		for (let item of items) {
			let tr = document.createElement('tr');
			tr.dataset.id = item.id;
			tr.dataset.store = item.store;
			tr.dataset.sku = item.sku;
			tr.dataset.name = item.name;
			tr.dataset.num = item.num;
			let td = document.createElement('td'), input = document.createElement('input');
			td.className = 'selected';
			input.type = 'checkbox';
			input.autocomplete = 'off';
			td.appendChild(input);
			tr.appendChild(td);

			for (let col of cols) {
				let td = document.createElement('td');
				td.dataset.col = col;
				
				let text = '';
				switch (col) {
					case 'id':
						text = item.id;
						break;
					case 'sku':
						text = item.sku;
						break;
					case 'name':
						text = item.name;
						break;
					case 'itemNo':
						text = item.num;
						break;
					case 'store':
						text = stores[item.store];
						break;
					default:
						text = '';
				}

				td.textContent = text || '';
				tr.appendChild(td);
			}

			searchTableBody.appendChild(tr);
		}

		
	}
	else {
		page.notification.show(itemData.result);
	}
}

function showAddItemBox(){
	let searchTableBody = page.els.searchTableBody;
	while (searchTableBody.firstChild) {
	    searchTableBody.removeChild(searchTableBody.firstChild);
	}

	document.querySelector('#search-store').value = '-';
	document.querySelector('#search-id').value = '';
	document.querySelector('#search-name').value = '';
	document.querySelector('#search-sku').value = '';
	document.querySelector('#search-itemNum').value = '';

	let itemAddBox = document.querySelector('#item-add-box');
	let outBox = document.querySelector('#box-outer');
	outBox.classList.add('flex');
	itemAddBox.classList.remove('hide');
}

function closeBox() {
	let itemAddBox = document.querySelector('#item-add-box');
	let outBox = document.querySelector('#box-outer');
	outBox.classList.remove('flex');
	itemAddBox.classList.add('hide');
}

function addItem() {
	let searchTableBody = page.els.searchTableBody;
	let itemTableBody = page.els.itemTableBody;
	let itemTrs = searchTableBody.querySelectorAll('tr');
	let cols = ['id', 'store', 'name', 'sku', 'itemNo', 'price', 'quantity'];
	for (let tr_i=0; tr_i<itemTrs.length;tr_i++) {
		let tr = itemTrs[tr_i];
		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput && selectedInput.checked) {
			let tr2 = document.createElement('tr');
			tr2.dataset.id = tr.dataset.id;
			tr2.dataset.store = tr.dataset.store;
			tr2.dataset.sku = tr.dataset.sku;
			tr2.dataset.name = tr.dataset.name;
			tr2.dataset.num = tr.dataset.num;
			let td2 = document.createElement('td'), input2 = document.createElement('input');
			td2.className = 'selected';
			input2.type = 'checkbox';
			input2.autocomplete = 'off';
			td2.appendChild(input2);
			tr2.appendChild(td2);

			for (let col of cols) {
				let td2 = document.createElement('td');
				td2.dataset.col = col;
				if (col == 'price' || col == 'quantity') td2.contentEditable = true;
				
				let text = '';
				switch (col) {
					case 'id':
						text = tr.dataset.id;
						break;
					case 'sku':
						text = tr.dataset.sku;
						break;
					case 'name':
						text = tr.dataset.name;
						break;
					case 'itemNo':
						text = tr.dataset.num;
						break;
					case 'store':
						text = stores[tr.dataset.store];
						break;
					default:
						text = '';
				}

				td2.textContent = text || '';
				tr2.appendChild(td2);
			}

			itemTableBody.appendChild(tr2);

		}
	}
}

function deleteItem() {
	let itemTableBody = page.els.itemTableBody;
	let itemTrs = itemTableBody.querySelectorAll('tr');
	
	for (let tr_i=0; tr_i<itemTrs.length;tr_i++) {
		let tr = itemTrs[tr_i];
		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput && selectedInput.checked) {
			itemTableBody.removeChild(tr);

		}
	}
}

async function addOrder() {
	clearFeedback();
	let send = true;
	let formData = new FormData();
	let store = document.querySelector('#order-store').value;
	if (store == '-') {
		send = false;
		let storefeed = document.querySelector('#store-feedback');
		storefeed.textContent = 'Please choose a store.';
		storefeed.classList.remove('hide');
	}

	formData.append('store', store);
	let data = {};
	data.note = document.querySelector('#deliveryNote').value;
	data.items = [];

	let itemTrs = document.querySelectorAll('#item-table-body tr');
	//console.log(itemTrs);
	if (itemTrs.length == 0) {
		send = false;
		let itemfeed = document.querySelector('#item-feedback');
		itemfeed.textContent = 'Please add items.';
		itemfeed.classList.remove('hide');
	}

	let hasQuantity = true;
	let storeMatch = true;
	let orderSum = 0;
	for (let itemTr of itemTrs) {
		let item = {};
		if (store != itemTr.dataset.store) {
			storeMatch = false;
		}
		item.sku = itemTr.dataset.sku;
		item.itemID = itemTr.dataset.num;
		item.title = itemTr.dataset.name;
		let quantity = itemTr.querySelector('[data-col="quantity"]').textContent;
		//console.log(quantity);
		if (quantity == '' || isNaN(quantity)) {
			hasQuantity = false;
		}
		item.quantity = quantity;
		item.unitPrice = itemTr.querySelector('[data-col="price"]').textContent;
		orderSum = orderSum + parseFloat(item.unitPrice)*parseInt(item.quantity);
		item.currency = 'AUD';
		data.items.push(item);
	}

	
	if (!hasQuantity) {
		send = false;
		let quantityfeed = document.querySelector('#item-quan-feedback');
		quantityfeed.textContent = 'Invalid quantities';
		quantityfeed.classList.remove('hide');
	}

	/*if (!storeMatch) {
		send = false;
		let itemfeed = document.querySelector('#item-feedback');
		itemfeed.textContent = 'Store not match.';
		itemfeed.classList.remove('hide');
	}*/


	let salesRecordID = document.querySelector('#salesRecordID').value;
	
	if (salesRecordID == '') {
		send = false;
		let salesRecordIDfeed = document.querySelector('#salesRecordID-feedback');
		salesRecordIDfeed.textContent = 'Please fill in SalesRecordID.';
		salesRecordIDfeed.classList.remove('hide');
	}

	data.SalesRecordID = salesRecordID;

	let orderID = document.querySelector('#orderID').value;
	
	if (orderID == '') {
		send = false;
		let orderIDfeed = document.querySelector('#orderID-feedback');
		orderIDfeed.textContent = 'Please fill in OrderID.';
		orderIDfeed.classList.remove('hide');
	}

	data.orderID = orderID;

	let buyerID = document.querySelector('#buyerID').value;
	
	if (buyerID == '') {
		send = false;
		let buyerIDfeed = document.querySelector('#buyerID-feedback');
		buyerIDfeed.textContent = "Please fill in Buyer's ID.";
		buyerIDfeed.classList.remove('hide');
	}

	data.buyerID = buyerID;

	let firstname = document.querySelector('#firstname').value;
	
	if (firstname == '') {
		send = false;
		let firstnamefeed = document.querySelector('#firstname-feedback');
		firstnamefeed.textContent = "Please fill in firstname.";
		firstnamefeed.classList.remove('hide');
	}

	data.buyerFirstName = firstname;

	data.buyerLastName = document.querySelector('#lastname').value;
	data.finalDestinationAddressName = data.buyerFirstName + ' ' + data.buyerLastName;

	data.finalDestinationAddressPhone = document.querySelector('#phone').value;
	data.buyerEmail = document.querySelector('#email').value;

	let addr1 = document.querySelector('#addr1').value;
	
	if (addr1 == '') {
		send = false;
		let addr1feed = document.querySelector('#addr1-feedback');
		addr1feed.textContent = "Please fill in addr1.";
		addr1feed.classList.remove('hide');
	}

	data.finalDestinationAddressLine1 = addr1;

	data.finalDestinationAddressLine2 = document.querySelector('#addr2').value;

	let city = document.querySelector('#city').value;
	
	if (city == '') {
		send = false;
		let cityfeed = document.querySelector('#city-feedback');
		cityfeed.textContent = "Please fill in city.";
		cityfeed.classList.remove('hide');
	}

	data.finalDestinationCity = city;

	let state = document.querySelector('#state').value;
	
	if (state == '-') {
		send = false;
		let statefeed = document.querySelector('#state-feedback');
		statefeed.textContent = "Please choose a state.";
		statefeed.classList.remove('hide');
	}

	data.finalDestinationStateOrProvince = state;

	let postcode = document.querySelector('#postcode').value;
	
	if (postcode == '') {
		send = false;
		let postcodefeed = document.querySelector('#postcode-feedback');
		postcodefeed.textContent = "Please fill in postcode.";
		postcodefeed.classList.remove('hide');
	}

	data.finalDestinationPostalCode = postcode;

	let country = document.querySelector('#country').value;
	
	if (country == '-') {
		send = false;
		let countryfeed = document.querySelector('#country-feedback');
		countryfeed.textContent = "Please choose a country.";
		countryfeed.classList.remove('hide');
	}

	data.finalDestinationCountry = country;

	data.lineItemSumTotal = '';
	data.cashOnDeliveryFee = 0;
	data.orderSumTotal = orderSum;
	data.orderSumTotalCurrency = 'AUD';
	data.orderShippingPrice = 0;
	data.shippingMethod = '';

	let date = document.querySelector('#date').value;
	
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

	

	formData.append('data', JSON.stringify(data));

	if (!send) {
		page.notification.show("Please complete the form.");
		return;
	}else{
		clearForm();
	}

	//console.log(formData.get('data'));

	let response = await fetch(apiServer+'addOrder', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let addOrderData = await response.json();

	if (response.ok && addOrderData.result == 'success') {		
		page.notification.show("Order added successfully.");
	}
	else {
		page.notification.show(addOrderData.result);
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

function clearForm() {
	document.querySelector('#order-store').value = '-';
	document.querySelector('#deliveryNote').value = '';
	document.querySelector('#salesRecordID').value = '';
	document.querySelector('#orderID').value = '';
	document.querySelector('#buyerID').value = '';
	document.querySelector('#firstname').value = '';
	document.querySelector('#lastname').value = '';
	document.querySelector('#phone').value = '';
	document.querySelector('#email').value = '';
	document.querySelector('#addr1').value = '';
	document.querySelector('#addr2').value = '';
	document.querySelector('#city').value = '';
	document.querySelector('#state').value = '-';
	document.querySelector('#postcode').value = '';
	document.querySelector('#country').value = '-';

	let itemTableBody = page.els.itemTableBody;
	while (itemTableBody.firstChild) {
	    itemTableBody.removeChild(itemTableBody.firstChild);
	}
}

