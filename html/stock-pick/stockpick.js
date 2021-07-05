import '/order-collect/js/config.js';
import { NotificationBar } from '/common/notification.js';
//import { apiServer,  apiServerLocal} from '/common/api-server.js';
import { addListener, removeListener, getDateValue, getQueryValue, checkLogin } from '/common/tools.js';

window.page = {
	//liveMessages: new LiveMessages(wsServer),
	notification: new NotificationBar(),
	orders: {},
	type: 'Receive Stock',
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
	activeRow: null,
	activeRow2: null,
	activeRow3: null,
};

window.stocks = {};
window.saleRecords = {};
window.cols = ['store', 'title', 'sku', 'barcode', 'cartonBarcode', 'looseQty', 'location', 'image', 'type', 'newLocation'];
window.selectCols = ['store', 'title', 'sku', 'barcode', 'location', 'existingLocation', 'image'];

// window.colsEditable = ['looseQty', 'newLocation'];
window.colsBay = ['location','totalQty'];
window.header = ['Created Date', 'Store', 'Title', 'SKU', 'Barcode', 'Carton Barcode', 'Total Qty', 'PO Number', 'Type'];
if (page.local) {
	apiServer = apiServerLocal;
}

const apiUrl = apiServer;

document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/inventory/inventorymanagement.html';
	});

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


	var barcodeScanner = {
        value: '',
        startTime: null,
        timer: null,
        timeLimit: 600,
    };

    let storeSelect = document.querySelector("#supplier-store");
    // let option = document.createElement('option');
    // option.value = '-';
    // option.textContent = '-';
    // storeSelect.appendChild(option);

    for (let store in stores) {
    	if (['1','2','3','4','6','7','9','15','21','30','31','32','33','34','41','51','61','62','63','71','81','91','74',].includes(store)) continue;
        let option = document.createElement('option');
        option.value = store;
        option.textContent = stores[store].name;
        storeSelect.appendChild(option);
    }

    let checkboxValue = document.querySelector('#type-select input[name="sts"]:checked').value;
	// console.log(checkboxValue);
	if (checkboxValue == 'Loose') {
		document.getElementById('content-orders-receive').disabled = false;
		document.getElementById('content-orders-receive-container').disabled = true;
		document.getElementById('content-orders-receive-receiving').disabled = true;
	} 

	document.addEventListener('keypress', async function(e) {
        if (e.charCode == 13 || e.charCode == 0) { // 13, 0; Enter key
            e.preventDefault();
            e.stopPropagation();

            clearTimeout(barcodeScanner.timer);
            barcodeScanner.timer = null;
            console.log(barcodeScanner.value);
            if (!!barcodeScanner.value){
            	if (barcodeScanner.value.trim()==""){barcodeScanner.value = '';return;};
	            let formData = new FormData();
	            formData.append('scanned', barcodeScanner.value);
	           

	            let response = await fetch(apiUrl+'inventory/search', {method: 'post', headers: {'DC-Access-Token': localStorage.getItem('usertoken')}, body: formData});
	            let data = await response.json();
	            if (data.result == 'success') {
	                let inventorys = data.data;
	                await addToTable(inventorys);
	                // await addToBayTable(inventorys);
	                
	            }else{
	                page.notification.show(data.result, {hide: false});
	            }
	            

	            barcodeScanner.value = ''; // Reset barcode scanner value
	        }
        	else{
        		barcodeScanner.value = '';
        		return;
        	}
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
	
	document.querySelector('#content-order-summary table thead th.selected-all').addEventListener('click', selectAllOrders, false);
	document.querySelector('#content-order-summary table thead th.selected-all input').addEventListener('change', selectAllOrders, false);
	document.getElementById('content-stock-pick').addEventListener('click', pickStock, false);
	document.getElementById('content-delete-selected').addEventListener('click', deleteSelected, false);
	// document.getElementById('content-orders-save').addEventListener('click', saveDocument, false);
	document.getElementById('content-orders-receive').addEventListener('click', receiveLooseOrders, false);
	document.getElementById('content-orders-receive-container').addEventListener('click', receiveContainerOrders, false);
	document.getElementById('content-orders-receive-receiving').addEventListener('click', receiveReceivingOrders, false);
	document.querySelector('#box-container .close').addEventListener('click', closeBox);
	document.querySelector('#type-select .checkbox').addEventListener('click', getCheckboxValue);
	// document.querySelector('#baylocationtable thead th.selected-all').addEventListener('click', selectAllOrders2, false);
	// document.querySelector('#baylocationtable thead th.selected-all input').addEventListener('change', selectAllOrders2, false);
	document.querySelector('#content-inventory-searchbar .search').addEventListener('click', searchInventory, false)

	//add new row to table
	document.querySelector('#stage-location-add').addEventListener('click', function() {
		addNewRowStageLocation();
	});

	document.querySelector('#bay-location-add').addEventListener('click', function(e) {
		addNewRowBayLocation(e);
	});

	//save Bay details
	addListener('#bay-location-save', 'click', function(e) {
		saveBayLocationDetails(e);
	});

	addListener('#stage-location-save', 'click', function(e) {
		saveStageLocationDetails(e);
	});

	addListener('#newQty-save', 'click', function(e) {
		saveNewQuantity(e);
	});

	addListener('#orderItems-add', 'click', function(e) {
		addSelectedItem(e);
	});


});

async function searchInventory() {
	getCheckboxValue();
	stocks = {};

	var searchValue = document.querySelector('#content-inventory-searchbar input').value;
	if (!!searchValue){
	    if (searchValue.trim()==""){return};
		var searchType = document.querySelector('#content-inventory-searchfield input[name="searchfield"]:checked').value;

		let formData = new FormData();
	    formData.append('searchValue', searchValue);
	   	formData.append('searchType', searchType);

	    let response = await fetch(apiUrl+'inventory/search', {method: 'post', headers: {'DC-Access-Token': localStorage.getItem('usertoken')}, body: formData});
	    
		let data = await response.json();
	    if (data.result == 'success') {
	        let inventorys = data.data;
	        for (let inv of inventorys) {
	        	stocks[inv.id] = inv;
	        }
	        // console.log(inventorys);
	        await addToTable(inventorys);
	        document.querySelector('#content-inventory-searchbar input').value = '';
	        
	    }else{
	        page.notification.show(data.result, {hide: false});

	    }
	}

}

function getCheckboxValue() {

	let checkboxValue = document.querySelector('#type-select input[name="sts"]:checked').value;
	// console.log(checkboxValue);
	if (checkboxValue == 'Loose') {
		document.getElementById('content-orders-receive').disabled = false;
		document.getElementById('content-orders-receive-container').disabled = true;		
		document.getElementById('content-orders-receive-receiving').disabled = true;
	} 
	else 
	if (checkboxValue == 'Container') {
		document.getElementById('content-orders-receive-container').disabled = false;
		document.getElementById('content-orders-receive').disabled = true;
		document.getElementById('content-orders-receive-receiving').disabled = true;
	}
	else 
	if (checkboxValue == 'Receiving') {

		document.getElementById('content-orders-receive-receiving').disabled = false;
		document.getElementById('content-orders-receive').disabled = true;
		document.getElementById('content-orders-receive-container').disabled = true;

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

function selectAllOrders2(e) {
	var tagIsInput = e.target.tagName.toLowerCase() == 'input';
	if (!tagIsInput) e.target.firstChild.checked = !e.target.firstChild.checked;

	var checked = tagIsInput ? e.target.checked : e.target.firstChild.checked;

	if (checked) {
		// Select
		let tableBodyTrs = document.querySelector('#bay-location-table-body').querySelectorAll('table tbody tr:not(.hide)');
		for (let tr of tableBodyTrs) {
			tr.firstChild.firstChild.checked = true;
		}
	}
	else {
		// De-select
		let tableBodyTrs = document.querySelector('#bay-location-table-body').querySelectorAll('table tbody tr');
		for (let tr of tableBodyTrs) {
			tr.firstChild.firstChild.checked = false;
		}
	}
}

// Save document for upload
function saveDocument() {
	var table = document.querySelector('#content-container #order-items');
	var tableBody = table.querySelector('tbody');
	var tableBodyTr = tableBody.querySelectorAll('tr:not(.hide)');
	var tableHeaderTh = table.querySelectorAll('thead th');
	var orderRows = [];
	var headerRow = [];
	var requiredCols = {};
	var excludedCols = {};
	var orderRequiredCols = {};
	var orderNamesValid = true;
	var send = true;

	let poNum = document.querySelector('#supplier-poNum').value;
	 	if(!poNum) {
	 		send = false;
			let poNumfeed = document.querySelector('#poNum-feedback');
			poNumfeed.classList.remove('hide');
			poNumfeed.textContent = 'Please enter your PO Number.';		
	 	}

	let fullname = document.querySelector('#supplier-fullname').value;
		if (!fullname) {
			send = false;
			let fullnamefeed = document.querySelector('#fullname-feedback');
			fullnamefeed.textContent = 'Please enter supplier Name.';
			fullnamefeed.classList.remove('hide');
		}

	let date = document.querySelector('#received-date').value;	
		if (date == '') {
			send = false;
			let datefeed = document.querySelector('#date-feedback');
			datefeed.textContent = "Please choose a date.";
			datefeed.classList.remove('hide');
		}

 	let quantity = document.querySelector('[class="looseQty"]').textContent;
	if (quantity == '' || isNaN(quantity) || quantity == 0) {
		send = false;
		page.notification.show('Invalid quantities.');
		return;
	}

	if (!send) {
		page.notification.show('please complete the form.');
		return;
	}

	// Get indices of columns that should be excluded
	{
		
		headerRow = window.header;
		for (let i=1; i<15; i++) {
			headerRow.push('Location'+i);
			headerRow.push('Qty'+i);
		}
		orderRows.push(headerRow);
	}

	if (!tableBodyTr.length) {
		page.notification.show('No order have been added.');
		return;
	}

	// Get each row's data
	for (let tr_i = 0; tr_i < tableBodyTr.length; tr_i++) {
		let tableRow = tableBodyTr[tr_i];
		let tds = tableRow.querySelectorAll('td');
		let orderRow = [];

		// Save each value
		for (let td_i = 1; td_i < tds.length; td_i++) {
			if (td_i==1) {
				orderRow.push(date);
				let td = tds[td_i];
				orderRow.push(td.textContent);
			}
			else if (td_i==7 || td_i==8) {
				continue;
			} else if (td_i==9) {
				orderRow.push(poNum);
				let td = tds[td_i];
				orderRow.push(td.textContent);
			} else if (td_i==10) {
				let td = tds[td_i];
				let options = td.querySelectorAll('option');
				for (let option of options) {
					orderRow.push(option.dataset.location);
					orderRow.push(option.dataset.qty);
				}
				
			} else {
				let td = tds[td_i];
			    orderRow.push(td.textContent);
			}
			
		}

		// Save the row
		orderRows.push(orderRow);
	}

	//console.log(orderRows);
	// Create document for upload
	createTemplate(orderRows);
		
	getCheckboxValue();
}

function createTemplate(orderRows) {
	//console.log(orderRows);
	var workbook = XLSX.utils.book_new();
	var worksheet = XLSX.utils.aoa_to_sheet(orderRows);
	XLSX.utils.book_append_sheet(workbook, worksheet, page.type + '_template');
	XLSX.writeFile(workbook, page.type+'-'+getDateValue(new Date())+'.xlsx');
}


function addToTable(inventorys) {
	if (inventorys.length == 1) {
		let inventoryDetail = inventorys[0];
		// let loc = inventoryDetail.locations;
		// console.log(loc);
		// console.log(inventoryDetail);

		let tbody = document.querySelector('#order-items tbody');
		let trs = document.querySelectorAll('#order-items tbody tr');

		let existStock = false;
		for (let tr of trs) {
			if (tr.dataset.invid == inventoryDetail.id) {
				//console.log(tr.dataset.invid == inventoryDetail.id);
				existStock = true;
				// let currentlooseQty = parseInt(tr.querySelector('.looseQty').textContent);
				// tr.querySelector('.looseQty').textContent =  currentlooseQty + 1;
				tr.classList.add('bg-red');
				break;
			}
			else {
				tr.classList.remove('bg-red');
			}
		}

		if (!existStock) {

			let checkboxValue = document.querySelector('#type-select input[name="sts"]:checked').value;
			// console.log(checkboxValue);
			if (checkboxValue == 'Loose') {
				document.getElementById('content-orders-receive').disabled = false;
				document.getElementById('content-orders-receive-container').disabled = true;		
				document.getElementById('content-orders-receive-receiving').disabled = true;


				let tr = document.createElement('tr');
				tr.dataset.invid = inventoryDetail.id;
				for (let attr in inventoryDetail) {
					tr.dataset[attr] = typeof inventoryDetail[attr] != "string" ? JSON.stringify(inventoryDetail[attr]) : inventoryDetail[attr];
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
					// if (colsEditable.includes(col)) {
					// 	td.contentEditable = true;
					// }
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
						case 'cartonBarcode':
							text = inventoryDetail.cartonBarcode;
							break;
						case 'type':
							text = document.querySelector('#type-select form').elements['sts'].value;
							break;
						default:
							text = '';
					}

					if (col == 'image') {
						let img = document.createElement('img');
						img.src = inventoryDetail.image;
						td.appendChild(img);
					} 
					else if (col == 'location') {
						var baybtn = document.createElement('input');
		        		baybtn.setAttribute('type','button');
		        		baybtn.setAttribute('class','bayDetails action-btn btn-lightseagreen');
		        		baybtn.setAttribute("style", "border-radius: 10%;");
		        		baybtn.value = "Add Location";
		        		td.appendChild(baybtn);

		        		baybtn.addEventListener("click", function(e){
		        			// console.log('11');
		        			page.activeRow = e.target.closest('tr');
		        			showBayLocationDetails(e, inventorys);       			
		        		});
													
					} 
					else if (col == 'newLocation') {			
		        		let select = document.createElement('select');
						select.setAttribute('id','bay');

						/*let locs = inventoryDetail.locations;
						// console.log(locs);					

						for (let loc of locs) {
							let totalQty = loc.indivQty + loc.cartonQty * inventoryDetail.quantityPerCarton;

							let option = document.createElement('option');
							option.setAttribute('value', loc.id);
							// option.textContent = loc.bay + ' - ' + totalQty;			
							option.textContent = '';			
							select.appendChild(option);
						}*/
						td.appendChild(select);		
					}
					else {
						td.textContent = text || '';					
					}

					tr.appendChild(td);
				}
				tbody.appendChild(tr);
			} 
			else 
			if (checkboxValue == 'Container') {
				document.getElementById('content-orders-receive-container').disabled = false;
				document.getElementById('content-orders-receive').disabled = true;
				document.getElementById('content-orders-receive-receiving').disabled = true


				let tr = document.createElement('tr');
				tr.dataset.invid = inventoryDetail.id;
				for (let attr in inventoryDetail) {
					tr.dataset[attr] = typeof inventoryDetail[attr] != "string" ? JSON.stringify(inventoryDetail[attr]) : inventoryDetail[attr];
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
					// if (colsEditable.includes(col)) {
					// 	td.contentEditable = true;
					// }
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
						case 'cartonBarcode':
							text = inventoryDetail.cartonBarcode;
							break;
						// case 'looseQty':
						// 	text = '0';
						// 	break;
						case 'type':
							text = document.querySelector('#type-select form').elements['sts'].value;
							break;
						default:
							text = '';
					}

					if (col == 'image') {
						let img = document.createElement('img');
						img.src = inventoryDetail.image;
						td.appendChild(img);
					} 
					else if (col == 'location') {

						var baybtn = document.createElement('input');
		        		baybtn.setAttribute('type','button');
		        		baybtn.setAttribute('class','bayDetails action-btn btn-lightseagreen');
		        		baybtn.setAttribute("style", "border-radius: 10%;");
		        		baybtn.value = "Add Location";
		        		td.appendChild(baybtn);

		        		baybtn.addEventListener("click", function(e){
		        			// console.log('11');
		        			page.activeRow = e.target.closest('tr');
		        			showStagingLocationDetails(e);       			
		        		});							
					} 
					else if (col == 'newLocation') {
						
		    			let select = document.createElement('select');
						select.setAttribute('id','bay');
						td.appendChild(select);	

					}
					else {
						td.textContent = text || '';					
					}

					tr.appendChild(td);
				}
				tbody.appendChild(tr);
			}
			else if(checkboxValue == 'Receiving') {
				document.getElementById('content-orders-receive-receiving').disabled = false;
				document.getElementById('content-orders-receive').disabled = true;
				document.getElementById('content-orders-receive-container').disabled = true;

				document.querySelector('.location').style.display = 'none';
				document.querySelector('.quantity').innerHTML = 'Ordered Qty';
				document.querySelector('.newLocation').style.display = 'none';

				let cols2 = ['store', 'title', 'sku', 'barcode', 'cartonBarcode','quantity' ,'image', 'type'];
				let tr = document.createElement('tr');
				tr.dataset.invid = inventoryDetail.id;
				for (let attr in inventoryDetail) {
					tr.dataset[attr] = typeof inventoryDetail[attr] != "string" ? JSON.stringify(inventoryDetail[attr]) : inventoryDetail[attr];
				}
				let td = document.createElement('td'), input = document.createElement('input');
				td.className = 'selected';
				input.type = 'checkbox';
				input.autocomplete = 'off';
				td.appendChild(input);
				tr.appendChild(td);
				for (let col of cols2) {
					let td = document.createElement('td');
					td.classList.add(col);
					// if (colsEditable.includes(col)) {
					// 	td.contentEditable = true;
					// }
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
						case 'cartonBarcode':
							text = inventoryDetail.cartonBarcode;
							break;
						case 'type':
							text = document.querySelector('#type-select form').elements['sts'].value;
							break;
						default:
							text = '';
					}

					if (col == 'image') {
						let img = document.createElement('img');
						img.src = inventoryDetail.image;
						td.appendChild(img);
					} else if (col == 'quantity') {
						td.contentEditable = true;
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
	else {
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

async function addSelectedItem(e) {
	let searchTableBody = document.querySelector('#order-stock-items tbody');
	let itemTrs = searchTableBody.querySelectorAll('tr');

	for (let itemTr of itemTrs) {
		if (itemTr.querySelector('.selected input').checked == true) {
			await addToTable([inventoryDetails[itemTr.dataset.invid]]);
			document.getElementById('box-outer').classList.remove('flex');
			document.getElementById('orderItems').classList.add('hide');
		} 
	}
}

function addNewRowStageLocation() {
	let bayTab = document.getElementById('stage-location-table-body');
	let cols = ['Actions', 'location', 'looseQty'];
	//console.log(bayTab);
	let rowCnt = bayTab.rows.length;
	//console.log(rowCnt);
	let tr = bayTab.insertRow(rowCnt);
	//console.log(tr);

	for (let c = 0; c < cols.length; c++) {
		let td = document.createElement('td'); 
		td = tr.insertCell(c);
		//console.log(td);

		if (c == 0) {  
			let reBtn = document.createElement('input');
			reBtn.setAttribute('type', 'button');
            reBtn.setAttribute('value', 'Remove');  
            reBtn.setAttribute('id','removeRow');  

	            reBtn.addEventListener("click", function(e){        		
	        		removeRowsSatgeLocation(e);       			
	        	});

            td.appendChild(reBtn);
			td.setAttribute('class','Actions');           
		}
		else if(c == 1) {
			let select = document.createElement('select');
			select.setAttribute('id','bays');

			for (var i=1; i<=100; i++) {
				let option = document.createElement('option');
				option.text = 'STAGE' + i;
				option.value = 'STAGE' + i;
				select.appendChild(option);
			}

			td.appendChild(select);
		}		
		else if (c == 2){
			let decvalBtn = document.createElement('input');
			decvalBtn.setAttribute('type', 'button');
        	decvalBtn.setAttribute('value', '⮜');
        	decvalBtn.setAttribute('class','decreaseValue number-Picker btn-red');
        	td.appendChild(decvalBtn); 

            	decvalBtn.addEventListener("click", function(e){
            		indivDecreaseValue(e);
            	});

        	let ele = document.createElement('input');
    		ele.setAttribute('type', 'text');           		
    		ele.setAttribute('value', '0');
    		ele.setAttribute('id','indiQty');
    		td.appendChild(ele); 

    		let incvalBtn = document.createElement('input');
			incvalBtn.setAttribute('type', 'button');
        	incvalBtn.setAttribute('value', '⮞');
        	incvalBtn.setAttribute('class','increaseValue number-Picker btn-green');
        	td.appendChild(incvalBtn); 
        	
        	td.setAttribute('class','looseQty');

	        	incvalBtn.addEventListener("click", function(e){
	        		indivIncreaseValue(e);
	        });
		} 		
		tr.appendChild(td);
	}
	bayTab.appendChild(tr);

}

function showStagingLocationDetails(e) {

	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('stagelocation').classList.remove('hide');

	let baytBody = document.querySelector('#stagelocation #stage-location-table-body');


	let itemSKU = e.target.closest('tr').dataset.sku;
	// console.log(itemSKU);
	document.querySelector('#stage-location-table-body').dataset.sku = itemSKU;
	document.querySelector('#sku span').textContent = itemSKU;

	let itemName = e.target.closest('tr').dataset.itemName;
	// console.log(itemName);
	document.querySelector('#itemname span').textContent = itemName;

	let itemInvId = e.target.closest('tr').dataset.id;
	baytBody.dataset.invId = itemInvId;


	while (baytBody.firstChild) {
		baytBody.removeChild(baytBody.firstChild);
	}

	let cols = ['Actions', 'location', 'looseQty'];
	// let colsEditable = ['looseQty'];

	// let locations = JSON.parse(e.target.closest('tr').dataset.locations);
	// console.log(locations);
	let options = page.activeRow.querySelectorAll('#bay option');

	for (let opt of options) {
		let tr = document.createElement('tr');
		// tr.dataset.id = loc.id;
		for (let col of cols) {
			let td = document.createElement('td');
			td.classList.add(col);

			if(col == 'Actions') {
				let reBtn = document.createElement('input');
				reBtn.setAttribute('type', 'button');
            	reBtn.setAttribute('value', 'Remove');
            	reBtn.setAttribute('id','removeRow');
            	td.appendChild(reBtn);      

            	reBtn.addEventListener("click", function(e){
            		removeRowsSatgeLocation(e);
            	});	
            } 
            else if (col == 'location') {
            	let select = document.createElement('select');
				select.setAttribute('id','bays');

				for (var i=1; i<=100; i++) {
					let option = document.createElement('option');
					option.text = 'STAGE' + i;
					option.value = 'STAGE' + i;
					select.appendChild(option);
				}
				select.value = opt.dataset.location;
				td.appendChild(select);
            }
            else if (col == 'looseQty') {
            	let decvalBtn = document.createElement('input');
				decvalBtn.setAttribute('type', 'button');
            	decvalBtn.setAttribute('value', '⮜');
            	decvalBtn.setAttribute('class','decreaseValue number-Picker btn-red');
            	td.appendChild(decvalBtn); 

            	decvalBtn.addEventListener("click", function(e){
            		indivDecreaseValue(e);
            	});

            	let ele = document.createElement('input');
        		ele.setAttribute('type', 'text');           		
        		ele.setAttribute('value', opt.dataset.qty);
        		ele.setAttribute('id','indiQty');
        		td.appendChild(ele); 

        		let incvalBtn = document.createElement('input');
				incvalBtn.setAttribute('type', 'button');
            	incvalBtn.setAttribute('value', '⮞');
            	incvalBtn.setAttribute('class','increaseValue number-Picker btn-green');
            	td.appendChild(incvalBtn); 

            	incvalBtn.addEventListener("click", function(e){
            		indivIncreaseValue(e);
            	});

            }    			
            else {
            	td.textContent = "" ;        
            }
            tr.appendChild(td);
		}
		baytBody.appendChild(tr);
	}
	// for(let loc of locations) {

	let tr = document.createElement('tr');
	// tr.dataset.id = loc.id;
	for (let col of cols) {
		let td = document.createElement('td');
		td.classList.add(col);

		if(col == 'Actions') {
			let reBtn = document.createElement('input');
			reBtn.setAttribute('type', 'button');
        	reBtn.setAttribute('value', 'Remove');
        	reBtn.setAttribute('id','removeRow');
        	td.appendChild(reBtn);      

        	reBtn.addEventListener("click", function(e){
        		removeRowsSatgeLocation(e);
        	});	
        } 
        else if (col == 'location') {
        	let select = document.createElement('select');
			select.setAttribute('id','bays');

			for (var i=1; i<=100; i++) {
				let option = document.createElement('option');
				option.text = 'STAGE' + i;
				option.value = 'STAGE' + i;
				select.appendChild(option);
			}

			td.appendChild(select);
        }
        else if (col == 'looseQty') {
        	let decvalBtn = document.createElement('input');
			decvalBtn.setAttribute('type', 'button');
        	decvalBtn.setAttribute('value', '⮜');
        	decvalBtn.setAttribute('class','decreaseValue number-Picker btn-red');
        	td.appendChild(decvalBtn); 

        	decvalBtn.addEventListener("click", function(e){
        		indivDecreaseValue(e);
        	});

        	let ele = document.createElement('input');
    		ele.setAttribute('type', 'text');           		
    		ele.setAttribute('value', '0');
    		ele.setAttribute('id','indiQty');
    		td.appendChild(ele); 

    		let incvalBtn = document.createElement('input');
			incvalBtn.setAttribute('type', 'button');
        	incvalBtn.setAttribute('value', '⮞');
        	incvalBtn.setAttribute('class','increaseValue number-Picker btn-green');
        	td.appendChild(incvalBtn); 

        	incvalBtn.addEventListener("click", function(e){
        		indivIncreaseValue(e);
        	});

        }    			
        else {
        	td.textContent = "" ;        
        }
        tr.appendChild(td);
	}
	baytBody.appendChild(tr);
// }
}

function showBayLocationDetails(e, inventorys) {
	//console.log(inventorys);

	// let poNum = document.querySelector('#supplier-poNum').value;
 // 	if(!poNum) {
	// 	let poNumfeed = document.querySelector('#poNum-feedback');
	// 	poNumfeed.classList.remove('hide');
	// 	poNumfeed.textContent = 'Please enter your PO Number.';	
	// 	return;	
 // 	}
 	clearFeedback();

	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('baylocation').classList.remove('hide');
	document.getElementById('orderItems').classList.add('hide');

	let baytBody = document.querySelector('#baylocation #bay-location-table-body');

	let itemSKU = e.target.closest('tr').dataset.sku;
	// console.log(itemSKU);
	document.querySelector('#bay-location-table-body').dataset.sku = itemSKU;
	document.querySelector('#sku2 span').textContent = itemSKU;

	let itemName = e.target.closest('tr').dataset.itemName;
	// console.log(itemName);
	document.querySelector('#itemname2 span').textContent = itemName;

	let itemInvId = e.target.closest('tr').dataset.id;
	baytBody.dataset.id = itemInvId;

	// let locations = e.target.closest('tr').dataset.locations;
	let inventoryDetail = inventorys[0];
	//let locations = inventoryDetail.locations;
	let locations = page.activeRow.dataset.locations;
	if (locations) {
		locations = JSON.parse(page.activeRow.dataset.locations);
	} else {
		locations = [];
	}
	
	//console.log(locations);

	while (baytBody.firstChild) {
		baytBody.removeChild(baytBody.firstChild);
	}

	let cols = ['location', 'type', 'looseQty', 'receivedQty', 'addQty'];
	let colsEditable = ['looseQty'];

	for(let loc of locations) {
		let tr = document.createElement('tr');
		tr.dataset.id = loc.id;
		for (let col of cols) {
			let td = document.createElement('td');
			td.classList.add(col);

			// if (col == 'checkbox') {
			// 	let input = document.createElement('input');
			// 	td.className = 'selected';
			// 	input.type = 'checkbox';
			// 	input.autocomplete = 'off';
			// 	td.appendChild(input);
			// }
          	if (col == 'location') {

				let ele = document.createElement('input');
        		ele.setAttribute('type', 'text');
        		ele.setAttribute('value', loc.bay.toUpperCase());
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
            		page.activeRow2 = tr;
            		addReceiveQty(e, inventorys);
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

function removeRowsSatgeLocation(e) {

	let res = confirm("Are you sure want to remove ?");
	if(res == true) {

		let bayTab =  document.querySelector('#stage-location-table-body');
		let trs = bayTab.querySelectorAll('tr');

		let tr = e.target.parentNode.parentNode;
		bayTab.removeChild(tr);	
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

async function saveStageLocationDetails(e) {
	let bayTab =  document.querySelector('#stage-location-table-body');
	let trs = document.querySelectorAll('#stage-location-table-body tr');
	let itemTabTrs = page.activeRow;

	let locations = [];
	let invID = bayTab.dataset.id;
	let customSku =  bayTab.dataset.sku;
	// let stockQPC = bayTab.dataset.quantityPerCarton;
	
	for(let tr of trs) {
		let quantity = parseInt(tr.querySelector('#indiQty').value);
		if (quantity == '' || isNaN(quantity || quantity < 1)) {
			page.notification.show('Invalid quantities');
			return;
		}
		// console.log(quantity);

		let stagingBay = tr.querySelector('#bays').value;
						
		// let type = itemTabTrs.querySelector('.type').textContent;	

		let location = {};
		location.id = tr.dataset.invId;
		location.bay =  stagingBay;
		location.indivQty = quantity;	
	 	locations.push(location);
	}

	let locationsReceived = [];
	for (let tr_i = 0; tr_i < trs.length; tr_i++) {

		let locationReceived = [];
		let tableRow = trs[tr_i];
		let tds = tableRow.querySelectorAll('td');
		// Save each value
			if (tds[1]) {
				let options = tableRow.querySelector('#bays');				
				locationReceived.push(options.value);
			} 
			if (tds[2]) {				
				// locationReceived.push(tds[2].firstChild.value);
				let inQty = parseInt(tds[2].querySelector('#indiQty').value);
				locationReceived.push(inQty);				
			} 	
		locationsReceived.push(locationReceived);
		//console.log(locationsReceived);

	}

	let select = itemTabTrs.querySelector('#bay');
	select.innerHTML = "";
	for (let locre of locationsReceived) {
		let option = document.createElement('option');
		option.textContent = locre[0] + ' : ' + locre[1];
		option.dataset.location = locre[0];
		option.dataset.qty = locre[1];
		select.appendChild(option);
	}

	let totalReceivedQtys = 0;

	for (let option of select.querySelectorAll('option')) {
		totalReceivedQtys = totalReceivedQtys + parseInt(option.dataset.qty);
	}

	itemTabTrs.querySelector('.looseQty').innerHTML = totalReceivedQtys;

	/*let formData = new FormData();
	formData.append('invID',invID);
	formData.append('customSku',customSku);
	formData.append('locations',JSON.stringify(locations));

	let response = await fetch(apiServer+'stockInventoryLocation/update', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let responseData = await response.json();

	if (!response.ok || responseData.result != 'success') {	

		page.notification.show(responseData.result);
	} else {*/
		page.notification.show("Updated..");	
		document.getElementById('box-outer').classList.remove('flex');
		document.getElementById('stagelocation').classList.add('hide');
	/*}*/
}

async function saveBayLocationDetails(e) {

	let bayTab =  document.querySelector('#bay-location-table-body');
	let trs = bayTab.querySelectorAll('tr:not(.hide)');

	let itemTabTrs = page.activeRow;

	let locations = [];
	let invID = bayTab.dataset.id;
	let customSku =  bayTab.dataset.sku;
	let indivQtys ;

	//let trs = document.querySelectorAll('#bay-location-table-body tr');
	//for(let tr of trs) {}
	let arrayLocNames = [];

	for(let tr of trs) {

		let location = {};
		location.id = tr.dataset.id;
		location.indivQty =  parseInt(tr.querySelector('#indiQty').value);
		location.bay =  tr.querySelector('#bay').value;
		location.type = tr.querySelector('#types').value;
	 	locations.push(location);
	 	//console.log(locations);

	 	if (arrayLocNames.includes(tr.querySelector('#bay').value) == false) { //check if word is duplicated
			location.bay = tr.querySelector('#bay').value;
			arrayLocNames.push(location.bay);
		}
		else{
			swal('ERROR:','Duplicated entry => '+tr.querySelector('#bay').value,'error');
			return;
		}

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
		locationReceived.push(tableRow.dataset.id);
		locationsReceived.push(locationReceived);
		//console.log(locationsReceived);

	}
	let arrayLocNames2 = [];
	let select = itemTabTrs.querySelector('#bay');
	let opcoes = select.querySelectorAll('option');

	for (let opcao of opcoes){
		if (arrayLocNames2.includes(opcao.dataset.location) == false) { //check if word is duplicated
			arrayLocNames2.push(opcao.dataset.location);
		}
	}

	for (let locre of locationsReceived) {
		if (arrayLocNames2.includes(locre[0]) == false) {
			//console.log(locre);
			let option = document.createElement('option');
			option.textContent = locre[0] + ' : ' + locre[1];
			option.dataset.location = locre[0];
			option.dataset.qty = locre[1];
			option.dataset.id = locre[2];
			select.appendChild(option);
		}
		else {
			swal('Bay already included','');
			swal({
                title: "Bay already included",
                text: "Would you like to proceed?",
                icon: "warning",
                buttons: true,
                dangerMode: true,
            })
            .then((willProceed) => {
	            if (willProceed) {
	                let option = document.createElement('option');
					option.textContent = locre[0] + ' : ' + locre[1];
					option.dataset.location = locre[0];
					option.dataset.qty = locre[1];
					option.dataset.id = locre[2];
					select.appendChild(option);
	            }
	        });
		}
	}

	let totalReceivedQtys = 0;

	for (let option of select.querySelectorAll('option')) {
		totalReceivedQtys = totalReceivedQtys + parseInt(option.dataset.qty);
	}

	itemTabTrs.querySelector('.looseQty').innerHTML = totalReceivedQtys;
	// console.log(totalReceivedQtys);

	/*let formData = new FormData();
	formData.append('invID',invID);
	formData.append('customSku',customSku);
	if (document.getElementById('supplier-poNum').value == null || document.getElementById('supplier-poNum').value == ""){
		swal('Error:','No PO Number assigned...','error');
		return;
	}
	formData.append('poNumber',document.getElementById('supplier-poNum').value);
	formData.append('locations',JSON.stringify(locations));

	let response = await fetch(apiServer+'stockInventoryLocation/update', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let responseData = await response.json();

	if (!response.ok || responseData.result != 'success') {	
		page.notification.show(responseData.result);
	} else {
		page.notification.show("Updated..");
		document.getElementById('box-outer').classList.remove('flex');
		document.getElementById('baylocation').classList.add('hide');

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
	        		ele.setAttribute('value', loc.bay.toUpperCase());
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
	}*/
	document.getElementById('box-outer').classList.remove('flex');
	document.getElementById('baylocation').classList.add('hide');
}

function indivDecreaseValue(e) {
	let input = e.target.parentNode.querySelector('#indiQty');
	let value = parseInt(input.value, 10);
    value = isNaN(value) ? 0: value;
    value < 1 ? value = 1 : '';
    value--;

    input.value = value;
}

function indivIncreaseValue(e) {
    let input = e.target.parentNode.querySelector('#indiQty');
    let value = parseInt(input.value, 10);
    value = isNaN(value) ? 0: value;
    value++;

    input.value = value;
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

// Close popup box
function closeBox() {
	document.getElementById('box-outer').classList.remove('flex');
	setTimeout(function() {
		for (let el of document.querySelectorAll('#box-container > div:not(.close)')) {
			el.classList.add('hide');
		}
	}, 400);
}

function addReceiveQty(e, inventorys) {
	clearFeedback();

	document.getElementById('box-outer').classList.add('flex');
	document.getElementById('baylocation').classList.add('hide');
	document.getElementById('receive-qty').classList.remove('hide');

	let baytBody = document.querySelector('#bay-location-table-body');
	let trs = baytBody.querySelectorAll('tr');
	// console.log(trs);

	let inventoryDetail = inventorys[0];
	let locations = inventoryDetail.locations;
	let tr = e.target.parentNode.parentNode;

	document.querySelector('#receive-qty').dataset.id = tr.dataset.id;

	let qty = tr.querySelector('#indiQty').value;
	document.querySelector('#existingQty').value = qty;	

	let bay = tr.querySelector('#bay').value;
	document.querySelector('#existingBay').value = bay;	
	// console.log(qty);

	document.querySelector('#newQty').value = '';

	let qtySaveBtn = document.querySelector('#qty-save');

	qtySaveBtn.addEventListener("click", function(e) {
		// console.log('11');	
		/*if (document.getElementById('supplier-poNum').value == null || document.getElementById('supplier-poNum').value == ""){
			swal('Error:','No PO Number assigned...','error');
			return;
		}*/

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
	//console.log(trs);
	// let newType = document.querySelector('#types').value;
	//console.log(newQty);

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
	            ele.setAttribute('value', 'EMG-' + newBay.toUpperCase());
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

async function pickStock() {

	let tbody = document.querySelector('#order-items tbody');
	let trs = document.querySelectorAll('#order-items tbody tr');

	let docketNo = document.querySelector('.supplier-docknum').textContent;
	if (trs.length > 0) {
		if (docketNo) {
			for(let tr of trs) {


				let currentlooseQty = parseInt(tr.querySelector('.looseQty').textContent);
				// let currentcartonQty = parseInt(tr.querySelector('.cartonQty').textContent);
				let customSku = tr.querySelector('.sku').textContent;

				let formData = new FormData();
				// formData.append('id', tr.dataset.id);
				formData.append('customSku', customSku);
				formData.append('subtractfromlooseQty',currentlooseQty);
				// formData.append('subtractfromcartonQty',currentcartonQty);
				formData.append('docketNo', docketNo);

				let response = await fetch(apiServer + 'stockInventory/update', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData});
				let updateStockInventoryData = await response.json();

				if (response.ok && updateStockInventoryData.result == 'success') {	            
					page.notification.show("Updated.");
					let orderTableBody = document.querySelector('#order-items tbody');
					while (orderTableBody.firstChild) {
						orderTableBody.removeChild(orderTableBody.firstChild);
					}
				}
				else {
					notification.show(updateStockInventoryData.result);
					return 'success';
				}					
			}
		} else {
			page.notification.show("Please enter docketno.");
		}
	} else {
		page.notification.show("Please select item.");
	}

}

async function receiveLooseOrders() {
 	// console.log('11');
	clearFeedback();
 	let send = true;
 	let formData = new FormData();

 	let id = document.querySelector('#delivery-address').dataset.id;

 	let poNum = document.querySelector('#supplier-poNum').value;
 	if(!poNum) {
 		send = false;
		let poNumfeed = document.querySelector('#poNum-feedback');
		poNumfeed.classList.remove('hide');
		poNumfeed.textContent = 'Please enter your PO Number.';		
 	}

	let fullname = document.querySelector('#supplier-fullname').value;
	if (!fullname) {
		send = false;
		let fullnamefeed = document.querySelector('#fullname-feedback');
		fullnamefeed.textContent = 'Please enter supplier Name.';
		fullnamefeed.classList.remove('hide');
	}

	let notes = document.querySelector('#delivery-notes').value;


	let store = document.querySelector('#supplier-store').value;	
	if (store == '-') {
		send = false;
		let storefeed = document.querySelector('#store-feedback');
		storefeed.textContent = 'Please choose a store.';
		storefeed.classList.remove('hide');
	}

	let itemTrs = document.querySelectorAll('#order-items tbody tr');
	//console.log(itemTrs);
	if (itemTrs.length == 0) {
		send = false;
		let itemfeed = document.querySelector('#item-feedback');
		itemfeed.textContent = 'Please add items.';
		itemfeed.classList.remove('hide');
	}

	let date = document.querySelector('#received-date').value;
	
	if (date == '') {
		send = false;
		let datefeed = document.querySelector('#date-feedback');
		datefeed.textContent = "Please choose a date.";
		datefeed.classList.remove('hide');
	}
	
	let type = document.querySelector('#type-select input[name="sts"]:checked').value;

	let hasQuantity = true;

	/*
	for (let itemTr of itemTrs) {
		invID = itemTr.dataset.id;
		let quantity = itemTr.querySelector('[class="looseQty"]').textContent;
		if (quantity == '' || isNaN(quantity) || quantity == 0) {
			hasQuantity = false;
		}
	}*/

	var table = document.querySelector('#content-container #order-items');
	var tableBody = table.querySelector('tbody');
	var tableBodyTr = tableBody.querySelectorAll('tr:not(.hide)');

	let itemLocations = [];
	let itemLocationsSaving = [];

	for (let tr_i = 0; tr_i < tableBodyTr.length; tr_i++) {
		let tableRow = tableBodyTr[tr_i];


		let invID = tableRow.dataset.id;
		let sku = tableRow.dataset.sku;
		let quantity = tableRow.querySelector('[class="looseQty"]').textContent;
		if (quantity == '' || isNaN(quantity) || quantity == 0) {
			hasQuantity = false;
		}

		let tds = tableRow.querySelectorAll('td');
	
		let td = tds[10];
		let options = td.querySelectorAll('option');
		for (let option of options) {
			let bay = option.dataset.location;
			let indivQty = option.dataset.qty;
			let id = option.dataset.id;
			itemLocations.push([invID,bay,indivQty]);
			itemLocationsSaving.push({'id':id,'invID':invID,'bay':bay,'indivQty':indivQty,'sku':sku});
		}	
	}

	//console.log(itemLocationsSaving);
	
	if (!hasQuantity) {
		send = false;
		let quantityfeed = document.querySelector('#item-quan-feedback');
		quantityfeed.textContent = 'Invalid quantities';
		quantityfeed.classList.remove('hide');
	}

	let createdBy = page.user.firstname +  ' ' + page.user.lastname;
	// console.log(createdBy);
	console.log(itemLocations);

	try {
		formData.append('poNo', poNum);
		formData.append('supplierName', fullname);
		formData.append('createdDate', date);
		formData.append('itemLocations', JSON.stringify(itemLocations));
		formData.append('itemLocationsSaving', JSON.stringify(itemLocationsSaving));
		formData.append('createdBy', createdBy);
		formData.append('deliveryNotes', notes);
		formData.append('store',store);
		formData.append('type',type);

		if (!send) {
			page.notification.show("Please complete the form.");
			return;
		}
		else{
			// clearForm();
		}

		let response = await fetch(apiServer+'receiveOrders', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let createOrderData = await response.json();

		if (response.ok && createOrderData.result == 'success') {		
			page.notification.show("Order added successfully.");	
			clearForm();	
			window.location.reload();
		}
		else {
			page.notification.show(createOrderData.result);
		}
	} catch(e) {
		page.notification.show(e);
	}
		
}

async function receiveContainerOrders() {
 	// console.log('11');
	clearFeedback();
 	let send = true;
 	let formData = new FormData();
 	
 	let id = document.querySelector('#delivery-address').dataset.id;

 	let poNum = document.querySelector('#supplier-poNum').value;
 	if(!poNum) {
 		send = false;
		let poNumfeed = document.querySelector('#poNum-feedback');
		poNumfeed.classList.remove('hide');
		poNumfeed.textContent = 'Please enter your PO Number.';		
 	}


	let fullname = document.querySelector('#supplier-fullname').value;;
	if (!fullname) {
		send = false;
		let fullnamefeed = document.querySelector('#fullname-feedback');
		fullnamefeed.textContent = 'Please enter supplier Name.';
		fullnamefeed.classList.remove('hide');
	}

	let notes = document.querySelector('#delivery-notes').value;;

	let store = document.querySelector('#supplier-store').value;	
	if (store == '-') {
		send = false;
		let storefeed = document.querySelector('#store-feedback');
		storefeed.textContent = 'Please choose a store.';
		storefeed.classList.remove('hide');
	}

	let itemTrs = document.querySelectorAll('#order-items tbody tr');
	//console.log(itemTrs);
	if (itemTrs.length == 0) {
		send = false;
		let itemfeed = document.querySelector('#item-feedback');
		itemfeed.textContent = 'Please add items.';
		itemfeed.classList.remove('hide');
	}

	let date = document.querySelector('#received-date').value;
	
	if (date == '') {
		send = false;
		let datefeed = document.querySelector('#date-feedback');
		datefeed.textContent = "Please choose a date.";
		datefeed.classList.remove('hide');
	}

	let hasQuantity = true;

	var table = document.querySelector('#content-container #order-items');
	var tableBody = table.querySelector('tbody');
	var tableBodyTr = tableBody.querySelectorAll('tr:not(.hide)');

	let type = document.querySelector('#type-select input[name="sts"]:checked').value;

	let itemLocations = [];

	for (let tr_i = 0; tr_i < tableBodyTr.length; tr_i++) {
		let formData2 = new FormData();
		let locations = [];
		let tableRow = tableBodyTr[tr_i];

		let invID = tableRow.dataset.id;
		let customSku = tableRow.dataset.customSku;

		let quantity = tableRow.querySelector('[class="looseQty"]').textContent;
		if (quantity == '' || isNaN(quantity) || quantity == 0) {
			hasQuantity = false;
		}

		let tds = tableRow.querySelectorAll('td');
	
		let td = tds[10];
		let options = td.querySelectorAll('option');
		for (let option of options) {
			let bay = option.dataset.location;
			let indivQty = option.dataset.qty;
			itemLocations.push([invID,bay,indivQty]);

			let location = {};
			location.bay = bay;
			location.indivQty = indivQty;

			locations.push(location);
			// console.log(locations);
				
		}

		if (!send) {
			page.notification.show("Please complete the form.");
			return;
		}

		try {
			formData2.append('invID',invID);
			/*if (document.getElementById('supplier-poNum').value == null || document.getElementById('supplier-poNum').value == ""){
				swal('Error:','No PO Number assigned...','error');
				return;
			}*/
			formData2.append('poNumber',document.getElementById('supplier-poNum').value);
			formData2.append('customSku',customSku);
			formData2.append('locations',JSON.stringify(locations));

			let response = await fetch(apiServer+'stockInventoryLocation/update', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData2});
			let responseData = await response.json();

			if (!response.ok || responseData.result != 'success') {	
				page.notification.show(responseData.result);
			} else {
				page.notification.show("Order added successfully.");
			}	
		} catch(e) {
			page.notification.show(e);
		}
				
	}

	if (!hasQuantity) {
		send = false;
		let quantityfeed = document.querySelector('#item-quan-feedback');
		quantityfeed.textContent = 'Invalid quantities';
		quantityfeed.classList.remove('hide');
	}

	let createdBy = page.user.firstname +' '+page.user.lastname;
	//console.log(createdBy);

	if (!send) {
		page.notification.show("Please complete the form.");
		return;
	}else{
		// clearForm();
	}

	try {

		formData.append('poNo', poNum);
		formData.append('supplierName', fullname);
		formData.append('createdDate', date);
		formData.append('itemLocations', JSON.stringify(itemLocations));
		formData.append('createdBy', createdBy);
		formData.append('deliveryNotes', notes);
		formData.append('store',store);
		formData.append('type', type);

	
		let response = await fetch(apiServer+'receiveOrders', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let createOrderData = await response.json();

		if (response.ok && createOrderData.result == 'success') {		
			page.notification.show("Order added successfully.");	
			clearForm();
			window.location.reload();
		}
		else {
			page.notification.show(createOrderData.result);
		}
	} catch(e) {
		page.notification.show(e);
	}
		
}

async function receiveReceivingOrders() {
	// console.log('11');
	clearFeedback();
 	let send = true;
 	let formData = new FormData();

 	let id = document.querySelector('#delivery-address').dataset.id;

 	let poNum = document.querySelector('#supplier-poNum').value;
 	if(!poNum) {
 		send = false;
		let poNumfeed = document.querySelector('#poNum-feedback');
		poNumfeed.classList.remove('hide');
		poNumfeed.textContent = 'Please enter your PO Number.';		
 	}

	let fullname = document.querySelector('#supplier-fullname').value;
	if (!fullname) {
		send = false;
		let fullnamefeed = document.querySelector('#fullname-feedback');
		fullnamefeed.textContent = 'Please enter supplier Name.';
		fullnamefeed.classList.remove('hide');
	}

	let notes = document.querySelector('#delivery-notes').value;


	let store = document.querySelector('#supplier-store').value;	
	if (store == '-') {
		send = false;
		let storefeed = document.querySelector('#store-feedback');
		storefeed.textContent = 'Please choose a store.';
		storefeed.classList.remove('hide');
	}

	let itemTrs = document.querySelectorAll('#order-items tbody tr');
	//console.log(itemTrs);
	if (itemTrs.length == 0) {
		send = false;
		let itemfeed = document.querySelector('#item-feedback');
		itemfeed.textContent = 'Please add items.';
		itemfeed.classList.remove('hide');
	}

	let date = document.querySelector('#received-date').value;
	
	if (date == '') {
		send = false;
		let datefeed = document.querySelector('#date-feedback');
		datefeed.textContent = "Please choose a date.";
		datefeed.classList.remove('hide');
	}
	
	let type = document.querySelector('#type-select input[name="sts"]:checked').value;

	let hasQuantity = true;
	
	var table = document.querySelector('#content-container #order-items');
	var tableBody = table.querySelector('tbody');
	var tableBodyTr = tableBody.querySelectorAll('tr:not(.hide)');

	let iteminvIDQty = [];

	for (let tr_i = 0; tr_i < tableBodyTr.length; tr_i++) {
	let tableRow = tableBodyTr[tr_i];

		let invID = tableRow.dataset.id;

		let quantity = tableRow.querySelector('[class="quantity"]').textContent;
		// console.log(quantity);
		if (quantity == '' || isNaN(quantity) || quantity == 0) {
			hasQuantity = false;
		}

		iteminvIDQty.push([invID, quantity]);
		//console.log(iteminvIDQty);
	}

	if (!hasQuantity) {
		send = false;
		let quantityfeed = document.querySelector('#item-quan-feedback');
		quantityfeed.textContent = 'Invalid quantities';
		quantityfeed.classList.remove('hide');
	}

	let createdBy = page.user.firstname +  ' ' + page.user.lastname;
	// console.log(createdBy);

	try {
		formData.append('poNo', poNum);
		formData.append('supplierName', fullname);
		formData.append('createdDate', date);
		formData.append('iteminvIDQty', JSON.stringify(iteminvIDQty));
		formData.append('createdBy', createdBy);
		formData.append('deliveryNotes', notes);
		formData.append('store',store);
		formData.append('type',type);

		if (!send) {
			page.notification.show("Please complete the form.");
			return;
		}
		else{
			//clearForm();
		}

		let response = await fetch(apiServer+'receiveOrders', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let createOrderData = await response.json();

		if (response.ok && createOrderData.result == 'success') {		
			clearForm();	
			window.location.reload();
			page.notification.show("Order added successfully.");
		}
		else {
			page.notification.show(createOrderData.result);
		}
	} catch(e) {
		page.notification.show(e);
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

	if (document.querySelector('#supplier-poNum') != null) { document.querySelector('#supplier-poNum').value = ''; }
	if (document.querySelector('#supplier-fullname') != null) { document.querySelector('#supplier-fullname').value = ''; }
	if (document.querySelector('#delivery-notes') != null) { document.querySelector('#delivery-notes').value = ''; }
	if (document.querySelector('#supplier-store') != null) { document.querySelector('#supplier-store').value = '-'; }

	let orderTableBody = document.querySelector('#order-items tbody');
	while (orderTableBody.firstChild) {
		orderTableBody.removeChild(orderTableBody.firstChild);
	}
	
}
