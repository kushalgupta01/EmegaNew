// Index

import { login } from './utils.js';
import { NotificationBar } from '/common/notification.js';
import { apiServer,  apiServerLocal} from '/common/api-server.js';
import { checkLogin } from '/common/tools.js';


window.userDetails = { username: null, userToken: '' };
window.notification = new NotificationBar({ positionFixed: true });

window.apiServer = apiServer;
window.apiServerLocal = apiServerLocal;

if (window.location.hostname.startsWith('192.168')) {
    window.apiServer = apiServerLocal;
}

const apiUrl = window.apiServer;

document.addEventListener('DOMContentLoaded', function () {
    checkLogin();

    $('#header').on('click', '.menu', function () {
        window.location.href = '/client/order-pack/index.html';
    });

    let lastLogin = new Date(localStorage.getItem('lastLogin'));
    let currentLogin = new Date();
    
    /*if (currentLogin.getTime() - lastLogin.getTime() > 18000000) {
        localStorage.setItem('lastLogin', currentLogin);
        localStorage.removeItem('username');
        localStorage.removeItem('usertoken');
        window.location.href = '/';
    } else {
        localStorage.setItem('lastLogin', currentLogin);
    }*/

    var packerName = localStorage.getItem('username');
    // console.log(packerName);
    document.querySelector("#header h1").textContent = "Welcome to Pack Scan - " + packerName;

    let storeSelect = document.querySelector("#pack-store");
    let supplierStores = SUPPLIER_INFO[window.userDetails.supplier].stores;
    for (let store in stores) {
        if (supplierStores && !supplierStores.includes(store)) continue;
        let option = document.createElement('option');
        option.value = store;
        option.textContent = stores[store].name;
        storeSelect.appendChild(option);
    }

    var barcodeScanner = {
        value: '',
        startTime: null,
        timer: null,
        timeLimit: 600,
    };

    let button = document.querySelector('#li-pendingorders');
    let supplier = window.userDetails.supplier;
    
    if (button.classList.contains(SUPPLIER_INFO[supplier].id)) {
        button.classList.remove('hide');
    } else {
        button.classList.add('hide');
    }
      
    // let button2 = document.querySelector('#li-packorders');
    // let supplier2 = window.userDetails.supplier;
    
    // if (button2.classList.contains(SUPPLIER_INFO[supplier2].id)) {
    //     button2.classList.remove('hide');
    // } else {
    //     button2.classList.add('hide');
    // }
        
    document.addEventListener('keypress', async function(e) {
        if (e.charCode == 13 || e.charCode == 0) { // 13, 0; Enter key
            e.preventDefault();
            e.stopPropagation();

            clearTimeout(barcodeScanner.timer);
            barcodeScanner.timer = null;
            if (barcodeScanner.value.length == 39) {
                barcodeScanner.value = barcodeScanner.value.substring(18,39);
            }
            if (barcodeScanner.value.length == 41) {
                barcodeScanner.value = barcodeScanner.value.substring(18,41);
            }
            /*if (barcodeScanner.value.length == 23) {
                barcodeScanner.value = barcodeScanner.value.substring(0,12);
            }*/
            console.log(barcodeScanner.value);
            let formData = new FormData();
            formData.append('scanned', barcodeScanner.value);
           

            let response = await fetch(apiUrl+'gettrackorder', {method: 'post', headers: {'DC-Access-Token': localStorage.getItem('usertoken')}, body: formData});
            let data = await response.json();
            if (data.result == 'success') {
                let status = data.record[0].status;
                let type = data.record[0].type;
                let store = data.record[0].store;
                if (status == 2 || status == 9 || status == 10) {
                    localStorage.setItem('recordID', JSON.stringify(data.record));
                    localStorage.setItem('pageType', type);
                    localStorage.setItem('packStore', store);
                    window.location.href = '/order-pack/packing.html';
                }else{
                    let status_name;
                    for (let sta in ORDER_STATUS) {
                        if (ORDER_STATUS[sta]==status) {
                            status_name = sta;
                            break;
                        }
                    }
                    notification.show(`Order ${stores[data.record[0].store].name} ${data.record[0].orderID} is ${status_name}.`, {hide: false});
                }
                
            }else{
                notification.show(data.result, {hide: false});
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

        //console.log(barcodeScanner.value);
    });

    document.querySelector('#pack-search-button').addEventListener('click', packSearch);
   
});

async function packSearch() {
    let storeID = document.querySelector('#pack-store').value;
    let searchType = document.querySelector('#pack-search').value;
    let searchValue = document.querySelector('#pack-search-value').value;

    if (searchType=='SalesRecordID' && storeID=='-') {
        notification.show('Please select a store.');
        return;
    }

    if (searchValue=='') {
        notification.show('Please input '+searchType +'.');
        return;
    }

    let formData = new FormData();
    formData.append('store', storeID);
    formData.append('searchType', searchType);
    formData.append('searchValue', searchValue);

    let response = await fetch(apiUrl+'searchpackorder', {method: 'post', headers: {'DC-Access-Token': localStorage.getItem('usertoken')}, body: formData});
    let data = await response.json();

    if (data.result == 'success') {
        let status = data.record[0].status;
        let type = data.record[0].type;
        let store = data.record[0].store;
        if (status == 2 || status == 9 || status == 10) {
            localStorage.setItem('recordID', JSON.stringify(data.record));
            localStorage.setItem('pageType', type);
            localStorage.setItem('packStore', store);
            window.location.href = '/client/order-pack/packing.html';
        }else{
            console.log(status);
            var status_name;
            for (let sta in ORDER_STATUS) {
                if (ORDER_STATUS[sta]==status) {
                    status_name = sta;
                    break;
                }
                
            }

            notification.show(`Order ${stores[data.record[0].store].name} ${data.record[0].salesRecordID} is ${status_name}.`, {hide: false});
        }
        
    }else{
        notification.show(data.result, {hide: false});
    }
}

