const nodemailer = require('nodemailer');
const emailProperties = require("./email-properties");
const fs = require("fs");
const ejs = require("ejs");

const sendMailForTracking = function (emailData) {
	emailData.trackingHostUrl = emailProperties.trackingHostUrl+"?id="+emailData.dbNum;

	let transporter = nodemailer.createTransport({
		service: emailProperties.service,
		auth: {
			user: emailProperties.from,
			pass: emailProperties.pass
		}
	});


	ejs.renderFile("../html/tracking-info/order_status_professional_template.ejs", { emailData: emailData }, function (err, data) {
		if (err) {
			console.log(err);
		} else {
			let mailOptions = {
				from: emailProperties.from,
				to: emailData.to,
				subject: emailData.sellerName +" "+ emailProperties.subject,
				html: data
				// text : "Thankyou for shopping with “Eterminal” , your order is being fulfilled by eMEGA fulfillment center. You can track your order details by entering your order ID: "+ emailData.orderId +" at "+emailProperties.trackingHostUrl, 
			};

			transporter.sendMail(mailOptions, function (err, info) {
				if (err) {
					console.log(err);
				} else {
					console.log('Message sent: ' + info.response);
				}
			});
		}

	});


}

module.exports = sendMailForTracking;
