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
		window.location.href = '/inventory/inventoryManagement.html';
	});

    addListener('#back-to-locations', 'click', function(e) {
        window.location.href = '/locations/add/additems.html';
    });

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const location = urlParams.get('bay');
    await loadBayInventoryByBay(location);
    //check Location Type
    await checkLocationType(location);

	var barcodeScanner = {
        value: '',
        startTime: null,
        timer: null,
        timeLimit: 600,
	};

	// Close popup box
	document.querySelector('#box-container .close').addEventListener('click', closeBox);

    // Select items
    document.getElementById("select-items").addEventListener("click", (event) => {
        let itemInputSelect = document.getElementById("item-input-select").value;
        loadInventoryDetails(itemInputSelect);
    });

    document.getElementById("save-bay").addEventListener("click", saveBayDetails);

    document.addEventListener('keypress', async function(e) {
        if (e.charCode == 13 || e.charCode == 0) { // 13, 0; Enter key
            e.preventDefault();
            e.stopPropagation();

            clearTimeout(barcodeScanner.timer);
            barcodeScanner.timer = null;
            console.log(barcodeScanner.value);

            document.getElementById("item-input-select").value = barcodeScanner.value;

            if (document.getElementById("item-input-select").value === null || document.getElementById("item-input-select").value == ""){
                return;
            }
            else {
                let itemInputSelect = document.getElementById("item-input-select").value;
                loadInventoryDetails(itemInputSelect);
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

        //1console.log(barcodeScanner.value);
    });

    document.querySelector('.type-selection').addEventListener("change", changeLocationType);

});


/*async function loadBay() {

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
}*/

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

/*async function bayTable() {
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
                viewBtn.setAttribute('value', location.bay);
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
}*/

function showBayInventory(){
	var itemTBody = document.querySelector('#item-table-body');

	while (itemTBody.firstChild) {
		itemTBody.removeChild(itemTBody.firstChild);
	}

	// document.querySelector('#bay span').textContent = itemTBody.dataset.bay;

	let cols = ['store', 'itemName', 'sku', 'itemBarcode','total Qty', 'indivQty', 'cartonQty', /*'type',*/'quantityPerCarton', 'imagedisplay', 'remove-item'];
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
                let qty,id,type;
					td.textContent = stock['indivQty'] + stock['cartonQty']*stock['quantityPerCarton'];
					td.setAttribute("style", "font-size: 35px;");
                    td.classList.add("totalQty");
                    td.addEventListener("blur", function(e){
                        qty = td.textContent;
                        id = e.target.closest('tr').dataset.id;
                        type = e.target.closest('tr').dataset.type;
                        const popUP = document.querySelector('.hover_bkgr_fricc');

                        function myListener(event){
                            let reason = document.querySelector('#reason').value.replace(/^\s+|\s+$|\s+(?=\s)/g, "").toUpperCase();
                            if (reason == null || reason == "" || reason.length < 6){
                                swal('Please specify a reason.','Reason must be at least 6 characters.','error');
                                return;
                            }
                            document.querySelector('#reason').value = reason;
                            // console.log('id'+id);
                            // console.log('qty'+qty);
                            updateQtyinBay(id,qty,type);
                        }

                        if (parseInt(qty) >= 0 && isNaN(qty) == false){
                            if (parseInt(qty) !== parseInt(e.target.closest('tr').dataset.indivQty)){
                                popUP.style.display = 'inline-block';
                                popUP.querySelector('#numQty').textContent = qty+'?';
                                popUP.querySelector('#reason').value = "";
                                popUP.querySelector('#reason-save').addEventListener('click', myListener);
                                // document.querySelector('#reason-save').addEventListener('click', function() {
                                //     let reason = document.querySelector('#reason').value;
                                //     updateQtyinBay(e,id,qty,type,reason); }, { once: true }, false);
                                popUP.querySelector('.popupCloseButton').addEventListener('click', function() {
                                    popUP.style.display = 'none';
                                    popUP.removeChild;
                                    let trs = document.querySelectorAll('#item-table-body tr');
                                    for (let tr of trs){
                                        tr.querySelector('.totalQty').textContent = tr.dataset.indivQty;
                                    }
                                    popUP.querySelector('#reason-save').removeEventListener('click', myListener);
                                    // window.location.reload();
                                });
                            }
                        }
                        else{
                            swal(qty+' is not a valid number','','error');
                        }
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
                    if (e.target.closest('tr').dataset.indivQty == 0){
                        let id = e.target.closest('tr').dataset.id;
                        let type = e.target.closest('tr').dataset.type;
                        //console.log(id);
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
                    }
                    else{
                        swal('You can only delete when the quantity is equal to 0');
                        return;
                    }
                });
                td.appendChild(child);
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
    //location.reload();
}

