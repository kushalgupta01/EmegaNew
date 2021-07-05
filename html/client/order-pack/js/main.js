// Main

import { getUrlDate } from './utils.js';
import { NotificationBar } from '/common/notification.js';
import { loaddata, getRecordData } from './load-data.js';
import './scan.js';
import { logout } from './packing-buttons.js';
import { checkLogin } from '/common/tools.js';

// Global Variables
window.saleRecords = {};
window.notification = new NotificationBar();
window.userDetails = {
    username: localStorage.getItem('username') || '',
    usertoken: localStorage.getItem('usertoken') || '',
    password: localStorage.getItem('password') || '',
}
window.pageType = localStorage.pageType;
window.scanMode = localStorage.scanMode == "true";
window.packStore = localStorage.packStore;
window.packername = localStorage.username.toLowerCase();
window.scanFlatTrack = false;
window.orderDetails = {};
window.inventoryDetails = {};
//window.flatTrackScanDone = false;
window.warnDone = false;
window.weightDone = false;

window.combinedgroupstores = ['31','32','33'];

document.addEventListener('DOMContentLoaded', async function () {
    checkLogin();
    setHeader(); // Set header title
    await loadRecords(); // Load orders
    await loaddata(); // Load up an order

});

/*window.onbeforeunload = async function () {
    await logout(getRecordData());
}*/

// Set header title
function setHeader() {
	var headerString;
    var packingTypeName;
    var logoutBtnString;
	
	for (var i = 0; i < PACKING_TYPE.length; i++) {
		if (PACKING_TYPE[i].type == pageType) {
			packingTypeName = PACKING_TYPE[i].name;
		}
	}
    headerString = 'Welcome to ' + stores[packStore].name + ' ' + packingTypeName + ' Packing';
    logoutBtnString = 'Logout';
	var headervalue = document.querySelector('#header');
    headervalue.querySelector('h1').textContent = headerString + ' ' +
        packername;
    headervalue.querySelector('.logout').textContent = 
        logoutBtnString + ' ' + packername;
}

// Loads orders into saleRecords
async function loadRecords() {
    try {
        let response = await fetch(getLoadOrdersUrl(),
            {headers: {'DC-Access-Token': window.userDetails.usertoken}});
        let data = await response.json();
        
        if (data.result == 'success') {
            saleRecords = data.orders;
        }
    } catch (error) {
        console.log(error);
    }
}

// Returns load orders api url with set parameters
function getLoadOrdersUrl() {
    var loadOrdersOptions = apiOptions.loadOrders;
    loadOrdersOptions['storeS'] = 'store='+packStore;
    var options = [];
    var optionsS = '';

    options.push(getUrlDate(DATE_SET_BACK)); // Add date option
    for (let option in loadOrdersOptions) {
        options.push(loadOrdersOptions[option]);
    }
    optionsS = options.join('&');
    
    return apiUrls.loadOrdersUrl + '?' + optionsS;
}