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

function loadStores() {
    let cgStoreIds = [31, 32, 33, 34];
    let html = [];

    for (var i = 0; i < cgStoreIds.length; i++) {
        let storeId = cgStoreIds[i];
        html.push('<option value="' + storeId + '">' + stores[storeId].name + '</option>');
    }

    $('#store').html(html.join(''));
}

document.addEventListener('DOMContentLoaded', async function () {
    checkLogin();
    document.getElementById('username').textContent = localStorage.getItem('username');
    if (localStorage.getItem('username') != 'waterwipes') $('#li-orderdownload').removeClass('hide');

    addListener('#btnAddStock', 'click', function (e) {
        addItem();
    });

    addListener('#btnResetStock', 'click', function (e) {
        clearForm();
    });

    await getInventoryData();

    loadStores();
});

document.getElementById('logout_link').addEventListener('click', function () {
    localStorage.removeItem('username');
    localStorage.removeItem('usertoken');
    window.location.href = '/login.html';
});

async function getInventoryData() {
    do {
        let response, data;

        try {
            response = await fetch(apiServer + "clients/inventory", { method: 'get', headers: { 'DC-Access-Token': page.userToken } });
            data = await response.json();

            if (data.inventory.length > 0) {
                var html = [];
                $.each(data.inventory, function (index, value) {
                    var storeName = (value.store && stores[value.store]) ? stores[value.store].name : '';
                    html.push([
                        '<tr>',
                            '<td>' + value.sku + '</td>',
                            '<td>' + storeName + '</td>',
                            '<td>' + value.itemNo + '</td>',
                            '<td>' + value.itemName + '</td>',
                            '<td>' + value.itemBarcode + '</td>',
                            '<td>' + value.stockInHand + '</td>',
                            '<td class="text-center">',
                            '<a class="modal-btn modal-detail" data-modal-action="open" data-store="' + value.store + '" data-sku="' + value.sku + '"  data-modal-target="modal-viewdetail-' + value.store + '-' + value.sku + '"><img class="img-detail" src="img/view_detail.png" alt=""></a>',
                            '<a style="display:none;" class="modal-btn modal-trigger11" onclick="showUpdateForm()" href="#modal-updatestock-' + index + '" data-modal-action="open" data-modal-target="modal-updatestock-' + index + '"><img class="img-detail" src="img/icn_addnew.png" alt=""></a>',
                            '</td>',
                        '</tr>'
                    ].join(''));
                });

                $("#tblInventory tbody").html(html.join(''));
                $('#tblInventory').DataTable();

                jQuery('.modal-trigger[data-modal-action="open"]').on('click', function(e) {
                  e.preventDefault();
                  jQuery('.modal-container[data-modal="' + jQuery(this).attr('data-modal-target') + '"]').show();
                });

                jQuery('.modal-close[data-modal-action="close"]').on('click', function(e) {
                  e.preventDefault();
                  jQuery(this).closest('.modal-container').hide();
                });

                $('body').on('click', '.modal-detail', async function() {
                    var $this = $(this);
                    var store = $this.data('store');
                    var sku = $this.data('sku');

                    await showInventoryDetail(store, sku);
                });
            }

            if (!response.ok) {
                page.notification.show("Error: " + data.result);
                break;
            }
        } catch (e) {
            page.notification.show("Error: Could not connect to the server.");
            break;
        }

    } while (0);

}

async function showInventoryDetail(store, sku) {
    do {
        let response, data;
        try {
            response = await fetch(apiServer + "clients/inventorydetail?" + "store=" + store + "&sku=" + sku);
            data = await response.json();
            if (data.inventory) {
                var html = generateDetailStockHtml(data.inventory);
                jQuery('.modal-container[data-modal="modal-viewdetail"]').find('.modal-content').html(html);
                jQuery('.modal-container[data-modal="modal-viewdetail"]').show();

                var $menu_tabs = $('.menu__tabs li a');
                $menu_tabs.on('click', function (e) {
                    e.preventDefault();
                    $menu_tabs.removeClass('active');
                    $(this).addClass('active');

                    $('.menu__item').fadeOut(300);
                    $(this.hash).delay(300).fadeIn();
                });
            }

            if (!response.ok) {
                page.notification.show("Error: " + data.result);
                break;
            }
        } catch (e) {
            console.log(e);
            page.notification.show("Error: Could not connect to the server.");
            break;
        }

    } while (0);

}

