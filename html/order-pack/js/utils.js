// Utils

// Gets date for fetch Urls with range from now - DATE_SET_BACK
function getUrlDate(setback) {
    var today = new Date(),
        startDate = new Date(),
        dateUrl = "";
    
    startDate.setDate(startDate.getDate() - setback);
    dateUrl = "day=" + getDateValue(startDate) + "&endday=" +
        getDateValue(today);
    
    return dateUrl;
}

function getDateValue(date, time = false, timezone = false) {
    return date.getFullYear().toString() + 
        ('00'+(date.getMonth()+1)).slice(-2) +
        ('00'+date.getDate()).slice(-2) +
        (time ? '-'+('00'+date.getHours()).slice(-2) +
        ('00'+date.getMinutes()).slice(-2) +
        ('00'+date.getSeconds()).slice(-2) : '') +
        (timezone ? date.getTimezoneOffset() : '');
}

function removeNotification() {
    document.querySelector('#notification .close').click();
}

// Parses timestamp string and returns time object {hours, minutes, seconds}
function extractTimestampTime(timestamp) {
    var time = { hour: 0, minute: 0, second: 0 };
    for (let i = 0; i < timestamp.length; i++) {
        if (timestamp.charAt(i) && timestamp.charAt(i + 2) == ":" &&
            timestamp.charAt(i + 5) == ":") {
            time.hour = parseInt(timestamp.substring(i, i + 2));
            time.minute = parseInt(timestamp.substring(i + 3, i + 5));
            time.second = parseInt(timestamp.substring(i + 6, i + 8));
            return time;
        }
    }
    return NULL;
}

// returns local time (00:00:00) relative to UTC
// return 14:00:00 UTC; 00:00:00 AEST
function getRelativeUTC() {
    var date = new Date();
    var dateUTC = date.toUTCString();
    var dateTimeTemp, dateUTCTimeTemp, dbHour, timeString;

    dateTimeTemp = extractTimestampTime(date.toString());
    dateUTCTimeTemp = extractTimestampTime(dateUTC);
    dbHour = dateTimeTemp.hour - dateUTCTimeTemp.hour;
    if (dbHour > 0) {
        timeString = 24 - dbHour + ":00:00";
    } else {
        if (Math.abs(dbHour) < 10) {
            timeString = "0" + Math.abs(dbHour) + ":00:00";
        } else {
            timeString = Math.abs(dbHour) + ":00:00";
        }
    }
    return timeString;
}

// Login User and returns bool success
async function login(userDetails) {
    var username = userDetails.username.toLowerCase();
    var password = userDetails.password;
    var success = false;

    if (username) {
        // Clear old username and token
        localStorage.removeItem('username');
        localStorage.removeItem('usertoken');

        let lastLogin = new Date(localStorage.getItem('lastLogin'));
        let currentLogin = new Date();
        /*console.log(lastLogin);
        console.log(currentLogin);*/
        /*if (currentLogin.getTime() - lastLogin.getTime() > 18000000) {
            localStorage.setItem('lastLogin', currentLogin);
            return false;
        }*/
        
        try {
            let formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            let response = await fetch(apiUrls.loginUrl,
                    {method: 'post', body: formData});
            let data = await response.json();
    
            if (!response.ok) {
                if (response.status == 404) {
                    notification.show('The username you have entered does' +
                        ' not exist.');
                } else {
                    notification.show('Error: ' + data.result);
                }
            }
            if (data.result == 'success') {
                localStorage.setItem('username', data.user.username);
                localStorage.setItem('usertoken', data.user.token);
                success = true;
            } else {
                notification.show(data.result);
            }
        } catch (e) {
            notification.show('Error: Could not connect to the server.');
        }
    } else {
        notification.show('Please enter your username first.');
    }

    return success;
}

// Gets the varation for the product from title (if any)
function getVariation(itemTitle) {
    try {
        var reVariation = /\[(.*?)\]$/;
        var itemVariation = itemTitle.match(reVariation);
        var variations;
    
        if (itemVariation) {
            // Variations string is stored in index 1
            variations = itemVariation[1].split(',');
        }
        if (variations) {
            return variations;
        } else {
            return null;
        }
    } catch (e) {
        console.log(e);
        return null;
    }
}

// Compares variations to see if they match
function checkSameVariation(variations1, variations2) {
    if (variations1 && variations2) { // Both have variations
        var check = true; // true is same

        if (variations1.length == variations2.length) {
            for (let i = 0; i < variations1.length; i++) {
                if (variations1[i] != variations2[i]) {
                    check = false;
                }
            }
        }
        return check;
    // Both don't have variations
    } else if (!(variations1 && variations2)) {
        return true;
    // One or the other don't have a variation
    } else if (!variations1 || !variations2) {
        return false;
    }
}

// Checks if a proper item barcode exists
function checkItemBarcode(barcode) {
    // Item barcodes don't have characters
    //if ((!barcode || barcode == "") && (!indivBarcode || indivBarcode == "")) {
    if (!barcode || barcode == "") {
        return false;
    } else {
        return true;
    }
}

// Check if all items are scanned & allow to move onto next order
function checkDone() {
    var check = [], // Array of true/false for every item listed
        nOItems = 0, // Number of items listed
        count = 0; // Number of items that are finished scanning
    var recordEntries =
        document.querySelectorAll('#record-container .record-entry');
    for (var recordEntry of recordEntries) {
        var recordItems =
            recordEntry.querySelectorAll('.record-items tbody tr');
        for (var recordItem of recordItems) {
            check.push(recordItem.dataset.scanDone);
            nOItems++;
        }
    }

    // Count how many items are finished scanning
    for (var i = 0; i < check.length; i++) {
        if (check[i] == 'true') {
            count++;
        }
    }

    // If number of items counted equal the amount of listed items then all
    // items scanned
    if (nOItems == count) {
        return true; // Return 1 if all items scanned
    } else {
        return false; // Return 0 if not all items scanned
    }
}

// If parameter check is equal to 1, it enables the next and end button
function enableNext(check) {
    if (check) {
        // Enable buttons and label scan
        var buttons = document.querySelectorAll(
            '#record-container .record-entry .record-actions');
        buttons[0].querySelectorAll('.next')[0].disabled = false;
    }
}

export { 
    login, 
    getRelativeUTC, 
    getUrlDate, 
    getDateValue, 
    removeNotification, 
    extractTimestampTime,
    getVariation,
    checkSameVariation,
    checkItemBarcode,
    checkDone,
    enableNext
};