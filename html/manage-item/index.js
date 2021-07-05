import '/order-collect/js/config.js';
import '/common/stores.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener, checkLogin} from '/common/tools.js';
//import {getItemDetails} from '../order-collect/js/item-details.js';



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
	localUser: !!localStorage.getItem('local'),
	loadTime: 0,
	scan: false,
	bayNum: 50,
	satchel: {'A4': 1, 'A5': 1},
	currentComboItems: []
};


if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});

	page.els.itemTableBody = document.querySelector('#item-table-body');
	
	page.els.itemStoreSelect = document.querySelector('#item-store');
	page.els.tableStoreSelect = document.querySelector('#table-store');
	page.els.tableBaySelect = document.querySelector('#bay-table');
	page.els.tableSatchelSelect = document.querySelector('#satchel-table');

	page.els.itemIdInput = document.querySelector('#id-table');
	//page.els.itemStoreInput = document.querySelector('#store-table');
	page.els.itemNumInput = document.querySelector('#itemNo-table');
	page.els.itemSkuInput = document.querySelector('#sku-table');
	page.els.itemTitleInput = document.querySelector('#itemTitle-table');
	page.els.itemMultipleInput = document.querySelector('#itemMultiple-table');
	page.els.singleitemMultipleInput = document.querySelector('#singleitemMultiple-table');
	page.els.itemWeightInput = document.querySelector('#itemWeight-table');
	page.els.itemCartonBarcodeInput = document.querySelector('#itemCartonBarcode-table');
	page.els.itemIndivBarcodeInput = document.querySelector('#itemIndivBarcode-table');
	page.els.itemPhotoInput = document.querySelector('#itemPhoto-table');
	page.els.itemPhotoFileInput = document.getElementById('photoFile');
	page.els.flatpackInput = document.querySelectorAll('input[name=flatpack]');
	page.els.vrInput = document.querySelectorAll('input[name=vr]');
	page.els.fastwayflatpackInput = document.querySelectorAll('input[name=fwfp]');

	
	let itemStoreSelect = page.els.itemStoreSelect;
	let tableStoreSelect = page.els.tableStoreSelect;
	let tableBaySelect = page.els.tableBaySelect;
	let tableSatchelSelect = page.els.tableSatchelSelect;

	for (let store in stores) {
		let storeOption = document.createElement('option');
		storeOption.value =  store;
		storeOption.textContent = stores[store];
		itemStoreSelect.appendChild(storeOption);
		tableStoreSelect.appendChild(storeOption.cloneNode(true));
	}

	for (let bay=0; bay<=page.bayNum; bay++) {
		let bayOption = document.createElement('option');
		bayOption.value =  bay;
		bayOption.textContent = bay;
		tableBaySelect.appendChild(bayOption);
	}

	for (let sat in page.satchel) {
		let satOption = document.createElement('option');
		satOption.value =  sat;
		satOption.textContent = sat;
		tableSatchelSelect.appendChild(satOption);
	}


	document.querySelector('#getItem').addEventListener('click', itemGet, false);
	document.querySelector('#getComboItem').addEventListener('click', comboItemGet, false);

	document.querySelector('#select-item').addEventListener('click', selectItem, false);
	document.querySelector('#select-item-cancel').addEventListener('click', closeBox, false);
	document.querySelector('#update-photo').addEventListener('click', updatePhoto, false);
	document.querySelector('#update-item').addEventListener('click', updateItem, false);

	$("#combo-item-store").html($("#item-store").html());

	$("body").on('change', '.comboItemQty', function () {
		var _this = $(this);
		var qty = parseInt(_this.val());
		var comboItemId = _this.parent().parent().data('id');

		updateComboItemQty(comboItemId, qty);
	});
	
	$("body").on('click', '.removeComboItem', function () {
		var _this = $(this);
		var comboItemId = _this.parent().parent().data('id');

		var comboItem = page.currentComboItems.find(item => item.id == comboItemId);

		if (comboItem) {
			removeComboItem(comboItem);
			generateComboItemsHmtl();
		}
	});
	

});

