
import {createLabelPDF} from './create-label-pdf.js';
import {getRecordsOfType} from './orders.js';
import {getDateValue, getFont, round2} from '/common/tools.js';

// Create PDF for labels
async function createPDF(store, type, removeCombined = false, reverse = false) {
	var recordList = getRecordsOfType(store, type, true, true);
	var today = new Date();

	if (!recordList.length) {
		return false;
	}

	if (removeCombined) {
		// For connected records only keep the first one of them
		let newRecordList = [];
		let connectedRecordsDone = [];

		for (let num = 0; num < recordList.length; num++) {
			if (recordList[num] === undefined) continue;
			let store = recordList[num][0], recordNum = recordList[num][1];
			let connectedRecords = saleRecords[store].connected[recordNum];

			// Skip connected records that are already done
			let skipRecord = false;
			for (let co_i = 0; co_i < connectedRecordsDone.length; co_i++) {
				if (connectedRecordsDone[co_i][0] == store && connectedRecordsDone[co_i][1] == recordNum) {
					skipRecord = true;
					break;
				}
			}
			if (skipRecord) continue;

			// Add any connected records to the done list
			if (connectedRecords.length > 1) {
				Array.prototype.push.apply(connectedRecordsDone, connectedRecords);
			}

			newRecordList.push(recordList[num]);
		}

		recordList = newRecordList;
	}

	if (reverse) recordList.reverse();

	var orderList = [];
	for (let i = 0; i < recordList.length; i++) {
		let store = recordList[i][0], recordNum = recordList[i][1];
		let order = JSON.parse(JSON.stringify(saleRecords[store].records[recordNum]));
		order.SenderDetails = Object.assign(Object.assign({}, storeAddress), {
			name: stores[store].name,
			storeID: store
		});
		orderList.push(order);
	}

	var labelPDF = await createLabelPDF(orderList);

	// Order type filename
	var orderTypeFilename = null;
	for (let orderTypeName in ORDER_TYPE_DATASET) {
		if (ORDER_TYPE_DATASET[orderTypeName] == type) {
			orderTypeFilename = orderTypeName;
			break;
		}
	}

	saveAs(labelPDF.docStream.toBlob('application/pdf'), orderTypeFilename+'-'+getDateValue(today)+'.pdf', true);
	//window.open(labelPDF.docStream.toBlobURL('application/pdf'));

	return true;
}

// Create PDF with multiple labels per page
async function createPDFMultiple(type, options = {}) {
	var doc = new PDFDocument({autoFirstPage: false, bufferPages: true});
	var docStream = doc.pipe(blobStream());
	var recordList = getRecordsOfType("all", type, true, true);
	var today = new Date();
	var pageNum = 1;

	options = Object.assign({
		labelsPerPage: 8,
		removeCombined: false,
		reverse: false
	}, options);


	if (!recordList.length) {
		return false;
	}

	if (options.removeCombined) {
		// For connected records only keep the first one of them
		let newRecordList = [];
		let connectedRecordsDone = [];

		for (let num = 0; num < recordList.length; num++) {
			if (recordList[num] === undefined) continue;
			let store = recordList[num][0], recordNum = recordList[num][1];
			let connectedRecords = saleRecords[store].connected[recordNum];

			// Skip connected records that are already done
			let skipRecord = false;
			for (let co_i = 0; co_i < connectedRecordsDone.length; co_i++) {
				if (connectedRecordsDone[co_i][0] == store && connectedRecordsDone[co_i][1] == recordNum) {
					skipRecord = true;
					break;
				}
			}
			if (skipRecord) continue;

			// Add any connected records to the done list
			if (connectedRecords.length > 1) {
				Array.prototype.push.apply(connectedRecordsDone, connectedRecords);
			}

			newRecordList.push(recordList[num]);
		}

		recordList = newRecordList;
	}

	if (options.reverse) recordList.reverse();


	// Load fonts
	doc.registerFont('Arial-Unicode', await getFont('/common/fonts/Arial-Unicode-Regular.ttf'));
	doc.registerFont('Arial-Unicode-Bold', await getFont('/common/fonts/Arial-Unicode-Bold.ttf'));

	// Create PDF with multiple labels per page
	for (let rl_i = 0; rl_i < recordList.length; rl_i++) {
		let store = recordList[rl_i][0], recordNum = recordList[rl_i][1];
		let rowData = saleRecords[store].records[recordNum];

		let pageRow = rl_i % options.labelsPerPage;
		if (pageRow == 0) doc.addPage({margin: 20});

		let margins = [0,  300]; // Left and right sides

		// Today's date and the page number
		if (pageRow == 0) {
			doc.fontSize(8);
			doc.text(today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear(), {align: 'left'}).moveUp();
			doc.text('Page ' + (pageNum++), {align: 'right'}).moveDown();
		}

		//------------------------------------------------------------------------------------------------------------------------

		for (let mi = 0; mi < margins.length; mi++) {
			let marginStart = margins[mi];
			doc.fontSize(11).font('Arial-Unicode-Bold');
			doc.text(rowData.BuyerFullName, {indent: marginStart});
			doc.font('Arial-Unicode');
			doc.text(rowData.BuyerAddress1, {indent: marginStart});
			if (rowData.BuyerAddress2) {
				doc.text(rowData.BuyerAddress2, {indent: marginStart});
			}
			doc.text(rowData.BuyerCity+' '+rowData.BuyerState+' '+rowData.BuyerPostCode, {indent: marginStart});
			doc.text(countryCodes[rowData.BuyerCountry] || rowData.BuyerCountry, {indent: marginStart});

			// Order number
			doc.fontSize(8).text('Order #: ' + (rowData.SalesRecordID ? stores[store].recID + rowData.SalesRecordID : store+'-'+rowData.DatabaseID), {indent: marginStart});
			if (mi != margins.length - 1) {
				doc.moveUp(rowData.BuyerAddress2 ? 7.5 : 6.5);
			}
			else {
				doc.moveDown(2);
			}
		}
	}

	// Order type filename
	var orderTypeFilename = null;
	for (let orderTypeName in ORDER_TYPE_DATASET) {
		if (ORDER_TYPE_DATASET[orderTypeName] == type) {
			orderTypeFilename = orderTypeName;
			break;
		}
	}

	docStream.on('finish', () => {
		saveAs(docStream.toBlob('application/pdf'), orderTypeFilename+'-'+getDateValue(today)+'.pdf', true);
		//window.open(docStream.toBlobURL('application/pdf'));
	});
	doc.end();

	return true;
}


