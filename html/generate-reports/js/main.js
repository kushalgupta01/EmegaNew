// Discount Chemist
// Order System
import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {selectText, getDateValue, addListener, removeListener, checkLogin} from '/common/tools.js';


window.page = {
	els: {},
	notification: new NotificationBar(),
	ordersLoaded: false,
	trackingLoaded: false,
	selectedService: null,
	type: 'Generate-Reports',
	user: {
		id: '',
		username: '',
		firstname: '',
		lastname: '',
	},
	userToken: localStorage.getItem('usertoken') || '',
	local: window.location.hostname.startsWith('192.168'),
	suppliers: {},
	purchaseordersAll: {},
	purchaseorder: {},
}

window.header = ['PO Number', 'Received Date', 'Supplier', 'Store', 'SKU', 'Item Name', 'Barcode','Ordered Qty', 'Total Qty'];
window.header2 = ['PO Number', 'Received Date', 'Supplier', 'Store', 'SKU', 'Item Name', 'Barcode', 'Total Qty'];
window.orders = {};
window.locations = {};
window.collectedOrders = {};

window.COURIER = {
	1: 'Fastway',
	2: 'AUPOST',
	3: 'Flat-pack',
	4: 'International',
	5: 'Express',
	8: 'Fastway',
	9: 'Fastway'
};

window.amazonOrdersReportRequestID = '';
window.amazonProductsReportRequestID = '';

if (page.local) {
	apiServer = apiServerLocal;
	wsServer = wsServerLocal;
}


document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	// Download

	await loadSuppliers();
	await loadAllPurchaseOrders();
	await addToTable();

	document.querySelector('#content-purchaseorder-searchbar').addEventListener('keyup',filterPONo, false);
	document.querySelector('#box-container .close').addEventListener('click', closeBox);
	document.getElementById('content-po-save').addEventListener('click', saveDocument, false);

	page.els.downloadDispatchedForm = document.querySelector('#dispatched-download-option form');
	page.els.downloadDispatchedSubstoreForm = document.querySelector('#dispatched-download-substore-option form');
	page.els.downloadDispatchedBtn = document.querySelector('#download-dispatched-btn');

	page.els.downloadInventoryForm = document.querySelector('#inventory-download-option form');
	page.els.downloadInventoryBtn = document.querySelector('#download-inventory-btn');

	page.els.downloadReceivedstockForm = document.querySelector('#receivedstock-download-option form');
	page.els.downloadReceivedstockBtn = document.querySelector('#download-receivedstock-btn');

	page.els.downloadQVBStockSentBtn = document.querySelector('#download-qvbstocksent-btn');
	page.els.downloadQVBStockSentOrderBtn = document.querySelector('#download-qvbstocksent-order-btn');

	page.els.downloadPackedOrdersForm = document.querySelector('#content-download-packed-orders form');
	page.els.downloadPackedOrdersBtn = document.querySelector('#download-packed-orders-btn');

	page.els.downloadNewOrdersForm = document.querySelector('#content-download-new-orders form');
	page.els.downloadNewOrdersBtn = document.querySelector('#download-new-orders-btn');

	page.els.downloadStockForm = document.querySelector('#stock-download-option form');
	page.els.downloadStockBtn = document.querySelector('#download-stock-btn');

	page.els.downloadB2BWeightsForm = document.querySelector('#content-download-b2b-weights form');
	page.els.downloadB2BWeightsBtn = document.querySelector('#download-b2b-weights-btn');

	//document.querySelector('#products-download-option #download-stock-search').addEventListener('click', downloadStock, false);
	//document.querySelector('#products-download-option #export-to-excel').addEventListener('click', exportTableToExcel, false);


	// Header colour
	if (page.local) {
		document.getElementById('header').classList.add('local');
	}

	// Check login
	{
		let loginSuccess = false;
		if (page.userToken) {
			let formData = new FormData();

			let response = await fetch(apiServer+'users/login', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
			let data = await response.json();

			if (response.ok && data.result == 'success') {
				loginSuccess = true;
				page.user = data.user;
			}
		}

		if (!loginSuccess) {
			// Not logged in
			window.location.href = '/';
			return;
		}
	}

	{
		// Load store list, order type list
		let forms = [
			{el: page.els.downloadDispatchedForm, type: 'stores', radioName: 'dds', radioID: 'dds'},
			{el: page.els.downloadInventoryForm, type: 'inventory', radioName: 'ids', radioID: 'ids'},
			{el: page.els.downloadReceivedstockForm, type: 'suppliers', radioName: 'srs', radioID: 'srs'},
			{el: page.els.downloadPackedOrdersForm, type: 'pack', radioName: 'pos', radioID: 'pos'},
			{el: page.els.downloadNewOrdersForm, type: 'new', radioName: 'nos', radioID: 'nos'},
			{el: page.els.downloadStockForm, type: 'stock', radioName: 'stk', radioID: 'stk'},
			{el: page.els.downloadB2BWeightsForm, type: 'b2b', radioName: 'bws', radioID: 'b2s'},
		];

		for (let form of forms) {
			let radio = document.createElement('input'), label = document.createElement('label'), span = document.createElement('span');
			radio.type = 'radio';
			radio.name = form.radioName;
			radio.id = form.radioID;

			

			let radioOptions = [];
			if (form.type == 'stores') {
				// Add entry for each store
				let storeIDs = Object.keys(stores).sort();
				let dataset = form.hasOwnProperty('filter') ? {filter: form.filter} : {};

				for (let id of storeIDs) {
					let store = stores[id];
					radioOptions.push({
						id: id,
						value: id,
						text: store.name,
						dataset: Object.assign({service: store.service}, dataset),
					});
				}
			}
			else if (form.type == 'suppliers') {
				// Add entry for order type
				let suppliers = ['hobbyco'];
				let dataset = form.hasOwnProperty('filter') ? {filter: form.filter} : null;

				for (let type of suppliers) {
					radioOptions.push({
						id: type,
						value: type,
						text: type,
						dataset: dataset,
					});
				}
			}
			else if (form.type == 'inventory') {
				// Add entry for order type
				let inventoryType = {
					'hobbycob2b': 'Hobbyco B2B',
					'hobbycob2c': 'Hobbyco B2C',
					'hobbycoall': 'Hobbyco All',
				}
					 
				let dataset = form.hasOwnProperty('filter') ? {filter: form.filter} : null;

				for (let type in inventoryType) {
					radioOptions.push({
						id: type,
						value: type,
						text: inventoryType[type],
						dataset: dataset,
					});
				}
			}

			else if (form.type == 'pack') {
				// Add entry for order type
				let packType = {'B2BWholesale':81, 'B2BTransfer':82};
				let dataset = form.hasOwnProperty('filter') ? {filter: form.filter} : null;

				for (let type in packType) {
					radioOptions.push({
						id: type,
						value: packType[type],
						text: type,
						dataset: dataset,
					});
				}
			}

			else if (form.type == 'new') {
				// Add entry for order type
				let newType = {'B2BWholesale':81, 'B2BTransfer':82};
				let dataset = form.hasOwnProperty('filter') ? {filter: form.filter} : null;

				for (let type in newType) {
					radioOptions.push({
						id: type,
						value: newType[type],
						text: type,
						dataset: dataset,
					});
				}
			}

			else if (form.type == 'b2b') {
				// Add entry for order type
				let newType = {'All': 'all', 'B2BWholesale':81, 'B2BTransfer':82};
				let dataset = form.hasOwnProperty('filter') ? {filter: form.filter} : null;

				for (let type in newType) {
					radioOptions.push({
						id: type,
						value: newType[type],
						text: type,
						dataset: dataset,
					});
				}
			}

			for (let option of radioOptions) {
				let radioItem = radio.cloneNode(true), labelItem = label.cloneNode(true), spanItem = span.cloneNode(true);
				radioItem.id += '-'+option.id;
				radioItem.value = option.value;
				if (option.dataset) {
					for (let entry in option.dataset) radioItem.dataset[entry] = option.dataset[entry];
				}
				labelItem.setAttribute('for', radioItem.id);
				spanItem.textContent = option.text;
				labelItem.appendChild(spanItem);
				form.el.appendChild(radioItem);
				form.el.appendChild(labelItem);
			}

			// Select the first option
			if (form.radioID != 'uts') {
				if (form.el.querySelectorAll('input')[0]) {
				    form.el.querySelectorAll('input')[0].checked = true;
				}
			}

		}
	}
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});

	// Menu list
	addListener('#menu-list li', 'click', function(e) {
		e.preventDefault();
		showPanel({id: this.dataset.panel, service: this.dataset.service});
	});

	let firstPanel = document.querySelector('#menu-list li:first-child');
	showPanel({id: firstPanel.dataset.panel, service: firstPanel.dataset.service});


	{

		page.els.downloadDispatchedBtn.addEventListener('click', downloadDispatched, false);

		page.els.downloadInventoryBtn.addEventListener('click', downloadInventory, false);

		page.els.downloadReceivedstockBtn.addEventListener('click', downloadReceivedstock, false);

		page.els.downloadQVBStockSentBtn.addEventListener('click', downloadQVBStockSent, false);
		page.els.downloadQVBStockSentOrderBtn.addEventListener('click', downloadQVBStockSentOrder, false);

		page.els.downloadPackedOrdersBtn.addEventListener('click', downloadPackedOrders, false);

		page.els.downloadNewOrdersBtn.addEventListener('click', downloadNewOrders, false);

		page.els.downloadStockBtn.addEventListener('click', downloadStock, false);

		page.els.downloadB2BWeightsBtn.addEventListener('click', downloadB2BWeights, false);

	}

	// Close popup box
	addListener('#box-container .close', 'click', closeBox);

	// Don't close the popup box when it's clicked
	/*addListener('#box-container > div', 'click mousedown', function(e) {
		e.stopPropagation();
	});*/
}, false);




