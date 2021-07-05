
import {getFont, round2} from '/common/tools.js';

// Create PDF of labels for a given list of orders
async function createLabelPDF(orderList) {
	var doc = new PDFDocument({autoFirstPage: false, bufferPages: true});
	var docStream = doc.pipe(blobStream());
	var today = new Date();
	var pageNum = 1;

	if (!orderList.length) {
		return false;
	}

	// Label barcode
	var canvas = document.createElement('canvas');
	canvas.id = 'label-barcode-canvas';
	document.body.appendChild(canvas);


	// Load fonts
	doc.registerFont('Arial-Unicode', await getFont('/common/fonts/Arial-Unicode-Regular.ttf'));
	doc.registerFont('Arial-Unicode-Bold', await getFont('/common/fonts/Arial-Unicode-Bold.ttf'));

	// Create PDF pages
	for (let rowData of orderList) {
		doc.addPage({margins: {top: 1, bottom: 20, left: 30, right: 30}});

		// Today's date and the page number
		doc.fontSize(8);
		doc.moveDown().text(today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear(), {align: 'left', indent: 460}).moveUp();
		doc.text('Page ' + (pageNum++), {align: 'right'});

		//------------------------------------------------------------------------------------------------------------------------

		// Big "From" details
		doc.moveDown(3.5);
		doc.moveUp().fontSize(9).font('Arial-Unicode-Bold');
		doc.text('From:', {indent: 25});
		doc.fontSize(13);
		doc.text(rowData.SenderDetails.name, {indent: 25});
		doc.font('Arial-Unicode');
		doc.text(rowData.SenderDetails.address1, {indent: 25});
		doc.text(rowData.SenderDetails.address2, {indent: 25});
		doc.text(countryCodes[rowData.SenderDetails.country] || rowData.SenderDetails.country, {indent: 25});

		//------------------------------------------------------------------------------------------------------------------------

		// Small 'from' details	
		doc.moveDown(0);
		doc.moveUp(4.5).fontSize(9).font('Arial-Unicode-Bold');
		doc.text('From:', {indent: 280});
		doc.fontSize(13);
		doc.text(rowData.SenderDetails.name, {indent: 280});
		doc.font('Arial-Unicode');
		doc.text(rowData.SenderDetails.address1, {indent: 280});
		doc.text(rowData.SenderDetails.address2, {indent: 280});
		doc.text(countryCodes[rowData.SenderDetails.country] || rowData.SenderDetails.country, {indent: 280});

		//------------------------------------------------------------------------------------------------------------------------
		// "Ship to" details
		doc.moveDown(10);
		doc.moveUp().fontSize(9).font('Arial-Unicode-Bold');
		doc.text('Ship to:', {indent: 280});
		doc.fontSize(11);
		doc.text(rowData.BuyerFullName, {indent: 280});
		doc.font('Arial-Unicode');
		doc.text(rowData.BuyerAddress1, {indent: 280});
		if (rowData.BuyerAddress2) doc.text(rowData.BuyerAddress2, {indent: 280});
		doc.text(rowData.BuyerCity+' '+rowData.BuyerState+' '+rowData.BuyerPostCode, {indent: 280});
		doc.text(countryCodes[rowData.BuyerCountry] || rowData.BuyerCountry, {indent: 280});
		//doc.fontSize(8).text('Order #: '+rowData.SalesRecordID, {indent: 280});

		//------------------------------------------------------------------------------------------------------------------------
	
	

		// Small "Post to" details
		doc.moveUp(9);
		doc.moveDown(3).fontSize(9).font('Arial-Unicode-Bold');
		doc.text('Ship to:', {indent: 25});
		doc.fontSize(11);
		doc.text(rowData.BuyerFullName, {indent: 25});
		doc.font('Arial-Unicode');
		doc.text(rowData.BuyerAddress1, {indent: 25});
		if (rowData.BuyerAddress2) doc.text(rowData.BuyerAddress2, {indent: 25});
		doc.text(rowData.BuyerCity+' '+rowData.BuyerState+' '+rowData.BuyerPostCode, {indent: 25});
		doc.text(countryCodes[rowData.BuyerCountry] || rowData.BuyerCountry, {indent: 25});	


		//------------------------------------------------------------------------------------------------------------------------

		// Barcode
		doc.moveDown(6);
		//JsBarcode('#label-barcode-canvas', rowData.SenderDetails.storeID+'-'+rowData.DatabaseID, {format: 'CODE128', height: 50, width: 1, displayValue: false});
		JsBarcode('#label-barcode-canvas', rowData.SalesRecordID, {format: 'CODE128', height: 50, width: 1, displayValue: false});
		doc.image(canvas.toDataURL('image/jpeg'), {scale: 0.75});

		//------------------------------------------------------------------------------------------------------------------------

		{
			// Order date and order ID
			doc.moveUp(3).fontSize(10);
			let box = {dateX: 380, idX: 445, height: 36};
			let startY = doc.y - 2;
			doc.font('Arial-Unicode-Bold').text('Date:', {indent: box.dateX}).moveUp().text('Order #:', {indent: box.idX, lineGap: 5});
			doc.font('Arial-Unicode').text(rowData.PaidDate, {indent: box.dateX}).moveUp().text(rowData.SalesRecordID.toString(), {indent: box.idX});
			doc.lineWidth(1).opacity(0.15).rect(box.dateX + 25, startY, 160, box.height).polygon([box.idX + 25, startY], [box.idX + 25, startY + box.height]).stroke().opacity(1);
			doc.moveDown(2);
		}

		//------------------------------------------------------------------------------------------------------------------------

		{
			// Items table
			let startX = doc.x, startY = doc.y;
			let cols = [], rows = [];

			// Heading
			cols = [
				{text: 'Quantity', indent: 0, width: 45},
				{text: 'Product Name', indent: 50, width: 415},
				{text: 'Price', indent: 465, width: 40},
				{text: 'Subtotal', indent: 505, width: 40},
			];

			doc.font('Arial-Unicode-Bold');
			for (let i = 0; i < cols.length; i++) {
				let col = cols[i];
				let options = {indent: col.indent};
				if (i > 0) doc.moveUp();
				if (i == cols.length - 1) options.lineGap = 4;
				doc.text(col.text, options);
			}

			// Item rows
			let totalPrice = 0;
			for (let i = 0; i < rowData.Items.length; i++) {
				rows.push([
					rowData.Items[i].Quantity,
					rowData.Items[i].ItemTitle.trim(),
					round2(rowData.Items[i].SalePrice),
					round2(rowData.Items[i].Quantity * rowData.Items[i].SalePrice)
				]);
				totalPrice += rowData.Items[i].Quantity * rowData.Items[i].SalePrice;
			}

			doc.font('Arial-Unicode').lineWidth(1);
			for (let ri = 0; ri < rows.length; ri++) {
				for (let i = 0; i < rows[ri].length; i++) {
					let field = rows[ri][i];
					let options = {width: cols[i].width};
					let posX = startX;
					if (i == 0) posX += 4;
					if (i > 0) doc.moveUp();
					if (i == rows[ri].length - 1) options.lineGap = 7;
					doc.text(field, posX + cols[i].indent, doc.y, options);
				}
				if (ri != rows.length - 1) doc.opacity(0.15).polygon([startX, doc.y - 3], [doc.page.width - startX, doc.y - 3]).stroke().opacity(1);
			}

			// Borders
			let border = {top: startY + 14};
			doc.lineWidth(1).opacity(0.15)
			doc.rect(startX, border.top, doc.page.width - doc.page.margins.left - doc.page.margins.right, doc.y - startY - 17);
			for (let i = 1; i < cols.length; i++) {
				doc.polygon([startX + cols[i].indent - 4, border.top], [startX + cols[i].indent - 4, doc.y - 2.5]);
			}
			doc.stroke().opacity(1);

			// Postage and total price
			let summaryData = [
				//['Subtotal:', round2(totalPrice)],
				['Postage & Handling ('+ rowData.PostService +'):', round2(rowData.Postage)],
				['Total:', round2(totalPrice + parseFloat(rowData.Postage))],
			];

			doc.x = startX;
			doc.moveDown(0.5);
			for (let entry of summaryData) {
				doc.text(entry[0], {align: 'right', indent: 0, width: 460}).moveUp().text(entry[1], {indent: 505, lineGap: 5});
			}
		}
	}

	document.body.removeChild(canvas);

	return new Promise((resolve, reject) => {
		docStream.on('finish', () => resolve({doc: doc, docStream: docStream}));
		doc.end();
	});
}

export {createLabelPDF}
