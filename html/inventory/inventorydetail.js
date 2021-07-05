import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getCaretPosition, getDateValue, selectElement, addListener, removeListener, checkLogin} from '/common/tools.js';


window.page = {
	buyerNameMaxLen: 30,
	els: {},
	notification: new NotificationBar(),
	user: {
		id: '',
		username: '',
		firstname: '',
		lastname: '',
	},
	userToken: localStorage.getItem('usertoken') || '',
	local: window.location.hostname.startsWith('192.168'),
}


window.reDigits = /^\d+$/;
window.inventoryData = [];

if (page.local) {
	apiServer = apiServerLocal;
}


document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();

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

	document.querySelector('#inv-update').addEventListener('click', updateInventory);
	//document.querySelector('#inv-save-location').addEventListener('click', updateInventory);
	document.querySelector('.back-to-inv-search').addEventListener('click', function(e) {
		window.location.href = '/inventory/inventoryscan.html';
	});
	document.querySelector('.nav-left').addEventListener('click', function() {
		navigation('left');
	});
	document.querySelector('.nav-right').addEventListener('click', function() {
		navigation('right');
    });
});

// Change template screen and add order data
window.addEventListener('message', async function(e) {
	if (typeof e.data != 'object') return;
	let inventorys = e.data.data;
	if (inventorys) window.inventoryData = inventorys;
	let resultCurrent = 1;
	fillForm(resultCurrent);
});


