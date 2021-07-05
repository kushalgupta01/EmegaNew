//  Discount Chemist
//  Order System

// Send email
const fs = require('fs');
const mailjet = require('node-mailjet');
const {Config} = require('./config');
const {userCheckToken} = require('./users-token');

const EMAIL_INVOICE = 'invoice';
const EMAIL_TRACKING = 'tracking';

const emailSender = async function(req, res, next) {
	var recipients;
	var emailType = req.body.type;
	var pdf = req.files && req.files.pdf ? req.files.pdf : null;
	var token = req.header(Config.ACCESS_TOKEN_HEADER) || null;

	var output = {result: null};
	var httpStatus = 400;

	try {
		mainDoLoop:
		do {
			// Check token
			if (!await userCheckToken(token)) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			// Check recepient info
			var infoValid = true;
			try {
				recipients = JSON.parse(req.body.recipients) || null;
			} catch(e) {};

			if (recipients) {
				for (let recipient of recipients) {
					if (isNaN(parseInt(recipient.store, 10))) {
						infoValid = false;
						break;
					}
				}
			}

			if (!infoValid) {
				output.result = 'Invalid recipient info.';
				break;
			}


			// Email details
			var emailMsgs = [];

			for (let recipient of recipients) {
				var emailMsg = {
					'From': {},
					'To': [],
					'Subject': '',
					'TextPart': '',
					'HTMLPart': '',
				};

				// To recipient
				emailMsg.To.push({
					'Name': recipient.name,
					'Email': recipient.email
				});

				// Subject and message
				var storeName = Config.STORES[recipient.store] ? Config.STORES[recipient.store].name : 'Our Store';

				if (emailType == EMAIL_INVOICE) {
					// Invoice
					emailMsg.From = {
						'Name': 'Discount Chemist',
						'Email': 'info@discountchemist.com'
					};
	
					// Send a copy of the invoice to ourselves
					emailMsg.To.push({
						'Name': 'Discount Chemist',
						'Email': 'info@discountchemist.com'
					});

					emailMsg.Subject = 'Tax invoice for order #'+recipient.order+' - Discount Chemist';

					emailMsg.TextPart = `Dear ${recipient.name},\r\n\r\n\
					Please find attached your tax invoice.\r\n\r\n\
					We hope you enjoy your purchase! If you have any queries or need any assistance, please send us a message through eBay and we will get back to you as soon as possible.\r\n\
					Please note that this email is not monitored and we are unable to respond to any emails sent to us here.\r\n\r\n\
					Regards,\r\n\
					Discount Chemist`;

					emailMsg.HTMLPart = `Dear ${recipient.name},<br><br>\
					Please find attached your tax invoice.<br><br>\
					We hope you enjoy your purchase! If you have any queries or need any assistance, please send us a message through eBay and we will get back to you as soon as possible.<br>\
					Please note that this email is not monitored and we are unable to respond to any emails sent to us here.<br><br>\
					Regards,<br><br>\
					Discount Chemist`;

					emailMsg.Attachments = [
						{
							//'ContentType': 'application/pdf',
							'ContentType': pdf.type,
							'Filename': pdf.name,
							'Base64Content': fs.readFileSync(pdf.path).toString('base64')
						}
					];
				}
				else if (emailType == EMAIL_TRACKING) {
					// Tracking details
					emailMsg.From = {
						'Name': storeName,
						'Email': 'info@discountchemist.com'
					};
	
					// Send a copy to ourselves
					/*emailMsg.To.push({
						'Name': storeName,
						'Email': 'info@discountchemist.com'
					});*/

					emailMsg.Subject = 'Tracking details for order #'+recipient.order+' - '+storeName;

					emailMsg.TextPart = `Dear ${recipient.name},\r\n\r\n\r\n\
					Thank you for shopping with ${storeName}! Your order is on its way and your tracking details are as follows:\r\n\r\n\
					Order number: ${recipient.order}\r\n\
					Courier service: ${recipient.courier}\r\n\
					Tracking number: ${recipient.trackingNum}\r\n\r\n\
					We hope you enjoy your purchase! If you have any queries or need any assistance, please send us a message through eBay and we will get back to you as soon as possible.\r\n\
					Please note that this email is not monitored and we are unable to respond to any emails sent to us here.\r\n\r\n\r\n\
					Regards,\r\n\r\n\
					${storeName}`;

					emailMsg.HTMLPart = `<!DOCTYPE html>\
					<html>\
					<head>\
					<meta charset="UTF-8" />\
					<link href="https://emails.discountchemist.com.au/open-sans.css" rel="stylesheet">\
					<link href="https://emails.discountchemist.com.au/email.css" rel="stylesheet">\
					</head>\
					<body>\
					<div id="container">\
						<div id="header">\
							<div class="title">Your order is on the way!</div>\
						</div>\
						<div id="content">\
							<p><span class="bold">Dear ${recipient.name},</span><br><br><br>\
							Thank you for shopping with ${storeName}! Your order is on its way and your tracking details are as follows:</p>\
							<table id="tracking">\
								<tr><td>Order number:</td><td>${recipient.order}</td></tr>\
								<tr><td>Courier service:</td><td>${recipient.courier}</td></tr>\
								<tr><td>Tracking number:</td><td>${recipient.trackingNum}</td></tr>\
							</table>\
							<p>We hope you enjoy your purchase!</p>\
							<p>If you have any queries or need any assistance, please send us a message through eBay and we will get back to you as soon as possible.<br>\
							Please note that this email is not monitored and we are unable to respond to any emails sent to us here.<br><br><br>\
							<span class="bold">Regards,<br><br>\
							${storeName}</span></p>\
						</div>\
					</div>\
					</body>\
					</html>`;
				}
				else {
					output.result = 'Invalid email type.';
					break mainDoLoop;
				}

				emailMsgs.push(emailMsg);
			}


			var result = await new Promise((resolve, reject) => {
				var mailjetConn = mailjet.connect('d355ed77f81938878ba7d9516dbb8bd4', '0911d35d0d18af14cd4c310eb15b89f8');
				var request = mailjetConn.post('send', {'version': 'v3.1'}).request({
					'Messages': emailMsgs
				});

				request.then(result => resolve(result))
				.catch(err => reject(err));
			});

			var success = false;
			if (result && result.body && result.body.Messages) {
				success = true;
				for (let msg of result.body.Messages) {
					if (msg.Status != 'success') {
						success = false;
						break;
					}
				}
			}

			if (success) {
				output.result = 'success';
				httpStatus = 200;
			}
			else {
				output.result = 'Could not send email.';
				httpStatus = 503;
			}
		} while(0);
	}
	catch (e) {
		// Error
		httpStatus = 503;
		output.result = e;
	}

	res.set({
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
		'Pragma': 'no-cache',
	});
	res.json(httpStatus, output);
	next();
}

module.exports = emailSender;
