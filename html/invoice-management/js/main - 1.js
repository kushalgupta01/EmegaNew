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
	page.els.downloadInvoicesForm = document.querySelector('#invoices-download-option form');
	page.els.downloadInvoicesSubstoreForm = document.querySelector('#invoices-download-substore-option form');
	page.els.downloadInvoicesBtn = document.querySelector('#download-invoices-btn');
	page.els.importInvoicesBtn = document.querySelector('#import-invoices-btn');
	page.els.importPostalChargesBtn = document.querySelector('#import-postalcharges-btn');
	page.els.saveCostWeightsBtn = document.querySelector('#save-costweights-btn');
	page.els.addCostWeightsBtn = document.querySelector('#add-costweights-btn');

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
			{ el: page.els.downloadInvoicesForm, type: 'stores', radioName: 'dis', radioID: 'dis' },
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
				let dataset = form.hasOwnProperty('filter') ? { filter: form.filter } : {};

				for (let id of storeIDs) {
					let store = stores[id];
					radioOptions.push({
						id: id,
						value: id,
						text: store.name,
						dataset: Object.assign({ service: store.service }, dataset),
					});
				}
			}
			else if (form.type == 'ordertypes') {
				// Add entry for order type
				let orderTypes = Object.keys(ORDER_TYPE_NAME).sort();
				let dataset = form.hasOwnProperty('filter') ? { filter: form.filter } : null;

				for (let type of orderTypes) {
					radioOptions.push({
						id: type,
						value: type,
						text: ORDER_TYPE_NAME[type],
						dataset: dataset,
					});
				}
			}
			/*else if (form.type == 'suppliers') {
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
			}*/
			else if (form.type == 'collect') {
				// Add entry for order type
				let collectType = ['All others', 'Hobbycos', 'Warehouse Collected', 'Partial Collected', 'Habitania'];
				let dataset = form.hasOwnProperty('filter') ? { filter: form.filter } : null;

				for (let type of collectType) {
					radioOptions.push({
						id: type,
						value: type,
						text: type,
						dataset: dataset,
					});
				}
			}

			/*else if (form.type == 'inventory') {
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
				let packType = {'B2B':81};
				let dataset = form.hasOwnProperty('filter') ? {filter: form.filter} : null;

				for (let type in packType) {
					radioOptions.push({
						id: type,
						value: packType[type],
						text: type,
						dataset: dataset,
					});
				}
			}*/

			for (let option of radioOptions) {
				let radioItem = radio.cloneNode(true), labelItem = label.cloneNode(true), spanItem = span.cloneNode(true);
				radioItem.id += '-' + option.id;
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
	addListener('#menu-list li', 'click', async function(e) {
		e.preventDefault();
		await showPanel({id: this.dataset.panel, service: this.dataset.service});
	});
	
	await showPanel({ id: 'content-download-invoices' });

	{
		page.els.downloadInvoicesBtn.addEventListener('click', downloadInvoices, false);
		page.els.importInvoicesBtn.addEventListener('click', importInvoices, false);
		page.els.importPostalChargesBtn.addEventListener('click', importPostalCharges, false);
		page.els.saveCostWeightsBtn.addEventListener('click', saveCostWeights, false);
		page.els.addCostWeightsBtn.addEventListener('click', addCostWeights, false);


		page.els.downloadInvoicesForm.addEventListener('change', (event) => showSubstore(page.els.downloadInvoicesSubstoreForm, event));
	}
}, false);

async function showPanel(data = {}) {
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

	if (tabId == 'content-download-invoices') {
		for (let input of page.els.downloadInvoicesForm.querySelectorAll('input')) {
			let show = input.dataset.service == SERVICE_IDS['EBAY'] || input.value == 30 || input.dataset.service == SERVICE_IDS['WOOCOMMERCE'] || input.dataset.service == SERVICE_IDS['NETO']
				|| input.dataset.service == SERVICE_IDS['SHOPIFY'] || input.dataset.service == SERVICE_IDS['CATCH'] || input.dataset.service == SERVICE_IDS['KOGAN'] || input.value == 36 || input.value == 37;
			input.disabled = !show;
			page.els.downloadInvoicesForm.querySelector('label[for="' + input.id + '"]').classList[show ? 'remove' : 'add']('hide');
		}

		document.querySelector('#content-download-invoices #datefrom').value = '';
		document.querySelector('#content-download-invoices #dateto').value = '';

		await showCostWeights(1);
	}
}