// Select order
function selectOrder(e) {
	if (e.target.tagName.toLowerCase() == 'input') return;
	e.target.firstChild.checked = !e.target.firstChild.checked;
}

// Select all orders
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

// Unselect all orders
function unselectAllOrders(el) {
	let page = el.closest('.content-page');
	let selectAllInput = page.querySelector('table thead th.selected-all input');
	let trs = page.querySelectorAll('table tbody tr');

	if (selectAllInput) selectAllInput.checked = false;
	for (let tr of trs) {
		let input = tr.firstChild.firstChild;
		if (input) input.checked = false;
	}
}



function showPanel(data = {}) {
	var menuListUl = document.querySelector('#menu-list ul');
	var tabId = data.id;
	var serviceId = data.service;

	// Select menu item
	var menuItem = tabId ? menuListUl.querySelector('li[data-panel="'+tabId+'"]'+(serviceId ? '[data-service="'+serviceId+'"]' : '')) : menuListUl.children[0];
	if (!tabId) tabId = menuItem.dataset.panel;
	if (!tabId) return;

	// Service
	page.selectedService = SERVICES.hasOwnProperty(serviceId) ? serviceId : null;

	var selected = menuListUl.querySelector('.selected');
	if (selected) selected.classList.remove('selected');
	menuItem.classList.add('selected');

	// Show panel
	var contentPanels = document.querySelectorAll('#content-container > .content-page');
	for (var i = 0; i < contentPanels.length; ++i) {
		contentPanels[i].classList.add('hide');
	}
	//var panelDiv = tabId ? document.getElementById(tabId) : document.getElementById('content-container').children[0];
	document.getElementById(tabId).classList.remove('hide');

	
	if (tabId == 'content-download-inventory') {
		for (let input of page.els.downloadInventoryForm.querySelectorAll('input')) {
			let show = true;
			input.disabled = !show;
			page.els.downloadInventoryForm.querySelector('label[for="'+input.id+'"]').classList[show ? 'remove' : 'add']('hide');
		}
	}
	else if (tabId == 'content-download-dispatched') {
		for (let input of page.els.downloadDispatchedForm.querySelectorAll('input')) {
			let show = input.dataset.service == SERVICE_IDS['EBAY'] || input.dataset.service == SERVICE_IDS['NETO'];
			input.disabled = !show;
			page.els.downloadDispatchedForm.querySelector('label[for="'+input.id+'"]').classList[show ? 'remove' : 'add']('hide');
		}

		document.querySelector('#content-download-dispatched #datefrom').value = '';
		document.querySelector('#content-download-dispatched #dateto').value = '';
	}
	else if (tabId == 'content-download-stock'){

	}

}


// Open popup box
function openBox(id = '') {
	var el = document.getElementById(id);
	if (!el) return;
	document.getElementById('box-outer').classList.add('flex');
	el.classList.remove('hide');
} 

// Close popup box
function closeBox() {
	document.getElementById('box-outer').classList.remove('flex');
	for (let div of document.querySelectorAll('#box-container > div:not(.close)')) {
		div.classList.add('hide');
	}
}


