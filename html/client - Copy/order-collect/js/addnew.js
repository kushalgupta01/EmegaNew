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

let currentOrderItems = [];

function addItemToOrder(item) {
    var currentItem = currentOrderItems.find(it => it.itemSKU == item.itemSKU);

    if (currentItem) {
        currentItem.itemQty = currentItem.itemQty + 1;
    } else {
        currentOrderItems.push(item);
    }
}

function updateItemToOrder(itemSKU, qty) {
    var currentItem = currentOrderItems.find(it => it.itemSKU == itemSKU);

    if (currentItem) {
        if (qty > 0) {
            currentItem.itemQty  = qty;
        } else {
            currentOrderItems = currentOrderItems.filter(it => it.itemSKU != itemSKU);
        }
    } 
}

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
                    html.push([
                        '<tr>',
                            '<td>' + value.sku + '</td>',
                            '<td>' + value.itemName + '</td>',
                            '<td><img src="' + value.image + '" width="150"/></td>',
                            '<td>' + value.price + '</td>',
                            '<td class="text-center">',
                            '<a style="color:black;" href="javascript:void(0)" class="addItem" data-item-sku="' + value.sku + '" data-item-no="' + value.itemNo + '" data-item-name="' + value.itemName + '" data-item-price="' + value.price + '"><i class="fa fa-plus-circle fa-2x" aria-hidden="true"></i></a>',
                            '<a class="modal-btn modal-shoppingcart" data-modal-action="open" data-sku="' + value.sku + '"  data-modal-target="modal-shoppingcart"><i class="fa fa-shopping-cart fa-2x" aria-hidden="true"></i></a>',
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

                $('body').on('click', '.modal-shoppingcart', async function() {
                    await showInventoryDetail();
                });

                $('body').on('click', '.addItem', function (e) {
                    e.preventDefault();
                    
                    var itemSKU = $(this).data('item-sku');
                    var itemNo = $(this).data('item-no');
                    var itemName = $(this).data('item-name');
                    var itemPrice = $(this).data('item-price');
                    var itemQty = 1;

                    var item = {
                        itemSKU: itemSKU,
                        itemNo: itemNo,
                        itemName: itemName,
                        itemPrice: itemPrice,
                        itemQty: itemQty
                    };

                    addItemToOrder(item);

                    page.notification.show("Success: Item added successfully");
                });



                $('body').on('click', '.updateOrderItems', function () {
                    let itemSKUs = [];
                    $('input[name^="itemSKU"]').each(function (index, item) { itemSKUs.push($(item).val()) });

                    let itemQty = [];
                    $('input[name^="itemQty"]').each(function (index, item) { itemQty.push($(item).val()) });

                    for (var i = 0; i < itemSKUs.length; i++) {
                        updateItemToOrder(itemSKUs[i], itemQty[i]);
                    }

                    var html = generateDetailStockHtml();
                    jQuery('.modal-container[data-modal="modal-shoppingcart"]').find('.modal-content').html(html);
                    
                    var $menu_tabs = $('.menu__tabs li a');
                    $menu_tabs.on('click', function (e) {
                        e.preventDefault();
                        $menu_tabs.removeClass('active');
                        $(this).addClass('active');

                        $('.menu__item').fadeOut(300);
                        $(this.hash).delay(300).fadeIn();
                    });

                });

                $('body').on('click', '.saveOrder', async function () {
                    await saveOrder();
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

async function saveOrder() {
    let send = true;
    let formData = new FormData();
    let email = $('#email').val();
    let firstname = $('#firstname').val();
    let lastname = $('#lastname').val();
    let phone = $('#phone').val();
    let address1 = $('#address1').val();
    let address2 = $('#address2').val();
    let suburg = $('#suburg').val();
    let state = $('#state').val();
    let postcode = $('#postcode').val();
    let country = $('#country').val();
    
    if (!currentOrderItems.length) {
        send = false;
        page.notification.show("Please select items");
    } else if (!email || !email || !firstname || !lastname || !phone || !address1 || !state || !postcode || !country) {
        send = false;
        page.notification.show("Please fill customer info");
    } else {

        let customer = {
            email: email,
            firstname: firstname,
            lastname: lastname,
            phone: phone,
            address1: address1,
            address2: address2,
            suburg: suburg,
            state: state,
            postcode: postcode,
            country: country, 
        };
        formData.append('customer', JSON.stringify(customer));
        formData.append('items', JSON.stringify(currentOrderItems));

        if (!send) {
            page.notification.show("Please complete the form.");
            return;
        } else {
            let response = await fetch(apiServer + 'clients/addorder', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
            let addItemData = await response.json();

            if (response.ok && addItemData.result == 'success') {
                page.notification.show("Order added successfully.");
                clearForm();
            }
            else {
                page.notification.show("Something went wrong. Please try again");
            }
        }
    }
}

async function showInventoryDetail() {
    var html = generateDetailStockHtml();
    jQuery('.modal-container[data-modal="modal-shoppingcart"]').find('.modal-content').html(html);
    jQuery('.modal-container[data-modal="modal-shoppingcart"]').show();

    var $menu_tabs = $('.menu__tabs li a');
    $menu_tabs.on('click', function (e) {
        e.preventDefault();
        $menu_tabs.removeClass('active');
        $(this).addClass('active');

        $('.menu__item').fadeOut(300);
        $(this.hash).delay(300).fadeIn();
    });
}

function generateDetailStockHtml() {
    let customerHtml = [
        '<div class="content-table">',
            '<table class="table-no-block">',
                '<tboby>',
                    '<tr>',
                        '<th>Email <span class="field-requried">*</span></th>',
                        '<td><input class="input-text" type="text" id="email"></td>',
                    '</tr>',
                    '<tr>',
                        '<th>Firstname <span class="field-requried">*</span></th>',
                        '<td><input class="input-text" type="text" id="firstname"></td>',
                    '</tr>',
                    '<tr>',
                        '<th>Lastname <span class="field-requried">*</span></th>',
                        '<td><input class="input-text" type="text" id="lastname"></td>',
                    '</tr>',
                    '<tr>',
                        '<th>Phone <span class="field-requried">*</span></th>',
                        '<td><input class="input-text" type="text" id="phone"></td>',
                    '</tr>',
                    '<tr>',
                        '<th>Address1 <span class="field-requried">*</span></th>',
                        '<td><input class="input-text" type="text" id="address1"></td>',
                    '</tr>',
                    '<tr>',
                        '<th>Address2</th>',
                        '<td><input class="input-text" type="text" id="address2"></td>',
                    '</tr>',
                    '<tr>',
                        '<th>Suburg</th>',
                        '<td><input class="input-text" type="text" id="suburg"></td>',
                    '</tr>',
                    '<tr>',
                        '<th>State <span class="field-requried">*</span></th>',
                        '<td><input class="input-text" type="text" id="state"></td>',
                    '</tr>',
                    '<tr>',
                        '<th>Postcode <span class="field-requried">*</span></th>',
                        '<td><input class="input-text" type="text" id="postcode"></td>',
                    '</tr>',
                    '<tr>',
                        '<th>Country <span class="field-requried">*</span></th>',
                        '<td><select id="country"><option value="AU">Australia</option></select></td>',
                    '</tr>',
                '</tboby>',
            '</table>',
        '</div>'
    ].join('');

    let itemHtml = [];
    let total = 0;

    for (var i = 0; i < currentOrderItems.length; i++) {
        var item = currentOrderItems[i];
        var subTotal = item.itemQty * item.itemPrice;
        itemHtml.push([
            '<tr>',
                '<td><input name="itemSKU[]" type="hidden" value="' + item.itemSKU + '"/>' + (i + 1) + '</td>',
                '<td>' + item.itemName + '</td>',
                '<td>$' + item.itemPrice + '</td>',
                '<td><input name="itemQty[]" type="number" min="0" size="2" value="' + item.itemQty + '"/></td>',
                '<td>$' + subTotal.toFixed(2) + '</td>',
            '</tr>'
        ].join(''));

        total = total + subTotal;
    }

    let html = [
        '<div class="menu-tab">',
            '<ul class="menu__tabs">',
                '<li><a class="active" href="#item-1"><i class="fa fa-shopping-cart"></i>Cart Info</a></li>',
                '<li><a href="#item-2"><i class="fa fa-user-circle"></i> Customer Info</a></li>',
            '</ul>',

            '<div class="menu__wrapper">',
                '<div id="item-1" class="menu__item item-active">',
                    '<div class="content-table">',
                        '<table class="table-no-block">',
                            '<thead>',
                                '<tr>',
                                    '<th>No</th>',
                                    '<th>Items</th>',
                                    '<th>Price</th>',
                                    '<th>Quantity</th>',
                                    '<th>Sub Total</th>',
                                '</tr>',
                            '</thead>',
                            '<tboby>',
                                itemHtml,
                                '<tr>',
                                    '<td colspan="4" class="text-right">Total</td>',
                                    '<td>$' + total.toFixed(2) + '</td>',
                                '</tr>',
                            '</tboby>',
                        '</table>',
                    '</div>',
                '</div>',

                '<div id="item-2" class="menu__item">',
                    customerHtml,
                '</div>',
                '<button class="action-btn updateOrderItems" type="button">Update Items</button> <button class="action-btn saveOrder" type="button">Save Order</button>',
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

// async function addItem() {
//     clearFeedback();
//     let send = true;
//     let formData = new FormData();

//     // gather information provided and add to formData
//     let itemNo = document.querySelector('#itemNo').value;


//     formData.append('itemNo', itemNo);

//     let itemName = document.querySelector('#itemName').value;

//     formData.append('itemName', itemName);

//     let sku = document.querySelector('#sku').value;

//     if (sku == '') {
//         send = false;
//         let skufeed = document.querySelector('#sku-feedback');
//         skufeed.textContent = "Please fill in item sku.";
//         skufeed.classList.remove('hide');
//     }

//     formData.append('sku', sku);
//     formData.append('customSku', sku);

//     let itemBarcode = document.querySelector('#itemBarcode').value;

//     formData.append('itemBarcode', itemBarcode);

//     let cartonBarcode = document.querySelector('#cartonBarcode').value;
//     let quantityPerCarton = document.querySelector('#quantityPerCarton').value;

//     formData.append('cartonBarcode', cartonBarcode);
//     formData.append('quantityPerCarton', quantityPerCarton);

//     let weight = document.querySelector('#weight').value;

//     formData.append('weight', weight);

//     let stockInHand = document.querySelector('#stockInHand').value;
//     if (stockInHand == '') {
//         send = false;
//         let stockInHandfeed = document.querySelector('#stockInHand-feedback');
//         stockInHandfeed.textContent = "Please fill in quantity.";
//         stockInHandfeed.classList.remove('hide');
//     }

//     let store = document.querySelector('#store').value;
//     formData.append('store', store);

//     formData.append('expiry', '0000-01-01');
//     formData.append('stockInHand', stockInHand);


//     formData.append('supplier', 'cg');

//     // add new information to the database
//     if (!send) {
//         page.notification.show("Please complete the form.");
//         return;
//     } else {
//         //clearForm();
//     }

//     let response = await fetch(apiServer + '/clients/addproduct', { method: 'post', headers: { 'DC-Access-Token': page.userToken }, body: formData });
//     let addProductData = await response.json();

//     console.log('addProductData', addProductData);

//     if (response.ok && addProductData.result == 'success') {
//         console.log('response', response);
//         page.notification.show("Item added successfully.");
//     }
//     else {
//         page.notification.show(addProductData.result);
//     }
// }

function clearForm() {
    currentOrderItems = [];
    
    if (document.querySelector('#email') != null) { document.querySelector('#email').value = ''; }
    if (document.querySelector('#firstname') != null) { document.querySelector('#firstname').value = ''; }
    if (document.querySelector('#lastname') != null) { document.querySelector('#lastname').value = ''; }
    if (document.querySelector('#phone') != null) { document.querySelector('#phone').value = ''; }
    if (document.querySelector('#address1') != null) { document.querySelector('#address1').value = ''; }
    if (document.querySelector('#address2') != null) { document.querySelector('#address2').value = ''; }
    if (document.querySelector('#suburg') != null) { document.querySelector('#suburg').value = ''; }
    if (document.querySelector('#state') != null) { document.querySelector('#state').value = ''; }
    if (document.querySelector('#postcode') != null) { document.querySelector('#postcode').value = ''; }
}