async function showSubstore(substoreForm, e) {
	let storeID = e.target.value;
	if (stores[storeID].substores) {
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
		label.setAttribute('for', "sss-all");
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
		substoreForm.parentNode.classList.add('hide');
		while (substoreForm.firstChild) {
			substoreForm.removeChild(substoreForm.firstChild);
		}
	}

	// get cost weights of store
	await showCostWeights(storeID);

}

async function downloadInvoices() {
	var store, substore;
	try {
		store = page.els.downloadInvoicesForm.elements['dis'].value;
		substore = page.els.downloadInvoicesSubstoreForm.elements['sss'].value;
	} catch (e) { }

	if (!store) {
		page.notification.show('Please select a store to download from.');
		return;
	}

	let costweights = [];

	$(".cost_weight_row").each(function (index, row) {
		// TODO validate min, max, cost
		let min = parseFloat($(row).find('.min_weight').val());
		let max = parseFloat($(row).find('.max_weight').val());
		let cost = parseFloat($(row).find('.cost_weight').val());

		costweights.push({ min, max, cost });
	});

	if (!costweights.length) {
		page.notification.show('Please fill the costs.');
		return;
	}

	let datefrom = document.querySelector('#content-download-invoices #datefrom').value;
	let dateto = document.querySelector('#content-download-invoices #dateto').value;

	let formData = new FormData();
	formData.append('store', store);
	formData.append('costweights', JSON.stringify(costweights));
	formData.append('datefrom', datefrom);
	formData.append('dateto', dateto);

	page.els.downloadInvoicesBtn.disabled = true;
	page.els.downloadInvoicesBtn.textContent = 'Downloading invoices, please wait...';

	try {
		let response = await fetch(
			apiServer + 'invoices/downloadInvoice',
			{ method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData }
		);
		let data = await response.json();

		if (!response.ok) {
			if (data.result) {
				page.notification.show('Error: ' + JSON.stringify(data.result), { hide: false });
			}
			else {
				page.notification.show('Error: Could not download invoices.', { hide: false });
			}
		}

		if (data.result == 'success') {

			var wb = XLSX.utils.book_new();
			var aoa_data = [];
			var head = ['SalesRecordID', 'OrderID', 'Name', 'Address1', 'Address2', 'Suburb', 'State', 'PostCode', 'Country',
				'Email', 'Phone', 'Tracking', 'Date Created', 'Collected Time', 'Date Sent', 'Items'];
			var isShowTotalCost = true;

			var isShowTotalPayment = document.getElementById("showPaypalPayment").checked;
			var isShowParcelWeight = document.getElementById("showParcelWeight").checked;
			var isShowPostageCost = document.getElementById("showPostageCost").checked;
			var isShowHanlingCost = document.getElementById("showHandlingCost").checked;

			let ebayStore = isEbayStore(store);

			var isShowPaypalTransactionFee = ebayStore && document.getElementById("showPaypalTransactionFee").checked;
			var isShowEbayFee = ebayStore && document.getElementById("showEbayFee").checked;
			var isShowServiceFee = ebayStore && document.getElementById("showServiceFee").checked;
			var isShowPaypalTotalFee = ebayStore && document.getElementById("showPaypalTotalFee").checked;

			isShowTotalPayment && head.push('Total Payment');
			isShowParcelWeight && head.push('Parcel weight');
			isShowPostageCost && head.push('Postage Cost');
			isShowHanlingCost && head.push('Handling Cost');
			isShowTotalCost && head.push('Total Cost');
			isShowPaypalTransactionFee && head.push('Paypal Transaction Fee');
			isShowEbayFee && head.push('Ebay Fee');
			isShowServiceFee && head.push('Service Fee');
			isShowPaypalTotalFee && head.push('Paypal Total Fee');

			head.push('Final Amount');
			head.push('Export Note');

			aoa_data.push(head);

			let orders = data.data;

			for (let order of orders) {
				let items = typeof order.items === 'object' ? order.items : JSON.parse(order.items);
				let aoa_row = [];
				aoa_row.push(order.salesRecordID);
				aoa_row.push(order.id);

				aoa_row.push(order.name ? order.name.replace(/"/g, "") : order.name);
				aoa_row.push(order.addr1 ? order.addr1.replace(/"/g, "") : order.addr1);
				aoa_row.push(order.addr2 ? order.addr2.replace(/"/g, "") : order.addr2);
				aoa_row.push(order.city ? order.city.replace(/"/g, "") : order.city);
				aoa_row.push(order.state ? order.state.replace(/"/g, "") : order.state);
				aoa_row.push(order.postcode ? order.postcode.replace(/"/g, "") : order.postcode);
				aoa_row.push(order.country ? order.country.replace(/"/g, "") : order.country);
				aoa_row.push(order.email ? order.email.replace(/"/g, "") : order.email);
				aoa_row.push(order.phone ? order.phone.replace(/"/g, "") : order.phone);

				aoa_row.push(order.trackingID ? order.trackingID.join(' ') : '');

				aoa_row.push(order.createdDate);
				aoa_row.push(order.collected);
				aoa_row.push(order.packedTime);

				// items
				let itemInfo = items.map(
					p =>
						[
							(p.quantity || p.Quantity || p.qty || p.qty_ordered || p.quantity_purchased),
							' x ',
							p.sku || p.SKU,
							' - ',
							(p.title || p.name || p.ProductName || p.product_title)
						].join('')
				).join('\n');

				aoa_row.push(itemInfo);

				// weigth
				isShowTotalPayment && aoa_row.push(parseFloat(order.paymentTotal));
				isShowParcelWeight && aoa_row.push(order.weight);
				isShowPostageCost && (order.weight > 0 && order.shippingCost && order.shippingCost > 0 ? aoa_row.push(order.shippingCost) : aoa_row.push('')); // Postage cost
				isShowHanlingCost && (order.handlingCost ? aoa_row.push(order.handlingCost) : aoa_row.push(''));

				if ((order.weight > 0) && (order.shippingCost >= 0) && (order.handlingCost > 0 || order.isPlacementOrderSummary)) {
					var totalCost = parseFloat(order.totalCost);
					isShowTotalCost && (totalCost ? aoa_row.push(totalCost) : aoa_row.push(''));
					isShowPaypalTransactionFee && (order.paypal_transaction_fee ? aoa_row.push(order.paypal_transaction_fee) : aoa_row.push('')); //Paypal Transaction Fee
					isShowEbayFee && (order.ebay_fee ? aoa_row.push(order.ebay_fee) : aoa_row.push('')); //Ebay Fee
					isShowServiceFee && (order.service_fee ? aoa_row.push(order.service_fee) : aoa_row.push('')); //Service Fee
					isShowPaypalTotalFee && (order.paypal_total_fee ? aoa_row.push(order.paypal_total_fee) : aoa_row.push('')); //Paypal Total Fee

					var finalAmount = parseFloat(order.paymentTotal) - totalCost;

					if (order.paypal_total_fee) {
						finalAmount = finalAmount - order.paypal_total_fee;
					}

					aoa_row.push(finalAmount); // Amount
					aoa_row.push(''); // Note
				} else {
					isShowTotalCost && aoa_row.push(''); // Total cost
					isShowPaypalTransactionFee && aoa_row.push(''); //Paypal Transaction Fee
					isShowEbayFee && aoa_row.push(''); //Ebay Fee
					isShowServiceFee && aoa_row.push(''); //Service Fee
					isShowPaypalTotalFee && aoa_row.push(''); //Paypal Total Fee

					aoa_row.push(''); // Amount

					let note = '';

					if (order.weight == 0) {
						note = 'Invalid parcel weight or item weight';
					} else {
						if (order.shippingCost == -1) {
							note = 'Invalid parcel weight';
						} else if (order.shippingCost == -2) {
							note = 'Shipping cost not defined yet';
						} else if (order.shippingCost == -3) {
							note = 'Failed Auspost API. Please check (state, suburb, postcode) again';
						}
					}

					aoa_row.push(note);

				}


				aoa_data.push(aoa_row);
			}

			let ws = XLSX.utils.aoa_to_sheet(aoa_data);
			XLSX.utils.book_append_sheet(wb, ws);
			XLSX.writeFile(wb, 'invoices.xlsx');
			page.notification.show('The invoices have been downloaded.', { background: 'bg-lgreen' });
		}
		else {
			page.notification.show(JSON.stringify(data.result), { hide: false });
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

	page.els.downloadInvoicesBtn.textContent = 'Download Invoices';
	page.els.downloadInvoicesBtn.disabled = false;
}

async function importInvoices() {
	let send = true;
	let formData = new FormData();
	let files = document.getElementById('invoicesFile').files;
	let file = null;

	if (files.length == 0) {
		send = false;
		page.notification.show("Please select a file.");
	} else {
		file = files[0];
	}

	if (!send) {
		return;
	}

	formData.append('file', file);
	let importBtn = document.getElementById("import-invoices-btn");

	importBtn.setAttribute('disabled', 'disabled');
	importBtn.textContent = 'Proccessing';

	let response = await fetch(apiServer + 'invoices/importImvoice', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
	let responseJson = await response.json();

	if (response.ok && responseJson.result == 'success') {
		page.notification.show("Invoices imported successfully.");
	} else {
		page.notification.show(responseJson.result);
	}

	importBtn.removeAttribute('disabled');
	importBtn.textContent = 'Import Invoices';

}

async function importPostalCharges() {
	let send = true;
	let formData = new FormData();
	let files = document.getElementById('postalchargesFile').files;
	let file = null;

	if (files.length == 0) {
		send = false;
		page.notification.show("Please select a file.");
	} else {
		file = files[0];
	}

	if (!send) {
		return;
	}

	formData.append('file', file);
	let importBtn = document.getElementById("import-postalcharges-btn");

	importBtn.setAttribute('disabled', 'disabled');
	importBtn.textContent = 'Proccessing';

	let response = await fetch(apiServer + 'invoices/importAusPost', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
	let responseJson = await response.json();

	if (response.ok && responseJson.result == 'success') {
		page.notification.show("postalcharges imported successfully.");
	} else {
		page.notification.show(responseJson.result);
	}

	importBtn.removeAttribute('disabled');
	importBtn.textContent = 'Import postalcharges';

}

async function saveCostWeights() {
	let formData = new FormData();
	let costweights = [];

	let store = page.els.downloadInvoicesForm.elements['dis'].value;

	if (!store) {
		page.notification.show("Please fill the costs.");
		return;
	}

	$(".cost_weight_row").each(function (index, row) {
		// TODO validate min, max, cost
		let min = parseFloat($(row).find('.min_weight').val());
		let max = parseFloat($(row).find('.max_weight').val());
		let cost = parseFloat($(row).find('.cost_weight').val());

		costweights.push({ min, max, cost });
	});

	if (!costweights.length) {
		page.notification.show("Please choose the store.");
		return;
	}

	formData.append('store', store);
	formData.append('costweights', JSON.stringify(costweights));

	try {
		let savetBtn = document.getElementById("save-costweights-btn");

		savetBtn.setAttribute('disabled', 'disabled');
		savetBtn.textContent = 'Proccessing';

		let response = await fetch(apiServer + 'invoices/saveCostWeights', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
		let responseJson = await response.json();

		if (response.ok && responseJson.result == 'success') {
			page.notification.show("Saved successfully.");
		} else {
			page.notification.show(responseJson.result);
		}

		savetBtn.removeAttribute('disabled');
		savetBtn.textContent = 'Save';
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

}

function generateCostWeighHtmlRow(costWeight) {
	let newRowHtml = [
		'<div class="input-group cost_weight_row">',
		'<input type="number" class="min_weight" placeholder="from" value="' + (costWeight ? costWeight.min : '') + '" />-<input type="number" class="max_weight" placeholder="to" value="' + (costWeight ? costWeight.max : '') + '" /><label class="lbl_unit">kg</label>',
		'<input type="number" class="cost_weight" placeholder="cost" value="' + (costWeight ? costWeight.cost : '') + '" /><label class="lbl_unit">$</label>',
		'<button class="action-btn btn-KashmirBlue remove-costweights-btn" onclick="this.parentElement.remove();">Remove row</button>',
		'</div>'
	].join('');

	return newRowHtml;
}

function addCostWeights() {
	let newRowHtml = generateCostWeighHtmlRow();

	$('.action_btns').before(newRowHtml);
}

async function showCostWeights(store) {
	try {
		let formData = new FormData();
		formData.append('store', store);
		let response = await fetch(apiServer + 'invoices/getCostWeights', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
		let responseJson = await response.json();
		let costWeights = responseJson.result;

		// clear all old rows
		$('.cost_weight_row').remove();
		if (costWeights) {
			let newRowHtmls = [];

			for (let costWeight of costWeights) {
				newRowHtmls.push(generateCostWeighHtmlRow(costWeight));
			}

			$('.action_btns').before(newRowHtmls);
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}


	let ebayStore = isEbayStore(store);
	let visibility = ebayStore ? '' : 'hidden';

	let elements = [
		document.getElementById("showPaypalTransactionFee"),
		document.getElementById("showEbayFee"),
		document.getElementById("showServiceFee"),
		document.getElementById("showPaypalTotalFee"),
	];

	for (let element of elements) {
		element.checked = ebayStore;
		element.parentElement.style.visibility = visibility;
	}

}

function isEbayStore(store) {
	return ([1, 15, 4, 6, 8, 9].indexOf(parseInt(store)) >= 0);
}