async function downloadDispatched() {
	var store, substore;
	try {
		store = page.els.downloadDispatchedForm.elements['dds'].value;
		//substore = page.els.downloadTrackingSubstoreForm.elements['sss'].value;
	} catch (e) {}

	let datefrom = document.querySelector('#content-download-dispatched #datefrom').value;
	let dateto = document.querySelector('#content-download-dispatched #dateto').value;

	if (!store) {
		page.notification.show('Please select a store to download from.');
		return;
	}

	page.els.downloadDispatchedBtn.disabled = true;
	page.els.downloadDispatchedBtn.textContent = 'Downloading dispatched, please wait...';

	try {
		let response = await fetch(apiServer+'dispatched/' + store +  '/' + ((substore != undefined) ?  substore : 'all')  + '?datefrom=' + datefrom + '&dateto=' + dateto);
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download dispatched.', {hide: false});
			}
		}

		if (data.result == 'success') {
			
			var wb = XLSX.utils.book_new();
		    var aoa_data = [];
		    var head = ['store', 'SalesRecordID', 'OrderID', 'Name', 'Address1', 'Address2', 'Suburb', 'State', 'PostCode', 'Country', 
		                 'Email', 'Phone', 'Courier', 'Tracking', ' Status','Date Processed', 'Collected Time', 'Date Sent', 
		                 'sku', 'ItemName', 'Quantity', 'unitPrice', 'Shipping Price', 'paymentID', 'Total Payment', 'Item Unit Weight', 'Parcel Weight',' Type','Postage Cost','Handling', 'Notes', 'PackedData'];
		     if (store==30) {
		    	head = ['store', 'SalesRecordID', 'Name', 'Courier', 'Tracking', ' Status','Date Processed', 'Collected Time', 'Date Sent', 
		                 'sku', 'ItemName', 'Quantity', 'Item Unit Weight', 'Parcel Weight','Postage Cost','Handling', 'Notes', 'PackedData'];
		    }
		    aoa_data.push(head);

		    let orders = data.data;

		    let newOrders = [];

		    if (store != 30) {
		    	let numOfOrders = {};

			    for (let order of orders) {
			    	if (numOfOrders.hasOwnProperty(order.name)) {
			    		numOfOrders[order.name] = numOfOrders[order.name] + 1;
			    	} else {
			    		numOfOrders[order.name] = 1;
			    	}
			    }

			    let names = Object.keys(numOfOrders);
			    names.sort(function(a,b) { return numOfOrders[b]-numOfOrders[a]});

			    
			    for (let name of names) {
			    	for (let order of orders) {
			    		if (name == order.name) {
			    			newOrders.push(order);
			    		}
			    	}
			    }
		    } else {
		    	newOrders = orders;
		    }

		    for (let order of newOrders) {
		    	let items = typeof order.items === 'object' ? order.items : JSON.parse(order.items);
		    	for (let item of items) {
		    		let aoa_row = [];
		    		aoa_row.push(stores[order.store].name);
		    		aoa_row.push(order.salesRecordID);
		    		if (store != 30) {
		    			aoa_row.push(order.orderID);
		    		}
		    		aoa_row.push(order.name ? order.name.replace(/"/g,"") : order.name);
		    		if (store != 30) {
			    		aoa_row.push(order.addr1 ? order.addr1.replace(/"/g,"") : order.addr1);
			    		aoa_row.push(order.addr2 ? order.addr2.replace(/"/g,"") : order.addr2);
			    		aoa_row.push(order.city ? order.city.replace(/"/g,"") : order.city);
			    		aoa_row.push(order.state ? order.state.replace(/"/g,"") : order.state);
			    		aoa_row.push(order.postcode ? order.postcode.replace(/"/g,"") : order.postcode);
			    		aoa_row.push(order.country ? order.country.replace(/"/g,"") : order.country);
			    		aoa_row.push(order.email ? order.email.replace(/"/g,"") : order.email);
			    		aoa_row.push(order.phone ? order.phone.replace(/"/g,"") : order.phone);
			    	}
		    		aoa_row.push(COURIER[order.type]);
		    		aoa_row.push(JSON.parse(order.trackingID) ? (JSON.parse(order.trackingID)).join(' ') : JSON.parse(order.trackingID));
		    		aoa_row.push(ORDER_STATUS_NAME[order.status]);
		    		aoa_row.push(order.createdDate);
		    		aoa_row.push(order.collected);
		    		aoa_row.push(order.packedTime);
		    		aoa_row.push(item.sku || item.SKU);
		    		aoa_row.push(item.title || item.name || item.ProductName);
		    		aoa_row.push(item.quantity || item.Quantity);
		    		if (store != 30) {
			    		aoa_row.push(item.unitPrice || item.UnitPrice || item.price);
			    		aoa_row.push(item.shippingPrice || (order.ShippingTotal ? order.ShippingTotal.replace(/"/g,"") : order.ShippingTotal ));
			    		aoa_row.push(order.paymentID ? order.paymentID.replace(/"/g,"") : order.paymentID );
			    		aoa_row.push(order.paymentTotal ? order.paymentTotal.replace(/"/g,"") : order.paymentTotal );
			    	}
		    		aoa_row.push(item.weight);
		    		aoa_row.push(order.weight);
		    		if (store != 30) {
		    			aoa_row.push(item.type);
		    		}
		    		let postage;
		    		if (item.type=='intertrading') {
		    			if (item.weight<=0.5) {
		    				postage = 5;
		    			} else if (item.weight<=1) {
		    				postage = 6.5;
		    			} else if (item.weight<=3) {
		    				postage = 7.9;
		    			} else {
		    				postage = 8.9;
		    			}
		    		} else if (item.type=='factory'){
		    			if (item.weight<=0.5) {
		    				postage = 5;
		    			} else if (item.weight<=1) {
		    				postage = 6.5;
		    			} else if (item.weight<=3) {
		    				postage = 7.9;
		    			} else {
		    				postage = 11.9;
		    			}
		    		} else if (item.type=='international'){
		    				postage = 2;
		    			}
		    			
		    		let handling;
		    		if (item.type=='intertrading' || item.type=='factory' || item.type=='international')
		    		{
		    			handling=1.5;
		    		}

		    		aoa_row.push(postage);
		    		aoa_row.push(handling);
		    		aoa_row.push(order.notes);
		    		aoa_row.push(order.packedData);
		    		aoa_data.push(aoa_row);
		    	}
		    }
		    //console.log(aoa_data);
		    let ws = XLSX.utils.aoa_to_sheet(aoa_data);
		    XLSX.utils.book_append_sheet(wb, ws);
		    XLSX.writeFile(wb, 'dispatched.xlsx');
			page.notification.show('The dispatched have been downloaded.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadDispatchedBtn.textContent = 'Download Dispatched';
	page.els.downloadDispatchedBtn.disabled = false;
}

async function showSubstore(e) {
	let storeID = e.target.value;
	if (stores[storeID].substores) {
		let substoreForm = page.els.downloadTrackingSubstoreForm;
		substoreForm.parentNode.classList.remove('hide');
		while (substoreForm.firstChild) {
			substoreForm.removeChild(substoreForm.firstChild);
		}

		let input = document.createElement('input');
			input.type = 'radio';
			input.name = 'sss';
			input.id = "sss-all";
			input.value = 'all';
			substoreForm.appendChild(input);

			let label = document.createElement('label');
			label.setAttribute('for', "sss-all" );
			let span = document.createElement('span');
			span.textContent = 'All';
			label.appendChild(span);
			substoreForm.appendChild(label);
		let substores = stores[storeID].substores;
		for (let substoreID in substores) {
			let input = document.createElement('input');
			input.type = 'radio';
			input.name = 'sss';
			input.id = "sss-" + substoreID;
			input.value = substoreID;
			substoreForm.appendChild(input);

			let label = document.createElement('label');
			label.setAttribute('for', "sss-" + substoreID);
			let span = document.createElement('span');
			span.textContent = substores[substoreID];
			label.appendChild(span);
			substoreForm.appendChild(label);
		}
		//console.log(substoreForm.querySelectorAll('input')[0]);
		substoreForm.querySelectorAll('input')[0].checked = true;
	} else {
		let substoreForm = page.els.downloadTrackingSubstoreForm;
		substoreForm.parentNode.classList.add('hide');
		while (substoreForm.firstChild) {
			substoreForm.removeChild(substoreForm.firstChild);
		}
	}
}


function datefilter() {
	var type;
	try {
		type = page.els.trackingTypeForm.elements['ctt'].value;
	} catch (e) {
		console.log(e);
	}
	
	let orderdatefrom = document.querySelector('#orderdatefrom').value;
	let orderdateto = document.querySelector('#orderdateto').value;
	let packdatefrom = document.querySelector('#packdatefrom').value;
	let packdateto = document.querySelector('#packdateto').value;
	orderdatefrom = orderdatefrom ? new Date(orderdatefrom + ' 00:00:00') : null;
	orderdateto = orderdateto ? new Date(orderdateto + ' 23:59:59') : null;
	packdatefrom = packdatefrom ? new Date(packdatefrom + ' 00:00:00') : null;
	packdateto = packdateto ? new Date(packdateto + ' 23:59:59') : null;

	var trs = document.querySelectorAll('#content-tracking table tbody tr');

	for (let tr of trs) {
		tr.classList.add('hide');
		if (type != 'all' && type != tr.dataset.type) {
			continue;
		}
		let tds = tr.childNodes;
	
		let orderedtime = '';
		let packedtime = '';
		
		for (let td of tds) {
			if (td.dataset.col == 'orderedTime') {
				if (td.textContent != '') {
					orderedtime = new Date(td.textContent);
				}
				
			}

			if (td.dataset.col == 'packedTime') {
				if (td.textContent != '') {
					packedtime = new Date(td.textContent);
				}
			}	
		}

		/*console.log(orderedtime);
		console.log(packedtime);*/
		if (orderedtime == '' && (orderdatefrom || orderdateto)) continue;
		if (packedtime == '' && (packdatefrom || packdateto)) continue;
		/*console.log(orderedtime);
		console.log(packedtime);*/
		if ((orderdatefrom && orderdateto && orderedtime>orderdatefrom && orderedtime<orderdateto && packdatefrom && packdateto && packedtime>packdatefrom && packedtime<packdateto)
					|| (orderdatefrom && orderdateto && orderedtime>orderdatefrom && orderedtime<orderdateto && packdatefrom && !packdateto && packedtime>packdatefrom)
					|| (orderdatefrom && orderdateto && orderedtime>orderdatefrom && orderedtime<orderdateto && !packdatefrom && packdateto && packedtime<packdateto)
					|| (orderdatefrom && !orderdateto && orderedtime>orderdatefrom && packdatefrom && packdateto && packedtime>packdatefrom && packedtime<packdateto)
					|| (!orderdatefrom && orderdateto && orderedtime<orderdateto && packdatefrom && packdateto && packedtime>packdatefrom && packedtime<packdateto)
					|| (orderdatefrom && orderdateto && orderedtime>orderdatefrom && orderedtime<orderdateto && !packdatefrom && !packdateto)
					|| (!orderdatefrom && !orderdateto && packdatefrom && packdateto && packedtime>packdatefrom && packedtime<packdateto)
					|| (orderdatefrom && !orderdateto && orderedtime>orderdatefrom && packdatefrom && !packdateto && packedtime>packdatefrom)
					|| (!orderdatefrom && orderdateto && orderedtime<orderdateto && !packdatefrom && packdateto && packedtime<packdateto)
					|| (orderdatefrom && !orderdateto && orderedtime>orderdatefrom && !packdatefrom && packdateto && packedtime<packdateto)
					|| (!orderdatefrom && orderdateto && orderedtime<orderdateto && packdatefrom && !packdateto && packedtime>packdatefrom)
					|| (!orderdatefrom && !orderdateto && !packdatefrom && packdateto && packedtime<packdateto)
					|| (!orderdatefrom && !orderdateto && packdatefrom && !packdateto && packedtime>packdatefrom)
					|| (!orderdatefrom && orderdateto && orderedtime<orderdateto && !packdatefrom && !packdateto)
					|| (orderdatefrom && !orderdateto && orderedtime>orderdatefrom && !packdatefrom && !packdateto)
					|| (!orderdatefrom && !orderdateto && !packdatefrom && !packdateto)) tr.classList.remove('hide');
			
	}
}

async function downloadInventory() {
	var type;
	try {
		type = page.els.downloadInventoryForm.elements['ids'].value;
	} catch (e) {}


	if (!type) {
		page.notification.show('Please select a type to download from.');
		return;
	}

	page.els.downloadInventoryBtn.disabled = true;
	page.els.downloadInventoryBtn.textContent = 'Downloading inventorys, please wait...';

	try {
		let response = await fetch(apiServer+'downloadinventory/' + type);
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download inventorys.', {hide: false});
			}
		}

		if (data.result == 'success') {
			
			var wb = XLSX.utils.book_new();
		    var aoa_data = [];
		    var head = ['store', 'Title', 'SKU', 'ItemBarcode', 'CartonBarcode', 'Total Qty', 'Loose Qty', 'Carton Qty', 'Quantity Per Carton'];
		    aoa_data.push(head);

		    let inventorys = data.data;
			    
		    for (let inv of inventorys) {
		    	let aoa_row = [];
	    		aoa_row.push(stores[inv.store].name);
	    		aoa_row.push(inv.itemName);
	    		aoa_row.push(inv.customSku);
	    		aoa_row.push(inv.itemBarcode);
	    		aoa_row.push(inv.cartonBarcode);
	    		if (type=='hobbycob2b') {
	    			aoa_row.push(parseInt(inv.indivQty)+parseInt(inv.cartonQty)*parseInt(inv.quantityPerCarton));
	    			aoa_row.push(inv.indivQty);
	    		    aoa_row.push(inv.cartonQty);
	    		} else if (type=='hobbycob2c') {
	    			aoa_row.push(parseInt(inv['3PLIndivQty'])+parseInt(inv['3PLCartonQty'])*parseInt(inv.quantityPerCarton));
	    			aoa_row.push(inv['3PLIndivQty']);
	    		    aoa_row.push(inv['3PLCartonQty']);
	    		} else if (type=='hobbycoall') {
	    			aoa_row.push(parseInt(inv.indivQty)+parseInt(inv.cartonQty)*parseInt(inv.quantityPerCarton)+parseInt(inv['3PLIndivQty'])+parseInt(inv['3PLCartonQty'])*parseInt(inv.quantityPerCarton));
	    			aoa_row.push(parseInt(inv.indivQty) + parseInt(inv['3PLIndivQty']));
	    		    aoa_row.push(parseInt(inv.cartonQty) + parseInt(inv['3PLCartonQty']));
	    		}
	    		aoa_row.push(inv.quantityPerCarton);
	    		aoa_data.push(aoa_row);
		    }
		    //console.log(aoa_data);
		    let ws = XLSX.utils.aoa_to_sheet(aoa_data);
		    XLSX.utils.book_append_sheet(wb, ws);
		    XLSX.writeFile(wb, 'inventory-'+type+'.xlsx');
			page.notification.show('The invenory have been downloaded.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadInventoryBtn.textContent = 'Download Inventory';
	page.els.downloadInventoryBtn.disabled = false;
}

async function downloadReceivedstock() {
	var supplier;
	try {
		supplier = page.els.downloadReceivedstockForm.elements['srs'].value;
	} catch (e) {}


	if (!supplier) {
		page.notification.show('Please select a supplier to download from.');
		return;
	}

	page.els.downloadReceivedstockBtn.disabled = true;
	page.els.downloadReceivedstockBtn.textContent = 'Downloading received stock, please wait...';

	try {
		let response = await fetch(apiServer+'downloadreceivedstock/' + supplier);
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download received stock.', {hide: false});
			}
		}

		if (data.result == 'success') {
			
			var wb = XLSX.utils.book_new();
		    var aoa_data = [];
		    var head = ['Supplier', 'Title', 'SKU', 'ItemBarcode', 'CartonBarcode', 'Loose Qty', 'Carton Qty', 'Quantity Per Carton', 'Bay', 'Received Time', 'Type'];
		    aoa_data.push(head);

		    let stockreceived = data.data;
			    
		    for (let sr of stockreceived) {
		    	let aoa_row = [];
	    		aoa_row.push(sr.supplier);
	    		aoa_row.push(sr.itemName);
	    		aoa_row.push(sr.customSku);
	    		aoa_row.push(sr.itemBarcode);
	    		aoa_row.push(sr.cartonBarcode);
	    		aoa_row.push(sr.indivQty);
	    		aoa_row.push(sr.cartonQty);
	    		aoa_row.push(sr.quantityPerCarton);
	    		aoa_row.push(sr.bay);
	    		aoa_row.push(sr.receivedTime);
	    		aoa_row.push(sr.type);
	    		aoa_data.push(aoa_row);
		    }
		    //console.log(aoa_data);
		    let ws = XLSX.utils.aoa_to_sheet(aoa_data);
		    XLSX.utils.book_append_sheet(wb, ws);
		    XLSX.writeFile(wb, 'Receivedstock.xlsx');
			page.notification.show('The Received stocks have been downloaded.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		// console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadReceivedstockBtn.textContent = 'Download Received Stock';
	page.els.downloadReceivedstockBtn.disabled = false;
}

function getSelectedStoreOrders(e) {
	let store = document.querySelector('#buyer-store').value;	
	if (store == '-') {
		page.notification.show('Please select a store.')
	} else {
		let storeID = document.querySelector('#buyer-store').value;
		// console.log(storeID);
		var tableBody = document.querySelector('#content-show-orders table tbody');
		var tableBodyTrs = tableBody.querySelectorAll('tr:not(.hide)');
		for (let tr of tableBodyTrs) {
			// console.log(tr.dataset.store);		
			if(tr.dataset.store == storeID) {
				tr.firstChild.firstChild.checked = true;
			} else {
				tr.firstChild.firstChild.checked = false;
			}
		}
	}
}

async function downloadQVBStockSent() {
	let datefrom = document.querySelector('#content-download-qvbstocksent #datefrom').value;
	let dateto = document.querySelector('#content-download-qvbstocksent #dateto').value;

	page.els.downloadQVBStockSentBtn.disabled = true;
	page.els.downloadQVBStockSentBtn.textContent = 'Downloading, please wait...';

	try {
		let response = await fetch(apiServer+'downloadqvbstocksent?datefrom=' + datefrom + '&dateto=' + dateto);
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download.', {hide: false});
			}
		}

		if (data.result == 'success') {
			
			var wb = XLSX.utils.book_new();
		    var aoa_data = [];
		    var head = ['SKU', 'QTY Sent'];
		    

		    aoa_data.push(head);

		    let orders = data.data;

		    let quantitys = {};

		    for (let order of orders) {
		    	let locationselected = JSON.parse(order.locationselected);
		    	for (let linitemid in locationselected) {
		    		let locations = locationselected[linitemid];
		    		for (let loc of locations) {
		    			if (loc.id=='qvb') {
		    				let qty = loc.indivQty;
		    				let sku = loc.customSku;

		    				if (quantitys.hasOwnProperty(sku)) {
		    					quantitys[sku] = quantitys[sku] + parseInt(qty);
		    				} else {
		    					quantitys[sku] = parseInt(qty);
		    				}
		    			}
		    		}
		    	}
		    }

		    console.log(quantitys);

		    for (let sku in quantitys) {
		    	aoa_data.push([sku, quantitys[sku]]);
		    } 
		    
		    //console.log(aoa_data);
		    let ws = XLSX.utils.aoa_to_sheet(aoa_data);
		    XLSX.utils.book_append_sheet(wb, ws);
		    XLSX.writeFile(wb, 'qvbstocksent.xlsx');
			page.notification.show('The QVB Stock Sent have been downloaded.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadQVBStockSentBtn.textContent = 'Download QVB Stock Sent';
	page.els.downloadQVBStockSentBtn.disabled = false;
}

async function downloadQVBStockSentOrder() {
	let datefrom = document.querySelector('#content-download-qvbstocksent #datefrom').value;
	let dateto = document.querySelector('#content-download-qvbstocksent #dateto').value;

	page.els.downloadQVBStockSentOrderBtn.disabled = true;
	page.els.downloadQVBStockSentOrderBtn.textContent = 'Downloading, please wait...';

	try {
		let response = await fetch(apiServer+'downloadqvbstocksent?datefrom=' + datefrom + '&dateto=' + dateto);
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download.', {hide: false});
			}
		}

		if (data.result == 'success') {
			
			var wb = XLSX.utils.book_new();
		    var aoa_data = [];
		    var head = [ 'SKU', 'QTY SENT', 'Store', 'SalesRecordID', 'Collector', 'Collected Time'];
		    

		    aoa_data.push(head);

		    let orders = data.data;


		    for (let order of orders) {
		    	let date = new Date(order.collected.replace(' ','T') + '.000Z');
		     	date = date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate() + ' ' + date.getHours() + ':'+date.getMinutes()+':'+date.getSeconds();
		    	let locationselected = JSON.parse(order.locationselected);
		    	for (let linitemid in locationselected) {
		    		let locations = locationselected[linitemid];
		    		for (let loc of locations) {
		    			if (loc.id=='qvb') {
		    				let qty = loc.indivQty;
		    				let sku = loc.customSku;
		    				aoa_data.push([sku, qty, stores[order.store].name, order.salesRecordID, order.collector, date]);
		    				
		    			}
		    		}
		    	}
		    }

		    
		    //console.log(aoa_data);
		    let ws = XLSX.utils.aoa_to_sheet(aoa_data);
		    XLSX.utils.book_append_sheet(wb, ws);
		    XLSX.writeFile(wb, 'qvbstocksentorder.xlsx');
			page.notification.show('The QVB Stock Sent Orders have been downloaded.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadQVBStockSentOrderBtn.textContent = 'Download QVB Stock Sent Order';
	page.els.downloadQVBStockSentOrderBtn.disabled = false;
}

async function downloadPackedOrders() {
	let panelID = '#content-download-packed-orders';
	let datefrom = document.querySelector('#content-download-packed-orders #datefrom').value;
	let dateto = document.querySelector('#content-download-packed-orders #dateto').value;

	var store;
	try {
		store = page.els.downloadPackedOrdersForm.elements['pos'].value;
	} catch (e) {}



	page.els.downloadPackedOrdersBtn.disabled = true;
	page.els.downloadPackedOrdersBtn.textContent = 'Downloading packed orders, please wait...';

	try {
		let response = await fetch(apiServer+'downloadPackedOrders/' + store + '?datefrom=' + datefrom + '&dateto=' + dateto);
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download packed orders.', {hide: false});
			}
		}

		if (data.result == 'success') {
			
			 var wb = XLSX.utils.book_new();
		     var aoa_data = [];
		     var head = ['OrderID', 'Name', 'Tracking', 'Shipping', 'Status', 'SKU', 'Title', 'Scanned Qty', 'Total Qty', 'Missing Qty', 'Collector', 'Collected Time'];
		     aoa_data.push(head);

		     let packedOrders = data.data;
			    
		     for (let sr of packedOrders) {
		     	//console.log(sr);
		     	let orderData = JSON.parse(sr.data);
		     	for (let item of orderData.items) {
		     		let aoa_row = [];

		     		aoa_row.push(sr.salesRecordID);
		     		aoa_row.push(orderData.buyerID);
		     		aoa_row.push(sr.trackingID);
		     		aoa_row.push(ORDER_TYPE_NAME[sr.type]);
		     		aoa_row.push(ORDER_STATUS_NAME[sr.status]);
		     		aoa_row.push(item.sku);
		     		aoa_row.push(item.title);
		     		aoa_row.push(item.scannedQty ? item.scannedQty[0] : '');
		     		aoa_row.push(item.scannedQty ? item.scannedQty[1] : '');
		     		aoa_row.push(item.scannedQty ? parseInt(item.scannedQty[1])-parseInt(item.scannedQty[0]): '');
		     		aoa_row.push(sr.collector);
		     		let date = sr.collected ? new Date(sr.collected.replace(' ','T') + '.000Z') : '';
		     		aoa_row.push(sr.collected ? (date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate() + ' ' + date.getHours() + ':'+date.getMinutes()+':'+date.getSeconds()) : '');
		     		aoa_data.push(aoa_row);
		     	}
		     }
		     //console.log(aoa_data);
		     let ws = XLSX.utils.aoa_to_sheet(aoa_data);
		     XLSX.utils.book_append_sheet(wb, ws);
		     XLSX.writeFile(wb, 'Packedorders.xlsx');
			 page.notification.show('The packed orders have been downloaded.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadPackedOrdersBtn.textContent = 'Download Packed Orders';
	page.els.downloadPackedOrdersBtn.disabled = false;
}

async function downloadNewOrders() {
	let panelID = '#content-download-new-orders';
	let datefrom = document.querySelector('#content-download-new-orders #datefrom').value;
	let dateto = document.querySelector('#content-download-new-orders #dateto').value;

	var store;
	try {
		store = page.els.downloadNewOrdersForm.elements['nos'].value;
	} catch (e) {}

	page.els.downloadNewOrdersBtn.disabled = true;
	page.els.downloadNewOrdersBtn.textContent = 'Downloading new orders, please wait...';

	try {
		let response = await fetch(apiServer+'downloadNewOrders/' + store + '?datefrom=' + datefrom + '&dateto=' + dateto);
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download new orders.', {hide: false});
			}
		}

		if (data.result == 'success') {
			
			 var wb = XLSX.utils.book_new();
		     var aoa_data = [];
		     var head = ['OrderID', 'Name', 'Created Date', 'Status', 'SKU', 'Title', 'Total Qty'];
		     aoa_data.push(head);

		     let newOrders = data.data;
		     let inventorys = data.inventory;
			    
		     for (let sr of newOrders) {
		     	//console.log(sr);
		     	let orderData = JSON.parse(sr.data);
		     	for (let item of orderData.items) {
		     		let aoa_row = [];

		     		aoa_row.push(sr.salesRecordID);
		     		aoa_row.push(orderData.buyerID);
		     		aoa_row.push(sr.createdDate);
		     		aoa_row.push(ORDER_STATUS_NAME[sr.status]);
		     		aoa_row.push(item.sku);
		     		aoa_row.push(item.title);
		     		aoa_row.push(item.quantity);

		     		let log = inventorys[item.sku] ? inventorys[item.sku].locations : [];
		     		for (let i=0; i<log.length; i++) {
		     			if (!log[i].bay || !log[i].bay.startsWith('EMG-')) continue;
		     			if (log.indivQty <= 0) continue;
			    		let checkCols = head.length;
						let icomparison = 7+(i*2);
						if (checkCols == icomparison){
							head.push('Location'+(i+1));
							head.push('Qty'+(i+1));
						}
						aoa_row.push(log[i].bay.toUpperCase());
						aoa_row.push(log[i].indivQty);
			    	}

		     		aoa_data.push(aoa_row);
		     	}
		     }
		     
		     //console.log(aoa_data);
		     let ws = XLSX.utils.aoa_to_sheet(aoa_data);
		     XLSX.utils.book_append_sheet(wb, ws);
		     XLSX.writeFile(wb, 'Neworders.xlsx');
			 page.notification.show('The new orders have been downloaded.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadNewOrdersBtn.textContent = 'Download New Orders';
	page.els.downloadNewOrdersBtn.disabled = false;
}

async function loadSuppliers() {
	let response = await fetch(apiServer + 'suppliers/get', {method: 'get', headers: {'DC-Access-Token': page.userToken}});
	let data = await response.json();

	if (response.ok && data.result == 'success') {		
		 for (let supplier of data.suppliers) {
		 	page.suppliers[supplier.id] = supplier;
		 }
		 console.log(data);
	}
	else {
		page.notification.show(data.result);
	}
}

async function loadAllPurchaseOrders() {

	let response = await fetch(apiServer + 'purchaseordersAll/get?type='+page.type, {method: 'get', headers: {'DC-Access-Token': page.userToken}});
	let data = await response.json();

	if (response.ok && data.result == 'success') {		
		 	page.purchaseordersAll = data.purchaseorders;
		 //console.log(data);
	}
	else {
		page.notification.show(data.result);
	}
	
}

function filterPONo() {
	let input = document.querySelector("#content-purchaseorder-searchbar input").value;
	let table = document.getElementById("po-details");
	let tr = table.getElementsByTagName("tr");

	for (let i = 0; i < tr.length; i++) {
	 	let td = tr[i].getElementsByTagName("td")[0];
	 	if (td) {
	 		let txtValue = td.textContent || td.innerText;
	      	if (txtValue.toLowerCase().indexOf(input) > -1) {
	        	tr[i].style.display = "";
	      	} else {
	        	tr[i].style.display = "none";
	      	}
	 	}
	}
}

async function addToTable() {
	var tBody = document.querySelector('#po-details tBody');

	while (tBody.firstChild) {
		tBody.removeChild(tBody.firstChild);
	}
	
	let cols = 	['poNumber', 'store', 'supplier', 'createDate',  'notes'];

	for (let po of page.purchaseordersAll) {
		//console.log(po);
		let supp = page.suppliers;

		let tr = document.createElement('tr');
		tr.dataset.id = po.id;
		tr.dataset.poNo = po.poNo;
		tr.dataset.name = po.supplierName;

		for (let col of cols) {
			let td = document.createElement('td');
			td.classList.add(col);

			if (col == 'poNumber') {
				var linkEl = document.createElement('a');
				linkEl.innerHTML = po.poNo;
				linkEl.href = "#";
				td.appendChild(linkEl);

				linkEl.addEventListener("click", function(e){
        			showPODetails(e); 			
        		});
			} 
			else if (col == 'store') {
				td.textContent = stores[po.store].name;
			} 
			else if (col == 'supplier') {
				td.textContent = po.supplierName;
			}
			else if (col == 'createDate') {
				td.textContent = po.createdDate;;
			}
			else if (col == 'notes') {
				td.textContent = po.deliveryNotes;
			}

			tr.appendChild(td);
		}
		tBody.appendChild(tr);
	}
}

async function showPODetails(e) {
	// console.log('11');

	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('purchaseOrder-details').classList.remove('hide');

	let itemTbody = document.querySelector('#purchaseOrder-details #po-items tBody');
	let poNo = e.target.closest('tr').dataset.poNo;
	// console.log(poNo);
	document.querySelector('#poNo span').textContent = poNo;

	let sname = e.target.closest('tr').dataset.name;
	document.querySelector('#sname span').textContent = sname;


	let formData = new FormData();
	formData.append('poNo', poNo);

	let response = await fetch(apiServer + 'purchaseorders/get?type='+page.type, {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let data = await response.json();

	if (response.ok && data.result == 'success') {		
		 	page.purchaseorder = data.purchaseorder;
		 // console.log(data.purchaseorder);
	}
	else {
		page.notification.show(data.result);
	}

	while (itemTbody.firstChild) {
		itemTbody.removeChild(itemTbody.firstChild);
	}

	let cols = ['sku','location','quantity',];

	

	let cols2 = [ 'createDate', 'store', 'sku', 'itemName', 'itemBarcode', 'location', 'quantity'];

	let poDetails = data.purchaseorder;
	// console.log(poDetails);
	for (let po in poDetails) {
		let poDetail = poDetails[po];
		if (poDetail[0].orderedQty) {
			// console.log(poDetail[0].orderedQty)
			cols2.push('orderedQty');
			let TD = document.querySelector('#po-items thead .orderedqty');
			TD.classList.remove('hide');
			break;
		} else {
			let TD = document.querySelector('#po-items thead .orderedqty');
			TD.classList.add('hide');
		}
	}
	for (let po in poDetails) {
		let poDetail = poDetails[po];
		// console.log(poDetail);

		for (let pod of poDetail) {
			let tr = document.createElement('tr');
			tr.dataset.id = pod.id;

			for (let col of cols2) {
				let td = document.createElement('td');
				td.classList.add(col);

				if (col == 'createDate') {
					td.textContent = pod.createdDate;
				} 
				else if (col == 'store') {
					td.textContent = stores[pod.store].name;
				} 
				else if (col == 'itemName') {
					td.textContent = pod.itemName;
				} 
				else if (col == 'sku') {
					td.textContent = pod.sku;
				} 
				else if (col == 'itemBarcode') {
					td.textContent = pod.itemBarcode;
				} 
				else if (col == 'location') {
					td.textContent = pod.bay;
				} 
				else if (col == 'quantity') {
					td.textContent = pod.qty;
				} 		
				else if (col == 'orderedQty') {
					td.textContent = pod.orderedQty;
				}	
				// else if (col == 'image'){
				// 	let img = document.createElement('img');
				// 	img.src = poDetail.itemPhoto;
				// 	td.appendChild(img);
				// } 
				tr.appendChild(td);
			}
			itemTbody.appendChild(tr);
		}
			
	}
}

function saveDocument() {
	var table = document.querySelector('#box-container #po-items');
	var tableBody = table.querySelector('tbody');
	var tableBodyTr = tableBody.querySelectorAll('tr:not(.hide)');
	var tableHeaderTh = table.querySelectorAll('thead th');
	var orderRows = [];
	var headerRow = [];
	var requiredCols = {};
	var excludedCols = {};
	var orderRequiredCols = {};
	var orderNamesValid = true;

	let poNum = document.querySelector('#poNo span').textContent;
	// console.log(poNum);
	let fullname = document.querySelector('#sname span').textContent;
	// console.log(fullname);

 	// Get indices of columns that should be excluded
 	
 	if (!tableBodyTr.length) {
		page.notification.show('No order have been added.');
		return;
	}

	// Get each row's data
	let orderData = {};
	for (let tr_i = 0; tr_i < tableBodyTr.length; tr_i++) {
		let tableRow = tableBodyTr[tr_i];
		let tds = tableRow.querySelectorAll('td');

		let createTime = tds[0].textContent;
		let store = tds[1].textContent;
		let sku = tds[2].textContent;
		let title = tds[3].textContent;
		let barcode = tds[4].textContent;
		let loc = tds[5].textContent;
		let quantity = parseInt(tds[6].textContent);
		let orderedQty;
		if (tds[7]) {
			orderedQty = tds[7].textContent;
		}
		
		//console.log(orderData);
		if (orderData.hasOwnProperty(sku)) {
			let skuData = orderData[sku];
			let locations = skuData.locations;
			if (locations.hasOwnProperty(loc)) {
				locations[loc] = locations[loc] + quantity;
			} else {
				locations[loc] = quantity;
			}
		} else {
			orderData[sku] = {};
			orderData[sku]['title'] = title;
			orderData[sku]['store'] = store;
			orderData[sku]['barcode'] = barcode;
			orderData[sku]['date'] = createTime;
			orderData[sku]['locations'] = {};
			orderData[sku]['locations'][loc] = quantity;

			if (orderedQty) {
				orderData[sku]['orderedQty'] = orderedQty;
			}
		}		
	}

	let maxLocs = 0;
	let hasOrderedQty = false;
	for (let sku in orderData) {
		//console.log(orderData);
		let skuData = orderData[sku];
		let title = orderData[sku]['title'];
		let store = orderData[sku]['store'];
		let barcode = orderData[sku]['barcode'];
		let date = orderData[sku]['date'];
		let orderedQty = orderData[sku]['orderedQty'];
		let locations = orderData[sku]['locations'];

		if (orderedQty) hasOrderedQty = true;

		if (maxLocs<Object.keys(locations).length) {
			maxLocs = Object.keys(locations).length;
			//console.log(maxLocs);
		}

		let orderRow = [poNum, date, fullname, store, sku, title, barcode, Object.values(locations).reduce((a,b)=>a+b)];
		if (orderedQty) orderRow = [poNum, date, fullname, store, sku, title, barcode, orderedQty, Object.values(locations).reduce((a,b)=>a+b)];
		
		for (let location in locations) {
			orderRow.push(location);
			
			orderRow.push(locations[location]);
		}
		orderRows.push(orderRow);
	}

	if (hasOrderedQty) {
		headerRow = window.header;
	} else {
		headerRow = window.header2;
	}
	
	for (let i=1; i<maxLocs+1;i++) {
		headerRow.push('Location'+i);
		headerRow.push('Qty'+i);
	}

	orderRows.unshift(headerRow);
	//Create document for upload
	createTemplate(orderRows);
}

function createTemplate(orderRows) {
	//console.log(orderRows);
	var workbook = XLSX.utils.book_new();
	var worksheet = XLSX.utils.aoa_to_sheet(orderRows);
	XLSX.utils.book_append_sheet(workbook, worksheet, page.type + '_template');
	XLSX.writeFile(workbook, page.type+'-'+getDateValue(new Date())+'.xlsx');
}

async function downloadStock() {
	let store=null;
	page.els.downloadStockBtn.disabled = true;
	page.els.downloadStockBtn.textContent = 'Downloading stock, please wait...';
	//document.getElementById('loading').style.display = 'block';
	/*let ths = document.querySelectorAll('.tr-header th');
	for (let th of ths ){
		if (th.innerHTML.startsWith("Location") || th.innerHTML.startsWith("Qty")){
			th.remove();
		}
	}
	var locTBody = document.querySelector('#logsByDay');
			while (locTBody.firstChild) {
				locTBody.removeChild(locTBody.firstChild);
	}*/
	if (document.getElementById('sts-hobbyco').checked == true){
		store = 8;
    }

	let response = await fetch(apiServer+'download-stock/'+store, {method: 'post', headers: {'DC-Access-Token': page.userToken}});
	let data = await response.json();
	
	if (response.ok) {
		if(data.result != 'success') {
			page.notification.show(data.result, {hide:false});
			return;
		}

		if (data.locations) {
			/*locations = data.locations;
			for (let location in locations) {
				//console.log(locations[location]);
				// let locations[location].location2 = 'test1';
			}
			let cols = ['store', 'itemName', 'sku', 'emegaQty'];
			for (let location in locations) {
				var tr = document.createElement('tr');
				var log = locations[location];
				
				for (let i=0; i<log.locations.length; i++) {
					let checkCols = cols.length;
					let icomparison = 4+(i*2);
					//console.log('icomparison='+icomparison);
							if (checkCols == icomparison){
									cols.push('location'+i);
									cols.push('qty'+i);
									let header = document.querySelector('#download-stock-day .tr-header');
									let newTD = document.createElement('th');
									newTD.innerHTML = 'Location '+(i+1);
									let newTD2 = document.createElement('th');
									newTD2.innerHTML = 'Qty '+(i+1);
									header.appendChild(newTD);
									header.appendChild(newTD2);
								}
							
							// let bay = log[col][i].bay;
							// let qty = log[col][i].indivQty;
							// content.push(' '+bay+': '+qty);
						}

				//console.log(cols);
				for (let col of cols) {
					let td = document.createElement('td');
					if (col == 'store') {
						td.textContent = stores[log[col]] ? stores[log[col]].name : '';
					}
					if (col == 'itemName' || col == 'sku' || col == 'emegaQty'){
						td.textContent = log[col]
					}
					for (let i=0; i<log.locations.length; i++) {
						if (col == ('location'+i)){
							let bay = log.locations[i].bay;
							td.textContent = bay;
						}
						if (col == ('qty'+i)){
							let qty = log.locations[i].indivQty;
							td.textContent = qty;
						}
					}
					// if (col == 'locations'){
					// 	// console.log(log[col][0].bay);
					// 	let content =[];
					// 	let checkCols = cols.length;
					// 	console.log(cols[0]);
					// 	console.log(checkCols);
						

					// 	td.textContent = content;

					// }
					tr.appendChild(td);
				}
			locTBody.appendChild(tr);
			}
		}*/
		var wb = XLSX.utils.book_new();
		    var aoa_data = [];
		    var head = ['Store', 'Item Name', 'Sku', 'SOH'];
		    aoa_data.push(head);

		    let locations = data.locations;
		    for (let loc of locations) {
		    	var log = loc.locations;
		    	for (let i=0; i<log.length; i++) {
		    		let checkCols = head.length;
					let icomparison = 4+(i*2);
					if (checkCols == icomparison){
						head.push('Location'+(i+1));
						head.push('Qty'+(i+1));
					}
		    	}
		    	let aoa_row = [];
	    		aoa_row.push(stores[loc.store] ? stores[loc.store].name : '');
	    		aoa_row.push(loc.itemName);
	    		aoa_row.push(loc.sku);
	    		aoa_row.push(loc.emegaQty);
	    		for (let i=0; i<log.length; i++) {
					//let bay = log[i].bay;
					aoa_row.push(log[i].bay.toUpperCase());
					//let qty = log[i].indivQty;
					aoa_row.push(log[i].indivQty);
				}
	    		aoa_data.push(aoa_row);
		    }
		    //console.log(aoa_data);
		    let ws = XLSX.utils.aoa_to_sheet(aoa_data);
		    XLSX.utils.book_append_sheet(wb, ws);
		    store = stores[store] ? stores[store].name : 'All';
		    XLSX.writeFile(wb, 'Stock-'+store+'.xlsx');
			page.notification.show('The stock have been downloaded.', {background: 'bg-lgreen'});


		}
		else {
			page.notification.show('Error: '+data.result);

		}
	//document.getElementById('loading').style.display = 'none';
	}
	page.els.downloadStockBtn.textContent = 'Download Stock';
	page.els.downloadStockBtn.disabled = false;
}

/*function exportTableToExcel() {
	let storeName = null;
	if (document.getElementById('sts-hobbyco').checked == true) {
		storeName = 'Hobbyco';
	}
    // get table
	var table = document.getElementById('download-stock-day');
	// convert table to excel sheet
	var wb = XLSX.utils.table_to_book(table, {sheet:"Customer Report"});
	// write sheet to blob
	var blob = new Blob([s2ab(XLSX.write(wb, {bookType:'xlsx', type:'binary'}))], {
	    type: "application/octet-stream"
	});
    // return sheet file
    return saveAs(blob, storeName+"Emega-Stock.xlsx");
}

function s2ab(s) {
    var buf = new ArrayBuffer(s.length);
    var view = new Uint8Array(buf);
    for (var i=0; i<s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
}*/

async function downloadB2BWeights() {
	let panelID = '#content-download-b2b-weights';
	let datefrom = document.querySelector('#content-download-b2b-weights #datefrom').value;
	let dateto = document.querySelector('#content-download-b2b-weights #dateto').value;

	var store;
	try {
		store = page.els.downloadB2BWeightsForm.elements['bws'].value;
	} catch (e) {}

	page.els.downloadB2BWeightsBtn.disabled = true;
	page.els.downloadB2BWeightsBtn.textContent = 'Downloading B2B weights, please wait...';

	try {
		let response = await fetch(apiServer+'downloadb2bweights/' + store + '?datefrom=' + datefrom + '&dateto=' + dateto);
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download B2B Weights.', {hide: false});
			}
		}

		if (data.result == 'success') {
			
			 var wb = XLSX.utils.book_new();
		     var aoa_data = [];
		     var head = ['Store', 'Status', 'OrderID', 'BoxNumber', 'Weight', 'Trackings'];
		     aoa_data.push(head);

	     	 for (let order of data.data) {	
				 if (order.boxDetails) {
				 	let boxDetails = JSON.parse(order.boxDetails);
				 	for (let pw of boxDetails) {
				 		let aoa_row = [stores[order.store].name, ORDER_STATUS_NAME[order.status], order.salesRecordID, pw[0], pw[1]];
				 		if (pw[0]=='1') {
				 			if (order.trackingID) {
				 				let trackings = JSON.parse(order.trackingID);
				 				for (let tra of trackings) {
				 					aoa_row.push(tra);
				 				}
				 			}
				 		}
				 		aoa_data.push(aoa_row);
				 	}
				 }
			 }

		     //console.log(aoa_data);
		     let ws = XLSX.utils.aoa_to_sheet(aoa_data);
		     XLSX.utils.book_append_sheet(wb, ws);
		     XLSX.writeFile(wb, 'b2b-weights.xlsx');
			 page.notification.show('The B2B Weights have been downloaded.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadB2BWeightsBtn.textContent = 'Download B2B Weights';
	page.els.downloadB2BWeightsBtn.disabled = false;
}