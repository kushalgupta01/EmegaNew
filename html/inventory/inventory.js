import '/order-collect/js/config.js';
//import '/common/stores.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener} from '/common/tools.js';
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
	localUser: !!localStorage.getItem('local')
	
};

window.convert = {"itemno": "ItemNo", "itemname": "ItemName", "sku": "Sku" , "customsku": "CustomSku", "itembarcode": "ItemBarcode", "cartonbarcode": "CartonBarcode"};
window.saleRecords = {};
window.header = ['Store', 'ItemNo', 'ItemName', 'SKU', 'CustomSKU', 'Item Barcode', 'Carton Barcode', 'Stock on Hand', 'Individual Quantity', 'Carton Quantity', 'Quantity per Carton', 'QVB Quantity', 'Reserved Quantity', 'Damaged Quantity', 'Stock Received', 'Stock Sent', 'Item Weight', 'Bay', 'Expiry', 'Core/ Closeout', 'Clearance', 'Supplier', 'Image'];
window.columnIndex = {
	'itemno': 1,
	'itemname': 2,
	'sku': 3,
	'customsku': 4,
	'itembarcode': 5,
	'cartonbarcode': 6,
}
window.perpages = [20, 50, 100];
window.totalPage = 0;
window.DELETE_PASSWORD = 'xZ5aWwTG';

window.stocks = {};

if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	// back to menu button
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/inventory/inventoryManagement.html';
	});

	// back to inventory button
	addListener('#header .back-to-inv', 'click', function(e) {
		window.location.href = '/inventory/inventory.html';
	});

	// search button
	addListener('#main-buttons .search', 'click', function(e) {
		searchInventory();
	});

	// go to add product page button
	addListener('#main-buttons .add-product', 'click', function(e) {
		window.location.href = '/inventory/addProduct.html';
	});

	addListener('#content-action-btns .add-product-btn', 'click', function(e) {
		addItem();
	});

	// go to stock received page button
	addListener('#main-buttons .stock-received', 'click', function(e) {
		window.location.href = '/inventory/stockReceived.html';
	});

	addListener('#content-action-btns .add-stock-received-btn', 'click', function(e) {
		addStockReceived();
	});

	// Close popup box
	document.querySelector('#box-container .close').addEventListener('click', closeBox);

	addListener('.popupCloseButton', 'click', function() {
		document.querySelector('.hover_bkgr_fricc').style.display = 'none';
		let trs = document.querySelectorAll('#bay-table-body tr');
		for (let tr of trs){
			tr.querySelector('#indiQty').value = tr.dataset.indivQty;
		}
	});

	addListener('.reason_to_delete_close', 'click', function() {
		document.querySelector('.reason_to_delete_box').style.display = 'none';
	});

	//save Bay details
	addListener('#bay-save', 'click', function() {
		saveBayDetails();
	});

	//add new row to bay table
	addListener('#bay-add', 'click', function() {
		addNewRow();
	});

	let pageNumber =1; //parseInt(localStorage.getItem('pageNumber') || 1);
	let perpage = 20; //parseInt(localStorage.getItem('perpage') || 20);
	let store = 1; //parseInt(localStorage.getItem('store') || 1);

	let storeFilterForm = document.querySelector('#content-item-stores form');
	let perpageFilterForm = document.querySelector('#content-item-perpage form');
	


	for (let storeID in stores) {
		if (['3','5','6','11','12','21','30','34'].includes(storeID)) continue;
		let input = document.createElement('input');
		input.setAttribute('type', 'radio');
		input.setAttribute('name', 'store');
		input.setAttribute('id', 'store-'+storeID);
		input.setAttribute('value', storeID);
		if (storeID == store) input.checked = true;
		storeFilterForm.appendChild(input);

		let label = document.createElement('label');
		label.setAttribute('for', 'store-'+storeID);
		
		let span = document.createElement('span');
		span.textContent = stores[storeID].name;
		label.appendChild(span);

		storeFilterForm.appendChild(label);
	}

	for (let pg of perpages) {
		let input = document.createElement('input');
		input.setAttribute('type', 'radio');
		input.setAttribute('name', 'perpage');
		input.setAttribute('id', 'perpage-'+pg);
		input.setAttribute('value', pg);
		if (pg == perpage) input.checked = true;
		perpageFilterForm.appendChild(input);

		let label = document.createElement('label');
		label.setAttribute('for', 'perpage-'+pg);
		
		let span = document.createElement('span');
		span.textContent = pg;
		label.appendChild(span);

		perpageFilterForm.appendChild(label);
	}

	addListener('#content-item-stores form input', 'change', changeStore);
	addListener('#content-item-perpage form input', 'change', changePerpage);

	await loadInventory();
	if (window.location.pathname != '/inventory/stockReceived.html') await createTable(perpage, pageNumber);

	//$('#item-table').DataTable();
	const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

	const comparer = (idx, asc) => (a, b) => ((v1, v2) => 
	    v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
	    )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));

	// do the work...
	document.querySelectorAll('th').forEach(th => th.addEventListener('click', (() => {
	    const tbody = document.querySelector('#item-table-body');
	    Array.from(tbody.querySelectorAll('tr'))
	        .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
	        .forEach(tr => tbody.appendChild(tr) );
	})));
});

//Store and per page	
async function changeStore() {
	await loadInventory();
	let pageNumber = 1; //parseInt(localStorage.getItem('pageNumber') || 1);
	let perpage = 20; //parseInt(localStorage.getItem('perpage') || 20);
	let keywords = document.querySelector('#content-inventory-searchbar input').value.toLowerCase();
	let field = document.querySelector('#content-inventory-searchfield input[name="searchfield"]:checked').value;
	await createTable(perpage,pageNumber,keywords,field);
	/*let perpage = parseInt(document.querySelector('#content-item-perpage form').elements['perpage'].value);

	window.location.href = '/inventory/inventory.html?page=1&perpage=' + perpage + '&store=' + store;*/
}

async function changePerpage(e) {
	var checkedItem = e.target.closest('.options').querySelector('form input:checked');
	var perpage = checkedItem.value;
	localStorage.perpage = perpage;

	let pageNumber = localStorage.getItem('pageNumber') || 1;

	let keywords = document.querySelector('#content-inventory-searchbar input').value.toLowerCase();
	let field = document.querySelector('#content-inventory-searchfield input[name="searchfield"]:checked').value;

	await createTable(perpage, pageNumber, keywords, field);

}

async function changePage(e) {
	let a = e.target;
	let page = parseInt(a.dataset.page);
	let perpage = parseInt(a.dataset.perpage);
	localStorage.pageNumber = page;
	//let store = a.dataset.store;
	let keywords = document.querySelector('#content-inventory-searchbar input').value.toLowerCase();
	let field = document.querySelector('#content-inventory-searchfield input[name="searchfield"]:checked').value;
	await createTable(perpage, page, keywords, field);
	//window.location.href = '/inventory/inventory.html?page=1&perpage=' +perpage + '&store=' + store;
}


/*async function searchInventory() {

	let keywords = document.querySelector('#content-inventory-searchbar input').value.toLowerCase();
	let field = document.querySelector('#content-inventory-searchfield input[name="searchfield"]:checked').value;

	//console.log(keywords + ' ' +  field);

	if (!keywords) {
		page.notification.show('Please entey keywords in the search bar.');
		return;
	} 


	createTable(20, 1, keywords, field);

	
}*/


// response fetch to somewhere in inventory not stock/get
async function loadInventory() {
	stocks = {};
	var checkedItem = document.querySelector('#content-item-stores form input:checked');
	var store = checkedItem.value;
	let response = await fetch(apiServer+'stockInventory/load/'+store, {headers: {'DC-Access-Token': page.userToken}});
	let stockData = await response.json();

	if (response.ok && stockData.result == 'success') {		
		stocks = stockData.stocks;
	}
	else {
		page.notification.show(stockData.result);
	}
}

