//import '/common/stores.js';
import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener} from '/common/tools.js';
//import {loadBay, loadBayStage, loadBayBulk, closeBox2, transferSelectedItems, copyLocationValue, toggle, checkLocationTable, highlightLastTransfers, highlight, isExistedBay, createLocation, deleteRow} from '/locations/locationdetails.js';


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
	local: window.location.hostname.startsWith('1'),
	localUser: !!localStorage.getItem('local')
	
};

window.locations = {};
window.stocks = {};

if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	// back to menu button
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/locations/locations.html';
	});

    addListener('#back-to-locations', 'click', function(e) {
        window.location.href = '/locations/locations.html';
    });

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const id = urlParams.get('id');
    const brand = urlParams.get('brand');
    if (id){await loadItemInventory(id)}
    else if (brand){await loadBrandInventory(brand)};


	var barcodeScanner = {
        value: '',
        startTime: null,
        timer: null,
        timeLimit: 600,
	};

	// Close popup box
    document.querySelector('#box-container2 .close').addEventListener('click', closeBox2);

    // Select items
    document.getElementById("select-items").addEventListener("click", (event) => {
        let barcode = document.getElementById("item-input-select").value;
        GoToItemPage(barcode);
    });
    
    //change backgroundColor selected items
    changeBackgroundColor();

    document.querySelector('.toggle').addEventListener("change", toggle);
    document.getElementById("select-all").addEventListener("click", (event) => {
        if (document.querySelector('.toggle').checked == true){
            document.querySelector('.toggle').checked = false;
            toggle();
        }
        else {
            document.querySelector('.toggle').checked = true;
            toggle();
        }
    });

    document.getElementById("transfer-selected").addEventListener("click", transferSelectedItems);


    addListener('#send-items-selected', 'click', function() {
        executeTransfer();
    });

    document.addEventListener('keypress', async function(e) {
        if (e.charCode == 13 || e.charCode == 0) { // 13, 0; Enter key
            e.preventDefault();
            e.stopPropagation();

            clearTimeout(barcodeScanner.timer);
            barcodeScanner.timer = null;
            console.log(barcodeScanner.value);

            document.getElementById("item-input-select").value = barcodeScanner.value;

            if (document.getElementById('location2').classList == 'hide'){
                if (document.getElementById("item-input-select").value === null || document.getElementById("item-input-select").value == ""){
                    transferSelectedItems();
                }
                else {
                    let itemInputSelect = document.getElementById("item-input-select").value;
                    GoToItemPage(itemInputSelect);
                }
            }
            else{
                executeTransfer();
            }

            barcodeScanner.value = ''; // Reset barcode scanner value
        }
        else if (e.charCode == 9){
            //window.location.href = '/locations/locations.html';
        }

        else {
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

    var ids = []; 
    if (JSON.parse(sessionStorage.getItem("ids"))) {
        ids = JSON.parse(sessionStorage.getItem("ids"));
    }
    else{
        let ids = {
            from: 1,
            to: 5
        };
        ids[Symbol.iterator] = function() {
            return {
            current: this.from,
            last: this.to,
            next() {
              if (this.current <= this.last) {
                return { done: false, value: this.current++ };
              } else {
                return { done: true };
              }
            }
          };
        };
    }
    // console.log(ids);
    await highlightLastTransfers(ids);


});


async function loadBay() {

	let response = await fetch(apiServer+'stockBay/load', {headers: {'DC-Access-Token': page.userToken}});
	let locationData = await response.json();

	if (response.ok && locationData.result == 'success') {
		locations = locationData.locations;
	}
	else {
		page.notification.show(locationData.result);
	}
}

async function loadBayStage() {

    let response = await fetch(apiServer+'stockBayStage/load', {headers: {'DC-Access-Token': page.userToken}});
    let locationData = await response.json();

    if (response.ok && locationData.result == 'success') {
        locations = locationData.locations;
    }
    else {
        page.notification.show(locationData.result);
    }
}

async function loadBayBulk(type) {
    let response = await fetch(apiServer+'stockBayBulk/load/'+type, {headers: {'DC-Access-Token': page.userToken}});
    let locationData = await response.json();

    if (response.ok && locationData.result == 'success') {
        locations = locationData.locations;
    }
    else {
        page.notification.show(locationData.result);
    }
}

async function loadBayInventory(e) {

	stocks = {};
	var tr = e.target.parentNode.parentNode;
	var bay = tr.dataset.bay;

	let response = await fetch(apiServer+'stockBayInventory/load/'+ bay, {headers: {'DC-Access-Token': page.userToken}});
	let stockData = await response.json();

	if (response.ok && stockData.result == 'success') {		
		stocks = stockData.stocks;
	}
	else {
		page.notification.show(stockData.result);
	}
	showBayInventory();
}

async function loadItemInventory(id) {

    stocks = {};
    var id = id;

    let response = await fetch(apiServer+'stockItem/load/'+id, {headers: {'DC-Access-Token': page.userToken}});
    let stockData = await response.json();

    if (response.ok && stockData.result == 'success') {     
        stocks = stockData.stocks;
    }
    else {
        document.querySelector('#bay span').textContent = 'Item '+id+' Not found';
        // console.log(stockData.result);
        page.notification.show(stockData.result);
        loadItemID(id);
    }
    showBayInventory();
}

async function loadBrandInventory(brand) {

    stocks = {};
    var brand = brand;

    let response = await fetch(apiServer+'stockBrand/load/'+brand, {headers: {'DC-Access-Token': page.userToken}});
    let stockData = await response.json();

    if (response.ok && stockData.result == 'success') {     
        stocks = stockData.stocks;
    }
    else {
        document.querySelector('#bay span').textContent = 'Brand '+brand+' Not found';
        // console.log(stockData.result);
        page.notification.show(stockData.result);
    }
    showBayInventory();
}

async function bayTable() {
	var locTBody = document.querySelector('#location-table-body');

	while (locTBody.firstChild) {
		locTBody.removeChild(locTBody.firstChild);
	}

	let cols = ['locations'];

	for (let location of locations) {
		var tr = document.createElement('tr');
		
	 	for (let col of cols) {
        	var td = document.createElement('td');
        	td.dataset.col = col;
        	tr.dataset.bay = location.bay;

        	if (col == 'locations') {
                let viewBtn = document.createElement('input');
                viewBtn.setAttribute('type', 'button');
                var checkLocat = location.bay
                checkLocat = checkLocat.toLowerCase();
                if (checkLocat.startsWith('emg-') && document.getElementById('sts-newWarehouse').checked == true){
                    checkLocat = location.bay.substr(4);
                }
                viewBtn.setAttribute('value', checkLocat.toUpperCase());
                viewBtn.setAttribute('class','viewstock action-btn btn-green2');
                td.appendChild(viewBtn);
                     

                viewBtn.addEventListener("click", async function(e){
                    let locationCopy = location.bay;
                    await copyLocationValue(locationCopy);
                    executeTransfer();                      
                }); 

        	}  
        	tr.appendChild(td);
        }
	    locTBody.appendChild(tr);		
	}
}

function showBayInventory(){
	var itemTBody = document.querySelector('#item-table-body');

	while (itemTBody.firstChild) {
		itemTBody.removeChild(itemTBody.firstChild);
	}

	// document.querySelector('#bay span').textContent = itemTBody.dataset.bay;

	let cols = ['checkbox-col','store', 'itemName', 'sku', 'itemBarcode','total Qty','bay', 'type','indivQty', 'cartonQty', 'quantityPerCarton', 'imagedisplay'/*, 'remove-item'*/];
	let colsEditable = ['total Qty'];

	for (let item in stocks) {
		var tr = document.createElement('tr');		
		var stock = stocks[item];

		tr.dataset.id = stock['id'];
		tr.dataset.invID = stock['invID'];
		tr.dataset.bay = stock['bay'];
		tr.dataset.name = stock.itemName;
		tr.dataset.sku = stock.sku;
        tr.dataset.itemBarcode = stock['itemBarcode'];
		tr.dataset.indivQty = stock['indivQty'];
        tr.dataset.type = stock['type'];

        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const id = urlParams.get('id');
        const brand = urlParams.get('brand');
        if (id){
            document.querySelector('#bay span').textContent = stock['sku']+'(SKU)';}
        else if (brand){
            document.querySelector('#bay span').textContent = stock['brand'];
        };

		for (let col of cols) {
			let td = document.createElement('td');
			// td.classList.add(col);
			if (colsEditable.includes(col)) {
         		td.contentEditable = true;
        		td.classList.add('editable');
         		td.dataset.col = col;
         	}

			if (col == 'store') {
				td.textContent = stores[stock[col]] ? stores[stock[col]].name : '';
			} 	
			else if (col == 'total Qty') {
					td.textContent = stock['indivQty'] + stock['cartonQty']*stock['quantityPerCarton'];
					td.setAttribute("style", "font-size: 35px;");
                    td.addEventListener("blur", function(e){
                        let qty = td.textContent;
                        let id = e.target.closest('tr').dataset.id;
                        let type = e.target.closest('tr').dataset.type;
                        updateQtyinBay(id,qty,type);
                    });
			} 				 
			else if (col == 'imagedisplay') {
				let img = document.createElement('img');
				img.src =  stock['image'];
				img.style.width = '100px';
				td.appendChild(img);
			}
            else if (col == 'cartonQty'){
                td.textContent = stock[col] ;
                td.style.display = "none";
            } 
            else if (col == 'quantityPerCarton'){
                td.textContent = stock[col] ;
                td.style.display = "none";
            }
            else if (col == 'itemBarcode'){
                td.textContent = stock[col] ;
                td.classList.add("itemBarcode");
            }
            else if (col == 'checkbox-col'){
                let container = document.createElement('label');
                container.setAttribute('class','container');
                container.innerHTML = '<input type="checkbox"><span class="checkmark"></span>';
                td.appendChild(container);
            }   
			else if (col == 'indivQty'){
                td.textContent = stock[col] ;
                 td.style.display = "none";
            }
            else if (col == 'remove-item'){
                // button.remove-row
                let child = document.createElement("button");
                child.classList.add("delete-row");
                child.innerHTML = '<i class="icon-minus"></i>';
                
                child.addEventListener("click", (e) => {
                    let id = e.target.closest('tr').dataset.id;
                    let type = e.target.closest('tr').dataset.type;
                    swal({
                        title: "Delete Row?",
                        text: "",
                        icon: "warning",
                        buttons: true,
                        dangerMode: true,
                    })
                    .then((willDelete) => {
                        if (willDelete) {
                            deleteRow(id,type);
                            e.target.closest('tr').remove();
                            page.notification.show('Row removed successfully');
                        }else{
                            return;
                        }
                    });
                });
                td.appendChild(child);
            }
            else if (col == 'type'){
                let type = stock['type'];
                let checkName = stock['bay'].toLowerCase();
                if (checkName.startsWith('stage') || type == 2){td.textContent = 'Stage'}
                else if (checkName.startsWith('emg-')){td.textContent = 'Emega Warehouse'}
                else if (type == 0) {td.textContent = 'Pick Loc'}
                else if (type == 1) {td.textContent = 'Bulk Loc'}
                else if (type == 3) {td.textContent = 'Dispatch'}
            }
            else {
        		td.textContent = stock[col] ;       		
        	}			
			tr.appendChild(td);
		}
		itemTBody.appendChild(tr);
	}

    sessionStorage.bay = document.querySelector('#bay span').textContent;
}

// Close popup box
/*function closeBox() {
	document.getElementById('box-outer').classList.remove('flex');
	setTimeout(function() {
		for (let el of document.querySelectorAll('#box-container > div:not(.close)')) {
			el.classList.add('hide');
		}
	}, 400);
    location.reload();
}*/
function closeBox2() {
    document.getElementById('box-outer2').classList.remove('flex');
    setTimeout(function() {
        for (let el of document.querySelectorAll('#box-container2 > div:not(.close)')) {
            el.classList.add('hide');
        }
    }, 400);
}

async function transferSelectedItems(e){
    let trs = document.querySelectorAll('#item-table-body tr');
    var count = 0;
    for(let tr of trs) {
        if (tr.querySelector('.container input').checked == true){ 
            count++;
        }
    }
    if (count == 0){
        swal('Please select an item.','','warning');
        return;
    }
    document.getElementById('box-outer2').classList.add('flex');
    document.getElementById('location2').classList.remove('hide');
    checkLocationTable();     
    document.getElementById("location-input-target").focus();       
}

function copyLocationValue(locationCopy){
    document.getElementById('location-input-target').value = locationCopy;
}

async function toggle() {
    let trs = document.querySelectorAll('#item-table-body tr');
    if (document.querySelector('.toggle').checked == true) {
       for(let tr of trs) {
            if (tr.querySelector('.container input').checked == false){
                tr.querySelector('.container input').checked = true;
                tr.style.backgroundColor = '#ff8989';
            };
        }
    }
    else{
        for(let tr of trs){
            if (tr.querySelector('.container input').checked == true){
                tr.querySelector('.container input').checked = false;
                tr.style.backgroundColor = 'transparent';
            };
        }
    }
};

async function executeTransfer(){
    if (document.getElementById("location-input-target").value == "" || document.getElementById("location-input-target").value === null){
        swal('Please select a destination.','','warning');
        return;
    }
    let destination = document.getElementById('location-input-target').value.replace(/^\s+|\s+$|\s+(?=\s)/g, ""); //remove initial space or more than 1 betweem words;
    let type = 0;
    let checkDestination = destination.toLowerCase();
    if (document.getElementById('sts-dispatch').checked == true) {
        checkDestination = checkDestination.replace(/\s+/g, ''); //removespaces between words
        type = 3;
        if (checkDestination.startsWith('pallet-')){
            destination = checkDestination;
        }
        else{
            swal('Error: Invalid Name','Dispatch location must start with "Pallet-"','error');
            return;
        }
    }
    else if (document.getElementById('sts-newWarehouse').checked == true) {
        checkDestination = checkDestination.replace(/\s+/g, '');
        if (checkDestination.startsWith('emg-')){
            destination = checkDestination;
        }
        else {
            destination = 'EMG-'+destination;
        }
    }
    else if (checkDestination.startsWith('emg-') && document.getElementById('sts-newWarehouse').checked !== true){
        swal('Error:','EMG- prefix only allowed to Emega Warehouse','error');
        return;
    }

    let tras = document.querySelectorAll('#item-table-body tr');
    for(let tra of tras) {
        let tr = tra.querySelector('.container input');
        if(tr.checked) {

            if (tra.dataset.bay == destination){
                swal('Choose a valid destination!','','warning');
                return;
            }
        }
    }

    var letters = /^[A-Za-z ^0-9-]+$/;
    if (destination.match(letters)){
        var r = await isExistedBay(destination);
    }
    else {
        swal('Warning:','Special character detected, please choose another location!','warning');
        return;
    }
    destination = destination.toUpperCase();

    if (r == false) {

        createLocation(destination,origin,type);

    };
        swal({
            title: "Confirm",
            text: 'Would you like to transfer all selected items to location '+destination+'?',
            icon: "info",
            buttons: true,
        })
        .then(async(willTransfer) => {
            if (willTransfer) {
                let ids = [];
                let cbs = document.querySelectorAll('#item-table-body tr');
                for(let cb of cbs) {
                    let id = {};
                    let tr = cb.querySelector('.container input');
                        if(tr.checked) {
                            id.id = cb.dataset.id;
                            if (!id.id){
                                id.invID = cb.dataset.invID;
                                id.sku = cb.dataset.sku;
                                id.indivQty = cb.querySelector('.totalQty').textContent;
                            }
                            ids.push(id);
                        }
                        else {
                            
                        }
                };

                let formData = new FormData();
                formData.append('origin', origin);
                formData.append('destination', destination);
                formData.append('ids', JSON.stringify(ids));

                let response = await fetch(apiServer+'itemTransferBayBulk/update', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
                let responseData = await response.json();

                if (!response.ok || responseData.result != 'success') {     
                    page.notification.show('ERROR! OPERATION NOT SAVED/TRANSFER');
                    return;
                } 
                else {
                    swal('Transferred Successfully!','','success').then(() => {
                        ids = responseData.ids;
                        sessionStorage.setItem("ids", JSON.stringify(ids));
                        //if (confirm('Inventory updated successfully.. OK: '+destination) == true) {
                        document.location.href = '/locations/locationdetails.html?bay='+destination;
                    });
                  /*
                    }
                    else{
                    document.location.href = '/locations/locationdetails.html?bay='+origin;
                    }*/
                }
        }
        else{
            return;
        }
    });
}   

async function checkLocationTable() {
    document.getElementById("type-select").addEventListener("change", checkLocationTable);
    if (document.getElementById('sts-b2c').checked == true){
    await loadBay();
    await bayTable();
    }
    else if (document.getElementById('sts-dispatch').checked == true){
    let type = 3;
    await loadBayBulk(type);
    await bayTable();
    }
    else if (document.getElementById('sts-newWarehouse').checked == true){
    let type = 4;
    await loadBayBulk(type);
    await bayTable();
    }
    else{
    await loadBayStage();
    await bayTable();
    }
}

/*async function checker(){
    let cbs = document.querySelectorAll('#item-table-body tr');
        for(let cb of cbs) {
            let tr = cb.querySelector('.container input');
            tr.addEventListener('change', function() {
                if(this.checked) {
                    cb.style.backgroundColor = '#ff8989';
                    //cb.querySelector('.container input').style.backgroundColor = 'red';
                }
                else {
                    //cb.querySelector('.container input').style.backgroundColor = '#fff';
                    cb.style.backgroundColor = 'transparent';
                }
            });
        }
}*/

async function highlightLastTransfers(ids){
     let cbs = document.querySelectorAll('#item-table-body tr');
                for(let cb of cbs) {
                        for(let id of ids){
                           if (cb.dataset.id == id.id){
                           highlight(cb);
                           }
                           else {}
                        }
                }
}

async function highlight(cb){
   var orig = cb.style.backgroundColor;
   cb.style.backgroundColor = '#BEFBD7';
   setTimeout(function(){
        cb.style.backgroundColor = orig;
   }, 60000);
}

/*async function updateLocationType(bay,type){
    let formData = new FormData();
        formData.append('type', type);

    let response = await fetch(apiServer+'updatelocationtype/'+bay, {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
    let responseData = await response.json();

    if (!response.ok || responseData.result != 'success') {     
            // console.log(response);
            // console.log(responseData.result);
            page.notification.show("ERROR: Couldn't change the type.");
            return;
    } 
    else {
        page.notification.show("Type updated Successfully!");
    }

}*/

async function isExistedBay(destination){
    let bay = destination;
    let response = await fetch(apiServer+'checklocationvalid/'+bay, {headers: {'DC-Access-Token': page.userToken}});
    let validBayData = await response.json();
    var found = false;
    if (response.ok && validBayData.result == 'success') {     
        found = true;
    }
    else if (validBayData.return == false){
        found = false;
    }
    else{
        swal('Fatal error','','error');
    }
    return found;
}

async function createLocation(destination,origin,type){
    // console.log(type);
    let formData = new FormData();
        formData.append('destination', destination);
        formData.append('origin', origin);
        formData.append('type', type);

    let response = await fetch(apiServer+'createnewlocation', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
    let responseData = await response.json();
    
    if (!response.ok || responseData.result != 'success') {     
            // console.log(response);
            // console.log(responseData.result);
            page.notification.show("ERROR: Couldn't create new location.");
            return;
    } 
    else {
        //page.notification.show("New Location Created Successfully!");
    }

}

/*async function checkLocationTypeRow(row,location){
    let bay = location;
    if (bay == "") {row.querySelector('.row label input').checked = true; return};
    let type3 = 0;
    let response = await fetch(apiServer+'checklocationtype/'+bay, {headers: {'DC-Access-Token': page.userToken}});
    let stockData = await response.json();

    if (response.ok && stockData.result == 'success') {     
        let type3 = stockData.type;
        if (type3 == 0) 
            {row.querySelector('.row label input').checked = true}
        if (type3 == 1) {
            row.querySelector('.row label input').checked = false}
    }
    else{
        row.querySelector('.row label input').checked = true
    }
}*/

async function updateQtyinBay(id,qty,type){
    let formData = new FormData();
        formData.append('id', id);
        formData.append('qty', qty);
        formData.append('type', type);
        let response = await fetch(apiServer+'inventorylocation/updateqty', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
        let responseData = await response.json();
        if (responseData.result == 'success' && responseData.equal == false && isNaN(qty) == false){
            swal('Quantity updated successfully!','','success');
        }
}

async function deleteRow(id,type){
    let formData = new FormData();
    formData.append('id',id);
    formData.append('type', type);

    let response = await fetch(apiServer+'inventorylocationid/remove', {method: 'delete', headers: {'DC-Access-Token': page.userToken}, body: formData});
    let responseData = await response.json();

    if (!response.ok || responseData.result != 'success') {                 
        page.notification.show(responseData.result)}
    else {
    }
}

async function GoToItemPage(barcode) {
    let field = document.querySelector('#content-inventory-searchfield input[name="searchfield"]:checked').value
    console.log(field); // itemno, itemname, sku, customsku, itembarcode
    let response = await fetch(apiServer+'pageitemid/load?searchfield=' + field + '&searchvalue=' + barcode, {headers: {'DC-Access-Token': page.userToken}});
    let locationData = await response.json();
    let invID;
    if (response.ok && locationData.result == 'success') {
        invID = locationData.invID;
        document.location.href = '/locations/itemdetails.html?id='+invID;
    }
    else {
        page.notification.show(locationData.result);
    }

}

async function loadItemID(id) {
    let formData = new FormData();
    formData.append('id', id);

    let response = await fetch(apiServer+'stockInventory2/get', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
    let inventoryData = await response.json();
        if (response.ok && inventoryData.result == 'success') {
            let inventorys = inventoryData.inventory;
            document.querySelector('#bay span').textContent = Object.keys(inventorys)[0]+'(SKU)';
            var itemTBody = document.querySelector('#item-table-body');
            while (itemTBody.firstChild) {
                itemTBody.removeChild(itemTBody.firstChild);
            }
            let cols = ['checkbox-col','store', 'itemName', 'sku', 'itemBarcode','total Qty','bay', 'type','indivQty', 'cartonQty', 'quantityPerCarton', 'imagedisplay'/*, 'remove-item'*/];
            let colsEditable = ['total Qty'];

            for (let stock in inventorys) {
                var tr = document.createElement('tr');
                tr.dataset.invID = inventorys[stock].id;
                tr.dataset.name = inventorys[stock].itemName;
                tr.dataset.sku = inventorys[stock].sku;
                tr.dataset.itemBarcode = inventorys[stock].itemBarcode;

                for (let col of cols) {
                    let td = document.createElement('td');
                    // td.classList.add(col);
                    if (colsEditable.includes(col)) {
                        td.contentEditable = true;
                        td.classList.add('editable');
                        td.dataset.col = col;
                    }
                    if (col == 'store') {
                        td.textContent = stores[inventorys[stock].store] ? stores[inventorys[stock].store].name : '';
                    }   
                    else if (col == 'total Qty') {
                        td.textContent = 0;
                        td.setAttribute("style", "font-size: 35px;");
                        td.classList.add("totalQty");
                    }                
                    else if (col == 'imagedisplay') {
                        let img = document.createElement('img');
                        img.src = inventorys[stock].image;
                        img.style.width = '100px';
                        td.appendChild(img);
                    }
                    else if (col == 'itemBarcode'){
                        td.textContent = inventorys[stock].itemBarcode;
                        td.classList.add("itemBarcode");
                    }
                    else if (col == 'cartonQty'){
                        td.textContent = inventorys[stock].cartonQty ;
                        td.style.display = "none";
                    }
                    else if (col == 'quantityPerCarton'){
                        td.textContent = inventorys[stock].quantityPerCarton ;
                        td.style.display = "none";
                    }
                    else if (col == 'itemName'){
                        td.textContent = inventorys[stock].itemName;
                    }
                    else if (col == 'sku'){
                        td.textContent = inventorys[stock].sku ;               
                    }
                    else if (col == 'checkbox-col'){
                        let container = document.createElement('label');
                        container.setAttribute('class','container');
                        container.innerHTML = '<input type="checkbox"><span class="checkmark"></span>';
                        td.appendChild(container);
                    }
                    else if (col == 'indivQty'){
                        td.textContent = inventorys[stock].indivQty;
                        td.style.display = "none";
                    }
                    else if (col == 'type'){
                        td.textContent = ''
                    }
                    tr.appendChild(td);
                    //tr.style.backgroundColor = '#ff8989';
                }
                itemTBody.appendChild(tr); 
            }
            
        }
        else {
            page.notification.show('Barcode or SKU not found in stockInventory!');
        }
        changeBackgroundColor()
}

function changeBackgroundColor(){
        let cbs = document.querySelectorAll('#item-table-body tr');
        for(let cb of cbs) {
            let tr = cb.querySelector('.container input');
            tr.addEventListener('change', function() {
                if(this.checked) {
                    cb.style.backgroundColor = '#ff8989';
                    //cb.querySelector('.container input').style.backgroundColor = 'red';
                }
                else {
                    //cb.querySelector('.container input').style.backgroundColor = '#fff';
                    cb.style.backgroundColor = 'transparent';
                }
            });
            cb.addEventListener('click', function() {
            cb.querySelector('.editable').addEventListener('click', e => e.stopImmediatePropagation());
                if (tr.checked == false){
                tr.checked = true;
                cb.style.backgroundColor = '#ff8989';
                }
                else{
                tr.checked = false;
                cb.style.backgroundColor = 'transparent';
                }

            });
        }
}