// Show Done

import {clearHtml} from './show-order.js';

// Number of images * 10 for RNG
var randomLength = DONE_SCREEN_IMAGES.length * 10;

function showDone() {
    var recordContainer = document.querySelector('#record-container');
    var recordTemplate =
            document.querySelector('#record-entry-template').content;
    var tableBody = recordTemplate.querySelector('.record-items tbody');
    var image = getRandomImage();
    image.className = 'done-img';
    var header = getHeader();

    clearHtml(recordContainer, tableBody);

    recordContainer.appendChild(header);
    recordContainer.appendChild(image);
}

function getRandomImage() {
    var image = new Image();
    var randomNumber = Math.floor((Math.random() * randomLength) + 1);
    var index = 0;
    var count = 0;

    do {
        index++;
        count++;
        if (index >= DONE_SCREEN_IMAGES.length) {
            index = 0;
        }
    } while (count != randomNumber);

    image.src = DONE_SCREEN_IMAGES[index];
    image.className = 'done-image';

    return image;
}

function getHeader() {
    var h = document.createElement('H1');
    var h1Text = document.createTextNode('No orders left! '
        + 'Logout to return to menu.');

    h.align = 'center';
    h.appendChild(h1Text);

    return h;
}

// function adjustImageSize(image) {
//     var diffScale = IMAGE_SET_HEIGHT / image.naturalHeight;
//     console.log(image.naturalHeight);
//     console.log(image.naturalWidth);
//     console.log(IMAGE_SET_HEIGHT);
//     console.log(image.naturalWidth * diffScale);
//     image.height = IMAGE_SET_HEIGHT;
//     image.width = image.naturalWidth * diffScale;
//     console.log(image);

//     return image;
// }

export {
    showDone
}