// search inventory
async function searchInventory() {
	document.getElementById('loading').style.display = 'block';
	stocks = {};
	var keywords = document.querySelector('#content-inventory-searchbar input').value.toLowerCase();
	var field = document.querySelector('#content-inventory-searchfield input[name="searchfield"]:checked').value;

	var checkedItem = document.querySelector('#content-item-stores form input:checked');
	var store = checkedItem.value;
	let response = await fetch(apiServer + 'stockInventory/search/' + store + '?searchfield=' + field + '&searchvalue=' + keywords, {headers: {'DC-Access-Token': page.userToken}});
	let stockData = await response.json();

	if (response.ok && stockData.result == 'success') {		
		stocks = stockData.stocks;
	}
	else {
		page.notification.show(stockData.result);
	}

	let pageNumber = 1;
	let perpage = 20;

	await createTable(perpage, pageNumber, keywords, field);
	document.getElementById('loading').style.display = 'none';
}

async function showTransactionLogs(invID,customSku, itemName, sku) {
	var tblTransactinLogsBody = $("#transactionLogs tbody");
	var tblTransactinLogs = $('#transactionLogs');
	tblTransactinLogs.find('.item-name').html(itemName);
	tblTransactinLogs.find('.item-sku').html(sku != '' ? sku : customSku);

	tblTransactinLogsBody.html('');
	var bodyHtml = [];

	let response = await fetch(apiServer + 'transferlogs/get/?invID=' + invID, { headers: { 'DC-Access-Token': page.userToken } });
	let jsonLogs = await response.json();

	if (jsonLogs.result == 'success') {
    let i = 0;
		jsonLogs.logs.forEach(function (log) {
			let minusplus;
			if ( log.newBay == log.oldBay && log.newQty == log.oldQty && log.actionType !== 'Addition' && log.actionType !== 'Deduction' || log.actionType == 'Transfer') {
				minusplus = '<div style="color:blue">0</div>';
				//minusplus = '<div style="color:green">+'+log.newQty+'</div><div style="color:red">-'+log.oldQty;
			}
			else if (log.actionType == 'Addition' || log.actionType == 'New'){
					minusplus = '<div style="color:green">+'+log.newQty+'</div>';
					log.newQty = log.oldQty+log.newQty;
					//td.style.color = 'green';					
			}
			else if (log.actionType == 'Deduction'){
				minusplus = '<div style="color:red">'+log.newQty+'</div>';
				log.newQty = log.oldQty+log.newQty;
				//td.style.color = 'red';
			}
			else if (log.actionType == 'Delete'){
				minusplus = '<div style="color:red">-'+log.oldQty+'</div>';
				//td.style.color = 'red';
			}
			else if (log.actionType == 'Collect'){
				minusplus = '<div style="color:red">'+log.newQty+'</div>';
				log.newQty = log.oldQty+log.newQty;
			}
			else if (log.actionType == 'Outofstock'){
				minusplus = '<div style="color:green">+'+log.newQty+'</div>';
				log.newQty = log.oldQty+log.newQty;
			}
			else if (log.actionType == 'PO'){
				let calc = log.newQty-log.oldQty;
				minusplus = '<div style="color:green">+'+calc+'</div>';

			}
			else if (log.actionType == 'ReceiveStock'){
				//let calc = log.newQty-log.oldQty;
				minusplus = '<div style="color:green">+'+log.newQty+'</div>';
				log.newQty = log.oldQty+log.newQty;
			}
	    						

      // let type = log.type;
      if (log.oldQty == null){log.oldQty="-"};
      // if (log.oldType == null){log.oldType="-"};
      // if (log.newType == null){log.newType="-"};
      if (log.newQty == null){log.newQty="-"};
      if (log.newBay == null){log.newBay="-"};
      if (log.oldBay == null){log.oldBay="-"};
      if (log.reason == null){log.reason="" };
      bodyHtml.push(
				[
					'<tr>',
					'<td>' + minusplus + '</td>',
					'<td>' + log.oldBay + '</td>',
					'<td>' + log.oldQty + '</td>',
					// '<td>' + log.oldType + '</td>',
					'<td class="arrowi">=></td>',
					'<td>' + log.newBay + '</td>',
					'<td>' + log.newQty + '</td>',
					// '<td>' + log.newType + '</td>',
					'<td>' + log.actionBy + '</td>',
					'<td>' + log.actionTime + '</td>',
					'<td>' + log.actionType + '</td>',
					'<td>' + log.reason + '</td>',
					'</tr>'
				].join('')
      );
      
      i++;
		});

	} else {
		page.notification.show("No transaction logs");
	}

	tblTransactinLogsBody.html(bodyHtml.join(''));

	$("#box-outer").addClass("flex");
	$("#transactionLogs").removeClass("hide");
}