function copyLocationValue(locationCopy){
    document.getElementById('location-input-target').value = locationCopy;
}

/*async function checkLocationTable() {
    document.getElementById("type-select").addEventListener("change", checkLocationTable);
    if (document.getElementById('sts-b2c').checked == true){
    await loadBay();
    await bayTable();
    }
    else{
    await loadBayStage();
    await bayTable();
    }
}*/

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
            document.getElementsByClassName("type-selection")[0].value = 'dispatch';
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
            swal('Fatal Error','','error');
        }
    }
    /*if ()
    document.getElementsByClassName("type-selection")[0].value = 'bulk';*/
}

async function changeLocationType(){
    if (document.getElementsByClassName("type-selection")[0].value == 'pick'){
                            swal({
                                title: "Change Location's type to PICK?",
                                text: "",
                                icon: "warning",
                                buttons: true,
                            })
                            .then((willChange) => {
                                if (willChange) {
                                    let bay = document.querySelector('#bay span').textContent;
                                    let type = 0;
                                    updateLocationType(bay,type);
                                }else{
                                    let bay = document.querySelector('#bay span').textContent
                                    checkLocationType(bay);
                                    return;
                                }
                            });
    }
    else if (document.getElementsByClassName("type-selection")[0].value == 'bulk'){

                            swal({
                                title: "Change Location's type to BULK?",
                                text: "",
                                icon: "warning",
                                buttons: true,
                            })
                            .then((willChange) => {
                                if (willChange) {
                                    let bay = document.querySelector('#bay span').textContent;
                                    let type = 1;
                                    updateLocationType(bay,type);
                                }else{
                                    let bay = document.querySelector('#bay span').textContent
                                    checkLocationType(bay);
                                    return;
                                }
                            });
    }
    else if (document.getElementsByClassName("type-selection")[0].value == 'dispatch'){

                            swal({
                                title: "Change Location's type to DISPATCH?",
                                text: "",
                                icon: "warning",
                                buttons: true,
                            })
                            .then((willChange) => {
                                if (willChange) {
                                    let bay = document.querySelector('#bay span').textContent;
                                    let type = 3;
                                    updateLocationType(bay,type);
                                }else{
                                    let bay = document.querySelector('#bay span').textContent
                                    checkLocationType(bay);
                                    return;
                                }
                            });
    }
}

async function updateLocationType(bay,type){
    let formData = new FormData();
        formData.append('type', type);
    // console.log(bay);
    // console.log(type);

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
        swal('Fatal Error','','error');
    }
    // console.log('FOUND = '+found);
    return found;
}

