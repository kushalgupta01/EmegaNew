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
        window.location.href = '/inventory/inventoryManagement.html';
    });

    var packerName = localStorage.getItem('username');
    document.querySelector("#header h1").textContent = "Welcome to Inventory Scan - " + packerName;

    let storeSelect = document.querySelector("#inventory-store");
    let option = document.createElement('option');
    option.value = '-';
    option.textContent = '-';
    storeSelect.appendChild(option);
    for (let store in stores) {
        if (['3','6','21','30','34'].includes(store)) continue;
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

    document.addEventListener('keypress', async function(e) {
        if (e.charCode == 13 || e.charCode == 0) { // 13, 0; Enter key
            e.preventDefault();
            e.stopPropagation();

            clearTimeout(barcodeScanner.timer);
            barcodeScanner.timer = null;
            console.log(barcodeScanner.value);
            let formData = new FormData();
            formData.append('scanned', barcodeScanner.value);
           

            let response = await fetch(apiUrl+'inventory/search', {method: 'post', headers: {'DC-Access-Token': localStorage.getItem('usertoken')}, body: formData});
            let data = await response.json();
            if (data.result == 'success') {
                let inventorys = data.data;
                console.log(inventorys);
                let invPage = window.open('/inventory/inventorydetail.html', '_blank');
                invPage.onload = () => invPage.postMessage({data: inventorys}, window.location.origin);
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

    document.querySelector('#inventory-search-button').addEventListener('click', inventorySearch);
   
});

async function inventorySearch() {
    let storeID = document.querySelector('#inventory-store').value;
    let searchType = document.querySelector('#inventory-search').value;
    let searchValue = document.querySelector('#inventory-search-value').value;

    if (searchValue=='') {
        notification.show('Please input '+searchType +'.');
        return;
    }

    let formData = new FormData();
    formData.append('store', storeID);
    formData.append('searchType', searchType);
    formData.append('searchValue', searchValue);

    let response = await fetch(apiUrl+'inventory/search', {method: 'post', headers: {'DC-Access-Token': localStorage.getItem('usertoken')}, body: formData});
    let data = await response.json();

    if (data.result == 'success') {
        let inventorys = data.data;
        let invPage = window.open('/inventory/inventorydetail.html', '_blank');
        invPage.onload = () => invPage.postMessage({data: inventorys}, window.location.origin);
        
    }else{
        notification.show(data.result, {hide: false});
    }
}