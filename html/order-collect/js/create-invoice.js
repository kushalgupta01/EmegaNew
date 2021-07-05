
import {getFont, round2} from '/common/tools.js';

// Create invoice PDF
async function createInvoice(record, sender, save = false, showABN = false) {
	// Create invoice
	var doc = new PDFDocument({autoFirstPage: false, bufferPages: true});
	var docStream = doc.pipe(blobStream());

	// Load fonts
	doc.registerFont('Arial-Unicode', await getFont('/common/fonts/Arial-Unicode-Regular.ttf'));
	doc.registerFont('Arial-Unicode-Bold', await getFont('/common/fonts/Arial-Unicode-Bold.ttf'));

	doc.addPage({margin: 40});


	// Sender
	doc.fontSize(17).font('Arial-Unicode-Bold');
	doc.text('Tax Invoice', {align: 'right'}).moveUp();

	doc.fontSize(10).font('Arial-Unicode');
	doc.text(sender.name).moveDown(0.2);
	doc.text(sender.address1).moveDown(0.2);
	if (sender.address2) doc.text(sender.address2).moveDown(0.2);
	doc.text(sender.city+', '+sender.state+' '+sender.postcode).moveDown(0.2);
	doc.text(sender.country).moveDown(0.2);
	if (showABN) doc.text(sender.abn);
	doc.moveDown(1.5);

	doc.lineWidth(0.5).polygon([doc.x, doc.y], [doc.page.width - doc.page.margins.left, doc.y]).polygon([doc.x, doc.y + 2], [doc.page.width - doc.page.margins.left, doc.y + 2]).stroke();

	//------------------------------------------------------------------------------------------------------------------------

	{
		// Invoice number, date
		doc.moveDown(1.8);
		let startX = doc.x, startY = doc.y;
		doc.font('Arial-Unicode-Bold');
		doc.text('Invoice no.', startX + 350, doc.y, {align: 'right', width: 100});
		doc.text('Date', startX + 350, doc.y, {align: 'right', width: 100});
		doc.moveUp(2).font('Arial-Unicode');
		doc.x = startX;
		doc.y = startY;
		doc.text(record.DatabaseID.toString(), {indent: startX + 430});
		doc.text(record.PaidDate, {indent: startX + 430});
		doc.y = startY;

		// Destination
		doc.font('Arial-Unicode-Bold');
		doc.text('Bill To');

		doc.moveUp().font('Arial-Unicode');
		doc.text(record.BuyerFullName, {indent: 50}).moveDown(0.2);
		if (record.BuyerAddress1) doc.text(record.BuyerAddress1, {indent: 50}).moveDown(0.2);
		if (record.BuyerAddress2) doc.text(record.BuyerAddress2, {indent: 50}).moveDown(0.2);
		doc.text(record.BuyerCity+', '+record.BuyerState+' '+record.BuyerPostCode, {indent: 50}).moveDown(0.2);
		doc.text(countryCodes[record.BuyerCountry] || record.BuyerCountry, {indent: 50});
		doc.moveDown(2);
	}

	//------------------------------------------------------------------------------------------------------------------------

	{
		// Items table
		let startX = doc.x, startY = doc.y;
		let cols = [], rows = [];

		// Heading
		cols = [
			{text: 'Product', indent: 0, width: 375},
			{text: 'Quantity', indent: 380, width: 45},
			{text: 'Unit Price', indent: 425, width: 60},
			{text: 'Subtotal', indent: 485, width: 60},
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
		for (let item of record.Items) {
			rows.push([
				item.ItemTitle.trim(),
				item.Quantity,
				round2(item.SalePrice),
				round2(item.Quantity * item.SalePrice)
			]);
			totalPrice += item.Quantity * item.SalePrice;
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
			['Subtotal (incl. GST):', round2(totalPrice)],
			['Postage (incl. GST):', round2(record.Postage)],
			//['Discounts/charges:', round2(record.discounts)],
			['Total (incl. GST):', round2(record.TotalPrice)],
		];

		doc.x = startX;
		doc.moveDown(0.5);
		for (let entry of summaryData) {
			doc.text(entry[0], {align: 'right', indent: 0, width: 460}).moveUp().text(entry[1], {indent: 485, lineGap: 2});
		}
	}

	//------------------------------------------------------------------------------------------------------------------------

	// Page numbers
	let pageRange = doc.bufferedPageRange();
	doc.fontSize(9);
	for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
		doc.switchToPage(i);
		doc.text('Page '+(i + 1)+' of '+pageRange.count, doc.x, doc.page.height - doc.page.margins.top - doc.page.margins.bottom + 20);
	}

	return new Promise((resolve, reject) => {
		docStream.on('finish', () => {
			if (save) {
				saveAs(docStream.toBlob('application/pdf'), 'invoice-'+record.DatabaseID.toString()+'.pdf', true);
				//window.open(docStream.toBlobURL('application/pdf'));
				resolve(true);
			}
			else {
				resolve(docStream.toBlob('application/pdf'), 'application/pdf');
			}
		});
		doc.end();
	});
}

export {createInvoice};
