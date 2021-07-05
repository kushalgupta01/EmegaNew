import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener, checkLogin} from '/common/tools.js';
import {getItemDetails} from '../order-collect/js/item-details.js';


window.page = {
	//liveMessages: new LiveMessages(wsServer),
	notification: new NotificationBar(),
	orders: {},
	type: 'Purchase Order',
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
	suppliers: {},
	purchaseordersAll: {},
	purchaseorder: {},
	activeRow: null,
	activeRow2: null,
};

window.reSearch = /[-_\s]/g;
window.reSpace = /\s+/g;
window.header = ['PO Number', 'Received Date', 'Supplier', 'Store', 'SKU', 'Item Name', 'Barcode', 'Total Qty'];
window.cols = ['store', 'itemName', 'sku', 'barcode', 'orderedQty', 'location', 'receivedQty', 'image', 'newLocation'];
window.colsBay = ['location','totalQty'];

window.saleRecords = {};

if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/';
	});
	
	await loadSuppliers();
	await loadAllPurchaseOrders();
	await addToTable();

	document.querySelector('#content-purchaseorder-searchbar').addEventListener('keyup',filterPONo, false);
	document.querySelector('#box-container .close').addEventListener('click', closeBox);
	document.querySelector('#closeBaylocationtable').addEventListener('click', closeBaylocationtable);
	document.querySelector('#closeReceiveQty').addEventListener('click', closeReceiveQty);
	document.querySelector('#closeNewQty').addEventListener('click', closeNewQty);
	document.getElementById('content-po-save').addEventListener('click', savePO, false);
	document.querySelector('#content-inventory-searchbar').addEventListener('keyup', searchItem, false);

	//add Bay Details
	document.querySelector('#bay-location-add').addEventListener('click', function(e) {
		// addNewRowBayLocation(e);
	});

	//save bay details
	addListener('#bay-location-save', 'click', function(e) {
		saveBayLocationDetails(e);
	});

	//add new row
	document.querySelector('#bay-location-add').addEventListener('click', function(e) {
		addNewRowBayLocation(e);
	});

	//save new qty
	addListener('#newQty-save', 'click', function(e) {
		saveNewQuantity(e);
	});

});


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
		 console.log(data);
	}
	else {
		page.notification.show(data.result);
	}
	
}

