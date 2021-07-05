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
};


if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});
	
	page.els.itemStoreSelect = document.querySelector('#item-store');

	
	let itemStoreSelect = page.els.itemStoreSelect;

	for (let store in stores) {
		let storeOption = document.createElement('option');
		storeOption.value =  store;
		storeOption.textContent = stores[store];
		itemStoreSelect.appendChild(storeOption);
	}


	document.querySelector('#item-add').addEventListener('click', addItem, false);
	//document.querySelector('#barcode-scan').addEventListener('click', scan, false);

	
});

async function addItem() {
	clearFeedback();
	let send = true;
	let formData = new FormData();
	let store = document.querySelector('#item-store').value;
	if (store == '-') {
		send = false;
		let storefeed = document.querySelector('#store-feedback');
		storefeed.textContent = 'Please choose a store.';
		storefeed.classList.remove('hide');
	}

	formData.append('store', store);


	let itemNum = document.querySelector('#itemNum').value;
	
	if (itemNum == '') {
		send = false;
		let itemNumfeed = document.querySelector('#itemNum-feedback');
		itemNumfeed.textContent = 'Please fill in Item Number.';
		itemNumfeed.classList.remove('hide');
	}

	formData.append('itemNum', itemNum);

	let sku = document.querySelector('#sku').value;
	
	if (sku == '') {
		send = false;
		let skufeed = document.querySelector('#sku-feedback');
		skufeed.textContent = "Please fill in Sku.";
		skufeed.classList.remove('hide');
	}

	formData.append('sku', sku);

	let itemTitle = document.querySelector('#itemTitle').value;
	
	if (itemTitle == '') {
		send = false;
		let itemTitlefeed = document.querySelector('#itemTitle-feedback');
		itemTitlefeed.textContent = "Please fill in Item Title.";
		itemTitlefeed.classList.remove('hide');
	}

	formData.append('itemTitle', itemTitle);

	let itemMultiple = document.querySelector('#itemMultiple').value;

	if (isNaN(parseInt(itemMultiple))) {
		send = false;
		let itemMultiplefeed = document.querySelector('#itemMultiple-feedback');
		itemMultiplefeed.textContent = "Please fill in a number.";
		itemMultiplefeed.classList.remove('hide');
	}

	formData.append('itemMultiple', itemMultiple);


	let barcode = document.querySelector('#barcode').value;
	
	if (barcode == '') {
		send = false;
		let barcodefeed = document.querySelector('#barcode-feedback');
		barcodefeed.textContent = "Please fill in barcode.";
		barcodefeed.classList.remove('hide');
	}

	formData.append('barcode', barcode);


	let itemPhoto = document.querySelector('#itemPhoto').value;
	let files = document.getElementById('itemPhotoFile').files;

	let file;
	let extName;
	let filePath;
	if (files.length>0) {
		file = files[0];
		extName = file.name.split('.').slice(-1)[0];
		filePath = 'img-'+store+'-'+itemNum+'-'+sku+'.'+extName;
	}
	
	
	if (itemPhoto=='' && files.length==0) {
		send = false;
		let itemPhotofeed = document.querySelector('#itemPhoto-feedback');
		itemPhotofeed.textContent = "Please fill in itemPhoto url or select a photo.";
		itemPhotofeed.classList.remove('hide');
	}else if (itemPhoto != '') {
		formData.append('itemPhoto', itemPhoto);
	}else {
		
		formData.append('itemPhoto', filePath);
	}

	

	if (!send) {
		page.notification.show("Please complete the form.");
		return;
	}else{
		clearForm();
	}

	let response = await fetch(apiServer+'additem', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let addItemData = await response.json();

	if (response.ok && addItemData.result == 'success') {		
		page.notification.show("Item added successfully.");
	}
	else {
		page.notification.show(addItemData.result);
	}

	if (files.length>0 && itemPhoto=='') {
		try {
			
			let formData2 = new FormData();

			formData2.append('name', filePath);
			formData2.append('file', file);
			
			let response2 = await fetch(apiServer+'upload', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData2});

			let picData = await response2.json();

			if (!response2.ok) {
				if (picData.result) {
					page.notification.show('Error: '+JSON.stringify(picData.result), {hide: false});
				}
				else {
					page.notification.show('Error: Could not upload the picture.', {hide: false});
				}
			}

			if (picData.result == 'success') {
				page.notification.show('The pic has been uploaded.', {background: 'bg-lgreen'});
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
	document.querySelector('#item-store').value = '-';
	document.querySelector('#itemNum').value = '';
	document.querySelector('#sku').value = '';
	document.querySelector('#itemTitle').value = '';
	document.querySelector('#itemMultiple').value = '';
	document.querySelector('#barcode').value = '';
	document.querySelector('#itemPhoto').value = '';
	document.getElementById('itemPhotoFile').value = '';
}

