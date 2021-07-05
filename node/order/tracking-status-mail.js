const nodemailer = require('nodemailer');
const emailProperties = require("./email-properties");

const sendMailForTracking = function(emailData) {
	let transporter = nodemailer.createTransport({
		service: emailProperties.service,
		auth: {
			user: emailProperties.from,
			pass: emailProperties.pass
		}
	});

	let mailOptions = {
	  from: emailProperties.from,
	  to: emailData.to,
	  subject: "Test email "+emailProperties.subject,
	  html: { path : "../../html/tracking-info/order_status_template.ejs"}
	 // text : "Thankyou for shopping with “Eterminal” , your order is being fulfilled by eMEGA fulfillment center. You can track your order details by entering your order ID: "+ emailData.orderId +" at "+emailProperties.trackingHostUrl, 
	};

	transporter.sendMail(mailOptions, function(error, info){
	  if (error) {
		console.log(error);
	  } else {
		//console.log('Email sent: ' + info.response);
	  }
	});
	
}

module.exports = sendMailForTracking;
