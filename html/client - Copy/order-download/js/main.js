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
	user: {
		id: '',
		username: '',
		firstname: '',
		lastname: '',
	},
	userToken: localStorage.getItem('usertoken') || '',
	//local: window.location.hostname.startsWith('1'),
}

window.orders = {};
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
	document.getElementById('username').textContent = localStorage.getItem('username');

	// Download
	page.els.downloadBtn = document.getElementById('content-download-btn');
	page.els.downloadForm = document.querySelector('#content-download-stores form');
	page.els.downloadProductForm = document.querySelector('#products-download-option form');
	page.els.downloadProductBtn = document.getElementById('products-download-btn');
	page.els.importGrouponBtn = document.getElementById('groupon-order-import-btn');
	page.els.importMydealBtn = document.getElementById('mydeal-order-import-btn');
	page.els.requestOrdersReportAmazonBtn = document.getElementById('request-report-amazon-btn');
	page.els.downloadOrdersAmazonBtn = document.getElementById('download-order-amazon-btn');

	page.els.requestProductsReportAmazonBtn = document.getElementById('products-request-amazon-btn');
	page.els.downloadProductsAmazonBtn = document.getElementById('products-download-amazon-btn');
	page.els.downloadProductsImagesAmazonBtn = document.getElementById('products-images-download-amazon-btn');

	page.els.downloadTrackingForm = document.querySelector('#tracking-download-option form');
	page.els.downloadTrackingSubstoreForm = document.querySelector('#tracking-download-substore-option form');
	page.els.downloadTrackingBtn = document.querySelector('#download-tracking-btn');

	page.els.downloadInventoryForm = document.querySelector('#inventory-download-option form');
	page.els.downloadInventoryBtn = document.querySelector('#download-inventory-btn');

	page.els.downloadReceivedstockForm = document.querySelector('#receivedstock-download-option form');
	page.els.downloadReceivedstockBtn = document.querySelector('#download-receivedstock-btn');

	// New orders
	page.els.filterForm = document.querySelector('#content-orders-filters form');
	page.els.ordersRefresh = document.getElementById('content-orders-refresh');
	page.els.ordersReset = document.getElementById('content-orders-reset');
	page.els.ordersSave = document.getElementById('content-orders-save');
	page.els.ordersAddCollect = document.getElementById('content-orders-add-collect');
	page.els.ordersAddCollectConfirm = document.getElementById('box-orders-collect-confirm');
	page.els.ordersAddCollectCancel = document.getElementById('box-orders-collect-cancel');
	page.els.ordersRemove = document.getElementById('content-orders-remove');
	page.els.ordersRemoveConfirm = document.getElementById('box-orders-remove-confirm');
	page.els.ordersRemoveCancel = document.getElementById('box-orders-remove-cancel');
	/*page.els.ordersDelete = document.getElementById('content-orders-delete');
	page.els.ordersDeleteConfirm = document.getElementById('box-orders-delete-confirm');
	page.els.ordersDeleteCancel = document.getElementById('box-orders-delete-cancel');*/

    // Collected orders
    page.els.ordersCollectedStoreForm = document.getElementById('content-orders-collected-store');
	page.els.ordersAddPrint = document.getElementById('content-orders-add-print');
	page.els.ordersAddPrintConfirm = document.getElementById('box-orders-print-confirm');
	page.els.ordersAddPrintCancel = document.getElementById('box-orders-print-cancel');

	// Mark orders as sent
	page.els.ordersMarkSentStoreForm = document.getElementById('content-orders-mark-sent-store');
	page.els.ordersMarkSentStatusForm = document.getElementById('content-orders-mark-sent-status');
	page.els.ordersMarkSentRefresh = document.getElementById('content-orders-mark-sent-refresh');
	page.els.ordersMarkSent = document.getElementById('content-orders-mark-sent-btn');
	page.els.ordersMarkSentConfirm = document.getElementById('box-mark-sent-confirm');
	page.els.ordersMarkSentCancel = document.getElementById('box-mark-sent-cancel');

	// Upload tracking
	page.els.trackingStoreForm = document.getElementById('content-tracking-store');
	page.els.trackingTypeForm = document.getElementById('content-tracking-type');
	page.els.trackingRefresh = document.getElementById('content-tracking-refresh');
	page.els.trackingReset = document.getElementById('content-tracking-reset');
	page.els.trackingSave = document.getElementById('content-tracking-save');
	page.els.trackingSelectAllTracking = document.getElementById('content-tracking-select-tracking');
	page.els.trackingUpload = document.getElementById('content-tracking-upload');
	page.els.trackingUploadConfirm = document.getElementById('box-tracking-upload-confirm');
	page.els.trackingUploadCancel = document.getElementById('box-tracking-upload-cancel');
	page.els.trackingRemove = document.getElementById('content-tracking-mark-uploaded');
	page.els.trackingRemoveConfirm = document.getElementById('box-tracking-remove-confirm');
	page.els.trackingRemoveCancel = document.getElementById('box-tracking-remove-cancel');
	page.els.trackingGrouponGet = document.getElementById('groupon-tracking-export-btn');
	page.els.trackingMydealGet = document.getElementById('mydeal-tracking-export-btn');

	page.els.trackingBigCommerceGet = document.getElementById('content-tracking-bigcommerce');
	page.els.trackingBigCommerceGet2 = document.getElementById('content-tracking-bigcommerce-2');

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
			{el: page.els.downloadForm, type: 'stores', radioName: 'cds', radioID: 'cds', allLabel: 'All stores'},
			{el: page.els.ordersMarkSentStoreForm, type: 'stores', radioName: 'omss', radioID: 'omss', allLabel: 'All stores', filter: 'store'},
			{el: page.els.trackingStoreForm, type: 'stores', radioName: 'uts', radioID: 'uts', filter: 'store'},
			{el: page.els.trackingTypeForm, type: 'ordertypes', radioName: 'ctt', radioID: 'ctt', allLabel: 'All types', filter: 'type'},
			{el: page.els.downloadProductForm, type: 'stores', radioName: 'pds', radioID: 'pds'},
			{el: page.els.downloadTrackingForm, type: 'stores', radioName: 'tds', radioID: 'tds'},
			{el: page.els.downloadInventoryForm, type: 'inventory', radioName: 'ids', radioID: 'ids'},
			{el: page.els.downloadReceivedstockForm, type: 'suppliers', radioName: 'srs', radioID: 'srs'},
			{el: page.els.ordersCollectedStoreForm, type: 'collect', radioName: 'ocs', radioID: 'ocs'},
		];

		for (let form of forms) {
			let radio = document.createElement('input'), label = document.createElement('label'), span = document.createElement('span');
			radio.type = 'radio';
			radio.name = form.radioName;
			radio.id = form.radioID;

			if (form.allLabel) {
				// Add entry for all stores
				let radioItem = radio.cloneNode(true), labelItem = label.cloneNode(true), spanItem = span.cloneNode(true);
				radioItem.id += '-all';
				radioItem.dataset.service = 'all';
				if (form.hasOwnProperty('filter')) radioItem.dataset.filter = form.filter;
				radioItem.value = 'all';
				labelItem.setAttribute('for', radioItem.id);
				spanItem.textContent = form.allLabel;
				labelItem.appendChild(spanItem);
				form.el.appendChild(radioItem);
				form.el.appendChild(labelItem);
			}

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
			else if (form.type == 'ordertypes') {
				// Add entry for order type
				let orderTypes = Object.keys(ORDER_TYPE_NAME).sort();
				let dataset = form.hasOwnProperty('filter') ? {filter: form.filter} : null;

				for (let type of orderTypes) {
					radioOptions.push({
						id: type,
						value: type,
						text: ORDER_TYPE_NAME[type],
						dataset: dataset,
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
			else if (form.type == 'collect') {
				// Add entry for order type
				let collectType = ['All others', 'Hobbycos'];
				let dataset = form.hasOwnProperty('filter') ? {filter: form.filter} : null;

				for (let type of collectType) {
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
				form.el.querySelectorAll('input')[0].checked = true;
			}

		}
	}
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});

	// Menu list
	addListener('li.li-data-panel', 'click', function(e) {
		e.preventDefault();
		showPanel({id: this.dataset.panel, service: this.dataset.service});
	});

	let firstPanel = document.querySelector('#menu-list li:first-child');
	showPanel({ id: firstPanel.dataset.panel, service: firstPanel.dataset.service });




	{
		/* Download orders */
		page.els.downloadBtn.addEventListener('click', downloadOrders, false);
		page.els.downloadProductBtn.addEventListener('click', downloadProducts, false);
		page.els.importGrouponBtn.addEventListener('click', importGrouponOrders, false);
		page.els.importMydealBtn.addEventListener('click', importMydealOrders, false);

		/* Show orders */
		page.els.ordersRefresh.addEventListener('click', getOrders, false);
		page.els.ordersReset.addEventListener('click', getOrders, false);

		// Filter orders
		addListener('#content-orders-filters form input', 'change', filterOrders);

		// Select/de-select all orders
		document.querySelector('#content-show-orders table thead th.selected-all').addEventListener('click', selectAllOrders, false);
		document.querySelector('#content-show-orders table thead th.selected-all input').addEventListener('change', selectAllOrders, false);

		// Select/de-select all orders
		document.querySelector('#content-collected-orders table thead th.selected-all').addEventListener('click', selectAllOrders, false);
		document.querySelector('#content-collected-orders table thead th.selected-all input').addEventListener('change', selectAllOrders, false);

		// Save orders
		page.els.ordersSave.addEventListener('click', saveOrders, false);

		// Cancel orders
		page.els.ordersRemove.addEventListener('click', ()=>openBox('box-orders-remove'), false);
		page.els.ordersRemoveConfirm.addEventListener('click', removeOrders, false);
		page.els.ordersRemoveCancel.addEventListener('click', closeBox, false);

		// Delete orders
		/*page.els.ordersDelete.addEventListener('click', ()=>openBox('box-orders-delete'), false);
		page.els.ordersDeleteConfirm.addEventListener('click', deleteOrders, false);
		page.els.ordersDeleteCancel.addEventListener('click', closeBox, false);*/

		// Add orders for collection
		page.els.ordersAddCollect.addEventListener('click', ()=>openBox('box-orders-collect'), false);
		page.els.ordersAddCollectConfirm.addEventListener('click', addOrdersCollect, false);
		page.els.ordersAddCollectCancel.addEventListener('click', closeBox, false);

		// Add orders for printing
		page.els.ordersAddPrint.addEventListener('click', ()=>openBox('box-orders-print'), false);
		page.els.ordersAddPrintConfirm.addEventListener('click', addOrdersPrint, false);
		page.els.ordersAddPrintCancel.addEventListener('click', closeBox, false);

		/* Mark orders as sent */
		page.els.ordersMarkSentRefresh.addEventListener('click', getUnsentOrders, false);

		// Filter store, order status
		addListener('#content-orders-mark-sent-store input', 'change', filterOrders);
		addListener('#content-orders-mark-sent-status input', 'change', filterOrders);

		// Select/de-select all orders
		document.querySelector('#content-orders-mark-sent table thead th.selected-all').addEventListener('click', selectAllOrders, false);
		document.querySelector('#content-orders-mark-sent table thead th.selected-all input').addEventListener('change', selectAllOrders, false);

		// Mark orders as sent
		page.els.ordersMarkSent.addEventListener('click', ()=>openBox('box-mark-sent'), false);
		page.els.ordersMarkSentConfirm.addEventListener('click', markOrdersAsSent, false);
		page.els.ordersMarkSentCancel.addEventListener('click', closeBox, false);


		/* Upload tracking */
		page.els.trackingRefresh.addEventListener('click', getTrackingOrders, false);
		page.els.trackingReset.addEventListener('click', getTrackingOrders, false);

		// Filter store, order type
		addListener('#content-tracking-type input', 'change', filterOrders);

		// Select/de-select all orders
		document.querySelector('#content-tracking table thead th.selected-all').addEventListener('click', selectAllOrders, false);
		document.querySelector('#content-tracking table thead th.selected-all input').addEventListener('change', selectAllOrders, false);

		// Save tracking number changes
		page.els.trackingSave.addEventListener('click', saveTracking, false);

		// Select all orders with tracking numbers
		page.els.trackingSelectAllTracking.addEventListener('click', selectOrdersWithTracking, false);

		// Upload tracking numbers
		page.els.trackingUpload.addEventListener('click', ()=>openBox('box-tracking-upload'), false);
		page.els.trackingUploadConfirm.addEventListener('click', ()=>uploadTracking(false), false);
		page.els.trackingUploadCancel.addEventListener('click', closeBox, false);

		// Mark as tracking numbers uploaded
		page.els.trackingRemove.addEventListener('click', ()=>openBox('box-tracking-remove'), false);
		page.els.trackingRemoveConfirm.addEventListener('click', ()=>uploadTracking(true), false);
		page.els.trackingRemoveCancel.addEventListener('click', closeBox, false);

		// Get tracking for Groupon and Mydeal
		page.els.trackingGrouponGet.addEventListener('click', getGrouponTracking, false);
		page.els.trackingMydealGet.addEventListener('click', getMydealTracking, false);

		page.els.trackingBigCommerceGet.addEventListener('click', getBigCommerceTracking, false);
		page.els.trackingBigCommerceGet2.addEventListener('click', getBigCommerceTracking2, false);

		// Amazon orders
		page.els.requestOrdersReportAmazonBtn.addEventListener('click', requestAmazonOrdersReport, false);
		page.els.downloadOrdersAmazonBtn.addEventListener('click', downloadAmazonOrders, false);

		page.els.requestProductsReportAmazonBtn.addEventListener('click', requestAmazonProductsReport, false);
		page.els.downloadProductsAmazonBtn.addEventListener('click', downloadAmazonProducts, false);
		page.els.downloadProductsImagesAmazonBtn.addEventListener('click', downloadAmazonProductsImages, false);

		page.els.downloadTrackingBtn.addEventListener('click', downloadTracking, false);

		page.els.downloadTrackingForm.addEventListener('change', showSubstore);
		//addListener('#tracking-download-option form label', 'click', showSubstore);

		page.els.downloadInventoryBtn.addEventListener('click', downloadInventory, false);

		page.els.downloadReceivedstockBtn.addEventListener('click', downloadReceivedstock, false);

		document.querySelector('#content-tracking #content-orders-filter #orderdatefrom').addEventListener('change', datefilter, false);
	    document.querySelector('#content-tracking #content-orders-filter #orderdateto').addEventListener('change', datefilter, false);
	    document.querySelector('#content-tracking #content-orders-filter #packdatefrom').addEventListener('change', datefilter, false);
	    document.querySelector('#content-tracking #content-orders-filter #packdateto').addEventListener('change', datefilter, false);

	    page.els.ordersCollectedStoreForm.addEventListener('change', showCollected, false);

	}

	// Close popup box
	addListener('#box-container .close', 'click', closeBox);

	// Don't close the popup box when it's clicked
	/*addListener('#box-container > div', 'click mousedown', function(e) {
		e.stopPropagation();
	});*/

	if(window.innerWidth < 768) {
		addListener('ul.nav-links ul.sub-nav li', 'click', function(e) {
			e.preventDefault();
			$('div.hamburger').click();
			showPanel({id: this.dataset.panel, service: this.dataset.service});
		});
	}
}, false);

