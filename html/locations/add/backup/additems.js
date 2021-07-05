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
		window.location.href = '/inventory/inventorymanagement.html';
	});

    // await checkLocationTable();
    document.getElementById('sts-newWarehouse').checked = true;
    await checkLocationTable();

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

    //loadBay
    document.getElementById("load-bay").addEventListener("click", async(event) => {
            let checkLocat = document.getElementById("location-input-search").value.replace(/^\s+|\s+$|\s+(?=\s)/g, "").toUpperCase();
            if (checkLocat.startsWith('EMG-') && document.getElementById('sts-newWarehouse').checked == true){
                checkLocat = checkLocat.substr(4);
                }
            let location = 'EMG-'+checkLocat;
            if (location === null || location == ""){
                    swal('Please select one location!','','warning');
                }
            else{
                var letters = /^[A-Za-z ^0-9-]+$/;
                if(location.match(letters)){
                    // location = location.replace(/^\s+|\s+$|\s+(?=\s)/g, "");
                    var r = await isExistedBay(location);
                    if (r == false) {
                        swal({
                            title: "Bay not found!",
                            text: "Would you like to create "+location+" as a new location",
                            icon: "info",
                            buttons: true,
                        })
                        .then(async(willCreate) => {
                            if (willCreate) {
                                await createLocation(location,origin);
                                document.location.href = '/locations/add/locationdetails-add.html?bay='+location;
                            }else{
                                document.getElementById("location-input-search").value = "";
                                barcodeScanner.value = '';
                                return;
                            }
                        });
                    }
                    else{
                    document.location.href = '/locations/add/locationdetails-add.html?bay='+location;
                    }
                }
                else{
                    swal('ERROR: Special Character Detected',location,'error');
                    document.getElementById("location-input-search").value = "";
                    barcodeScanner.value = '';
                    return;
                }
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
            
            let location = 'EMG-'+document.getElementById("location-input-search").value.replace(/^\s+|\s+$|\s+(?=\s)/g, "").toUpperCase();
            if (location === null || location == ""){
                swal('Input search field is empty','','warning');
            }
            else{
                var letters = /^[A-Za-z ^0-9-]+$/;
                if(location.match(letters)){
                    // location = location.replace(/^\s+|\s+$|\s+(?=\s)/g, "");
                    var r = await isExistedBay(location);
                    if (r == false) {
                        swal({
                            title: "Bay not found!",
                            text: "Would you like to create "+location+" as a new location",
                            icon: "info",
                            buttons: true,
                        })
                        .then(async(willCreate) => {
                            if (willCreate) {
                                await createLocation(location,origin);
                                document.location.href = '/locations/add/locationdetails-add.html?bay='+location;
                            }
                            else{
                                document.getElementById("location-input-search").value = "";
                                return;
                            }
                        });
                    }
                    else{
                    document.location.href = '/locations/add/locationdetails-add.html?bay='+location;
                    }
                }
                else{
                    swal('ERROR: Special Character Detected',location,'error');
                    document.getElementById("location-input-search").value = "";
                    barcodeScanner.value = '';
                    return;
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
                    //checkBayexist();
                    document.location.href = '/locations/add/locationdetails-add.html?bay='+location.bay;              
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
        	tr.appendChild(td);
        }
	    locTBody.appendChild(tr);		
	}
    document.getElementById('loading').style.display = 'none';
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
    // if (document.getElementById('sts-b2c').checked == true){
    // await loadBay();
    // await bayTable();
    // }
    // else if (document.getElementById('bulk-locations').checked == true) {
    //     let type = 1;
    //     await loadBayBulk(type);
    //     await bayTable();
    // }
    // else if (document.getElementById('pick-locations').checked == true) {
    //     let type = 0;
    //     await loadBayBulk(type);
    //     await bayTable();
    // }
    // else if (document.getElementById('dispatch-locations').checked == true) {
    //     let type = 3;
    //     await loadBayBulk(type);
    //     await bayTable();
    // }
    // else 
    if (document.getElementById('sts-newWarehouse').checked == true) {
        let type = 4;
        await loadBayBulk(type);
        await bayTable();
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