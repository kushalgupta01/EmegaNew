//  Discount Chemist
//  Order System Home

import './config.js';
import {NotificationBar} from '/common/notification.js';
import {addListener, removeListener, checkLogin} from '/common/tools.js';

window.page = {
	type: null,
	els: {
		username: null,
	},
	notification: new NotificationBar({positionFixed: true}),
	user: {
		id: '',
		username: '',
		password: '',
		firstname: '',
		lastname: '',
		type: '',
	},
	userToken: localStorage.getItem('usertoken') || '',
	local: window.location.hostname.startsWith('1'),
}

//console.log(page.local);

if (page.local) {
	apiServer = apiServerLocal;
	wsServer = wsServerLocal;
}



document.addEventListener('DOMContentLoaded', async function() {
	checkLogin();
	document.getElementById('username').textContent = localStorage.getItem('username');
	// Page type
	var pageTypeName = document.getElementById('container');
	if (pageTypeName) pageTypeName = pageTypeName.dataset.pageType;

	for (let pageType in PAGE_TYPE) {
		if (PAGE_INFO[PAGE_TYPE[pageType]].name == pageTypeName) {
			page.type = PAGE_TYPE[pageType];
			break;
		}
	}

	if (!page.type) {
		page.notification.show('Error: Invalid page type', {hide: false});
		return;
	}

	switch (page.type) {
		case PAGE_TYPE.HOME:
		case PAGE_TYPE.ORDERHOME:
			break;
	}
	
	var pageInfo = PAGE_INFO[page.type];

	// Title, header
	document.title = pageInfo.title;
	var header = document.getElementById('header'), headerTitle = header.querySelector('.title');
	headerTitle.textContent = pageInfo.heading || pageInfo.title;
	if (pageInfo.position) {
		headerTitle.classList.add(pageInfo.position);
	}

	// Header colour
	if (window.location.hostname.startsWith('local.')) {
		document.getElementById('header').classList.add('local');
	}

	// Check user
	var loginSuccess = false;
	if (page.userToken) {
		try {
			let formData = new FormData();
			let response = await fetch(apiServer + 'users/login', {method: 'post', headers: {'DC-Access-Token': page.userToken}, body: formData});
			let data = await response.json();

			if (!response.ok) {
				console.log('Error: '+data.result);
			}

			if (data.result == 'success') {
				// Save user details
				page.user = data.user;
				//page.user.firstname = data.user.firstname;
				
				let buttons = document.querySelectorAll('.page-line button');
				let userType = window.page.user.type;
				for (let btn of buttons) {
					if (USER_TYPE_INFO[userType].name == 'Supplier') {
						if (btn.dataset.userType == 'Supplier') {
							btn.classList.remove('hide');
						}
					} else {
						btn.classList.remove('hide');
					}
					
				}

				await getOrders();
				
				document.querySelector('#home #input-line').classList.add('hide');
				document.querySelector('#record-nav-buttons #record-logout span').textContent = window.page.user.firstname;
				document.querySelector('#record-nav-buttons #record-logout').classList.remove('hide');
				document.querySelector('#record-nav-buttons #record-logout').addEventListener('click', function() {
					localStorage.removeItem('username');
					localStorage.removeItem('usertoken');
					window.location.href = '/';
				});
	
			}
			else {
				console.log(data.result);
			}
		}
		catch (e) {
			console.log('Error: Could not connect to the server.');
			console.log(e);
		}
	}

	addListener('#home button[id^="page-"]', 'click', async function(e) {
		// Go to page
		var newPage = null;
		switch (this.id) {
			case 'page-manage':
				newPage = '/client/order-collect/manage.html';
				break;
			case 'page-download':
				newPage = '/client/order-download/index.html';
				break;
			default:
				break;
		}

		if (newPage) window.location.href = newPage;
	});
});

async function getOrders() {
  do {
    let response, data;
    try {
      response = await fetch(apiServer + "clients/stat");
      data = await response.json();

      if (!response.ok) {
        page.notification.show("Error: " + data.result);
        break;
      }
    } catch (e) {
      page.notification.show("Error: Could not connect to the server.");
      break;
    }
	
	document.getElementById("total_new_orders").textContent = data.total_new_orders;
  	document.getElementById("total_collected_orders").textContent = data.total_collected_orders;

	loadOrdersToPanel("#panel-1", data.latest_orders);
	loadOrdersToPanel("#panel-2", data.latest_collected_orders);

  } while (0);

}