async function createTable(perpage, pageNumber, keywords, field) {
	/*let newStock = {};
	for (let itemID in stocks) {
		let item = stocks[itemID];
		if (keywords) {
			if (field == 'itemname') {
				if (item.itemName && item.itemName.toLowerCase().includes(keywords)) {
					newStock[itemID] = item;
				}
			} else if (field == 'itemno') {
				if (item.itemNo && item.itemNo == keywords) {
					newStock[itemID] = item;
				}
			} else if (field == 'sku') {
				if (item.sku && item.sku.toLowerCase().includes(keywords)) {
					newStock[itemID] = item;
				}
			} else if (field == 'customsku') {
				if (item.customSku && item.customSku.toLowerCase().includes(keywords)) {
					newStock[itemID] = item;
				}
			} else if (field == 'itembarcode') {
				if ((item.itemBarcode && item.itemBarcode.toLowerCase() == keywords) || (item.cartonBarcode && item.cartonBarcode.toLowerCase() == keywords)) {
					newStock[itemID] = item;
				}
			} else if (field == 'cartonbarcode') {
				if ((item.itemBarcode && item.itemBarcode.toLowerCase() == keywords) || (item.cartonBarcode && item.cartonBarcode.toLowerCase() == keywords)) {
					newStock[itemID] = item;
				}
			}
		} else {
			newStock[itemID] = item;
		}
	}*/

	var tBody = document.querySelector('#item-table-body');

	while (tBody.firstChild) {
		tBody.removeChild(tBody.firstChild);
	}
	//let cols = ['locationbutton', 'store', 'itemNo', 'itemName', 'sku', 'customSku' , 'itemBarcode', 'cartonBarcode', 'totalQuantity', 'stockInHand', 'indivQty', 'cartonQty', 'b2ctotal', '3PLIndivQty', '3PLCartonQty', 'QVBQty', 'pickLocation', 'pickQty', 'bulkLocation', 'bulkQty', 'quantityPerCarton', 'reservedQuantity', 'damagedQty', 'stockReceived', 'stockSent', 'weight', 'bay', 'expiry', 'coreCloseout', 'clearance', 'supplier', 'imagedisplay', 'notes'];
	let cols = ['locationbutton', 'store', 'itemNo', 'itemName', 'sku', 'customSku' , 'itemBarcode', 'cartonBarcode', 'totalQuantity', 'stockInHand', 'indivQty', 'cartonQty', 'b2ctotal', '3PLIndivQty', '3PLCartonQty', 'QVBQty', 'pickLocation', 'pickQty', 'bulkLocation', 'bulkQty', 'quantityPerCarton', 'reservedQuantity', 'damagedQty', 'weight', 'bay', 'expiry', 'supplier', 'imagedisplay', 'notes', 'brand', 'category'];
	let colsEditable = ['itemNo', 'itemName', 'sku', 'customSku' , 'itemBarcode', 'cartonBarcode', 'indivQty','3PLIndivQty', '3PLCartonQty', 'reservedQuantity', 'damagedQty', 'stockSent', 'weight', 'expiry', 'coreCloseout', 'clearance', 'supplier', 'image', 'notes'];
	
	let totalInventorys = Object.keys(stocks).length;
	let totalPage = Math.ceil(totalInventorys/perpage);
	let stocksShow = Object.keys(stocks).slice((pageNumber-1)*perpage, (pageNumber*perpage > totalInventorys ? totalInventorys :pageNumber*perpage));
	
	for (let item in stocks) {
		if (!stocksShow.includes(item)) continue;
		var tr = document.createElement('tr');
		var stock = stocks[item];

		let customSku = stock['customSku'];
		let itemName = stock['itemName'];
		let sku = stock['sku'];
		let invID = stock['id'];

		let qtyPerCarton = stock['quantityPerCarton'] ? stock['quantityPerCarton'] : 0 ;
		let looseQty = stock["indivQty"];
		let cartonQty = stock["cartonQty"];
		let b2cLooseQty = stock['3PLIndivQty'];
		let b2cCartonQty = stock["3PLCartonQty"];

		tr.dataset.id = stock.id;
		tr.dataset.sku = stock.sku;
		tr.dataset.name = stock.itemName;
		tr.dataset.quantityPerCarton = stock.quantityPerCarton;

        for (let col of cols) {
        	var td = document.createElement('td');
        	if (colsEditable.includes(col)) {
        		td.contentEditable = true;
        		td.classList.add('editable');
        		td.dataset.col = col;
        	}
        	if (col == 'coreCloseout') {
        		td.textContent = (stock[col] == 1) ? 'core' : 'closeout';
        	}
        	else if (col == 'clearance') {
        		td.textContent = (stock[col] == 1) ? 'clearance' : 'not clearance';
        	}
        	else if( col == 'imagedisplay'){

        		let img = document.createElement('img');
				img.src =  stock['image'];
				img.style.width = '100px';
				td.appendChild(img);
        	}
        	/*else if( col == 'url'){
				td.textContent = stock['image'];
        	}*/
        	else if (col == 'store') {
        		td.textContent = stores[stock[col]] ? stores[stock[col]].name : '';
        		td.appendChild(document.createElement("br"));
	            var span = document.createElement("span");
	            span.textContent = 'Trx logs';
	            span.className = "action-btn";
	            span.style.fontSize = "12px";
	            span.style.padding = "4px";
	            td.appendChild(span);
	            span.addEventListener("click", function () {
				  showTransactionLogs(invID,customSku, itemName, sku);
	            });
        	}
        	else if (col == 'totalQuantity') {
        		td.id = 'totalQuantity';
        		/*let totalB2B = stock['indivQty'] + stock['cartonQty']*stock['quantityPerCarton'];
        		let totalB2C = stock['3PLIndivQty'] + stock['3PLCartonQty']*stock['quantityPerCarton'];
        		td.textContent = totalB2B + totalB2C;*/

        		let sum = 0;
        		if (Array.isArray(stock.locations)) {
        			for (let loc of stock.locations) {
        				sum = sum + loc.indivQty;
	        		}
        		}
	        		
        		td.textContent = sum;
        	}
        	else if (col=='stockInHand') {
	        	td.id = 'stockInHand';
	        	td.textContent = stock['indivQty'] + stock['cartonQty']*stock['quantityPerCarton'];
	        }
	        else if (col=='b2ctotal') {
	        	td.id = 'b2ctotal';
	        	td.textContent = stock['3PLIndivQty'] + stock['3PLCartonQty']*stock['quantityPerCarton'];
	        }
	        else if (col == 'locationbutton') { 
	        	var baybtn = document.createElement('input');
        		baybtn.setAttribute('type','button');
        		baybtn.setAttribute('class','bayDetails action-btn btn-lightseagreen');
        		baybtn.setAttribute("style", "border-radius: 50%;");
        		baybtn.value = "+";
        		td.appendChild(baybtn);

        		baybtn.addEventListener("click", function(e){
        			// console.log('11');
        			showLocationDetails(e);       			
        		});
	        }
	        else if (col == 'bay') { 
	        	td.textContent = stock['bay'];  
	        }
        	else {
        		td.textContent = stock[col] ;       		
        	}
        	tr.appendChild(td);

        	if ((stock['indivQty'] <= 5 && stock['cartonQty'] == 0) || (stock['indivQty'] == 0 && stock['cartonQty'] <= 1)) {
    			tr.classList.add('bg-red');
    		}
    		else {
    			tr.classList.remove('bg-red');
    		}
        }
        
        tBody.appendChild(tr);
	}

	/*if (colsEditable == stockInHand )
		td.textContent = Math.floor(parseInt((invDetail.quantityPerCarton)*invDetail.cartonQty)+invDetail.indivQty);*/


	let pageEl = document.querySelector('#pages');
	while (pageEl.firstChild) {
		pageEl.removeChild(pageEl.firstChild);
	}
	let store = parseInt(document.querySelector('#content-item-stores form').elements['store'].value);

	if (pageNumber > 1) {
		let pre = document.createElement('a');
		pre.dataset.perpage = perpage;
		pre.dataset.store = store;
		pre.dataset.page = pageNumber - 1;
		pre.textContent = 'pre';
		pageEl.appendChild(pre);
	}

	if (totalPage <= 10) {
		for (let i=1; i<=totalPage; i++) {
			let a = document.createElement('a');
			a.dataset.perpage = perpage;
			a.dataset.store = store;
			a.dataset.page = i;
			a.textContent = i;
			if (i==pageNumber) a.classList.add('currentPage');
			pageEl.appendChild(a);
		}
	} else {
		if (pageNumber-5<=0) {
			if (pageNumber+9<=totalPage) {
				for (let i=1; i<=pageNumber+9; i++) {
					let a = document.createElement('a');
					a.dataset.perpage = perpage;
					a.dataset.store = store;
					a.dataset.page = i;
					a.textContent = i;
					if (i==pageNumber) a.classList.add('currentPage');
					pageEl.appendChild(a);
				}
			} else {
				for (let i=totalPage-9; i<=totalPage; i++) {
					let a = document.createElement('a');
					a.dataset.perpage = perpage;
					a.dataset.store = store;
					a.dataset.page = i;
					a.textContent = i;
					if (i==pageNumber) a.classList.add('currentPage');
					pageEl.appendChild(a);
				}
			}
				
		} else {
			if (pageNumber+4<=totalPage) {
				for (let i=pageNumber-5; i<=pageNumber+4; i++) {
					let a = document.createElement('a');
					a.dataset.perpage = perpage;
					a.dataset.store = store;
					a.dataset.page = i;
					a.textContent = i;
					if (i==pageNumber) a.classList.add('currentPage');
					pageEl.appendChild(a);
				}
			} else {
				for (let i=totalPage-9; i<=totalPage; i++) {
					let a = document.createElement('a');
					a.dataset.perpage = perpage;
					a.dataset.store = store;
					a.dataset.page = i;
					a.textContent = i;
					if (i==pageNumber) a.classList.add('currentPage');
					pageEl.appendChild(a);
				}
			}
		}
	}
	if (pageNumber < totalPage) {
		let next = document.createElement('a');
		next.dataset.perpage = perpage;
		next.dataset.store = store;
		next.dataset.page = pageNumber + 1;
		next.textContent = 'Next';
		pageEl.appendChild(next);
	}

	addListener('#pages a', 'click', changePage);

	//Modify the table 
	addListener('.editable', 'blur', async (e) => {
		e.stopPropagation();
		//e.target.contentEditable  = false;

		let col = e.target.dataset.col;
		let value = e.target.textContent;
		let invID = e.target.parentNode.dataset.id;
		if (col == 'expiry') {
			if (isValidDate(value) == false) {
				page.notification.show('Invalid value!');
				return;
			}
		}
		let formData = new FormData();
		formData.append('col', col);
		formData.append('value', value);
		formData.append('invID', invID);

		let response = await fetch(apiServer+'stockInventory/update2', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
		let responseData = await response.json();

		if (!response.ok || responseData.result != 'success') {		
			page.notification.show(responseData.result);
		} else {
			page.notification.show('Item update successs.');
		}

	});
}

async function addItem() {
	clearFeedback();
	let send = true;
	let formData = new FormData();

	// gather information provided and add to formData
	let itemNo = document.querySelector('#itemNo').value;
	
	/*if (itemNo == '') {
		send = false;
		let itemNofeed = document.querySelector('#itemNo-feedback');
		itemNofeed.textContent = 'Please fill in Item Number.';
		itemNofeed.classList.remove('hide');
	}*/

	formData.append('itemNo', itemNo);

	let itemName = document.querySelector('#itemName').value;
	
	/*if (itemName == '') {
		send = false;
		let itemNamefeed = document.querySelector('#itemName-feedback');
		itemNamefeed.textContent = "Please fill in Item Name.";
		itemNamefeed.classList.remove('hide');
	}*/

	formData.append('itemName', itemName);

	let sku = document.querySelector('#sku').value;
	
	/*if (sku == '') {
		send = false;
		let skufeed = document.querySelector('#sku-feedback');
		skufeed.textContent = "Please fill in Sku.";
		skufeed.classList.remove('hide');
	}*/

	formData.append('sku', sku);

	let customsku = document.querySelector('#customsku').value;

	/*if (customsku == '') {
		send = false;
		let customskufeed = document.querySelector('#customsku-feedback');
		customskufeed.textContent = "Please fill in Custom Sku.";
		customskufeed.classList.remove('hide');
	}*/

	formData.append('customSku', customsku);

	let itemBarcode = document.querySelector('#itemBarcode').value;
	
	if (itemBarcode == '') {
		send = false;
		let itemBarcodefeed = document.querySelector('#itemBarcode-feedback');
		itemBarcodefeed.textContent = "Please fill in item barcode.";
		itemBarcodefeed.classList.remove('hide');
	}

	formData.append('itemBarcode', itemBarcode);

	let cartonBarcode = document.querySelector('#cartonBarcode').value;
    let quantityPerCarton = document.querySelector('#quantityPerCarton').value;

    formData.append('cartonBarcode', cartonBarcode);
    formData.append('quantityPerCarton', quantityPerCarton);
    
    /*if (cartonBarcode != '' && quantityPerCarton != '') {
        formData.append('cartonBarcode', cartonBarcode);
        formData.append('quantityPerCarton', quantityPerCarton);
    } else if (cartonBarcode == '' && quantityPerCarton != '') {
        send = false;
        let cartonBarcodefeed = document.querySelector('#cartonBarcode-feedback');
        cartonBarcodefeed.textContent = "Please fill in carton barcode or remove quantity per carton.";
        cartonBarcodefeed.classList.remove('hide');
    } else if (cartonBarcode != '' && quantityPerCarton == '') {
        send = false;
        let quantityPerCartonfeed = document.querySelector('#quantityPerCarton-feedback');
        quantityPerCartonfeed.textContent = "Please fill in quantity per carton or remove carton barcode.";
        quantityPerCartonfeed.classList.remove('hide');
    }*/

	let weight = document.querySelector('#weight').value;
	
	/*if (weight == '') {
		send = false;
		let weightfeed = document.querySelector('#weight-feedback');
		weightfeed.textContent = "Please fill in number of units in carton.";
		weightfeed.classList.remove('hide');
	}*/

	formData.append('weight', weight);

	let stockInHand = document.querySelector('#stockInHand').value;
	
	/*if (stockInHand == '') {
		send = false;
		let stockInHandfeed = document.querySelector('#stockInHand-feedback');
		stockInHandfeed.textContent = "Please fill in stock in hand.";
		stockInHandfeed.classList.remove('hide');
	}*/

	formData.append('stockInHand', stockInHand);

	let stockSent = document.querySelector('#stockSent').value;
	
	/*if (stockSent == '') {
		send = false;
		let stockSentfeed = document.querySelector('#stockSent-feedback');
		stockSentfeed.textContent = "Please fill in stock sent.";
		stockSentfeed.classList.remove('hide');
	}*/

	formData.append('stockSent', stockSent);

	let bay = document.querySelector('#bay').value;
	
	/*if (bay == '') {
		send = false;
		let bayfeed = document.querySelector('#bay-feedback');
		bayfeed.textContent = "Please fill in bay.";
		bayfeed.classList.remove('hide');
	}*/

	formData.append('bay', bay);

	let expiry = document.querySelector('#expiry').value;
    
    if (expiry == '') {
        expiry = '0000-01-01';
    }
    formData.append('expiry', expiry);

	let coreCloseout = document.querySelector('#coreCloseout').value;
	
	/*if (coreCloseout == '') {
		send = false;
		let coreCloseoutfeed = document.querySelector('#coreCloseout-feedback');
		coreCloseoutfeed.textContent = "Please fill in core/closeout.";
		coreCloseoutfeed.classList.remove('hide');
	}*/

	formData.append('coreCloseout', coreCloseout || 0);

	let clearance = document.querySelector('#clearance').value;
	
	/*if (clearance == '') {
		send = false;
		let clearancefeed = document.querySelector('#clearance-feedback');
		clearancefeed.textContent = "Please fill in clearance.";
		clearancefeed.classList.remove('hide');
	}*/

	formData.append('clearance', clearance || 0);

	let supplier = document.querySelector('#supplier').value;
	
	/*if (supplier == '') {
		send = false;
		let supplierfeed = document.querySelector('#supplier-feedback');
		supplierfeed.textContent = "Please fill in supplier.";
		supplierfeed.classList.remove('hide');
	}*/

	formData.append('supplier', supplier);
	
	// add new information to the database
	if (!send) {
		page.notification.show("Please complete the form.");
		return;
	}else{
		clearForm();
	}

	let response = await fetch(apiServer+'addproduct', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let addProductData = await response.json();

	//console.log('addProductData', addProductData);

	if (response.ok && addProductData.result == 'success') {
		//console.log('response', response);		
		page.notification.show("Item added successfully.");
	}
	else {
		page.notification.show(addProductData.result);
	}
}

/*async function addStockReceived() {
	// make array with information provided
	var itemNoSR = document.querySelector('#itemNoSR').value;
	var itemBarcodeSR = document.querySelector('#itemBarcodeSR').value;
	var cartonsReceivedSR = document.querySelector('#cartonsReceivedSR').value;
	var quantityPerCartonSR = document.querySelector('#quantityPerCartonSR').value;
	var dateReceivedSR = document.querySelector('#dateReceivedSR').value;
	var supplierSR = document.querySelector('#supplierSR').value;

	var stockReceived = (stocks[itemBarcodeSR].stockReceived == '0') ? "" : ("," + stocks[itemBarcodeSR].stockReceived.substr(1, stocks[itemBarcodeSR].stockReceived.length - 2));

	var stockReceivedNew = "[{\"cartonsReceived\" : \"" + cartonsReceivedSR.toString() + "\", \"quantityPerCarton\" : \"" 
		+ quantityPerCartonSR.toString() + "\", \"dateReceived\" : \"" + dateReceivedSR.toString() + "\", \"supplier\" : \"" + supplierSR.toString() + "\"}" + stockReceived + "]";
	//var obj = JSON.parse(stockReceived);

	var stockInHandNew = stocks[itemBarcodeSR].stockInHand + cartonsReceivedSR*quantityPerCartonSR;

	// create formData
	let formData = new FormData();
	formData.append('itemBarcode', itemBarcodeSR);
	formData.append('itemNo', itemNoSR);
	formData.append('stockReceived', stockReceivedNew);
	formData.append('stockInHand', stockInHandNew);

	// update stockReceived and stockInHand in database with new array and amount
	let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
    let updateStockInventoryData = await response.json();
    
    loadInventory();
	clearForm();

    if (response.ok && updateStockInventoryData.result == 'success') {
        page.notification.show("Item updated successfully.");
    }
    else {
        page.notification.show(updateStockInventoryData.result);
    }
}*/

async function addStockReceived() {

	let send = true;
	let formData = new FormData();

	let customSkuSR = document.querySelector('#customSkuSR').value;
	if (customSkuSR == '') {
		send = false;
		let customSkuSRFeed = document.querySelector('#customSkuSR-feedback');
		customSkuSRFeed.textContent = "Please fill in Custom SKU.";
		customSkuSRFeed.classList.remove('hide');
	}

	let itemsReceivedSR = document.querySelector('#itemsReceivedSR').value || 0;
	if (itemsReceivedSR == '') {
		send = false;
		let itemsReceivedSRFeed = document.querySelector('#itemsReceivedSR-feedback');
		itemsReceivedSRFeed.textContent = "Please fill in Item Quantity.";
		itemsReceivedSRFeed.classList.remove('hide');
	}

	let cartonsReceivedSR = document.querySelector('#cartonsReceivedSR').value || 0; 
	if (cartonsReceivedSR == '') {
		send = false;
		let cartonsReceivedSRFeed = document.querySelector('#cartonsReceivedSR-feedback');
		cartonsReceivedSRFeed.textContent = "Please fill in Carton Quantity.";
		cartonsReceivedSRFeed.classList.remove('hide');
	}

	let dateReceivedSR = document.querySelector('#dateReceivedSR').value; 
	if (dateReceivedSR == '') {
		send = false;
		let dateReceivedSRFeed = document.querySelector('#dateReceivedSR-feedback');
		dateReceivedSRFeed.textContent = "please fill in Date Received.";
		dateReceivedSRFeed.classList.remove('hide');
	}
	var stockReceived = 'IQ: '+ itemsReceivedSR + ', CQ: '+ cartonsReceivedSR + ', Date: '+ dateReceivedSR;
	
	formData.append('customSku', customSkuSR);
	formData.append('stockReceived',stockReceived);
	/*formData.append('addfromindivStock', itemsReceivedSR);
	formData.append('addfromcartonStock', cartonsReceivedSR);*/

	let response = await fetch(apiServer+'stockInventory/update', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
    let updateStockInventoryData = await response.json();

    //loadInventory();
	// clearForm();

    if (response.ok && updateStockInventoryData.result == 'success') {
        page.notification.show("Item updated successfully.");
    }
    else {
        page.notification.show(updateStockInventoryData.result);
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

/*function searchInventory() {
	var input, filter, table, tr, td, i, txtValue, catClass, sel, className, catSelect;
	catClass = document.getElementById("category");
	input = document.getElementById("table_filter");
	filter = input.value.toUpperCase();//value being searched for
	table = document.getElementById("item-table");
	console.log(catClass.options[0].value);
	console.log(catClass.options[catClass.selectedIndex]);
	sel = catClass.options[catClass.selectedIndex];
	

	tr = table.getElementsByTagName("tr");
	for (i = 0; i < tr.length; i++) {
		if(catClass.options[0] == sel){
		td = tr[i].getElementsByTagName("td")[0];
	} else if(catClass.options[1] == sel){
		td = tr[i].getElementsByTagName("td")[0];
	} else if(catClass.options[2] == sel){
		td = tr[i].getElementsByTagName("td")[1];
	} else if(catClass.options[3] == sel){
		td = tr[i].getElementsByTagName("td")[2];
	} else if(catClass.options[4] == sel){
		td = tr[i].getElementsByTagName("td")[3];
	} else if(catClass.options[5] == sel){
		td = tr[i].getElementsByTagName("td")[4];
	} else if(catClass.options[6] == sel){
		td = tr[i].getElementsByTagName("td")[5];
	} else if(catClass.options[7] == sel){
		td = tr[i].getElementsByTagName("td")[6];
	} else if(catClass.options[8] == sel){
		td = tr[i].getElementsByTagName("td")[7];
	} else if(catClass.options[9] == sel){
		td = tr[i].getElementsByTagName("td")[8];
	} else if(catClass.options[10] == sel){
		td = tr[i].getElementsByTagName("td")[9];
	} else if(catClass.options[11] == sel){
		td = tr[i].getElementsByTagName("td")[10];
	} else if(catClass.options[12] == sel){
		td = tr[i].getElementsByTagName("td")[11];
	} else if(catClass.options[13] == sel){
		td = tr[i].getElementsByTagName("td")[12];
	} else if(catClass.options[14] == sel){
		td = tr[i].getElementsByTagName("td")[13];
	} else {
		td = tr[i].getElementsByTagName("td")[14];
	}
		if (td) {
			txtValue = td.textContent || td.innerText;
			console.log(td.textContent,td.innerText);
			if (txtValue.toUpperCase().indexOf(filter) > -1) {
				tr[i].style.display = "";
			} else {
				tr[i].style.display = "none";
			}
		}       
	}
}*/

function addNewRow() {
	let bayTab = document.getElementById('bay-table-body');
	let cols = ['Actions', 'type', 'location', 'looseQty'];

	let rowCnt = bayTab.rows.length;
	let tr = bayTab.insertRow(rowCnt);

	for (let c = 0; c < cols.length; c++) {
		let td = document.createElement('td'); 
		td = tr.insertCell(c);

		if (c == 0) {  
			let reBtn = document.createElement('input');
			reBtn.setAttribute('type', 'button');
            reBtn.setAttribute('value', 'Remove');  
            reBtn.setAttribute('id','removeRow');  

	            reBtn.addEventListener("click", function(e){        		
	        		removeRows(e);       			
	        	});

            td.appendChild(reBtn);
			td.setAttribute('class','Actions');           
		}
		else if (c == 3){
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
		else if (c == 4){
			let decvalBtn = document.createElement('input');
			decvalBtn.setAttribute('type', 'button');
        	decvalBtn.setAttribute('value', '⮜');
        	decvalBtn.setAttribute('class','decreaseValue number-Picker btn-red');
        	td.appendChild(decvalBtn); 

	        	decvalBtn.addEventListener("click", function(e){
	        		cartonDecreaseValue(e);
	        	});

        	let ele = document.createElement('input');
    		ele.setAttribute('type', 'text'); 
    		ele.setAttribute('value', '0');
    		ele.setAttribute('id','cartQty');
    		td.appendChild(ele); 

    		let incvalBtn = document.createElement('input');
			incvalBtn.setAttribute('type', 'button');
        	incvalBtn.setAttribute('value', '⮞');
        	incvalBtn.setAttribute('class','increaseValue number-Picker btn-green');
        	td.appendChild(incvalBtn); 

        	td.setAttribute('class','cartonQty');

	        	incvalBtn.addEventListener("click", function(e){
	        		cartonIncreaseValue(e);
	        	});
		} 
		else if(c == 1) {
			let select = document.createElement('select');
			select.id = 'types';
			for (let type of ['-', 'B2B','B2C']) {
				let option = document.createElement('option');
				option.value = type;
				option.textContent = type;
				select.appendChild(option);
			}
			td.appendChild(select);
		}
		else {
			let ele = document.createElement('input');
        	ele.setAttribute('type', 'text');
            ele.setAttribute('value', '');
            ele.setAttribute('id','bay');
            td.appendChild(ele);
            td.setAttribute('class','location');
		}
	}

}

async function saveBayDetails(){
	// console.log('11');

	let bayTab =  document.querySelector('#bay-table-body');
	let trs = document.querySelectorAll('#bay-table-body tr');

	let locations = [];
	let invID = bayTab.dataset.id;
	let customSku =  bayTab.dataset.sku;
	let stockQPC = bayTab.dataset.quantityPerCarton;

	let arrayLocNames = [];

	for(let tr of trs) {
		let location = {};
		location.id = tr.dataset.id;
		if (isNaN(tr.querySelector('#indiQty').value) || tr.querySelector('#indiQty').value == "" || tr.querySelector('#indiQty').value === null || tr.querySelector('#indiQty').value < 1){
			swal('ERROR: Not a valid Number => '+tr.querySelector('#indiQty').value,'Please update the value at bay: '+tr.querySelector('#bay').value,'error');
			//tr.querySelector('#indiQty').value = tr.dataset.indivQty;
			return;
		}
		else {
			location.indivQty = parseInt(tr.querySelector('#indiQty').value);
		}
		// location.cartonQty =  parseInt(tr.querySelector('#cartQty').value);

		if (tr.querySelector('#bay').value == "" || tr.querySelector('#bay').value === null || trim(tr.querySelector('#bay').value) == ""){
			swal('ERROR:',"Location name can't be empty!",'error');
			return;
		}
		else{
			var letters = /^[A-Za-z ^0-9-]+$/;
			if(tr.querySelector('#bay').value.match(letters)){
				let checkLocationName = tr.querySelector('#bay').value.replace(/\s+/g, '').toUpperCase();//remove space betweem words;
				if (checkLocationName.startsWith('EMG-')){
					//location.bay = checkLocationName;
					tr.querySelector('#bay').value = checkLocationName;
				}
				else{
					tr.querySelector('#bay').value = tr.querySelector('#bay').value.replace(/^\s+|\s+$|\s+(?=\s)/g, "").toUpperCase(); //remove initial space or more than 1 betweem words;
				}
				//check if it is trying to transfer a bay that has 0 quantity to a new location
				if (tr.dataset.indivQty <= 0 && tr.querySelector('#bay').value != tr.dataset.bay){
					swal('Error: Transfer quantity equal to 0 not allowed!','Update or remove quantity for item at bay '+tr.dataset.bay+' before tranfer to '+tr.querySelector('#bay').value,'error');
					tr.querySelector('#bay').value = tr.dataset.bay;
					tr.querySelector('#indiQty').value = tr.dataset.indivQty;
					return;
				}
				if (arrayLocNames.includes(tr.querySelector('#bay').value) == false) { //check if word is duplicated
					location.bay = tr.querySelector('#bay').value;


					arrayLocNames.push(location.bay);
				}
				else{
                	swal('ERROR:','Duplicated entry => '+tr.querySelector('#bay').value,'error');
                	return;
                }
			}			
		 	else {
		 		swal('Warning:','Special character detected!','warning');
		 		return;
		 	}
		}
		location.type = tr.querySelector('#types').value;
		if (tr.dataset.reason){
			location.reason = tr.dataset.reason;
		}
		locations.push(location);
	}

	let formData = new FormData();
	formData.append('invID',invID);
	formData.append('customSku',customSku);
	formData.append('locations',JSON.stringify(locations));

	let response = await fetch(apiServer+'stockInventoryBay/update', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let responseData = await response.json();

	if (!response.ok || responseData.result != 'success') {		
		page.notification.show(responseData.result);
	} else {
		let stock = responseData.data;
		stocks[stock.id] = stock;
		let tr = document.querySelector('#item-table-body tr[data-id="'+stock.id+'"]');
		updateTableRow(tr,stock);
		let baytBody = document.querySelector('#location #bay-table-body');

		while (baytBody.firstChild) {
			baytBody.removeChild(baytBody.firstChild);
		}

		let cols = ['Actions', 'type', 'location', 'looseQty'];
		let colsEditable = ['location', 'type', 'looseQty'];

		let locations = stocks[stock.id].locations;
		
		let indivSum = 0;
		let cartonSum = 0;
		let b2bIndivSum = 0;
		let b2bCartonSum = 0;
		let b2cIndivSum = 0;
		let b2cCartonSum = 0;

		for(let loc of locations) {

			indivSum = indivSum + parseInt(loc.indivQty);
			cartonSum = cartonSum + parseInt(loc.cartonQty);

			if (loc.type=='B2B') {
				b2bIndivSum = b2bIndivSum + parseInt(loc.indivQty);
				b2bCartonSum = b2bCartonSum + parseInt(loc.cartonQty);
			}
			else if (loc.type=='B2C') {
				b2cIndivSum = b2cIndivSum + parseInt(loc.indivQty);
				b2cCartonSum = b2cCartonSum + parseInt(loc.cartonQty);
			}

			let b2btotal = document.querySelector('#b2bTotal');
			b2btotal.textContent = b2bIndivSum + b2bCartonSum*stockQPC;


			let b2ctotal = document.querySelector('#b2cTotal');
			b2ctotal.textContent = b2cIndivSum + b2cCartonSum*stockQPC;

			let totalQty = document.querySelector('#totalQty');
			totalQty.textContent = indivSum + cartonSum*stockQPC;


			let tr = document.createElement('tr');
			tr.dataset.id = loc.id;
			for (let col of cols) {
				let td = document.createElement('td');
				td.classList.add(col);
				// if (colsEditable.includes(col)) {
				// 	td.contentEditable = true;
				// }

				if(col == 'Actions') {
					var reBtn = document.createElement('input');
					reBtn.setAttribute('type', 'button');
                	reBtn.setAttribute('value', 'Remove');
                	reBtn.setAttribute('id','removeRow');
                	// reBtn.setAttribute('style','font-weight: bold;');
                	td.appendChild(reBtn);      

                	reBtn.addEventListener("click", function(e){
                		removeRows(e);
                	});	
                } 
                else if (col == 'location') {
                	var ele = document.createElement('input');
            		ele.setAttribute('type', 'text');
            		ele.setAttribute('value', loc['bay']);
            		ele.setAttribute('id','bay');
            		td.appendChild(ele); 

                }
                else if (col == 'looseQty') {
                	var decvalBtn = document.createElement('input');
					decvalBtn.setAttribute('type', 'button');
                	decvalBtn.setAttribute('value', '⮜');
                	decvalBtn.setAttribute('class','decreaseValue number-Picker btn-red');
                	td.appendChild(decvalBtn); 

                	decvalBtn.addEventListener("click", function(e){
                		indivDecreaseValue(e);
                	});
                	decvalBtn.addEventListener("blur", function(e){
                		openReasonPopUp(e);
                	});
                	var ele = document.createElement('input');
            		ele.setAttribute('type', 'text');           		
            		ele.setAttribute('value', loc['indivQty']);
            		ele.setAttribute('id','indiQty');
            		td.appendChild(ele); 

            		ele.addEventListener("blur", function(e){
	            		openReasonPopUp(e);
		    		});

            		var incvalBtn = document.createElement('input');
					incvalBtn.setAttribute('type', 'button');
                	incvalBtn.setAttribute('value', '⮞');
                	incvalBtn.setAttribute('class','increaseValue number-Picker btn-green');
                	td.appendChild(incvalBtn); 

                	incvalBtn.addEventListener("click", function(e){
                		indivIncreaseValue(e);
                	});
                	incvalBtn.addEventListener("blur", function(e){
                		openReasonPopUp(e);
                	});

                }
                else if (col == 'cartonQty') {
                	var decvalBtn = document.createElement('input');
					decvalBtn.setAttribute('type', 'button');
                	decvalBtn.setAttribute('value', '⮜');
                	decvalBtn.setAttribute('class','decreaseValue number-Picker btn-red');
                	td.appendChild(decvalBtn); 

                	decvalBtn.addEventListener("click", function(e){
                		cartonDecreaseValue(e);
                	});

                	var ele = document.createElement('input');
            		ele.setAttribute('type', 'text'); 
            		ele.setAttribute('value', loc['cartonQty']);
            		ele.setAttribute('id','cartQty');
            		td.appendChild(ele); 

            		var incvalBtn = document.createElement('input');
					incvalBtn.setAttribute('type', 'button');
                	incvalBtn.setAttribute('value', '⮞');
                	incvalBtn.setAttribute('class','increaseValue number-Picker btn-green');
                	td.appendChild(incvalBtn); 

                	incvalBtn.addEventListener("click", function(e){
                		cartonIncreaseValue(e);
                	});
                } 
            	else if (col == 'type') {

     				let select = document.createElement('select');
					select.setAttribute('id','types');

					let types = ['-', 'B2B', 'B2C'];

					for (let type of types) {
						let option = document.createElement('option');
						option.setAttribute('value', type);
						option.textContent = type;

						select.appendChild(option);
					}
					select.value = loc['type'] ? loc['type'] : '-'; 	
										
					td.appendChild(select);
                }
                else {
                	td.textContent = "" ;        
                }
                tr.appendChild(td);
			}
			baytBody.appendChild(tr);
		}

		page.notification.show('Inventory updated successfully..');
		closeBox();
	}
}

function updateTableRow(tr, stock) {
	let b2bLooseQty = parseInt(stock.indivQty);
	let b2bCartonQty = parseInt(stock.cartonQty);
	let b2cLooseQty = parseInt(stock['3PLIndivQty']);
	let b2cCartonQty = parseInt(stock['3PLCartonQty']);
	let quantityPerCarton = parseInt(stock.quantityPerCarton || 0);

	tr.querySelector('#totalQuantity').textContent = b2bLooseQty + b2bCartonQty*quantityPerCarton + b2cLooseQty + b2cCartonQty*quantityPerCarton;
	tr.querySelector('#stockInHand').textContent = b2bLooseQty + b2bCartonQty*quantityPerCarton;
	tr.querySelector('td[data-col="indivQty"]').textContent = b2bLooseQty;
	// tr.querySelector('td[data-col="cartonQty"]').textContent = b2bCartonQty;
	tr.querySelector('#b2ctotal').textContent = b2cLooseQty + b2cCartonQty*quantityPerCarton;
	tr.querySelector('td[data-col="3PLIndivQty"]').textContent = b2cLooseQty;
	tr.querySelector('td[data-col="3PLCartonQty"]').textContent = b2cCartonQty;
}

	function showLocationDetails(e){

		document.getElementById('box-outer').classList.add('flex');
		document.getElementById('location').classList.remove('hide');

		let baytBody = document.querySelector('#location #bay-table-body');

		let stockID = e.target.closest('tr').dataset.id;
		document.querySelector('#bay-table-body').dataset.id = stockID;

		let stockSKU = e.target.closest('tr').dataset.sku;
		document.querySelector('#bay-table-body').dataset.sku = stockSKU;
		document.querySelector('#sku span').textContent = stockSKU;

		let stockName = e.target.closest('tr').dataset.name;
		document.querySelector('#itemname span').textContent = stockName;

		let stockQPC = e.target.closest('tr').dataset.quantityPerCarton;
		if (stockQPC == 'null') {stockQPC=0};
		document.querySelector('#bay-table-body').dataset.quantityPerCarton = stockQPC;

		while (baytBody.firstChild) {
			baytBody.removeChild(baytBody.firstChild);
		}

		let cols = ['Actions', 'type', 'location', 'looseQty'];
		let colsEditable = ['location', 'looseQty'];

		let locations = stocks[stockID].locations;
		let indivSum = 0;
		let cartonSum = 0;
		let b2bIndivSum = 0;
		let b2bCartonSum = 0;
		let b2cIndivSum = 0;
		let b2cCartonSum = 0;

		for(let loc of locations) {

			indivSum = indivSum + parseInt(loc.indivQty);
			cartonSum = cartonSum + parseInt(loc.cartonQty);

			if (loc.type=='B2B') {
				b2bIndivSum = b2bIndivSum + parseInt(loc.indivQty);
				b2bCartonSum = b2bCartonSum + parseInt(loc.cartonQty);
			}
			else if (loc.type=='B2C') {
				b2cIndivSum = b2cIndivSum + parseInt(loc.indivQty);
				b2cCartonSum = b2cCartonSum + parseInt(loc.cartonQty);
			}
		

			let tr = document.createElement('tr');
			tr.dataset.id = loc.id;
			tr.dataset.indivQty = loc['indivQty'];
			tr.dataset.bay = loc.bay;
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
                		removeRows(e);
                	});	
                } 
                else if (col == 'location') {
                	let ele = document.createElement('input');
            		ele.setAttribute('type', 'text');
            		ele.setAttribute('value', loc['bay']);
            		ele.setAttribute('id','bay');
            		td.appendChild(ele); 

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
                	decvalBtn.addEventListener("blur", function(e){
                		openReasonPopUp(e);
                	});

                	let ele = document.createElement('input');
            		ele.setAttribute('type', 'text');           		
            		ele.setAttribute('value', loc['indivQty']);
            		ele.setAttribute('id','indiQty');
            		td.appendChild(ele); 

            		ele.addEventListener("blur", function(e){
	            		openReasonPopUp(e);
		    		});

            		let incvalBtn = document.createElement('input');
					incvalBtn.setAttribute('type', 'button');
                	incvalBtn.setAttribute('value', '⮞');
                	incvalBtn.setAttribute('class','increaseValue number-Picker btn-green');
                	td.appendChild(incvalBtn); 

                	incvalBtn.addEventListener("click", function(e){
                		indivIncreaseValue(e);
                	});
                	incvalBtn.addEventListener("blur", function(e){
                		openReasonPopUp(e);
                	});

                }
                else if (col == 'cartonQty') {
                	let decvalBtn = document.createElement('input');
					decvalBtn.setAttribute('type', 'button');
                	decvalBtn.setAttribute('value', '⮜');
                	decvalBtn.setAttribute('class','decreaseValue number-Picker btn-red');
                	td.appendChild(decvalBtn); 

                	decvalBtn.addEventListener("click", function(e){
                		cartonDecreaseValue(e);
                	});

                	let ele = document.createElement('input');
            		ele.setAttribute('type', 'text'); 
            		ele.setAttribute('value', loc['cartonQty']);
            		ele.setAttribute('id','cartQty');
            		td.appendChild(ele); 

            		let incvalBtn = document.createElement('input');
					incvalBtn.setAttribute('type', 'button');
                	incvalBtn.setAttribute('value', '⮞');
                	incvalBtn.setAttribute('class','increaseValue number-Picker btn-green');
                	td.appendChild(incvalBtn); 

                	incvalBtn.addEventListener("click", function(e){
                		cartonIncreaseValue(e);
                	});
                } else if (col == 'type') {

					let select = document.createElement('select');
					select.setAttribute('id','types');

					let types = ['-', 'B2B', 'B2C'];

					for (let type of types) {
						let option = document.createElement('option');
						option.setAttribute('value', type);
						option.textContent = type;

						select.appendChild(option);
					}
					select.value = loc['type'] ? loc['type'] : '-'; 	

					td.appendChild(select);
                }
                else {
                	td.textContent = "" ;        
                }
                tr.appendChild(td);
			}
			baytBody.appendChild(tr);
		}

		let b2btotal = document.querySelector('#b2bTotal');
		b2btotal.textContent = b2bIndivSum + b2bCartonSum*stockQPC;


		let b2ctotal = document.querySelector('#b2cTotal');
		b2ctotal.textContent = b2cIndivSum + b2cCartonSum*stockQPC;

		let totalQty = document.querySelector('#totalQty');
		totalQty.textContent = indivSum + cartonSum*stockQPC;		
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

function cartonDecreaseValue(e) {
	let input = e.target.parentNode.querySelector('#cartQty');
	let value = parseInt(input.value, 10);
    value = isNaN(value) ? 0: value;
    value < 1 ? value = 1 : '';
    value--;

    input.value = value;
}

function cartonIncreaseValue(e) {
    let input = e.target.parentNode.querySelector('#cartQty');
    let value = parseInt(input.value, 10);
    value = isNaN(value) ? 0: value;
    value++;

    input.value = value;
}

async function removeRows(e) {
	// console.log('11');
	
	document.querySelector('#reason_to_delete_input').value = "";
	if (sessionStorage.getItem('deletePassword')) {
		document.querySelector('#delete_password').value = sessionStorage.getItem('deletePassword');
	} else {
		document.querySelector('#delete_password').value = '';
	}
	document.querySelector('#reason-to-delete-save').addEventListener('click', function() {
		deleteRow(e)},false); 
	document.querySelector('.reason_to_delete_box').style.display = 'inline-block';
		
}		
		
	
async function deleteRow(e) {
	let deletePassword = document.querySelector('#delete_password').value;

	if (deletePassword != DELETE_PASSWORD) {
		swal('Wrong Password.');
		return;
	}

	sessionStorage.setItem('deletePassword',deletePassword);
	let reason = document.querySelector('#reason_to_delete_input').value.toUpperCase();
	if (reason == null || reason == ""){
		swal('Please specify a reason.');
		return;
	}

	let bayTab =  document.querySelector('#bay-table-body');
	let trs = bayTab.querySelectorAll('tr');

	let locations = [];
	let invID = bayTab.dataset.id;;
	let tr = e.target.parentNode.parentNode;

	let location = {};		
	location.id = tr.dataset.id;
	//location.indivQty =   parseInt(tr.querySelector('#indiQty').value);
	location.indivQty = tr.dataset.indivQty;
	location.bay = tr.querySelector('#bay').value;
	// location.cartonQty =  parseInt(tr.querySelector('#cartQty').value);
	location.type = tr.querySelector('#types').value;
	// //location.quantityPerCarton = parseInt(tr.parentNode.dataset.quantityPerCarton);

	// for(tr of trs) {				
	// 	let location = {};		
	// 	location.id = tr.dataset.id;
	// 	location.indivQty =   parseInt(tr.querySelector('#indiQty').value);
	// 	location.cartonQty =  parseInt(tr.querySelector('#cartQty').value);
	// 	location.bay =  tr.querySelector('#bay').value;
	// 	location.type = tr.querySelector('#types').value;
	//  	locations.push(location);
	// }

 	let formData = new FormData();
	formData.append('invID',invID);
	formData.append('location',JSON.stringify(location));
	formData.append('reason',reason);

	//formData.append('locations',JSON.stringify(locations));

	let response = await fetch(apiServer+'stockInventoryBay/remove', {method: 'delete', headers: {'DC-Access-Token': page.userToken}, body: formData});
	let responseData = await response.json();

	if (!response.ok || responseData.result != 'success') {					
		page.notification.show(responseData.result);
	} else {
		
		let stock = responseData.data;
		stocks[stock.id] = stock;
		let tr2 = document.querySelector('#item-table-body tr[data-id="'+stock.id+'"]');
		updateTableRow(tr2, stock);

		let locations = stock.locations;
		let indivSum = 0;
		let cartonSum = 0;
		let b2bIndivSum = 0;
		let b2bCartonSum = 0;
		let b2cIndivSum = 0;
		let b2cCartonSum = 0;
		// console.log(tr);
		let stockQPC = parseInt(tr.parentNode.dataset.quantityPerCarton);
		
		for(let loc of locations) {

			indivSum = indivSum + parseInt(loc.indivQty);
			cartonSum = cartonSum + parseInt(loc.cartonQty);

			if (loc.type=='B2B') {
				b2bIndivSum = b2bIndivSum + parseInt(loc.indivQty);
				b2bCartonSum = b2bCartonSum + parseInt(loc.cartonQty);
			}
			else if (loc.type=='B2C') {
				b2cIndivSum = b2cIndivSum + parseInt(loc.indivQty);
				b2cCartonSum = b2cCartonSum + parseInt(loc.cartonQty);
			}
		}
		let b2btotal = document.querySelector('#b2bTotal');
		b2btotal.textContent = b2bIndivSum + b2bCartonSum*stockQPC;


		let b2ctotal = document.querySelector('#b2cTotal');
		b2ctotal.textContent = b2cIndivSum + b2cCartonSum*stockQPC;

		let totalQty = document.querySelector('#totalQty');
		totalQty.textContent = indivSum + cartonSum*stockQPC;

		bayTab.removeChild(tr);	
		page.notification.show('The selected bay has been removed..');

	}

	document.querySelector('.reason_to_delete_box').style.display = 'none'; 

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

function clearForm() {
	if (document.querySelector('#itemNo') != null) { document.querySelector('#itemNo').value = ''; }
	if (document.querySelector('#itemName') != null) { document.querySelector('#itemName').value = ''; }
	if (document.querySelector('#sku') != null) { document.querySelector('#sku').value = ''; }
	if (document.querySelector('#customsku') != null) { document.querySelector('#customsku').value = ''; }
	if (document.querySelector('#itemBarcode') != null) { document.querySelector('#itemBarcode').value = ''; }
	if (document.querySelector('#cartonBarcode') != null) { document.querySelector('#cartonBarcode').value = ''; }
	if (document.querySelector('#quantityPerCarton') != null) { document.querySelector('#quantityPerCarton').value = ''; }
	if (document.querySelector('#weight') != null) { document.querySelector('#weight').value = ''; }
	if (document.querySelector('#stockInHand') != null) { document.querySelector('#stockInHand').value = ''; }
	if (document.querySelector('#stockReceived') != null) { document.querySelector('#stockReceived').value = ''; }
	if (document.querySelector('#stockSent') != null) { document.querySelector('#stockSent').value = ''; }
	if (document.querySelector('#bay') != null) { document.querySelector('#bay').value = ''; }
	if (document.querySelector('#expiry') != null) { document.querySelector('#expiry').value = ''; }
	if (document.querySelector('#coreCloseout') != null) { document.querySelector('#coreCloseout').value = ''; }
	if (document.querySelector('#clearance') != null) { document.querySelector('#clearance').value = ''; }
	if (document.querySelector('#supplier') != null) { document.querySelector('#supplier').value = ''; }
	/*if (document.querySelector('#itemNoSR') != null) { document.querySelector('#itemNoSR').value = ''; }
	if (document.querySelector('#itemBarcodeSR') != null) { document.querySelector('#itemBarcodeSR').value = ''; }
	if (document.querySelector('#cartonsReceivedSR') != null) { document.querySelector('#cartonsReceivedSR').value = ''; }
	if (document.querySelector('#quantityPerCartonSR') != null) { document.querySelector('#quantityPerCartonSR').value = ''; }*/
	if (document.querySelector('#customSkuSR') != null) { document.querySelector('#customSkuSR').value = ''; }
	if (document.querySelector('#itemQtySR') != null) { document.querySelector('#itemQtySR').value = ''; }
	if (document.querySelector('#cartonQtySR') != null) { document.querySelector('#cartonQtySR').value = ''; }
	if (document.querySelector('#dateReceivedSR') != null) { document.querySelector('#dateReceivedSR').value = ''; }
	//if (document.querySelector('#supplierSR') != null) { document.querySelector('#supplierSR').value = ''; }
}

function isValidDate(dateString) {
  var regEx = /^\d{4}-\d{2}-\d{2}$/;
  if(!dateString.match(regEx)) return false;  // Invalid format
  var d = new Date(dateString);
  var dNum = d.getTime();
  if(!dNum && dNum !== 0) return false; // NaN value, Invalid date
  return d.toISOString().slice(0,10) === dateString;
}

function trim (str) {
    str = str.replace(/^\s+/, '');
    for (var i = str.length - 1; i >= 0; i--) {
        if (/\S/.test(str.charAt(i))) {
            str = str.substring(0, i + 1);
            break;
        }
    }
    return str;
}

function openReasonPopUp(e){
	document.querySelector('#reason').value = "";
	document.querySelector('#reason-save').addEventListener('click', function() {
		saveReason(e)},false); 
	//addListener('#reason-save', 'click', saveReason(e),false);
	if (parseInt(e.target.closest('tr').querySelector('#indiQty').value) != parseInt(e.target.closest('tr').dataset.indivQty)){
		document.querySelector('.hover_bkgr_fricc').style.display = 'inline-block';
		document.querySelector('#numQty').textContent = e.target.closest('tr').querySelector('#indiQty').value+'?';
		//document.querySelector('.hover_bkgr_fricc').
		//save Reason details
		
	}
}

function saveReason(e){
	let reason = document.querySelector('#reason').value.replace(/^\s+|\s+$|\s+(?=\s)/g, "").toUpperCase();
	if (reason == null || reason == "" || reason.length < 6){
		swal('Please specify a reason.','Reason must be at least 6 characters.','error');
		return;
	}
	e.target.closest('tr').dataset.reason = reason;
	document.querySelector('.hover_bkgr_fricc').style.display = 'none';
}