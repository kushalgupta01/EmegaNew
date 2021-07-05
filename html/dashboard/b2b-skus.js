import '/order-collect/js/config.js';
import { NotificationBar } from '/common/notification.js';
import { addListener, checkLogin } from '/common/tools.js';

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

if (page.local) {
    apiServer = apiServerLocal;
}
document.addEventListener('DOMContentLoaded', async function () {
    checkLogin();
    await showB2BSkus();
});

async function showB2BSkus() {
    do {
        let response, data;
        try {
            response = await fetch(apiServer + "ordersb2b/getskus", { method: 'get', headers: { 'DC-Access-Token': page.userToken } });
            data = await response.json();
            if (data.b2bskus) {
                let names = data.b2bskus;
                const mp = new Map(names.map(o => [o.sku, {...o, count: 0 }]));
                for (const {sku} of names) mp.get(sku).count++;
                const result = Array.from(mp.values());
                result.sort(function(a, b) {
                    return parseFloat(b.count) - parseFloat(a.count);
                });
                console.log(result.length);
                let table = [];
                let topElement = [];
                for (let i=0; i<result.length; i++) {
                    let orders = names.filter(o => o.sku.includes(result[i].sku));
                    let elements = [];
                    let total = 0;
                    for (let order of orders) {
                        elements.push(order.orderID+'('+order.quantity+')');
                        total = total + parseInt(order.quantity);
                    };

                    let tableRow = {
                        sku: result[i].sku,
                        orders: elements,
                        total: total
                    };

                    table.push(tableRow)
                    topElement.push(elements);
                }
                console.log(topElement);
                let b2bSkuTable = document.querySelector('#top-b2b-skus');
                b2bSkuTable.classList.remove('hide');

                let tBody = document.querySelector('#top-b2b-skus tbody');
                while (tBody.firstChild) {
                    tBody.removeChild(tBody.firstChild);
                }

                var cols = ['sku', 'noOfOccur', 'orders', 'total', 'stockOnHand'];

                for (let row of table){
                    let tr = document.createElement('tr');
                    tr.dataset.sku = row.sku
                    for (let col of cols) {
                        let td = document.createElement('td');
                        td.classList.add(col);
                        if (col == 'noOfOccur'){
                            td.textContent = row.orders.length;
                        }
                        else if (col == 'sku'){
                            td.textContent = row.sku;
                        }
                        else if (col == 'orders'){
                            td.textContent = row.orders.join(", ");
                        }
                        else if (col == 'total'){
                            td.textContent = row.total;
                        }
                        else if (col == 'stockOnHand'){
                            td.textContent = '...';
                        }
                        tr.appendChild(td);
                    }
                    tBody.appendChild(tr);
                }
                await recommendedOrders(data.orderIDs);

            }
        } catch (e) {
            console.log(e);
            page.notification.show("Error: Could not connect to the server.");
            break;
        }

    } while (0);

}

async function recommendedOrders(orderIDs){
    let a = orderIDs.map(function(item){ return item.orderID; });
    console.log(a);
}

//// Utils
// Get all unique sets of a size
const allSets = (xs, size) => 
  size === 1
    ? xs
    : xs.flatMap(
      (x, i) => allSets(xs.slice(i + 1), size - 1).map(tail => [x, ...tail]))

// Get a range of ints between two values
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// Get all unique values from an array
const uniques = xs => Array.from(new Set(xs));