function generateUpdateStocklHtml(index, value) {
    let html = [
        '<div class="modal-container" id="modal-updatestock-' + index + '"  data-modal="modal-updatestock-' + index + '">',
            '<div class="modal-body">',
                '<div class="modal-header">',
                    '<div class="modal-heading">Update Inventory</div>',
                    '<div class="modal-close"  data-modal-action="close">',
                        '<svg class="icon iconClose" viewBox="0 0 32 40">',
                            '<path d="M16,0C7.163,0,0,7.163,0,16s7.163,16,16,16s16-7.163,16-16S24.837,0,16,0z M22.717,21.304l-1.414,1.414L16,17.414   l-5.303,5.304l-1.414-1.414L14.586,16l-5.303-5.304l1.414-1.414L16,14.586l5.303-5.304l1.414,1.414L17.414,16L22.717,21.304z"></path>',
                        '</svg>',
                    '</div>',
                '</div>',

                '<div class="modal-content">',
                    '<div class="content-table">',
                        '<table class="table-no-block">',
                            '<tbody>',
                                '<tr>',
                                    '<th>SKU</th>',
                                    '<td>' + value.sku + '</td>',
                                '</tr>',
                                '<tr>',
                                    '<th>ItemNo</th>',
                                    '<td>' + value.itemNo + '</td>',
                                '</tr>',
                                '<tr>',
                                    '<th>Item Name</th>',
                                    '<td>' + value.itemName + '</td>',
                                '</tr>',
                                '<tr>',
                                    '<th>Stock In Hand</th>',
                                    '<td><input class="input-text" type="text" name="" value="' + value.stockInHand +'"></td>',
                                '</tr>',
                            '</tbody>',
                        '</table>',
                        '<button class="action-btn" type="submit">Save</button> <button class="action-btn" type="reset">Reset</button>',
                    '</div>',
                '</div>',
            '</div>',
        '</div><!-- End Modal Update -->'
    ];
    return html.join('');
}

function generateDetailStockHtml(value) {
    let stockRowHtml = [];

    if (value.stockData) {
        for (var i = 0; i < value.stockData.length; ++i) {
            let stock = value.stockData[i];
            var storeName = (stock.store && stores[stock.store]) ? stores[stock.store].name : '';
            stockRowHtml.push(
                '<tr>',
                    '<td>' + stock.store + '</td>',
                    '<td>' + storeName + '</td>',
                    '<td class="text-right">' + stock.stockInHand + '</td>',
                    '<td class="text-right">' + stock.stockInHand + '</td>',
                '</tr>',
            );
        }
    }

    let stockHtml = [
        '<div class="content-table">',
            '<table>',
                '<thead>',
                    '<tr>',
                        '<th>Warehouse Id</th>',
                        '<th>Warehouse Name</th>',
                        '<th>Stock In Hand</th>',
                        '<th>Available</th>',
                    '</tr>',
                '</thead>',
                '<tboby>',
                    stockRowHtml.join(''),
                '</tboby>',
            '</table>',
        '</div>'
    ].join('');

    let html = [
        '<div class="body-info body-viewdetail">',
            '<dl>',
                '<dt>SKU</dt>',
                '<dd>' + value.sku + '</dd>',
                '<dt>Item No</dt>',
                '<dd>' + value.itemNo + '</dd>',
                '<dt>Item Name</dt>',
                '<dd>' + value.itemName + '</dd>',
            '</dl>',
            '<dl class="img-detail">',
                '<dt>Image</dt>',
                '<dd><img src="' + value.image + '" height="150" /></dd>',
            '</dl>',
        '</div>',

        '<div class="menu-tab">',
            '<ul class="menu__tabs">',
                '<li><a class="active" href="#item-1"><i class="fa fa-star"></i>General</a></li>',
                '<li><a href="#item-2"><i class="fa fa-link"></i> Stock data</a></li>',
            '</ul>',

            '<div class="menu__wrapper">',
                '<div id="item-1" class="menu__item item-active">',
                    '<dl>',
                        '<dt>Item Barcode</dt>',
                        '<dd>' + value.itemBarcode + '</dd>',
                        '<dt>Weight</dt>',
                        '<dd>' + value.weight + '</dd>',
                        '<dt>Quantity Per Carton</dt>',
                        '<dd>' + value.quantityPerCarton  + '</dd>',
                    '</dl>',
                '</div>',

                '<div id="item-2" class="menu__item">',
                    stockHtml,
                '</div>',

            '</div>',

        '</div>',
    ];
    return html.join('');
}

function clearFeedback() {
    let feedbacks = document.querySelectorAll('.feedback');
    //console.log(feedbacks);
    for (let fd of feedbacks) {
        fd.classList.add('hide');
        fd.textContent = '';
    }
}