document.getElementById('logout_link').addEventListener('click', function () {
	localStorage.removeItem('username');
	localStorage.removeItem('usertoken');
	window.location.href = '/login.html';
});


// Download orders
async function downloadOrders() {
	// Get selected store
	var store;
	try {
		store = page.els.downloadForm.elements['cds'].value;
	} catch (e) {}

	if (!store) {
		page.notification.show('Please select a store to download from.');
		return;
	}

	page.els.downloadBtn.disabled = true;
	page.els.downloadBtn.textContent = 'Downloading orders, please wait...';

	try {
		let response = await fetch(apiServer+'orders/download/'+page.selectedService+'/'+store);
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download the latest orders.', {hide: false});
			}
		}

		if (data.result == 'success') {
			if (response.status==201) {
				page.notification.show('The latest orders is being downloaded.', {background: 'bg-lgreen'});
			} else {
				page.notification.show('The latest orders have successfully been downloaded.', {background: 'bg-lgreen'});
			}
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadBtn.disabled = false;
	page.els.downloadBtn.textContent = 'Download orders';
}

// Download products
async function downloadProducts() {
	// Get selected store
	var store;
	try {
		store = page.els.downloadProductForm.elements['pds'].value;
	} catch (e) {}

	if (!store) {
		page.notification.show('Please select a store to download from.');
		return;
	}

	page.els.downloadProductBtn.disabled = true;
	page.els.downloadProductBtn.textContent = 'Downloading products, please wait...';

	try {
		let response = await fetch(apiServer+'items/download/'+stores[store].service+'/'+store);
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download the latest orders.', {hide: false});
			}
		}

		if (data.result == 'success') {
			page.notification.show('The products is downloading.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadProductBtn.disabled = false;
	page.els.downloadProductBtn.textContent = 'Download products';
}


// import groupon orderss
async function importGrouponOrders() {

	// Get selected store
	page.els.importGrouponBtn.disabled = true;
	page.els.importGrouponBtn.textContent = 'Importing orders, please wait...';

	try {
		let goFile = document.getElementById('grouponFile').files[0];
		/*var formData = new FormData();
		formData.append('file', goFile);
		formData.append('name', goFile.name.slice(0, -12));*/
		let response = await fetch(apiServer+'orders/import/groupon', {method: 'post', body: goFile});

		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download the latest orders.', {hide: false});
			}
		}

		if (data.result == 'success') {
			page.notification.show('The orders has been imported.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.importGrouponBtn.disabled = false;
	page.els.importGrouponBtn.textContent = 'Import Groupon';
}

// import mydeal orderss
async function importMydealOrders() {

	// Get selected store
	page.els.importMydealBtn.disabled = true;
	page.els.importMydealBtn.textContent = 'Importing orders, please wait...';

	try {
		let mdFile = document.getElementById('mydealFile').files[0];
		/*var formData = new FormData();
		formData.append('file', goFile);
		formData.append('name', goFile.name.slice(0, -12));*/
		let response = await fetch(apiServer+'orders/import/mydeal', {method: 'post', body: mdFile});

		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download the latest orders.', {hide: false});
			}
		}

		if (data.result == 'success') {
			page.notification.show('The orders has been imported.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.importMydealBtn.disabled = false;
	page.els.importMydealBtn.textContent = 'Import Mydeal';
}

// Get orders from database
async function getOrders() {
	let panelID = '#content-show-orders';
	page.els.ordersRefresh.disabled = true;
	page.els.ordersReset.disabled = true;
	page.els.ordersSave.disabled = true;

	do {
		let response, data;
		try {
			response = await fetch(apiServer+'orders/get/bigcommerce');
			data = await response.json();
			window.orders = data;

			if (!response.ok) {
				page.notification.show('Error: '+data.result);
				break;
			}
		}
		catch (e) {
			page.notification.show('Error: Could not connect to the server.');
			break;
		}

		let tableBody = document.querySelector(panelID+' table tbody');
		page.ordersLoaded = true;

		// Remove all entries from table
		while (tableBody.firstChild) {
			tableBody.removeChild(tableBody.firstChild);
		}

		if (!data.orders || data.result == 'No orders.') {
			let tr = document.createElement('tr'), td = document.createElement('td');
			tr.dataset.noorders = 'true';
			td.colSpan = 14;
			td.className = 'centre';
			td.textContent = 'No orders';
			tr.appendChild(td);
			tableBody.appendChild(tr);
			break;
		}
		else if (data.result != 'success') {
			page.notification.show(data.result, {hide: false});
			break;
		}

		// Add orders to table
		let cols = [
			'StoreID', 'RecordID', 'UserID', 'TotalPrice', 'BuyerFirstName', 'BuyerLastName', 'BuyerFullName',
			'BuyerAddress1', 'BuyerAddress2', 'BuyerCity', 'BuyerState',
			'BuyerPostcode', 'BuyerCountry', 'PhoneNumber', 'deliveryNote'
		];
		let colsNotEditable = {
			'StoreID': 1, 'RecordID': 1, 'UserID': 1, 'TotalPrice': 1, 'BuyerFirstName': 1, 'BuyerLastName': 1
		};
		let colsSelectText = {
			'StoreID': 1, 'RecordID': 1, 'UserID': 1, 'TotalPrice': 1
		};

		for (let storeID in data.orders) {
			for (let orderData of data.orders[storeID]) {
				// Add order details
				let order = orderData.data;
				let tr = document.createElement('tr'), trMsg = null;

				// Order info
				let express = order.PostageService ? order.PostageService.toLowerCase().includes('express') : false;
				let international = order.BuyerCountry && order.BuyerCountry.toUpperCase() != 'AU';
				//order.rowID = orderData.id; // Add the row ID to the order

				tr.dataset.store = storeID;
				tr.dataset.id = orderData.id;
				tr.dataset.sku = orderData.data.Items[0].SKU;
				if (express) tr.dataset.express = 1;
				if (international) tr.dataset.international = 1;

				// Checkbox
				let td = document.createElement('td'), input = document.createElement('input');
				td.className = 'selected';
				input.type = 'checkbox';
				input.autocomplete = 'off';
				td.appendChild(input);
				tr.appendChild(td);

				// Order details
				for (let col of cols) {
					let td = document.createElement('td');
					td.dataset.col = col;
					if (!colsNotEditable.hasOwnProperty(col)) td.contentEditable = true;
					else if (colsSelectText.hasOwnProperty(col)) td.dataset.selecttext = 1;

					let text = '';
					switch (col) {
						case 'StoreID':
							text = stores[storeID].name;
							break;
						case 'deliveryNote':
							text = orderData.deliveryNote;
							break;
						/*case 'id':
							text = orderData.id;
							break;*/
						default:
							text = order[col];
					}

					td.textContent = text || '';
					tr.appendChild(td);
				}

				let notPaid = false;
				if (stores[storeID].checkPayment !== false) {
					if ((order.PaymentMethod && order.PaymentMethod.toUpperCase() == 'NONE') || order.PaymentStatus.toUpperCase() != 'PAID') {
						// Not paid yet
						tr.classList.add('bg-red');
						tr.dataset.notpaid = 'true';
						notPaid = true;
					}
					else if ((order.PaymentMethod && order.PaymentMethod.toLowerCase() == 'moneyxferacceptedincheckout') || order.TransactionID.toUpperCase() == 'SIS' || order.TransactionID.length <= 5) {
						// Payment pending
						tr.classList.add('bg-orange');
						tr.dataset.notpaid = 'true';
						notPaid = true;
					}
				}

				if (order.Note) {
					// Add message row
					let td = document.createElement('td'), td2 = document.createElement('td');
					trMsg = document.createElement('tr')
					trMsg.dataset.store = storeID;
					trMsg.dataset.id = orderData.id;
					if (express) trMsg.dataset.express = 1;
					if (international) trMsg.dataset.international = 1;
					if (notPaid) trMsg.dataset.notpaid = 1;

					tr.dataset.message = 1;
					tr.classList.add('msg1');

					trMsg.dataset.message = 1;
					trMsg.classList.add('msg2');

					td.colSpan = 2;
					td.textContent = 'Message:';
					td2.colSpan = 14;
					td2.textContent = order.Note;

					trMsg.appendChild(td);
					trMsg.appendChild(td2);
				}

				tableBody.appendChild(tr);
				if (trMsg) tableBody.appendChild(trMsg);
			}
		}

		// Listen for when an entry is changed
		let orderTr = panelID+' table tbody tr';
		removeListener(orderTr, 'input', orderChanged);
		addListener(orderTr, 'input', orderChanged);

		// Select/de-select order
		let orderTdSelected = panelID+' table tbody td.selected';
		removeListener(orderTdSelected, 'click', selectOrder);
		addListener(orderTdSelected, 'click', selectOrder);

		// Auto select text for relevant columns
		removeListener(panelID+' table tbody td', 'click', selectText);
		addListener(panelID+' table tbody td[data-selecttext]', 'click', selectText);

		page.els.filterForm.querySelectorAll('input')[0].checked = true;
		filterOrders({target: page.els.filterForm.querySelector('input[value="all"]')});
	} while(0)

	// Uncheck "select all" button
	document.querySelector(panelID+' table thead th.selected-all input').checked = false;

	page.els.ordersRefresh.disabled = false;
	page.els.ordersReset.disabled = false;
	page.els.ordersSave.disabled = false;
}

// Get orders from database
async function getCollectedOrders() {
	let panelID = '#content-collected-orders';
	do {
		let response, data;
		let collect;
		try {
			collect = page.els.ordersCollectedStoreForm.elements['ocs'].value;
		} catch (e) {}

		if (!collect) {
			page.notification.show('Please select store.');
			return;
		}

		try {
			response = await fetch(apiServer+'orders/getcollected');
			data = await response.json();
			window.collectedOrders = data;
			if (!response.ok) {
				page.notification.show('Error: '+data.result);
				break;
			}
		}
		catch (e) {
			page.notification.show('Error: Could not connect to the server.');
			break;
		}

		let tableBody = document.querySelector(panelID+' table tbody');
		page.ordersLoaded = true;

		// Remove all entries from table
		while (tableBody.firstChild) {
			tableBody.removeChild(tableBody.firstChild);
		}

		if (!data.orders || data.result == 'No orders.') {
			let tr = document.createElement('tr'), td = document.createElement('td');
			tr.dataset.noorders = 'true';
			td.colSpan = 14;
			td.className = 'centre';
			td.textContent = 'No orders';
			tr.appendChild(td);
			tableBody.appendChild(tr);
			break;
		}
		else if (data.result != 'success') {
			page.notification.show(data.result, {hide: false});
			break;
		}

		// Add orders to table
		let cols = [
			'StoreID', 'RecordID', 'UserID', 'TotalPrice', 'BuyerFirstName', 'BuyerLastName', 'BuyerFullName',
			'BuyerAddress1', 'BuyerAddress2', 'BuyerCity', 'BuyerState',
			'BuyerPostcode', 'BuyerCountry', 'PhoneNumber', 'deliveryNote'
		];

		/*let colsSelectText = {
			'StoreID': 1, 'RecordID': 1, 'UserID': 1, 'TotalPrice': 1
		};*/

		for (let storeID in data.orders) {
			for (let orderData of data.orders[storeID]) {
				// Add order details
				let order = orderData.data;
				let tr = document.createElement('tr'), trMsg = null;

				// Order info
				let express = order.PostageService ? order.PostageService.toLowerCase().includes('express') : false;
				let international = order.BuyerCountry && order.BuyerCountry.toUpperCase() != 'AU';
				//order.rowID = orderData.id; // Add the row ID to the order

				tr.dataset.store = storeID;
				tr.dataset.id = orderData.id;
				tr.dataset.sku = orderData.data.Items[0].SKU;
				if (express) tr.dataset.express = 1;
				if (international) tr.dataset.international = 1;

				// Checkbox
				let td = document.createElement('td'), input = document.createElement('input');
				td.className = 'selected';
				input.type = 'checkbox';
				input.autocomplete = 'off';
				td.appendChild(input);
				tr.appendChild(td);

				// Order details
				for (let col of cols) {
					let td = document.createElement('td');
					td.dataset.col = col;

					let text = '';
					switch (col) {
						case 'StoreID':
							text = stores[storeID].name;
							break;
						case 'deliveryNote':
							text = orderData.deliveryNote;
							break;
						/*case 'id':
							text = orderData.id;
							break;*/
						default:
							text = order[col];
					}

					td.textContent = text || '';
					tr.appendChild(td);
				}

				if (order.Note) {
					// Add message row
					let td = document.createElement('td'), td2 = document.createElement('td');
					trMsg = document.createElement('tr')
					trMsg.dataset.store = storeID;
					trMsg.dataset.id = orderData.id;
					if (express) trMsg.dataset.express = 1;
					if (international) trMsg.dataset.international = 1;
					//if (notPaid) trMsg.dataset.notpaid = 1;

					tr.dataset.message = 1;
					tr.classList.add('msg1');

					trMsg.dataset.message = 1;
					trMsg.classList.add('msg2');

					td.colSpan = 2;
					td.textContent = 'Message:';
					td2.colSpan = 14;
					td2.textContent = order.Note;

					trMsg.appendChild(td);
					trMsg.appendChild(td2);
				}

				tableBody.appendChild(tr);

				if (collect=='All others') {
					if (storeID==71 || storeID==8) {
						tr.classList.add('hide');
					} else {
						tr.classList.remove('hide');
					}
				} else if (collect=='Hobbycos'){
					if (storeID != 71 && storeID != 8) {
						tr.classList.add('hide');
					} else {
						tr.classList.remove('hide');
					}
				}

				if (trMsg) tableBody.appendChild(trMsg);
			}
		}

		// Select/de-select order
		let orderTdSelected = panelID+' table tbody td.selected';
		removeListener(orderTdSelected, 'click', selectOrder);
		addListener(orderTdSelected, 'click', selectOrder);
	} while(0)

	// Uncheck "select all" button
	document.querySelector(panelID+' table thead th.selected-all input').checked = false;
}

async function showCollected() {
	let panelID = '#content-collected-orders';
	let trs = document.querySelectorAll(panelID+' table tbody tr');
	let collect;
	try {
		collect = page.els.ordersCollectedStoreForm.elements['ocs'].value;
	} catch (e) {}

	for (let tr of trs) {
		let storeID = tr.dataset.store;
		if (collect=='All others') {
			if (storeID=='71' || storeID=='8') {
				tr.classList.add('hide');
			} else {
				tr.classList.remove('hide');
			}
		} else if (collect=='Hobbycos'){
			if (storeID != '71' && storeID != '8') {
				tr.classList.add('hide');
			} else {
				tr.classList.remove('hide');
			}
		}
	}
}

// Save order changes to the database
async function saveOrders() {
	var orderData = [];
	var trs = document.querySelectorAll('#content-show-orders table tbody tr');
	var cols = [
		'BuyerFullName', 'BuyerAddress1', 'BuyerAddress2', 'BuyerCity',
		'BuyerState', 'BuyerPostcode', 'BuyerCountry', 'PhoneNumber', 'deliveryNote'
	];

	for (let tr of trs) {
		if (!tr.dataset.changed || tr.classList.contains('msg2')) continue; // Skip rows with messages
		let orderItem = {
			id: tr.dataset.id,
			//store: tr.dataset.store,
		};
		for (let col of cols) {
			orderItem[col] = tr.querySelector('td[data-col="'+col+'"]').textContent;
		}
		orderData.push(orderItem);
	}

	if (!orderData.length) {
		page.notification.show('No orders have been changed.');
		return;
	}


	page.els.ordersRefresh.disabled = true;
	page.els.ordersReset.disabled = true;
	page.els.ordersSave.disabled = true;

	try {
		let formData = new FormData();
		formData.append('orders', JSON.stringify(orderData));

		let response = await fetch(apiServer+'orders/save', {method: 'put', body: formData});
		let data = await response.json();

		if (!response.ok) {
			page.notification.show('Error: '+data.result);
		}

		if (data.result == 'success') {
			page.notification.show('Changes to the orders have been saved into the database.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(data.result);
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.ordersRefresh.disabled = false;
	page.els.ordersReset.disabled = false;
	page.els.ordersSave.disabled = false;
}

// Add orders for collection
async function addOrdersCollect() {
	closeBox();

	// Get selected orders
	var selectedOrders = [];
	var selectedOrdersSorted = [];
	var tableBody = document.querySelector('#content-show-orders table tbody');
	var tableBodyTrs = tableBody.querySelectorAll('tr');
	for (let tr of tableBodyTrs) {
		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput && selectedInput.checked) selectedOrders.push([tr.dataset.id, tr.dataset.sku]);
	}

	selectedOrders.sort((a,b) => {
		if (a[1]<b[1]) return -1;
		if (a[1]>b[1]) return 1;
		return 0;
	})

	//console.log(selectedOrders);

	for (let order of selectedOrders) {
		selectedOrdersSorted.push(order[0]);
	}



	if (!selectedOrders.length) {
		page.notification.show('No orders selected.');
		return;
	}

	var ordersAddCollectOriginal = page.els.ordersAddCollect.textContent;
	page.els.ordersAddCollect.disabled = true;
	page.els.ordersAddCollect.textContent = 'Adding orders for collection...';

	try {
		let formData = new FormData();
		formData.append('orders', JSON.stringify(selectedOrdersSorted));

		let response = await fetch(apiServer+'orders/addcollect', {method: 'post', body: formData});
		let data = await response.json();

		if (response.ok) {
			if (data.result == 'success') {
				page.notification.show('Orders have been added for collection.', {background: 'bg-lgreen'});
				getOrders(); // Refresh orders
			}
			else {
				page.notification.show(data.result, {hide: false});
			}
		}
		else {
			if (data.result) {
				page.notification.show('Error: '+data.result, {hide: false});
			}
			else {
				page.notification.show('Error: Could not add orders for collection.', {hide: false});
			}
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.ordersAddCollect.disabled = false;
	page.els.ordersAddCollect.textContent = ordersAddCollectOriginal;
}

// Add orders for printing
async function addOrdersPrint() {
	closeBox();

	// Get selected orders
	var selectedOrders = [];
	var selectedOrdersSorted = [];
	var tableBody = document.querySelector('#content-collected-orders table tbody');
	var tableBodyTrs = tableBody.querySelectorAll('tr');
	for (let tr of tableBodyTrs) {
		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput && selectedInput.checked) selectedOrders.push([tr.dataset.id, tr.dataset.sku]);
	}

	selectedOrders.sort((a,b) => {
		if (a[1]<b[1]) return -1;
		if (a[1]>b[1]) return 1;
		return 0;
	})

	//console.log(selectedOrders);

	for (let order of selectedOrders) {
		selectedOrdersSorted.push(order[0]);
	}



	if (!selectedOrders.length) {
		page.notification.show('No orders selected.');
		return;
	}

	var ordersAddPrintOriginal = page.els.ordersAddPrint.textContent;
	page.els.ordersAddPrint.disabled = true;
	page.els.ordersAddPrint.textContent = 'Adding orders for printing...';

	try {
		let formData = new FormData();
		formData.append('orders', JSON.stringify(selectedOrdersSorted));

		let response = await fetch(apiServer+'orders/addprint', {method: 'post', body: formData});
		let data = await response.json();

		if (response.ok) {
			if (data.result == 'success') {
				page.notification.show('Orders have been added for printing.', {background: 'bg-lgreen'});
				getCollectedOrders(); // Refresh orders
			}
			else {
				page.notification.show(data.result, {hide: false});
			}
		}
		else {
			if (data.result) {
				page.notification.show('Error: '+data.result, {hide: false});
			}
			else {
				page.notification.show('Error: Could not add orders for printing.', {hide: false});
			}
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.ordersAddPrint.disabled = false;
	page.els.ordersAddPrint.textContent = ordersAddPrintOriginal;
}


// Remove orders
async function removeOrders() {
	closeBox();

	// Get selected orders
	var selectedOrders = [];
	var tableBody = document.querySelector('#content-show-orders table tbody');
	var tableBodyTrs = tableBody.querySelectorAll('tr');
	for (let tr of tableBodyTrs) {
		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput && selectedInput.checked) selectedOrders.push(tr.dataset.id);
	}

	if (!selectedOrders.length) {
		page.notification.show('No orders selected.');
		return;
	}

	page.els.ordersRemove.disabled = true;

	try {
		let formData = new FormData();
		formData.append('orders', JSON.stringify(selectedOrders));

		let response = await fetch(apiServer+'orders/remove', {method: 'delete', body: formData});
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+data.result, {hide: false});
			}
			else {
				page.notification.show('Error: The selected orders could not be set to cancelled in the database.', {hide: false});
			}
		}

		if (data.result == 'success') {
			page.notification.show('The selected orders have been set to cancelled in the database.', {background: 'bg-lgreen'});
			getOrders(); // Refresh orders
		}
		else {
			page.notification.show(data.result, {hide: false});
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.ordersRemove.disabled = false;
}



// Get unsent orders from database
async function getUnsentOrders() {
	let panelID = '#content-orders-mark-sent';
	page.els.ordersMarkSentRefresh.disabled = true;
	page.els.ordersMarkSent.disabled = true;

	do {
		let response, data;
		try {
			response = await fetch(apiServer+'orders/unsent/get/all');
			data = await response.json();

			if (!response.ok) {
				page.notification.show('Error: '+data.result);
				break;
			}
		}
		catch (e) {
			page.notification.show('Error: Could not connect to the server.');
			break;
		}

		let tableBody = document.querySelector(panelID+' table tbody');

		// Remove all entries from table
		while (tableBody.firstChild) {
			tableBody.removeChild(tableBody.firstChild);
		}

		if (!data.orders || data.result == 'No unsent orders.') {
			let tr = document.createElement('tr'), td = document.createElement('td');
			tr.dataset.noorders = 'true';
			td.colSpan = 13;
			td.className = 'centre';
			td.textContent = 'No orders';
			tr.appendChild(td);
			tableBody.appendChild(tr);
			break;
		}
		else if (data.result != 'success') {
			page.notification.show(data.result, {hide: false});
			break;
		}

		// Add orders to table
		let cols = [
			'id', 'StoreID', 'RecordID', 'BuyerFullName',
			'BuyerAddress1', 'BuyerAddress2', 'BuyerCity', 'BuyerState',
			'BuyerPostcode', 'BuyerCountry', 'trackingID', 'deliveryNote'
		];
		//let colsSelectText = {'StoreID': 1, 'id': 1, 'RecordID': 1, 'UserID': 1};

		for (let storeID in data.orders) {
			for (let orderData of data.orders[storeID]) {

				// Skip cancelled orders
				if ([ORDER_STATUS.CANCELLED.OUTOFSTOCK, ORDER_STATUS.CANCELLED.DISCONTINUED, ORDER_STATUS.CANCELLED.DONE].includes(orderData.status)) continue;

				// Add order details
				let order = orderData.data;
				let tr = document.createElement('tr');

				// Order info
				tr.dataset.store = storeID;
				tr.dataset.id = orderData.id;
				tr.dataset.status = orderData.status;

				// Checkbox
				let td = document.createElement('td'), input = document.createElement('input');
				td.className = 'selected';
				input.type = 'checkbox';
				input.autocomplete = 'off';
				td.appendChild(input);
				tr.appendChild(td);

				// Order details
				for (let col of cols) {
					let td = document.createElement('td');
					td.dataset.col = col;
					//if (colsSelectText.hasOwnProperty(col)) td.dataset.selecttext = 1;

					let text = '';
					switch (col) {
						case 'id':
							text = orderData.id;
							break;
						case 'StoreID':
							text = stores[storeID].name;
							break;
						case 'deliveryNote':
							text = orderData.deliveryNote;
							break;
						case 'trackingID':
							text = orderData.trackingID;
							break;
						default:
							text = order[col];
					}

					td.textContent = text || '';
					tr.appendChild(td);
				}

				if ((order.PaymentMethod && order.PaymentMethod.toUpperCase() == 'NONE') || (order.PaymentStatus && order.PaymentStatus.toUpperCase() != 'PAID')) {
					// Not paid yet
					tr.classList.add('bg-red');
					tr.dataset.notpaid = 'true';
				}
				else if ((order.PaymentMethod && order.PaymentMethod.toLowerCase() == 'moneyxferacceptedincheckout') || (order.TransactionID && (order.TransactionID.toUpperCase() == 'SIS' || order.TransactionID.length <= 5))) {
					// Payment pending
					tr.classList.add('bg-orange');
					tr.dataset.notpaid = 'true';
				}

				tableBody.appendChild(tr);
			}
		}

		// Listen for when an entry is changed
		let orderTr = panelID+' table tbody tr';
		removeListener(orderTr, 'input', orderChanged);
		addListener(orderTr, 'input', orderChanged);

		// Select/de-select order
		let orderTdSelected = panelID+' table tbody td.selected';
		removeListener(orderTdSelected, 'click', selectOrder);
		addListener(orderTdSelected, 'click', selectOrder);

		// Auto select text for relevant columns
		//removeListener(panelID+' table tbody td', 'click', selectText);
		//addListener(panelID+' table tbody td[data-selecttext]', 'click', selectText);

		page.els.ordersMarkSentStoreForm.querySelectorAll('input')[0].checked = true;
		page.els.ordersMarkSentStatusForm.querySelectorAll('input')[0].checked = true;
		filterOrders({target: page.els.ordersMarkSentStoreForm.querySelector('input[value="all"]')});
	} while(0)

	// Uncheck "select all" button
	document.querySelector(panelID+' table thead th.selected-all input').checked = false;

	page.els.ordersMarkSentRefresh.disabled = false;
	page.els.ordersMarkSent.disabled = false;
}

// Marks orders as sent
async function markOrdersAsSent() {
	closeBox();

	// Get selected orders
	var selectedOrders = [];
	var tableBody = document.querySelector('#content-orders-mark-sent table tbody');
	var tableBodyTrs = tableBody.querySelectorAll('tr');
	for (let tr of tableBodyTrs) {
		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput && selectedInput.checked) selectedOrders.push(tr.dataset.id);
	}

	if (!selectedOrders.length) {
		page.notification.show('No orders selected.');
		return;
	}

	var ordersMarkSentOriginal = page.els.ordersMarkSent.textContent;
	page.els.ordersMarkSent.disabled = true;
	page.els.ordersMarkSent.textContent = 'Marking orders as sent, please wait...';

	try {
		let formData = new FormData();
		formData.append('orders', JSON.stringify(selectedOrders));
		//if (page.local) formData.append('dbonly', '1');

		let response = await fetch(apiServer+'orders/unsent/marksent', {method: 'post', body: formData});
		let data = await response.json();

		if (response.ok) {
			if (data.result == 'success') {
				//page.notification.show('Orders have been marked as sent'+(page.local ? ' (only in the database)' : '')+'.', {background: 'bg-lgreen'});
				page.notification.show('Orders have been marked as sent.', {background: 'bg-lgreen'});
				getUnsentOrders(); // Refresh
			}
			else {
				page.notification.show(data.result, {hide: false});
			}
		}
		else {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not mark orders as sent.', {hide: false});
			}
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.ordersMarkSent.disabled = false;
	page.els.ordersMarkSent.textContent = ordersMarkSentOriginal;
}



// Get orders from database that have not had their tracking uploaded
async function getTrackingOrders() {
	// Get selected store
	var store;
	try {
		store = page.els.trackingStoreForm.elements['uts'].value;
	} catch (e) {}

	if (!store) {
		page.notification.show('Please select a store first.');
		return;
	}

	let panelID = '#content-tracking';
	page.els.trackingRefresh.disabled = true;
	page.els.trackingReset.disabled = true;
	page.els.trackingSave.disabled = true;

	do {
		let response, data;
		try {
			response = await fetch(apiServer+'orders/tracking/get/'+store);
			data = await response.json();

			if (!response.ok) {
				page.notification.show('Error: '+data.result);
				break;
			}
		}
		catch (e) {
			page.notification.show('Error: Could not connect to the server.');
			break;
		}

		let tableBody = document.querySelector(panelID+' table tbody');
		page.trackingLoaded = true;

		// Remove all entries from table
		while (tableBody.firstChild) {
			tableBody.removeChild(tableBody.firstChild);
		}

		if (!data.orders || data.result == 'No orders.') {
			let tr = document.createElement('tr'), td = document.createElement('td');
			tr.dataset.noorders = 'true';
			td.colSpan = 14;
			td.className = 'centre';
			td.textContent = 'No orders';
			tr.appendChild(td);
			tableBody.appendChild(tr);
			break;
		}
		else if (data.result != 'success') {
			page.notification.show(data.result, {hide: false});
			break;
		}

		// Add orders to table
		let cols = [
			'id', 'RecordID', 'UserID', 'BuyerFullName',
			'BuyerAddress1', 'BuyerAddress2', 'BuyerCity', 'BuyerState',
			'BuyerPostcode', 'BuyerCountry', 'trackingID', 'orderedTime', 'packedTime'
		];
		let colsEditable = {'trackingID': 1};
		//let colsSelectText = {'id': 1, 'RecordID': 1, 'UserID': 1};
		console.log(data.orders);
		var dt = new Date();
		dt.setMonth(dt.getMonth()-1);

		for (let storeID in data.orders) {
			for (let orderData of data.orders[storeID]) {
				// Skip cancelled orders
				if ([ORDER_STATUS.CANCELLED.OUTOFSTOCK, ORDER_STATUS.CANCELLED.DISCONTINUED, ORDER_STATUS.CANCELLED.DONE].includes(orderData.status)) continue;

				// Add order details
				let order = orderData.data;

				let createDate = new Date(order.DateCreated);
				if (dt.getTime() > createDate.getTime()) continue;

				let tr = document.createElement('tr');

				// Order info
				//let express = order.PostageService == 'AU_ExpressDelivery';
				//let international = order.BuyerCountry && order.BuyerCountry.toUpperCase() != 'AU';
				//order.rowID = orderData.id; // Add the row ID to the order

				tr.dataset.store = storeID;
				tr.dataset.id = orderData.id;
				tr.dataset.type = orderData.type;
				tr.dataset.orderedTime = orderData.orderedTime;
				tr.dataset.packedTime = orderData.packedTime;
				//if (express) tr.dataset.express = 1;
				//if (international) tr.dataset.international = 1;

				// Checkbox
				let td = document.createElement('td'), input = document.createElement('input');
				td.className = 'selected';
				input.type = 'checkbox';
				input.autocomplete = 'off';
				td.appendChild(input);
				tr.appendChild(td);

				// Order details
				for (let col of cols) {
					let td = document.createElement('td');
					td.dataset.col = col;
					if (colsEditable.hasOwnProperty(col)) td.contentEditable = true;
					//else if (colsSelectText.hasOwnProperty(col)) td.dataset.selecttext = 1;

					let text = '';
					switch (col) {
						case 'id':
							text = orderData.id;
							break;
						case 'trackingID':
							text = orderData.trackingID;
							break;
						case 'orderedTime':
							text = orderData.orderedTime;
							break;
						case 'packedTime':
							text = orderData.packedTime;
							break;
						default:
							text = order[col];
					}

					if (col=='orderedTime' || col=='packedTime') {
						let pre = document.createElement('pre');
						pre.textContent = text || '';
						td.appendChild(pre);
					} else {
						td.textContent = text || '';
					}
					tr.appendChild(td);
				}


				if (orderData.trackingID) {
					// Order has tracking number
					tr.classList.add('bg-lgreen');
				}

				if (orderData.status == ORDER_STATUS.OUTOFSTOCK) {
					// Order is out of stock
					tr.classList.add('bg-red');
				}

				tableBody.appendChild(tr);
			}
		}

		// Listen for when an entry is changed
		let orderTr = panelID+' table tbody tr';
		removeListener(orderTr, 'input', orderChanged);
		addListener(orderTr, 'input', orderChanged);

		// Select/de-select order
		let orderTdSelected = panelID+' table tbody td.selected';
		removeListener(orderTdSelected, 'click', selectOrder);
		addListener(orderTdSelected, 'click', selectOrder);

		// Auto select text for relevant columns
		//removeListener(panelID+' table tbody td', 'click', selectText);
		//addListener(panelID+' table tbody td[data-selecttext]', 'click', selectText);

		page.els.trackingTypeForm.querySelectorAll('input')[0].checked = true;
		filterOrders({target: page.els.trackingTypeForm.querySelector('input[value="all"]')});
	} while(0)

	// Uncheck "select all" button
	document.querySelector(panelID+' table thead th.selected-all input').checked = false;

	page.els.trackingRefresh.disabled = false;
	page.els.trackingReset.disabled = false;
	page.els.trackingSave.disabled = false;
}

// Save tracking number changes to the database
async function saveTracking() {
	var orderData = [];
	var trs = document.querySelectorAll('#content-tracking table tbody tr');
	var cols = ['trackingID'];

	for (let tr of trs) {
		if (!tr.dataset.changed) continue;
		let orderItem = {
			id: tr.dataset.id,
		};
		for (let col of cols) {
			orderItem[col] = tr.querySelector('td[data-col="'+col+'"]').textContent;
		}
		orderData.push(orderItem);
	}

	if (!orderData.length) {
		page.notification.show('No orders have been changed.');
		return;
	}


	page.els.trackingRefresh.disabled = true;
	page.els.trackingReset.disabled = true;
	page.els.trackingSave.disabled = true;

	try {
		let formData = new FormData();
		formData.append('orders', JSON.stringify(orderData));

		let response = await fetch(apiServer+'orders/tracking/save', {method: 'put', body: formData});
		let data = await response.json();

		if (!response.ok) {
			page.notification.show('Error: '+data.result);
		}

		if (data.result == 'success') {
			page.notification.show('Changes to the tracking numbers have been saved into the database.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(data.result);
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.trackingRefresh.disabled = false;
	page.els.trackingReset.disabled = false;
	page.els.trackingSave.disabled = false;
}

// Select all orders with tracking numbers
async function selectOrdersWithTracking() {
	var trs = document.querySelectorAll('#content-tracking table tbody tr:not(.hide)');
	for (let tr of trs) {
		let trackingID = tr.querySelector('td[data-col="trackingID"]');
		if (!trackingID || !trackingID.textContent) continue;

		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput) selectedInput.checked = true;
	}
}

// Upload tracking details
async function uploadTracking(savedbonly = false) {
	var dbonly = savedbonly || page.local;
	closeBox();

	// Get selected orders
	var selectedOrders = [];
	var tableBody = document.querySelector('#content-tracking table tbody');
	var tableBodyTrs = tableBody.querySelectorAll('tr');
	for (let tr of tableBodyTrs) {
		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput && selectedInput.checked) selectedOrders.push(tr.dataset.id);
	}

	if (!selectedOrders.length) {
		page.notification.show('No orders selected.');
		return;
	}

	var trackingUploadBtn = savedbonly ? 'trackingRemove' : 'trackingUpload';
	var trackingUploadOriginal = page.els[trackingUploadBtn].textContent;
	page.els.trackingUpload.disabled = true;
	page.els.trackingRemove.disabled = true;
	page.els[trackingUploadBtn].textContent = dbonly ? 'Marking tracking for orders as uploaded...' : 'Uploading tracking details, please wait...';

	try {
		let formData = new FormData();
		formData.append('orders', JSON.stringify(selectedOrders));
		if (dbonly) formData.append('dbonly', '1');

		let response = await fetch(apiServer+'orders/tracking/upload', {method: 'post', body: formData});
		let data = await response.json();

		if (response.ok) {
			if (data.result == 'success') {
				let text = '';
				if (dbonly) {
					text = 'Tracking details for the selected orders have been marked as uploaded in the database.';
				}
				else {
					text = 'Tracking details for the selected orders have been uploaded.';
				}

				page.notification.show(text, {background: 'bg-lgreen'});
				//getTrackingOrders(); // Refresh
			}
			else {
				page.notification.show(JSON.stringify(data.result), {hide: false});
			}
		}
		else {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not upload tracking details and/or update the database.', {hide: false});
			}
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.trackingUpload.disabled = false;
	page.els.trackingRemove.disabled = false;
	page.els[trackingUploadBtn].textContent = trackingUploadOriginal;
}


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

// Mark order as changed
function orderChanged(e) {
	if (e.target.innerHTML == '<br>') e.target.textContent = ''; // Remove empty line if needed
	e.target.parentNode.dataset.changed = 1;
}


// Filter orders
function filterOrders(e) {
	var tableBody = e.target.closest('.content-page').querySelector('table tbody');
	var tableBodyTrs = tableBody.querySelectorAll('tr');
	var checkedItems = e.target.closest('.options').querySelectorAll('form[data-multi] input:checked');
	if (!checkedItems.length) checkedItems = [e.target];

	for (let tr of tableBodyTrs) {
		// Check filters
		let showOrder = true;
		for (let item of checkedItems) {
			let type = item.dataset.filter, filter = item.value;
			if (!type || !filter) continue;

			if (!(filter == 'all' ||
				(type == 'neworder' && ((filter == 'messages' && tr.dataset.message) || (filter == 'paid' && !tr.dataset.notpaid) || (filter == 'notpaid' && tr.dataset.notpaid) ||
										(filter == 'express' && tr.dataset.express) || (filter == 'international' && tr.dataset.international))) ||
				(type == 'store' && tr.dataset.store == filter) || (type == 'status' && tr.dataset.status == filter) || (type == 'type' && tr.dataset.type == filter) ||
				tr.dataset.noorders)) {
				showOrder = false;
				break;
			}
		}

		if (showOrder) {
			// Show order
			tr.classList.remove('hide');
		}
		else {
			// Hide order
			tr.classList.add('hide');
		}
	}

	colourRows(tableBody);
	unselectAllOrders(tableBody);
}

// Colour rows
function colourRows(tableBody) {
	var trs = tableBody.querySelectorAll('tr:not(.hide)');
	var coloured = false;

	for (let tr of trs) {
		tr.classList[coloured ? 'add' : 'remove']('colour');
		if (!tr.classList.contains('msg1')) coloured = !coloured;
	}
}

function showPanel(data = {}) {
	var tabId = data.id;
	var serviceId = data.service;

	// Select menu item
	if (!tabId) return;

	// Service
	page.selectedService = SERVICES.hasOwnProperty(serviceId) ? serviceId : null;

	// Show panel
	var contentPanels = document.querySelectorAll('#content-container > .content-page');
	for (var i = 0; i < contentPanels.length; ++i) {
		contentPanels[i].classList.add('hide');
	}
	//var panelDiv = tabId ? document.getElementById(tabId) : document.getElementById('content-container').children[0];
	document.getElementById(tabId).classList.remove('hide');

	if (tabId == 'content-download') {
		// Show relevant store buttons
		for (let input of page.els.downloadForm.querySelectorAll('input')) {
			let show = (input.dataset.service == page.selectedService || input.dataset.service == 'all');
			input.disabled = !show;
			page.els.downloadForm.querySelector('label[for="'+input.id+'"]').classList[show ? 'remove' : 'add']('hide');
		}
	}
	else if (tabId == 'content-show-orders') {
		if (!page.ordersLoaded) getOrders();
	}
	else if (tabId == 'content-collected-orders') {
		//if (!page.ordersLoaded) getCollectedOrders();
		getCollectedOrders();
	}
	else if (tabId == 'content-orders-mark-sent') {
		getUnsentOrders();
	}
	else if (tabId == 'content-tracking') {
		if (!page.trackingLoaded) getTrackingOrders();
	}
	else if (tabId == 'products-download-container') {
		for (let input of page.els.downloadProductForm.querySelectorAll('input')) {
			let show = (input.dataset.service == SERVICE_IDS['EBAY'] || input.dataset.service == SERVICE_IDS['WOOCOMMERCE'] || input.dataset.service == SERVICE_IDS['SHOPIFY'] || input.dataset.service == SERVICE_IDS['NETO']
				|| input.dataset.service == SERVICE_IDS['MAGENTO'] || input.dataset.service == SERVICE_IDS['BIGCOMMERCE'] || input.dataset.service == SERVICE_IDS['MULTISTORE'] || input.dataset.service == 'all');
			input.disabled = !show;
			page.els.downloadProductForm.querySelector('label[for="'+input.id+'"]').classList[show ? 'remove' : 'add']('hide');
		}
	}
	else if (tabId == 'content-download-tracking') {
		for (let input of page.els.downloadTrackingForm.querySelectorAll('input')) {
			//let show = input.dataset.service == SERVICE_IDS['EBAY'] || input.value == 30 || input.dataset.service == SERVICE_IDS['WOOCOMMERCE'] || input.dataset.service == SERVICE_IDS['NETO'] || input.dataset.service == SERVICE_IDS['SHOPIFY'];
			let show = input.value == 30;
			input.disabled = !show;
			page.els.downloadTrackingForm.querySelector('label[for="'+input.id+'"]').classList[show ? 'remove' : 'add']('hide');
		}

		document.querySelector('#datefrom').value = '';
		document.querySelector('#dateto').value = '';
	}
	else if (tabId == 'content-download-inventory') {
		for (let input of page.els.downloadInventoryForm.querySelectorAll('input')) {
			let show = true;
			input.disabled = !show;
			page.els.downloadInventoryForm.querySelector('label[for="'+input.id+'"]').classList[show ? 'remove' : 'add']('hide');
		}
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

// Get groupon tracking
async function getGrouponTracking(e) {

	page.els.trackingGrouponGet.disabled = true;
	page.els.trackingGrouponGet.textContent = 'Get Groupon Tracking, please wait...';

	try {
		let goFile = document.getElementById('grouponFile').files[0];
		/*var formData = new FormData();
		formData.append('file', goFile);
		formData.append('name', goFile.name.slice(0, -12));*/

		let reader = new FileReader();
		reader.onload = async (e) => {
			let data = e.target.result;
			data = new Uint8Array(data);
			let workbook = XLSX.read(data, {type:'array'});
			let worksheet = workbook.Sheets['Sheet1'];
			//console.log(worksheet['B95']);
			let i = 2;
			let recordList = [];
			while (worksheet['A' + i] != undefined){
				recordList.push(worksheet['A' + i].v);
				i++;
			}
			//console.log(recordList);
			let formData = new FormData();
			formData.append("store", 11);
			formData.append("records", JSON.stringify(recordList));
			let response = await fetch(apiServer+'gettracking', {method: 'post', body: formData});
			let data2 = await response.json();
			if (!response.ok) {
				if (data2.result) {
					page.notification.show('Error: '+JSON.stringify(data2.result), {hide: false});
				}
				else {
					page.notification.show('Error: Could not get the tracking numbers.', {hide: false});
				}
			}

			if (data2.result == 'success') {
				let j = 2;
				//console.log(data2.trackings);
				while (worksheet['A' + j] != undefined){
					for (let rec of data2.trackings) {
						if (rec.salesRecordID == worksheet['A' + j].v) {
							if (rec.trackingID) {
								let trackIDs = JSON.parse(rec.trackingID);
								let trackID = trackIDs[trackIDs.length-1];
								worksheet['C' + j] = {v: trackID};
								if (trackID.length==21 || trackID.length==23) {
									worksheet['B' + j] = {v: "AUPT"};
								}else if (trackID.length==12) {
									worksheet['B' + j] = {v: "FWC"};
								}
							}
						}

					}

					j++;
				}

				await XLSX.writeFile(workbook, goFile.name);

				page.notification.show('The tracking numbers have been exported.', {background: 'bg-lgreen'});
			}
			else {
				page.notification.show(JSON.stringify(data.result), {hide: false});
			}
		}
		reader.readAsArrayBuffer(goFile);




	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.trackingGrouponGet.disabled = false;
	page.els.trackingGrouponGet.textContent = 'Get Groupon Tracking';
}


// Get mydeal tracking
async function getMydealTracking(e) {

	page.els.trackingMydealGet.disabled = true;
	page.els.trackingMydealGet.textContent = 'Get Mydeal Tracking, please wait...';

	try {
		let mdFile = document.getElementById('mydealFile').files[0];
		/*var formData = new FormData();
		formData.append('file', goFile);
		formData.append('name', goFile.name.slice(0, -12));*/

		let reader = new FileReader();
		reader.onload = async (e) => {
			let data = e.target.result;
			//let result = Papa.parse(data);
			let result = await XLSX.read(data,{type:"binary"});
			//console.log(result);
			let i = 2;
			let recordList = [];
			let csvData = result.Sheets.Sheet1;
			console.log(csvData);
			while (csvData['A'+i] != undefined){
				recordList.push(csvData['A'+i].v);
				i++;
			}
			//console.log(recordList);
			let formData = new FormData();
			formData.append("store", 12);
			formData.append("records", JSON.stringify(recordList));
			let response = await fetch(apiServer+'gettracking', {method: 'post', body: formData});
			let data2 = await response.json();
			if (!response.ok) {
				if (data2.result) {
					page.notification.show('Error: '+JSON.stringify(data2.result), {hide: false});
				}
				else {
					page.notification.show('Error: Could not get the tracking numbers.', {hide: false});
				}
			}

			if (data2.result == 'success') {
				let j = 2;
				//console.log(csvData);
				while (csvData['A'+j] != undefined){
					for (let rec of data2.trackings) {
						if (rec.salesRecordID == csvData['A'+j].v) {
							if (rec.trackingID) {
								let trackIDs = JSON.parse(rec.trackingID);
								let trackID = trackIDs[trackIDs.length-1];
								csvData['V'+j] = {t:'s', w:trackID, v:trackID};
								if (trackID.length==21 || trackID.length==23) {
									csvData['W'+j] = {t:'s', w:"AUPT", v:"AUPT"};
								}else if (trackID.length==12) {
									csvData['W'+j] = {t:'s', w:"FWC", v:"FWC"};
								}
							}
						}

					}

					j++;
				}
				console.log(csvData);
				await XLSX.writeFile(result, mdFile.name, {type:"csv"});

				page.notification.show('The tracking numbers have been exported.', {background: 'bg-lgreen'});
			}
			else {
				page.notification.show(JSON.stringify(data2.result), {hide2: false});
			}
		}
		reader.readAsBinaryString(mdFile);




	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.trackingMydealGet.disabled = false;
	page.els.trackingMydealGet.textContent = 'Get Mydeal Tracking';

}

// Request Amazon Orders Report
async function requestAmazonOrdersReport() {
	page.els.requestOrdersReportAmazonBtn.disabled = true;
	page.els.requestOrdersReportAmazonBtn.textContent = 'Requesting report, please wait...';

	try {
		let response = await fetch(apiServer+'orders/amazon/request');
		let data = await response.json();

		if (!response.ok) {
			page.els.requestOrdersReportAmazonBtn.disabled = false;
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not request report.', {hide: false});
			}
		}

		if (data.result == 'success') {
			amazonOrdersReportRequestID = data.id;
			page.els.downloadOrdersAmazonBtn.disabled = false;
			page.notification.show('The report has been requested.', {background: 'bg-lgreen'});
		}
		else {
			page.els.requestOrdersReportAmazonBtn.disabled = false;
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}


	page.els.requestOrdersReportAmazonBtn.textContent = 'Request Report';
}


// Download Amazon Orders
async function downloadAmazonOrders() {
	page.els.downloadOrdersAmazonBtn.disabled = true;
	page.els.downloadOrdersAmazonBtn.textContent = 'Downloading orders, please wait...';

	try {
		let formData = new FormData();
		formData.append("ReportRequestId", amazonOrdersReportRequestID);
		let response = await fetch(apiServer+'orders/amazon/download', {method: 'post', body: formData});
		let data = await response.json();

		if (!response.ok) {
			page.els.downloadOrdersAmazonBtn.disabled = false;
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download orders.', {hide: false});
			}
		}

		if (data.result == 'success') {
			page.els.requestOrdersReportAmazonBtn.disabled = false;
			page.notification.show('The orders have been downloaded.', {background: 'bg-lgreen'});
		}
		else {
			page.els.downloadOrdersAmazonBtn.disabled = false;
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}


	page.els.downloadOrdersAmazonBtn.textContent = 'Download Orders';
}

// Request Amazon Products Report
async function requestAmazonProductsReport() {
	page.els.requestProductsReportAmazonBtn.disabled = true;
	page.els.requestProductsReportAmazonBtn.textContent = 'Requesting report, please wait...';

	try {
		let response = await fetch(apiServer+'items/amazon/request');
		let data = await response.json();

		if (!response.ok) {
			page.els.requestProductsReportAmazonBtn.disabled = false;
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not request report.', {hide: false});
			}
		}

		if (data.result == 'success') {
			amazonProductsReportRequestID = data.id;
			page.els.downloadProductsAmazonBtn.disabled = false;
			page.notification.show('The report has been requested.', {background: 'bg-lgreen'});
		}
		else {
			page.els.requestProductsReportAmazonBtn.disabled = false;
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}


	page.els.requestProductsReportAmazonBtn.textContent = 'Request Report';
}


// Download Amazon Orders
async function downloadAmazonProducts() {
	page.els.downloadProductsAmazonBtn.disabled = true;
	page.els.downloadProductsAmazonBtn.textContent = 'Downloading Products, please wait...';

	try {
		let formData = new FormData();
		formData.append("ReportRequestId", amazonProductsReportRequestID);
		let response = await fetch(apiServer+'items/amazon/download', {method: 'post', body: formData});
		let data = await response.json();

		if (!response.ok) {
			page.els.downloadProductsAmazonBtn.disabled = false;
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download orders.', {hide: false});
			}
		}

		if (data.result == 'success') {
			page.els.requestProductsReportAmazonBtn.disabled = false;
			page.notification.show('The orders have been downloaded.', {background: 'bg-lgreen'});
		}
		else {
			page.els.downloadProductsAmazonBtn.disabled = false;
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}


	page.els.downloadProductsAmazonBtn.textContent = 'Download Products';
}

async function downloadAmazonProductsImages() {
	try {
		let response = await fetch(apiServer+'items/amazon/images');
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download images.', {hide: false});
			}
		}

		if (data.result == 'success') {
			page.notification.show('The images is downloading.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
	}
}

async function downloadTracking() {
	var store, substore;
	try {
		store = page.els.downloadTrackingForm.elements['tds'].value;
		substore = page.els.downloadTrackingSubstoreForm.elements['sss'].value;
	} catch (e) {}

	let datefrom = document.querySelector('#datefrom').value;
	let dateto = document.querySelector('#dateto').value;

	if (!store) {
		page.notification.show('Please select a store to download from.');
		return;
	}

	page.els.downloadTrackingBtn.disabled = true;
	page.els.downloadTrackingBtn.textContent = 'Downloading trackings, please wait...';

	try {
		let response = await fetch(apiServer+'trackings/' + store +  '/' + ((substore != undefined) ?  substore : 'all')  + '?datefrom=' + datefrom + '&dateto=' + dateto);
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not download trackings.', {hide: false});
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
		                 'sku', 'ItemName', 'Quantity', 'Item Unit Weight', 'Postage Cost','Handling', 'Notes', 'PackedData'];
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
		    		if (store != 30) {
		    		    aoa_row.push(order.weight);
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
		    XLSX.writeFile(wb, 'tracking.xlsx');
			page.notification.show('The trackings have been downloaded.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(data.result), {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadTrackingBtn.textContent = 'Download Trackings';
	page.els.downloadTrackingBtn.disabled = false;
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

async function getBigCommerceTracking() {
	var store;
	try {
		store = page.els.trackingStoreForm.elements['uts'].value;
	} catch (e) {}

	var storeName = stores[store].name;

	// Get selected orders
	var aoa_data = [];
    var head = ['Order Number', 'Tracking Number', 'Tracking Carrier'];
    aoa_data.push(head);

	var tableBody = document.querySelector('#content-tracking table tbody');
	var tableBodyTrs = tableBody.querySelectorAll('tr');
	for (let tr of tableBodyTrs) {
		if (tr.dataset.store != store) continue;
		let selectedInput = tr.firstChild.querySelector('input');
		let orderNo = tr.querySelector("[data-col='RecordID']").textContent;
		let trackingNo = tr.querySelector("[data-col='trackingID']").textContent;
		let carrier = '';
		if (trackingNo.startsWith('IZ') || trackingNo.startsWith('NZ') || trackingNo.startsWith('BN') || trackingNo.startsWith('QC') || trackingNo.startsWith('QX')  || trackingNo.startsWith('MP')) {
			carrier = 'fastway-au';
		} else {
			carrier = 'australia-post';
		}
		if (selectedInput && selectedInput.checked) aoa_data.push([orderNo, trackingNo, carrier]);
	}

	if (aoa_data.length == 1) {
		page.notification.show('No orders selected.');
		return;
	}

    var worksheet = XLSX.utils.aoa_to_sheet(aoa_data);
    var csvOutput = XLSX.utils.sheet_to_csv(worksheet);

    var hiddenElement = document.createElement('a');
	hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvOutput);
	hiddenElement.target = '_blank';
	hiddenElement.download = storeName + '-tracking-' + getDateValue(new Date())+'.csv';
	hiddenElement.click();

}

async function getBigCommerceTracking2() {
	var store;
	try {
		store = page.els.trackingStoreForm.elements['uts'].value;
	} catch (e) {}

	var storeName = stores[store].name;

	// Get selected orders
	var aoa_data = [];
    var head = ['Order Number', 'Tracking Number', 'Tracking Carrier'];
    aoa_data.push(head);

	var tableBody = document.querySelector('#content-tracking table tbody');
	var tableBodyTrs = tableBody.querySelectorAll('tr');
	for (let tr of tableBodyTrs) {
		if (tr.dataset.store != store) continue;
		let selectedInput = tr.firstChild.querySelector('input');
		let orderNo = tr.querySelector("[data-col='RecordID']").textContent;
		let trackingNo = tr.querySelector("[data-col='trackingID']").textContent;
		let type = tr.dataset.type;
		let carrier = ORDER_TYPE_NAME[type];

		if (selectedInput && selectedInput.checked) aoa_data.push([orderNo, trackingNo, carrier]);
	}

	if (aoa_data.length == 1) {
		page.notification.show('No orders selected.');
		return;
	}

    var worksheet = XLSX.utils.aoa_to_sheet(aoa_data);
    var csvOutput = XLSX.utils.sheet_to_csv(worksheet);

    var hiddenElement = document.createElement('a');
	hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvOutput);
	hiddenElement.target = '_blank';
	hiddenElement.download = storeName + '-tracking-' + getDateValue(new Date())+'.csv';
	hiddenElement.click();

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
	    		} else {
	    			aoa_row.push(parseInt(inv['3PLIndivQty'])+parseInt(inv['3PLCartonQty'])*parseInt(inv.quantityPerCarton));
	    			aoa_row.push(inv['3PLIndivQty']);
	    		    aoa_row.push(inv['3PLCartonQty']);
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