function searchItem() {
	// console.log('11');

	let tr = document.querySelectorAll('#box-container #po-items tbody tr');
	var search = (document.querySelector('#content-inventory-searchbar input').value || '').trim();
	
	if (search) {
		let searchValues = search.split(reSpace);
		for (let sv_i = 0; sv_i < searchValues.length; sv_i++) {
			// Remove formatting
			searchValues[sv_i] = searchValues[sv_i].replace(reSearch, '').toLowerCase();
		}

		for (let i = 0; i < tr.length; i++) {
			let trText = tr[i].textContent.replace(reSearch, '').toLowerCase();

			if (includesAll(trText, searchValues)) {
				tr[i].classList.add('bg-red');
			} else {
				tr[i].classList.remove('bg-red');
			}
		}
	} 
	else {
		for (let i = 0; i < tr.length; i++) {
			tr[i].classList.remove('bg-red');
		}
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
	window.location.reload();
}

function closeBaylocationtable() {
	document.getElementById('baylocation').classList.add('hide');
	document.getElementById('purchaseOrder-details').classList.remove('hide');
}

function closeReceiveQty() {
	document.getElementById('receive-qty').classList.add('hide');
	document.getElementById('baylocation').classList.remove('hide');
}

function closeNewQty() {
	document.getElementById('new-qty').classList.add('hide');
	document.getElementById('baylocation').classList.remove('hide');
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
		console.log(po);
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

	document.querySelector('#content-inventory-searchbar input').value = '';
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


	let poDetails = data.purchaseorder;
	console.log(poDetails);

	for (let po in poDetails) {
		let poDetail = poDetails[po];

		for (let pod of poDetail) {
			console.log(pod);
			let tr = document.createElement('tr');
			tr.dataset.id = pod.id;
			tr.dataset.store = pod.store;
			tr.dataset.poNo = poNo;
			// tr.dataset.itemBarcode = pod.itemBarcode;
			// tr.dataset.sku = pod.sku;
			tr.dataset['po'] = JSON.stringify(poDetail);


			for (let col of cols) {
				let td = document.createElement('td');
				td.classList.add(col);

				if (col == 'store') {
					td.textContent = stores[pod.store].name;
				} 
				else if (col == 'itemName') {
					td.textContent = pod.itemName;
				} 
				else if (col == 'sku') {
					td.textContent = pod.sku;
				} 
				else if (col == 'barcode') {
					td.textContent = pod.itemBarcode;
				} 
				else if (col == 'orderedQty') {
					td.textContent = pod.orderedQty;
				}
				else if (col == 'receivedQty') {
					let recQtys = pod.receivedLocQty;
					if (recQtys) {
						recQtys = JSON.parse(pod.receivedLocQty);
					} else {
						recQtys = [];
					}
					let sum = 0;
					for (let i=0; i<recQtys.length; i++) {
						sum = sum + parseInt(recQtys[i].qty);
					}
					console.log(sum);
					td.textContent = sum;
				} 			
				else if (col == 'image'){
					let img = document.createElement('img');
					img.src = pod.image;
					td.appendChild(img);
				}
				else if (col == 'location') {
					var baybtn = document.createElement('input');
	        		baybtn.setAttribute('type','button');
	        		baybtn.setAttribute('class','bayDetails action-btn btn-lightseagreen');
	        		baybtn.setAttribute("style", "border-radius: 10%;");
	        		baybtn.value = "Add Location";
	        		td.appendChild(baybtn);

	        		baybtn.addEventListener("click", function(e, poDetail){
	        			// console.log('11');	
	        			page.activeRow = e.target.closest('tr');
			        	showBayLocationDetails(e, poDetail);
			        	// console.log(showBayLocationDetails(e, poDetails));
	        		});
												
				} 
				else if (col == 'newLocation') {			
	        		let select = document.createElement('select');
					select.setAttribute('id','bay');
					let recQtys = pod.receivedLocQty;
					if (recQtys) {
						recQtys = JSON.parse(pod.receivedLocQty);
					} else {
						recQtys = [];
					}
					// console.log(recQtys);
					for (let recQty of recQtys) {
						// console.log(recQty);
						let option = document.createElement('option');
						option.textContent = recQty.bay + ' : ' + recQty.qty;
						option.dataset.location = recQty.bay;
						option.dataset.qty = recQty.qty;
						select.appendChild(option);
					}

					td.appendChild(select);		
				}
				tr.appendChild(td);
			}
			itemTbody.appendChild(tr);
		}
	}
}

function showBayLocationDetails(e, poDetail) {
	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('purchaseOrder-details').classList.add('hide');
	document.getElementById('baylocation').classList.remove('hide');

	let bayLoc = document.querySelector('#baylocation');
	let baytBody = document.querySelector('#baylocation #bay-location-table-body');

	//let itemSKU = e.target.closest('tr').dataset.sku;
	let item = page.activeRow.dataset.po;
	let poNo = page.activeRow.dataset.poNo;

	if (item) {
		item = JSON.parse(item)[0];
		console.log(item);
		bayLoc.dataset.id = item.invID;
		bayLoc.dataset.sku = item.customSku;
		bayLoc.dataset.poNo = poNo;
		document.querySelector('#sku2 span').textContent = item.sku;
		document.querySelector('#itemname2 span').textContent = item.itemName;
		document.querySelector('#poNum span').textContent = poNo;

		let locations = item.locations;
		console.log(locations);
		if(locations) {
			locations = JSON.stringify(locations);
			baytBody.dataset.locations = locations;
			// console.log(locations);
		} 
		else {
			locations = [];
		}

		while (baytBody.firstChild) {
			baytBody.removeChild(baytBody.firstChild);
		}

		let cols = ['location', 'type', 'looseQty', 'receivedQty', 'addQty'];
		let colsEditable = ['looseQty'];

		locations = JSON.parse(locations);
		for(let loc of locations) {
			console.log(loc);
			let tr = document.createElement('tr');
			tr.dataset.id = loc.id;
			for (let col of cols) {
				let td = document.createElement('td');
				td.classList.add(col);

				if (col == 'location') {
					let ele = document.createElement('input');
	        		ele.setAttribute('type', 'text');
	        		ele.setAttribute('value', loc.bay);
	        		ele.setAttribute('id','bay');
	        		ele.readOnly = true;
	        		td.appendChild(ele); 
	            }
	            else if (col == 'type') {

					let select = document.createElement('select');
					select.setAttribute('id','types');

					let types = ['Pick', 'Bulk'];

					for (let type of types) {
						let option = document.createElement('option');
						option.setAttribute('value', type);
						option.textContent = type;

						select.appendChild(option);
					}
					select.value = loc['type'] ? loc['type'] : '-'; 	

					td.appendChild(select);
	            }
	            else if (col == 'looseQty') {
	            	let ele = document.createElement('input');
	        		ele.setAttribute('type', 'text');           		
	        		ele.setAttribute('value', loc.indivQty);
	        		ele.setAttribute('id','indiQty');
	        		// ele.readOnly = true;
	        		td.appendChild(ele);             	
	            }    
	            else if (col == 'receivedQty') {
	            	let ele = document.createElement('input');
	        		ele.setAttribute('type', 'text');           		
	        		ele.setAttribute('value', '');
	        		ele.setAttribute('id','receivedQty');
	        		ele.readOnly = true;
	        		td.appendChild(ele);             	
	            }  
	            else if (col == 'addQty') {
	            	let editvalBtn = document.createElement('input');
					editvalBtn.setAttribute('type', 'button');
	            	editvalBtn.setAttribute('value', '✏️');
	            	editvalBtn.setAttribute('class','editValue');
	            	td.appendChild(editvalBtn); 

	            	editvalBtn.addEventListener("click", function(e){
	            		page.activeRow2 = e.target.closest('tr');
	            		addReceiveQty(e, poDetail);
	            	});
	            }	
	             else {
	            	td.textContent = "" ;        
	            }
	            tr.appendChild(td);
	        }
	        baytBody.appendChild(tr);
	    }

	}
		
}

function addReceiveQty(e, poDetail) {

	document.getElementById('box-outer').classList.add('flex');
	// document.getElementById('purchaseOrder-details').classList.add('hide');	
	document.getElementById('baylocation').classList.add('hide');
	document.getElementById('receive-qty').classList.remove('hide');

	let item = page.activeRow2.dataset.po;

	if (item) {
		item = JSON.parse(item);
		console.log(item);
		let receQty = document.querySelector('#receive-qty');
		receQty.dataset.id = item;
	}
	let tr = e.target.parentNode.parentNode;

	let bay = tr.querySelector('#bay').value;
	document.querySelector('#existingBay').value = bay;	

	let qty = tr.querySelector('#indiQty').value;
	document.querySelector('#existingQty').value = qty;	

	document.querySelector('#newQty').value = '';
	
	let qtySaveBtn = document.querySelector('#qty-save');

	qtySaveBtn.addEventListener("click", function(e) {
		// console.log('11');	

		document.querySelector('#existingQty').value = qty;	
		let existingQty = parseInt(e.target.parentNode.querySelector('#existingQty').value);
		let receiveQty = parseInt(document.querySelector('#newQty').value);

		if (!receiveQty) {
			let receiveQtyfeed = document.querySelector('#newQty-feedback');
			receiveQtyfeed.textContent = "Please fill here.";
			receiveQtyfeed.classList.remove('hide');
			return;
		} 
		let totalQty = existingQty + receiveQty;
		// console.log(totalQty);

		page.activeRow2.querySelector('#indiQty').value = totalQty;
		page.activeRow2.querySelector('#receivedQty').value = receiveQty;

		document.getElementById('baylocation').classList.remove('hide');
		document.getElementById('receive-qty').classList.add('hide');

	});
}

async function saveBayLocationDetails(e) {

	let bayLoc = document.querySelector('#baylocation');
	let bayTab =  document.querySelector('#bay-location-table-body');
	let trs = bayTab.querySelectorAll('tr:not(.hide)');

	let itemTabTrs = page.activeRow;

	let locations = [];
	let invID = bayLoc.dataset.id;
	let customSku =  bayLoc.dataset.sku;
	let poNo = bayLoc.dataset.poNo;
	let indivQtys ;

	for(let tr of trs) {
		let location = {};
		location.id = tr.dataset.id;
		location.indivQty =  parseInt(tr.querySelector('#indiQty').value);
		location.bay =  tr.querySelector('#bay').value;
		location.type = tr.querySelector('#types').value;
	 	locations.push(location);
	 	console.log(locations);
	}

	
	let locationsReceived = [];
	for (let tr_i = 0; tr_i < trs.length; tr_i++) {

		let locationReceived = [];
		let tableRow = trs[tr_i];
		let tds = tableRow.querySelectorAll('td');
		if(tds[3].firstChild.value == '' || !tds[3].firstChild.value) continue;

		// Save each value
		for (let td_i = 0; td_i < tds.length - 1; td_i++) {
			if (td_i == 0) {
				locationReceived.push(tds[td_i].firstChild.value);
			} 
			else if (td_i == 3) {				
				let td = tds[td_i];		
				locationReceived.push(td.firstChild.value);
				// console.log(td.firstChild.value);					
			} 	
		}
		locationsReceived.push(locationReceived);
		console.log(locationsReceived);

	}

	let select = itemTabTrs.querySelector('#bay');
	let locsReceived = [];
	for (let locre of locationsReceived) {
		let locReceived = {};
		let option = document.createElement('option');
		option.textContent = locre[0] + ' : ' + locre[1];
		option.dataset.location = locre[0];
		option.dataset.qty = locre[1];
		select.appendChild(option);
		
		locReceived.bay = locre[0];
		locReceived.qty = locre[1];

		locsReceived.push(locReceived);
	}

	let totalReceivedQtys = 0;

	for (let option of select.querySelectorAll('option')) {
		totalReceivedQtys = totalReceivedQtys + parseInt(option.dataset.qty);
	}

	itemTabTrs.querySelector('.receivedQty').innerHTML = totalReceivedQtys;
	// console.log(totalReceivedQtys);

	let formData = new FormData();

	formData.append('receivedLocQty', JSON.stringify(locsReceived));
	formData.append('poNo',poNo);
	formData.append('invID',invID);
	formData.append('customSku',customSku);
	formData.append('locations',JSON.stringify(locations));

	let response = await fetch(apiServer+'stockInventoryLocation/update', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let responseData = await response.json();

	if (!response.ok || responseData.result != 'success') {	
		page.notification.show(responseData.result);
	} else {
		page.notification.show("Updated..");
		// document.getElementById('box-outer').classList.add('flex');
		document.getElementById('baylocation').classList.add('hide');
		document.getElementById('purchaseOrder-details').classList.remove('hide');

		let inventoryDetail = responseData.data;
		let location = inventoryDetail.locations;
		// console.log(location);
		page.activeRow.dataset.locations = JSON.stringify(location);
		while (bayTab.firstChild) {
			bayTab.removeChild(bayTab.firstChild);
		}

		let cols = ['location', 'type', 'looseQty', 'receivedQty', 'addQty'];

	// let colsEditable = ['looseQty'];

		for(let loc of location) {
			let tr = document.createElement('tr');
			tr.dataset.id = loc.id;
			for (let col of cols) {
				let td = document.createElement('td');
				td.classList.add(col);

				if (col == 'location') {

					let ele = document.createElement('input');
	        		ele.setAttribute('type', 'text');
	        		ele.setAttribute('value', loc.bay);
	        		ele.setAttribute('id','bay');
	        		ele.readOnly = true;
	        		td.appendChild(ele); 

	            }
	            else if (col == 'type') {
	            	let select = document.createElement('select');
					select.setAttribute('id','types');

					let types = ['Pick', 'Bulk'];

					for (let type of types) {
						let option = document.createElement('option');
						option.setAttribute('value', loc.type);
						option.textContent = type;

						select.appendChild(option);
					}
					select.value = loc['type'] ? loc['type'] : '-'; 	

					td.appendChild(select);
	            }
	            else if (col == 'looseQty') {

	            	let ele = document.createElement('input');
	        		ele.setAttribute('type', 'text');           		
	        		ele.setAttribute('value', loc.indivQty);
	        		ele.setAttribute('id','indiQty');
	        		ele.readOnly = true;
	        		td.appendChild(ele);             	

	            }    
	            else if (col == 'receivedQty') {

	            	let ele = document.createElement('input');
	        		ele.setAttribute('type', 'text');           		
	        		ele.setAttribute('value', '');
	        		ele.setAttribute('id','receivedQty');
	        		ele.readOnly = true;
	        		td.appendChild(ele);             	

	            }    
	            else if (col == 'addQty') {
	            	let editvalBtn = document.createElement('input');
					editvalBtn.setAttribute('type', 'button');
	            	editvalBtn.setAttribute('value', '✏️');
	            	editvalBtn.setAttribute('class','editValue');
	            	td.appendChild(editvalBtn); 

	            	editvalBtn.addEventListener("click", function(e){
	            		page.activeRow2 = tr;
	            		addReceiveQty(e, inventorys);
	            	});
	            }	
	            else {
	            	td.textContent = "" ;        
	            }
	            tr.appendChild(td);
			}
			bayTab.appendChild(tr);
		}
	}
	
}


function addNewRowBayLocation(e) {

	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('baylocation').classList.add('hide');
	document.getElementById('new-qty').classList.remove('hide');

	document.querySelector('#newBay').value = '';
	document.querySelector('#new-qty #newQty').value = '';

	let baytBody = document.querySelector('#bay-location-table-body');
	let trs = baytBody.querySelectorAll('tr');
	// console.log(trs);

}

function saveNewQuantity(e) {

	let send = true;
	let newBay = document.querySelector('#newBay').value;
	let newQty = document.querySelector('#new-qty #newQty').value;
	// let newType = document.querySelector('#types').value;
	console.log(newQty);

	if (!newBay && !newQty) {
		send = false;
	}

	if (!send) {
		page.notification.show('please fill in the required fields.');
		return;
	} 
	else {

		document.getElementById('baylocation').classList.remove('hide');
		document.getElementById('new-qty').classList.add('hide');

		let bayTab = document.getElementById('bay-location-table-body');
		let cols = ['location', 'type', 'looseQty', 'receivedQty', 'addQty'];
		//console.log(bayTab);
		let rowCnt = bayTab.rows.length;
		//console.log(rowCnt);
		let tr = bayTab.insertRow(rowCnt);
		//console.log(tr);

		for (let c = 0; c < cols.length; c++) {
			let td = document.createElement('td'); 
			td = tr.insertCell(c);
			//console.log(td);

			// if (c == 0) {  
			// 	let input = document.createElement('input');
			// 	input.setAttribute('type', 'checkbox');
			// 	input.setAttribute('class', 'selected');
			// 	input.autocomplete = 'off';
			// 	td.appendChild(input);         
			// }
			if(c == 0) {
				let ele = document.createElement('input');
	        	ele.setAttribute('type', 'text');
	            ele.setAttribute('value', 'EMG-' + newBay);
	            ele.setAttribute('id','bay');
	            td.appendChild(ele);
	            ele.readOnly = true;
	            td.setAttribute('class','location');
			}	
			else if (c == 1){			
	      //   	let ele = document.createElement('input');
	    		// ele.setAttribute('type', 'text');           		
	    		// ele.setAttribute('value', newType);
	    		// ele.setAttribute('id','indiQty');
	    		// ele.readOnly = true;
	    		// td.appendChild(ele);   


	    		let select = document.createElement('select');
				select.setAttribute('id','types');

				let types = ['Pick', 'Bulk'];

				for (let type of types) {
					let option = document.createElement('option');
					option.setAttribute('value', type);
					option.textContent = type;

					select.appendChild(option);
				}
				// select.value = loc['type'] ? loc['type'] : '-'; 	

				td.appendChild(select);


			} 	
			else if (c == 2){			
	        	let ele = document.createElement('input');
	    		ele.setAttribute('type', 'text');           		
	    		ele.setAttribute('value', newQty);
	    		ele.setAttribute('id','indiQty');
	    		ele.readOnly = true;
	    		td.appendChild(ele);    		
			} 
			else if (c == 3){			
	        	let ele = document.createElement('input');
	    		ele.setAttribute('type', 'text');           		
	    		ele.setAttribute('value', newQty);
	    		ele.setAttribute('id','receivedQty');
	    		ele.readOnly = true;
	    		td.appendChild(ele);    		
			} 		
			else if (c == 4) {

	   			let reBtn = document.createElement('input');
				reBtn.setAttribute('type', 'button');
	            reBtn.setAttribute('value', '🗑️');  
	            reBtn.setAttribute('id','removeRow');  

		            reBtn.addEventListener("click", function(e){        		
		        		removeRowsBayLocation(e);       			
		        	});


	            td.appendChild(reBtn);
				td.setAttribute('class','Actions');
			}	
			tr.appendChild(td);
		}
		bayTab.appendChild(tr);
	}
}

function removeRowsBayLocation(e) {

	let res = confirm("Are you sure want to remove ?");
	if(res == true) {

		let bayTab =  document.querySelector('#bay-location-table-body');
		let trs = bayTab.querySelectorAll('tr');

		let tr = e.target.parentNode.parentNode;
		bayTab.removeChild(tr);	
	}
}

async function savePO() {

	let isSave = await swal({
	   	title: 'Are you sure want to save?',
	   	text: "You won't be able to revert this!",
	   	icon: 'warning',
	   	buttons: [
       		'No, cancel it!',
        	'Yes, I am sure!'
      	],
      	dangerMode: true,
	}).then(function(isConfirm) {
	   if (isConfirm) {	    	
	   		return true;
	    } else {
	    	return false;
	    }
	})

	if (!isSave) {
		return;
	}

	let send = true;
 	let formData = new FormData();

 	let poNo = document.querySelector('#poNo span').textContent;
 	console.log(poNo);

 	let fullname = document.querySelector('#sname span').textContent;
	console.log(fullname);

	var table = document.querySelector('#box-container #po-items');
	var tableBody = table.querySelector('tbody');
	var tableBodyTr = tableBody.querySelectorAll('tr:not(.hide)');

	let itemBayQtys = [];
	// let hasQuantity = true;

	for (let tr_i = 0; tr_i < tableBodyTr.length; tr_i++) {
		let tableRow = tableBodyTr[tr_i];

		let invID = tableRow.dataset.id;
		let store = tableRow.dataset.store;

		let quantity = tableRow.querySelector('[class="receivedQty"]').textContent;
		console.log(quantity);
		// if (quantity == '' || isNaN(quantity) || quantity == 0) {
		// 	hasQuantity = false;
		// }

		let orderedQty = tableRow.querySelector('[class="orderedQty"]').textContent;

		let tds = tableRow.querySelectorAll('td');
	
		let td = tds[8];
		let options = td.querySelectorAll('option');
		console.log(options.length);
		if (options.length>0) {
			for (let option of options) {
				let bay = option.dataset.location;
				let indivQty = option.dataset.qty;
				itemBayQtys.push([invID,bay,indivQty,store,orderedQty]);
			}
		} else {
			itemBayQtys.push([invID,'',0,store,orderedQty]);
		}
								
	}

	// if (!hasQuantity) {
	// 	send = false;
	// 	let quantityfeed = document.querySelector('#item-quan-feedback');
	// 	quantityfeed.textContent = 'Invalid quantities';
	// 	quantityfeed.classList.remove('hide');
	// }

	let createdBy = page.user.firstname +  ' ' + page.user.lastname;
	// console.log(createdBy);

	formData.append('poNo', poNo);
	formData.append('supplierName', fullname);
	formData.append('itemBayQtys', JSON.stringify(itemBayQtys));
	formData.append('createdBy', createdBy);
	formData.append('pageType', page.type);

	let response = await fetch(apiServer+'receiveOrders', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let createOrderData = await response.json();

	if (response.ok && createOrderData.result == 'success') {		
		page.notification.show("Order added successfully.");
		document.getElementById('box-outer').classList.remove('flex');
		document.getElementById('purchaseOrder-details').classList.add('hide');		
		location.reload();
	}
    else {
    	page.notification.show(createOrderData.result);
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
		}		
	}

	let maxLocs = 0;
	for (let sku in orderData) {
		
		let skuData = orderData[sku];
		let title = orderData[sku]['title'];
		let store = orderData[sku]['store'];
		let barcode = orderData[sku]['barcode'];
		let date = orderData[sku]['date'];
		let locations = orderData[sku]['locations'];

		if (maxLocs<Object.keys(locations).length) {
			maxLocs = Object.keys(locations).length;
			console.log(maxLocs);
		}

		let orderRow = [poNum, date, fullname, store, sku, title, barcode, Object.values(locations).reduce((a,b)=>a+b)];
		
		for (let location in locations) {
			orderRow.push(location);
			
			orderRow.push(locations[location]);
		}
		orderRows.push(orderRow);
	}

	headerRow = window.header;
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