async function addItem() {
    clearFeedback();
    let send = true;
    let formData = new FormData();

    // gather information provided and add to formData
    let itemNo = document.querySelector('#itemNo').value;


    formData.append('itemNo', itemNo);

    let itemName = document.querySelector('#itemName').value;

    formData.append('itemName', itemName);

    let sku = document.querySelector('#sku').value;

    if (sku == '') {
        send = false;
        let skufeed = document.querySelector('#sku-feedback');
        skufeed.textContent = "Please fill in item sku.";
        skufeed.classList.remove('hide');
    }

    formData.append('sku', sku);
    formData.append('customSku', sku);

    let itemBarcode = document.querySelector('#itemBarcode').value;

    formData.append('itemBarcode', itemBarcode);

    let cartonBarcode = document.querySelector('#cartonBarcode').value;
    let quantityPerCarton = document.querySelector('#quantityPerCarton').value;

    formData.append('cartonBarcode', cartonBarcode);
    formData.append('quantityPerCarton', quantityPerCarton);

    let weight = document.querySelector('#weight').value;

    formData.append('weight', weight);

    let stockInHand = document.querySelector('#stockInHand').value;
    if (stockInHand == '') {
        send = false;
        let stockInHandfeed = document.querySelector('#stockInHand-feedback');
        stockInHandfeed.textContent = "Please fill in quantity.";
        stockInHandfeed.classList.remove('hide');
    }

    let store = document.querySelector('#store').value;
    formData.append('store', store);

    formData.append('expiry', '0000-01-01');
    formData.append('stockInHand', stockInHand);


    formData.append('supplier', 'cg');

    // add new information to the database
    if (!send) {
        page.notification.show("Please complete the form.");
        return;
    } else {
        //clearForm();
    }

    let response = await fetch(apiServer + '/clients/addproduct', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
    let addProductData = await response.json();

    console.log('addProductData', addProductData);

    if (response.ok && addProductData.result == 'success') {
        console.log('response', response);
        page.notification.show("Item added successfully.");
    }
    else {
        page.notification.show(addProductData.result);
    }
}

function clearForm() {
    if (document.querySelector('#itemNo') != null) { document.querySelector('#itemNo').value = ''; }
    if (document.querySelector('#itemName') != null) { document.querySelector('#itemName').value = ''; }
    if (document.querySelector('#sku') != null) { document.querySelector('#sku').value = ''; }
    if (document.querySelector('#customsku') != null) { document.querySelector('#customsku').value = ''; }
    if (document.querySelector('#itemBarcode') != null) { document.querySelector('#itemBarcode').value = ''; }
    if (document.querySelector('#cartonBarcode') != null) { document.querySelector('#cartonBarcode').value = ''; }
    if (document.querySelector('#quantityPerCarton') != null) { document.querySelector('#quantityPerCarton').value = ''; }
    if (document.querySelector('#weight') != null) { document.querySelector('#weight').value = ''; }
    if (document.querySelector('#stockInHand') != null) { document.querySelector('#stockInHand').value = ''; }
    if (document.querySelector('#stockReceived') != null) { document.querySelector('#stockReceived').value = ''; }
    if (document.querySelector('#stockSent') != null) { document.querySelector('#stockSent').value = ''; }
    if (document.querySelector('#bay') != null) { document.querySelector('#bay').value = ''; }
    if (document.querySelector('#expiry') != null) { document.querySelector('#expiry').value = ''; }
    if (document.querySelector('#coreCloseout') != null) { document.querySelector('#coreCloseout').value = ''; }
    if (document.querySelector('#clearance') != null) { document.querySelector('#clearance').value = ''; }
    if (document.querySelector('#supplier') != null) { document.querySelector('#supplier').value = ''; }
	/*if (document.querySelector('#itemNoSR') != null) { document.querySelector('#itemNoSR').value = ''; }
	if (document.querySelector('#itemBarcodeSR') != null) { document.querySelector('#itemBarcodeSR').value = ''; }
	if (document.querySelector('#cartonsReceivedSR') != null) { document.querySelector('#cartonsReceivedSR').value = ''; }
	if (document.querySelector('#quantityPerCartonSR') != null) { document.querySelector('#quantityPerCartonSR').value = ''; }*/
    if (document.querySelector('#customSkuSR') != null) { document.querySelector('#customSkuSR').value = ''; }
    if (document.querySelector('#itemQtySR') != null) { document.querySelector('#itemQtySR').value = ''; }
    if (document.querySelector('#cartonQtySR') != null) { document.querySelector('#cartonQtySR').value = ''; }
    if (document.querySelector('#dateReceivedSR') != null) { document.querySelector('#dateReceivedSR').value = ''; }
    //if (document.querySelector('#supplierSR') != null) { document.querySelector('#supplierSR').value = ''; }
}