async function itemGet() {
	clearFeedback();

	let send = true;
	let formData = new FormData();

	let store = document.querySelector('#item-store').value;
	let itemId = document.querySelector('#itemId').value;
	let itemNo = document.querySelector('#itemNo').value;
	let sku = document.querySelector('#sku').value;
	let name = document.querySelector('#itemTitle').value;

	if (store == '-') {
		send = false;
		let storefeed = document.querySelector('#store-feedback');
		storefeed.textContent = 'Please choose a store.';
		storefeed.classList.remove('hide');
	}

	if (itemId == '' && itemNo == '' && sku == '' && name == '') {
		send = false;
		let numSkuFeedback = document.querySelector('#num-sku-feedback');
		numSkuFeedback.textContent = 'Please enter a item Id, Number,  sku or Title.';
		numSkuFeedback.classList.remove('hide');
	}

	if (!send) {
		page.notification.show("Please complete the form.");
		return;
	}

	formData.append('store', store);
	formData.append('id', itemId);
	formData.append('itemNo', itemNo);
	formData.append('sku', sku);
	formData.append('name', name);


	let response = await fetch(apiServer+'searchitem', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let itemData = await response.json();

	if (response.ok && itemData.result == 'success') {
		
		let items = itemData.items;
		if (items.length == 1) {
			clearTable();
			page.els.itemIdInput.value = items[0].id;
			page.els.tableStoreSelect.value = items[0].store;
			page.els.itemNumInput.value = items[0].num;
			page.els.itemSkuInput.value = items[0].sku;
			page.els.itemTitleInput.value = items[0].name;
			page.els.itemMultipleInput.value = items[0].mul;
			page.els.singleitemMultipleInput.value = items[0].singlemul;
			page.els.itemWeightInput.value = items[0].weight;
			page.els.itemCartonBarcodeInput.value = items[0].cartonBarcode;
			page.els.itemIndivBarcodeInput.value = items[0].indivBarcode;
			page.els.itemPhotoInput.value = items[0].pic;
			page.els.tableBaySelect.value = items[0].bay;
			page.els.tableSatchelSelect.value = items[0].sat;

			let flatpackInput = page.els.flatpackInput;
			let vrInput = page.els.vrInput;
			let fastwayflatpackInput = page.els.fastwayflatpackInput;



			for (let vr of vrInput) {
				if (vr.value == items[0].vr) {
					vr.checked = true;
					break;
				}
			}

			for (let fwfp of fastwayflatpackInput) {
				if (fwfp.value == items[0].fwfp) {
					fwfp.checked = true;
					break;
				}
			}

			for (let fp of flatpackInput) {
				if (fp.value == items[0].fp) {
					fp.checked = true;
					break;
				}
			}
			

			let imgGroup = document.querySelector('#image');
	
			if (imgGroup.firstChild) {
				imgGroup.removeChild(imgGroup.firstChild);
			}
	        

			let img = document.createElement('img');
			img.class = 'img-fluid';
			img.alt = 'Responsive image';
			let imgUrl = items[0].pic;
			if (imgUrl.substring(0,3) == 'img') {
				img.src = imageServer + imgUrl;
			}else{
				img.src = imgUrl;
			}
			imgGroup.appendChild(img);


			page.currentComboItems = items[0].comboItems ? items[0].comboItems : [];
			generateComboItemsHmtl();

		}else{
			showSelectItemBox();
			let cols = ['id', 'store', 'name', 'sku', 'itemNo'];
			let itemTableBody = page.els.itemTableBody;
			//console.log(items);
			for (let item of items) {
				let tr = document.createElement('tr');
				tr.dataset.id = item.id;
				tr.dataset.store = item.store;
				tr.dataset.sku = item.sku;
				tr.dataset.name = item.name;
				tr.dataset.num = item.num;
				tr.dataset.mul = item.mul;
				tr.dataset.singlemul = item.singlemul;
				tr.dataset.weight = item.weight;
				tr.dataset.pic = item.pic;
				tr.dataset.fp = item.fp;
				tr.dataset.vr = item.vr;
				tr.dataset.fwfp = item.fwfp;
				tr.dataset.bay = item.bay;
				tr.dataset.satchel = item.satchel;
				tr.dataset.cartonBarcode = item.cartonBarcode;
				tr.dataset.indivBarcode = item.indivBarcode;
				tr.dataset.comboItems = item.comboItems ? JSON.stringify(item.comboItems) : '';
				let td = document.createElement('td'), input = document.createElement('input');
				//td.className = 'selected';
				input.type = 'radio';
				input.name = 'item';
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

				itemTableBody.appendChild(tr);
			}
			
		}
		
	}
	else {
		page.notification.show(itemData.result);
	}



}


async function comboItemGet() {
	clearFeedback();

	let send = true;
	let formData = new FormData();

	let store = $('#combo-item-store').val();
	let itemId = $('#combo-itemId').val();
	let itemNo = $('#combo-itemNo').val();
	let sku = $('#combo-itemSku').val();
	let name = $('#combo-itemTitle').val();

	if (store == '-') {
		send = false;
		let storefeed = document.querySelector('#combo-store-feedback');
		storefeed.textContent = 'Please choose a store.';
		storefeed.classList.remove('hide');
	}

	if (itemId == '' && itemNo == '' && sku == '' && name == '') {
		send = false;
		let numSkuFeedback = document.querySelector('#combo-num-sku-feedback');
		numSkuFeedback.textContent = 'Please enter a item Id, Number,  sku or Title.';
		numSkuFeedback.classList.remove('hide');
	}

	if (!send) {
		page.notification.show("Please complete the form.");
		return;
	}

	formData.append('store', store);
	formData.append('id', itemId);
	formData.append('itemNo', itemNo);
	formData.append('sku', sku);
	formData.append('name', name);


	let response = await fetch(apiServer + 'searchitem', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
	let itemData = await response.json();

	if (response.ok && itemData.result == 'success') {

		let items = itemData.items;

		// showSelectItemBox();
		let cols = ['id', 'store', 'name', 'sku', 'itemNo'];
		let itemTableBody = $("#combo-item-table-body");
		itemTableBody.html('');
		//console.log(items);
		for (let item of items) {
			let tr = document.createElement('tr');
			tr.dataset.id = item.id;
			tr.dataset.store = item.store;
			tr.dataset.sku = item.sku;
			tr.dataset.name = item.name;
			tr.dataset.num = item.num;
			tr.dataset.mul = item.mul;
			tr.dataset.singlemul = item.singlemul;
			tr.dataset.weight = item.weight;
			tr.dataset.pic = item.pic;
			tr.dataset.fp = item.fp;
			tr.dataset.vr = item.vr;
			tr.dataset.fwfp = item.fwfp;
			tr.dataset.bay = item.bay;
			tr.dataset.satchel = item.satchel;
			tr.dataset.cartonBarcode = item.cartonBarcode;
			tr.dataset.indivBarcode = item.indivBarcode;
			let td = document.createElement('td'), input = document.createElement('input');
			//td.className = 'selected';
			input.type = 'checkbox';
			input.name = 'comboItem';
			input.autocomplete = 'off';
			input.classList.add("selectComboItem");
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

			itemTableBody.append(tr);
		}


		$("body").on("click", ".selectComboItem", function () {
			let selected = $(this).prop('checked');
			let tr = $(this).parent().parent();

			let item = {
				id: tr.data('id'),
				sku: tr.data('sku'),
				itemName: tr.data('name'),
				itemNo: tr.data('num')
			};

			if (selected) {
				addComboItem(item);
			} else {
				removeComboItem(item);
			}
			generateComboItemsHmtl();
		});

	}
	else {
		page.notification.show(itemData.result);
	}

}

function generateComboItemsHmtl() {
	let html = [];
	for (let i = 0; i < page.currentComboItems.length; ++i) {
		let item = page.currentComboItems[i];
		html.push([
			'<tr data-id="' + item.id + '">',
				'<td>' + (i + 1) + '</td>',
				'<td>' + item.sku + '</td>',
				'<td>' + item.itemName + '</td>',
				'<td><input type="number" min="0" value="' + item.quantity + '" class="comboItemQty" /></td>',
				'<td><button type="button" class="btn btn-sm btn-danger removeComboItem">Remove</button></td>',
			'</tr>'
		].join(''));
	}

	$("#tblComboItems tbody").html(html.join(''));
}

function addComboItem(item) {
	let currentComboItem = page.currentComboItems.find(it => it.id == item.id);

	if (currentComboItem) {
		currentComboItem.quantity = currentComboItem.quantity + 1;
	} else {
		item.quantity = 1;
		page.currentComboItems.push(item);
	}
}

function removeComboItem(item) {
	page.currentComboItems = page.currentComboItems.filter(it => it.id != item.id);
}

function updateComboItemQty(itemId, qty) {
	let currentComboItem = page.currentComboItems.find(it => it.id == itemId);

	if (currentComboItem) {
		currentComboItem.quantity = qty;
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

function clearTable() {
	page.els.itemIdInput.value = '';
	page.els.tableStoreSelect.value = '-';
	page.els.itemNumInput.value = '';
	page.els.itemSkuInput.value = '';
	page.els.itemTitleInput.value = '';
	page.els.itemMultipleInput.value = '';
	page.els.singleitemMultipleInput.value = '';
	page.els.itemWeightInput.value = '';
	page.els.itemCartonBarcodeInput.value = '';
	page.els.itemIndivBarcodeInput.value = '';
	page.els.itemPhotoInput.value = '';
	page.els.itemPhotoFileInput.value = '';
}


function showSelectItemBox(){
	let itemTableBody = page.els.itemTableBody;
	while (itemTableBody.firstChild) {
	    itemTableBody.removeChild(itemTableBody.firstChild);
	}

	clearTable();


	let imgGroup = document.querySelector('#image');
	
	while (imgGroup.firstChild) {
		imgGroup.removeChild(imgGroup.firstChild);
	}

	let itemSelectBox = document.querySelector('#item-select-box');
	let outBox = document.querySelector('#box-outer');
	outBox.classList.add('flex');
	itemSelectBox.classList.remove('hide');
}

function closeBox() {
	let itemSelectBox = document.querySelector('#item-select-box');
	let outBox = document.querySelector('#box-outer');
	outBox.classList.remove('flex');
	itemSelectBox.classList.add('hide');
}

function selectItem() {
	let itemTableBody = page.els.itemTableBody;
	let itemTrs = itemTableBody.querySelectorAll('tr');

	for (let tr_i=0; tr_i<itemTrs.length;tr_i++) {
		let tr = itemTrs[tr_i];
		let selectedInput = tr.firstChild.querySelector('input');
		if (selectedInput && selectedInput.checked) {

		    page.els.itemIdInput.value = tr.dataset.id;;
			page.els.tableStoreSelect.value = tr.dataset.store;
			page.els.itemNumInput.value = tr.dataset.num;
			page.els.itemSkuInput.value = tr.dataset.sku;
			page.els.itemTitleInput.value = tr.dataset.name;
			page.els.itemMultipleInput.value = tr.dataset.mul;
			page.els.singleitemMultipleInput.value = tr.dataset.singlemul;
			page.els.itemWeightInput.value = tr.dataset.weight;
			page.els.itemCartonBarcodeInput.value = tr.dataset.cartonBarcode;
			page.els.itemIndivBarcodeInput.value = tr.dataset.indivBarcode;
			page.els.itemPhotoInput.value = tr.dataset.pic;

			page.els.tableBaySelect.value = tr.dataset.bay;
			page.els.tableSatchelSelect.value = tr.dataset.sat;

			let flatpackInput = page.els.flatpackInput;
			let vrInput = page.els.vrInput;
			let fastwayflatpackInput = page.els.fastwayflatpackInput;

			for (let vr of vrInput) {
				if (vr.value == tr.dataset.vr) {
					vr.checked = true;
					break;
				}
			}

			for (let fwfp of fastwayflatpackInput) {
				if (fwfp.value == tr.dataset.fwfp) {
					fwfp.checked = true;
					break;
				}
			}

			for (let fp of flatpackInput) {
				if (fp.value == tr.dataset.fp) {
					fp.checked = true;
					break;
				}
			}
			
			let imgGroup = document.querySelector('#image');
			let img = document.createElement('img');
			img.class = 'img-fluid';
			img.alt = 'Responsive image';
			let imgUrl = tr.dataset.pic;
			if (imgUrl.substring(0,3) == 'img') {
				img.src = imageServer + imgUrl;
			}else{
				img.src = imgUrl;
			}
			imgGroup.appendChild(img);


			page.currentComboItems = tr.dataset.comboItems ? JSON.parse(tr.dataset.comboItems) : [];
			generateComboItemsHmtl();
		}
	}

	closeBox();
}

async function updatePhoto() {

	try {
 
		let id = page.els.itemIdInput.value;
		if (id=='') {
			page.notification.show('Item id is missing.');
			return;
		}

		let store = page.els.tableStoreSelect.value;
		let num = page.els.itemNumInput.value;
		let sku = page.els.itemSkuInput.value;

		if (store=='' || num=='' || sku=='') {
			page.notification.show('Item store, number or sku is missing.');
			return;
		}


		let files = page.els.itemPhotoFileInput.files;

		if (files.length == 0) {
			page.notification.show('Please select a photo.');
			return;
		}

		let extName = files[0].name.split('.').slice(-1)[0];

		let filePath = 'img-' + store + '-' + num + '-' + sku + '.' + extName;

		page.els.itemPhotoInput.value = filePath;
		document.querySelector('#image').firstChild.src = imageServer + filePath;

		let formData0 = new FormData();	
		formData0.append('id', id);
		formData0.append('itemPhoto', filePath);

		let response0 = await fetch(apiServer+'item/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData0});

		let picData0 = await response0.json();

		if (!response0.ok) {
			if (picData0.result) {
				page.notification.show('Error: '+JSON.stringify(picData0.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not upload the picture.', {hide: false});
			}
		}

		if (picData0.result == 'success') {
			page.notification.show('The pic has been updated.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(picData0.result), {hide: false});
		}

		let formData = new FormData();

		formData.append('name', filePath);
		formData.append('file', files[0]);
		
		let response = await fetch(apiServer+'upload', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});

		let picData = await response.json();

		if (!response.ok) {
			if (picData.result) {
				page.notification.show('Error: '+JSON.stringify(picData.result), {hide: false});
			}
			else {
				page.notification.show('Error: Could not upload the picture.', {hide: false});
			}
		}

		if (picData.result == 'success') {
			page.notification.show('The pic has been updated.', {background: 'bg-lgreen'});
		}
		else {
			page.notification.show(JSON.stringify(picData.result), {hide: false});
		}
	}
	catch (e) {
		console.log(e);
		page.notification.show('Error: Could not connect to the server.');
	}

}

async function updateItem() {
	let id = page.els.itemIdInput.value;
	let store = page.els.tableStoreSelect.value;
	let num = page.els.itemNumInput.value;
	let sku = page.els.itemSkuInput.value;
	let name = page.els.itemTitleInput.value;
	let mul = page.els.itemMultipleInput.value;
	let singlemul = page.els.singleitemMultipleInput.value;
	let weight = page.els.itemWeightInput.value;
	let cartonBarcode = page.els.itemCartonBarcodeInput.value;
	let indivBarcode = page.els.itemIndivBarcodeInput.value;
	let pic = page.els.itemPhotoInput.value;

	let bay = page.els.tableBaySelect.value;
	let sat = page.els.tableSatchelSelect.value;
	let fp = document.querySelector('input[name="flatpack"]:checked').value;
	let vr = document.querySelector('input[name="vr"]:checked').value;
	let fwfp = document.querySelector('input[name="fwfp"]:checked').value;

	let formData = new FormData();
	formData.append('id', id);
	formData.append('store', store);
	formData.append('itemNo', num);
	formData.append('sku', sku);
	formData.append('itemTitle', name);
	formData.append('itemMultiple', mul);
	formData.append('singleitemMultiple', singlemul);
	formData.append('itemWeight', weight);
	formData.append('cartonBarcode', cartonBarcode);
	formData.append('indivBarcode', indivBarcode);
	formData.append('itemPhoto', pic);

	formData.append('bay', bay);
	formData.append('satchel', sat);
	formData.append('flatpack', fp);
	formData.append('vr', vr);
	formData.append('fastwayflatpack', fwfp);


	if (page.currentComboItems && page.currentComboItems.length) {
		let bundle = {};
		for (let comboItem of page.currentComboItems) {
			bundle[comboItem.id] = comboItem.quantity;
		}
		formData.append('bundle', JSON.stringify(bundle));
	}

	let response = await fetch(apiServer+'item/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let addUpdateData = await response.json();

	if (response.ok && addUpdateData.result == 'success') {	
		//document.querySelector('#image').firstChild.src = pic;
		page.notification.show("Item updated successfully.");
	}
	else {
		page.notification.show(addUpdateData.result);
	}
	
}