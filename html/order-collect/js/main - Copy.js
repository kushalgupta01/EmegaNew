//  Discount Chemist
//  Order System

import './config.js';
import {showTab} from './page-actions.js';
import {createRecordList, showPrevRecord, showNextRecord} from './order-list.js';
import {showOrders, deleteRecord, getRecordsOfType, changeScanStatus, getRepeatCustomerRecordList} from './orders.js';
import {getItemDetails, showInventoryStock, loadInventoryDetails, formatSku, checkFullyPicked} from './item-details.js';
import {generateLabelData} from './generate-label-data.js';
import {createPDF, createPDFMultiple, createPDFMultipleStore} from './create-pdf.js';
import {LiveMessages, updatePageRecords} from './live-messages.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener, getTodayDate, checkLogin} from '/common/tools.js';
import './scan-item.js';

// Page data
window.page = {
	satchel: {"A4": 1, "A5": 1},
	fwfp: {"0.3": 1, "1": 1, "5+": 1},
	bays: 50,
	buckets: 150,
	showBuckets: false,
	liveMessages: null,
	notification: new NotificationBar(),
	orders: {},
	type: null,
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

window.convert = {"itemname": "ItemName", "sku": "Sku" , "customsku": "CustomSku"};
window.saleRecords = {};
window.header = ['Store', 'ItemNo', 'ItemName', 'SKU', 'CustomSKU', 'Stock on Hand', 'Image'];
window.columnIndex = {
	'itemname': 1,
	// 'sku': 2,
	// 'customsku': 3,
}

window.labels = {};
window.stocks = {};

window.saleRecords = {}; // Holds the sales records for each store
window.itemDetails = {}; // Holds the variations and other details for each item number

window.inventoryDetails = {}; // Holds details for each item in stock inventory
window.inventoryItem = [];
window.inventoryBarcode = [];
window.inventoryIndex = [];

window.bundleItems = {};
window.tssData = {}; // Holds the Fastway TSS data
window.tssSuburbs = []; // Holds the Fastway TSS suburbs
window.tssBrownSuburbs = []; // Holds the Fastway TSS suburbs
window.APBrownPostcodes = {}; // Holds the Australia Post brown postcodes
window.countryCodes = {};
window.brands = [];
window.fastwayMetroCodes = [];
window.delivereCodes = [];
window.fastwayAreaCodes = {};
window.repeatCustomersToday = {}; 

window.CheckLocationTabs = [PAGE_TAB['HOBBYCO'], PAGE_TAB['COMBINED']];

window.dealConvert = {
	"deal_HUGGIESBABYWIPES": "B",
	"deal_FINISH_LEMON_110PACK": "F",
	"deal_ORALB_ELECTRIC_MEDIUM": "T",
};

window.fpSymbols = {'ツ': true, '?': true, '~': true, '*': true}; // Flat-pack symbols
window.fpSymbolsConv = {'?': 'ツ'};
window.mnbSymbol = '#'; // MNB symbol
window.rePOBox = /(p *\.* *\/* *o *\.* *|box\s*[0-9]+)(box|[0-9]+|b *[0-9]+)/i;
window.reParcelLocker = /(parcel()|locker()|collect())( *(?:\2|\3|\4)[0-9]*)/i;
window.reLockedBag = /lock(ed)? *(bag|[0-9]+)|bag *[0-9]+/i;
window.rePostOffice = /post *office|(post|(p|g)mb) *[0-9]+/i;
window.reLPO = /\(* LPO *\)|\(*LPO *\)|\(* LPO*\)| LPO|LPO | LPO /i;
window.spacer = ['\n', '|'];
window.reAddress = [/^([^\s]*\d+\s*[\+\-\*\/]\s*\d+\s*)/, ' $1'];
window.reBrands = /['"\.,\/#!\$%\^&\*;:{}=\-_`~\(\)\? ]/g;
window.reDigits = /^\d+$/;
window.reSpace = /\s+/g;
window.reSymbols = /^[\!\@\#\$\%\^&\*\-\+_\/]/;
window.reVariation = /\[(.*?)\]$/;
window.reSearch = /[-_\s]/g;
window.reText = /\r?\n/g;


if (page.local) {
	apiServer = apiServerLocal;
	wsServer = wsServerLocal;
}

page.liveMessages = new LiveMessages(wsServer);


document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	page.loadTime = performance.now();

	// Page type
	var pageTypeName = document.getElementById('container'), pageTypeNameQ = getQueryValue('p');
	var showActionButtons = false;
	var hideNavButtons = false;

	if (pageTypeNameQ) {
		pageTypeName = pageTypeNameQ;
	}
	else if (pageTypeName && pageTypeName.dataset && pageTypeName.dataset.pageType) {
		pageTypeName = pageTypeName.dataset.pageType;
	}
	
	switch(pageTypeName){
		case "collect": 
			$('#co').addClass('active');
			break;
		case "partialcollect":
			$('#pco').addClass('active');
			break;
	}

	for (var pageType in PAGE_TYPE) {
		if (PAGE_INFO[PAGE_TYPE[pageType]].name == pageTypeName) {
			page.type = PAGE_TYPE[pageType];
			break;
		}
	}

	if (!page.type) {
		page.notification.show('Error: Invalid page type', {hide: false});
		return;
	}

	if (!localStorage.recordsOrdered) localStorage.recordsOrdered = '{}';
	if (!localStorage.recordsMessed) localStorage.recordsMessed = '{}';

	//console.log(localStorage.recordsMessed);
	switch (page.type) {
		case PAGE_TYPE.COLLECT:
			page.showBuckets = true;
			break;
		case PAGE_TYPE.PARTIALCOLLECT:
			page.showBuckets = true;
			break;
		case PAGE_TYPE.WAREHOUSECOLLECT:
			page.showBuckets = true;
			break;
		case PAGE_TYPE.STOCK:
			break;
		case PAGE_TYPE.REFUNDS:
			break;
		case PAGE_TYPE.LABELS:
			page.showBuckets = true;
			showActionButtons = true;
			hideNavButtons = true;
			break;
		case PAGE_TYPE.MORELABELS:
			page.showBuckets = true;
			showActionButtons = true;
			hideNavButtons = true;
			break;
		case PAGE_TYPE.ORDERED:
		    page.showBuckets = true;
			break;
		case PAGE_TYPE.AWAITINGLIST:
			break;
		case PAGE_TYPE.RTS:
			break;
		case PAGE_TYPE.B2B:
			break;
		case PAGE_TYPE.NEWORDERS:
			page.showBuckets = true;
			break;
		case PAGE_TYPE.DEAL:
			page.showBuckets = true;
			break;
		/*case PAGE_TYPE.MANAGE:
			page.showBuckets = true;
			hideNavButtons = true;
			break;*/
	}

	var pageInfo = PAGE_INFO[page.type];


	// Check user
	var loginSuccess = false;
	if (page.userToken) {
		try {
			let formData = new FormData();
			let response = await fetch(apiServer+'users/login', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
			let data = await response.json();

			if (!response.ok) {
				console.log('Error: '+data.result);
			}

			if (data.result == 'success') {
				// Save user details
				page.user = data.user;
				if (page.localUser && page.user.type != USER_TYPE.ADMIN) page.localUser = false; // Disable for non-admins
				document.getElementById('username').textContent = page.user.firstname + (page.user.lastname ? ' '+page.user.lastname : '');
				loginSuccess = true;
			}
			else {
				console.log(data.result);
			}
		}
		catch (e) {
			console.log('Error: Could not connect to the server.');
			console.log(e);
		}
	}

	if (!loginSuccess) {
		//window.location.href = '/';
		//return;
	}


	// Title, header
	document.title = pageInfo.title;
	var header = document.getElementById('header'), headerTitle = header.querySelector('.title');
	headerTitle.textContent = pageInfo.heading || pageInfo.title;
	if (pageInfo.position) {
		headerTitle.classList.add(pageInfo.position);
	}

	// Header colour
	if (page.local) {
		document.getElementById('header').classList.add('local');
	}

	// Tabs

	if (page.type == PAGE_TYPE.AWAITINGLIST && PAGE_TAB) {
		var tabIDs = Object.values(PAGE_TAB);
		for (let tabID of tabIDs) {
			if (![1,2,3,4,5,6,7,8,44,63].includes(tabID)) continue;
			var tab = PAGE_TAB_INFO[tabID];
			var a = document.createElement('a');
			a.id = tab.id;
			a.href = tab.href;
			a.textContent = tab.name;
			header.appendChild(a);
		}

		for (let tabID of tabIDs) {
			if ([1,2,3,4,5,6,7,8,17,18,44].includes(tabID)) continue;
			var tab = PAGE_TAB_INFO[tabID];
			var option = document.createElement('option');
			option.id = tab.id;
			option.href = tab.href;
			option.textContent = tab.name;
			option.value = tab.id;
		}

	}

	if (page.type == PAGE_TYPE.RTS && PAGE_TAB) {
		var tabIDs = Object.values(PAGE_TAB);
		for (let tabID of tabIDs) {
			if (![9,10].includes(tabID)) continue;
			var tab = PAGE_TAB_INFO[tabID];
			var a = document.createElement('a');
			a.id = tab.id;
			a.href = tab.href;
			a.textContent = tab.name;
			header.appendChild(a);
		}

		for (let tabID of tabIDs) {
			if ([9,10].includes(tabID)) continue;
			var tab = PAGE_TAB_INFO[tabID];
			var option = document.createElement('option');
			option.id = tab.id;
			option.href = tab.href;
			option.textContent = tab.name;
			option.value = tab.id;
		}

	}

	if (page.type == PAGE_TYPE.B2B && PAGE_TAB) {
		var tabIDs = Object.values(PAGE_TAB);
		for (let tabID of tabIDs) {
			if (![52,53].includes(tabID)) continue;
			var tab = PAGE_TAB_INFO[tabID];
			var a = document.createElement('a');
			a.id = tab.id;
			a.href = tab.href;
			a.textContent = tab.name;
			header.appendChild(a);
		}

		for (let tabID of tabIDs) {
			if ([52,53].includes(tabID)) continue;
			var tab = PAGE_TAB_INFO[tabID];
			var option = document.createElement('option');
			option.id = tab.id;
			option.href = tab.href;
			option.textContent = tab.name;
			option.value = tab.id;
		}
	}


	if (page.type == PAGE_TYPE.NEWORDERS && PAGE_TAB) {
		var tabIDs = Object.values(PAGE_TAB);
		for (let tabID of tabIDs) {
			if (![47].includes(tabID)) continue;
			var tab = PAGE_TAB_INFO[tabID];
			var a = document.createElement('a');
			a.id = tab.id;
			a.href = tab.href;
			a.textContent = tab.name;
			header.appendChild(a);
		}

		for (let tabID of tabIDs) {
			if ([47].includes(tabID)) continue;
			var tab = PAGE_TAB_INFO[tabID];
			var option = document.createElement('option');
			option.id = tab.id;
			option.href = tab.href;
			option.textContent = tab.name;
			option.value = tab.id;
		}
	}

	if (page.type == PAGE_TYPE.DEAL && PAGE_TAB) {
		var tabIDs = Object.values(PAGE_TAB);
		for (let tabID of tabIDs) {
			if (![64,65,66].includes(tabID)) continue;
			var tab = PAGE_TAB_INFO[tabID];
			var a = document.createElement('a');
			a.id = tab.id;
			a.href = tab.href;
			a.textContent = tab.name;
			header.appendChild(a);
		}
	}

	if ((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.PARTIALCOLLECT || page.type == PAGE_TYPE.WAREHOUSECOLLECT) && PAGE_TAB) {
		var tabIDs = Object.values(PAGE_TAB);
		if (page.user.supplier == SUPPLIER['NonSupplier']) {
			for (let tabID of tabIDs) {
				if (![1,2,3,4,5,6,7,44,68,71].includes(tabID)) continue;
				var tab = PAGE_TAB_INFO[tabID];
				var a = document.createElement('a');
				a.id = tab.id;
				a.href = tab.href;
				a.textContent = tab.name;
				header.appendChild(a);
			}

			let others = document.createElement('select');
			var option = document.createElement('option');
			option.textContent = 'Others';
			option.disabled = true;
			option.selected = 'selected';
			option.value = 'others';
			others.appendChild(option);

			for (let tabID of tabIDs) {
				if ([1,2,3,4,5,6,7,8,9,10,41,42,44,45,46,47,68,71].includes(tabID)) continue;
				var tab = PAGE_TAB_INFO[tabID];
				var option = document.createElement('option');
				option.id = tab.id;
				option.setAttribute('href', tab.href);
				option.textContent = tab.name;
				option.value = tab.id;
				others.appendChild(option);
			}

			header.appendChild(others);
		} else {
			for (let tabID of tabIDs) {
				if (SUPPLIER[PAGE_TAB_INFO[tabID].supplier] == page.user.supplier) {
					var tab = PAGE_TAB_INFO[tabID];
					var a = document.createElement('a');
					a.id = tab.id;
					a.href = tab.href;
					a.textContent = tab.name;
					header.appendChild(a);
				}
			}
		}

	}

	if (page.type == PAGE_TYPE.ORDERED && PAGE_TAB) {
		var tabIDs = Object.values(PAGE_TAB);
		for (let tabID of tabIDs) {
			if (![1,2,3,4,5,6,7,44,68].includes(tabID)) continue;
			var tab = PAGE_TAB_INFO[tabID];
			var a = document.createElement('a');
			a.id = tab.id;
			a.href = tab.href;
			a.textContent = tab.name;
			header.appendChild(a);
		}

		let others = document.createElement('select');
		var option = document.createElement('option');
		option.textContent = 'Others';
		option.disabled = true;
		option.selected = true;
		option.value = 'others';
		others.appendChild(option);

		for (let tabID of tabIDs) {
			if ([1,2,3,4,5,6,7,8,9,10,41,42,44,45,46,68].includes(tabID)) continue;
			var tab = PAGE_TAB_INFO[tabID];
			var option = document.createElement('option');
			option.id = tab.id;
			option.setAttribute('href', tab.href);
			option.textContent = tab.name;
			option.value = tab.id;
			others.appendChild(option);
		}
		header.appendChild(others);
	}

	if (page.type == PAGE_TYPE.REFUNDS && PAGE_TAB) {
		var tabIDs = Object.values(PAGE_TAB);
		for (let tabID of tabIDs) {
			if (![46,41,42,45].includes(tabID)) continue;
			var tab = PAGE_TAB_INFO[tabID];
			var a = document.createElement('a');
			a.id = tab.id;
			a.href = tab.href;
			a.textContent = tab.name;
			header.appendChild(a);
		}

		for (let tabID of tabIDs) {
			if ([41,42,45].includes(tabID)) continue;
			var tab = PAGE_TAB_INFO[tabID];
			var option = document.createElement('option');
			option.id = tab.id;
			option.href = tab.href;
			option.textContent = tab.name;
			option.value = tab.id;
		}

	}

	// Buckets
	var recordGroup = document.getElementById('record-group');
	if (page.showBuckets && page.buckets && recordGroup) {
		var radio = document.createElement('input'), label = document.createElement('label');
		radio.type = 'radio';
		radio.name = 'rg';
		radio.id = 'rg';
		label.setAttribute('for', 'rg');

		for (let i = 1; i <= page.buckets; i++) {
			let radioItem = radio.cloneNode(true), labelItem = label.cloneNode(true);
			radioItem.id += i;
			radioItem.value = i;
			labelItem.setAttribute('for', labelItem.getAttribute('for') + i);
			labelItem.textContent = i;
			recordGroup.appendChild(radioItem);
			recordGroup.appendChild(labelItem);
		}

		// Select the first bucket
		recordGroup.querySelectorAll('input')[0].checked = true;
	}
	else if (recordGroup) {
		recordGroup.style.display = 'none';
	}

	let storeSelect = document.querySelector("#store-label");
	for (let store in stores) {
		if (['3','5','11','12','21','31','32','33','34','36','37'].includes(store)) continue;
		let option = document.createElement('option');
		option.value = store;
		option.textContent = stores[store].name;
		storeSelect.appendChild(option);
	}

	// add toilet paper
	let tpOption = document.createElement('option');
	tpOption.value = 'tp';
	tpOption.textContent = 'Toilet Paper';
	storeSelect.appendChild(tpOption);

	let typeSelect = document.querySelector("#type-label");
	for (let type in ORDER_TYPE_NAME) {
		if (type == 6 || type == 7) continue;
		let option = document.createElement('option');
		option.value = type;
		option.textContent = ORDER_TYPE_NAME[type];
		typeSelect.appendChild(option);
	}

	let actionBtns = document.querySelectorAll('#record-main-actions button');
	for (let aBtn of actionBtns) {
		aBtn.classList.add('hide');
	}

	/*let addItemStoreSelect = document.querySelector("#search-store");
	for (let store in stores) {
		if (['3','5','11','12','21','31','32','33','34'].includes(store)) continue;
		let option = document.createElement('option');
		option.value = store;
		option.textContent = stores[store].name;
		addItemStoreSelect.appendChild(option);
	}*/


	// Buttons
	if (showActionButtons) {
		var recordMainActions = document.getElementById('record-main-actions');
		if (recordMainActions) recordMainActions.style.display = 'block';
	}
	if (hideNavButtons) {
		let recordNavButtons = document.querySelectorAll('#record-nav-buttons .record-nav');
		for (let recordNavButton of recordNavButtons) {
			recordNavButton.classList.add('hide');
		}
	}


	// Load data
	await loadRepeatCustomersToday();
	await loadRepeatCustomersTracking();
	await loadTSSData(); // Load TSS data
	await loadBrownList(); // Load TSS brown suburbs data
	await loadAPBrownList(); // Load Australia Post brown postcodes
	await loadCountryCodes(); // Load country code data
	await loadBrandList(); // Load the brand list
	await loadFastwayMetroCodes();
	await loadDelivereCodes();
	await loadFastwayAreaCodes();
	//await loadInventoryDetails();

	async function loadTSSData() {
		try {
			let data = await (await fetch('tsslist.json')).json();

			// Load the TSS data - use postcode as the key, suburb as the value
			tssData = {}, tssSuburbs = [];
			var tssSuburbsTemp = {};

			for (var i = 0; i < data.length; i++) {
				var tssItem = data[i];
				if (!tssData.hasOwnProperty(tssItem[1])) {
					tssData[tssItem[1]] = [];
				}
				tssData[tssItem[1]].push(tssItem[0].toLowerCase());
				tssSuburbsTemp[tssItem[0].toLowerCase()] = 1;
			}

			// Load the TSS suburbs
			var tssSuburbsTempKeys = Object.keys(tssSuburbsTemp).sort();
			for (var i = 0; i < tssSuburbsTempKeys.length; i++) {
				tssSuburbs.push(tssSuburbsTempKeys[i]);
			}
		}
		catch (e) {
			page.notification.show('Error: Could not load the TSS list.', {hide: false});
		}
	}

	// Load TSS brown suburbs data
	async function loadBrownList() {
		try {
			let data = await (await fetch('brown-list-fastway.json')).json();

			// Load the TSS brown suburbs with suburb as the key
			tssBrownSuburbs = [];
			for (var i = 0; i < data.length; i++) {
				tssBrownSuburbs.push(data[i].toLowerCase());
			}
		}
		catch (e) {
			page.notification.show('Error: Could not load the TSS Fastway brown suburb list.', {hide: false});
		}
	}

	// Load Australia Post brown postcodes data
	async function loadAPBrownList() {
		try {
			let data = await (await fetch('brown-list-auspost.json')).json();
			APBrownPostcodes = {};

			for (var brownPostcode in data) {
				APBrownPostcodes[parseInt(brownPostcode, 10)] = 1;
			}
		}
		catch (e) {
			page.notification.show('Error: Could not load the Australia Post brown postcodes list.', {hide: false});
		}
	}

	// Load country code data
	async function loadCountryCodes() {
		try {
			countryCodes = await (await fetch('country-codes-2.json')).json();
		}
		catch (e) {
			page.notification.show('Error: Could not load country code data.', {hide: false});
		}
	}

	// Load fastway metro code data
	async function loadFastwayMetroCodes() {
		try {
			fastwayMetroCodes = await (await fetch('fastway-metro-list.json')).json();
		}
		catch (e) {
			page.notification.show('Error: Could not load fastway metro code data.', {hide: false});
		}
	}

	// Load delivere code data
	async function loadDelivereCodes() {
		try {
			delivereCodes = await (await fetch('delivere-list.json')).json();
		}
		catch (e) {
			page.notification.show('Error: Could not load delivere code data.', {hide: false});
		}
	}

	// Load delivere code data
	async function loadFastwayAreaCodes() {
		try {
			fastwayAreaCodes = await (await fetch('fastway-area-code.json')).json();
		}
		catch (e) {
			page.notification.show('Error: Could not load fastway area code data.', {hide: false});
		}
	}

	// Load the brand list and sales records
	async function loadBrandList() {
		try {
			let data = await (await fetch(apiServer+'loadbrands')).json();
			brands = [];

			if (data.brands && data.brands.length) {
				// Change each brand to lowercase and remove punctuation
				for (var i = 0; i < data.brands.length; i++) {
					var brand = data.brands[i].replace(reBrands, '').toLowerCase();
					if (brand.length >= 2) brands.push(brand);
				}
			}
			else {
				page.notification.show('Warning: No brands were retrieved from the database.', {background: 'bg-orange', hide: false});
			}

			// Load the sales records
			var today = new Date();
			if (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.PARTIALCOLLECT || page.type == PAGE_TYPE.WAREHOUSECOLLECT || page.type == PAGE_TYPE.B2B || page.type == PAGE_TYPE.NEWORDERS || page.type == PAGE_TYPE.AWAITINGLIST || page.type == PAGE_TYPE.DEAL) {
				// Records from the last 2 and a half months (75 days)
				var startDate = new Date();
				startDate.setDate(startDate.getDate() - 75);
				loadRecords(getDateValue(startDate), getDateValue(today));
			}
			else if (page.type == PAGE_TYPE.RTS) {
				// Records from the last 2 months
				var startDate = new Date();
				startDate.setDate(startDate.getDate() - 120);
				loadRecords(getDateValue(startDate), getDateValue(today));
			}
			else if (page.type == PAGE_TYPE.REFUNDS) {
				// Records from the last 2 months
				var startDate = new Date();
				startDate.setDate(startDate.getDate() - 62);
				loadRecords(getDateValue(startDate), getDateValue(today));
			}
			else if (page.type == PAGE_TYPE.LABELS || page.type == PAGE_TYPE.MORELABELS) {
				// Records from the last 2 months
				var startDate = new Date();
				startDate.setDate(startDate.getDate() - 180);
				loadRecords(getDateValue(startDate), getDateValue(today));
			}
			else {
				// All records
				loadRecords();
			}
		}
		catch (e) {
			page.notification.show('Error: Could not load the brand list.', {hide: false});
		}
	}

	async function loadRepeatCustomersToday() {
		let formData = new FormData();
		formData.append('repeat', true);
		formData.append('today', true);
		let response = await fetch(apiServer + 'getcustomers', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let data = await response.json();
		if (response.ok) {
			if (data.result = 'success') {
				//repeatCustomersToday = data.data;
				for (let cust of data.data) {
					let store = cust.store;
					if (!repeatCustomersToday.hasOwnProperty(store)) {
						repeatCustomersToday[store] = {};
					}
					let orders = JSON.parse(cust.orders);
					for (let OrderID in orders) {
						repeatCustomersToday[store][OrderID] = cust;
					}
										
				}
			}
		} else if (response.status == '404') {
			page.notification.show('No Repeat Customers Found for Today\'s Orders');
		} else {
			page.notification.show('Error: Could not load the repeatCustomersToday list.', {hide: false});
		}
			
		
	}

	async function loadRepeatCustomersTracking() {
		let records = [];
		for (let store in repeatCustomersToday) {
			let repeatCustomers = repeatCustomersToday[store];
			for (let customer in repeatCustomers) {
				let orders = JSON.parse(repeatCustomers[customer].orders);
				for (let order in orders) {
					if (!records.includes(order)) {
						records.push(order);
					}
				}
			}
		}
		let formData = new FormData();
		formData.append('store', 'all');
		formData.append('records', JSON.stringify(records));
		formData.append('databaseID', true);
		let response = await fetch(apiServer+'gettracking', {method: 'post', body: formData});
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: '+JSON.stringify(data.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not get the tracking numbers.', {hide: false});
			}
		}

		if (data.result == 'success') {
			let trackings = data.trackings;
			let trackingIDs = {};
			for (let tra of trackings) {
				let recordID = tra.orderID;
				let trackingID = tra.trackingID;
				if (!trackingIDs.hasOwnProperty(recordID)) {
					trackingIDs[recordID] = trackingID;
				}
			}
			for (let store in repeatCustomersToday) {
				let repeatCustomers = repeatCustomersToday[store];
				let newrepeatCustomers = JSON.parse(JSON.stringify(repeatCustomers));
				for (let customer in repeatCustomers) {
					let orders = await JSON.parse(repeatCustomers[customer].orders);
					for (let order in orders) {
						orders[order]['tid'] = trackingIDs[order];
					}
					newrepeatCustomers[customer].orders = Object.assign({}, orders);
				}
				repeatCustomersToday[store] = newrepeatCustomers;
			}
		}

	}


	// Header tabs
	addListener('#header a', 'click', function(e) {
		e.preventDefault();
		if (e.ctrlKey) {
			// Open new browser tab
			window.open(this.href, '_blank');
		}
		else {
			// Show tab
			window.history.replaceState(null, '', '#'+this.href.split('#')[1]);
			if (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.PARTIALCOLLECT || page.type == PAGE_TYPE.WAREHOUSECOLLECT) {
				if (document.querySelector('#header select')) {
					document.querySelector('#header select').style.background = '#2781c1';
					document.querySelector('#header select').value  = 'others';
				}
			}
			showTab({id: this.id});
		}
	});

	addListener('#header select', 'change', function(e) {
		e.preventDefault();	
		// Show tab
		let select = e.target;
		let href = select.options[select.selectedIndex].getAttribute('href');
		window.history.replaceState(null, '', '#'+href.split('#')[1]);
		document.querySelector('#header select').style.background = '#33a4f5';
		showTab({id: select.value});
		
	});

	// Search record number
	addListener('#record-search', 'keyup', function() {
		var recordItems = document.querySelectorAll('#record-list ul li');
		var search = (this.querySelector('input').value || '').trim();

		if (search) {
			let searchValues = search.split(reSpace);
			for (let sv_i = 0; sv_i < searchValues.length; sv_i++) {
				// Remove formatting
				searchValues[sv_i] = searchValues[sv_i].replace(reSearch, '').toLowerCase();
			}

			// Go through the record list
			for (let i = 0; i < recordItems.length; i++) {
				if (recordItems[i].dataset.removed) continue; // Skip removed entries

				// Check each record and the item names in the connected orders associated with it
				let recordItemText = recordItems[i].textContent.replace(reSearch, '').toLowerCase();
				let match = false;

				if (includesAll(recordItemText, searchValues)) {
					match = true;
				}
				else {
					// Get the connected records
					let store = recordItems[i].dataset.store;
					let recordNum = recordItems[i].dataset.record;
					if (!saleRecords[store] || !saleRecords[store].connected) continue;
					let connectedRecords = saleRecords[store].connected[recordNum]; // Will be undefined if the order has been marked as out of stock

					if (connectedRecords) {
						connectedRecordsLoop:
						for (let cr_i = 0; cr_i < connectedRecords.length; cr_i++) {
							let connectedRecord = saleRecords[connectedRecords[cr_i][0]].records[connectedRecords[cr_i][1]];
							let connectedRecordToday = saleRecords[connectedRecords[cr_i][0]].today[connectedRecords[cr_i][1]];
							if (!connectedRecord) continue;

							// Check record number
							if ((connectedRecord.SalesRecordID && includesAll(connectedRecord.SalesRecordID.replace(reSearch, ''), searchValues))
								|| includesAll(connectedRecord.DatabaseID.toString().replace(reSearch, ''), searchValues)
								|| includesAll(connectedRecord.RecordNum.replace(reSearch, ''), searchValues)
								|| includesAll(connectedRecord.UserID, searchValues)) {
								match = true;
								break connectedRecordsLoop;
							}
							else {
								// Check each item's name
								for (let item of connectedRecord.Items) {
									if (includesAll(item.ItemTitle.toLowerCase(), searchValues) || includesAll(item.SKU ? item.SKU.toLowerCase() : '', searchValues)) {
										match = true;
										break connectedRecordsLoop;
									}
								}
							}

							if (connectedRecordToday.Notes) {
								if (includesAll(connectedRecordToday.Notes.toLowerCase(), searchValues)) {
									match = true;
									break connectedRecordsLoop;
								}
							}	
						}
					}
				}

				if (match) {
					// Hide records that don't match the search
					recordItems[i].classList.remove('hide');
				}
				else {
					recordItems[i].classList.add('hide');
				}
			}
		}
		else {
			// Show all items
			for (let i = 0; i < recordItems.length; i++) {
				if (recordItems[i].dataset.removed) continue; // Skip removed entries
				recordItems[i].classList.remove('hide');
			}
		}
	});

	// Show details for selected record
	addListener('#record-list ul', 'click', function(e) {
		if (e.target.tagName != 'LI') return;
		var li = e.target;
		var selected = this.querySelector('.selected');
		let visibleLis = document.querySelectorAll('#record-list ul li:not(.disabled):not(.hide)');
		let pos = 0;
		for (let visli of visibleLis) {
			if (visli==li) {
				break;
			}
			pos = pos + 1;
		}

		let elHeight = document.querySelector('#record-list ul').offsetHeight;
		let midPos = Math.floor(elHeight/2/50);
		
		if (pos > midPos) {
			document.querySelector('#record-list ul').scrollTop = (pos-midPos)*50;
		}
		
		if (selected && li.dataset && li.dataset.store && li.dataset.record) {
			selected.classList.remove('selected');
			li.classList.add('selected');
			if (!page.localUser) {
				page.liveMessages.send({action: LIVE_ACTIONS.RECORD_OPENED, page: page.type, store: li.dataset.store, recordNum: li.dataset.record, user: {id: page.user.id, firstname: page.user.firstname}});
				updatePageRecords(li.dataset.store, li.dataset.record, page.user, true);
			}
			showOrders(li.dataset.store, li.dataset.record);
		}
	});

	// Previous, next records, using Up or Down arrow.
	document.addEventListener('keydown', function(e) {
		// console.log(e);
		if(e.key == 'ArrowUp'){
			e.preventDefault();
			showPrevRecord();
		}
		else if(e.key == 'ArrowDown'){
			e.preventDefault();
			showNextRecord();
		}
	});

	// Previous, next, refresh records
	document.getElementById('record-prev').addEventListener('mouseup', function(e) {
		showPrevRecord();
	});

	document.getElementById('record-next').addEventListener('mouseup', function(e) {
		showNextRecord();
	});

	addListener('#record-refresh, .order-refresh', 'click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		window.location.reload();
	});

	addListener('#back-to-menu', 'click', function(e) {
		window.location.href = '/';
	});

	addListener('#boxWeight-table .rows-add', 'click', function(e) {
		//console.log('11');
		addRow();
	});


	document.querySelector('#save-boxDetails').addEventListener('click', function() {
		saveBoxDetails();
	});

	document.getElementById('record-logout').addEventListener('click', function() {
		localStorage.removeItem('username');
		localStorage.removeItem('usertoken');
		window.location.href = '/';
	});

	// Tracking details
	//console.log(document.getElementById('record-entries'));
	document.querySelector('#record-entries').addEventListener('click', function(e) {
		if (e.target.id != 'opentracking') return;
		//console.log(e.target.parentNode);
		var trackingNum = e.target.parentNode.parentNode.querySelector('.record-trackingid span').textContent.trim();
		if (!trackingNum) {
			page.notification.show('Tracking number is blank.');
			return;
		}
		trackingNum = trackingNum.split(',').slice(-1)[0].trim();
		var trackingUrl = null;
		if (trackingNum.startsWith('NZ') || trackingNum.startsWith('IZ') || trackingNum.startsWith('BN') || trackingNum.startsWith('MP') || trackingNum.startsWith('QX') || trackingNum.startsWith('QC')) {
			// Fastway Couriers
			trackingUrl = 'https://www.fastway.com.au/tools/track/?l='+trackingNum;
		}
		else if (trackingNum.startsWith('CH') || trackingNum.startsWith('ET') || trackingNum.startsWith('LH')) {
			// 17track
			trackingUrl = 'https://t.17track.net/#nums='+trackingNum;
		}
		else if (trackingNum.startsWith('EMG')) {
			trackingUrl = 'https://delivere.com.au/track/'+trackingNum.split('-').slice(0,-1).join('-');
		}
		else {
			// Australia Post
			trackingUrl = 'https://auspost.com.au/parcels-mail/track.html#/track?id='+trackingNum;
		}
		window.open(trackingUrl, '_blank');
	});


	// Process current record's order
	addListener('#record-entries, #order-notes-box, #order-cancel-box', 'click', async function(e) {
		if (!e.target.classList.contains('order-action')) return;
		var target = e.target;

		// Order type and status
		var selectedRecord = Object.assign({}, target.parentNode.parentNode.dataset);
		var recordData = saleRecords[selectedRecord.store].records[selectedRecord.recordNum];
		var recordDataToday = saleRecords[selectedRecord.store].today[selectedRecord.recordNum];
		var btns = target.parentNode.querySelectorAll('.order-ready:not(:disabled), .order-ready-parcel:not(:disabled), .order-ready-fastwayflatpack5kg:not(:disabled), .order-ready-flatpack:not(:disabled), .order-outofstock:not(:disabled), .order-ordered:not(:disabled), .order-bypass-scan, .order-prev, .order-next, .order-refresh, .stockReceivedDO');

		selectedRecord.notes = '';
		selectedRecord.SalesRecordID = saleRecords[selectedRecord.store].records[selectedRecord.recordNum].SalesRecordID;
		selectedRecord.status = -1;
		selectedRecord.showNext = false;
		selectedRecord.transacs = [];
		var selectGroup = document.querySelector('#record-group input[name="rg"]:checked');
		selectedRecord.groupID = selectGroup ? selectGroup.value : '';

		if (target.classList.contains('stockReceivedDO')) {
            window.location.href = '../inventory/stockReceived.html';
        }



		if (selectedRecord.combined && !selectedRecord.combinedConfirmed && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.PARTIALCOLLECT || page.type == PAGE_TYPE.WAREHOCOLLECT || page.type == PAGE_TYPE.NEWORDERS)) {
			// Show confirmation box
			showCombinedConfirmBox(selectedRecord);
			return;
		}
		else if (!recordDataToday.ScanDone && (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.PARTIALCOLLECT || page.type == PAGE_TYPE.WAREHOUSECOLLECT || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.NEWORDERS) && !target.classList.contains('order-scan-bypass') && 
			!target.classList.contains('order-notes') && target.id != 'order-notes-save' && !target.classList.contains('order-scan-reset') && !(target.classList.contains('order-change-status') && 
				[ORDER_STATUS.OUTOFSTOCK, ORDER_STATUS.NONE, ORDER_STATUS.ORDERED, ORDER_STATUS.PARTIALCOLLECT, ORDER_STATUS.WAREHOUSECOLLECT, ORDER_STATUS.PARTIALLYPICKED, ORDER_STATUS.FULLYPICKED].includes(ORDER_STATUS_DATASET[target.dataset.status]))) {
			// Flash the scan waiting box
			changeScanStatus(selectedRecord.store, selectedRecord.recordNum, SCAN_ACTIONS.WAITING_FLASH);
			return;
		}
		else if (target.classList.contains('order-scan-bypass')) {
			// Mark record as scanned and enable buttons
			recordDataToday.ScanDone = true;
			changeScanStatus(selectedRecord.store, selectedRecord.recordNum, recordDataToday.ScanDone ? SCAN_ACTIONS.DONE : SCAN_ACTIONS.WAITING);

			//#######################################################################################################################
			/*let recordEntries = document.querySelectorAll('#record-entries .record-entry');
			for (let recordEntry of recordEntries) {
				let recordItems = recordEntry.querySelectorAll('.record-items>tbody>tr');
				var recordItemIndex = -1;
				for (let recordItem of recordItems) {
					recordItemIndex ++;
					var itemNum = recordItem.dataset.itemNum;
					console.log(window.inventoryDetails);
		            if (checkExistsInInventory(itemNum)) {

		            	let itemScan = recordItem.querySelector('.item-scan');
		            	let itemScanTotal = itemScan.querySelector('.total');
		            	let total =  parseInt(itemScanTotal.textContent, 10);
		            	window.inventoryDetails[inventoryItem].stockInHand -= total;
			            window.inventoryDetails[inventoryItem].stockSent += total;
		            	if(window.inventoryDetails[inventoryItem].cartonBarcode && window.inventoryDetails[inventoryItem].cartonBarcode!= 0){
			            	let itemScan2 = recordItem.querySelector('.item-scancq');
							let itemScanTotal2 = itemScan2.querySelector('.totalcq');
							let total2 =  parseInt(itemScanTotal2.textContent, 10);
							window.inventoryDetails[inventoryItem].stockInHand -= total2 * window.inventoryDetails[inventoryItem].quantityPerCarton;
			            	window.inventoryDetails[inventoryItem].stockSent += total2 * window.inventoryDetails[inventoryItem].quantityPerCarton;
		            	}

			            
			            
			            showInventoryStock(itemNum, recordItemIndex, true);
			        }
		        }
		    }*/
		    //#######################################################################################################################
			return;
		}
		else if (target.classList.contains('order-select-all')) {
			
			let selectAll = document.querySelectorAll('li input');
		 	let markBtn = document.querySelector('.' + PAGE_INFO[page.type].name + ' .order-select-all');

		 	for (var i = 0; i < selectAll.length; i++) {
		 		let li = selectAll[i].parentNode;
		 		if (li.classList.contains('disabled') || li.classList.contains('hide')) continue;
		 		if (selectAll[i].checked) {
		 			markBtn.innerHTML = 'Mark All';
		 			selectAll[i].checked = false;
		 			page.notification.show('Orders are unchecked.', {background: 'bg-lgreen'});
		 			// console.log('checked');
		 		} else {
		 			markBtn.innerHTML  = 'UnMark All';
		 			selectAll[i].checked = true;
		 			page.notification.show('Orders are checked.', {background: 'bg-lgreen'});
		 			// console.log('Unchecked');
		 		}
		 	}
		 	return;
		}
		else if (target.classList.contains('order-ordered')) {
			let recordsOrdered = JSON.parse(localStorage.recordsOrdered);
			let recordsOrderedID = selectedRecord.store.toString()+'|'+selectedRecord.recordNum.toString();
			recordsOrdered[recordsOrderedID] = true;
			localStorage.recordsOrdered = JSON.stringify(recordsOrdered);
			document.querySelector('#record-list ul li[data-store="'+selectedRecord.store+'"][data-record="'+selectedRecord.recordNum+'"]').classList.add('done');
			return;
		}
		else if (target.classList.contains('order-notordered')) {
			let recordsOrdered = JSON.parse(localStorage.recordsOrdered);
			let recordsOrderedID = selectedRecord.store.toString()+'|'+selectedRecord.recordNum.toString();
			if (recordsOrdered[recordsOrderedID]) delete recordsOrdered[recordsOrderedID];
			localStorage.recordsOrdered = JSON.stringify(recordsOrdered);
			document.querySelector('#record-list ul li[data-store="'+selectedRecord.store+'"][data-record="'+selectedRecord.recordNum+'"]').classList.remove('done');
			return;
		}
		else if (target.classList.contains('order-notes')) {
			// Show the box to add notes to the order
			showAddNotesBox(selectedRecord);
			return;
		}
		else if (target.classList.contains('order-boxWeight')) {
			showAddBoxWeightBox(selectedRecord);
			return;
		}
		else if (target.classList.contains('order-scan-reset')) {
			await swal({
			            title: "Do you want to reset all scanned qtys?",
			            icon: "warning",
			            buttons: true,
			            dangerMode: true,
	        })
	        .then((willContinue) => {
	            if (willContinue) {
	            	resetScan(selectedRecord);
				}
			});
			return;
		}
		else if (target.classList.contains('order-copy-details')) {
			// Get order details
			let connectedRecords = saleRecords[selectedRecord.store].connected[selectedRecord.recordNum];
			let recordList = [];
			
			// Get item data for each connected order
			for (let co_i = 0; co_i < connectedRecords.length; co_i++) {
				recordList.push([connectedRecords[co_i][0], connectedRecords[co_i][1]]);
			}
			await getItemDetails(recordList);

			// Save the total quantity and weight
			let totalWeight = 0, totalQuantity = 0;
			for (let co_i = 0; co_i < connectedRecords.length; co_i++) {
				let connectedRowData = saleRecords[connectedRecords[co_i][0]].records[connectedRecords[co_i][1]];
				for (let it_i = 0; it_i < connectedRowData.Items.length; it_i++) {
					let recordItem = connectedRowData.Items[it_i];
					let itemEntries = itemDetails[recordItem.SKU];
					let itemEntriesIN = itemDetails[recordItem.ItemNum];

					if (itemEntries) {
						// All entries should have the same quantity and weight
						totalQuantity += itemEntries[0].quantity * recordItem.Quantity;
						totalWeight += itemEntries[0].weight * recordItem.Quantity;
					}
					else if (itemEntriesIN) {
						let itemName = recordItem.ItemTitle.trim();

						// Remove any flat pack symbols
						for (let fpSymbol in fpSymbols) {
							if (itemName[0] == fpSymbol) {
								itemName = itemName.substring(1).trim();
							}
						}

						for (let item of itemEntriesIN) {
							let itemDetailName = item.name.trim();

							// Remove any flat pack symbols
							for (let fpSymbol in fpSymbols) {
								if (itemDetailName[0] == fpSymbol) {
									itemDetailName = itemDetailName.substring(1).trim();
								}
							}

							// Change any flat pack symbols
							/*for (let fpSymbol in fpSymbolsConv) {
								if (itemDetailName[0] == fpSymbol) {
									itemDetailName = fpSymbolsConv[fpSymbol]+itemDetailName.substring(1);
								}
							}*/

							if (itemName == itemDetailName) {
								totalQuantity += item.quantity * recordItem.Quantity;
								totalWeight += item.weight * recordItem.Quantity;
								break;
							}
						}
					}
				}
			}

			// Copy the order details to the clipboard
			let recordDataCopy = Object.assign({
				StoreID: selectedRecord.store,
                Order: recordData,
                OrderData: {"PostageService": recordData.PostService},
                OrderReference: stores[selectedRecord.store].recID + recordData.SalesRecordID,
                Items: recordData.Items,
                StoreDetails: Object.assign({name: stores[selectedRecord.store].name}, storeAddress),
                StoreRecID: stores[selectedRecord.store].recID,
                TotalQuantity: totalQuantity,
                TotalWeight: totalWeight,
                PackagingWeight: PACKAGING_WEIGHT,
                TotalPrice: recordData.TotalPrice,
			});
			copyToClipboard(JSON.stringify(recordDataCopy));
			return;
		}
		else if (target.classList.contains('order-cancel')) {
			// Show cancellation box
			showCancelBox(selectedRecord);
			return;
		}

		let qvbQtys = [];
        let pickQtys = [];
        let bulkQtys = [];
        let locQtys = [];

		if (target.classList.contains('order-ready')) {
			let status = ORDER_STATUS.COLLECTED;
			if (page.type==PAGE_TYPE.WAREHOUSECOLLECT) {
				status = ORDER_STATUS.WAREHOUSECOLLECTED;
			} else if (page.type==PAGE_TYPE.PARTIALCOLLECT) {
				status = ORDER_STATUS.PARTIALCOLLECTED;
			}
			selectedRecord.status = status;
			selectedRecord.showNext = true;
			selectedRecord.markOrder = true;

			let oldValue = ORDER_STATUS_NAME[recordDataToday.OrderStatus];
			// console.log(oldValue);
			let newValue = ORDER_STATUS_NAME[selectedRecord.status];
			// console.log(newValue);

			if (newValue != oldValue) {
				selectedRecord.transacs.push({
					'field': 'status',
					'oldValue': oldValue,
					'newValue': newValue,
				})
			}
			
			let locationSelected = {};

			let recordItems = target.parentNode.parentNode.querySelectorAll('.record-items>tbody>tr');
			/*for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				var customSku = recordItem.dataset.customSku;
				var sku = formatSku(recordItem.dataset.sku);
				var barcode = recordItem.dataset.singleItemBarcode;
				var cartonBarcode = recordItem.dataset.cartonBarcode;
				let qtyOrdered = parseInt(recordItem.dataset.itemQuantity);
				let singleItemMultiple = parseInt(recordItem.dataset.singleItemMultiple) || 0;
				let cartonMultiple = parseInt(recordItem.dataset.cartonMultiple) || 0;
				let quantityPerCarton = parseInt(recordItem.dataset.quantityPerCarton) || 0;

				let reservedQty = cartonBarcode != "null" ? (quantityPerCarton*cartonMultiple+singleItemMultiple)*qtyOrdered : singleItemMultiple*qtyOrdered;

	            if (checkExistsInInventory(barcode,sku,customSku)) {
	                // Update the database
					let formData = new FormData();
			        formData.append('itemBarcode', barcode);
			        formData.append('customSku', customSku);
			        
			        formData.append('addReservedQuantity', reservedQty);
					let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		            let updateStockInventoryData = await response.json();

		            if (response.ok && updateStockInventoryData.result == 'success') {
		            	await loadInventoryDetails({'barcode': barcode, 'sku': sku, 'customSku': customSku})
		                page.notification.show("Item updated successfully.");
		            }
		            else {
		                page.notification.show(updateStockInventoryData.result);
		            }
	        
	            }
			}*/

			/*let qvbQtys = [];
	        let pickQtys = [];
	        let bulkQtys = [];
	        let locQtys = [];*/
	        let nolocation = false;
			for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				let locations = [];
				var lineitemid = recordItem.dataset.lineitemid;
				let customSku = recordItem.dataset.customSku;
				let locSelTrs = recordItem.querySelectorAll('#location-select-table tbody tr');
				if (CheckLocationTabs.includes(page.tab) && inventoryDetails.hasOwnProperty(customSku) && locSelTrs.length == 0) {
					nolocation = true;
					recordItem.classList.add('bg-noloc');
					continue;
				}
				for (let locSelTr of locSelTrs) {
					let loc = {};
					loc.id = locSelTr.id;
					loc.customSku = locSelTr.dataset.customSku;
					loc.invid = locSelTr.dataset.invid;
					loc.bay = locSelTr.querySelector('td[data-col="loc"]').textContent;
					loc.indivQty = locSelTr.querySelector('td[data-col="indivQty"]').textContent;
					loc.cartonQty = locSelTr.querySelector('td[data-col="cartonQty"]').textContent;
					loc.type = locSelTr.querySelector('td[data-col="type"]').textContent;
					locations.push(loc);

					if (loc.id=='qvb') {
                        qvbQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='pick') {
                        pickQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='bulk') {
                        bulkQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id != 'noloc'){
                        locQtys.push([loc.id, loc.indivQty, loc.customSku])
                    }
				}

				locationSelected[lineitemid] = locations;
			}

			if (CheckLocationTabs.includes(page.tab) && nolocation) {
				page.notification.show('Please pick location for highlighted items.');
				return;
			}

			selectedRecord.locationSelected = locationSelected;

			/*let formData = new FormData();
	        formData.append('subtractfromqvbqtys', JSON.stringify(qvbQtys));
	        formData.append('subtractfrompickqtys', JSON.stringify(pickQtys));
	        formData.append('subtractfrombulkqtys', JSON.stringify(bulkQtys));
	        formData.append('subtractfromlocqtys', JSON.stringify(locQtys));

	        let response = await fetch(apiServer+'stockInventory/update', {method: 'post', body: formData});
	        let updateStockInventoryData = await response.json();

	        if (response.ok && updateStockInventoryData.result == 'success') {
	            
	        }
	        else {
	            page.notification.show(updateStockInventoryData.result);
	        }*/
			

			// Change order type if needed
			let desiredType = ORDER_TYPE_DATASET[target.dataset.type];
			if (desiredType) {
				selectedRecord.orderType = desiredType;
			}
			/*else {
				page.notification.show('Error: Invalid order type.', {hide: false});
				return false;
			}*/
		}
		else if (target.classList.contains('markAll-order-change-status')) {
			// console.log('111');
			let selectedRecords = document.querySelectorAll('#record-list ul li input:checked');
			let recordList = [];
			for (let rec of selectedRecords) {
				recordList.push([rec.parentNode.dataset.store, rec.parentNode.dataset.record]);
			}
			
			let newList = []
			for (let rec of recordList) {
				let connectedRecords = saleRecords[rec[0]].connected[rec[1]];
				//console.log(recordList);
				for (let conrec of connectedRecords) {
					if (!newList.includes(conrec[1])) {
						newList.push(conrec[1])
					}
				}
			}

			try {
				let formData = new FormData();
				formData.append('records',JSON.stringify(newList));

				let response = await fetch(apiServer+ 'changeallorderstatus', {method: 'post', body: formData});
				let output = await response.json();

				if (response.ok && output.result == 'success') {
					page.notification.show('Orders are updated.');
				} 
				else {
					page.notification.show(output.result);
				}

			}
			catch (e) {
				page.notification.show('Error: Could not connect to the server.');
			}
			
			return;
		}
		else if (target.classList.contains('order-ready-parcel')) {
			/*if (updateInventoryStock(target) != 'success') {
				return;
			}*/
			let status = ORDER_STATUS.COLLECTED;
			if (page.type==PAGE_TYPE.WAREHOUSECOLLECT) {
				status = ORDER_STATUS.WAREHOUSECOLLECTED;
			} else if (page.type==PAGE_TYPE.PARTIALCOLLECT) {
				status = ORDER_STATUS.PARTIALCOLLECTED;
			}
			selectedRecord.status = status;
			selectedRecord.showNext = true;
			selectedRecord.markOrder = true;

			let oldValue = ORDER_STATUS_NAME[recordDataToday.OrderStatus];
			// console.log(oldValue);
			let newValue = ORDER_STATUS_NAME[selectedRecord.status];
			// console.log(newValue);

			if (newValue != oldValue) {
				selectedRecord.transacs.push({
					'field': 'status',
					'oldValue': oldValue,
					'newValue': newValue,
				})
			}

			let locationSelected = {};

			let recordItems = target.parentNode.parentNode.querySelectorAll('.record-items>tbody>tr');
			/*for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				var customSku = recordItem.dataset.customSku;
				var sku = formatSku(recordItem.dataset.sku);
				var barcode = recordItem.dataset.singleItemBarcode;
				var cartonBarcode = recordItem.dataset.cartonBarcode;
				let qtyOrdered = parseInt(recordItem.dataset.itemQuantity);
				let singleItemMultiple = parseInt(recordItem.dataset.singleItemMultiple) || 0;
				let cartonMultiple = parseInt(recordItem.dataset.cartonMultiple) || 0;
				let quantityPerCarton = parseInt(recordItem.dataset.quantityPerCarton) || 0;

				let reservedQty = cartonBarcode != "null" ? (quantityPerCarton*cartonMultiple+singleItemMultiple)*qtyOrdered : singleItemMultiple*qtyOrdered;

	            if (checkExistsInInventory(barcode,sku,customSku)) {
	                // Update the database
					let formData = new FormData();
			        formData.append('itemBarcode', barcode);
			        formData.append('customSku', customSku);
			        
			        formData.append('addReservedQuantity', reservedQty);
					let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		            let updateStockInventoryData = await response.json();

		            if (response.ok && updateStockInventoryData.result == 'success') {
		            	await loadInventoryDetails({'barcode': barcode, 'sku': sku, 'customSku': customSku})
		                page.notification.show("Item updated successfully.");
		            }
		            else {
		                page.notification.show(updateStockInventoryData.result);
		            }
	        
	            }
			}*/

			/*let qvbQtys = [];
	        let pickQtys = [];
	        let bulkQtys = [];
	        let locQtys = [];*/
	        let nolocation = false;
			for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				let locations = [];
				var lineitemid = recordItem.dataset.lineitemid;
				let customSku = recordItem.dataset.customSku;
				let locSelTrs = recordItem.querySelectorAll('#location-select-table tbody tr');
				if (CheckLocationTabs.includes(page.tab) && inventoryDetails.hasOwnProperty(customSku) && locSelTrs.length == 0) {
					nolocation = true;
					recordItem.classList.add('bg-noloc');
					continue;
				}
				for (let locSelTr of locSelTrs) {
					let loc = {};
					loc.id = locSelTr.id;
					loc.customSku = locSelTr.dataset.customSku;
					loc.invid = locSelTr.dataset.invid;
					loc.bay = locSelTr.querySelector('td[data-col="loc"]').textContent;
					loc.indivQty = locSelTr.querySelector('td[data-col="indivQty"]').textContent;
					loc.cartonQty = locSelTr.querySelector('td[data-col="cartonQty"]').textContent;
					loc.type = locSelTr.querySelector('td[data-col="type"]').textContent;
					locations.push(loc);

					if (loc.id=='qvb') {
                        qvbQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='pick') {
                        pickQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='bulk') {
                        bulkQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id != 'noloc'){
                        locQtys.push([loc.id, loc.indivQty, loc.customSku])
                    }
				}

				locationSelected[lineitemid] = locations;
			}

			if (CheckLocationTabs.includes(page.tab) && nolocation) {
				page.notification.show('Please pick location for highlighted items.');
				return;
			}

			selectedRecord.locationSelected = locationSelected;

			/*let formData = new FormData();
	        let reservedQtys = qvbQtys.concat(pickQtys).concat(bulkQtys);
	        formData.append('subtractfromqvbqtys', JSON.stringify(qvbQtys));
	        formData.append('subtractfrompickqtys', JSON.stringify(pickQtys));
	        formData.append('subtractfrombulkqtys', JSON.stringify(bulkQtys));
	        formData.append('subtractfromlocqtys', JSON.stringify(locQtys));

	        let response = await fetch(apiServer+'stockInventory/update', {method: 'post', body: formData});
	        let updateStockInventoryData = await response.json();

	        if (response.ok && updateStockInventoryData.result == 'success') {
	            
	        }
	        else {
	            page.notification.show(updateStockInventoryData.result);
	        }*/
			
			// Check if Fastway or Australia Post
			let recordRow = saleRecords[selectedRecord.store].records[selectedRecord.recordNum];
			let fastway = false;
			let delivere = false;
			if (tssData.hasOwnProperty(recordRow.BuyerPostCode)) {
				let buyerCity = recordRow.BuyerCity.toLowerCase();
				//console.log(buyerCity);
				for (let i = 0; i < tssSuburbs.length; i++) {
					if (buyerCity.includes(tssSuburbs[i])) {
						fastway = true;
						break;
					}
				}
			}

			// Check if the destination is a PO Box, parcel locker, locked bag or post office
			if (fastway && (rePOBox.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reParcelLocker.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reLockedBag.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| rePostOffice.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reLPO.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2))) {
				fastway = false;
			}

			for (let name of auspostCustomers) {
				if (name.toLowerCase() == recordRow.BuyerFullName.toLowerCase()) {
					fastway = false;
					break;
				}
			}

			/*if (fastway && delivereCodes.includes(recordRow.BuyerPostCode) 
			    && (stores[selectedRecord.store].service != SERVICE_IDS.EBAY || (selectedRecord.store==71 && recordData.SalesChannel != 'eBay' && recordData.SalesChannel != 'Website'))) {
				delivere = true;
				fastway = false;
			}*/

			// selectedRecord.orderType = delivere ? ORDER_TYPE.DELIVERE : ( fastway ? ORDER_TYPE.FASTWAY : ORDER_TYPE.AUSPOST );
			selectedRecord.orderType = fastway ? ORDER_TYPE.FASTWAY : ORDER_TYPE.AUSPOST;
			if (selectedRecord.store==71 && recordRow.SalesChannel=='Website') selectedRecord.orderType = ORDER_TYPE.AUSPOST;
			// selectedRecord.orderType = ORDER_TYPE.AUSPOST;
			//console.log(selectedRecord.orderType);
		}
		else if (target.classList.contains('order-ready-fastwayflatpack')) {
			let status = ORDER_STATUS.COLLECTED;
			if (page.type==PAGE_TYPE.WAREHOUSECOLLECT) {
				status = ORDER_STATUS.WAREHOUSECOLLECTED;
			} else if (page.type==PAGE_TYPE.PARTIALCOLLECT) {
				status = ORDER_STATUS.PARTIALCOLLECTED;
			}
			selectedRecord.status = status;
			selectedRecord.showNext = true;
			selectedRecord.markOrder = true;

			let oldValue = ORDER_STATUS_NAME[recordDataToday.OrderStatus];
			// console.log(oldValue);
			let newValue = ORDER_STATUS_NAME[selectedRecord.status];
			// console.log(newValue);

			if (newValue != oldValue) {
				selectedRecord.transacs.push({
					'field': 'status',
					'oldValue': oldValue,
					'newValue': newValue,
				})
			}

			let locationSelected = {};

			let recordItems = target.parentNode.parentNode.querySelectorAll('.record-items>tbody>tr');
			/*for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				var customSku = recordItem.dataset.customSku;
				var sku = formatSku(recordItem.dataset.sku);
				var barcode = recordItem.dataset.singleItemBarcode;
				var cartonBarcode = recordItem.dataset.cartonBarcode;
				let qtyOrdered = parseInt(recordItem.dataset.itemQuantity);
				let singleItemMultiple = parseInt(recordItem.dataset.singleItemMultiple) || 0;
				let cartonMultiple = parseInt(recordItem.dataset.cartonMultiple) || 0;
				let quantityPerCarton = parseInt(recordItem.dataset.quantityPerCarton) || 0;

				let addReservedQuantity = cartonBarcode != "null" ? (quantityPerCarton*cartonMultiple+singleItemMultiple)*qtyOrdered : singleItemMultiple*qtyOrdered;

	            if (checkExistsInInventory(barcode,sku,customSku)) {
	                // Update the database
					let formData = new FormData();
			        formData.append('itemBarcode', barcode);
			        formData.append('customSku', customSku);
			        formData.append('addReservedQuantity', addReservedQuantity);
					let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		            let updateStockInventoryData = await response.json();

		            if (response.ok && updateStockInventoryData.result == 'success') {
		            	await loadInventoryDetails({'barcode': barcode, 'sku': sku, 'customSku': customSku})
		                page.notification.show("Item updated successfully.");
		            }
		            else {
		                page.notification.show(updateStockInventoryData.result);
		            }
	        
	            }
			}*/

			/*let qvbQtys = [];
	        let pickQtys = [];
	        let bulkQtys = [];
	        let locQtys = [];*/
	        let nolocation = false;

			for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				let locations = [];
				var lineitemid = recordItem.dataset.lineitemid;
				let customSku = recordItem.dataset.customSku;
				let locSelTrs = recordItem.querySelectorAll('#location-select-table tbody tr');
				if (CheckLocationTabs.includes(page.tab) && inventoryDetails.hasOwnProperty(customSku) && locSelTrs.length == 0) {
					nolocation = true;
					recordItem.classList.add('bg-noloc');
					continue;
				}
				for (let locSelTr of locSelTrs) {
					let loc = {};
					loc.id = locSelTr.id;
					loc.customSku = locSelTr.dataset.customSku;
					loc.invid = locSelTr.dataset.invid;
					loc.bay = locSelTr.querySelector('td[data-col="loc"]').textContent;
					loc.indivQty = locSelTr.querySelector('td[data-col="indivQty"]').textContent;
					loc.cartonQty = locSelTr.querySelector('td[data-col="cartonQty"]').textContent;
					loc.type = locSelTr.querySelector('td[data-col="type"]').textContent;
					locations.push(loc);

					if (loc.id=='qvb') {
                        qvbQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='pick') {
                        pickQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='bulk') {
                        bulkQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id != 'noloc'){
                        locQtys.push([loc.id, loc.indivQty, loc.customSku])
                    }
				}

				locationSelected[lineitemid] = locations;
			}

			if (CheckLocationTabs.includes(page.tab) && nolocation) {
				page.notification.show('Please pick location for highlighted items.');
				return;
			}

			selectedRecord.locationSelected = locationSelected;

			/*let formData = new FormData();
	        let reservedQtys = qvbQtys.concat(pickQtys).concat(bulkQtys);
	        formData.append('subtractfromqvbqtys', JSON.stringify(qvbQtys));
	        formData.append('subtractfrompickqtys', JSON.stringify(pickQtys));
	        formData.append('subtractfrombulkqtys', JSON.stringify(bulkQtys));
	        formData.append('subtractfromlocqtys', JSON.stringify(locQtys));

	        let response = await fetch(apiServer+'stockInventory/update', {method: 'post', body: formData});
	        let updateStockInventoryData = await response.json();

	        if (response.ok && updateStockInventoryData.result == 'success') {
	            
	        }
	        else {
	            page.notification.show(updateStockInventoryData.result);
	        }*/

			// Check if Fastway or Australia Post
			let recordRow = saleRecords[selectedRecord.store].records[selectedRecord.recordNum];
			let fastway = false;
			if (tssData.hasOwnProperty(recordRow.BuyerPostCode)) {
				let buyerCity = recordRow.BuyerCity.toLowerCase();
				//console.log(buyerCity);
				for (let i = 0; i < tssSuburbs.length; i++) {
					if (buyerCity.includes(tssSuburbs[i])) {
						fastway = true;
						break;
					}
				}
			}

			// Check if the destination is a PO Box, parcel locker, locked bag or post office
			if (fastway && (rePOBox.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reParcelLocker.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reLockedBag.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| rePostOffice.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reLPO.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2))) {
				fastway = false;
			}

			for (let name of auspostCustomers) {
				if (name.toLowerCase() == recordRow.BuyerFullName.toLowerCase()) {
					fastway = false;
					break;
				}
			}
			selectedRecord.orderType = fastway ? ORDER_TYPE.FASTWAYFLATPACK : ORDER_TYPE.AUSPOST;

			//console.log(selectedRecord.orderType);
		}

		else if (target.classList.contains('order-ready-fastwayflatpack5kg')) {
			let status = ORDER_STATUS.COLLECTED;
			if (page.type==PAGE_TYPE.WAREHOUSECOLLECT) {
				status = ORDER_STATUS.WAREHOUSECOLLECTED;
			} else if (page.type==PAGE_TYPE.PARTIALCOLLECT) {
				status = ORDER_STATUS.PARTIALCOLLECTED;
			}
			selectedRecord.status = status;
			selectedRecord.orderType = ORDER_TYPE.FASTWAYFLATPACK5KG;
			selectedRecord.showNext = true;
			selectedRecord.markOrder = true;

			let oldValue = ORDER_STATUS_NAME[recordDataToday.OrderStatus];
			// console.log(oldValue);
			let newValue = ORDER_STATUS_NAME[selectedRecord.status];
			// console.log(newValue);

			if (newValue != oldValue) {
				selectedRecord.transacs.push({
					'field': 'status',
					'oldValue': oldValue,
					'newValue': newValue,
				})
			}

			let locationSelected = {};

			let recordItems = target.parentNode.parentNode.querySelectorAll('.record-items>tbody>tr');
			/*for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				var customSku = recordItem.dataset.customSku;
				var sku = formatSku(recordItem.dataset.sku);
				var barcode = recordItem.dataset.singleItemBarcode;
				var cartonBarcode = recordItem.dataset.cartonBarcode;
				let qtyOrdered = parseInt(recordItem.dataset.itemQuantity);
				let singleItemMultiple = parseInt(recordItem.dataset.singleItemMultiple) || 0;
				let cartonMultiple = parseInt(recordItem.dataset.cartonMultiple) || 0;
				let quantityPerCarton = parseInt(recordItem.dataset.quantityPerCarton) || 0;

				let addReservedQuantity = cartonBarcode != "null" ? (quantityPerCarton*cartonMultiple+singleItemMultiple)*qtyOrdered : singleItemMultiple*qtyOrdered;

	            if (checkExistsInInventory(barcode,sku,customSku)) {
	                // Update the database
					let formData = new FormData();
			        formData.append('itemBarcode', barcode);
			        formData.append('customSku', customSku);
			        formData.append('addReservedQuantity', addReservedQuantity);
					let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		            let updateStockInventoryData = await response.json();

		            if (response.ok && updateStockInventoryData.result == 'success') {
		            	await loadInventoryDetails({'barcode': barcode, 'sku': sku, 'customSku': customSku})
		                page.notification.show("Item updated successfully.");
		            }
		            else {
		                page.notification.show(updateStockInventoryData.result);
		            }
	        
	            }
			}*/

			/*let qvbQtys = [];
	        let pickQtys = [];
	        let bulkQtys = [];
	        let locQtys = [];*/
	        let nolocation = false;

			for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				let locations = [];
				var lineitemid = recordItem.dataset.lineitemid;
				let customSku = recordItem.dataset.customSku;
				let locSelTrs = recordItem.querySelectorAll('#location-select-table tbody tr');
				if (CheckLocationTabs.includes(page.tab) && inventoryDetails.hasOwnProperty(customSku) && locSelTrs.length == 0) {
					nolocation = true;
					recordItem.classList.add('bg-noloc');
					continue;
				}
				for (let locSelTr of locSelTrs) {
					let loc = {};
					loc.id = locSelTr.id;
					loc.customSku = locSelTr.dataset.customSku;
					loc.invid = locSelTr.dataset.invid;
					loc.bay = locSelTr.querySelector('td[data-col="loc"]').textContent;
					loc.indivQty = locSelTr.querySelector('td[data-col="indivQty"]').textContent;
					loc.cartonQty = locSelTr.querySelector('td[data-col="cartonQty"]').textContent;
					loc.type = locSelTr.querySelector('td[data-col="type"]').textContent;
					locations.push(loc);

					if (loc.id=='qvb') {
                        qvbQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='pick') {
                        pickQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='bulk') {
                        bulkQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id != 'noloc'){
                        locQtys.push([loc.id, loc.indivQty, loc.customSku])
                    }
				}

				locationSelected[lineitemid] = locations;
			}

			if (CheckLocationTabs.includes(page.tab) && nolocation) {
				page.notification.show('Please pick location for highlighted items.');
				return;
			}

			selectedRecord.locationSelected = locationSelected;

			/*let formData = new FormData();
	        let reservedQtys = qvbQtys.concat(pickQtys).concat(bulkQtys);
	        formData.append('subtractfromqvbqtys', JSON.stringify(qvbQtys));
	        formData.append('subtractfrompickqtys', JSON.stringify(pickQtys));
	        formData.append('subtractfrombulkqtys', JSON.stringify(bulkQtys));
	        formData.append('subtractfromlocqtys', JSON.stringify(locQtys));

	        let response = await fetch(apiServer+'stockInventory/update', {method: 'post', body: formData});
	        let updateStockInventoryData = await response.json();

	        if (response.ok && updateStockInventoryData.result == 'success') {
	            
	        }
	        else {
	            page.notification.show(updateStockInventoryData.result);
	        }*/

			// Check if Fastway or Australia Post
			let recordRow = saleRecords[selectedRecord.store].records[selectedRecord.recordNum];
			let fastway = false;
			if (tssData.hasOwnProperty(recordRow.BuyerPostCode)) {
				let buyerCity = recordRow.BuyerCity.toLowerCase();
				//console.log(buyerCity);
				for (let i = 0; i < tssSuburbs.length; i++) {
					if (buyerCity.includes(tssSuburbs[i])) {
						fastway = true;
						break;
					}
				}
			}

			// Check if the destination is a PO Box, parcel locker, locked bag or post office
			if (fastway && (rePOBox.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reParcelLocker.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reLockedBag.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| rePostOffice.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reLPO.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2))) {
				fastway = false;
			}

			for (let name of auspostCustomers) {
				if (name.toLowerCase() == recordRow.BuyerFullName.toLowerCase()) {
					fastway = false;
					break;
				}
			}

			selectedRecord.orderType = fastway ? ORDER_TYPE.FASTWAYFLATPACK5KG : ORDER_TYPE.AUSPOST;

			//console.log(selectedRecord.orderType);
		}

		else if (target.classList.contains('order-ready-pack')) {
			
			let missingScannings = [];
			let recordItems = target.parentNode.parentNode.querySelectorAll('.record-items>tbody>tr');
			let scannedQtys = {};
			for (let recordItem of recordItems) {
				var customSku = recordItem.dataset.customSku;
				var sku = formatSku(recordItem.dataset.sku);
				var barcode = recordItem.dataset.singleItemBarcode;
				var cartonBarcode = recordItem.dataset.cartonBarcode;
				let qtyOrdered = parseInt(recordItem.dataset.itemQuantity);
				let singleItemMultiple = parseInt(recordItem.dataset.singleItemMultiple) || 0;
				let cartonMultiple = parseInt(recordItem.dataset.cartonMultiple) || 0;
				let quantityPerCarton = parseInt(recordItem.dataset.quantityPerCarton) || 0;
				var lineitemid = recordItem.dataset.lineitemid;
				var scannedQty = recordItem.querySelector('.indiv-item-scan .indivCurrent').textContent;
				var totalQty = recordItem.querySelector('.indiv-item-scan .indivTotal').textContent;
				if (scannedQty < totalQty){
					let missingScanning = {
						sku: sku,
						//barcode: barcode,
						scannedQty: parseInt(scannedQty),
						totalQty: parseInt(totalQty),
						missingQty: totalQty - scannedQty
					}
					missingScannings.push(missingScanning);
				}
				scannedQtys[lineitemid] = [scannedQty,totalQty];

				//let addReservedQuantity = cartonBarcode != "null" ? (quantityPerCarton*cartonMultiple+singleItemMultiple)*qtyOrdered : singleItemMultiple*qtyOrdered;

	            /*if (checkExistsInInventory(barcode,sku,customSku)) {
	                // Update the database
					let formData = new FormData();
			        formData.append('itemBarcode', barcode);
			        formData.append('customSku', customSku);
			        formData.append('addReservedQuantity', scannedQty);
					let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		            let updateStockInventoryData = await response.json();

		            if (response.ok && updateStockInventoryData.result == 'success') {
		            	await loadInventoryDetails({'barcode': barcode, 'sku': sku, 'customSku': customSku})
		                page.notification.show("Item updated successfully.");
		            }
		            else {
		                page.notification.show(updateStockInventoryData.result);
		            }
	        
	            }*/
			}
			function readyToPack(){
				selectedRecord.showNext = true;
				selectedRecord.markOrder = true;
				
				let oldValue = ORDER_STATUS_NAME[recordDataToday.OrderStatus];
				
				selectedRecord.transacs.push({
					'field': 'status',
					'oldValue': oldValue,
				})
				selectedRecord.scannedQtys = scannedQtys;

				let locationSelected = {};
		        let nolocation = false;

				for (let recordItem of recordItems) {
					if (recordItem.dataset.partialrefund=='1') continue;
					let locations = [];
					var lineitemid = recordItem.dataset.lineitemid;
					let customSku = recordItem.dataset.customSku;
					let locSelTrs = recordItem.querySelectorAll('#location-select-table tbody tr');
					if (CheckLocationTabs.includes(page.tab) && inventoryDetails.hasOwnProperty(customSku) && locSelTrs.length == 0) {
						nolocation = true;
						recordItem.classList.add('bg-noloc');
						continue;
					}
					for (let locSelTr of locSelTrs) {
						let loc = {};
						loc.id = locSelTr.id;
						loc.customSku = locSelTr.dataset.customSku;
						loc.invid = locSelTr.dataset.invid;
						loc.bay = locSelTr.querySelector('td[data-col="loc"]').textContent;
						loc.indivQty = locSelTr.querySelector('td[data-col="indivQty"]').textContent;
						loc.cartonQty = locSelTr.querySelector('td[data-col="cartonQty"]').textContent;
						loc.type = locSelTr.querySelector('td[data-col="type"]').textContent;
						locations.push(loc);

						if (loc.id=='qvb') {
	                        qvbQtys.push([loc.invid, loc.indivQty]);
	                    } else if (loc.id=='pick') {
	                        pickQtys.push([loc.invid, loc.indivQty]);
	                    } else if (loc.id=='bulk') {
	                        bulkQtys.push([loc.invid, loc.indivQty]);
	                    } else if (loc.id != 'noloc'){
	                        locQtys.push([loc.id, loc.indivQty, loc.customSku])
	                    }
					}

					locationSelected[lineitemid] = locations;
				}

				if (CheckLocationTabs.includes(page.tab) && nolocation) {
					page.notification.show('Please pick location for highlighted items.');
					return;
				}

				selectedRecord.locationSelected = locationSelected;
			}

			if (missingScannings.length > 0){
				function generateTableHead(table, data) {
					console.log(data);
					let thead = table.createTHead();
					let row = thead.insertRow();
					for (let key of data) {
						let th = document.createElement("th");
						let text = document.createTextNode(key);
						th.appendChild(text);
						row.appendChild(th);
					}
				}

				function generateTable(table, data) {
					let tbody = table.createTBody();
				  	for (let element of data) {
				    	let row = tbody.insertRow();
				    	for (let key in element) {
					      	let cell = row.insertCell();
					      	let text = document.createTextNode(element[key]);
					      	cell.appendChild(text);
				    	}
				  	}
				  	table.appendChild(tbody);
				}

				let table = document.createElement('table');
				table.classList.add('table');
				let data = ['SKU','Scanned Qty','Total Qty','Missing Qty'];

				generateTableHead(table, data);
				generateTable(table, missingScannings);

				await swal({
			            title: "One or more items have not been scanned, would you like to continue?",
			            content: table,
			            icon: "warning",
			            buttons: true,
			            dangerMode: true,
		        })
		        .then((willContinue) => {
		            if (willContinue) {
		            	readyToPack();
					}
					else{
						return;
					}
				});
			}
			else{
				readyToPack();
			}
		}

		else if (target.classList.contains('order-ready-fastwayflatpack1kg')) {
			let status = ORDER_STATUS.COLLECTED;
			if (page.type==PAGE_TYPE.WAREHOUSECOLLECT) {
				status = ORDER_STATUS.WAREHOUSECOLLECTED;
			} else if (page.type==PAGE_TYPE.PARTIALCOLLECT) {
				status = ORDER_STATUS.PARTIALCOLLECTED;
			}
			selectedRecord.status = status;
			selectedRecord.showNext = true;
			selectedRecord.markOrder = true;

			let oldValue = ORDER_STATUS_NAME[recordDataToday.OrderStatus];
			// console.log(oldValue);
			let newValue = ORDER_STATUS_NAME[selectedRecord.status];
			// console.log(newValue);

			if (newValue != oldValue) {
				selectedRecord.transacs.push({
					'field': 'status',
					'oldValue': oldValue,
					'newValue': newValue,
				})
			}

			let locationSelected = {};

			let recordItems = target.parentNode.parentNode.querySelectorAll('.record-items>tbody>tr');
			/*for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				var customSku = recordItem.dataset.customSku;
				var sku = formatSku(recordItem.dataset.sku);
				var barcode = recordItem.dataset.singleItemBarcode;
				var cartonBarcode = recordItem.dataset.cartonBarcode;
				let qtyOrdered = parseInt(recordItem.dataset.itemQuantity);
				let singleItemMultiple = parseInt(recordItem.dataset.singleItemMultiple) || 0;
				let cartonMultiple = parseInt(recordItem.dataset.cartonMultiple) || 0;
				let quantityPerCarton = parseInt(recordItem.dataset.quantityPerCarton) || 0;

				let addReservedQuantity = cartonBarcode != "null" ? (quantityPerCarton*cartonMultiple+singleItemMultiple)*qtyOrdered : singleItemMultiple*qtyOrdered;

	            if (checkExistsInInventory(barcode,sku,customSku)) {
	                // Update the database
					let formData = new FormData();
			        formData.append('itemBarcode', barcode);
			        formData.append('customSku', customSku);
			        formData.append('addReservedQuantity', addReservedQuantity);
					let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		            let updateStockInventoryData = await response.json();

		            if (response.ok && updateStockInventoryData.result == 'success') {
		            	await loadInventoryDetails({'barcode': barcode, 'sku': sku, 'customSku': customSku})
		                page.notification.show("Item updated successfully.");
		            }
		            else {
		                page.notification.show(updateStockInventoryData.result);
		            }
	        
	            }
			}*/

			/*let qvbQtys = [];
	        let pickQtys = [];
	        let bulkQtys = [];
	        let locQtys = [];*/
	        let nolocation = false;

			for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				let locations = [];
				var lineitemid = recordItem.dataset.lineitemid;
				let customSku = recordItem.dataset.customSku;
				let locSelTrs = recordItem.querySelectorAll('#location-select-table tbody tr');
				if (CheckLocationTabs.includes(page.tab) && inventoryDetails.hasOwnProperty(customSku) && locSelTrs.length == 0) {
					nolocation = true;
					recordItem.classList.add('bg-noloc');
					continue;
				}
				for (let locSelTr of locSelTrs) {
					let loc = {};
					loc.id = locSelTr.id;
					loc.customSku = locSelTr.dataset.customSku;
					loc.invid = locSelTr.dataset.invid;
					loc.bay = locSelTr.querySelector('td[data-col="loc"]').textContent;
					loc.indivQty = locSelTr.querySelector('td[data-col="indivQty"]').textContent;
					loc.cartonQty = locSelTr.querySelector('td[data-col="cartonQty"]').textContent;
					loc.type = locSelTr.querySelector('td[data-col="type"]').textContent;
					locations.push(loc);

					if (loc.id=='qvb') {
                        qvbQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='pick') {
                        pickQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='bulk') {
                        bulkQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id != 'noloc'){
                        locQtys.push([loc.id, loc.indivQty, loc.customSku])
                    }
				}

				locationSelected[lineitemid] = locations;
			}

			if (CheckLocationTabs.includes(page.tab) && nolocation) {
				page.notification.show('Please pick location for highlighted items.');
				return;
			}

			selectedRecord.locationSelected = locationSelected;

			/*let formData = new FormData();
	        let reservedQtys = qvbQtys.concat(pickQtys).concat(bulkQtys);
	        formData.append('subtractfromqvbqtys', JSON.stringify(qvbQtys));
	        formData.append('subtractfrompickqtys', JSON.stringify(pickQtys));
	        formData.append('subtractfrombulkqtys', JSON.stringify(bulkQtys));
	        formData.append('subtractfromlocqtys', JSON.stringify(locQtys));

	        let response = await fetch(apiServer+'stockInventory/update', {method: 'post', body: formData});
	        let updateStockInventoryData = await response.json();

	        if (response.ok && updateStockInventoryData.result == 'success') {
	            
	        }
	        else {
	            page.notification.show(updateStockInventoryData.result);
	        }*/

			// Check if Fastway or Australia Post
			let recordRow = saleRecords[selectedRecord.store].records[selectedRecord.recordNum];
			let fastway = false;
			if (tssData.hasOwnProperty(recordRow.BuyerPostCode)) {
				let buyerCity = recordRow.BuyerCity.toLowerCase();
				//console.log(buyerCity);
				for (let i = 0; i < tssSuburbs.length; i++) {
					if (buyerCity.includes(tssSuburbs[i])) {
						fastway = true;
						break;
					}
				}
			}

			// Check if the destination is a PO Box, parcel locker, locked bag or post office
			if (fastway && (rePOBox.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reParcelLocker.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reLockedBag.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| rePostOffice.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reLPO.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2))) {
				fastway = false;
			}

			for (let name of auspostCustomers) {
				if (name.toLowerCase() == recordRow.BuyerFullName.toLowerCase()) {
					fastway = false;
					break;
				}
			}
			selectedRecord.orderType = fastway ? ORDER_TYPE.FASTWAYFLATPACK1KG : ORDER_TYPE.AUSPOST;

			//console.log(selectedRecord.orderType);
		}
		else if (target.classList.contains('order-ready-flatpack')) {
			let status = ORDER_STATUS.COLLECTED;
			if (page.type==PAGE_TYPE.WAREHOUSECOLLECT) {
				status = ORDER_STATUS.WAREHOUSECOLLECTED;
			} else if (page.type==PAGE_TYPE.PARTIALCOLLECT) {
				status = ORDER_STATUS.PARTIALCOLLECTED;
			}
			selectedRecord.status = status;
			selectedRecord.orderType = ORDER_TYPE.FLATPACK;
			selectedRecord.showNext = true;
			selectedRecord.markOrder = true;

			let oldValue = ORDER_STATUS_NAME[recordDataToday.OrderStatus];
			// console.log(oldValue);
			let newValue = ORDER_STATUS_NAME[selectedRecord.status];
			// console.log(newValue);

			if (newValue != oldValue) {
				selectedRecord.transacs.push({
					'field': 'status',
					'oldValue': oldValue,
					'newValue': newValue,
				})
			}

			let locationSelected = {};

			let recordItems = target.parentNode.parentNode.querySelectorAll('.record-items>tbody>tr');
			/*for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				var customSku = recordItem.dataset.customSku;
				var sku = formatSku(recordItem.dataset.sku);
				var barcode = recordItem.dataset.singleItemBarcode;
				var cartonBarcode = recordItem.dataset.cartonBarcode;
				let qtyOrdered = parseInt(recordItem.dataset.itemQuantity);
				let singleItemMultiple = parseInt(recordItem.dataset.singleItemMultiple) || 0;
				let cartonMultiple = parseInt(recordItem.dataset.cartonMultiple) || 0;
				let quantityPerCarton = parseInt(recordItem.dataset.quantityPerCarton) || 0;

				let addReservedQuantity = cartonBarcode != "null" ? (quantityPerCarton*cartonMultiple+singleItemMultiple)*qtyOrdered : (barcode ? singleItemMultiple*qtyOrdered : 0);

	            if (checkExistsInInventory(barcode,sku,customSku)) {
	                // Update the database
					let formData = new FormData();
			        formData.append('itemBarcode', barcode);
			        formData.append('customSku', customSku);
			        formData.append('addReservedQuantity', addReservedQuantity);
					let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		            let updateStockInventoryData = await response.json();
		            if (response.ok && updateStockInventoryData.result == 'success') {
		            	await loadInventoryDetails({'barcode': barcode, 'sku': sku, 'customSku': customSku})
		                page.notification.show("Item updated successfully.");
		            }
		            else {
		                page.notification.show(updateStockInventoryData.result);
		            }
	        
	            }
			}*/

			/*let qvbQtys = [];
	        let pickQtys = [];
	        let bulkQtys = [];
	        let locQtys = [];*/
	        let nolocation = false;

			for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				let locations = [];
				var lineitemid = recordItem.dataset.lineitemid;
				let customSku = recordItem.dataset.customSku;
				let locSelTrs = recordItem.querySelectorAll('#location-select-table tbody tr');
				if (CheckLocationTabs.includes(page.tab) && inventoryDetails.hasOwnProperty(customSku) && locSelTrs.length == 0) {
					nolocation = true;
					recordItem.classList.add('bg-noloc');
					continue;
				}
				for (let locSelTr of locSelTrs) {
					let loc = {};
					loc.id = locSelTr.id;
					loc.customSku = locSelTr.dataset.customSku;
					loc.invid = locSelTr.dataset.invid;
					loc.bay = locSelTr.querySelector('td[data-col="loc"]').textContent;
					loc.indivQty = locSelTr.querySelector('td[data-col="indivQty"]').textContent;
					loc.cartonQty = locSelTr.querySelector('td[data-col="cartonQty"]').textContent;
					loc.type = locSelTr.querySelector('td[data-col="type"]').textContent;
					locations.push(loc);

					if (loc.id=='qvb') {
                        qvbQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='pick') {
                        pickQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='bulk') {
                        bulkQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id != 'noloc'){
                        locQtys.push([loc.id, loc.indivQty, loc.customSku])
                    }
				}

				locationSelected[lineitemid] = locations;
			}

			if (CheckLocationTabs.includes(page.tab) && nolocation) {
				page.notification.show('Please pick location for highlighted items.');
				return;
			}

			selectedRecord.locationSelected = locationSelected;

			/*let formData = new FormData();
	        let reservedQtys = qvbQtys.concat(pickQtys).concat(bulkQtys);
	        formData.append('subtractfromqvbqtys', JSON.stringify(qvbQtys));
	        formData.append('subtractfrompickqtys', JSON.stringify(pickQtys));
	        formData.append('subtractfrombulkqtys', JSON.stringify(bulkQtys));
	        formData.append('subtractfromlocqtys', JSON.stringify(locQtys));

	        let response = await fetch(apiServer+'stockInventory/update', {method: 'post', body: formData});
	        let updateStockInventoryData = await response.json();

	        if (response.ok && updateStockInventoryData.result == 'success') {
	            
	        }
	        else {
	            page.notification.show(updateStockInventoryData.result);
	        }*/
		}
		/*else if (target.classList.contains('order-ready-fastway10kg')) {
			let status = ORDER_STATUS.COLLECTED;
			if (page.type==PAGE_TYPE.WAREHOUSECOLLECT) {
				status = ORDER_STATUS.WAREHOUSECOLLECTED;
			} else if (page.type==PAGE_TYPE.PARTIALCOLLECT) {
				status = ORDER_STATUS.PARTIALCOLLECTED;
			}
			selectedRecord.status = status;
			selectedRecord.showNext = true;
			selectedRecord.markOrder = true;

			let oldValue = ORDER_STATUS_NAME[recordDataToday.OrderStatus];
			// console.log(oldValue);
			let newValue = ORDER_STATUS_NAME[selectedRecord.status];
			// console.log(newValue);

			if (newValue != oldValue) {
				selectedRecord.transacs.push({
					'field': 'status',
					'oldValue': oldValue,
					'newValue': newValue,
				})
			}

			let locationSelected = {};

			let recordItems = target.parentNode.parentNode.querySelectorAll('.record-items>tbody>tr');
			for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				var customSku = recordItem.dataset.customSku;
				var sku = formatSku(recordItem.dataset.sku);
				var barcode = recordItem.dataset.singleItemBarcode;
				var cartonBarcode = recordItem.dataset.cartonBarcode;
				let qtyOrdered = parseInt(recordItem.dataset.itemQuantity);
				let singleItemMultiple = parseInt(recordItem.dataset.singleItemMultiple);
				let cartonMultiple = parseInt(recordItem.dataset.cartonMultiple);
				let quantityPerCarton = parseInt(recordItem.dataset.quantityPerCarton);

				let addReservedQuantity = cartonBarcode != "null" ? (quantityPerCarton*cartonMultiple+singleItemMultiple)*qtyOrdered : singleItemMultiple*qtyOrdered;

	            if (checkExistsInInventory(barcode,sku,customSku)) {
	                // Update the database
					let formData = new FormData();
			        formData.append('itemBarcode', barcode);
			        formData.append('customSku', customSku);
			        formData.append('addReservedQuantity', addReservedQuantity);
					let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		            let updateStockInventoryData = await response.json();

		            if (response.ok && updateStockInventoryData.result == 'success') {
		            	await loadInventoryDetails({'barcode': barcode, 'sku': sku, 'customSku': customSku})
		                page.notification.show("Item updated successfully.");
		            }
		            else {
		                page.notification.show(updateStockInventoryData.result);
		            }
	        
	            }
			}

	        let nolocation = false;

			for (let recordItem of recordItems) {
				if (recordItem.dataset.partialrefund=='1') continue;
				let locations = [];
				var lineitemid = recordItem.dataset.lineitemid;
				let customSku = recordItem.dataset.customSku;
				let locSelTrs = recordItem.querySelectorAll('#location-select-table tbody tr');
				if (CheckLocationTabs.includes(page.tab) && inventoryDetails.hasOwnProperty(customSku) && locSelTrs.length == 0) {
					nolocation = true;
					recordItem.classList.add('bg-noloc');
					continue;
				}
				for (let locSelTr of locSelTrs) {
					let loc = {};
					loc.id = locSelTr.id;
					loc.customSku = locSelTr.dataset.customSku;
					loc.invid = locSelTr.dataset.invid;
					loc.bay = locSelTr.querySelector('td[data-col="loc"]').textContent;
					loc.indivQty = locSelTr.querySelector('td[data-col="indivQty"]').textContent;
					loc.cartonQty = locSelTr.querySelector('td[data-col="cartonQty"]').textContent;
					loc.type = locSelTr.querySelector('td[data-col="type"]').textContent;
					locations.push(loc);

					if (loc.id=='qvb') {
                        qvbQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='pick') {
                        pickQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id=='bulk') {
                        bulkQtys.push([loc.invid, loc.indivQty]);
                    } else if (loc.id != 'noloc'){
                        locQtys.push([loc.id, loc.indivQty, loc.customSku])
                    }
				}

				locationSelected[lineitemid] = locations;
			}

			if (CheckLocationTabs.includes(page.tab) && nolocation) {
				page.notification.show('Please pick location for highlighted items.');
				return;
			}

			selectedRecord.locationSelected = locationSelected;


			// Check if Fastway or Australia Post
			let recordRow = saleRecords[selectedRecord.store].records[selectedRecord.recordNum];
			let fastway = false;
			if (tssData.hasOwnProperty(recordRow.BuyerPostCode)) {
				let buyerCity = recordRow.BuyerCity.toLowerCase();
				//console.log(buyerCity);
				for (let i = 0; i < tssSuburbs.length; i++) {
					if (buyerCity.includes(tssSuburbs[i])) {
						fastway = true;
						break;
					}
				}
			}

			// Check if the destination is a PO Box, parcel locker, locked bag or post office
			if (fastway && (rePOBox.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reParcelLocker.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reLockedBag.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| rePostOffice.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2)
				|| reLPO.test(recordRow.BuyerAddress1 + ' ' + recordRow.BuyerAddress2))) {
				fastway = false;
			}


			selectedRecord.orderType = fastway ? ORDER_TYPE.FASTWAY10KG : ORDER_TYPE.AUSPOST;

			//console.log(selectedRecord.orderType);

		}*/
		else if (target.classList.contains('item-mark-dailyorder')) {
			//selectedRecord.orderType = ORDER_TYPE.DO;
			selectedRecord.showNext = true;
			selectedRecord.markOrder = true;
		}
		else if (target.classList.contains('order-change-status')) {
			// Change order status
			selectedRecord.markOrder = true;
			switch (ORDER_STATUS_DATASET[target.dataset.status]) {
				case ORDER_STATUS.COLLECTED:
					selectedRecord.status = ORDER_STATUS.COLLECTED;
					selectedRecord.showNext = true;
					break;
				case ORDER_STATUS.PACKED:
					selectedRecord.status = ORDER_STATUS.PACKED;
					selectedRecord.showNext = true;
					break;
				case ORDER_STATUS.OUTOFSTOCK:
					selectedRecord.status = ORDER_STATUS.OUTOFSTOCK;
					selectedRecord.orderStatusChanged = true;
					selectedRecord.showNext = true;

					if (ORDER_STATUS_NAME[selectedRecord.status] != ORDER_STATUS_NAME[recordDataToday.OrderStatus]) {
						selectedRecord.transacs.push({
							'field': 'status',
							'oldValue': ORDER_STATUS_NAME[recordDataToday.OrderStatus],
							'newValue': ORDER_STATUS_NAME[selectedRecord.status],
						})
					}

					if (page.type == PAGE_TYPE['LABELS']) {
						selectedRecord.inventoryBack = true;
					}

					break;
				case ORDER_STATUS.NONE:
					selectedRecord.status = ORDER_STATUS.NONE;
					selectedRecord.markOrder = false;
					break;
				case ORDER_STATUS.ORDERED:
					selectedRecord.status = ORDER_STATUS.ORDERED;
					selectedRecord.orderStatusChanged = true;
					selectedRecord.showNext = true;

					if (ORDER_STATUS_NAME[selectedRecord.status] != ORDER_STATUS_NAME[recordDataToday.OrderStatus]) {
						selectedRecord.transacs.push({
							'field': 'status',
							'oldValue': ORDER_STATUS_NAME[recordDataToday.OrderStatus],
							'newValue': ORDER_STATUS_NAME[selectedRecord.status],
						})
					}

					break;
				case ORDER_STATUS.CANCELLED.OUTOFSTOCK:
					selectedRecord.status = ORDER_STATUS.CANCELLED.OUTOFSTOCK;
					selectedRecord.orderStatusChanged = true;
					selectedRecord.showNext = true;

					if (ORDER_STATUS_NAME[selectedRecord.status] != ORDER_STATUS_NAME[recordDataToday.OrderStatus]) {
						selectedRecord.transacs.push({
							'field': 'status',
							'oldValue': ORDER_STATUS_NAME[recordDataToday.OrderStatus],
							'newValue': ORDER_STATUS_NAME[selectedRecord.status],
						})
					}

					break;
				case ORDER_STATUS.PARTIALCOLLECT:
					selectedRecord.status = ORDER_STATUS.PARTIALCOLLECT;
					selectedRecord.partialcollectTime = true;
					selectedRecord.showNext = true;

					if (ORDER_STATUS_NAME[selectedRecord.status] != ORDER_STATUS_NAME[recordDataToday.OrderStatus]) {
						selectedRecord.transacs.push({
							'field': 'status',
							'oldValue': ORDER_STATUS_NAME[recordDataToday.OrderStatus],
							'newValue': ORDER_STATUS_NAME[selectedRecord.status],
						})
					}

					let locationSelected = {};

					let recordItems = target.parentNode.parentNode.querySelectorAll('.record-items>tbody>tr');
					for (let recordItem of recordItems) {
						if (recordItem.dataset.partialrefund=='1') continue;
						let locations = [];
						var lineitemid = recordItem.dataset.lineitemid;
						let locSelTrs = recordItem.querySelectorAll('#location-select-table tbody tr');
						for (let locSelTr of locSelTrs) {
							let loc = {};
							loc.id = locSelTr.id;
							loc.customSku = locSelTr.dataset.customSku;
							loc.invid = locSelTr.dataset.invid;
							loc.bay = locSelTr.querySelector('td[data-col="loc"]').textContent;
							loc.indivQty = locSelTr.querySelector('td[data-col="indivQty"]').textContent;
							loc.cartonQty = locSelTr.querySelector('td[data-col="cartonQty"]').textContent;
							loc.type = locSelTr.querySelector('td[data-col="type"]').textContent;
							locations.push(loc);
						}

						locationSelected[lineitemid] = locations;
					}

					selectedRecord.locationSelected = locationSelected;
					break;
				case ORDER_STATUS.WAREHOUSECOLLECT:
					selectedRecord.status = ORDER_STATUS.WAREHOUSECOLLECT;
					//selectedRecord.orderStatusChanged = true;
					selectedRecord.showNext = true;

					if (ORDER_STATUS_NAME[selectedRecord.status] != ORDER_STATUS_NAME[recordDataToday.OrderStatus]) {
						selectedRecord.transacs.push({
							'field': 'status',
							'oldValue': ORDER_STATUS_NAME[recordDataToday.OrderStatus],
							'newValue': ORDER_STATUS_NAME[selectedRecord.status],
						})
						
					}

					break;	
				default:
					delete selectedRecord.markOrder;
			}

			if (selectedRecord.status == -1) {
				page.notification.show('Error: The desired status is not valid.');
				return false;
			}
		}
		else if (target.id == 'order-notes-save') {
			// Get order notes
			selectedRecord.notes = document.getElementById('order-notes-text').value || '*blank*';
			document.querySelector('.record-notes span').textContent = selectedRecord.notes;
			if (selectedRecord.notes != '*blank*') {
				let els = document.querySelectorAll('#record-list ul li');
				for (let el of els) {
					if (el.dataset.record == selectedRecord.recordNum) {
						el.classList.add('mess');
						let recordsMessed = JSON.parse(localStorage.recordsMessed);
						let recordsMessedID = selectedRecord.store.toString()+'|'+selectedRecord.recordNum.toString();
						recordsMessed[recordsMessedID] = true;
						localStorage.recordsMessed = JSON.stringify(recordsMessed);

						let oldValue = recordDataToday.Notes;
						// console.log(oldValue);
						let newValue = selectedRecord.notes;
						// console.log(newValue);

						if (newValue != oldValue) {
							selectedRecord.transacs.push({
								'field': 'notes',
								'oldValue': oldValue,
								'newValue': newValue,
							})
						}

						let locationSelected = {};

						// console.log(transacs);
						let formData = new FormData();

						let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
			            let updateStockInventoryData = await response.json();

			            if (response.ok && updateStockInventoryData.result == 'success') {
			            	await loadInventoryDetails({'barcode': barcode, 'sku': sku, 'customSku': customSku})
			                page.notification.show("Item updated successfully.");
			            }
			            else {
			                page.notification.show(updateStockInventoryData.result);
			            }
					}
				}

			}else{
				let els = document.querySelectorAll('#record-list ul li');
				for (let el of els) {
					if (el.dataset.record == selectedRecord.recordNum) {
						el.classList.remove('mess');
						let recordsMessed = JSON.parse(localStorage.recordsMessed);
						let recordsMessedID = selectedRecord.store.toString()+'|'+selectedRecord.recordNum.toString();
						delete recordsMessed[recordsMessedID];
						localStorage.recordsMessed = JSON.stringify(recordsMessed);
					}
				}

			}

		}
		else if (target.classList.contains('order-change')) {
			// Change order type
			selectedRecord.orderType = ORDER_TYPE_DATASET[target.dataset.type];
			if (!selectedRecord.orderType) {
				page.notification.show('Error: Invalid order type.');
				return false;
			}

			// The order type will be changed
			selectedRecord.orderTypeChanged = true;
		}
		else if (target.classList.contains('order-instock')) {
			selectedRecord.status = ORDER_STATUS.NONE;
			selectedRecord.groupID = 1;
			document.querySelector('#record-list ul li[data-store="'+selectedRecord.store+'"][data-record="'+selectedRecord.recordNum+'"]').classList.add('done');
			
			if (ORDER_STATUS_NAME[selectedRecord.status] != ORDER_STATUS_NAME[recordDataToday.OrderStatus]) {
				selectedRecord.transacs.push({
					'field': 'status',
					'oldValue': ORDER_STATUS_NAME[recordDataToday.OrderStatus],
					'newValue': ORDER_STATUS_NAME[selectedRecord.status],
				})				
			}
		}
		else if (target.classList.contains('order-rts-resend')) {
			selectedRecord.status = ORDER_STATUS.PACKED;
			selectedRecord.resendRts = 1;
			selectedRecord.rts = 0;
		} 
		else if (target.classList.contains('order-backtoinventory')) {
			selectedRecord.status = PAGE_TAB_INFO[page.tab].status;
			selectedRecord.addBackToInventory = 1;
			selectedRecord.rts = 1;
			target.parentNode.querySelector('.order-backtoinventory').disabled = true;
			target.parentNode.querySelector('.order-rts-resend').disabled = true;

			let formData1 = new FormData();
			let trs = e.target.parentNode.parentNode.querySelectorAll('.record-items>tbody>tr');
			for (let tr of trs) {
				formData1.append('sku', formatSku(tr.dataset.sku));
				let itemQty = parseInt(tr.dataset.singleItemMultiple)*parseInt(tr.dataset.itemQuantity);
				let cartonQty = parseInt(tr.dataset.cartonMultiple)*parseInt(tr.dataset.itemQuantity);
				//console.log(cartonQty);

				formData1.append('addfromindivStock', itemQty);
				formData1.append('addfromcartonStock', cartonQty);

				let response1 = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData1});
	            let updateStockInventoryData = await response1.json();

	            if (response1.ok && updateStockInventoryData.result == 'success') {
	                page.notification.show("Item updated successfully.");

	                // Reload the sale record
					//document.querySelector('#record-list ul .selected').click();
	            }

	            else {
	                page.notification.show(updateStockInventoryData.result);
	            }
	        }
		}
		else if (target.id == 'order-cancel-partial' || target.id == 'order-cancel-full') {
			// Get cancellation reason
			let cancelReasonEl = document.getElementById('order-cancel-reason');
			selectedRecord.status = (cancelReasonEl.options[cancelReasonEl.selectedIndex].value == 'outofstock') ? ORDER_STATUS.CANCELLED.OUTOFSTOCK : ORDER_STATUS.CANCELLED.DISCONTINUED;
			selectedRecord.groupID = selectedRecord.groupID || 1;

			if (target.id == 'order-cancel-partial') {
				// Partial order
				selectedRecord.notes = document.getElementById('order-cancel-notes').value || 'No details entered';
			}
			else {
				// Cancel order
				selectedRecord.notes = '*blank*';
			}
		}
		else if (target.classList.contains('order-mark-confirm')) {
			selectedRecord.status = ORDER_STATUS.NONE;
			selectedRecord.notes = document.getElementById('notes').textContent + ' Confirmed';
			selectedRecord.markOrder = true;
		}
		else if (target.classList.contains('order-cancel-done')) {
			selectedRecord.status = ORDER_STATUS.CANCELLED.DONE;
			// if (page.user.id) selectedRecord.notes = ORDER_STATUS_NAME[recordDataToday.OrderStatus]+' - Refunded by '+page.user.firstname;
			selectedRecord.markOrder = true;
		}
		else if (target.classList.contains('order-link-order')) {
			copyToClipboard('https://k2b-bulk.ebay.com.au/ws/eBayISAPI.dll?MfcISAPICommand=SalesRecordConsole&searchField=BuyerId&searchValues='+encodeURIComponent(recordData.UserID)+'&StoreCategory=-4&Status=All&Period=Last122Days');
			return false;
		}
		else if (target.classList.contains('order-link-message-cancel')) {
			let contactLink = 'https://contact.ebay.com.au/ws/eBayISAPI.dll?ContactUserNextGen&iId='+encodeURIComponent(recordData.Items[0].ItemNum)+'&recipient='+encodeURIComponent(recordData.UserID);
			let cancelLink = 'https://www.ebay.com.au/afs/Cancel/Start?transId='+encodeURIComponent(recordData.Items[0].TransID)+'&itemId='+encodeURIComponent(recordData.Items[0].ItemNum);
			copyToClipboard('https://k2b-bulk.ebay.com.au/ws/eBayISAPI.dll?MfcISAPICommand=SalesRecordConsole&searchField=BuyerId&searchValues='+encodeURIComponent(recordData.UserID)+'&StoreCategory=-4&Status=All&Period=Last122Days&linkData='+encodeURIComponent(JSON.stringify([contactLink, cancelLink])));
			return false;
		}
		else if (target.classList.contains('order-partial-refund-done')) {
			selectedRecord.status = -1;
			selectedRecord.partialRefundDone = true;
			selectedRecord.markOrder = true;
		}
		else if (target.classList.contains('order-mark-fullypicked')) {

			let items = recordData.Items;
			let scannedQtys = {};

			for (let i=0; i< items.length; i++) {
				let item = items[i];
				let item1 = item.scannedQty[1];

				scannedQtys[item['LineItemID']] = [item1,item1];
				console.log(scannedQtys);				
			}			
			selectedRecord.scannedQtys = scannedQtys;
			selectedRecord.markOrder = true;

			if (ORDER_STATUS_NAME[selectedRecord.status] != ORDER_STATUS_NAME[recordDataToday.OrderStatus]) {
				selectedRecord.transacs.push({
					'field': 'status',
					'oldValue': ORDER_STATUS_NAME[recordDataToday.OrderStatus],
				})
				
			}
		} 
		else if (target.classList.contains('order-ready-to-print')) {
			selectedRecord.status = ORDER_STATUS.READYTOPRINT;
			//selectedRecord.orderStatusChanged = true;
			selectedRecord.showNext = true;

			if (ORDER_STATUS_NAME[selectedRecord.status] != ORDER_STATUS_NAME[recordDataToday.OrderStatus]) {
				selectedRecord.transacs.push({
					'field': 'status',
					'oldValue': ORDER_STATUS_NAME[recordDataToday.OrderStatus],
					'newValue': ORDER_STATUS_NAME[selectedRecord.status],
				})
				
			}
		}
		else if (target.classList.contains('order-mark-dispatch')) {
			selectedRecord.status = ORDER_STATUS.PACKED;
			//selectedRecord.orderStatusChanged = true;
			selectedRecord.showNext = true;

			if (ORDER_STATUS_NAME[selectedRecord.status] != ORDER_STATUS_NAME[recordDataToday.OrderStatus]) {
				selectedRecord.transacs.push({
					'field': 'status',
					'oldValue': ORDER_STATUS_NAME[recordDataToday.OrderStatus],
					'newValue': ORDER_STATUS_NAME[selectedRecord.status],
				})
				
			}
		}
		else if (target.classList.contains('order-mark-pack')) {
			selectedRecord.status = ORDER_STATUS.PACKED;
			//selectedRecord.orderStatusChanged = true;
			selectedRecord.showNext = true;

			if (ORDER_STATUS_NAME[selectedRecord.status] != ORDER_STATUS_NAME[recordDataToday.OrderStatus]) {
				selectedRecord.transacs.push({
					'field': 'status',
					'oldValue': ORDER_STATUS_NAME[recordDataToday.OrderStatus],
					'newValue': ORDER_STATUS_NAME[selectedRecord.status],
				})
				
			}
		}
		else {
			page.notification.show('Error: unknown action.');
			return false;
		}


		// Disable buttons
		for (let btn of btns) btn.disabled = true;

		// Update the database
		try {
			do {
				let formData2 = new FormData();
		        formData2.append('subtractfromqvbqtys', JSON.stringify(qvbQtys));
		        formData2.append('subtractfrompickqtys', JSON.stringify(pickQtys));
		        formData2.append('subtractfrombulkqtys', JSON.stringify(bulkQtys));
		        formData2.append('subtractfromlocqtys', JSON.stringify(locQtys));
		        formData2.append('orderID', selectedRecord.SalesRecordID);
		        formData2.append('pageType', PAGE_INFO[page.type].name.toUpperCase());

		        let response2 = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData2});
		        let updateStockInventoryData = await response2.json();

		        if (response2.ok && updateStockInventoryData.result == 'success') {
		            
		        }
		        else {
		            page.notification.show(updateStockInventoryData.result, {hide: false});
		            break;
		        }

				let formData = new FormData();
				formData.append('record', selectedRecord.recordNum);
				formData.append('salesrecordid', selectedRecord.SalesRecordID);
				formData.append('type', selectedRecord.orderType);
				formData.append('status', selectedRecord.status);
				formData.append('group', selectedRecord.groupID);
				formData.append('notes', selectedRecord.notes);
				if (page.localUser) formData.append('dontsaveadmin', '1');

				if (selectedRecord.hasOwnProperty('resendRts')) formData.append('resendRts', selectedRecord.resendRts);
				if (selectedRecord.hasOwnProperty('rts')) formData.append('rts', selectedRecord.rts);
				if (selectedRecord.hasOwnProperty('addBackToInventory')) formData.append('addBackToInventory', selectedRecord.addBackToInventory);
				if (selectedRecord.hasOwnProperty('locationSelected')) formData.append('locationSelected', JSON.stringify(selectedRecord.locationSelected));
				if (selectedRecord.hasOwnProperty('partialcollectTime')) formData.append('partialcollectTime', '1');
				if (selectedRecord.hasOwnProperty('partialRefundDone')) formData.append('partialRefundDone', '1');
				if (selectedRecord.hasOwnProperty('inventoryBack')) formData.append('inventoryBack', '1');

				if (selectedRecord.transacs.length>0) formData.append('transaction', JSON.stringify(selectedRecord.transacs));
				if (selectedRecord.scannedQtys) formData.append('scannedQtys', JSON.stringify(selectedRecord.scannedQtys));

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

			
				if (!response.ok) {
					page.notification.show('Error: '+data.result, {hide: false});
					break;
				}
				else if (data.result != 'success') {
					page.notification.show(data.result);
					break;
				}

				page.notification.show('Record '+(selectedRecord.SalesRecordID || selectedRecord.recordNum)+' has been updated.');

				// Close the cancellation box
				closeBox();


				let recordListItem = document.querySelector('#record-list ul li[data-store="'+selectedRecord.store+'"][data-record="'+selectedRecord.recordNum+'"]');
				let recordEntry = document.querySelector('#record-entries .record-entry[data-store="'+selectedRecord.store+'"][data-record-num="'+selectedRecord.recordNum+'"]');

				// Mark the item
				if (selectedRecord.hasOwnProperty('markOrder') && recordListItem) {
					if (selectedRecord.markOrder) {
						if (selectedRecord.status == ORDER_STATUS.OUTOFSTOCK) {
							recordListItem.classList.add('outofstock');
							recordListItem.dataset.removed = 'true';
						} else if (selectedRecord.status == ORDER_STATUS.ORDERED) {
							recordListItem.classList.add('ordered');
						} else if (selectedRecord.status == ORDER_STATUS.CANCELLED.OUTOFSTOCK) {
							recordListItem.classList.add('cancelledoos');
						} else if (selectedRecord.status == ORDER_STATUS.PARTIALCOLLECT) {
							recordListItem.classList.add('partialcollect');
						} else if (selectedRecord.status == ORDER_STATUS.WAREHOUSECOLLECT) {
							recordListItem.classList.add('warehousecollect');
						}
						else {
							recordListItem.classList.add('done');
						} 
					}
					else {
						recordListItem.classList.remove('done');
					}
					page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: selectedRecord.store, recordNum: selectedRecord.recordNum, status: selectedRecord.status});

					// Mark the tab button as done if all the orders in this tab are done
					let recordNotDone = document.querySelector('#record-list ul li:not(.done)');
					if (!recordNotDone) {
						document.querySelector('#header a.selected').classList.add('done');
					}
				}

				// Change the group ID internally
				saleRecords[selectedRecord.store].today[selectedRecord.recordNum].GroupID = selectedRecord.groupID;


				if (selectedRecord.notes) {
					// Change the value of the notes internally
					saleRecords[selectedRecord.store].today[selectedRecord.recordNum].Notes = selectedRecord.notes != '*blank*' ? selectedRecord.notes : null;
				}
				if (selectedRecord.orderTypeChanged) {
					// Change the order type internally
					saleRecords[selectedRecord.store].today[selectedRecord.recordNum].OrderType = selectedRecord.orderType;
					if (recordEntry) recordEntry.dataset.orderType = selectedRecord.orderType;
				}
				if (selectedRecord.orderStatusChanged) {
					// Status was changed to something other than collected, so delete the record
					let removeRecordEntry = false;

					// Before deleting check if all connected orders have been processed
					if (selectedRecord.combined) {
						let connectedRecords = saleRecords[selectedRecord.store].connected[selectedRecord.recordNum];
						if (connectedRecords.length == 1) {
							removeRecordEntry = true;
						}
					}

					// Delete the record
					deleteRecord(selectedRecord.store, selectedRecord.recordNum);
					selectedRecord.showNext = false;

					if (removeRecordEntry) {
						showNextRecord();
						if (recordListItem) recordListItem.remove();
					}
					else if (recordEntry) {
						// Disable the buttons for this record
						btns = null;
						let recordEntryBtns = recordEntry.querySelectorAll('button');
						for (let re_i = 0; re_i < recordEntryBtns.length; re_i++) {
							recordEntryBtns[re_i].disabled = true;
						}
					}
				}

				if (selectedRecord.showNext && !selectedRecord.combined) {
					// Show next order
					showNextRecord();
				}
			} while(0)
		}
		catch (e) {
			//page.notification.show('Error: Could not connect to the server.');
			page.notification.show('Error: ' + JSON.stringify(e));
			console.log(e);
		}

		// Enable buttons
		if (btns) {
			for (let btn of btns) btn.disabled = false;
		}
	});


	// Generate order data, generate labels for printing, show the packing ready confirmation box, or show the tracking data save box
	document.getElementById('record-container').addEventListener('click', async function(e) {
		var target = e.target;
		if (target.classList.contains('order-generate') || target.classList.contains('order-print')) {
			// Generate order data or labels for printing
			let orderType = ORDER_TYPE_DATASET[target.dataset.type];
			//console.log(orderType);
			if (!orderType) {
				page.notification.show('Error: Invalid order type.');
				return false;
			}

			let store = document.querySelector('#store-label').value;

			/*if (store=='-') {
				page.notification.show('Please select a store.');
				return;
			}*/

			if (target.classList.contains('order-generate')) {
				// Create eParcel and Fastway label data for all orders
				let jsonOutput = target.dataset.variant == 'label-data';
				let repeat = document.querySelector('#cust-label').value;
				let morelabel = PAGE_TYPE.MORELABELS == page.type ? true : false;
				let labelData = await generateLabelData(store, orderType, true, jsonOutput, repeat, morelabel);
				console.log(labelData);
				let saveFormat = target.dataset.save || false;

				//if (repeat==1) orderType = 21;

				if (labelData == 'unsupported type') {
					page.notification.show('Error: Labels cannot be generated for this type of order.');
				}
				else if (labelData) {
					if (saveFormat) {
						if (jsonOutput) labelData = JSON.stringify(labelData);
						saveAs(new Blob([labelData], {type: 'text/'+saveFormat+';charset=utf-8'}), 'international-consignments-'+getDateValue(new Date())+'.'+saveFormat, true);
					}
					else if (jsonOutput) {
						// Open label template page and send data to it
						let labelPage = window.open('/label-template/index.html', '_blank');
						labelPage.onload = () => labelPage.postMessage({type: orderType, data: labelData, repeat: repeat}, window.location.origin);
					}
					else {
						// Copy to clipboard
						copyToClipboard(jsonOutput ? JSON.stringify(labelData) : labelData);
						page.notification.show('Label data has been copied to the clipboard.', {background: 'bg-lgreen'});
					}

					// Set labels as created
					labels[store] = {};
					labels[store][orderType] = {};
					labels[store][orderType]['created'] = true;
					// Enable ready/pack buttons
					if (repeat == 1) {
						enableButtons('.order-pack[data-type="'+target.dataset.type+'"]');
					}
				}
				else {
					page.notification.show('There are no orders of this type to be packed right now.', {background: 'bg-orange'});
				}
			}
			else if (target.classList.contains('order-print')) {
				// Create PDF files for all orders for printing
				let removeCombinedAndReverse = (orderType == ORDER_TYPE.FLATPACK);
				let succeeded = false;

				if (target.dataset.variant == 'multiple') {
					succeeded = createPDFMultiple(orderType, {labelsPerPage: 8, removeCombined: removeCombinedAndReverse, reverse: removeCombinedAndReverse});
				}
				else if (target.dataset.variant == 'multiple-stores') {
					succeeded = createPDFMultipleStore({labelsPerPage: 7});
				}
				else {
					succeeded = await createPDF(store, orderType, removeCombinedAndReverse, removeCombinedAndReverse);
				}

				if (succeeded) {
					// Set labels as created
					//labels[store][orderType]['created'] == true;
					// Enable ready/pack buttons
					enableButtons('.order-pack[data-type="'+target.dataset.type+'"]');
				}
				else {
					page.notification.show('There are no orders of this type to be packed right now.', {background: 'bg-orange'});
				}
			}

			window.onbeforeunload = function(e) {
				return 'Are you sure you want to leave this page? All of the data will be lost.';
			};
		}
		else if (target.classList.contains('order-pack') || target.classList.contains('order-tracking')) {

			let store = document.querySelector('#store-label').value;

			/*if (store=='-') {
				page.notification.show('Please select a store.');
				return;
			}*/

			// Show the packing ready confirmation box or tracking data save box
			var trackingDataTA = document.getElementById('tracking-data');
			var boxID = null;

			if (target.classList.contains('order-pack')) {
				boxID = 'pack-confirm-box';
			}
			else if (target.classList.contains('order-tracking')) {
				boxID = 'tracking-save-box';
			}

			// Pass on record and order data
			var selectedRecord = Object.assign({}, target.parentNode.parentNode.dataset);
			var boxEl = document.getElementById(boxID);
			//boxEl.dataset.store = selectedRecord.store;
			//boxEl.dataset.recordNum = selectedRecord.recordNum;
			boxEl.dataset.type = target.dataset.type;
			boxEl.dataset.store = store;

			if (boxID == 'tracking-save-box') {
				// Reset textbox content and focus
				trackingDataTA.value = '';
				document.querySelector('#tracking-save-box .title input').value = '';
			}

			document.getElementById('box-outer').classList.add('flex');
			boxEl.classList.remove('hide');
			trackingDataTA.focus();
		}
	});

	// Set orders as "ready to pack" in the database
	document.getElementById('pack-confirm').addEventListener('click', async function() {
		// Save records to the packing table
		var selectedRecord = Object.assign({}, this.parentNode.parentNode.dataset);
		var recordList = null;
		var btns = document.querySelectorAll('#record-entries .order-pack');

		// Get record list
		selectedRecord.orderType = ORDER_TYPE_DATASET[selectedRecord.type];
		if (!selectedRecord.orderType) {
			page.notification.show('Error: Invalid order type.');
			return false;
		}

		//console.log(selectedRecord.store);
		let morelabel = PAGE_TYPE.MORELABELS == page.type ? true : false;

		recordList = getRecordsOfType(selectedRecord.store, selectedRecord.orderType, true, true, morelabel);
		let repeat = document.querySelector('#cust-label').value;
		recordList = getRepeatCustomerRecordList(recordList,repeat);
		console.log(saleRecords);
		for (let recordLis of recordList) {
			console.log(recordLis);
			var record = saleRecords[recordLis[0]].today[recordLis[1]];
			console.log(record);
			let oldValue = ORDER_STATUS_NAME[record.OrderStatus];
			recordLis.push(oldValue);
		}
		console.log(recordList);

		// Reverse the record list if it's flatpack
		if (selectedRecord.orderType == ORDER_TYPE.FLATPACK) recordList.reverse();


		// Disable buttons
		for (let btn of btns) btn.disabled = true;

		// Add records to the database
		try {
			if (morelabel) {
				let formData = new FormData();
				formData.append('records', JSON.stringify(recordList));

				let response = await fetch(apiServer+'morelabel/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();


				if (response.ok && data.result == 'success') {
					// Enable tracking buttons
					page.notification.show('Morelabels have been marked as 0.');
					enableButtons('.order-refresh');
				}
				else {
					page.notification.show(data.result);
				}

			} else {

				let formData = new FormData();
				formData.append('records', JSON.stringify(recordList));

				let response = await fetch(apiServer+'readytopack', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (response.ok && data.result == 'success') {
					// Enable tracking buttons
					page.notification.show('Records have been marked as ready to be packed.');
					//enableButtons('.order-tracking');
					enableButtons('.order-refresh');
					// Enable done button for some order types
					/*if ([ORDER_TYPE.FLATPACK, ORDER_TYPE.EXPRESS, ORDER_TYPE.INTERNATIONAL].includes(selectedRecord.orderType)) {
						enableButtons('.order-refresh');
					}*/
				}
				else {
					page.notification.show(data.result);
				}
			}

			// Close box
			closeBox();
			window.onbeforeunload = null;
		}
		catch (e) {
			page.notification.show('Error: Could not connect to the server.');
		}

		// Enable buttons
		for (let btn of btns) btn.disabled = false;
	});

	document.querySelector('#tracking-save-box .title input').addEventListener('change', readTracking);

	function readTracking(e) {
		let file = e.target.files[0];
		// console.log(file);
		if(!window.FileReader) return; // Browser is not compatible

	    var reader = new FileReader();

	    reader.onload = function() {
	    	// console.log(evt.target.result);
	    	pdfjsLib.getDocument(new Uint8Array(this.result)).promise.then((pdf)=>{
	    		// console.log(pdf.numPages);
	    		let trackings = [];
	    		for (let i=1; i<=pdf.numPages; i++) {
	    			trackings.push(pdf.getPage(i).then(function(page) {
						return page.getTextContent().then(function(textContent) {
							// console.log(textContent);
							let reference = textContent.items.find(item => item.str.startsWith('Reference:'));
							let tracking = textContent.items.find(item => item.str.startsWith('EMG') && item.str.split('-').length==3);
							return '"' + reference.str.replace('Reference: ','') + '": "' + tracking.str + '"';
						});
					}));
	    		}
	    		// console.log(trackings);
	    		Promise.all(trackings).then((trs) => {
	    			document.querySelector('#tracking-data').value = '{' + trs.join(",") + '}';
	    		})
	    		
		    		
			})
	    };

	    reader.readAsArrayBuffer(file);

	}

	// Save tracking numbers in the collecting table in the database
	document.getElementById('tracking-save').addEventListener('click', async function() {
		var btns = document.querySelectorAll('#record-entries .order-tracking');
		var trackingData = null;
		let store = document.querySelector('#store-label').value;
		let type = document.querySelector('#type-label').value;

		// Get tracking numbers
		try {
			trackingData = JSON.parse(document.getElementById('tracking-data').value);
		}
		catch (e) {
			page.notification.show('Error: Invalid tracking data.');
			return false;
		}

		//console.log("trackingData: " + JSON.stringify(trackingData));
		let trackingList = {}; // List of order IDs and tracking numbers
		let trackingListDBIDs = []; // List of database IDs
		let trackingListRecordIDs = []; // List of record IDs
		let trackingDataTrimmed = {};

		// Add the tracking data entries as per their store
		for (let trackingRecord in trackingData) {
			//console.log("trackingRecord: " + JSON.stringify(trackingRecord));
			let trackingRecordTrimmed = trackingRecord.trim();
			let dashIndex = trackingRecordTrimmed.indexOf('-');

			if (dashIndex != -1) {
				// Record parts - [store, record number]
				let recordParts = [trackingRecordTrimmed.slice(0, dashIndex), trackingRecordTrimmed.slice(dashIndex + 1)];

				if (reDigits.test(recordParts[0])) {
					// DB ID, save for processing later
					trackingListDBIDs.push(recordParts[1]);
					trackingDataTrimmed[recordParts[1]] = trackingData[trackingRecord];
				}
				else {
					let inputStore = recordParts[0].toLowerCase();
					for (let store in stores) {
						if (stores[store].storeID.toLowerCase() == inputStore) {
							// Get connected orders for the given record
							trackingListRecordIDs.push([store, recordParts[1]]);
							trackingDataTrimmed[store+'|'+recordParts[1]] = trackingData[trackingRecord];
							break;
						}
					}
				}
			}
		}

		//console.log("trackingListDBIDs: " + JSON.stringify(trackingListDBIDs));
		//console.log("trackingListRecordIDs: " + JSON.stringify(trackingListRecordIDs));
		// Get store and order ID for each database ID
		let trackingListOrderIDs = null;
		try {
			let trackingListDBIDsPrep = trackingListDBIDs.length ? encodeURIComponent(JSON.stringify(trackingListDBIDs)) : '[]';
			let trackingListRecordIDsPrep = trackingListRecordIDs.length ? encodeURIComponent(JSON.stringify(trackingListRecordIDs)) : '[]';

			let response = await fetch(apiServer+'orders/orderids?ids='+trackingListDBIDsPrep+'&records='+trackingListRecordIDsPrep, {headers: {'DC-Access-Token': page.userToken}});
			let data = await response.json(response);

			if (response.ok) {
				trackingListOrderIDs = data.orders;
			}
			else {
				page.notification.show(data.result);
				return;
			}
		}
		catch (e) {
			page.notification.show('Error: Could not get order IDs for the provided tracking data items.');
			return;
		}
		//console.log("trackingListOrderIDs: "+JSON.stringify(trackingListOrderIDs));
		if (Object.keys(saleRecords).length) {
			for (let id in trackingListOrderIDs) {
				let entry = trackingListOrderIDs[id];
				let saleRecordsStore = saleRecords[entry.store];
				let found = false;

				if (saleRecordsStore) {
					let connectedRecords = saleRecordsStore.connected[id];

					// Get connected orders for the given record
					if (connectedRecords) {
						// Add the tracking data to all the connected records
						found = true;
						for (let cr_i = 0; cr_i < connectedRecords.length; cr_i++) {
							let connectedRecord = connectedRecords[cr_i];
							trackingList[connectedRecord[1]] = trackingDataTrimmed[entry.store+'|'+entry.salesRecordID] || trackingDataTrimmed[id];
						}
					}
				}

				if (!found) {
					// Add the tracking data to the current record
					trackingList[id] = trackingDataTrimmed[entry.store+'|'+entry.salesRecordID] || trackingDataTrimmed[id];
				}
			}
		}
		else {
			for (let id in trackingListOrderIDs) {
				// Add the tracking data to the current record
				let entry = trackingListOrderIDs[id];
				trackingList[id] = trackingDataTrimmed[entry.store+'|'+entry.salesRecordID] || trackingDataTrimmed[id];
			}
		}


		// Disable buttons
		for (let btn of btns) btn.disabled = true;

		//console.log("trackingList: "+JSON.stringify(trackingList));
		// Add records to the database
		try {
			let formData = new FormData();
			formData.append('tdata', JSON.stringify(trackingList));

			let response = await fetch(apiServer+'savetracking', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
			let data = await response.json();

			if (response.ok && data.result == 'success') {
				// Enable refresh button
				page.notification.show('Tracking data has been saved.');

				let typeName = '';
				for (let typename in ORDER_TYPE_DATASET) {
					if (ORDER_TYPE_DATASET[typename] == type) {
						typeName = typename;
						break;
					}
				}

				if (labels[store]) {
					if (labels[store][type]) {
						if (labels[store][type].created) {
							enableButtons('.order-pack[data-type="'+typeName+'"]');
						}
					}
				}	
				
			}
			else {
				page.notification.show(data.result);
			}

			// Close box
			closeBox();
		}
		catch (e) {
			console.log(e);
			page.notification.show('Error: Could not connect to the server.');
		}

		// Enable buttons
		for (let btn of btns) btn.disabled = false;
	});


	// Show item report box
	document.getElementById('record-entries').addEventListener('click', function(e) {
		if (!e.target.classList.contains('item-report')) return;
		e.stopPropagation();
		showReportBox(Object.assign({}, e.target.parentNode.parentNode.dataset));
	});

	document.getElementById('record-entries').addEventListener('click', async function(e) {
		if (!e.target.classList.contains('order-inventory')) return;
		
        var itemSelected = e.target.parentNode.parentNode;
        let itemNum = itemSelected.dataset.itemNum;
        let itemSku = itemSelected.dataset.sku;
        let itemName = itemSelected.dataset.itemTitle;
        
        let item;
        if (itemSku && itemDetails[itemSku]) {
        	let items = itemDetails[itemSku];
        	for (let ite of items) {
        		if (ite.num == itemNum) {
        			item = ite;
        			break;
        		} else if (ite.name == itemName) {
        			item = ite;
        			break;
        		}
        	}
        } else if (itemNum && itemDetails[itemNum]) {
        	let items = itemDetails[itemNum];
        	for (let ite of items) {
        		if (ite.name == itemName) {
        			item = ite;
        			break;
        		}
        	}
        }

        if (!item) {
        	page.notification.show("Item detail not found.");
        	return;
        }

        await loadInventoryDetails(item);

        //checkExistsInInventory(item);
            
        showUpdateInventoryBox(item);
	});

	// Save item notes to the database
	document.getElementById('item-report-save').addEventListener('click', async function(e) {
		var selectedItem = Object.assign({}, this.parentNode.parentNode.dataset);
		var btn = this;
		var notes = '';

		// Get report reason
		var reportReasonsInput = document.querySelectorAll('#item-report-reason input[name="orr"]');
		var reportReasons = {};
		var reasonSelected = false;

		for (var i = 0; i < reportReasonsInput.length; i++) {
			var reason = reportReasonsInput[i].value;
			if (reason != 'other') {
				reportReasons[reason] = reportReasonsInput[i].checked;
				if (reportReasonsInput[i].checked) reasonSelected = true;
			}
			else {
				// Check 'other' value
				if (reportReasonsInput[i].checked) {
					var reasonOther = document.getElementById('item-report-other').value;
					if (reasonOther) {
						reportReasons[reason] = reasonOther;
						reasonSelected = true;
					}
					else {
						page.notification.show("Please enter a reason for 'other' in the text box.");
						return false;
					}
				}
				else {
					reportReasons[reason] = null;
				}
			}
		}

		if (!reasonSelected) {
			page.notification.show('Please select at least one reason for reporting this item.');
			return false;
		}

		notes = JSON.stringify(reportReasons);


		// Disable buttons
		btn.disabled = true;

		// Save item notes to the database
		try {
			let formData = new FormData();
			formData.append('id', selectedItem.id);
			formData.append('notes', notes);

			let response = await fetch(apiServer+'items/save', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
			let data = await response.json();

			if (response.ok && data.result == 'success') {
				// Clear the item's saved details
				delete itemDetails[selectedItem.itemNum];

				// Close the report box
				closeBox();
				page.notification.show('Notes saved for item '+selectedItem.itemNum+'.');
			}
			else {
				page.notification.show(data.result);
			}
		}
		catch (e) {
			page.notification.show('Error: Could not connect to the server.');
		}

		// Enable buttons
		btn.disabled = false;
	});

	

	// Open barcode scan box for the current record
	if ((page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.PARTIALCOLLECT || page.type == PAGE_TYPE.WAREHOUSECOLLECT || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.NEWORDERS || page.type == PAGE_TYPE.DEAL)) {
		document.getElementById('record-entries').addEventListener('click', function(e) {
			if (!e.target.closest('tbody') || e.target.classList.contains('item-report') || e.target.id == 'bay' || e.target.id == 'fwfp' || e.target.id == 'set-fwfp' || e.target.classList.contains('sku') 
				|| e.target.id == 'set-bay' || e.target.classList.contains('item-mark-flatpack') || e.target.classList.contains('item-mark-costco') || e.target.classList.contains('alternative-item-show')
				|| e.target.classList.contains('location-selected') || e.target.closest('.location-selected') || e.target.classList.contains('indiv-item-scan') || e.target.closest('.indiv-item-scan') 
				|| e.target.id == 'sat' || e.target.id == 'set-sat' || e.target.classList.contains('item-mark-fastwayflatpack') || e.target.classList.contains('item-download') || e.target.classList.contains('item-edit')
				|| e.target.classList.contains('item-mark-add') || e.target.classList.contains('item-mark-modify') || e.target.classList.contains('item-mark-partialrefund') || e.target.classList.contains('item-delete')
				|| e.target.classList.contains('item-mark-vr') || e.target.classList.contains('item-mark-factory') || e.target.classList.contains('order-inventory')) return;
			var target = e.target.tagName == 'TR' ? e.target : (e.target.querySelector('tr') || e.target.closest('tr'));
			if (!target.classList.contains('clickable')) return;
			showItemDetails(target.dataset.id, target.dataset.store, target.dataset.itemTitle, target.dataset.itemNum, target.dataset.sku, target.dataset.variationTypes, target.classList.contains('no-edit'));
		});
	}

	function showItemDetails(id, itemStore, itemTitle, itemNum, itemSku, variationTypes, disableSave = false) {
		// Check if item is loaded from the database
		if (!itemDetails.hasOwnProperty( itemNum || itemSku)) {
			page.notification.show('Error: item '+itemNum+' could not be loaded from the database.');
			return false;
		}
		var items = itemDetails[ itemNum || itemSku ];
		if (variationTypes) variationTypes = JSON.parse(variationTypes);
		var itemNameEl = document.querySelector('#barcode-itemname span');
		var itemNumEl = document.querySelector('#barcode-itemnum span');
		var itemSkuEl = document.querySelector('#barcode-itemsku span');
		var itemStoreEl = document.querySelector('#barcode-itemstore span');
		var itemIDEl = document.querySelector('#barcode-itemid span');
		var itemVariations = document.querySelector('#barcode-variations');
		var barcodeInput = document.querySelector('#barcode-input input');
		var barcode = '', quantity = 0;
		var indivBarcodeInput = document.querySelector('#indiv-barcode-input input');
		var indivBarcode = '', indivQuantity = 1;

		var itemTitleVariationMatch = itemTitle.match(reVariation);
		var itemTitleVariation = itemTitleVariationMatch ? itemTitleVariationMatch[0].replace(/\[|\]/g, '') : '';


		// Item name
		//itemNameEl.textContent = items[0].name.replace(reVariation, '');
		itemNameEl.textContent = itemTitle.replace(reVariation, '');

		// Item number
		itemNumEl.textContent = itemNum;
		itemSkuEl.textContent = itemSku;
		itemStoreEl.textContent = itemStore;
		itemIDEl.textContent = id;

		if (!itemNum) {
			itemNumEl.parentNode.style.display = 'none';
			itemSkuEl.parentNode.style.display = '';
		}

		// Remove existing variation options
		while (itemVariations.firstChild) {
			itemVariations.removeChild(itemVariations.firstChild);
		}

		// Variations
		var variationsAdded = false;
		var matchItems = false;
		for (var item_i = 0; item_i < items.length; item_i++) {
			// Create option
			var item = items[item_i];
			if (itemStore != item.storeID  && itemStore != 81 && itemStore != 82) {
				continue;
			}else{
				matchItems = true;
			}
			var itemNameVariation = item.name.replace(item.name.replace(reVariation, ''), '').replace(/\[|\]/g, '').trim();
			//console.log("itemNameVariation: "+itemNameVariation);
			//console.log("item.name: "+item.name);
			//console.log("itemNameEl.textContent: "+itemNameEl.textContent);
			//var itemNameVariation = itemTitle.replace(itemNameEl.textContent, '').replace(/\[|\]/g, '');
			var variationParts = !itemNameVariation.includes(',') ? [itemNameVariation] : itemNameVariation.split(','), variationStrParts = [];
			//console.log("indexOf(','): "+!itemNameVariation.includes(','));
			//console.log(variationParts);
			if (!itemNameVariation) continue;
			if (!variationTypes) continue;
			// Add variation types
			for (var p_i = 0; p_i < variationParts.length; p_i++) {
				variationStrParts.push((SUPPLIER_INFO[SUPPLIER.CombinedGroup].stores.includes(itemStore) ? variationTypes.join(',') : variationTypes[p_i] ? variationTypes[p_i] : 'Variation') + ': ' + variationParts[p_i]);
			}

			var optionEl = document.createElement('option');
			optionEl.value = item.id;
			optionEl.textContent = variationStrParts.join(', ') || itemNameVariation;
			optionEl.dataset.quantity = item.quantity;

			// Variation, barcode and quantity
			//if (itemTitleVariation.toLowerCase() == itemNameVariation.toLowerCase()) {
				/*console.log(itemTitleVariation.toLowerCase());
				console.log(itemNameVariation.toLowerCase());*/
				if (id == item.id) {
					optionEl.selected = true;
					barcode = item.upc || item.barcode;
					quantity = item.quantity || 0;
					indivBarcode = item.upc || item.singleItemBarcode;
					indivQuantity = item.singleItemMultiple || 0;
				}
					
			//}

			itemVariations.appendChild(optionEl);
			itemVariations.dataset.itemNum = itemNum;
			delete itemVariations.dataset.id;
			variationsAdded = true;
		}
		if (!matchItems) return false;

		if (!variationsAdded) {
			// Item without variations, set both item number and item ID
			itemVariations.dataset.itemNum = itemNum;
			//itemVariations.dataset.id = item[0].id;

			// Barcode and quantity
			for (let item of items) {
				if (itemStore != item.storeID && itemStore != 81 && itemStore != 82) continue;
				if ((itemNum && itemSku && itemNum == item.num && itemSku == item.sku) || 
					 (itemNum && !itemSku && itemNum == item.num && itemTitle == item.name) ||
					 (!itemNum && itemSku && itemSku == item.sku && itemTitle == item.name)) {
					barcode = item.upc || item.barcode;
					quantity = item.quantity;
					indivBarcode = item.upc || item.singleItemBarcode;
					indivQuantity = item.singleItemMultiple == null ? 0 : item.singleItemMultiple;
					break;
				}
			}
			
		}

		if (itemVariations.children.length) {
			itemVariations.parentNode.style.display = '';
		}
		else {
			itemVariations.parentNode.style.display = 'none';
		}

		// Barcode, quantity
		changeBarcodeQuantity(barcode, indivBarcode, quantity, indivQuantity);

		// Enable/disable save button
		document.getElementById('barcode-save').style.display = disableSave ? 'none': '';

		document.getElementById('box-outer').classList.add('flex');
		document.getElementById('barcode-box').classList.remove('hide');
		barcodeInput.focus();
		indivBarcodeInput.focus();
	}

	// Show the variation details for a given variation
	document.getElementById('barcode-variations').addEventListener('change', function() {
		var itemNum = this.dataset.itemNum;

		// Check if item is loaded from the database
		if (!itemDetails.hasOwnProperty(itemNum)) {
			page.notification.show('Error: item '+itemNum+' has not been loaded from the database.');
			return false;
		}

		var items = itemDetails[itemNum];
		var selectedVariation = this.options[this.selectedIndex];

		for (var item_i = 0; item_i < items.length; item_i++) {
			var item = items[item_i];
			if (item.id == selectedVariation.value) {
				// Change barcode, quantity
				changeBarcodeQuantity(item.barcode, item.singleItemBarcode, item.quantity || 0, item.singleItemMultiple || 0);
				break;
			}
		}
	});

	function changeBarcodeQuantity(barcode, indivBarcode, quantity, indivQuantity) {
		var barcodeInput = document.querySelector('#barcode-input input');
		var barcodeQuantityEls = document.querySelectorAll('#barcode-quantity .quantity input');
		var barcodeQuantityOther = document.querySelector('#barcode-quantity .other input');
		var indivBarcodeInput = document.querySelector('#indiv-barcode-input input');
		var indivQuantityEls = document.querySelectorAll('#indiv-quantity .indivQuantity input');
		var indivQuantityOther = document.querySelector('#indiv-quantity .ivother input');

		// Barcode
		barcodeInput.value = barcode || '';
		for (let barcodeQuantityEl of barcodeQuantityEls) barcodeQuantityEl.checked = false;
		indivBarcodeInput.value = indivBarcode || '';
		for (let indivQuantityEl of indivQuantityEls) indivQuantityEl.checked = false;

		// Quantity
	    if (quantity) {
	    	if (quantity == 0) {
				barcodeQuantityOther.value = quantity;
			}
			else if (quantity <= 10) {
				barcodeQuantityEls[quantity - 1].checked = true;
				barcodeQuantityOther.value = '';
			}
			else {
				barcodeQuantityOther.value = quantity;
			}
	    }

	    if (indivQuantity) {
			if (indivQuantity == 0) {
				indivQuantityOther.value = indivQuantity;
			}
			else if (indivQuantity <= 10) {
				indivQuantityEls[indivQuantity - 1].checked = true;
				indivQuantityOther.value = '';
			}
			else {
				indivQuantityOther.value = indivQuantity;
			}
		}
			
	}

	document.getElementById('inventory-save').addEventListener('click', async function(e) {
        let box = e.target.parentNode.parentNode.parentNode;
        if (!(await checkExistsInInventory(box.dataset.singleItemBarcode, formatSku(box.dataset.sku), box.dataset.num))) {
           //doesnt exist add new item
            let formData = new FormData();
            formData.append('store', box.dataset.storeID);
            formData.append('itemNo', box.dataset.num);
            formData.append('itemName', box.dataset.name);
            formData.append('sku', formatSku(box.dataset.sku));
            formData.append('itemBarcode', box.dataset.singleItemBarcode);
            formData.append('cartonBarcode', box.dataset.barcode);
            formData.append('indivQty', document.querySelector('#itemQuantityInput').value);
            formData.append('cartonQty', document.querySelector('#cartonQuantityInput').value);
            formData.append('quantityPerCarton', document.querySelector('#quantityPerCartonInput').value );
            formData.append('innerQty',document.querySelector('#innerQuantityInput').value);
            formData.append('weight', box.dataset.weight);
            formData.append('stockInHand', parseInt((document.querySelector('#cartonQuantityInput').value)*(document.querySelector('#quantityPerCartonInput').value) ) + parseInt(document.querySelector('#itemQuantityInput').value) );
            formData.append('stockReceived', 0);
            formData.append('stockSent', 0);
            formData.append('bay', box.dataset.bay );
            formData.append('expiry', document.querySelector('#expiryInput').value || '0000-01-01');
            formData.append('coreCloseout', document.querySelector('#coreCloseoutInput').value || '0');
            formData.append('clearance', document.querySelector('#clearanceInput').value || '0');
            formData.append('supplier', document.querySelector('#supplierInput').value || '');
            var pricesStr = document.querySelectorAll('.record-prices')[0].innerHTML;
            formData.append('price', parseFloat(pricesStr.substring(1, pricesStr.indexOf('<br>')), 10));
            formData.append('image', box.dataset.imageUrl);
            formData.append('packsize', document.querySelector('#packsize').value || '');
            
            let response = await fetch(apiServer+'addproduct', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
            let addProductData = await response.json();
            //console.log('addProductData', addProductData);
            if (response.ok && addProductData.result == 'success') {
                //console.log('response', response);
                page.notification.show("Item added successfully.");
                // Reload the sale record
				document.querySelector('#record-list ul .selected').click();
            }
            else {
                page.notification.show(addProductData.result);
            }
        }else{

            //exists only update quantities
            let formData = new FormData();
            formData.append('sku', formatSku(box.dataset.sku));
            formData.append('itemBarcode', box.dataset.singleItemBarcode);
            formData.append('cartonBarcode', box.dataset.barcode);
            formData.append('packsize', document.querySelector('#packsize').value || '0');
            formData.append('innerQty',document.querySelector('#innerQuantityInput').value || '0');
            formData.append('quantityPerCarton', document.querySelector('#quantityPerCartonInput').value );
            let singleItemQuantity = parseInt(document.querySelector('#itemQuantityInput').value);
            let cartonQuantity = document.querySelector('#cartonQuantityInput').value;
            
            formData.append('addfromindivStock', singleItemQuantity);
            formData.append('addfromcartonStock', cartonQuantity);
            
            let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
            let updateStockInventoryData = await response.json();
            if (response.ok && updateStockInventoryData.result == 'success') {
                page.notification.show("Item updated successfully.");
                // Reload the sale record
				document.querySelector('#record-list ul .selected').click();
            }

            else {
                page.notification.show(updateStockInventoryData.result);
            }
        }
        await loadInventoryDetails({'barcode':box.dataset.singleItemBarcode, 'sku': formatSku(box.dataset.sku), 'num': box.dataset.num});
        //showInventoryStock(itemNum, inventoryIndex, true);
        //clearForm();
        closeBox();
   });

   document.getElementById('damage-inventory-save').addEventListener('click', async function(e) {
        let box = e.target.parentNode.parentNode.parentNode;
        if (!(await checkExistsInInventory(box.dataset.singleItemBarcode, formatSku(box.dataset.sku), box.dataset.num))) {
           //doesnt exist add new item
            /*let formData = new FormData();
            formData.append('store', box.dataset.storeID);
            formData.append('itemNo', box.dataset.num);
            formData.append('itemName', box.dataset.name);
            formData.append('sku', formatSku(box.dataset.sku));
            formData.append('itemBarcode', box.dataset.singleItemBarcode);
            formData.append('cartonBarcode', box.dataset.barcode);
            formData.append('stockInHand', parseInt((document.querySelector('#cartonQuantityInput').value)*(document.querySelector('#quantityPerCartonInput').value) ) + parseInt(document.querySelector('#itemQuantityInput').value) );
            formData.append('quantityPerCarton', document.querySelector('#quantityPerCartonInput').value );
            formData.append('supplier', document.querySelector('#supplierInput').value || '');
            formData.append('image', box.dataset.imageUrl);
            
            let response = await fetch(apiServer+'addproduct', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
            let addDamagedProductData = await response.json();
            //console.log('addDamagedProductData', addDamagedProductData);
            if (response.ok && addDamagedProductData.result == 'success') {
                //console.log('response', response);
                page.notification.show("Item added successfully.");
                // Reload the sale record
				document.querySelector('#record-list ul .selected').click();
            }
            else {
                page.notification.show(addDamagedProductData.result);
            }*/
            page.notification.show('Please add inventory first.');
            return;
        }else{

            //exists only update quantities
            let formData = new FormData();
            formData.append('sku', formatSku(box.dataset.sku));
            formData.append('itemBarcode', box.dataset.singleItemBarcode);
            formData.append('cartonBarcode', box.dataset.barcode);
            //formData.append('quantityPerCarton', document.querySelector('#quantityPerCartonInput').value );
            //let stockInHand = parseInt(document.querySelector('#itemQuantityInput').value);
            //console.log(box.querySelector('#itemQuantityInput').value);
            let itemQuantity = box.querySelector('#damageQuantityInput').value ? parseInt(box.querySelector('#damageQuantityInput').value) : '';
            let cartonQuantity = box.querySelector('#damageCartonQuantityInput').value ? parseInt(box.querySelector('#damageCartonQuantityInput').value) : '';
            /*if  (cartonQuantity) {
            	let quantityPerCarton = inventoryDetails[box.dataset.singleItemBarcode].quantityPerCarton;
            	if (quantityPerCarton) {
            		stockInHand = stockInHand + quantityPerCarton*cartonQuantity;
            	} else {
            		let cartonQuantityInput = parseInt(document.querySelector('#quantityPerCartonInput').value);
            		if (cartonQuantityInput) {
            			stockInHand = stockInHand + cartonQuantityInput*cartonQuantity;
            		} else {
            			page.notification.show("Please fill in Quantity per Carton.");
            			return;
            		}
            		
            	}
            }*/
            //formData.append('stockInHand', stockInHand);
            formData.append('damagedItemQuantity', itemQuantity);
            formData.append('damagedCartonQuantity', cartonQuantity);
            
            let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
            let updateStockInventoryData = await response.json();
            if (response.ok && updateStockInventoryData.result == 'success') {
                page.notification.show("Item updated successfully.");
                // Reload the sale record
				document.querySelector('#record-list ul .selected').click();
            }

            else {
                page.notification.show(updateStockInventoryData.result);
            }
        }
        await loadInventoryDetails({'barcode':box.dataset.singleItemBarcode, 'sku': formatSku(box.dataset.sku), 'num': box.dataset.num});
        //showInventoryStock(itemNum, inventoryIndex, true);
        //clearForm();
        closeBox();
   });


	// Save details to database
	document.getElementById('barcode-save').addEventListener('click', async function() {
		var itemName = document.querySelector('#barcode-itemname span');
		var itemSku = document.querySelector('#barcode-itemsku span');
		var itemNum = document.querySelector('#barcode-itemnum span');
		var itemStore = document.querySelector('#barcode-itemstore span');
		var itemVariations = document.querySelector('#barcode-variations');
		var barcodeInput = document.querySelector('#barcode-input input');
		var barcodeQuantity = document.querySelector('#barcode-quantity .quantity input[name="bcq"]:checked');
		var barcodeQuantityOther = document.querySelector('#barcode-quantity .other input');
		var indivBarcodeInput = document.querySelector('#indiv-barcode-input input')
		//var indivBarcodeQuantity = document.querySelector('.indiv-quantity input');
		var indivBarcodeQuantity = document.querySelector('#indiv-quantity .indivQuantity input[name="ivq"]:checked');
		var indivQuantityOther = document.querySelector('#indiv-quantity .ivother input');
		var quantity = '';
		var indivQuantity = '';
		var btn = this;

		// Get item ID
		var itemID = document.querySelector('#barcode-itemid span').textContent;
		//console.log(itemSku.textContent);
		
		/*if (!itemVariations.options.length) {
			// Get item ID directly since there are no variations
			itemID = items[0].id;
		}
		else if (items) {
			// Get item ID of the selected variation
			itemID = itemVariations.options[itemVariations.selectedIndex].value;
		}*/

		/*if (items.length == 1) {
			if (itemStore.textContent == items[0].storeID) {
				itemID = items[0].id;
			}
			
		}else{
			for(let item of items) {
				if (itemNum.textContent) {
					if (itemSku.textContent && itemSku.textContent==item.sku) {
						itemID = item.id;
						break;
					}else if (itemName.textContent && itemName.textContent==item.name){
						itemID = item.id;
						break;
					}
				}else if (itemSku.textContent){
					if (itemName.textContent && itemName.textContent==item.name) {
						itemID = item.id;
						break;
					}
				}
			}
		}*/

		// Get quantity
		if (barcodeQuantityOther.value) {
			quantity = barcodeQuantityOther.value;
		}
		else if (barcodeQuantity) {
			quantity = barcodeQuantity ? barcodeQuantity.value : 0;
		}
		//if (!barcodeInput.value) quantity = 0;
		

		if (indivQuantityOther.value) {
			indivQuantity = indivQuantityOther.value;
		}
		else if (indivBarcodeQuantity) {
			indivQuantity = indivBarcodeQuantity ? indivBarcodeQuantity.value : 0;
		}
		//if (!indivBarcodeInput.value) indivQuantity = 0;

		btn.disabled = true;

		// Save item notes to the database
		try {
			let formData = new FormData();
			formData.append('id', itemID);
			formData.append('barcode', barcodeInput.value);
			formData.append('quantity', quantity);
			formData.append('singleItemBarcode', indivBarcodeInput.value);
			formData.append('singleItemMultiple', indivQuantity);

			let response = await fetch(apiServer+'items/save', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
			let data = await response.json();

			if (response.ok) {
				if (data.result == 'success') {
					// Clear the item's saved details
					//delete itemDetails[itemVariations.dataset.itemNum];
					if (itemNum.textContent) {
						for (let item of itemDetails[itemNum.textContent]) {
							if (item.id == itemID) {
								item.barcode = barcodeInput.value;
								item.quantity = quantity;
								item.singleItemBarcode = indivBarcodeInput.value;
								item.singleItemMultiple = indivQuantity;
							}					
						}
					}else{
						for (let item of itemDetails[itemSku.textContent]) {
							if (item.id == itemID) {
								item.barcode = barcodeInput.value;
								item.quantity = quantity;
								item.singleItemBarcode = indivBarcodeInput.value;
								item.singleItemMultiple = indivQuantity;
							}					
						}
					}
					

					page.notification.show('Barcode and quantity saved.', {background: 'bg-lgreen'});
					closeBox();

					// Reload the sale record
					document.querySelector('#record-list ul .selected').click();
				}
				else {
					page.notification.show(data.result);
				}
			}
			else {
				page.notification.show('Error: '+data.result);
			}
		}
		catch (e) {
			page.notification.show('Error: Could not connect to the server.');
			console.log(e);
		}

		btn.disabled = false;
	});


	// Select entry
	document.getElementById('record-entries').addEventListener('click', function(e) {
		if (e.target.tagName == 'SPAN' && e.target.closest('.record-title') && e.target.closest('.record-entry')) {
			selectText.bind(e.target)();
		}
	});

	document.getElementById('record-entries').addEventListener('click', async function(e) {
		if (e.target.id != 'awaiting-save') return;
		saveRecords(e);
	});

	document.getElementById('record-entries').addEventListener('click', async function(e) {
		if (e.target.id != 'content-order-search') return;
		// console.log('11');
		searchInventory();
	});

	// Show the combined order confirmation box
	function showCombinedConfirmBox(selectedRecord) {
		// Don't show the confirmation box again for the current records
		var recordEntries = document.querySelectorAll('#record-entries > .record-entry');
		for (var i = 0; i < recordEntries.length; i++) {
			recordEntries[i].dataset.combinedConfirmed = true;
		}

		document.getElementById('box-outer').classList.add('flex');
		document.getElementById('combined-confirm-box').classList.remove('hide');
	}


	// Open the report box for the current item
	function showReportBox(selectedItem) {
		var itemReportBox = document.getElementById('item-report-box');
		itemReportBox.dataset.id = selectedItem.id;
		itemReportBox.dataset.itemNum = selectedItem.itemNum;
		itemReportBox.dataset.itemTitle = selectedItem.itemTitle;

		// Clear selected reasons
		var reportReasonsChecked = document.querySelectorAll('#item-report-reason input[name="orr"]:checked');
		for (var i = 0; i < reportReasonsChecked.length; i++) {
			reportReasonsChecked[i].checked = false;
		}

		var otherInput = document.getElementById('item-report-other');
		otherInput.style.display = 'none';
		otherInput.value = '';

		document.getElementById('box-outer').classList.add('flex');
		itemReportBox.classList.remove('hide');
	}

	// Show/hide the 'other' box for reporting items
	addListener('#item-report-reason input', 'change', function() {
		var selectedReasonOther = document.querySelector('#item-report-reason div input[value="other"]:checked');
		var otherInput = document.getElementById('item-report-other');
		otherInput.style.display = (selectedReasonOther) ? 'unset' : 'none';
	});

	// Open the box to add notes to an order
	function showAddNotesBox(selectedRecord) {
		var addNotesBox = document.getElementById('order-notes-box');
		var record = saleRecords[selectedRecord.store].today[selectedRecord.recordNum];
		addNotesBox.dataset.store = selectedRecord.store;
		addNotesBox.dataset.recordNum = selectedRecord.recordNum;
		addNotesBox.dataset.orderType = selectedRecord.orderType;

		// Show the store name, record number and any notes
		var notesTA = document.getElementById('order-notes-text');
		document.getElementById('order-notes-store').textContent = stores[selectedRecord.store].name;
		document.getElementById('order-notes-num').textContent = selectedRecord.recordNum;
		notesTA.value = record && record.Notes ? record.Notes : '';

		document.getElementById('box-outer').classList.add('flex');
		addNotesBox.classList.remove('hide');
		notesTA.focus();
	}

	function showAddBoxWeightBox(selectedRecord) {

		var addboxWeightBox = document.getElementById('boxWeight-box');

		document.getElementById('box-outer').classList.add('flex');
		addboxWeightBox.classList.remove('hide');

		let boxTableBody = document.querySelector('#boxWeight-table-body');
        while (boxTableBody.firstChild) {
            boxTableBody.removeChild(boxTableBody.firstChild);
        }

		var record = saleRecords[selectedRecord.store].today[selectedRecord.recordNum];
		addboxWeightBox.dataset.store = selectedRecord.store;
		addboxWeightBox.dataset.recordNum = selectedRecord.recordNum;
		addboxWeightBox.dataset.orderType = selectedRecord.orderType;
		addboxWeightBox.dataset.boxDetails = JSON.stringify(record.boxDetails);

		document.getElementById('order-boxWeight-store').textContent = stores[selectedRecord.store].name;
		document.getElementById('order-boxWeight-num').textContent = selectedRecord.recordNum;

		let cols = ['actions', 'boxNo', 'weight'];


		if (record.boxDetails) {

			let boxDetail = JSON.parse(record.boxDetails);
			for (let bd of boxDetail) {
				// console.log(bd);
				let tr = document.createElement('tr');
				for (let col of cols) {
					let td = document.createElement('td');
					td.classList.add(col);

					if (col == 'actions') {
						let reBtn = document.createElement('input');
			            reBtn.setAttribute('type', 'button');
			            reBtn.setAttribute('value', 'x'); 
			            reBtn.setAttribute('class','removeRow btn-red'); 
						reBtn.style.width = "35px";
						reBtn.style.height = "35px";      
						reBtn.style.fontSize = "25px";

			                reBtn.addEventListener("click", function(e){                
			                    removeRows(e);                  
			                });

			            td.appendChild(reBtn);
			            td.setAttribute('class','Actions');  
					}
					else if (col == 'boxNo') {
						 td.textContent = bd[0];
					} 
					else if (col == 'weight') {
						td.textContent = bd[1];
					}
					tr.appendChild(td);
				}
				boxTableBody.appendChild(tr);
			}
		}
		
	}

 
	function addRow() {
	    let boxTab = document.getElementById('boxWeight-table-body');
	    let numOfBoxes =  boxTab.lastChild ? boxTab.lastChild.querySelector('.boxNo').textContent : 0;   
	    let rowCnt = boxTab.rows.length;
	    let tr = boxTab.insertRow(rowCnt);
	    let cols = ['actions','boxNo', 'weight'];
	    let colsEditable = ['boxNo', 'weight'];
	    

	    for (let c = 0; c < cols.length; c++) {
	        let td = document.createElement('td'); 
	        td = tr.insertCell(c);   
	        td.contentEditable = true;        

	        if (c == 0) {  
	            let reBtn = document.createElement('input');
	            reBtn.setAttribute('type', 'button');
	            reBtn.setAttribute('value', 'x');  

	            reBtn.setAttribute('class','removeRow btn-red');
	            reBtn.style.width = "35px";
				reBtn.style.height = "35px";      
				reBtn.style.fontSize = "25px";  

	                reBtn.addEventListener("click", function(e){                
	                    removeRows(e);                  
	                });

	            td.appendChild(reBtn);
	            td.setAttribute('class','Actions');           
	        }
	        else if (c == 1) {            
	            td.setAttribute('class','boxNo');  
	            td.textContent = parseInt(numOfBoxes) + 1;
	        } 
	        else {           
	            td.setAttribute('class','weight');           
	        } 
	    }
	}

	function removeRows(e) {
	    let boxTab = document.getElementById('boxWeight-table-body');  
	    let tr = e.target.parentNode.parentNode;
	    boxTab.removeChild(tr); 
	}

	async function saveBoxDetails() {
		let formData = new FormData();    
	    let trs = document.querySelectorAll('#boxWeight-table tbody tr');
	    let dbid = document.querySelector('#boxWeight-box').dataset.recordNum;
	    // console.log(dbid);
	    
	    formData.append('dbid', dbid);
    	let boxDetails = [];

    	if(trs.length == 0) {
			// console.log(trs.length);
			page.notification.show("Please add box details.");
			return;
		} 
		else {
			for (let tr of trs) {
				let boxNo = tr.querySelector('.boxNo').textContent;
		        let weight = tr.querySelector('.weight').textContent;

		        if(!weight) {
		        	page.notification.show('Pleae input weight');
		        	return;
		        }
		        
		        boxDetails.push([boxNo,weight,'']); 
			}			     
		}

	    formData.append('boxDetails', JSON.stringify(boxDetails));   

	    let response = await fetch(apiServer+'addBoxDetails', {method: 'post', body: formData});
	    let result = await response.json();

	    if (response.ok && result.result == 'success') { 
	        page.notification.show('Order updated!');

	        document.getElementById('box-outer').classList.remove('flex');
			document.getElementById('boxWeight-box').classList.add('hide');

	        let readytopackBtn = document.querySelector('.newOrders .order-ready-pack');
			if (readytopackBtn) readytopackBtn.classList.remove('hide');

			var addboxWeightBox = document.getElementById('boxWeight-box');
			addboxWeightBox.dataset.boxDetails = JSON.stringify(result.boxDetails);

			var record = saleRecords[addboxWeightBox.dataset.store].today[addboxWeightBox.dataset.recordNum];
			record.boxDetails = JSON.stringify(result.boxDetails);
	    
	    }
	    else {
	        notification.show(result.result);
	    }
	}

	// Open the cancellation box for the current record
	function showCancelBox(selectedRecord) {
		//var record = saleRecords[selectedRecord.store].records[selectedRecord.recordNum];
		var orderCancelBox = document.getElementById('order-cancel-box');
		orderCancelBox.dataset.store = selectedRecord.store;
		orderCancelBox.dataset.recordNum = selectedRecord.recordNum;
		orderCancelBox.dataset.orderType = selectedRecord.orderType;

		document.getElementById('box-outer').classList.add('flex');
		orderCancelBox.classList.remove('hide');
	}

	// Open the box to update inventory details
	function showUpdateInventoryBox(item) {
		clearForm();
		var updateInvenBox = document.getElementById('update-inventory-box');
		for (let key in item) {
			updateInvenBox.dataset[key] = item[key];
		}
 		document.getElementById('box-outer').classList.add('flex');
		updateInvenBox.classList.remove('hide');

		//showInventoryStock(item);
	}

	/*function checkExistsInInventory(itemNum) {
		var exists = false;
		for (let detail in Object.values(inventoryDetails)){
			var itemInInventory = Object.values(inventoryDetails)[detail], itemInItems = itemDetails[itemNum][0];
			if ((itemInInventory.itemNo == itemInItems.num) &&(itemInInventory.itemBarcode == itemInItems.barcode) && (itemInInventory.cartonBarcode == itemInItems.cartonBarcode) ) {
				// console.log(itemInInventory);
				// console.log((itemInInventory.itemNo == itemInItems.num) ,(itemInInventory.itemBarcode == itemInItems.barcode), (itemInInventory.cartonBarcode == itemInItems.cartonBarcode) , (itemInInventory.cartonBarcode == null && itemInItems.cartonBarcode == null));
				exists = true;
			}
		}
		if (exists) {
			document.getElementById('exists-inventory').innerText = "This item already exists in the inventory. Please only update the quantities.";
		} else {
			document.getElementById('exists-inventory').innerText = "This item is not in the inventory";
		}
		return exists;
	}*/

	async function checkExistsInInventory(barcode, sku, customSku) {
		var exists = false;

		try {

			let formData = new FormData();
			formData.append('barcode', barcode);
			formData.append('sku', sku);
			formData.append('customSku', customSku);

			let response = await fetch(apiServer+'inventory/check', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData})

			let data = await response.json();

			if (response.ok) {
				if (data.result == 'success') {
					exists = data.exist == 'true' ? true : false;
				}
				else {
					page.notification.show(data.result);
				}
			}
			else {
				page.notification.show('Error: '+data.result);
			}

			

		} catch(e) {
			page.notification.show('Error: Could not connect to the server.');
			console.log(e);
		}

		if (exists) {
			document.getElementById('exists-inventory').innerText = "This item already exists in the inventory. Please only update the quantities.";
		} else {
			document.getElementById('exists-inventory').innerText = "This item is not in the inventory";
		}
		
		return exists;
	}

	async function resetScan(recordData) {
		
		try {

			let formData = new FormData();
			formData.append('orderID', recordData.recordNum);

			let response = await fetch(apiServer+'resetScanned', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData})

			let data = await response.json();

			if (response.ok) {
				if (data.result == 'success') {
					if (saleRecords[recordData.store] && saleRecords[recordData.store].today[recordData.recordNum]) {
						saleRecords[recordData.store].today[recordData.recordNum].scanned = null;
					}
					page.notification.show('Scanned Qty reseted.');

					document.querySelector('#record-list ul .selected').click();
				}
				else {
					page.notification.show(data.result);
				}
			}
			else {
				page.notification.show('Error: '+data.result);
			}

		} catch(e) {
			page.notification.show('Error: Could not connect to the server.');
			console.log(e);
		}

	}


	// Close popup box
	document.querySelector('#box-container .close').addEventListener('click', closeBox);

	// Don't close the popup box when it's clicked
	addListener('#box-container > div', 'click mousedown', function(e) {
		e.stopPropagation();
	});

	// Close box and its contents when clicking on the background
	/*document.getElementById('box-outer').addEventListener('mousedown', function(e) {
		closeBox();
	});*/

	addListener('#record-entries', 'click', async function(e) {
		var target = e.target;
		if (target.classList.contains('item-mark-flatpack')) {
			var item = target.parentNode.parentNode;
			var itemNo = item.dataset.itemNum;
			var sku = item.dataset.sku;
			var itemID = item.dataset.id;
			var value = item.dataset.fp == 1 ? 0 : 1;
			
			try {
				let formData = new FormData();
				formData.append('itemID', itemID);
				formData.append('type', 'flatpack');
				formData.append('value', value);
				let response = await fetch(apiServer+'markflatpackvr', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					item.dataset.fp = value;
					item.querySelector('#markfp').textContent = value==0 ? 'Flatpack' : 'UnFlatpack';
					page.notification.show('Item has been '+ (value==1 ? 'marked as' : 'unmarked') +' flatpack.', {background: 'bg-lgreen'});
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

			
			
		}

		if (target.classList.contains('item-mark-fastwayflatpack')) {
			var item = target.parentNode.parentNode;
			var itemNo = item.dataset.itemNum;
			var sku = item.dataset.sku;
			var itemID = item.dataset.id;
			var value = item.dataset.fwfp == 1 ? 0 : 1;
			
			try {
				let formData = new FormData();
				formData.append('itemID', itemID);
				formData.append('type', 'fastwayflatpack');
				formData.append('value', value);
				let response = await fetch(apiServer+'markflatpackvr', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					item.dataset.fwfp = value;
					item.querySelector('#markfwfp').textContent = value==0 ? 'FWFP' : 'UnFWFP';
					page.notification.show('Item has been '+ (value==1 ? 'marked as' : 'unmarked') +' fastway flatpack.', {background: 'bg-lgreen'});
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

			
		}

		if (target.classList.contains('item-mark-vr')) {
			var item = target.parentNode.parentNode;
			var itemID = item.dataset.id;
			var value = item.dataset.vr == 1 ? 0 : 1;
			
			try {
				let formData = new FormData();
				formData.append('itemID', itemID);
				formData.append('type', 'vr');
				formData.append('value', value);
				let response = await fetch(apiServer+'markflatpackvr', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					
					item.dataset.vr = value;
				    item.querySelector('#markvr').textContent = value==0 ? 'VR' : 'UnVR';
					page.notification.show('Item has been '+ (value==1 ? 'marked as' : 'unmarked') +' VR.', {background: 'bg-lgreen'});
					
					
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

		}

		if (target.classList.contains('item-mark-factory')) {
			var item = target.parentNode.parentNode;
			var itemID = item.dataset.id;
			var value = item.dataset.factory == 1 ? 0 : 1;
			
			try {
				let formData = new FormData();
				formData.append('itemID', itemID);
				formData.append('type', 'factory');
				formData.append('value', value);
				let response = await fetch(apiServer+'markflatpackvr', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					
					item.dataset.factory = value;
				    item.querySelector('#markfactory').textContent = value==0 ? 'Factory' : 'UnFactory';
					page.notification.show('Item has been '+ (value==1 ? 'marked as' : 'unmarked') +' Factory.', {background: 'bg-lgreen'});
					
					
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

		}

		if (target.classList.contains('item-mark-costco')) {
			var item = target.parentNode.parentNode;
			var itemID = item.dataset.id;
			var value = item.dataset.costco == 1 ? 0 : 1;
			
			try {
				let formData = new FormData();
				formData.append('itemID', itemID);
				formData.append('type', 'costco');
				formData.append('value', value);
				let response = await fetch(apiServer+'markflatpackvr', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					item.dataset.costco = value;
				    item.querySelector('#markcostco').textContent = value==0 ? 'Costco' : 'UnCostco';
					page.notification.show('Item has been '+ (value==1 ? 'marked as' : 'unmarked') +' Costco.', {background: 'bg-lgreen'});
					
					
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

		}

		if (target.classList.contains('item-download')) {
			var item = target.parentNode.parentNode;
			var itemNo = item.dataset.itemNum;
			var store = item.dataset.store;
			if (store==81 || store==82) store = 71;
			var sku = item.dataset.sku;

			
			try {
				let formData = new FormData();
				formData.append('itemNo', itemNo);
				formData.append('store', store);
				formData.append('sku', sku);
				let response = await fetch(apiServer+'itemdownload', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
					page.notification.show(data.result, {background: 'bg-lgreen'});
				}

				if (data.result == 'success') {
					let items2 = data.items;
					for (let item2 of items2) {
						let itemSku = item2.sku;
						let itemNum = item2.num;

						if (itemNum && itemDetails[itemNum]) {
							let findNum = false;
							for (let itemDetail of itemDetails[itemNum]) {
								if (itemDetail.id==item2.id) {
									itemDetail.imageUrl = item2.imageUrl;
									itemDetail.singleItemBarcode = item2.singleItemBarcode;
									findNum = true;
									break;
								}
							}
							if (!findNum) {
								itemDetails[itemNum].push(item2);
							}
						} else {
							if (itemNum) {
								itemDetails[itemNum] = [];
								itemDetails[itemNum].push(item2)
							}
						}

						if (itemSku && itemDetails[itemSku]) {
							let findSku = false;
							for (let itemDetail of itemDetails[itemSku]) {
								if (itemDetail.id==item2.id) {
									itemDetail.imageUrl = item2.imageUrl;
									itemDetail.singleItemBarcode = item2.singleItemBarcode;
									findSku = true;
									break;
								}
							}
							if (!findSku) {
								itemDetails[itemNum].push(item2);
							}
						} else {
							if (itemSku) {
								itemDetails[itemSku] = [];
								itemDetails[itemSku].push(item2)
							}
						}
					}
					page.notification.show('Item has been downloaded.', {background: 'bg-lgreen'});
					document.querySelector('#record-list ul .selected').click();	
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

		}

		if (target.classList.contains('item-mark-add')) {
			var item = target.parentNode.parentNode;
			var store = item.dataset.store;
			var dbID = item.parentNode.parentNode.parentNode.dataset.recordNum;
			//showAddToOriginItemBox(e,dbID,store,'add');
			showAddItemBox(store,dbID);
		}

		if (target.classList.contains('item-mark-modify')) {
			var item = target.parentNode.parentNode;
			var store = item.dataset.store;
			var dbID = item.parentNode.parentNode.parentNode.dataset.recordNum;
			//showAddToOriginItemBox(e,dbID,store,'modify');
			showAlternativeItemBox(e, dbID, store, "modify");

			let itemTableBody = $('#item-addtoorigin-box #item-table-body');
			let inputCheckBox = itemTableBody.find('input[type="checkbox"]');
			
			inputCheckBox.on('change', function() {
				  //console.log(this.checked)
				  if(this.checked) {
					  inputCheckBox.prop('checked', false);
					  $(this).prop('checked', true);
				  }
			})
		}

		if (target.classList.contains('item-edit')) {
			var item = target.parentNode.parentNode;
			var store = item.dataset.store;
			var dbID = item.parentNode.parentNode.parentNode.dataset.recordNum;
			
			showEditItemBox(e, dbID, store);

		}

		
		if (target.classList.contains('item-mark-partialrefund')) {
		
			var e = target.closest('#record-entries .record-entry');

			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let sku = target.parentNode.parentNode.dataset.sku;
			let partialrefund = target.parentNode.parentNode.dataset.partialrefund;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;
			let lineItemID = target.parentNode.parentNode.dataset.lineitemid;
			
			let partialrefundStatus = 0;
			if (partialrefund == 0)  partialrefundStatus = 1;
			
			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('store', storeNo);
				formData.append('sku', sku);
				formData.append('partialrefund', partialrefundStatus);
				formData.append('status', status);
				formData.append('lineItemID', lineItemID);
				// consoloe.log(partialrefundStatus);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (partialrefundStatus == 0) {
						target.textContent = 'Partial refund';
						page.notification.show('Order has been unmarked partial refund.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('partialrefund');
						saleRecords[storeNo].today[orderNo].PartialRefund = 0;
						target.parentNode.parentNode.dataset.partialrefund = 0;
						target.parentNode.parentNode.classList.remove('bg-tan');
						
					}
					else{
						target.textContent = 'UnPartial refund';
						page.notification.show('Order has been marked as partial refund.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('partialrefund');
						// page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'partialrefund'});
						saleRecords[storeNo].today[orderNo].PartialRefund = 1;
						target.parentNode.parentNode.dataset.partialrefund = 1;
						target.parentNode.parentNode.classList.add('bg-tan');
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

		}

		if (target.classList.contains('item-delete')) {

			var e = target.closest('#record-entries .record-entry');

			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let sku = target.parentNode.parentNode.dataset.sku;

			let deleteItemConfirm = confirm("Please confirm to delete item " + sku + ".");

			if (deleteItemConfirm == false) return;

			let lineItemID = target.parentNode.parentNode.dataset.lineitemid;
			
			
			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('store', storeNo);
				formData.append('sku', sku);
				formData.append('lineItemID', lineItemID);

				let response = await fetch(apiServer+'order/itemdelete', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					let recordData = saleRecords[storeNo].records[orderNo];
					let items = recordData.Items;
					for (let i=0; i< items.length; i++) {
						let item = items[i];
						if (item.LineItemID==lineItemID && item.SKU==sku) {
							items.splice(i,1);
							break;
						}
					}
					document.querySelector('#record-list ul .selected').click();
					page.notification.show('Item has been deleted.', {background: 'bg-lgreen'});
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

		}

		if (target.classList.contains('location-selected') || target.closest('.location-selected')) {
			var e = target.closest('#record-entries .record-entry');
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let itemTr = target.closest('.location-selected').closest('tr');
			/*let customSku = itemTr.dataset.customSku;
			let lineitemid = itemTr.dataset.lineitemid;
			let quantity = itemTr.dataset.itemQuantity;
			let singleItemMultiple = itemTr.dataset.singleItemMultiple;
			let cartonMultiple = itemTr.dataset.cartonMultiple;*/
			showLocationSelectBox(storeNo,orderNo,itemTr);
		}

		// if (target.classList.contains('item-mark-fgb')) {
		// 	var item = target.parentNode.parentNode;
		// 	var itemID = item.dataset.id;
		// 	var value = item.dataset.fgb == 1 ? 0 : 1;

		// 	try {
		// 		let formData = new FormData();
		// 		formData.append('itemID', itemID);
		// 		formData.append('type', 'fgb');
		// 		formData.append('value', value);

		// 		let response = await fetch(apiServer+'markflatpackvr', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		// 		let data = await response.json();
		// 		if (!response.ok) {
		// 			console.log('Error: '+data.result);
		// 		}
		// 		if (data.result == 'success') {
		// 			item.dataset.fgb = value;
		// 		    item.querySelector('#markfgb').textContent = value==0 ? 'FGB' : 'UnFGB';
		// 			page.notification.show('Item has been '+ (value==1 ? 'marked as' : 'unmarked') +' FGB.', {background: 'bg-lgreen'});
		// 		}
		// 		else {
		// 			console.log(data.result);
		// 		}
		// 	}
		// 	catch (e) {
		// 		console.log('Error: Could not connect to the server.');
		// 	}

		// }


		// if (target.classList.contains('item-mark-morlife')) {
		// 	var item = target.parentNode.parentNode;
		// 	var itemID = item.dataset.id;
		// 	var value = item.dataset.morlife == 1 ? 0 : 1;

		// 	try {
		// 		let formData = new FormData();
		// 		formData.append('itemID', itemID);
		// 		formData.append('type', 'morlife');
		// 		formData.append('value', value);
				
		// 		let response = await fetch(apiServer+'markflatpackvr', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		// 		let data = await response.json();
		// 		if (!response.ok) {
		// 			console.log('Error: '+data.result);
		// 		}
		// 		if (data.result == 'success') {
		// 			item.dataset.morlife = value;
		// 		    item.querySelector('#markmorlife').textContent = value==0 ? 'MORLIFE' : 'UnMORLIFE';
		// 			page.notification.show('Item has been '+ (value==1 ? 'marked as' : 'unmarked') +' MORLIFE.', {background: 'bg-lgreen'});
		// 		}
		// 		else {
		// 			console.log(data.result);
		// 		}
		// 	}
		// 	catch (e) {
		// 		console.log('Error: Could not connect to the server.');
		// 	}

		// }

		if (target.classList.contains('set-bay')) {
			var elm = target.parentNode.querySelector('#bay'); 
			//console.log(elm.value); 
			var item = target.parentNode.parentNode;
			var itemID = item.dataset.id;
			//console.log(itemNo); 

			try {
				let formData = new FormData();
				formData.append('itemID', itemID);
				formData.append('bay', elm.value);
				let response = await fetch(apiServer+'setbay', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					page.notification.show('Bay number has been set.', {background: 'bg-lgreen'});
					let items = itemDetails[item.dataset.itemNum || item.dataset.sku];
					for (let ite of items) {
						if (ite.id == item.dataset.id) {
							ite.bay = elm.value;
						}
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log(e);
			}
		}

		if (target.classList.contains('set-sat')) {
			var elm = target.parentNode.querySelector('#sat'); 
			//console.log(elm.value); 
			var item = target.parentNode.parentNode;
			var itemID = item.dataset.id;
			//console.log(itemID); 

			try {
				let formData = new FormData();
				formData.append('itemID', itemID);
				formData.append('sat', elm.value);
				let response = await fetch(apiServer+'setsat', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					page.notification.show('Satchel type has been set.', {background: 'bg-lgreen'});

					let items = itemDetails[item.dataset.itemNum || item.dataset.sku];
					for (let ite of items) {
						if (ite.id == item.dataset.id) {
							ite.satchel = elm.value;
						}
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log(e);
			}
		}

		if (target.classList.contains('set-fwfp')) {
			var elm = target.parentNode.querySelector('#fwfp'); 
			//console.log(elm.value); 
			var item = target.parentNode.parentNode;
			var itemID = item.dataset.id;
			//console.log(itemID); 

			try {
				let formData = new FormData();
				formData.append('itemID', itemID);
				formData.append('fwfp', elm.value);
				let response = await fetch(apiServer+'setfwfp', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					page.notification.show('FWFP type has been set.', {background: 'bg-lgreen'});

					let items = itemDetails[item.dataset.itemNum || item.dataset.sku];
					for (let ite of items) {
						if (ite.id == item.dataset.id) {
							ite.fwfp = elm.value;
						}
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log(e);
			}
		}

		if (target.classList.contains('item-mark-dailyorder')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
				
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let dailyorder = saleRecords[storeNo].today[orderNo].DailyOrder;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;
			let dailyorderStatus = 0;
			if (dailyorder == 0)  dailyorderStatus = 1;
			
			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('dailyorder', dailyorderStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (dailyorderStatus == 0) {
						target.textContent = 'Daily Order';
						page.notification.show('Order has been unmarked daily order.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('dailyorder');
						saleRecords[storeNo].today[orderNo].DailyOrder = 0;
						
					}
					else{
						target.textContent = 'UnDO';
						page.notification.show('Order has been marked as daily order.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('dailyorder');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'dailyorder'});
						saleRecords[storeNo].today[orderNo].DailyOrder = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

				
			
			
		}

		if (target.classList.contains('item-mark-lpgout')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
				
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let lpg = saleRecords[storeNo].today[orderNo].LPG;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;
			let lpgorderStatus = 0;
			if (lpg == 0)  lpgorderStatus = 1;
			
			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('lpg', lpgorderStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (lpgorderStatus == 0) {
						target.textContent = 'LPG Order';
						page.notification.show('Order has been unmarked LPG order.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('lpg');
						saleRecords[storeNo].today[orderNo].LPG = 0;
						
					}
					else{
						target.textContent = 'UnLPG';
						page.notification.show('Order has been marked as LPG order.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('lpg');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'lpg'});
						saleRecords[storeNo].today[orderNo].LPG = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

			
			
		}

		if (target.classList.contains('item-mark-morlifeout')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let morlife = saleRecords[storeNo].today[orderNo].MORLIFE;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;

			let morStatus = 0;
			if (morlife == 0)  morStatus = 1;
			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('morlife', morStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (morStatus == 0) {
						target.textContent = 'MORLIFE Order';
						page.notification.show('Order has been unmarked morlife order.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('morlife');
						saleRecords[storeNo].today[orderNo].MORLIFE = 0;
						
					}
					else{
						target.textContent = 'UnMORLIFE Order';
						page.notification.show('Order has been marked as morlife order.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('morlife');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'morlife'});
						saleRecords[storeNo].today[orderNo].MORLIFE = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

			
			
			
		}

		if (target.classList.contains('item-mark-spwarehouse')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let spwarehouse = saleRecords[storeNo].today[orderNo].SPWAREHOUSE;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;

			let spwarehouseStatus = 0;

			if (spwarehouse == 0)  spwarehouseStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('spwarehouse', spwarehouseStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (spwarehouseStatus == 0) {
						target.textContent = 'SP WAREHOUSE';
						page.notification.show('Order has been unmarked spwarehouse.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('spwarehouse');
						saleRecords[storeNo].today[orderNo].SPWAREHOUSE = 0;
						
					}
					else{
						target.textContent = 'UnSPWarehouse';
						page.notification.show('Order has been marked as spwarehouse.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('spwarehouse');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'spwarehouse'});
						saleRecords[storeNo].today[orderNo].SPWAREHOUSE = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

			
			
		}


		

			
		if (target.classList.contains('item-mark-orbit')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let orbit = saleRecords[storeNo].today[orderNo].Orbit;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;

			let orbitStatus = 0;

			if (orbit == 0)  orbitStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('orbit', orbitStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (orbitStatus == 0) {
						target.textContent = 'ORBIT';
						page.notification.show('Order has been unmarked orbit.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('orbit');
						saleRecords[storeNo].today[orderNo].Orbit = 0;
						
					}
					else{
						target.textContent = 'UnORBIT';
						page.notification.show('Order has been marked as orbit.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('orbit');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'orbit'});
						saleRecords[storeNo].today[orderNo].Orbit = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

			
		}

		if (target.classList.contains('item-mark-wv')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let wv = saleRecords[storeNo].today[orderNo].WV;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;

			let wvStatus = 0;

			if (wv == 0)  wvStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('wv', wvStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (wvStatus == 0) {
						target.textContent = 'WV';
						page.notification.show('Order has been unmarked wv.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('wv');
						saleRecords[storeNo].today[orderNo].WV = 0;
						
					}
					else{
						target.textContent = 'UnWV';
						page.notification.show('Order has been marked as wv.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('wv');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'wv'});
						saleRecords[storeNo].today[orderNo].WV = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}
			
		}

		if (target.classList.contains('item-mark-me')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let me = saleRecords[storeNo].today[orderNo].ME;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;

			let meStatus = 0;

			if (me == 0)  meStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('me', meStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (meStatus == 0) {
						target.textContent = 'ME';
						page.notification.show('Order has been unmarked me.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('me');
						saleRecords[storeNo].today[orderNo].ME = 0;
						
					}
					else{
						target.textContent = 'UnME';
						page.notification.show('Order has been marked as me.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('me');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'me'});
						saleRecords[storeNo].today[orderNo].ME = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}
			
		}

		if (target.classList.contains('item-mark-scho')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let scholastic = saleRecords[storeNo].today[orderNo].SCHOLASTIC;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;

			let schoStatus = 0;

			if (scholastic == 0)  schoStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('scholastic', schoStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (schoStatus == 0) {
						target.textContent = 'SCHOLASTIC';
						page.notification.show('Order has been unmarked scholastic.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('scholastic');
						saleRecords[storeNo].today[orderNo].SCHOLASTIC = 0;
						
					}
					else{
						target.textContent = 'UnSCHOLASTIC';
						page.notification.show('Order has been marked as scholastic.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('scholastic');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'scholastic'});
						saleRecords[storeNo].today[orderNo].SCHOLASTIC = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

			
		}
		

		if (target.classList.contains('item-mark-kor')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let korimco = saleRecords[storeNo].today[orderNo].KORIMCO;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;

			let korStatus = 0;

			if (korimco == 0)  korStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('korimco', korStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (korStatus == 0) {
						target.textContent = 'KORIMCO';
						page.notification.show('Order has been unmarked korimco.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('korimco');
						saleRecords[storeNo].today[orderNo].KORIMCO = 0;
						
					}
					else{
						target.textContent = 'UnKORIMCO';
						page.notification.show('Order has been marked as korimco.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('korimco');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'korimco'});
						saleRecords[storeNo].today[orderNo].KORIMCO = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

			
		}

		if (target.classList.contains('item-mark-hyc')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let hyclor = saleRecords[storeNo].today[orderNo].HYCLOR;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;

			let hycStatus = 0;

			if (hyclor == 0)  hycStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('hyclor', hycStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (hycStatus == 0) {
						target.textContent = 'HY-CLOR';
						page.notification.show('Order has been unmarked hy-clor.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('hyclor');
						saleRecords[storeNo].today[orderNo].HYCLOR = 0;
						
					}
					else{
						target.textContent = 'UnHY-CLOR';
						page.notification.show('Order has been marked as hy-clor.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('hyclor');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'hyclor'});
						saleRecords[storeNo].today[orderNo].HYCLOR = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}
			
		}

		if (target.classList.contains('item-mark-splo')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let splosh = saleRecords[storeNo].today[orderNo].SPLOSH;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;


			let sploStatus = 0;

			if (splosh == 0)  sploStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('splosh', sploStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (sploStatus == 0) {
						target.textContent = 'SPLOSH';
						page.notification.show('Order has been unmarked splosh.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('splosh');
						saleRecords[storeNo].today[orderNo].SPLOSH = 0;
						
					}
					else{
						target.textContent = 'UnSPLOSH';
						page.notification.show('Order has been marked as splosh.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('splosh');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'splosh'});
						saleRecords[storeNo].today[orderNo].SPLOSH = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}
			
		}

		if (target.classList.contains('item-mark-sig')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let sigma = saleRecords[storeNo].today[orderNo].SIGMA;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;


			let sigStatus = 0;

			if (sigma == 0)  sigStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('sigma', sigStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (sigStatus == 0) {
						target.textContent = 'SIGMA';
						page.notification.show('Order has been unmarked sigma.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('sigma');
						saleRecords[storeNo].today[orderNo].SIGMA = 0;
						
					}
					else{
						target.textContent = 'UnSIGMA';
						page.notification.show('Order has been marked as sigma.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('sigma');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'sigma'});
						saleRecords[storeNo].today[orderNo].SIGMA = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}
			
		}

		if (target.classList.contains('item-mark-misc')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let misc = saleRecords[storeNo].today[orderNo].MISC;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;

			let miscStatus = 0;

			if (misc == 0)  miscStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('misc', miscStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (miscStatus == 0) {
						target.textContent = 'MISC';
						page.notification.show('Order has been unmarked misc.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('misc');
						saleRecords[storeNo].today[orderNo].MISC = 0;
						
					}
					else{
						target.textContent = 'UnMISC';
						page.notification.show('Order has been marked as misc.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('misc');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'misc'});
						saleRecords[storeNo].today[orderNo].MISC = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}
			
		}

		if (target.classList.contains('item-mark-jv')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let jv = saleRecords[storeNo].today[orderNo].JV;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;

			let jvStatus = 0;


			if (jv == 0)  jvStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('jv', jvStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (jvStatus == 0) {
						target.textContent = 'JV';
						page.notification.show('Order has been unmarked jv.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('jv');
						saleRecords[storeNo].today[orderNo].JV = 0;
						
					}
					else{
						target.textContent = 'UnJV';
						page.notification.show('Order has been marked as jv.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('jv');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'jv'});
						saleRecords[storeNo].today[orderNo].JV = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

			
		}

		if (target.classList.contains('item-mark-fac')) {
			//var orderNo = target.parentNode.parentNode.dataset.recordNum;
			//var es = document.querySelectorAll('#record-entries .record-entry');
			var e = target.closest('#record-entries .record-entry');
			//console.log("Number of Elements: " + es.length);
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let factory = saleRecords[storeNo].today[orderNo].FACTORY;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;

			let facStatus = 0;

			if (factory == 0)  facStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('factory', facStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (facStatus == 0) {
						target.textContent = 'FACTORY';
						page.notification.show('Order has been unmarked factory.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('factory');
						saleRecords[storeNo].today[orderNo].FACTORY = 0;
						
					}
					else{
						target.textContent = 'UnFACTORY';
						page.notification.show('Order has been marked as factory.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('factory');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'factory'});
						saleRecords[storeNo].today[orderNo].FACTORY = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}

			
		}

		// if (target.classList.contains('item-mark-six')) {
		// 	//var orderNo = target.parentNode.parentNode.dataset.recordNum;
		// 	//var es = document.querySelectorAll('#record-entries .record-entry');
		// 	var e = target.closest('#record-entries .record-entry');
		// 	//console.log("Number of Elements: " + es.length);
			
		// 	let orderNo = e.dataset.recordNum;
		// 	let storeNo = e.dataset.store;
		// 	let sixpack = saleRecords[storeNo].today[orderNo].SIXPACK;
		// 	let status = saleRecords[storeNo].today[orderNo].OrderStatus;


		// 	let sixpStatus = 0;

		// 	if (sixpack == 0)  sixpStatus = 1;

		// 	try {
		// 		let formData = new FormData();
		// 		formData.append('record', orderNo);
		// 		formData.append('sixpack', sixpStatus);
		// 		formData.append('status', status);

		// 		let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		// 		let data = await response.json();

		// 		if (!response.ok) {
		// 			console.log('Error: '+data.result);
		// 		}

		// 		if (data.result == 'success') {
		// 			if (sixpStatus == 0) {
		// 				target.textContent = '6 Pack';
		// 				page.notification.show('Order has been unmarked sixpack.', {background: 'bg-lgreen'});
		// 				let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
		// 				recordListItem.classList.remove('sixpack');
		// 				saleRecords[storeNo].today[orderNo].SIXPACK = 0;
						
		// 			}
		// 			else{
		// 				target.textContent = 'Un6 Pack';
		// 				page.notification.show('Order has been marked as sixpack.', {background: 'bg-lgreen'});
		// 				let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
		// 				recordListItem.classList.add('sixpack');
		// 				page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'sixpack'});
		// 				saleRecords[storeNo].today[orderNo].SIXPACK = 1;
		// 			}
		// 		}
		// 		else {
		// 			console.log(data.result);
		// 		}
		// 	}
		// 	catch (e) {
		// 		console.log('Error: Could not connect to the server.');
		// 	}	
		// }

		// if (target.classList.contains('item-mark-ten')) {
		// 	//var orderNo = target.parentNode.parentNode.dataset.recordNum;
		// 	//var es = document.querySelectorAll('#record-entries .record-entry');
		// 	var e = target.closest('#record-entries .record-entry');
		// 	//console.log("Number of Elements: " + es.length);
			
		// 	let orderNo = e.dataset.recordNum;
		// 	let storeNo = e.dataset.store;
		// 	let tenpack = saleRecords[storeNo].today[orderNo].TENPACK;
		// 	let status = saleRecords[storeNo].today[orderNo].OrderStatus;

		// 	let tenpStatus = 0;

		// 	if (tenpack == 0)  tenpStatus = 1;

		// 	try {
		// 		let formData = new FormData();
		// 		formData.append('record', orderNo);
		// 		formData.append('tenpack', tenpStatus);
		// 		formData.append('status', status);

		// 		let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		// 		let data = await response.json();

		// 		if (!response.ok) {
		// 			console.log('Error: '+data.result);
		// 		}

		// 		if (data.result == 'success') {
		// 			if (tenpStatus == 0) {
		// 				target.textContent = '12 Pack';
		// 				page.notification.show('Order has been unmarked tenpack.', {background: 'bg-lgreen'});
		// 				let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
		// 				recordListItem.classList.remove('tenpack');
		// 				saleRecords[storeNo].today[orderNo].TENPACK = 0;
						
		// 			}
		// 			else{
		// 				target.textContent = 'Un12 Pack';
		// 				page.notification.show('Order has been marked as tenpack.', {background: 'bg-lgreen'});
		// 				let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
		// 				recordListItem.classList.add('tenpack');
		// 				page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'tenpack'});
		// 				saleRecords[storeNo].today[orderNo].TENPACK = 1;
		// 			}
		// 		}
		// 		else {
		// 			console.log(data.result);
		// 		}
		// 	}
		// 	catch (e) {
		// 		console.log('Error: Could not connect to the server.');
		// 	}	
		// }

		// if (target.classList.contains('item-mark-twenty')) {
		// 	//var orderNo = target.parentNode.parentNode.dataset.recordNum;
		// 	//var es = document.querySelectorAll('#record-entries .record-entry');
		// 	var e = target.closest('#record-entries .record-entry');
		// 	//console.log("Number of Elements: " + es.length);
			
		// 	let orderNo = e.dataset.recordNum;
		// 	let storeNo = e.dataset.store;
		// 	let twentypack = saleRecords[storeNo].today[orderNo].TWENTYPACK;
		// 	let status = saleRecords[storeNo].today[orderNo].OrderStatus;
		// 	let twentypStatus = 0;

		// 	if (twentypack == 0)  twentypStatus = 1;

		// 	try {
		// 		let formData = new FormData();
		// 		formData.append('record', orderNo);
		// 		formData.append('twentypack', twentypStatus);
		// 		formData.append('status', status);

		// 		let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		// 		let data = await response.json();

		// 		if (!response.ok) {
		// 			console.log('Error: '+data.result);
		// 		}

		// 		if (data.result == 'success') {
		// 			if (twentypStatus == 0) {
		// 				target.textContent = '24 Pack';
		// 				page.notification.show('Order has been unmarked twentypack.', {background: 'bg-lgreen'});
		// 				let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
		// 				recordListItem.classList.remove('twentypack');
		// 				saleRecords[storeNo].today[orderNo].TWENTYPACK = 0;
						
		// 			}
		// 			else{
		// 				target.textContent = 'Un24 Pack';
		// 				page.notification.show('Order has been marked as twentypack.', {background: 'bg-lgreen'});
		// 				let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
		// 				recordListItem.classList.add('twentypack');
		// 				page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'twentypack'});
		// 				saleRecords[storeNo].today[orderNo].TWENTYPACK = 1;
		// 			}
		// 		}
		// 		else {
		// 			console.log(data.result);
		// 		}
		// 	}
		// 	catch (e) {
		// 		console.log('Error: Could not connect to the server.');
		// 	}	
		// }

		// if (target.classList.contains('item-mark-thirty')) {
		// 	//var orderNo = target.parentNode.parentNode.dataset.recordNum;
		// 	//var es = document.querySelectorAll('#record-entries .record-entry');
		// 	var e = target.closest('#record-entries .record-entry');
		// 	//console.log("Number of Elements: " + es.length);
			
		// 	let orderNo = e.dataset.recordNum;
		// 	let storeNo = e.dataset.store;
		// 	let thirtypack = saleRecords[storeNo].today[orderNo].THIRTYPACK;
		// 	let status = saleRecords[storeNo].today[orderNo].OrderStatus;

		// 	let thirtypStatus = 0;

		// 	if (thirtypack == 0)  thirtypStatus = 1;

		// 	try {
		// 		let formData = new FormData();
		// 		formData.append('record', orderNo);
		// 		formData.append('thirtypack', thirtypStatus);
		// 		formData.append('status', status);

		// 		let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		// 		let data = await response.json();

		// 		if (!response.ok) {
		// 			console.log('Error: '+data.result);
		// 		}

		// 		if (data.result == 'success') {
		// 			if (thirtypStatus == 0) {
		// 				target.textContent = '30 Pack';
		// 				page.notification.show('Order has been unmarked thirtypack.', {background: 'bg-lgreen'});
		// 				let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
		// 				recordListItem.classList.remove('thirtypack');
		// 				saleRecords[storeNo].today[orderNo].THIRTYPACK = 0;
						
		// 			}
		// 			else{
		// 				target.textContent = 'Un30 Pack';
		// 				page.notification.show('Order has been marked as thirtypack.', {background: 'bg-lgreen'});
		// 				let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
		// 				recordListItem.classList.add('thirtypack');
		// 				page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'thirtypack'});
		// 				saleRecords[storeNo].today[orderNo].THIRTYPACK = 1;
		// 			}
		// 		}
		// 		else {
		// 			console.log(data.result);
		// 		}
		// 	}
		// 	catch (e) {
		// 		console.log('Error: Could not connect to the server.');
		// 	}	
		// }

		// if (target.classList.contains('item-mark-sixty')) {
		// 	//var orderNo = target.parentNode.parentNode.dataset.recordNum;
		// 	//var es = document.querySelectorAll('#record-entries .record-entry');
		// 	var e = target.closest('#record-entries .record-entry');
		// 	//console.log("Number of Elements: " + es.length);
			
		// 	let orderNo = e.dataset.recordNum;
		// 	let storeNo = e.dataset.store;
		// 	let sixtypack = saleRecords[storeNo].today[orderNo].SIXTYPACK;
		// 	let status = saleRecords[storeNo].today[orderNo].OrderStatus;

		// 	let sixtypStatus = 0;

		// 	if (sixtypack == 0)  sixtypStatus = 1;

		// 	try {
		// 		let formData = new FormData();
		// 		formData.append('record', orderNo);
		// 		formData.append('sixtypack', sixtypStatus);
		// 		formData.append('status', status);

		// 		let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		// 		let data = await response.json();

		// 		if (!response.ok) {
		// 			console.log('Error: '+data.result);
		// 		}

		// 		if (data.result == 'success') {
		// 			if (sixtypStatus == 0) {
		// 				target.textContent = '60 Pack';
		// 				page.notification.show('Order has been unmarked sixtypack.', {background: 'bg-lgreen'});
		// 				let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
		// 				recordListItem.classList.remove('sixtypack');
		// 				saleRecords[storeNo].today[orderNo].SIXTYPACK = 0;
						
		// 			}
		// 			else{
		// 				target.textContent = 'Un60 Pack';
		// 				page.notification.show('Order has been marked as sixtypack.', {background: 'bg-lgreen'});
		// 				let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
		// 				recordListItem.classList.add('sixtypack');
		// 				page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'sixtypack'});
		// 				saleRecords[storeNo].today[orderNo].SIXTYPACK = 1;
		// 			}
		// 		}
		// 		else {
		// 			console.log(data.result);
		// 		}
		// 	}
		// 	catch (e) {
		// 		console.log('Error: Could not connect to the server.');
		// 	}	
		// }

		// if (target.classList.contains('item-mark-gucci')) {
		// 	//var orderNo = target.parentNode.parentNode.dataset.recordNum;
		// 	//var es = document.querySelectorAll('#record-entries .record-entry');
		// 	var e = target.closest('#record-entries .record-entry');
		// 	//console.log("Number of Elements: " + es.length);
			
		// 	let orderNo = e.dataset.recordNum;
		// 	let storeNo = e.dataset.store;
		// 	let gucci = saleRecords[storeNo].today[orderNo].GUCCI;
		// 	let status = saleRecords[storeNo].today[orderNo].OrderStatus;
		// 	let gucciStatus = 0;

		// 	if (gucci == 0)  gucciStatus = 1;

		// 	try {
		// 		let formData = new FormData();
		// 		formData.append('record', orderNo);
		// 		formData.append('gucci', gucciStatus);
		// 		formData.append('status', status);

		// 		let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		// 		let data = await response.json();

		// 		if (!response.ok) {
		// 			console.log('Error: '+data.result);
		// 		}

		// 		if (data.result == 'success') {
		// 			if (gucciStatus == 0) {
		// 				target.textContent = 'GUCCI';
		// 				page.notification.show('Order has been unmarked gucci.', {background: 'bg-lgreen'});
		// 				let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
		// 				recordListItem.classList.remove('gucci');
		// 				saleRecords[storeNo].today[orderNo].GUCCI = 0;
						
		// 			}
		// 			else{
		// 				target.textContent = 'UnGUCCI';
		// 				page.notification.show('Order has been marked as gucci.', {background: 'bg-lgreen'});
		// 				let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
		// 				recordListItem.classList.add('gucci');
		// 				page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'gucci'});
		// 				saleRecords[storeNo].today[orderNo].GUCCI = 1;
		// 			}
		// 		}
		// 		else {
		// 			console.log(data.result);
		// 		}
		// 	}
		// 	catch (e) {
		// 		console.log('Error: Could not connect to the server.');
		// 	}	
		// }

		if (target.classList.contains('item-mark-kob')) {
			var e = target.closest('#record-entries .record-entry');
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let kob = saleRecords[storeNo].today[orderNo].KOBAYASHI;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;
			let kobStatus = 0;

			if (kob == 0)  kobStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('kobayashi', kobStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (kobStatus == 0) {
						target.textContent = 'Kobayashi';
						page.notification.show('Order has been unmarked kobayashi.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('kob');
						saleRecords[storeNo].today[orderNo].KOBAYASHI = 0;
						
					}
					else{
						target.textContent = 'UnKobayashi';
						page.notification.show('Order has been marked as kobayashi.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('kob');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'kob'});
						saleRecords[storeNo].today[orderNo].KOBAYASHI = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}	
		}

		if (target.classList.contains('item-mark-tprolls')) {
			var e = target.closest('#record-entries .record-entry');
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let tprolls = saleRecords[storeNo].today[orderNo].TPROLLS;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;
			let tprStatus = 0;

			if (tprolls == 0)  tprStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('tprolls', tprStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (tprStatus == 0) {
						target.textContent = 'TP Rolls';
						page.notification.show('Order has been unmarked tprolls.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('tprolls');
						saleRecords[storeNo].today[orderNo].TPROLLS = 0;
						
					}
					else{
						target.textContent = 'UnTP Rolls';
						page.notification.show('Order has been marked as tprolls.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('tprolls');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'tprolls'});
						saleRecords[storeNo].today[orderNo].TPROLLS = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}	
		}

		/*if (target.classList.contains('item-mark-hobbyco')) {
			var e = target.closest('#record-entries .record-entry');
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let hobbyco = saleRecords[storeNo].today[orderNo].HOBBYCO;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;
			let hobStatus = 0;

			if (hobbyco == 0)  hobStatus = 1;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('hobbyco', hobStatus);
				formData.append('status', status);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					if (tprStatus == 0) {
						target.textContent = 'Hobby';
						page.notification.show('Order has been unmarked tprolls.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.remove('tprolls');
						saleRecords[storeNo].today[orderNo].TPROLLS = 0;
						
					}
					else{
						target.textContent = 'UnTP Rolls';
						page.notification.show('Order has been marked as tprolls.', {background: 'bg-lgreen'});
						let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
						recordListItem.classList.add('tprolls');
						page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: 'tprolls'});
						saleRecords[storeNo].today[orderNo].TPROLLS = 1;
					}
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}	
		}*/

		if (target.classList.contains('item-mark-page')) {
			var e = target.closest('#record-entries .record-entry');
			
			let orderNo = e.dataset.recordNum;
			let storeNo = e.dataset.store;
			let status = saleRecords[storeNo].today[orderNo].OrderStatus;
			
			let pageData = target.dataset.page;

			try {
				let formData = new FormData();
				formData.append('record', orderNo);
				formData.append('page', pageData);
				formData.append('status', -1);

				let response = await fetch(apiServer+'order/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
				let data = await response.json();

				if (!response.ok) {
					console.log('Error: '+data.result);
				}

				if (data.result == 'success') {
					page.notification.show('Order has been marked as '+ pageData +'.', {background: 'bg-lgreen'});
					let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeNo+'"][data-record="'+orderNo+'"]');
					recordListItem.classList.add(pageData);
					page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeNo, recordNum: orderNo, status: pageData});
					saleRecords[storeNo].today[orderNo].page = pageData;
				}
				else {
					console.log(data.result);
				}
			}
			catch (e) {
				console.log('Error: Could not connect to the server.');
			}	
		}
		
	});
	
	document.querySelector('#type-label').addEventListener('change', showButtons);

	document.querySelector('#store-label').addEventListener('change', disableButtons);
	document.querySelector('#type-label').addEventListener('change', disableButtons);
	document.querySelector('#cust-label').addEventListener('change', disableButtons);

	document.getElementById('search-item').addEventListener('click', searchItems);
	document.getElementById('select-item').addEventListener('click', selectItem);
	document.getElementById('content-items-add').addEventListener('click', addItem);
	document.getElementById('content-items-modify').addEventListener('click', modifyItem);
	document.getElementById('content-items-remove-selected').addEventListener('click', removeItems);
	document.getElementById('content-items-delete-selected').addEventListener('click', deleteItems)
	document.getElementById('add-item-cancel').addEventListener('click',addItemCloseBox);
	/*document.getElementById('content-items-addtoorigin').addEventListener('click', addToOriginalItems);
	document.getElementById('content-items-continue').addEventListener('click', continueAddOrModify);*/
	document.getElementById('alternative-item-search').addEventListener('click', async function () {
		searchAlternativeItems();
	});

	document.getElementById('alternative-items-select-item').addEventListener('click', selectAlternativeItem);
	document.getElementById('alternative-items-close').addEventListener('click', function () { closeBox() });
	document.getElementById('alternative-items-remove-items').addEventListener('click', removeAlternativeItems);
	document.getElementById('alternative-items-add-items').addEventListener('click', addAlternativeItems);

	document.getElementById('edit-item-search').addEventListener('click', async function () {
		searchEditItems();
	});

	document.getElementById('edit-items-select-item').addEventListener('click', selectEditItem);
	document.getElementById('edit-items-remove-items').addEventListener('click', removeEditItems);
	document.getElementById('edit-items-add-items').addEventListener('click', addEditItems);
	document.getElementById('edit-items-delete-items').addEventListener('click', deleteEditItems);
	document.getElementById('edit-items-update-items').addEventListener('click', updateEditItems);
});

// Close popup box
function closeBox() {
	document.getElementById('box-outer').classList.remove('flex');
	setTimeout(function() {
		for (let el of document.querySelectorAll('#box-container > div:not(.close)')) {
			el.classList.add('hide');
		}
	}, 400);
}

//close add item box
function addItemCloseBox() {
	let itemAddBox = document.querySelector('#item-add-box');
	let outBox = document.querySelector('#box-outer');
	outBox.classList.remove('flex');
	itemAddBox.classList.add('hide');
}


function enableButtons(name) {
	// Enable generate buttons
	var btns = document.querySelectorAll(name);
	for (var g_i = 0; g_i < btns.length; g_i++) {
		btns[g_i].disabled = false;
	}
}

function disableButtons() {
	document.querySelector('.order-refresh').disabled = true;
	let readyBtns = document.querySelectorAll('.order-pack');
	for (let rdBtn of readyBtns) {
		rdBtn.disabled = true;
	}
}


// Initialise the page records data
function initPageRecords() {
	page.orders = {};
	for (var store in stores) {
		page.orders[store] = {
			records: {},
		};
	}
}

// Load the sales records from the server
async function loadRecords(startDate = 'all', endDate = null) {
	// Load orders
	var pageUrl = (page.type==PAGE_TYPE.DEAL) ? (apiServer+'orders/load?store=1&day='+startDate) : (apiServer+'orders/load?store=all&day='+startDate);
	if (endDate) pageUrl += '&endday='+endDate;
	var statusValue = null;
	var morelabel = null;
	switch (page.type) {
		case PAGE_TYPE.COLLECT:
			statusValue = ORDER_STATUS.NONE;
			break;
		case PAGE_TYPE.PARTIALCOLLECT:
			statusValue = ORDER_STATUS.PARTIALCOLLECT;
			break;
		case PAGE_TYPE.WAREHOUSECOLLECT:
			statusValue = ORDER_STATUS.WAREHOUSECOLLECT;
			break;
		case PAGE_TYPE.LABELS:
			statusValue = ORDER_STATUS.READYTOPRINT;
			break;
		case PAGE_TYPE.MORELABELS:
			pageUrl += '&morelabel=true';
			break;	
		case PAGE_TYPE.STOCK:
			statusValue = ORDER_STATUS.OUTOFSTOCK;
			break;
		case PAGE_TYPE.ORDERED:
			statusValue = ORDER_STATUS.ORDERED;
			break;
		case PAGE_TYPE.AWAITINGLIST:
			pageUrl += '&status[]='+ORDER_STATUS.PROGRESS+'&status[]='+ORDER_STATUS.LATER+'&status[]='+ORDER_STATUS.READYTOPACK;
			break;
		case PAGE_TYPE.REFUNDS:
			pageUrl += '&status[]='+ORDER_STATUS.CANCELLED.OUTOFSTOCK+'&status[]='+ORDER_STATUS.CANCELLED.DISCONTINUED+'&status[]='+ORDER_STATUS.CANCELLED.DONE+'&status[]='+ORDER_STATUS.PENDINGREVIEW+'&partialrefund=true';
			break;
		case PAGE_TYPE.RTS:
			pageUrl += '&status[]='+ORDER_STATUS.RTS+'&status[]='+ORDER_STATUS.DAMAGEDRTS;
			break;
		case PAGE_TYPE.B2B:
			pageUrl += '&status[]='+ORDER_STATUS.PARTIALLYPICKED+'&status[]='+ORDER_STATUS.FULLYPICKED;
			break;
		case PAGE_TYPE.NEWORDERS:
			//statusValue = ORDER_STATUS.NONE;
			pageUrl += '&status[]='+ORDER_STATUS.NONE+'&status[]='+ORDER_STATUS.WAREHOUSECOLLECT;
			break;
		case PAGE_TYPE.DEAL:
			statusValue = ORDER_STATUS.NONE;
			break;
	}
	if (statusValue !== null) pageUrl += '&status='+statusValue;
	pageUrl += '&supplier='+page.user.supplier;

	let response, data;
	try {
		response = await fetch(pageUrl, {headers: {'DC-Access-Token': page.userToken}});
		data = await response.json();
	}
	catch (e) {
		page.notification.show('Error: Could not connect to the server.');
		return;
	}

	if (response.ok) {
		if (data.result != 'success') {
			page.notification.show(data.result, {hide: false});
			return;
		}

		if (data.orders) {
			// Get the data
			initPageRecords();
			saleRecords = data.orders;
			//console.log(saleRecords[1].records[15589].Items.length);

			addToSaleRecords();

			if (page.type == PAGE_TYPE.COLLECT || page.type == PAGE_TYPE.ORDERED || page.type == PAGE_TYPE.PARTIALCOLLECT || page.type == PAGE_TYPE.WAREHOUSECOLLECT || page.type == PAGE_TYPE.NEWORDERS) {
				// Start live messages
				page.liveMessages.init();
			}

			// Create record list
			await createRecordList();
			document.getElementById('loading').style.display = 'none';
		}

		if (data.errors && Array.isArray(data.errors) && data.errors.length) {
			page.notification.show('Warning: Sale record data could not be loaded for one or more records. These records might be older than the loaded date range, might have been deleted or might not exist in the system.', {background: 'bg-orange', hide: false, dontOverlap: true});
			for (let item of data.errors) {
				console.warn('Warning: Could not load sale record data for record ['+item[0]+', '+item[1]+']');
			}
			document.getElementById('loading').style.display = 'none';
		}
	}
	else {
		page.notification.show('Error: '+data.result);
		document.getElementById('loading').style.display = 'none';
	}
}

function showButtons(e) {
	let type = e.target.value;
	let actionBtns = document.querySelectorAll('#record-main-actions button');
	for (let aBtn of actionBtns) {
		let btnType = aBtn.dataset.type;
		//console.log(btnType);
		if (ORDER_TYPE_DATASET[btnType] == type || btnType == undefined) {
			aBtn.classList.remove('hide');
		}else{
			aBtn.classList.add('hide');
		}
	}
}

async function addToSaleRecords() {
	for (let store in repeatCustomersToday) {
		let repeatOrders = repeatCustomersToday[store];
		for (let recordID in repeatOrders) {
			if (saleRecords[store]) {
				if (saleRecords[store].records[recordID]) {
					let newOrders = '';
					let orders = JSON.parse(JSON.stringify(repeatOrders[recordID].orders));
					for (let order in orders) {
						let obj = orders[order];
						//console.log(obj);
						newOrders += obj['srn'] + ' : ' + obj['date'] + ' : ' + obj['tid'] + '|';
					}
					saleRecords[store].records[recordID]['PreOrders'] = newOrders;
				}
			}	
		}
	}
}

async function updateInventoryStock(target) {
	let trs = target.parentNode.parentNode.querySelectorAll('table tbody tr');
	let formData = new FormData();
	for (let tr of trs) {
		let inventory = JSON.parse(tr.dataset.inventory);
		for (let s in inventory) {
	        formData.append(s, inventory[s]);
	    }
	}
	let response = await fetch(apiServer + 'inventory/updatestock', {method: 'post', headers: {'DC-Access-Token': window.userDetails.usertoken}, body: formData});
    let data = await response.json();
    return data.result;
}

//saves the modifed orders in the awaiting list
async function saveRecords(e) {
	var recordDBID = e.target.parentNode.parentNode.dataset.recordNum; //document.getElementById('record-db-id').dataset.id;
	//var recordNum = document.getElementById('record-num').dataset.id;
	//var store = document.getElementById('record-store').dataset.id;
	var type = e.target.parentNode.querySelector('#record-type').value;
	//type = type.options[type.selectedIndex].value;
	var status = e.target.parentNode.querySelector('#record-status').value;
	//status = status.options[type.selectedIndex].value;
	var trackID = e.target.parentNode.parentNode.querySelector('.record-trackingid span').textContent;
	var notes = e.target.parentNode.parentNode.querySelector('.record-notes span').textContent;

	try {
		let formData = new FormData();
		formData.append('id', recordDBID);
		formData.append('type', type);
		formData.append('status', status);
		formData.append('trackingID', trackID);
		formData.append('notes', notes);
		
		let response = await fetch(apiServer+'await/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let data = await response.json();


		if (response.ok && data.result == 'success') {
			page.notification.show('Record '+recordDBID+' has been updated.', {background: 'bg-lgreen', hide: 2500});
		}
		else {
			page.notification.show('Error: Could not load this record.');
			//page.notification.show(data.result);
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}
}

function showLocationSelectBox(store, dbID, itemTr) {
	//console.log(itemTr);
	//console.log('12345');
	if (itemTr.dataset.partialrefund=='1') {
		page.notification.show('Error: Item '+itemTr.dataset.customSku+' is partalrefunded.');
		return;
	}
	let cols = ['sku', 'indivQty', 'cartonQty', 'location', 'type', 'indivQtyPick', 'cartonQtyPick'];
	let colsEdit = ['indivQtyPick', 'cartonQtyPick'];
	var salesRecordID = saleRecords[store].records[dbID].SalesRecordID;
	let locSelBox = document.querySelector('#location-select-box');

	let sku = itemTr.dataset.customSku;
	let lineitemid = itemTr.dataset.lineitemid;
	let quantity = itemTr.dataset.itemQuantity;
	document.querySelector('#qtyNeeded span').textContent = quantity;
	let singleItemMultiple = itemTr.dataset.singleItemMultiple;
	let cartonMultiple = itemTr.dataset.cartonMultiple == 'null' ? '0' : itemTr.dataset.cartonMultiple;

	locSelBox.dataset.dbid = dbID;
	locSelBox.dataset.store = store;
	locSelBox.dataset.salesrecord = salesRecordID;
	locSelBox.dataset.lineitemid = lineitemid;
	locSelBox.dataset.quantity = quantity;
	locSelBox.dataset.singleItemMultiple = singleItemMultiple;
	locSelBox.dataset.cartonMultiple = cartonMultiple;

	let locationTableBody = document.querySelector('#location-select-box #location-table-body');
	while (locationTableBody.firstChild) {
	    locationTableBody.removeChild(locationTableBody.firstChild);
	}

	let locations;
	if (inventoryDetails[sku]) {
		locations = inventoryDetails[sku][0].locations;
	} else {
		page.notification.show('InventoryData not exist.');
		return;
	}

	// Add no location
	let tr = document.createElement('tr');
	tr.dataset.id = 'noloc';
	tr.dataset.invid = inventoryDetails[sku][0].id;
	let td = document.createElement('td'), input = document.createElement('input');
	td.className = 'selected';
	input.type = 'checkbox';
	input.autocomplete = 'off';
	td.appendChild(input);
	tr.appendChild(td);
	input.addEventListener('change', (e) => {
		if (e.target.checked == true) {
			e.target.closest('tr').querySelector('td[data-col="indivQtyPick"]').textContent = 0;
			e.target.closest('tr').querySelector('td[data-col="cartonQtyPick"]').textContent = 0;
		} else {
			e.target.closest('tr').querySelector('td[data-col="indivQtyPick"]').textContent = '';
			e.target.closest('tr').querySelector('td[data-col="cartonQtyPick"]').textContent = '';
		}
	});


	for(let col of cols) {
		let td1 = document.createElement('td');
		td1.dataset.col = col;
		if(colsEdit.includes(col)) td1.contentEditable = true;

		let text = '';
		switch (col) {
			case 'sku':
				text = sku;
				break;
			case 'indivQty':
				text = 0;
				break;
			case 'cartonQty':
				text = 0;
				break;
			case 'location':
				text = 'No Location';
				break;
			case 'type':
				text = 'No Location';
				break;
			default:
				text = '';
		}

		td1.textContent = text;
		tr.appendChild(td1);
	}

	locationTableBody.appendChild(tr);

	for (let loc of locations) {
		//if (loc.id != 'qvb' && loc.id != 'pick' && loc.id != 'bulk') continue;
		//if (!loc.bay) continue;
		let tr = document.createElement('tr');
		tr.dataset.id = loc.id;
		tr.dataset.invid = inventoryDetails[sku][0].id;
		let td = document.createElement('td'), input = document.createElement('input');
		td.className = 'selected';
		input.type = 'checkbox';
		input.autocomplete = 'off';
		td.appendChild(input);
		tr.appendChild(td);
		input.addEventListener('change', (e) => {
			if (e.target.checked == true) {
				e.target.closest('tr').querySelector('td[data-col="indivQtyPick"]').textContent = parseInt(singleItemMultiple)*parseInt(quantity);
				e.target.closest('tr').querySelector('td[data-col="cartonQtyPick"]').textContent = parseInt(cartonMultiple)*parseInt(quantity);
			} else {
				e.target.closest('tr').querySelector('td[data-col="indivQtyPick"]').textContent = '';
				e.target.closest('tr').querySelector('td[data-col="cartonQtyPick"]').textContent = '';
			}
		});


		for(let col of cols) {
			let td1 = document.createElement('td');
			td1.dataset.col = col;
			if(colsEdit.includes(col)) td1.contentEditable = true;

			let text = '';
			switch (col) {
				case 'sku':
					text = loc.customSku;
					break;
				case 'indivQty':
					text = loc.indivQty;
					break;
				case 'cartonQty':
					text = loc.cartonQty;
					break;
				case 'location':
					text = loc.bay;
					break;
				case 'type':
					text = loc.type;
					break;
				default:
					text = '';
			}

			td1.textContent = text;
			tr.appendChild(td1);
		}

		locationTableBody.appendChild(tr);

	}

	let locationTableBodyTrs = locationTableBody.querySelectorAll('tr');
	let selectedTrs = itemTr.querySelectorAll('#location-select-table tbody tr');

	for (let locTableTr of locationTableBodyTrs) {
		for (let selTr of selectedTrs) {
			if (locTableTr.dataset.id == selTr.id) {
				locTableTr.firstChild.firstChild.checked = true;
				locTableTr.querySelector('td[data-col="indivQtyPick"]').textContent = selTr.querySelector('td[data-col="indivQty"]').textContent;
				locTableTr.querySelector('td[data-col="cartonQtyPick"]').textContent = selTr.querySelector('td[data-col="cartonQty"]').textContent;
			}
		}
	}

	async function saveSelectLocationMain(e){

		let trs = e.target.closest('#location-select-box').querySelectorAll('tbody tr');
		let s = 0;
		for (let tr of trs){
			if ( tr.querySelector('td[data-col="indivQtyPick"]')?.textContent == "" ){
				tr.querySelector('.selected input').checked = false;
			}
			if ( (isNaN(parseInt(tr.querySelector('td[data-col="indivQtyPick"]')?.textContent))==true && tr.querySelector('td[data-col="indivQtyPick"]')?.textContent.length > 0 ) || parseInt(tr.querySelector('td[data-col="indivQtyPick"]')?.textContent) <= 0 ){
				console.log(tr.querySelector('td[data-col="indivQtyPick"]')?.textContent);
				alert('Invalid Quantity: '+tr.querySelector('td[data-col="indivQtyPick"]')?.textContent);
				return;
			}
			if (tr.dataset.id != 'qvb' && tr.dataset.id != 'noloc' && ( parseInt(tr.querySelector('td[data-col="indivQtyPick"]')?.textContent) > parseInt(tr.querySelector('td[data-col="indivQty"]').textContent) ) ) {
				alert('Order quantity exceeded in location '+tr.querySelector('td[data-col="location"]').textContent);
				return;
			}
			if (isNaN(parseInt(tr.querySelector('td[data-col="indivQtyPick"]')?.textContent))==false){
				s = s + parseInt(tr.querySelector('td[data-col="indivQtyPick"]')?.textContent);
			}
		}
		if (s > itemTr.dataset.itemQuantity){
			alert('Order quantity exceeded.');
			return;
		}
		saveSelectLocation(itemTr, trs);
		e.target.removeEventListener(e.type, saveSelectLocationMain);

		let locationSelected = {};
		let recordItems = document.querySelectorAll('#container .record-entry[data-record-num="'+dbID+'"] > .record-items > tbody > tr');
		for (let recordItem of recordItems) {
			if (recordItem.dataset.partialrefund=='1') continue;
			let locations = [];
			var lineitemid = recordItem.dataset.lineitemid;
			let customSku = recordItem.dataset.customSku;
			let locSelTrs = recordItem.querySelectorAll('#location-select-table tbody tr');
			
			for (let locSelTr of locSelTrs) {
				let loc = {};
				loc.id = locSelTr.id;
				loc.customSku = locSelTr.dataset.customSku;
				loc.invid = locSelTr.dataset.invid;
				loc.bay = locSelTr.querySelector('td[data-col="loc"]').textContent;
				loc.indivQty = locSelTr.querySelector('td[data-col="indivQty"]').textContent;
				loc.cartonQty = locSelTr.querySelector('td[data-col="cartonQty"]').textContent;
				loc.type = locSelTr.querySelector('td[data-col="type"]').textContent;
				locations.push(loc);
			}

			locationSelected[lineitemid] = locations;
		}

		// console.log(locationSelected);

		let formData = new FormData();
		formData.append('orderID', dbID);
		formData.append('locationselected', JSON.stringify(locationSelected));

		let response = await fetch(apiServer+'order/saveLocationSelected', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let data = await response.json();

		if (!response.ok) {
			page.notification.show('Error: '+data.result, {hide: false});
		}
		else if (data.result != 'success') {
			page.notification.show(data.result);
		} else {
			saleRecords[store].today[dbID].locationselected = JSON.stringify(locationSelected);
		}
		checkFullyPicked();
	}

	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('location-select-box').classList.remove('hide');
	document.getElementById('save-select-location').addEventListener('click',saveSelectLocationMain);
	document.querySelector('#box-outer .close').addEventListener('click', ()=>{
		document.getElementById('save-select-location').removeEventListener('click', saveSelectLocationMain)
	});
}

function showAddItemBox(store, dbID) {
	//console.log('12345');
	var salesRecordID = saleRecords[store].records[dbID].SalesRecordID;
	document.querySelector('#item-add-box').dataset.dbid = dbID;
	document.querySelector('#item-add-box').dataset.store = store;
	document.querySelector('#item-add-box').dataset.salesrecord = salesRecordID;
	let searchTableBody = document.querySelector('#item-add-box #search-table-body');
	while (searchTableBody.firstChild) {
	    searchTableBody.removeChild(searchTableBody.firstChild);
	}
	clearForm2();

	let addItemStoreSelect = document.querySelector("#search-store");
	while (addItemStoreSelect.firstChild) {
	    addItemStoreSelect.removeChild(addItemStoreSelect.firstChild);
	}
	for (let storeID in stores) {
		if (store != storeID) continue;
		let option = document.createElement('option');
		option.value = store;
		option.textContent = stores[store].name;
		addItemStoreSelect.appendChild(option);
	}

	document.querySelector('#search-store').value = store;
	document.querySelector('#search-id').value = '';
	document.querySelector('#search-name').value = '';
	document.querySelector('#search-sku').value = '';
	document.querySelector('#search-itemNum').value = '';

	/*let itemAddBox = document.querySelector('#item-add-box');
	let addOutBox = document.querySelector('#Add-box-outer');
	addOutBox.classList.add('flex');
	itemAddBox.classList.remove('hide');*/
	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('item-add-box').classList.remove('hide');

	
}

async function showModifyItemBox(dbID,store) {

	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('item-modify-box').classList.remove('hide');

	let itemTableBody = document.querySelector('#item-modify-box #item-table-body');
	document.querySelector('#item-modify-box').dataset.id = dbID;
	
	document.querySelector('#item-modify-box').dataset.store = store;
	while (itemTableBody.firstChild) {
	    itemTableBody.removeChild(itemTableBody.firstChild);
	}

	let recordEntries = document.querySelectorAll('.record-entry');
	let recordEntry;
	for (let rec of recordEntries) {
		if (rec.dataset.recordNum == dbID) {
			recordEntry = rec;
			break;
		}
	}
	
	let trs = recordEntry.querySelectorAll('.record-items>tbody>tr'); 

	/*let response = await fetch(apiServer+'orders/load', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let itemData = await response.json();*/
	let cols = ['id', 'store', 'name', 'sku', 'itemNo', 'price' ,'quantity'];

	for (let item of trs) {
		let tr = document.createElement('tr');
		tr.dataset.id = item.dataset.id;
		tr.dataset.store = item.dataset.store;
		tr.dataset.name = item.dataset.itemTitle;
		tr.dataset.sku = item.dataset.sku;
		tr.dataset.num = item.dataset.itemNum;
		tr.dataset.price = item.dataset.price;

		let td = document.createElement('td'), input = document.createElement('input');
			td.className = 'selected';
			input.type = 'checkbox';
			input.autocomplete = 'off';
			td.appendChild(input);
			tr.appendChild(td);


		for(let col of cols) {
			let td1 = document.createElement('td');
			td1.dataset.col = col;
			if(col == 'quantity' || col == 'price') td1.contentEditable = true;

			let text = '';
			switch (col) {
				case 'id':
					text = item.dataset.id;
					break;
				case 'store':
					text = stores[item.dataset.store].name;
					break;
				case 'name':
					text = item.dataset.itemTitle;
					break;
				case 'sku':
					text = item.dataset.sku;
					break;
				case 'itemNo':
					text = item.dataset.itemNum;
					break;
				case 'price':
					text = item.dataset.price;
					break;
				case 'quantity':
					text = item.dataset.itemQuantity;
					break;
				default:
					text = '';
			}

			td1.textContent = text || '';
			tr.appendChild(td1);
		}

		itemTableBody.appendChild(tr);
	}
	
}

async function showAddToOriginItemBox(e, dbID, store=null, type) {

	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('item-addtoorigin-box').classList.remove('hide');

	let itemTableBody = document.querySelector('#item-addtoorigin-box #item-table-body');
	let addtooriginbox = document.querySelector('#item-addtoorigin-box');
	addtooriginbox.dataset.id = e.target.closest('.record-entry').dataset.recordNum;
	addtooriginbox.dataset.type = type;
	addtooriginbox.dataset.store = store;
	
	while (itemTableBody.firstChild) {
	    itemTableBody.removeChild(itemTableBody.firstChild);
	}
	
	let recordEntry = e.target.closest('.record-entry');
	let trs = recordEntry.querySelectorAll('.record-items>tbody>tr'); 

	/*let response = await fetch(apiServer+'orders/load', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let itemData = await response.json();*/
	let cols = ['id', 'store', 'name', 'sku', 'itemNo', 'price' ,'quantity', 'action'];

	for (let item of trs) {
		let tr = document.createElement('tr');
		tr.dataset.id = item.dataset.id;
		tr.dataset.store = item.dataset.store;
		tr.dataset.name = item.dataset.itemTitle;
		tr.dataset.sku = item.dataset.sku;
		tr.dataset.num = item.dataset.itemNum;
		tr.dataset.price = item.dataset.price;
		tr.dataset.qty = item.dataset.itemQuantity;

		let td = document.createElement('td'), input = document.createElement('input');
			td.className = 'selected';
			input.type = 'checkbox';
			input.autocomplete = 'off';
			td.appendChild(input);
			tr.appendChild(td);


		for(let col of cols) {
			let td1 = document.createElement('td');
			td1.dataset.col = col;
			if(col == 'quantity' || col == 'price') td1.contentEditable = true;

			let text = '';
			switch (col) {
				case 'id':
					text = item.dataset.id;
					break;
				case 'store':
					text = stores[item.dataset.store].name;
					break;
				case 'name':
					text = item.dataset.itemTitle;
					break;
				case 'sku':
					text = item.dataset.sku;
					break;
				case 'itemNo':
					text = item.dataset.itemNum;
					break;
				case 'price':
					text = item.dataset.price;
					break;
				case 'quantity':
					text = item.dataset.itemQuantity;
					break;
				default:
					text = '';
			}

			td1.textContent = text || '';
			if (col == 'action') {
				let select = document.createElement('select');
				select.id = 'actionDropdown';
				for (let act of ['-', 'Refund', 'Partial Refund', 'Alternative']) {
					let option = document.createElement('option');
					option.value = act;
					option.textContent = act;
					select.appendChild(option);
				}
				td1.appendChild(select);
			}
			tr.appendChild(td1);
		}

		itemTableBody.appendChild(tr);
	}
	
}

async function showEditItemBox(e, dbID, store=null) {

	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('item-edit-box').classList.remove('hide');

	let itemTableBody = document.querySelector('#item-edit-box #item-table-body');
	let edititembox = document.querySelector('#item-edit-box');
	edititembox.dataset.id = e.target.closest('.record-entry').dataset.recordNum;
	edititembox.dataset.store = store;
	let salesRecordID = saleRecords[store].records[dbID].SalesRecordID;
	edititembox.dataset.salesrecord = salesRecordID;
	
	while (itemTableBody.firstChild) {
	    itemTableBody.removeChild(itemTableBody.firstChild);
	}
	
	let recordEntry = e.target.closest('.record-entry');
	let trs = recordEntry.querySelectorAll('.record-items>tbody>tr'); 

	let cols = ['id', 'store', 'name', 'sku', 'itemNo', 'price' ,'quantity'];

	for (let item of trs) {
		let tr = document.createElement('tr');
		tr.dataset.id = item.dataset.id;
		tr.dataset.store = item.dataset.store;
		tr.dataset.name = item.dataset.itemTitle;
		tr.dataset.sku = item.dataset.sku;
		tr.dataset.num = item.dataset.itemNum;
		tr.dataset.price = item.dataset.price;
		tr.dataset.qty = item.dataset.itemQuantity;
		tr.dataset.lineitemid = item.dataset.lineitemid;

		let td = document.createElement('td'), input = document.createElement('input');
			td.className = 'selected';
			input.type = 'checkbox';
			input.autocomplete = 'off';
			td.appendChild(input);
			tr.appendChild(td);


		for(let col of cols) {
			let td1 = document.createElement('td');
			td1.dataset.col = col;
			if(col == 'quantity' || col == 'price') td1.contentEditable = true;

			let text = '';
			switch (col) {
				case 'id':
					text = item.dataset.id;
					break;
				case 'store':
					text = stores[item.dataset.store].name;
					break;
				case 'name':
					text = item.dataset.itemTitle;
					break;
				case 'sku':
					text = item.dataset.sku;
					break;
				case 'itemNo':
					text = item.dataset.itemNum;
					break;
				case 'price':
					text = item.dataset.price;
					break;
				case 'quantity':
					text = item.dataset.itemQuantity;
					break;
				default:
					text = '';
			}

			td1.textContent = text || '';
			tr.appendChild(td1);
		}

		itemTableBody.appendChild(tr);
	}

	let editItemStoreSelect = document.querySelector("#edit-item-searchfield-stores");
	while (editItemStoreSelect.firstChild) {
	    editItemStoreSelect.removeChild(editItemStoreSelect.firstChild);
	}

	if (store != 81 && store != 82) {
		for (let storeID in stores) {
			let option = document.createElement('option');
			option.value = store;
			option.textContent = stores[store].name;
			editItemStoreSelect.appendChild(option);
		}
	} else {
		store = 71;
		let option = document.createElement('option');
		option.value = store;
		option.textContent = stores[store].name;
		editItemStoreSelect.appendChild(option);

	}
		
	let searchTableBody = document.querySelector('#edit-items-search tbody');
	searchTableBody.innerHTML = "";
	let seletectedTableBody = document.querySelector('#edit-items-selected tbody');
	seletectedTableBody.innerHTML = "";
	document.querySelector('#edit-item-keyword').value = "";
	
}

async function searchEditItems() {
  let id = '';
  let name = '';
  let sku = '';
  let itemNo = '';

  var keywords = document.querySelector('#edit-item-searchbar input').value.toLowerCase();
  var field = document.querySelector('#edit-item-searchbar input[name="edit-item-searchfield"]:checked').value;

  if (field == 'id') {
    id = keywords;
  } else if (field == 'itemno') {
    itemNo = keywords;
  } else if (field == 'sku') {
    sku = keywords;
  } else if (field == 'itemname') {
    name = keywords;
  }

  var store = document.querySelector('#edit-item-searchfield-stores').value;
  let formData = new FormData();
  formData.append('store', store);
  formData.append('id', id);
  formData.append('name', name);
  formData.append('sku', sku);
  formData.append('itemNo', itemNo);
  
  let cols = ['id', 'store', 'name', 'sku', 'itemNo'];
  let response = await fetch(apiServer + 'searchitem', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
  let itemData = await response.json();
  let searchTableBody = document.querySelector('#edit-items-search tbody');
  while (searchTableBody.firstChild) {
    searchTableBody.removeChild(searchTableBody.firstChild);
  }

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
            text = stores[item.store].name;
            break;
          default:
            text = '';
        }

        td.textContent = text || '';
        tr.appendChild(td);
      }

      searchTableBody.appendChild(tr);
	}
	
	let itemTableSearchBody = $('#edit-items-search');
	let inputCheckBox = itemTableSearchBody.find('input[type="checkbox"]');

	inputCheckBox.on('change', function(){
		if(this.checked) {
			inputCheckBox.prop('checked', false);
			$(this).prop('checked', true);
		}
	})

  }
  else {
    page.notification.show(itemData.result);
  }
}

async function searchAlternativeItems() {
  let id = '';
  let name = '';
  let sku = '';
  let itemNo = '';

  var keywords = document.querySelector('#alternative-item-searchbar input').value.toLowerCase();
  var field = document.querySelector('#alternative-item-searchbar input[name="alternative-item-searchfield"]:checked').value;

  if (field == 'id') {
    id = keywords;
  } else if (field == 'itemno') {
    itemNo = keywords;
  } else if (field == 'sku') {
    sku = keywords;
  } else if (field == 'itemname') {
    name = keywords;
  }

  var store = document.querySelector('#alternative-item-searchfield-stores').value;
  let formData = new FormData();
  formData.append('store', store);
  formData.append('id', id);
  formData.append('name', name);
  formData.append('sku', sku);
  formData.append('itemNo', itemNo);
  
  let cols = ['id', 'store', 'name', 'sku', 'itemNo'];
  let response = await fetch(apiServer + 'searchitem', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
  let itemData = await response.json();
  let searchTableBody = document.querySelector('#alternative-items-search tbody');
  while (searchTableBody.firstChild) {
    searchTableBody.removeChild(searchTableBody.firstChild);
  }

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
      tr.dataset.itemNo = item.num;
      
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
            text = stores[item.store].name;
            break;
          default:
            text = '';
        }

        td.textContent = text || '';
        tr.appendChild(td);
      }

      searchTableBody.appendChild(tr);
	}
	
	let itemTableSearchBody = $('#alternative-items-search');
	let inputCheckBox = itemTableSearchBody.find('input[type="checkbox"]');

	inputCheckBox.on('change', function(){
		if(this.checked) {
			inputCheckBox.prop('checked', false);
			$(this).prop('checked', true);
		}
	})

  }
  else {
    page.notification.show(itemData.result);
  }
}

function loadStoreLists(store) {
  var itemEl, optionEl, items;
  // Stores
  itemEl = document.getElementById('alternative-item-searchfield-stores'), items = Object.keys(stores);
  itemEl.innerHTML = "";
  for (let item of items) {
  	if (item==store) {
  		optionEl = document.createElement('option');
		optionEl.value = item;
		optionEl.textContent = stores[item].name;
		itemEl.appendChild(optionEl);
  	}	
  }

  /*// Order type
  itemEl = document.getElementById('record-type'), items = Object.keys(ORDER_TYPE_NAME).sort();
  optionEl = document.createElement('option');
  optionEl.value = -1;
  optionEl.textContent = 'Blank';
  optionEl.selected = true;
  itemEl.appendChild(optionEl);

  for (let item of items) {
    optionEl = document.createElement('option');
    optionEl.value = item;
    optionEl.textContent = ORDER_TYPE_NAME[item];
    itemEl.appendChild(optionEl);
  }

  // Order status
  itemEl = document.getElementById('record-status'), items = Object.keys(ORDER_STATUS_NAME).sort();
  optionEl = document.createElement('option');
  optionEl.value = -1;
  optionEl.textContent = 'Blank';
  optionEl.selected = true;
  itemEl.appendChild(optionEl);

  for (let item of items) {
    optionEl = document.createElement('option');
    optionEl.value = item;
    optionEl.textContent = ORDER_STATUS_NAME[item];
    itemEl.appendChild(optionEl);
  }*/
}
async function showAlternativeItemBox(e, dbID, store = null, type) {

  document.getElementById('box-outer').classList.add('flex');
  document.getElementById('item-addtoorigin-box').classList.remove('hide');

  let itemTableBody = document.querySelector('#item-addtoorigin-box #item-table-body');
  let addtooriginbox = document.querySelector('#item-addtoorigin-box');
  addtooriginbox.dataset.id = e.target.closest('.record-entry').dataset.recordNum;
  addtooriginbox.dataset.type = type;
  addtooriginbox.dataset.store = store;

  while (itemTableBody.firstChild) {
    itemTableBody.removeChild(itemTableBody.firstChild);
  }

  let recordEntry = e.target.closest('.record-entry');
  let trs = recordEntry.querySelectorAll('.record-items>tbody>tr');

	/*let response = await fetch(apiServer+'orders/load', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let itemData = await response.json();*/
  let cols = ['id', 'store', 'name', 'sku', 'itemNo', 'price', 'quantity', 'action'];

  for (let item of trs) {
	let tr = document.createElement('tr');
	if(store == 71) {
		tr.dataset.id = item.dataset.id;
		//tr.dataset.num = item.dataset.itemNum;
	} else {
		tr.dataset.id = item.dataset.id;
		tr.dataset.num = item.dataset.itemNum;
	}
    tr.dataset.lineitemid = item.dataset.lineitemid;
    tr.dataset.store = item.dataset.store;
    tr.dataset.name = item.dataset.itemTitle;
    tr.dataset.sku = item.dataset.sku;
    tr.dataset.price = item.dataset.price;
    tr.dataset.qty = item.dataset.itemQuantity;

    let td = document.createElement('td'), input = document.createElement('input');
    td.className = 'selected';
    input.type = 'checkbox';
    input.autocomplete = 'off';
    td.appendChild(input);
    tr.appendChild(td);


    for (let col of cols) {
      let td1 = document.createElement('td');
      td1.dataset.col = col;
      if (col == 'quantity' || col == 'price') td1.contentEditable = true;

      let text = '';
      switch (col) {
        case 'id':
          text = item.dataset.id;
          break;
        case 'store':
          text = stores[item.dataset.store].name;
          break;
        case 'name':
          text = item.dataset.itemTitle;
          break;
        case 'sku':
          text = item.dataset.sku;
          break;
        case 'itemNo':
          text = item.dataset.itemNum;
          break;
        case 'price':
          text = item.dataset.price;
          break;
        case 'quantity':
          text = item.dataset.itemQuantity;
          break;
        default:
          text = '';
      }

      td1.textContent = text || '';
      if (col == 'action') {
        let select = document.createElement('select');
        select.id = 'actionDropdown';
        for (let act of ['-', 'Refund', 'Partial Refund', 'Alternative']) {
          let option = document.createElement('option');
          option.value = act;
          option.textContent = act;
          select.appendChild(option);
        }
        //td1.appendChild(select);
      }
      tr.appendChild(td1);
    }
    $(itemTableBody).prepend(tr);
	
	let searchTableBody = document.querySelector('#alternative-items-search tbody');
	searchTableBody.innerHTML = "";
	let seletectedTableBody = document.querySelector('#alternative-items-selected tbody');
	seletectedTableBody.innerHTML = "";

    loadStoreLists(store);
  }
}

function selectAlternativeItem() {
  let selectedItemTable = document.querySelector('#item-addtoorigin-box #item-table tbody');
  let selectedItemTrs = selectedItemTable.querySelectorAll('tr');
  let selectedItem = undefined;
  for (let tr_i = 0; tr_i < selectedItemTrs.length; tr_i++) {
	let tr = selectedItemTrs[tr_i];
    let selectedInput = tr.firstChild.querySelector('input');
    if (selectedInput && selectedInput.checked) {
		selectedItem = {
			id: tr.dataset.id,
			lineitemid: tr.dataset.lineitemid,
			store: tr.dataset.store,
			sku: tr.dataset.sku,
			name: tr.dataset.name,
			itemNo: tr.dataset.num,
			price: tr.dataset.price,
			quantity: tr.dataset.qty,
		}
	}
  }

  let searchTableBody = document.querySelector('#alternative-items-search tbody');
  let itemTableBody = document.querySelector('#alternative-items-selected tbody');
  let itemTrs = searchTableBody.querySelectorAll('tr');
  let cols = ['id', 'store', 'name', 'sku', 'itemNo', 'quantity', 'price', 'alternativeItem'];
  for (let tr_i = 0; tr_i < itemTrs.length; tr_i++) {
    let tr = itemTrs[tr_i];
    let selectedInput = tr.firstChild.querySelector('input');
    if (selectedInput && selectedInput.checked && selectedItem !== undefined) {
	  let alternativeItem = selectedItem.name + ' | Sku: ' + selectedItem.sku + (tr.dataset.store != 71 ? ' | Item #: ' + selectedItem.itemNo : '');
      let tr2 = document.createElement('tr');
      tr2.dataset.id = tr.dataset.id;
      tr2.dataset.store = tr.dataset.store;
      tr2.dataset.sku = tr.dataset.sku;
      tr2.dataset.name = tr.dataset.name;
	  tr2.dataset.itemNo = tr.dataset.itemNo;
	  tr2.dataset.lineitemid = selectedItem.lineitemid;
	  tr2.dataset.alterId = selectedItem.id;
	  tr2.dataset.alterStore = selectedItem.store;
	  tr2.dataset.alterSku = selectedItem.sku;
	  tr2.dataset.alterName = selectedItem.name;
	  tr2.dataset.alterItemNo = selectedItem.itemNo;
	  tr2.dataset.alterPrice = selectedItem.price;
	  tr2.dataset.alterQty = selectedItem.quantity;

      let td2 = document.createElement('td'), input2 = document.createElement('input');
      td2.className = 'selected';
      input2.type = 'checkbox';
      input2.autocomplete = 'off';
      td2.appendChild(input2);
      tr2.appendChild(td2);

      for (let col of cols) {
        let td2 = document.createElement('td');
        td2.dataset.col = col;
		if (col == 'quantity') td2.contentEditable = true;
		if (col == 'price') td2.contentEditable = true;

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
            text = tr.dataset.itemNo;
            break;
          case 'store':
            text = stores[tr.dataset.store].name;
            break;
          case 'quantity':
            text = selectedItem.quantity;
			break;
		  case 'price':
			text = selectedItem.price;
			break;
		  case 'alternativeItem':
			text = alternativeItem;
			break;
          default:
            text = '';
        }

        td2.textContent = text || '';
        tr2.appendChild(td2);
      }

      itemTableBody.appendChild(tr2);

    } else {
		page.notification.show('Please select alternative item');
	}
  }
}

function selectEditItem() {
  let searchTableBody = document.querySelector('#edit-items-search tbody');
  let itemTableBody = document.querySelector('#edit-items-selected tbody');
  let itemTrs = searchTableBody.querySelectorAll('tr');

  let cols = ['id', 'store', 'name', 'sku', 'itemNo', 'quantity', 'price'];

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
				if (col == 'quantity' || col == 'price') td2.contentEditable = true;
				
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
						text = stores[tr.dataset.store].name;
						break;
					case 'quantity':
						text = 1;
						break;
					case 'price':
						text = '0';
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

function removeAlternativeItems() {
  let itemTableBody = document.querySelector('#alternative-items-selected tbody');
  let itemTrs = document.querySelectorAll('#alternative-items-selected tbody tr');

  if (itemTrs.length <= 0) {
    page.notification.show('Please select items.');
  } else {
    for (let tr_i = 0; tr_i < itemTrs.length; tr_i++) {
      let tr = itemTrs[tr_i];
      let selectedInput = tr.firstChild.querySelector('input');
      if (selectedInput && selectedInput.checked) {
        itemTableBody.removeChild(tr);
      } else {
        page.notification.show('Please select items.');
      }
    }
  }
}

function removeEditItems() {
  let itemTableBody = document.querySelector('#edit-items-selected tbody');
  let itemTrs = document.querySelectorAll('#edit-items-selected tbody tr');

  if (itemTrs.length <= 0) {
    page.notification.show('Please select items.');
  } else {
    for (let tr_i = 0; tr_i < itemTrs.length; tr_i++) {
      let tr = itemTrs[tr_i];
      let selectedInput = tr.firstChild.querySelector('input');
      if (selectedInput && selectedInput.checked) {
        itemTableBody.removeChild(tr);
      } else {
        page.notification.show('Please select items.');
      }
    }
  }
}

async function addAlternativeItems() {
  let addtooriginbox = document.querySelector('#item-addtoorigin-box');
  let recordID = addtooriginbox.dataset.id;
  let storeID = addtooriginbox.dataset.store;
  //let orderStatus = ORDER_STATUS.PENDINGREVIEW;
  
  let send = true;
  try {

    let formData = new FormData();
    formData.append('store', storeID);
	formData.append('record', recordID);
	//formData.append('status', orderStatus);
    let items = [];
    let itemTrs = document.querySelector('#alternative-items-selected tbody').querySelectorAll('tr');

    if (itemTrs.length == 0) {
      send = false;
    }

    let hasQuantity = true;
    for (let itemTr of itemTrs) {
      let item = {};
      item.itemID = itemTr.dataset.id;
      item.sku = itemTr.dataset.sku;
      item.itemNo = itemTr.dataset.itemNo;
	  item.name = itemTr.dataset.name;
	  item.store = itemTr.dataset.store;
	  item.lineitemid = itemTr.dataset.lineitemid;
      let quantity = itemTr.querySelector('[data-col="quantity"]').textContent;

      if (quantity == '' || isNaN(quantity) || quantity <= 0) {
        hasQuantity = false;
      }
	  item.quantity = quantity;
	  let price = itemTr.querySelector('[data-col="price"]').textContent;
	  if (price == '' || isNaN(price) || price <= 0) {
        hasQuantity = false;
      }
	  item.price = price;

	  item.alterId = itemTr.dataset.alterId;
	  item.alterStore = itemTr.dataset.alterStore;
	  item.alterSku = itemTr.dataset.alterSku;
	  item.alterName = itemTr.dataset.alterName;
	  item.alterItemNo = itemTr.dataset.alterItemNo;
	  item.alterPrice = itemTr.dataset.alterPrice;
	  item.alterQty = itemTr.dataset.alterQty;

      items.push(item);
    }

    if (!hasQuantity) {
      send = false;
    }

    formData.append('items', JSON.stringify(items));

    if (!send) {
      page.notification.show("Please select item and input invalid quantity or price.");
      return;
    } else {
      clearForm2();
    }

    let response = await fetch(apiServer + 'order/updatealternativeitems', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
    let addOrderData = await response.json();

    if (response.ok && addOrderData.result == 'success') {
	  closeBox();
	  var btns = document.querySelector('#record-main').querySelectorAll('button');
	  for (let btn of btns) btn.disabled = true;
	  let recordListItem = document.querySelector('#record-list ul li[data-store="'+storeID+'"][data-record="'+recordID+'"]');
	  recordListItem.classList.add('alternative');
	  page.liveMessages.send({action: LIVE_ACTIONS.STATUS_CHANGED, page: page.type, store: storeID, recordNum: recordID, status: 'alternative'});	
      page.notification.show("This order has been successfully alternatived.");
    }
    else {
      page.notification.show(addOrderData.result);
    }
  } catch (e) {
    console.log(e);
  }

}

async function modifyItem(e) {

		let dbID = e.target.closest('#item-modify-box').dataset.id;
		let store = e.target.closest('#item-modify-box').dataset.store;
		let send = true;

		try {
			let formData = new FormData();
			formData.append('dbID', dbID);
			formData.append('store', store);
			let items = [];
			let itemTrs = e.target.closest('#item-modify-box').querySelectorAll('#item-table-body tr');

			let hasQuantity = true;
			for (let itemTr of itemTrs) {
				let item = {};
				item.sku = itemTr.dataset.sku;
				if (store != 71) {
					item.itemID = itemTr.dataset.num;
				}
				item.title = itemTr.dataset.name;
				item.unitPrice = itemTr.querySelector('[data-col="price"]').textContent;
				let quantity = itemTr.querySelector('[data-col="quantity"]').textContent;
				//console.log(quantity);
				if (quantity == '' || isNaN(quantity) || quantity <= 0) {
					hasQuantity = false;
				}
				item.quantity = quantity;
				items.push(item);
			}

			if (!hasQuantity) {
				send = false;
				let quantityfeed = e.target.closest('#item-modify-box').querySelector('#item-quan-feedback');
				quantityfeed.textContent = 'Invalid quantities';
				console.log(quantityfeed.textContent);
				quantityfeed.classList.remove('hide');
				return;
			} 

			formData.append('items', JSON.stringify(items));

			let response = await fetch(apiServer+'order/modifyitem', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
			let modifyOrderData = await response.json();

			if (response.ok && modifyOrderData.result == 'success') {		
				page.notification.show("Order modified successfully.");
			}
			else {
				page.notification.show(modifyOrderData.result);
			}	
		} catch(e) {
			console.log(e);
		}

}

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
	let searchTableBody = document.querySelector('#item-add-box #search-table-body');

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
						text = stores[item.store].name;
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

function selectItem() {
	let searchTableBody = document.querySelector('#item-add-box #search-table-body');
	let itemTableBody = document.querySelector('#item-add-box #item-table-body');
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
				if (col == 'quantity' || col == 'price') td2.contentEditable = true;
				
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
						text = stores[tr.dataset.store].name;
						break;
					case 'quantity':
						text = 1;
						break;
					case 'price':
						text = '0';
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

async function addItem(e) {
	//clearFeedback();
	let dbID = e.target.parentNode.parentNode.parentNode.dataset.dbid;
	let store = e.target.closest('#item-add-box').dataset.store;
	let salesrecord = e.target.closest('#item-add-box').dataset.salesrecord;
	let send = true;
	try {

		let formData = new FormData();
		formData.append('dbID', dbID);
		formData.append('store', store);
		formData.append('salesrecord', salesrecord);
		let items = [];
		let itemTrs = e.target.closest('#item-add-box').querySelectorAll('#item-table-body tr');

		if (itemTrs.length == 0) {
			send = false;
			let itemfeed = document.querySelector('#item-feedback');
			itemfeed.textContent = 'Please add items.';
			itemfeed.classList.remove('hide');
		}

		for (let tr_i=0; tr_i<itemTrs.length;tr_i++) {
			let tr = itemTrs[tr_i];
			let selectedInput = tr.firstChild.querySelector('input');
			let itemfeed = document.querySelector('#item-feedback');
			if (selectedInput.checked == false)  {
				itemfeed.textContent = 'Please select items';
				return;
			}
		}

		let hasQuantity = true;
		for (let itemTr of itemTrs) {
			let item = {};
			item.sku = itemTr.dataset.sku;
			item.itemID = itemTr.dataset.num;
			item.title = itemTr.dataset.name;
			let quantity = itemTr.querySelector('[data-col="quantity"]').textContent;
			//console.log(quantity);
			if (quantity == '' || isNaN(quantity) || quantity <= 0) {
				hasQuantity = false;
			}
			item.quantity = quantity;
			item.unitPrice = itemTr.querySelector('[data-col="price"]').textContent;
			// item.currency = 'AUD';
			items.push(item);
		}
		
		if (!hasQuantity) {
			send = false;
			let quantityfeed = document.querySelector('#item-quan-feedback');
			quantityfeed.textContent = 'Invalid quantities';
			quantityfeed.classList.remove('hide');
		} 

		formData.append('items', JSON.stringify(items));

		if (!send) {
			page.notification.show("Please complete the form.");
			return;
		}else{
			clearForm2();
		}

		//console.log(formData.get('data'));
		let response = await fetch(apiServer+'order/additem', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let addOrderData = await response.json();

		if (response.ok && addOrderData.result == 'success') {		
			page.notification.show("Order added successfully.");
		}
		else {
			page.notification.show(addOrderData.result);
		}	
	} catch(e) {
		console.log(e);
	}

}

async function addEditItems(e) {
	
	let dbID = e.target.parentNode.parentNode.parentNode.dataset.id;
	let store = e.target.closest('#item-edit-box').dataset.store;
	let salesrecord = e.target.closest('#item-edit-box').dataset.salesrecord;
	let send = true;
	try {

		let formData = new FormData();
		formData.append('dbID', dbID);
		formData.append('store', store);
		formData.append('salesrecord', salesrecord);
		let items = [];
		let itemTrs = e.target.closest('#item-edit-box').querySelectorAll('#edit-items-selected tbody tr');

		if (itemTrs.length == 0) {
			send = false;
			page.notification.show("Please select items.");
			return;
		}

		let hasQuantity = true;
		for (let itemTr of itemTrs) {
			let item = {};
			item.sku = itemTr.dataset.sku;
			item.itemID = itemTr.dataset.num;
			item.title = itemTr.dataset.name;
			let quantity = itemTr.querySelector('[data-col="quantity"]').textContent;
			//console.log(quantity);
			if (quantity == '' || isNaN(quantity) || quantity <= 0) {
				hasQuantity = false;
			}
			item.quantity = quantity;
			item.unitPrice = itemTr.querySelector('[data-col="price"]').textContent;
			// item.currency = 'AUD';
			items.push(item);
		}
		
		if (!hasQuantity) {
			send = false;
		
		} 

		formData.append('items', JSON.stringify(items));

		if (!send) {
			page.notification.show("Please complete the form.");
			return;
		}
		//console.log(formData.get('data'));
		let response = await fetch(apiServer+'order/additem', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let addOrderData = await response.json();

		if (response.ok && addOrderData.result == 'success') {
			document.querySelector('#edit-items-selected tbody').innerHTML = "";		
			page.notification.show("Order added successfully.");
		}
		else {
			page.notification.show(addOrderData.result);
		}	
	} catch(e) {
		console.log(e);
	}

}

function removeItems() {
	let itemTableBody = document.querySelector('#item-add-box #item-table-body');
	let itemTrs = document.querySelectorAll('#item-table-body tr');

	if (itemTrs.length <=0 ) {
			page.notification.show('Please select items.');
	} else {
		for (let tr_i=0; tr_i<itemTrs.length; tr_i++) {
			let tr = itemTrs[tr_i];
			let selectedInput = tr.firstChild.querySelector('input');
			if (selectedInput && selectedInput.checked) {
				itemTableBody.removeChild(tr);
			} else {
				page.notification.show('Please select items.');
			}
		} 
	}
}

async function deleteItems(e) {

	let dbID = e.target.parentNode.parentNode.parentNode.dataset.dbid;
	let itemTableBody = document.querySelector('#item-modify-box #item-table-body');
	let itemTrs = document.querySelectorAll('#item-table-body tr');

	let formData = new FormData();
	formData.append('dbID', dbID);

	for (let tr_i=0; tr_i<itemTrs.length; tr_i++) {
			let tr = itemTrs[tr_i];
			let selectedInput = tr.firstChild.querySelector('input');
			if (selectedInput && selectedInput.checked) {
				let res = confirm("Are you sure want to delete?");
				if(res == true) {
					itemTableBody.removeChild(tr);
				}
			} 
			else {
				page.notification.show('Please select items.');
			}
		} 
}


function clearForm() {
	document.querySelector('#itemQuantityInput').value = '';
	document.querySelector('#cartonQuantityInput').value = '';
	document.querySelector('#innerQuantityInput').value = '';
	document.querySelector('#quantityPerCartonInput').value = '';
	document.querySelector('#expiryInput').value = '';
	document.querySelector('#coreCloseoutInput').value = '';
	document.querySelector('#clearanceInput').value = '';
	document.querySelector('#supplierInput').value = '';
	document.querySelector('#packsize').value = '';
	document.querySelector('#damageQuantityInput').value = '';
	document.querySelector('#damageCartonQuantityInput').value = '';
}

function clearForm2() {
	let itemTableBody = document.querySelector('#item-add-box #item-table-body');
	while (itemTableBody.firstChild) {
	    itemTableBody.removeChild(itemTableBody.firstChild);
	}
}

async function addToOriginalItems(e) {
	let dbID = e.target.closest('#item-addtoorigin-box').dataset.id;
	let tbody = e.target.closest('#item-addtoorigin-box').querySelector('tbody');
	let trs = tbody.querySelectorAll('tr');
	let items = [];
	for (let tr of trs) {
		let item = {};
		item['SKU'] = tr.dataset.sku;
		item['ItemNum'] = tr.dataset.num;
		item['ItemTitle'] = tr.dataset.name;
		item['Quantity'] = tr.dataset.qty;
		item['Action'] = tr.querySelector('#actionDropdown').value;

		items.push(item);
	}

	let formData = new FormData();
	formData.append('dbID', dbID);
	formData.append('items', JSON.stringify(items));

	try {
		let response = await fetch(apiServer+'order/addoriginalitem', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let addOrderData = await response.json();

		if (response.ok && addOrderData.result == 'success') {		
			page.notification.show("Original Items added successfully.");
		}
		else {
			page.notification.show(addOrderData.result);
		}	
	} catch(e) {
		console.log(e);
	}
	
}

function continueAddOrModify(e) {
	let box = e.target.closest('#item-addtoorigin-box');
	let type = box.dataset.type;
	let dbID = box.dataset.id;
	let store = box.dataset.store;
	if (type == 'add') {
		showAddItemBox(store, dbID);

	} else if (type == 'modify') {
		showModifyItemBox(dbID,store);
	}
	document.getElementById('item-addtoorigin-box').classList.add('hide');
}

async function searchInventory(e) {
	// console.log('123');
	stocks = {};
	var keyword = document.querySelector('#content-order-searchbar input').value.toLowerCase();
	var field = document.querySelector('#content-order-searchfield input:checked').value;

	if (!keyword) {
		page.notification.show('Please input '+field+'.');
		return;
	}

	let formData = new FormData();
	formData.append('keyword', keyword);
	formData.append('field', field);


	let response = await fetch(apiServer + 'inventory/search2' + '?field=' + field + '&keyword=' + keyword, {headers: {'DC-Access-Token': page.userToken}});
	let stockData = await response.json();

	if (response.ok && stockData.result == 'success') {		
		stocks = stockData.stocks;
	}
	else {
		page.notification.show(stockData.result);
	}

	await createTable(keyword, field);
}

async function createTable(keyword, field) {
	let newStock = {};
	for (let itemID in stocks) {
		let item = stocks[itemID];

		if (keyword) {
			if (field == 'itemname') {
				if (item.itemName && item.itemName.toLowerCase().includes(keyword)) {
					newStock[itemID] = item;
				}
			} 
			else if (field == 'sku') {
				if (item.sku && item.sku.toLowerCase().includes(keyword)) {
					newStock[itemID] = item;
				}
			} else if (field == 'customsku') {
				if (item.customSku && item.customSku.toLowerCase().includes(keyword)) {
					newStock[itemID] = item;
				}
			} 
		} else {
			newStock[itemID] = item;
		}
	}

	var tBody = document.querySelector('#item-table-body');

	while (tBody.firstChild) {
		tBody.removeChild(tBody.firstChild);
	}
	let cols = ['store', 'itemNo', 'itemName', 'sku', 'customSku' ,'stockInHand', 'imagedisplay'];
	
	for (let item in newStock) {
		var tr = document.createElement('tr');
		var stock = newStock[item];
	

		tr.dataset.id = stock.id;
        for (let col of cols) {
        	var td = document.createElement('td');
  
			if (col == 'store'){
				td.textContent = stores[stock[col]] ? stores[stock[col]].name : '';
				// console.log(td.textContent);
			} 
			else if (col == 'imagedisplay'){
				let img = document.createElement('img');
				img.src =  stock['image'];
				img.style.width = '100px';
				td.appendChild(img);
			}
			else {
	        	td.textContent = stock[col] ;
	        }

	     	tr.appendChild(td);        
	    }
    tBody.appendChild(tr);  
    }  
}

async function deleteEditItems() {
	var box = document.querySelector('#item-edit-box');
	let orderNo = box.dataset.id;
	let storeNo = box.dataset.store;

	let tbody = document.querySelector('#item-edit-box #item-table tbody');
	let trs = tbody.querySelectorAll('tr');

	let deleteItems = [];

	for (let tr of trs) {
		let deleteItem = [];
		if (tr.firstChild.firstChild.checked == true) {
			deleteItem = [tr.dataset.lineitemid, tr.dataset.sku];    //[lineitemid, sku]
			deleteItems.push(deleteItem);
		}
	}
	
	if (deleteItems.length == 0) {
		page.notification.show('No item selected.');
		return;
	}
	
	let deleteItemConfirm = confirm("Please confirm to delete item " + deleteItems.map(([x,y]) => [y]).join(',') + ".");

	if (deleteItemConfirm == false) return;
	
	
	try {
		let formData = new FormData();
		formData.append('record', orderNo);
		formData.append('store', storeNo);
		formData.append('deleteItems', JSON.stringify(deleteItems));

		let response = await fetch(apiServer+'order/itemdelete', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let data = await response.json();

		if (!response.ok) {
			console.log('Error: '+data.result);
		}

		if (data.result == 'success') {
			let recordData = saleRecords[storeNo].records[orderNo];
			let items = recordData.Items;
			for (let deleteItem of deleteItems) {
				let lineItemID = deleteItem[0];
				let sku = deleteItem[1];
				for (let i=0; i< items.length; i++) {
					let item = items[i];
					if (item.LineItemID==lineItemID && item.SKU==sku) {
						items.splice(i,1);
						break;
					}
				}

				for (let tr of trs) {
					if (tr.dataset.lineitemid == lineItemID) {
						tbody.removeChild(tr);
						break;
					}
				}
			}
				
			document.querySelector('#record-list ul .selected').click();
			page.notification.show('Items have been deleted.', {background: 'bg-lgreen'});
		}
		else {
			console.log(data.result);
		}
	}
	catch (e) {
		console.log('Error: Could not connect to the server.');
	}

}

async function updateEditItems() {
	var box = document.querySelector('#item-edit-box');
	let orderNo = box.dataset.id;
	let storeNo = box.dataset.store;

	let tbody = document.querySelector('#item-edit-box #item-table tbody');
	let trs = tbody.querySelectorAll('tr');

	let updateItems = [];

	let validData = true; 
	for (let tr of trs) {
		let updateItem = [];
		if (tr.firstChild.firstChild.checked == true) {

			let quantity = tr.querySelector('[data-col="quantity"]').textContent;
			
			if (quantity == '' || isNaN(quantity) || parseInt(quantity) <= 0) {
				validData = false;
			}
			let price = tr.querySelector('[data-col="price"]').textContent;

			if (price == '' || isNaN(price)) {
				validData = false;
			}

			updateItem = [tr.dataset.lineitemid, tr.dataset.sku, price, quantity];    //[lineitemid, sku]
			updateItems.push(updateItem);
		}
	}
	
	if (updateItems.length == 0) {
		page.notification.show('No item selected.');
		return;
	}

	if (!validData) {
		page.notification.show('Please check price and quantity.');
		return;
	}
	
	
	try {
		let formData = new FormData();
		formData.append('record', orderNo);
		formData.append('store', storeNo);
		formData.append('updateItems', JSON.stringify(updateItems));

		let response = await fetch(apiServer+'order/itemupdate', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let data = await response.json();

		if (!response.ok) {
			console.log('Error: '+data.result);
		}

		if (data.result == 'success') {
			let recordData = saleRecords[storeNo].records[orderNo];
			let items = recordData.Items;
			for (let updateItem of updateItems) {
				let lineItemID = updateItem[0];
				let sku = updateItem[1];
				for (let i=0; i< items.length; i++) {
					let item = items[i];
					if (item.LineItemID==lineItemID && item.SKU==sku) {
						item.SalePrice = updateItem[2];
						item.Quantity = updateItem[3];
						break;
					}
				}

			}
				
			document.querySelector('#record-list ul .selected').click();
			page.notification.show('Items have been deleted.', {background: 'bg-lgreen'});
		}
		else {
			console.log(data.result);
		}
	}
	catch (e) {
		console.log('Error: Could not connect to the server.');
	}
}

async function saveSelectLocation(itemTr, locTrs) {
	let locSelTbody = itemTr.querySelector('.location-selected #location-select-table tbody');
	while (locSelTbody.firstChild) {
		locSelTbody.removeChild(locSelTbody.firstChild);
	}
	for (let tr of locTrs) {
		if (tr.firstChild.firstChild.checked==true) {
			let bay = tr.querySelector('td[data-col="location"]').textContent;
			let indivPickQty = tr.querySelector('td[data-col="indivQtyPick"]').textContent;
			let cartonPickQty = tr.querySelector('td[data-col="cartonQtyPick"]').textContent;
			let customSku = tr.querySelector('td[data-col="sku"]').textContent;
			let type = tr.querySelector('td[data-col="type"]').textContent;

			let tr2 = document.createElement('tr');
			tr2.id = tr.dataset.id;
			tr2.dataset.customSku = customSku;
			tr2.dataset.invid = tr.dataset.invid;
			for (let col of ['loc', 'indivQty', 'cartonQty', 'type']) {
				let td = document.createElement('td');
				td.dataset.col = col;
				if (col=='loc') {
					td.textContent = bay;
				} else if (col=='indivQty') {
					td.textContent = indivPickQty;
				} else if (col=='cartonQty') {
					td.textContent = cartonPickQty;		
				} else if (col=='type') {
					td.textContent = type;		
				}
				tr2.appendChild(td);
			}
			locSelTbody.appendChild(tr2);
		}
	}
	document.getElementById('box-outer').classList.remove('flex');
	document.getElementById('location-select-box').classList.add('hide');

}