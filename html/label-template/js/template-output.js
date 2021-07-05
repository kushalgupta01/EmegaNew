// Discount Chemist
// Order System

import {getDateValue} from '/common/tools.js';

// Create FastTrack eParcel template
function createTemplateEparcels(orderRows) {
	var workbook = XLSX.utils.book_new();
	var worksheet = XLSX.utils.aoa_to_sheet(orderRows);
	XLSX.utils.book_append_sheet(workbook, worksheet, 'eparcel_template');
	XLSX.writeFile(workbook, 'eparcel-list-'+getDateValue(new Date())+'.xlsx');
}

function createTemplateEparcelsCSV(orderRows) {
	let newOrderRows = [];
	for (let i=0; i<orderRows.length; i++) {
		let orderRow = orderRows[i];
		if (i==1) newOrderRows.push([]);
		//let newOrderRow = orderRow.slice(1,23).concat([orderRow[0]]).concat(orderRow.slice(23,28));
		let newOrderRow = orderRow.slice(1,62).concat([orderRow[0]]).concat(orderRow.slice(62));
		newOrderRows.push(newOrderRow);
	}
	var worksheet = XLSX.utils.aoa_to_sheet(newOrderRows);
    var csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    
    var hiddenElement = document.createElement('a');
	hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvOutput);
	hiddenElement.target = '_blank';
	hiddenElement.download = 'eparcel-list-'+getDateValue(new Date())+'.csv';
	hiddenElement.click();
}


function createTemplateInternationalEparcelsCSV(orderRows) {
	let newOrderRows = [];
	for (let i=0; i<orderRows.length; i++) {
		let orderRow = orderRows[i];
		if (i==1) newOrderRows.push([]);
	
		newOrderRows.push(orderRow);
	}
	var worksheet = XLSX.utils.aoa_to_sheet(newOrderRows);
    var csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    
    var hiddenElement = document.createElement('a');
	hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvOutput);
	hiddenElement.target = '_blank';
	hiddenElement.download = 'eparcel-international-'+getDateValue(new Date())+'.csv';
	hiddenElement.click();
}

// Create Fastway Fast Label template
function createTemplateFastway(orderRows) {
	var content = '<orders>\n';

	for (let order of orderRows) {
		content += `<order>
		<companyName>`+formatStringXml(order[3])+`</companyName>
		<address1>`+formatStringXml(order[5])+`</address1>
		<address2>`+formatStringXml(order[6])+`</address2>
		<suburb>`+formatStringXml(order[7])+`</suburb>
		<postcode>`+order[9]+`</postcode>
		<emailAddress>`+order[10]+`</emailAddress>
		<phone>`+order[11]+`</phone>
		<specialInstruction1>`+formatStringXml(order[13])+`</specialInstruction1>
		<items>
			<item>
				<reference>`+formatStringXml(order[17])+`</reference>
				<packaging>`+order[18]+`</packaging>
				<weight>`+order[19]+`</weight>
			</item>
		</items>
		</order>\n`;
	}

	content += '</orders>\n';

	// Save
	saveAs(new File([content], 'fastway-output-'+getDateValue(new Date())+'.xml', {type: 'application/xml;charset=utf-8'}));
}

// Create Fastway Fast Label template
function createTemplateDelivere(orderRows) {
	var content = '<orders>\n';

	for (let order of orderRows) {
		content += `<order>
		<companyName>`+formatStringXml(order[3])+`</companyName>
		<address1>`+formatStringXml(order[5])+`</address1>
		<address2>`+formatStringXml(order[6])+`</address2>
		<suburb>`+formatStringXml(order[7])+`</suburb>
		<postcode>`+order[9]+`</postcode>
		<emailAddress>`+order[10]+`</emailAddress>
		<phone>`+order[11]+`</phone>
		<specialInstruction1>`+formatStringXml(order[13])+`</specialInstruction1>
		<items>
			<item>
				<reference>`+formatStringXml(order[17])+`</reference>
				<packaging>`+order[18]+`</packaging>
				<weight>`+order[19]+`</weight>
			</item>
		</items>
		</order>\n`;
	}

	content += '</orders>\n';

	// Save
	saveAs(new File([content], 'delivere-output-'+getDateValue(new Date())+'.xml', {type: 'application/xml;charset=utf-8'}));
}

const formatStringXml = (str) => str.replace('&', '&#038;');

export {createTemplateEparcels, createTemplateEparcelsCSV, createTemplateFastway, createTemplateInternationalEparcelsCSV, createTemplateDelivere};
