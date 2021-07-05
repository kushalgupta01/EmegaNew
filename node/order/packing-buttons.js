// Buttons

import {removeNotification} from './utils.js';
import {loaddata, getRecordData} from './load-data.js';

// Listener function for buttons
document.addEventListener('DOMContentLoaded', function () {
    // "Next Order" button
    $('#record-container').on('click', '.next', function () {
        nextOrder(getRecordData());
    });

    // "Override" button
    $('#record-container').on('click', '.override', function () {
        overrideOrder(getRecordData());
    });

    // Do Order later button
    $('#record-container').on('click', '.later', function () {
        doOrderLater(getRecordData());
    });

    // Logout button
    $('#header').on('click', '.logout', function () {
        logout(getRecordData());
    });
});

async function changeStatus(recordData, status) {
    try {
        removeNotification();
        let result = await changeStatusHttp(recordData, status);
        if (result == 'success') {
            return result;
            // loaddata(packername, pageType);
        } else if (result == 'timeout') {
            alert('You have been timed out due to inactivity. ' +
                'You will now be redirected to the main page.');
            window.location.href = 'index.html';
        } else {
            throw 'Failed to update status.';
        }
    } catch (error) {
        console.log(error);
    }
}

async function changeStatusHttp(recordData, status) {
    let response = await fetch(getChangeStatusUrl(recordData,
        status), {method: 'post',
        headers: {'DC-Access-Token': window.userDetails.usertoken}});
    let data = await response.json();

    return data.result;
}

// Changes status of order to the packed status and executes loaddata()
// again to move to next order
async function nextOrder(recordData) {
    try {
        document.getElementsByClassName('.next').disabled = true;
        if (await changeStatus(recordData, ORDER_STATUS.PACKED)
            == 'success') {
            loaddata(packername, pageType);
        } else {
            document.getElementsByClassName('.next').disabled = false;
        }
    } catch (error) {
        console.log(error);
    }
}

// Changes status of order to the override status and executes loaddata()
// again to move to next order
async function overrideOrder(recordData) {
    try {
        document.getElementsByClassName('.override').disabled = true;
        if (await changeStatus(recordData, ORDER_STATUS.OVERRIDE)
            == 'success') {
            loaddata(packername, pageType);
        } else {
            document.getElementsByClassName('.override').disabled = false;
        }
    } catch (error) {
        console.log(error);
    }
}

// Changes status of order to the do order later status and executes loaddata()
// again to move to next order
async function doOrderLater(recordData) {
    try {
        document.getElementsByClassName('.later').disabled = true;
        if (await changeStatus(recordData, ORDER_STATUS.DO_ORDER_LATER)
            == 'success') {
            loaddata(packername, pageType);
        } else {
            document.getElementsByClassName('.later').disabled = false;
        };
    } catch (error) {
        console.log(error);
    }
}

// Changes status of order to the ready to pack status and redirects to index
async function logout(recordData) {
    try {
        removeNotification();
        if (getRecordData() == undefined) {
            window.location.href = 'index.html';
        } else {
            if (await changeStatus(recordData, ORDER_STATUS.READY_TO_PACK)
                == 'success') {
                window.location.href = 'index.html'
            }
        }
    } catch (error) {
        console.log(error);
    }
}

// Returns the URL for changing a status in the database
function getChangeStatusUrl(recordData, status) {
    return apiUrls.changeStatusUrl + '?recordData=' + recordData +
        '&status=' + status;
}

export {
    nextOrder,
    overrideOrder,
    doOrderLater,
    logout
}