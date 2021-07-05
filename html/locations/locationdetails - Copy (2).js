//import '/common/stores.js';
import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener} from '/common/tools.js';


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
    const location = urlParams.get('bay');
    const id = urlParams.get('id');
    const brand = urlParams.get('brand');
    if (location) {
        await loadBayInventoryByBay(location);
        //check Location Type
        await checkLocationType(location);
    }
    else if (id) {
        console.log(id);
    }
    else if (brand){
        console.log(brand);
    }


	var barcodeScanner = {
        value: '',
        startTime: null,
        timer: null,
        timeLimit: 600,
	};

	// Close popup box
	document.querySelector('#box-container .close').addEventListener('click', closeBox);
    document.querySelector('#box-container2 .close').addEventListener('click', closeBox2);

    // Select items
    document.getElementById("select-items").addEventListener("click", (event) => {
        let itemInputSelect = document.getElementById("item-input-select").value;
        selectItems(itemInputSelect);
    });
    
    //change backgroundColor selected items
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

    //save Bay details
    addListener('#TransferLocations', 'click', function() {
        saveTransfer();
    });

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
                    selectItems(itemInputSelect);
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

    document.querySelector('#location-type .type-selection').addEventListener("change", changeLocationType);

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
    //console.log(ids);
    
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