async function createLocation(destination,origin){
    let formData = new FormData();
        formData.append('destination', destination);
        formData.append('origin', origin);

    let response = await fetch(apiServer+'createnewlocation', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
    let responseData = await response.json();
    
    if (!response.ok || responseData.result != 'success') {     
            // console.log(response);
            // console.log(responseData.result);
            page.notification.show("ERROR: Couldn't create new location.");
            return;
    } 
    else {
        page.notification.show("New Location Created Successfully!");
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
    let reason = document.querySelector('#reason').value;
    let formData = new FormData();
        formData.append('id', id);
        formData.append('qty', qty);
        formData.append('type', type);
        formData.append('reason', reason);
        let response = await fetch(apiServer+'inventorylocation/updateqty', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
        let responseData = await response.json();
        if (responseData.result == 'success' &&  responseData.equal == false && isNaN(qty) == false){
            swal('Quantity updated successfully!','','success');
            document.querySelector('.hover_bkgr_fricc').style.display = 'none';
            let trs = document.querySelectorAll('#item-table-body tr');
            for (let tr of trs){
                if (tr.dataset.id == id){
                    tr.dataset.indivQty = qty;
                }
            }
            //e.target.closest('tr').dataset.indivQty = qty;
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

async function loadInventoryDetails(barcode,id) {
    let itemBarcode = barcode;
    if (itemBarcode === null || itemBarcode == ""){
        return;
    }

        let formData = new FormData();
        formData.append('barcode', barcode);
        let response = await fetch(apiServer+'stockInventory2/get', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
        let inventoryData = await response.json();
        if (response.ok && inventoryData.result == 'success') {
            let inventorys = inventoryData.inventory;
            //console.log(inventorys);
            document.querySelector('#entries span').innerHTML = 'Barcode: <b><u>'+barcode+'</u></b> has <b><u>'+inventorys.length+'</u></b> entries in the database.';
            if(inventorys.length > 1 && !id){

                //console.log(inventorys);
                var full = document.querySelector('#fullbody');
                while (full.firstChild) {
                    full.removeChild(full.firstChild);
                }
                let kols = ['store','itemName', 'sku', 'itemBarcode', 'image'];
                for (let stock in inventorys) {
                    var tr = document.createElement('tr');
                    tr.dataset.id = inventorys[stock].id;
                    for (let kol of kols) {
                        let td = document.createElement('td');
                        if (kol == 'store') {
                            td.textContent = stores[inventorys[stock].store] ? stores[inventorys[stock].store].name : '';
                        }
                        else if (kol == 'image'){
                            let img = document.createElement('img');
                            img.src = inventorys[stock].image;
                            img.style.width = '100px';
                            td.appendChild(img);
                        }
                        else if (kol == 'itemBarcode'){td.textContent = inventorys[stock].itemBarcode; }
                        else if (kol == 'sku'){td.textContent = inventorys[stock].sku; }
                        else if (kol == 'itemName'){td.textContent = inventorys[stock].itemName; }           
                        tr.appendChild(td);
                    }
                    full.appendChild(tr);
                    tr.addEventListener("click", async function(e){
                        id = e.target.closest('tr').dataset.id;
                        //console.log(barcode);
                        //console.log(id);
                        loadInventoryDetails(barcode,id);
                        closeBox();
                    });
                
                }
                document.getElementById('box-outer').classList.add('flex');
                document.getElementById('skuList').classList.remove('hide');

            }

            else{

            //console.log(id);
            if (id) {inventorys = inventorys.filter(x => x.id === parseInt(id))}
            else {id = inventorys[0].id}
            var itemTBody = document.querySelector('#item-table-body');

            if (updateList(barcode,id) == false) {
       
                // document.querySelector('#bay span').textContent = itemTBody.dataset.bay;

                let cols = ['store', 'itemName', 'sku', 'itemBarcode','total Qty', 'imagedisplay', 'remove-item'];
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
                                td.textContent = 1;
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
                                        e.target.closest('tr').remove();
                                        page.notification.show('Row removed successfully');
                                    }else{
                                        return;
                                    }
                                });

                            });
                            td.appendChild(child);
                        }
                        else if (col == 'itemName'){
                            td.textContent = inventorys[stock].itemName;
                        }
                        else if (col == 'sku'){
                            td.textContent = inventorys[stock].sku ;               
                        }           
                        tr.appendChild(td);
                    }
                    itemTBody.appendChild(tr);
                    page.notification.show('Item included Successfully');
                    let trs = document.querySelectorAll('#item-table-body tr');
                    for(let tr of trs) {
                        if (tr.dataset.invID == inventorys[stock].id){
                            highlight(tr);
                        }
                    }
                }
            }

            }
        }
        else {
            page.notification.show('Barcode '+barcode+' not found in stockInventory!');
            document.getElementById("item-input-select").value=""
            barcodeScanner.value = '';
        }
    document.getElementById("item-input-select").value="";
}
async function highlight(cb){
    var orig = cb.style.backgroundColor;
    cb.style.backgroundColor = '#BEFBD7';
    setTimeout(function(){
        cb.style.backgroundColor = orig;
    }, 500);
}

async function saveBayDetails(){
    let trs = document.querySelectorAll('#item-table-body tr');
    const inventorylocation = [];
    for(let tr of trs) {
        let invlocrow = {
            id: tr.dataset.id,
            invID: tr.dataset.invID,
            sku: tr.dataset.sku,
            indivQty: parseInt(tr.querySelector('.totalQty').textContent),
            cartonQty: 0,
            bay: document.querySelector('#bay span').textContent
        }
    inventorylocation.push(invlocrow);
    }
    // console.log(inventorylocation);
    let formData = new FormData();
    formData.append('inventorylocation',JSON.stringify(inventorylocation));

    let response = await fetch(apiServer+'inventoryLocation/createupdate', {method: 'POST', headers: {'DC-Access-Token': page.userToken}, body: formData});
    let responseData = await response.json();

    if (!response.ok || responseData.result != 'success') {     
        page.notification.show(responseData.result);
    } else {
        swal('Save Successfully!','','success').then(() => {location.reload();});
    }

}

function updateList(itemBarcode,id){
        let trs = document.querySelectorAll('#item-table-body tr');
        let sum = 0;
        let newqty = 1;
        for(let tr of trs) {
            if (itemBarcode == tr.querySelector('.itemBarcode').textContent && id == tr.dataset.invID){
                newqty = tr.querySelector('.totalQty').textContent;
                parseInt(newqty);
                newqty++;
                tr.querySelector('.totalQty').textContent = newqty;
                page.notification.show('Barcode '+itemBarcode+' +1 included');
                sum++;
                highlight(tr);
            }
            else {};
        }
        if (sum == 0){return false}
        else {return true} 
}