async function updateInventory(e) {
	let action = '';
	if (e.target.id == 'inv-update') action = 'update';
	if (e.target.id == 'inv-save-location') action = 'savelocation';
	let id = document.querySelector('#inventoryid').dataset.id;
	let itemNo =  document.querySelector('#itemNo').value;
	let itemName =  document.querySelector('#itemName').value;
	let sku =  document.querySelector('#sku').value;
	let customSku =  document.querySelector('#customsku').value;
	let itemBarcode =  document.querySelector('#itemBarcode').value;
	let cartonBarcode =  document.querySelector('#cartonBarcode').value;
	let type =  document.querySelector('#type').value;
	let quantityPerCarton =  document.querySelector('#quantityPerCarton').value;
	let weight =  document.querySelector('#weight').value;
	let indivQty =  document.querySelector('#indivQty').value;
	let cartonQty =  document.querySelector('#cartonQty').value;
	let stockSent =  document.querySelector('#stockSent').value;
	let bay =  document.querySelector('#bay').value;
	let expiry =  document.querySelector('#expiry').value;
	let coreCloseout =  document.querySelector('#coreCloseout').value;
	let clearance =  document.querySelector('#clearance').value;
	let supplier =  document.querySelector('#supplier').value;

	let formData = new FormData();
	formData.append('id',id);
	formData.append('itemNo',itemNo);
	formData.append('itemName',itemName);
	formData.append('sku',sku);
	formData.append('customSku',customSku);
	formData.append('itemBarcode',itemBarcode);
	formData.append('cartonBarcode',cartonBarcode);
	formData.append('type',type);
	formData.append('quantityPerCarton',quantityPerCarton);
	formData.append('weight',weight);
	formData.append('indivQty',indivQty);
	formData.append('cartonQty',cartonQty);
	formData.append('stockSent',stockSent);
	formData.append('bay',bay);
	formData.append('expiry',expiry);
	formData.append('coreCloseout',coreCloseout);
	formData.append('clearance',clearance);
	formData.append('supplier',supplier);
	formData.append('action',action);

	let response = await fetch(apiServer+'stockInventory/update3', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let responseData = await response.json();

	if (!response.ok || responseData.result != 'success') {		
		page.notification.show(responseData.result);
	} else {
		let updatedInventory = responseData.data;
		for (let i=0; i<window.inventoryData.length; i++) {
			let inv = window.inventoryData[i]
			if (inv.id==updatedInventory.id) {
				window.inventoryData[i] = updatedInventory;
				fillForm(i+1);
			}
		}
		/*if (action == 'update') {
			page.notification.show('Inventory update success.');
		} else if (action == 'savelocation') {
			page.notification.show('Location saved.');
		}*/
		page.notification.show('Inventory update success.');
	}

}

async function fillForm(resultCurrent) {
	let inventory = window.inventoryData[resultCurrent-1];
	document.querySelector('#result-total').textContent = window.inventoryData.length;
	document.querySelector('#result-current').textContent = resultCurrent;
	document.querySelector('#inventoryid').dataset.id = inventory.id;
	document.querySelector('#itemNo').value = inventory.itemNo;
	document.querySelector('#itemName').value = inventory.itemName;
	document.querySelector('#sku').value = inventory.sku;
	document.querySelector('#customsku').value = inventory.customSku;
	document.querySelector('#itemBarcode').value = inventory.itemBarcode;
	document.querySelector('#cartonBarcode').value = inventory.cartonBarcode;
	document.querySelector('#type').value = inventory.supplier == 'hobbyco' ? 'B2B' : '';
	document.querySelector('#quantityPerCarton').value = inventory.quantityPerCarton;
	document.querySelector('#weight').value = inventory.weight;
	document.querySelector('#indivQty').value = 0; //inventory.indivQty;
	document.querySelector('#cartonQty').value = 0; //inventory.cartonQty;
	document.querySelector('#stockInHand').value = parseInt(inventory.indivQty) + parseInt(inventory.quantityPerCarton) * parseInt(inventory.cartonQty);
	document.querySelector('#stockSent').value = inventory.stockSent;
	document.querySelector('#bay').value = inventory.bay;
	document.querySelector('#expiry').value = inventory.expiry;
	document.querySelector('#coreCloseout').value = inventory.coreCloseout;
	document.querySelector('#clearance').value = inventory.clearance;
	document.querySelector('#supplier').value = inventory.supplier;
	let imageContainer = document.querySelector('#image-container');
	while (imageContainer.firstChild) {
		imageContainer.removeChild(imageContainer.firstChild);
	}
	let img = document.createElement('img');
	img.src = inventory.image;
	img.classList.add('detailImg');
	imageContainer.appendChild(img);
	let locationContainer = document.querySelector('#location');
	while (locationContainer.firstChild) {
		locationContainer.removeChild(locationContainer.firstChild);
	}
	locationContainer.appendChild(await createTable(inventory.locations));
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

async function createTable(data) {
	const cols = ['Loose Qty', 'Carton Qty', 'Location', 'Type'];
	let table = document.createElement('table');
	table.classList.add('locationtable');
	let tr = document.createElement('tr');
	for (let col of cols) {
		let th = document.createElement('th');
		th.textContent = col;
		tr.appendChild(th);
	}
	table.appendChild(tr);

	let indivSum = 0;
	let cartonSum = 0;

	let b2bIndivSum = 0;
	let b2bCartonSum = 0;
	let b2cIndivSum = 0;
	let b2cCartonSum = 0;

	for (let loc of data) {
		indivSum = indivSum + parseInt(loc.indivQty);
		cartonSum = cartonSum + parseInt(loc.cartonQty);

		if (loc.type=='B2B') {
			b2bIndivSum = b2bIndivSum + parseInt(loc.indivQty);
			b2bCartonSum = b2bCartonSum + parseInt(loc.cartonQty);
		} else if (loc.type=='B2C') {
			b2cIndivSum = b2cIndivSum + parseInt(loc.indivQty);
			b2cCartonSum = b2cCartonSum + parseInt(loc.cartonQty);
		}

		let tr = document.createElement('tr');

		let td = document.createElement('td');
		td.classList.add('loc');
		td.textContent = loc.indivQty;
		tr.appendChild(td);

		td = document.createElement('td');
		td.classList.add('loc');
		td.textContent = loc.cartonQty;
		tr.appendChild(td);

		td = document.createElement('td');
		td.classList.add('loc');
		td.textContent = loc.bay;
		tr.appendChild(td);

		td = document.createElement('td');
		td.classList.add('loc');
		td.textContent = loc.type;
		tr.appendChild(td);
		
		table.appendChild(tr);

	}

	tr = document.createElement('tr');
		
	let td = document.createElement('td');
	td.classList.add('sum');
	td.textContent = b2bIndivSum;
	tr.appendChild(td);

	td = document.createElement('td');
	td.classList.add('sum');
	td.textContent = b2bCartonSum;
	tr.appendChild(td);

	td = document.createElement('td');
	td.classList.add('sum');
	td.textContent = 'B2BSUM';
	tr.appendChild(td);
	
	table.appendChild(tr);

	tr = document.createElement('tr');
		
	td = document.createElement('td');
	td.classList.add('sum');
	td.textContent = b2cIndivSum;
	tr.appendChild(td);

	td = document.createElement('td');
	td.classList.add('sum');
	td.textContent = b2cCartonSum;
	tr.appendChild(td);

	td = document.createElement('td');
	td.classList.add('sum');
	td.textContent = 'B2CSUM';
	tr.appendChild(td);
	
	table.appendChild(tr);

	tr = document.createElement('tr');
		
	td = document.createElement('td');
	td.classList.add('sum');
	td.textContent = indivSum;
	tr.appendChild(td);

	td = document.createElement('td');
	td.classList.add('sum');
	td.textContent = cartonSum;
	tr.appendChild(td);

	td = document.createElement('td');
	td.classList.add('sum');
	td.textContent = 'SUM';
	tr.appendChild(td);
	
	table.appendChild(tr);

	return table;
}