async function loadBayInventoryByBay(location) {

    stocks = {};
    var bay = location;

    let response = await fetch(apiServer+'stockBayInventory/load/'+bay, {headers: {'DC-Access-Token': page.userToken}});
    let stockData = await response.json();

    if (response.ok && stockData.result == 'success') {     
        stocks = stockData.stocks;
    }
    else {
        document.querySelector('#bay span').textContent = bay;
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

	let cols = ['checkbox-col','store', 'itemName', 'sku', 'itemBarcode','total Qty', 'indivQty', 'cartonQty', /*'type',*/'quantityPerCarton', 'imagedisplay', 'transfer'/*,'remove-item'*/];
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

		document.querySelector('#bay span').textContent = stock['bay'];

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
			else if (col == 'transfer') {
				var baybtn = document.createElement('a');
        		baybtn.setAttribute('class','btn');
                baybtn.innerHTML = '<i class="icon-exchange"></i>';
        		
        		td.appendChild(baybtn);

        		baybtn.addEventListener("click", function(e){
        			// console.log('11');
        			showLocationDetails(e);       			
        		});
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
            // else if (col == 'remove-item'){
            //     // button.remove-row
            //     let child = document.createElement("button");
            //     child.classList.add("delete-row");
            //     child.innerHTML = '<i class="icon-minus"></i>';
                
            //     child.addEventListener("click", (e) => {
            //         let id = e.target.closest('tr').dataset.id;
            //         let type = e.target.closest('tr').dataset.type;
            //         swal({
            //             title: "Delete Row?",
            //             text: "",
            //             icon: "warning",
            //             buttons: true,
            //             dangerMode: true,
            //         })
            //         .then((willDelete) => {
            //             if (willDelete) {
            //                 deleteRow(id,type);
            //                 e.target.closest('tr').remove();
            //                 page.notification.show('Row removed successfully');
            //             }else{
            //                 return;
            //             }
            //         });
            //     });
            //     td.appendChild(child);
            // }
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
function closeBox() {
	document.getElementById('box-outer').classList.remove('flex');
	setTimeout(function() {
		for (let el of document.querySelectorAll('#box-container > div:not(.close)')) {
			el.classList.add('hide');
		}
	}, 400);
    location.reload();
}
function closeBox2() {
    document.getElementById('box-outer2').classList.remove('flex');
    setTimeout(function() {
        for (let el of document.querySelectorAll('#box-container2 > div:not(.close)')) {
            el.classList.add('hide');
        }
    }, 400);
}

async function showLocationDetails(e){

		document.getElementById('box-outer').classList.add('flex');
		document.getElementById('location').classList.remove('hide');

        let stockId = e.target.closest('tr').dataset.id;
        document.querySelector('#itemID span').textContent = stockId;

		let stockName = e.target.closest('tr').dataset.name;
		document.querySelector('#itemname span').textContent = stockName;

		let stockSKU = e.target.closest('tr').dataset.sku;
		document.querySelector('#sku span').textContent = stockSKU;

		let stockIndivQty = e.target.closest('tr').dataset.indivQty;
		document.querySelector('#indivQty span').textContent = stockIndivQty;
        document.querySelector('#totalqty').innerHTML = stockIndivQty;

        let baylocation = e.target.closest('tr').dataset.bay;
        document.querySelector('#bay-location span').textContent = baylocation;

        let type = e.target.closest('tr').dataset.type;
        if (type == 0){type='Pick'};
        if (type == 1){type='Bulk'};
        if (type == 2){type='Stage'};
        document.querySelector('#type span').textContent = type;

        let invID = e.target.closest('tr').dataset.invID;
        document.querySelector('#invID span').textContent = invID;

        myScript();

        let baytBody = document.querySelector('#location #bay-table-body');

        while (baytBody.firstChild) {
            baytBody.removeChild(baytBody.firstChild);
        }

        let cols = ['location', 'looseQty', 'type'];

        stocks = {};
        let response = await fetch(apiServer+'stockInventory/loadAll/'+invID, {headers: {'DC-Access-Token': page.userToken}});
        let stockData = await response.json();

        if (response.ok && stockData.result == 'success') {     
            stocks = stockData.stocks;
        }
        else {
            if (stockData.result == 'Not stock found.'){}
            else {swal('ERROR LOADING IN STOCK...CONTACT SUPPORT','','error');}
        } 

        // console.log(stocks);

        for(let stock of stocks) {
            let tr = document.createElement('tr');
            tr.dataset.id = stock.id;
            
            if (stock.bay != baylocation){
                for (let col of cols) {
                    let td = document.createElement('td');
                    td.classList.add(col);
                    if (col == 'location') {
                        let ele = document.createElement('input');
                        ele.setAttribute('type', 'text');
                        ele.setAttribute('value', stock['bay']);
                        ele.classList.add("bay");
                        ele.setAttribute('readonly',"");
                        td.appendChild(ele);
                        ele.addEventListener("click", function(e){
                        copyTextValue(e);                 
                        });


                    }
                    else if (col == 'looseQty') {
                        let ele = document.createElement('input');
                        ele.setAttribute('type', 'text');
                        ele.setAttribute('readonly',"");                   
                        ele.setAttribute('value', stock['indivQty']);
                        ele.classList.add("indivQty");
                        td.appendChild(ele); 
                    }
                    else if (col == 'type') {
                        let ele = document.createElement('input');
                        ele.setAttribute('type', 'text');
                        if (type == 'bulk' && stock['type'] == 1 ) {ele.style.backgroundColor = 'lightyellow'};
                        if (type == 'pick' && stock['type'] == 0 ) {ele.style.backgroundColor = 'lightyellow'};
                        if (stock['type']==1 ){ele.setAttribute('value','Bulk')};
                        if (stock['type']==0 ){ele.setAttribute('value','Pick')};
                        ele.classList.add("type");
                        ele.setAttribute('readonly',"");
                        td.appendChild(ele);
                        td.style.display = 'none';
                    }
                    tr.appendChild(td);
                }
            }
            else {};

            baytBody.appendChild(tr);
        }
        
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

function copyTextValue(e){
    let a = e.target.closest('.bay').value;
    // console.log(a);
    let trs = document.querySelectorAll('.rows .row');

    for(let tr of trs) {
        if (tr.querySelector('.input-location').value == a){
            if (e.target.closest('.bay').style.backgroundColor == 'midnightblue') {

                        tr.querySelector('.input-location').value = "";
                        let a = tr.querySelector('.input-location').value;
                        checkLocationTypeRow(tr,a);
                        e.target.closest('.bay').style.backgroundColor = '#fff';
                        e.target.closest('.bay').style.color = 'black';
                        return;
            }
            else {
            swal('Location ('+a+') already selected','','warning');
            return;
            };
        };
    }
    var i=0;

    for(let tr of trs) {
        if (tr.querySelector('.input-location').value.length == 0){
           i++;
        };
    }

    if (i == 0){
        swal("error: DIDN'T FIND EMPTY FIELDS",'','error');
        return;
    }

    for(let tr of trs) {
        if (tr.querySelector('.input-location').value === null || tr.querySelector('.input-location').value == ""){
            tr.querySelector('.input-location').value = a;
            checkLocationTypeRow(tr,a);
            e.target.closest('.bay').style.backgroundColor = 'midnightblue';
            e.target.closest('.bay').style.color = 'white';
            return;
        }
    }
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

async function selectItems(itemInputSelect){
    let itemBarcode = itemInputSelect;
    if (itemBarcode === null || itemBarcode == ""){
        return;
    }
    let trs = document.querySelectorAll('#item-table-body tr');
    let sum = 0;
    for(let tr of trs) {
        // console.log(tr.querySelector('.itemBarcode').textContent);
        if (itemBarcode == tr.querySelector('.itemBarcode').textContent){
            if (tr.querySelector('.container input').checked == false){
            tr.querySelector('.container input').checked = true;
            tr.style.backgroundColor = '#ff8989';
            sum++;
            }
            else{

            }
        }
        else {};
    }
    if (sum == 0) {swal('Could not find this item','','warning'); 
    // console.log(document.getElementById("item-input-select").value);
}
    else {document.getElementById("item-input-select").value = ""}
}
async function executeTransfer(){
    if (document.getElementById("location-input-target").value == "" || document.getElementById("location-input-target").value === null){
        swal('Please select a destination.','','warning');
        return;
    }
    let origin = document.querySelector('#bay span').textContent;
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

    var letters = /^[A-Za-z ^0-9-]+$/;
    if (destination.match(letters)){
        if (origin == destination) {
            swal('Choose a valid destination!','','warning');
            return;
        }
        var r = await isExistedBay(destination);
    }
    else {
        swal('Warning:','Special character detected, please choose another location!','warning');
        return;
    }

    destination = destination.toUpperCase();

    if (r == false) {

        createLocation(destination,origin,type);

    }
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


async function saveTransfer(){

    //ID (inventorylocation table)
    let invLocId = document.querySelector('#itemID span').textContent;
    // console.log('invLocId: '+invLocId);
    // Item SKU
    let customSku = document.querySelector('#sku span').textContent;
    // console.log('itemSku: '+customSku);
    // Type
    let invType = document.querySelector('#type span').textContent;
    if (invType == 'Pick'){invType=0};
    if (invType == 'Bulk'){invType=1};
    if (invType == 'Stage'){invType=2};
    let oldQty = document.querySelector('#indivQty span').textContent;
    let oldBay = document.querySelector('#bay-location span').textContent;
    // InvID
    let invId = document.querySelector('#invID span').textContent;
    // console.log('Inventory ID: '+invId);

    let stockIndivQty = document.querySelector('#indivQty span').textContent;
    
    let totalqty = document.querySelector('#totalqty').textContent;
    let totalsum = document.querySelector('#total-sum').textContent;
    let baylocation = document.querySelector('#bay-location span').textContent;

    let trs = document.querySelectorAll('.rows .row');
    let locations = [];

    for(let tr of trs) {
        let location = {};
        location.indivQty =  tr.querySelector('.quantity').value;
        let numberStock = parseInt(totalqty);
        // console.log(numberStock);
        let numberTest = parseInt(location.indivQty);
        if (Number.isNaN(numberTest) || numberTest == "" || numberTest === null || numberTest <= 0){
            // console.log('number test= '+numberTest);
            if (numberTest == 0) {
                swal("ERROR! Quantity CAN'T be ZERO",'','warning');
                return;
            }
            else{
                swal('ERROR! Incorrect value inserted: '+numberTest,'','warning');
                return;
            }
        }
        else{
            if (numberStock < 0) {swal('Total value ('+totalsum+') is more than ('+stockIndivQty+') at location: '+baylocation,'','warning');return;}
            else {
            location.locationName =  tr.querySelector('.input-location').value.replace(/^\s+|\s+$|\s+(?=\s)/g, ""); //remove initial space or more than 1 betweem words;
            // location.locationName =  tr.querySelector('.input-location').value;
            if (tr.querySelector('.row label input').checked == true) {location.type = 0};
            if (tr.querySelector('.row label input').checked == false) {location.type = 1};
            if (location.locationName =="" || location.locationName === null){swal("ERROR! Location CAN'T be empty!",'','warning');return;};
            if (location.locationName.toLowerCase() == baylocation.toLowerCase()){swal('ERROR! Destination ('+location.locationName+') is same as origin ('+baylocation+')','','warning');return;};
                location.locationName = location.locationName.toUpperCase();
                var letters = /^[A-Za-z ^0-9-]+$/;
                if(location.locationName.match(letters)){
                    if (location.locationName.startsWith('EMG-')){
                        locations.push(location);
                    }
                    else{
                        location.locationName = 'EMG-'+location.locationName;
                        if (location.locationName.toLowerCase() == baylocation.toLowerCase()){swal('ERROR! Destination ('+location.locationName+') is same as origin ('+baylocation+')','','warning');return;};
                        locations.push(location);
                    }
                }
                else{
                    swal("SPECIAL CHARACTER DETECTED!",'','warning');
                    return;
                }
            
            }
        }
    }
    var hasDuplicate = false;
    locations.map(v => v.locationName).sort().sort((a, b) => {
      if (a === b) hasDuplicate = true
    })
    if (hasDuplicate == true){
        swal('Location repeated!','','warning');
        return;
    }

    if (trs.length == 0 ) {swal('ERROR! no data!','','error');return;};
    var userPreference;

    

    let formData = new FormData();
    formData.append('invLocId', invLocId);
    formData.append('customSku', customSku);
    formData.append('locations', JSON.stringify(locations));
    formData.append('invType', invType);
    formData.append('invId', invId);
    formData.append('oldQty', oldQty);
    formData.append('oldBay', oldBay);

    let response = await fetch(apiServer+'itemTransferBay/update', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
    let responseData = await response.json();

    if (!response.ok || responseData.result != 'success') {     
        page.notification.show('ERROR! OPERATION NOT SAVED/TRANSFER');
        return;
    } else {
            swal('Transferred Successfully!','','success').then(async() => {
            document.location.href = '/locations/itemdetails.html?id='+invId;
            //await checkLocationTable();
            //closeBox();
            });
            }
    

}

async function myScript() {
  let elTotalQuantity = document.querySelector("#totalqty");
  let somaTotal = document.querySelector("#total-sum");
  let totalQuantity = parseInt(elTotalQuantity.innerHTML);
  
  function getSumOfRows() {
    let sum = 0;
    for (let input of document.querySelectorAll("div .row > input.quantity"))
      sum += parseInt(input.value);
    return sum;
  }
  function updateTotalQuantity() {
      elTotalQuantity.innerHTML = totalQuantity - getSumOfRows();
      somaTotal.innerHTML = getSumOfRows();
  }
  
  function appendNewRow() {
    let row = document.createElement("div");
    row.classList.add("row");
    let child; 

    // input.quantity
    let input = document.createElement("input");
    input.classList.add("quantity");
    input.value = "0";
    input.setAttribute("type", "number");
    input.setAttribute("min", "0");
    input.addEventListener("input", () => {
        if (input.value == "") {input.value=0};
        updateTotalQuantity();
        if (elTotalQuantity.innerHTML < 0 ) {
            input.style.backgroundColor = '#ff8989'; 
            
            if (input.value == 0) {
                input.style.backgroundColor = '#fff'} 
            else {};
            }

        else {
            let trs = document.querySelectorAll('.rows .row');
            for(let tr of trs) {
            tr.querySelector('.quantity').style.backgroundColor = '#fff';
            };
        };
    });
    row.append(input);
    
    // label.location
    child = document.createElement("label");
    child.classList.add("location-label");
    child.innerHTML = "Location: ";
    row.append(child);

    // input.location
    let input2 = document.createElement("input");
    input2.classList.add("input-location");
    input2.value = "";
    input2.setAttribute("type", "text");
        input2.addEventListener("input", () => {
        checkLocationTypeRow(row,input2.value);
    });
    row.append(input2);
    
    // toggle button
    let togglebtn = document.createElement("label");
    togglebtn.classList.add("switch");
    //style="display: none"
    togglebtn.innerHTML = '<input type="checkbox" checked><span class="slider round" style="display: none"><p style="margin-left:12px">Pick       Bulk</p></span>';
    row.append(togglebtn);


    // button.remove-row
    child = document.createElement("button");
    child.classList.add("remove-row");
    child.innerHTML = '<i class="icon-trash"> Remove</i>';
    
    child.addEventListener("click", () => {
        // console.log(input2.value);
        let trs = document.querySelectorAll('#bay-table-body .location');
        for(let tr of trs) {
            if (tr.querySelector('.bay').value == input2.value){
                tr.querySelector('.bay').style.backgroundColor = '#fff';
                tr.querySelector('.bay').style.color = 'black';
            }
        }
        row.remove();
        updateTotalQuantity();
    });
    row.append(child);

    // button.refresh-row
    child = document.createElement("button");
    child.classList.add("refresh-row");
    child.innerHTML = '<i class="icon-refresh"></i>';

    child.addEventListener("click", () => {
        // console.log(input2.value);
        let trs = document.querySelectorAll('#bay-table-body .location');
        for(let tr of trs) {
            if (tr.querySelector('.bay').value == input2.value){
                tr.querySelector('.bay').style.backgroundColor = '#fff';
                tr.querySelector('.bay').style.color = 'black';
            }
        }
        input.value = 0;
        input2.value = "";
        row.querySelector('.row label input').checked = true;
        updateTotalQuantity();
    });
    row.append(child);
    
    document.querySelector("div .rows").append(row);
  }
  
  document.querySelector("div .add-row").addEventListener("click", () => appendNewRow());
  
  appendNewRow();
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

async function checker(){
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
}

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

async function checkLocationType(location){
    let bay = location;

    let response = await fetch(apiServer+'checklocationtype/'+bay, {headers: {'DC-Access-Token': page.userToken}});
    let stockData = await response.json();

    if (response.ok && stockData.result == 'success') {     
        let type = stockData.type;
        if (type == 0) {
            document.getElementsByClassName("type-selection")[0].value = 'pick';
        }
        else if (type == 1) {
            document.getElementsByClassName("type-selection")[0].value = 'bulk';
        }
        else if (type == 2) {
            document.getElementById("location-type").style.display = "none";
        }
        else if (type == 3) {
            document.getElementsByClassName("type-selection")[0].value = "dispatch";
        }
        else {
            swal('This location ['+bay+'] has a different type. Contact support.','','error');
        }
    }
    else {
        var r = await isExistedBay(location);
        if (r == false){
            createLocationIfHasItem(location);
        }
        else{
            swal('Fatal error','','error');
        }
    }
    /*if ()
    document.getElementsByClassName("type-selection")[0].value = 'bulk';*/
}

async function changeLocationType(){
    if (document.getElementsByClassName("type-selection")[0].value == 'pick'){
        if (confirm("Would you like to change Location's type to PICK?")==true){
            let bay = document.querySelector('#bay span').textContent;
            let type = 0;
            updateLocationType(bay,type);
        }
        else {
            let bay = document.querySelector('#bay span').textContent;
            await checkLocationType(bay);
            return;
        }
    }
    else if (document.getElementsByClassName("type-selection")[0].value == 'bulk'){
        if (confirm("Would you like to change Location's type to BULK?")==true){
            let bay = document.querySelector('#bay span').textContent;
            let type = 1;
            updateLocationType(bay,type);
        }
        else {
            let bay = document.querySelector('#bay span').textContent;
            await checkLocationType(bay);
            return;
        }
    }
}

async function updateLocationType(bay,type){
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

}

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
        swal('Fatal Error','','warning');
    }
    return found;
}

async function createLocation(destination,origin,type){
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

async function createLocationIfHasItem(destination){
    let formData = new FormData();
        formData.append('destination', destination);

    let response = await fetch(apiServer+'createifhasitem', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
    let responseData = await response.json();
    
    if (!response.ok || responseData.result != 'success') {     
            // console.log(response);
            // console.log(responseData.result);
            page.notification.show("ERROR: Location does not exist!");
            return;
    } 
    else {
        page.notification.show("New Location Created Successfully!");
    }

}

async function checkLocationTypeRow(row,location){
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
}

async function updateQtyinBay(id,qty,type){
    let formData = new FormData();
        formData.append('id', id);
        formData.append('qty', qty);
        formData.append('type', type);
        let response = await fetch(apiServer+'inventorylocation/updateqty', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
        let responseData = await response.json();
        if (responseData.result == 'success' &&  responseData.equal == false && isNaN(qty) == false){
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