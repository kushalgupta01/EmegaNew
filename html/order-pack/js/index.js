// Index

import { login } from './utils.js';
import { NotificationBar } from '/common/notification.js';
import { checkLogin } from '/common/tools.js';

window.userDetails = { username: null, password: null, userToken: '' };
window.notification = new NotificationBar({ positionFixed: true });
window.nostoreIDs = ["3","5","6","30","34","21"];

document.addEventListener('DOMContentLoaded', function () {
    checkLogin();
    $('#header').on('click', '.menu', function () {
        window.location.href = MENU_SCREEN_URL;
    });

    window.userDetails.username = localStorage.username;
    window.userDetails.password = localStorage.password;
    window.userDetails.userToken = localStorage.userToken;

    if (window.userDetails.username) {
        document.querySelector('#page-username').value = 
            window.userDetails.username;
    }

    createPackingBtns();

    createOrderLeftTable();

    let storeSelect = document.querySelector("#pack-store");
    //let storeIDs = ["1","4","2","7","31","32","33","41","51","61"];
    //let storeIDs = ["3","5","6","30","34","21"];
    for (let store in stores) {
        if (nostoreIDs.includes(store)) continue;
        let option = document.createElement('option');
        option.value = store;
        option.textContent = stores[store].name;
        storeSelect.appendChild(option);
    }

    document.querySelector("#pack-scan button").addEventListener('click', redirectScan);
});

// Function when a button is pressed
async function redirectPacking(pageType) {
    var packername = document.querySelector('#page-username').value
        .toLowerCase();
    var success = false;

    if (!packername) {
        notification.show('Please enter your name');
    } else {
        window.userDetails.username = packername;
        localStorage.setItem('pageType', pageType);
        localStorage.setItem('scanMode', false);

        var store = document.querySelector('#pack-store').value;
        if (store == '-') {
            notification.show('Please select a store.');
        }else{
            localStorage.setItem('packStore', store);
            success = await login(window.userDetails);
            if (success) {
                window.location.href = PACKING_SCREEN_URL;
            } else {
                window.location.href = MENU_SCREEN_URL;
            }
        }
        
    }
}

// Creates buttons for different packing types
function createPackingBtns() {
    var packingTypes = PACKING_TYPE;

    for (let i = 0; i < packingTypes.length; i++) {
        var btnMain = document.createElement('BUTTON');
        var txtMain = document.createTextNode(packingTypes[i].name);
        btnMain.id = packingTypes[i].nameShort.toLowerCase() + 'Btn';
        btnMain.className = 'action-btn btn-dblue';
        btnMain.dataset.btntype = packingTypes[i].type;
        btnMain.appendChild(txtMain);
        btnMain.onclick = function () {
            redirectPacking(this.dataset.btntype);
        }
        document.querySelector('#packing-buttons').appendChild(btnMain);
    }
}

async function createOrderLeftTable() {
    let orderLeftTableHead = document.querySelector('#orderlefttable thead');
    let orderLeftTableBody = document.querySelector('#orderlefttable tbody');
    let ordersLeft;
    try {
        let response = await fetch(apiUrls.getOrdersLeftUrl);
        let data = await response.json();
        
        if (data.result == 'success') {
            ordersLeft = data.ordersLeft;
            //console.log(ordersLeft);
        }
    } catch (error) {
        console.log(error);
    }

    let packingTypes = PACKING_TYPE;
    let headTr = document.createElement('tr');
    let th = document.createElement('th');
    headTr.appendChild(th);
    for (let i = 0; i < packingTypes.length; i++) {
        let th = document.createElement('th');
        th.textContent = packingTypes[i].name;
        headTr.appendChild(th);
    }
    orderLeftTableHead.appendChild(headTr);

    //let storeIDs = ["1","4","6","2","7","8","31","32","33","41","51","61"];
    for (let store in stores) {
        if (nostoreIDs.includes(store)) continue;
        if (['9','15','16','62','63'].includes(store)) continue;
        let bodyTr = document.createElement('tr');
        let th = document.createElement('th');
        th.textContent = stores[store].name;
        bodyTr.appendChild(th);

        let orderCounts = ordersLeft[store];

        for (let i = 0; i < packingTypes.length; i++) {
            let td = document.createElement('td');
            td.textContent = orderCounts ? orderCounts[packingTypes[i].type] : 'N/A';
            bodyTr.appendChild(td);
        }

        orderLeftTableBody.appendChild(bodyTr); 
    }
    document.getElementById('loading').style.display = 'none';
       

}

async function redirectScan() {
    var packername = document.querySelector('#page-username').value
        .toLowerCase();
    var success = false;

    if (!packername) {
        notification.show('Please enter your name');
    } else {
        window.userDetails.username = packername;
        //localStorage.setItem('pageType', 0);
        localStorage.setItem('scanMode', true);
        success = await login(window.userDetails);
        if (success) {
            window.location.href = PACKING_SCAN_URL;
        } else {
            window.location.href = MENU_SCREEN_URL;
        }  
        
    }
}