function loadOrdersToPanel(panelID, orders) {
  let tableBody = document.querySelector(panelID + " table tbody");

  // Remove all entries from table
  while (tableBody.firstChild) {
    tableBody.removeChild(tableBody.firstChild);
  }

  // Add orders to table
  let cols = [
    "StoreID",
    "RecordID",
    "UserID",
    "TotalPrice",
    "BuyerFirstName",
    "BuyerLastName",
    "BuyerFullName",
    "BuyerAddress1",
    "BuyerAddress2",
    "BuyerCity",
    "BuyerState",
    "BuyerPostcode",
    "BuyerCountry",
    "PhoneNumber",
    "deliveryNote",
  ];
  let colsNotEditable = {
    StoreID: 1,
    RecordID: 1,
    UserID: 1,
    TotalPrice: 1,
    BuyerFirstName: 1,
    BuyerLastName: 1,
  };
  let colsSelectText = {
    StoreID: 1,
    RecordID: 1,
    UserID: 1,
    TotalPrice: 1,
  };

  for (let storeID in orders) {
    for (let orderData of orders[storeID]) {
      // Add order details
      let order = orderData.data;
      let tr = document.createElement("tr"),
        trMsg = null;

      // Order info
      let express = order.PostageService
        ? order.PostageService.toLowerCase().includes("express")
        : false;
      let international =
        order.BuyerCountry && order.BuyerCountry.toUpperCase() != "AU";
      //order.rowID = orderData.id; // Add the row ID to the order

      tr.dataset.store = storeID;
      tr.dataset.id = orderData.id;
      tr.dataset.sku = orderData.data.Items[0].SKU;
      if (express) tr.dataset.express = 1;
      if (international) tr.dataset.international = 1;

      // Order details
      for (let col of cols) {
        let td = document.createElement("td");
        td.dataset.col = col;
        if (!colsNotEditable.hasOwnProperty(col)) td.contentEditable = false;
        else if (colsSelectText.hasOwnProperty(col)) td.dataset.selecttext = 1;

        let text = "";
        switch (col) {
          case "StoreID":
            text = stores[storeID].name;
            break;
          case "deliveryNote":
            text = orderData.deliveryNote;
            break;
          /*case 'id':
							text = orderData.id;
							break;*/
          default:
            text = order[col];
        }

        td.textContent = text || "";
        tr.appendChild(td);
      }

      let notPaid = false;
      if (stores[storeID].checkPayment !== false) {
        if (
          (order.PaymentMethod &&
            order.PaymentMethod.toUpperCase() == "NONE") ||
          order.PaymentStatus.toUpperCase() != "PAID"
        ) {
          // Not paid yet
          tr.classList.add("bg-red");
          tr.dataset.notpaid = "true";
          notPaid = true;
        } else if (
          (order.PaymentMethod &&
            order.PaymentMethod.toLowerCase() ==
              "moneyxferacceptedincheckout") ||
          order.TransactionID.toUpperCase() == "SIS" ||
          order.TransactionID.length <= 5
        ) {
          // Payment pending
          tr.classList.add("bg-orange");
          tr.dataset.notpaid = "true";
          notPaid = true;
        }
      }

      if (order.Note) {
        // Add message row
        let td = document.createElement("td"),
          td2 = document.createElement("td");
        trMsg = document.createElement("tr");
        trMsg.dataset.store = storeID;
        trMsg.dataset.id = orderData.id;
        if (express) trMsg.dataset.express = 1;
        if (international) trMsg.dataset.international = 1;
        if (notPaid) trMsg.dataset.notpaid = 1;

        tr.dataset.message = 1;
        tr.classList.add("msg1");

        trMsg.dataset.message = 1;
        trMsg.classList.add("msg2");

        td.colSpan = 2;
        td.textContent = "Message:";
        td2.colSpan = 14;
        td2.textContent = order.Note;

        trMsg.appendChild(td);
        trMsg.appendChild(td2);
      }

      tableBody.appendChild(tr);
      if (trMsg) tableBody.appendChild(trMsg);
    }
  }
}

document.getElementById('logout_link').addEventListener('click', function () {
	localStorage.removeItem('username');
	localStorage.removeItem('usertoken');
	window.location.href = '/login.html';
});

