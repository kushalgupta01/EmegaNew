//import '/common/stores.js';
import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {copyToClipboard, getDateValue, getQueryValue, includesAll, selectText, addListener, removeListener} from '/common/tools.js';


window.page = {
	//liveMessages: new LiveMessages(wsServer),
	els: {},
    type: 'Locations',
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

window.locations = {};
window.stocks = {};

if (page.local) {
	apiServer = apiServerLocal;
}

document.addEventListener('DOMContentLoaded', async function() {
	// back to menu button
	addListener('#header .menu', 'click', function(e) {
		window.location.href = '/inventory/inventorymanagement.html';
	});

    await checkLocationTable();
    document.getElementById('emg-location').checked = true;
   

	var barcodeScanner = {
        value: '',
        startTime: null,
        timer: null,
        timeLimit: 600,
	};

	// Close popup box
	document.querySelector('#box-container .close').addEventListener('click', closeBox);

    //Checkbox
    document.getElementById("type-select").addEventListener("change", checkLocationTable);

    //Radiobox
    document.getElementById("content-inventory-searchfield").addEventListener("change", checkInputRadioBox);


    //loadBay
    document.getElementById("load-bay").addEventListener("click", (event) => {
        if (document.getElementById('itemno').checked == true){
            let location = document.getElementById("location-input-search").value;
            if (location === null || location == ""){
                    alert('Please select one location!');
                }
            else{document.location.href = '/locations/locationdetails.html?bay='+location;}
        }
        else if (document.getElementById('itemsku').checked == true){
            let id = document.getElementById("location-input-search").value;
            if (id === null || id == ""){
                alert('Input search is empty');
            }
            else {
                //inputBarcodeReturnID
                GoToItemPage(id);
            }
        }
        else if (document.getElementById('itembarcode').checked == true){
            let id = document.getElementById("location-input-search").value;
            if (id === null || id == ""){
                alert('Input search is empty');
            }
            else {
                //inputBarcodeReturnID
                GoToItemPage2(id);
            }
        }
        else if (document.getElementById('emg-location').checked == true){
            let location = document.getElementById("location-input-search").value;
            location = location.toLowerCase();
            if (location === null || location == ""){
                    alert('Please select one location!');
                }
            else if (location.startsWith('emg-')){
                document.location.href = '/locations/locationdetails.html?bay='+location;
            }
            else{document.location.href = '/locations/locationdetails.html?bay=EMG-'+location;}
        } 
    });


	document.addEventListener('keypress', async function(e) {
        if (e.charCode == 13 || e.charCode == 0) { // 13, 0; Enter key
            e.preventDefault();
            e.stopPropagation();

            clearTimeout(barcodeScanner.timer);
            barcodeScanner.timer = null;
            console.log(barcodeScanner.value);

            document.getElementById("location-input-search").value = barcodeScanner.value;
            // console.log(document.getElementById("location-input-search").value);
            
            let location = document.getElementById("location-input-search").value;
            if (location === null || location == ""){
                alert('Input search field is empty');
            }
            else{
                if (document.getElementById('itemno').checked == true){
                    document.location.href = '/locations/locationdetails.html?bay='+location;
                }
                else if (document.getElementById('emg-location').checked == true){
                    document.location.href = '/locations/locationdetails.html?bay=EMG-'+location;
                }
                else if (document.getElementById('itemsku').checked == true){
                    GoToItemPage(location);
                }
                else if (document.getElementById('itembarcode').checked == true){
                    GoToItemPage2(location);
                }
            }
            barcodeScanner.value = ''; // Reset barcode scanner value
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
        locations = [];
    }
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
        if (document.getElementById('sts-brands').checked == true) {
            if (col == 'locations') {
                let viewBtn = document.createElement('input');
                viewBtn.setAttribute('type', 'button');
                viewBtn.setAttribute('value', location.bay);
                viewBtn.setAttribute('class','viewstock action-btn btn-green2');
                td.appendChild(viewBtn);      

                viewBtn.addEventListener("click", async function(e){
                    //checkBayexist();
                    document.location.href = '/locations/itemdetails.html?brand='+location.bay;              
                });
            } 

        }  
        else{
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
                if (document.getElementById('sts-delete').checked == true){
                    viewBtn.setAttribute('class','viewstock action-btn btn-red');
                }
                td.appendChild(viewBtn);      

                viewBtn.addEventListener("click", async function(e){
                    //checkBayexist();
                    if (document.getElementById('sts-delete').checked == true){
                        swal({
                                title: "Delete "+location.bay+" Location?",
                                text: "",
                                icon: "warning",
                                buttons: true,
                                dangerMode: true,
                            })
                            .then((willDelete) => {
                                if (willDelete) {
                                    deleteLocation(location.bay);                                    
                                    // deleteRow(id,type);
                                    // e.target.closest('tr').remove();
                                    // page.notification.show('Row removed successfully');
                                }else{
                                    return;
                                }
                            });
                    }
                    else{
                        document.location.href = '/locations/locationdetails.html?bay='+location.bay;
                    }          
                });

        	}  
        	else if (col == 'Actions') { 
        		let viewBtn = document.createElement('input');
				viewBtn.setAttribute('type', 'button');
            	viewBtn.setAttribute('value', 'View Stock');
            	viewBtn.setAttribute('class','viewstock action-btn btn-grey');
            	td.appendChild(viewBtn);      

            	viewBtn.addEventListener("click", async function(e){
            		// console.log('11');
            		await loadBayInventory(e);               		
            	});	

    //         	let removeBtn = document.createElement('input');
				// removeBtn.setAttribute('type', 'button');
    //         	removeBtn.setAttribute('value', 'X');
    //         	removeBtn.setAttribute('class','removeBay action-btn btn-red');
    //         	td.appendChild(removeBtn);      

    //         	removeBtn.addEventListener("click", async function(e){
    //         		console.log('11');           		               		
    //         	});	
        	}
        }
        	tr.appendChild(td);
        }
	    locTBody.appendChild(tr);		
	}
    document.getElementById('loading').style.display = 'none';
}

function showBayInventory(){
	var itemTBody = document.querySelector('#item-table-body');

	while (itemTBody.firstChild) {
		itemTBody.removeChild(itemTBody.firstChild);
	}

	// document.querySelector('#bay span').textContent = itemTBody.dataset.bay;

	let cols = ['checkbox-col','store', 'itemName', 'sku', 'total Qty', 'indivQty', 'cartonQty', 'type', 'quantityPerCarton', 'imagedisplay', 'transfer'];
	// let colsEditable = ['indivQty', 'cartonQty', 'type', 'quantityPerCarton'];

	for (let item in stocks) {
		var tr = document.createElement('tr');		
		var stock = stocks[item];

		tr.dataset.id = stock['id'];
		tr.dataset.invID = stock['invID'];
		tr.dataset.bay = stock['bay'];
		tr.dataset.name = stock.itemName;
		tr.dataset.sku = stock.sku;
		tr.dataset.indivQty = stock['indivQty'];
        tr.dataset.type = stock.type;

		document.querySelector('#bay span').textContent = stock['bay'];

		for (let col of cols) {
			let td = document.createElement('td');
			// td.classList.add(col);
			// if (colsEditable.includes(col)) {
   //      		td.contentEditable = true;
   //      		td.classList.add('editable');
   //      		td.dataset.col = col;
   //      	}

			if (col == 'store') {
				td.textContent = stores[stock[col]] ? stores[stock[col]].name : '';
			} 	
			else if (col == 'total Qty') {
					td.textContent = stock['indivQty'] + stock['cartonQty']*stock['quantityPerCarton'];
					td.setAttribute("style", "font-size: 35px;");
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
            else if (col == 'checkbox-col'){
                let container = document.createElement('label');
                container.setAttribute('class','container');
                container.innerHTML = '<input type="checkbox"><span class="checkmark"></span>';
                td.appendChild(container);
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
function closeBox() {
	document.getElementById('box-outer').classList.remove('flex');
	setTimeout(function() {
		for (let el of document.querySelectorAll('#box-container > div:not(.close)')) {
			el.classList.add('hide');
		}
	}, 400);
    location.reload();
}

async function checkLocationTable() {
    document.getElementById("type-select").addEventListener("change", checkLocationTable);
    document.getElementById('loading').style.display = 'block';
    if (document.getElementById('sts-b2c').checked == true){
    await loadBay();
    await bayTable();
    }
    else if (document.getElementById('sts-b2b').checked == true) {
    await loadBayStage();
    await bayTable();
    }
    else if (document.getElementById('bulk-locations').checked == true) {
        let type = 1;
        await loadBayBulk(type);
        await bayTable();
    }
    else if (document.getElementById('pick-locations').checked == true) {
        let type = 0;
        await loadBayBulk(type);
        await bayTable();
    }
    else if (document.getElementById('dispatch-locations').checked == true) {
        let type = 3;
        await loadBayBulk(type);
        await bayTable();
    }
    else if (document.getElementById('sts-newWarehouse').checked == true) {
        let type = 4;
        await loadBayBulk(type);
        await bayTable();
    }
    else if (document.getElementById('sts-brands').checked == true) {
        let type = 5;
        await loadBayBulk(type);
        await bayTable();
    }
    else if (document.getElementById('sts-delete').checked == true) {
        let type = 6;
        await loadBayBulk(type);
        await bayTable();
    }
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
        if (type === null || type =="" || type == 'null' || type == "null") {document.querySelector('#type span').textContent = null}
        else { 
        document.querySelector('#type span').textContent = type;};

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
            else {alert('ERROR LOADING IN STOCK...CONTACT SUPPORT');}
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
                        if (type == 'null' && stock['type'] === null ) {ele.style.backgroundColor = 'lightyellow'};
                        if (type == stock['type']) {ele.style.backgroundColor = 'lightyellow'};
                        if (stock['type']===null || stock['type']==""){ele.setAttribute('value','-')}
                        else {ele.setAttribute('value', stock['type']);}; 
                        ele.classList.add("type");
                        ele.setAttribute('readonly',"");
                        td.appendChild(ele);
                    }
                    tr.appendChild(td);
                }
            }
            else {};

            baytBody.appendChild(tr);
        }
        
}

function copyTextValue(e){
    let a = e.target.closest('.bay').value;
    // console.log(a);
    let trs = document.querySelectorAll('.rows .row');

    for(let tr of trs) {
        if (tr.querySelector('.input-location').value == a){
            if (e.target.closest('.bay').style.backgroundColor == 'midnightblue') {

                        tr.querySelector('.input-location').value = "";
                        e.target.closest('.bay').style.backgroundColor = '#fff';
                        e.target.closest('.bay').style.color = 'black';
                        return;
            }
            else {
            alert('Location ('+a+') already selected')
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
        alert("error: DIDN'T FIND EMPTY FIELDS");
        return;
    }

    for(let tr of trs) {
        if (tr.querySelector('.input-location').value === null || tr.querySelector('.input-location').value == ""){
            tr.querySelector('.input-location').value = a;
            e.target.closest('.bay').style.backgroundColor = 'midnightblue';
            e.target.closest('.bay').style.color = 'white';
            return;
        }
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
    row.append(input2);
    
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
        updateTotalQuantity();
    });
    row.append(child);
    
    document.querySelector("div .rows").append(row);
  }
  
  document.querySelector("div .add-row").addEventListener("click", () => appendNewRow());
  
  appendNewRow();
}

async function checkInputRadioBox() {
    document.getElementById("content-inventory-searchfield").addEventListener("change", checkInputRadioBox);
    if (document.getElementById('itemno').checked == true){
        document.getElementById('location-input-search').placeholder= 'Load location..';
    }
    else if (document.getElementById('itemsku').checked == true) {
        document.getElementById('location-input-search').placeholder= 'Scan item barcode..';
    }
    else if (document.getElementById('itembarcode').checked == true) {
        document.getElementById('location-input-search').placeholder= 'Load sku..';
    }
}

async function GoToItemPage(barcode) {
    let field = 'itembarcode'; // itemno, itemname, sku, customsku, itembarcode
    let response = await fetch(apiServer+'pageitemid/load?searchfield=' + field + '&searchvalue=' + barcode, {headers: {'DC-Access-Token': page.userToken}});
    let locationData = await response.json();

    if (response.ok && locationData.result == 'success') {
        let invID;
        let ids = locationData.ids;
        if (ids.length == 1){
            invID = ids[0].id;
            document.location.href = '/locations/itemdetails.html?id='+invID;
        }
        else if (ids.length > 1){
            document.querySelector('#entries span').innerHTML = 'Barcode: <b><u>'+barcode+'</u></b> has <b><u>'+ids.length+'</u></b> entries in the database.';
            // swal(''+ids.length+' barcodes '+barcode+' found in the database','','warning');
            // return
            var full = document.querySelector('#fullbody');
            while (full.firstChild) {
                full.removeChild(full.firstChild);
            }
            let cols = ['store','itemName', 'sku', 'itemBarcode', 'image'];
            for (let id of ids) {
                var tr = document.createElement('tr');
                tr.dataset.id = id['id'];
                //console.log(id);
                for (let col of cols) {
                    let td = document.createElement('td');
                    if (col == 'store') {
                        td.textContent = stores[id[col]] ? stores[id[col]].name : '';
                    }
                    else if (col == 'image'){
                        let img = document.createElement('img');
                        img.src =  id['image'];
                        img.style.width = '100px';
                        td.appendChild(img);
                    }
                    else {
                        td.textContent = id[col] ;               
                    }           
                    tr.appendChild(td);
                }
                full.appendChild(tr);
                tr.addEventListener("click", async function(e){
                    document.location.href = '/locations/itemdetails.html?id='+e.target.closest('tr').dataset.id;
                });
            }
            document.getElementById('box-outer').classList.add('flex');
            document.getElementById('skuList').classList.remove('hide');
        }
    }
    else {
        console.log(locationData.result);
        swal('Barcode: '+barcode+' not found in the database','','warning');
    }

}
async function GoToItemPage2(barcode) {
    let field = 'sku'; // itemno, itemname, sku, customsku, itembarcode
    let response = await fetch(apiServer+'pageitemid/load?searchfield=' + field + '&searchvalue=' + barcode, {headers: {'DC-Access-Token': page.userToken}});
    let locationData = await response.json();

    if (response.ok && locationData.result == 'success') {
        let invID = locationData.invID;
        document.location.href = '/locations/itemdetails.html?id='+invID;
    }
    else {
        page.notification.show(locationData.result);
    }

}

async function deleteLocation(bay){
    let formData = new FormData();
    formData.append('bay',bay);
    formData.append('pageType', page.type);
    
    let response = await fetch(apiServer+'inventorylocationid/remove', {method: 'delete', headers: {'DC-Access-Token': page.userToken}, body: formData});
    let responseData = await response.json();

    if (!response.ok || responseData.result != 'success') {                 
        page.notification.show(responseData.result)}
    else {
        swal('Removed Successfully!','','success').then(() => {
        checkLocationTable();
        });
    }
}