// Create PDF with multiple store labels per page
async function createPDFMultipleStore(options = {}) {
	var doc = new PDFDocument({autoFirstPage: false, layout: 'A4', bufferPages: true});
	var docStream = doc.pipe(blobStream());
	var recordList = [];

	options = Object.assign({
		labelsPerPage: 7,
	}, options);


	// Create labels addressed to each store
	let storeDetails = {
		BuyerAddress1: storeAddress.address1,
		BuyerCity: storeAddress.city,
		BuyerState: storeAddress.state,
		BuyerPostCode: storeAddress.postcode,
		BuyerCountry: storeAddress.country,
	}

	// Prepare label data for each store
	for (let store in stores) {
		//storeDetails.BuyerFullName = stores[store].name;
		//let storeDetailsCopy = Object.assign({}, storeDetails);
		for (let i = 0; i < options.labelsPerPage; i++) {
			recordList.push([stores[store].name, storeDetails]);
		}
	}


	// Load fonts
	doc.registerFont('Arial-Unicode', await getFont('/common/fonts/Arial-Unicode-Regular.ttf'));
	doc.registerFont('Arial-Unicode-Bold', await getFont('/common/fonts/Arial-Unicode-Bold.ttf'));

	// Create PDF with multiple labels per page
	for (let rl_i = 0; rl_i < recordList.length; rl_i++) {
		let store = recordList[rl_i][0];
		let rowData = recordList[rl_i][1];

		let pageRow = rl_i % options.labelsPerPage;
		if (pageRow == 0) doc.addPage({margin: 20});

		let margins = [0, 145, 290, 435];

		//------------------------------------------------------------------------------------------------------------------------

		// 'From' details
		for (let mi = 0; mi < margins.length; mi++) {
			let marginStart = margins[mi];
			doc.fontSize(9).font('Arial-Unicode-Bold');
			doc.text('From:', {indent: marginStart});
			doc.fontSize(11);
			doc.text(store, {indent: marginStart});
			doc.font('Arial-Unicode');
			doc.text(rowData.BuyerAddress1, {indent: marginStart});
			if (rowData.BuyerAddress2) {
				doc.text(rowData.BuyerAddress2, {indent: marginStart});
			}
			doc.text(rowData.BuyerCity+' '+rowData.BuyerState+' '+rowData.BuyerPostCode, {indent: marginStart});
			doc.text(countryCodes[rowData.BuyerCountry] || rowData.BuyerCountry, {indent: marginStart});

			if (mi != margins.length - 1) {
				doc.moveUp(4.8);
			}
			else {
				doc.moveDown(1);
			}
		}
	}

	docStream.on('finish', () => {
		//saveAs(docStream.toBlob('application/pdf'), 'store-labels.pdf', true);
		window.open(docStream.toBlobURL('application/pdf'));
	});
	doc.end();

	return true;
}

export {createPDF, createPDFMultiple, createPDFMultipleStore};
