// Discount Chemist
// Order System

const https = require('https');
//const querystring = require('querystring');

const eBaySession = class {
	// Create new instance with the details for the API call
	constructor(appID, devID, certID, siteID) {
		this.appID = appID;
		this.devID = devID;
		this.certID = certID;
		this.siteID = siteID;
		//this.authToken = authToken;
        this.serverUrl = 'https://api.ebay.com/ws/api.dll';
        this.serverHost = 'api.ebay.com';
        this.serverPath = '/ws/api.dll';
		this.compatLevel = 1009; // eBay API version
		//this.apiCall = apiCall;
	}
	
	// Headers for the HTTP request to eBay
	buildEbayHeaders(apiCall) {
		return {
			'X-EBAY-API-DEV-NAME': this.devID,
			'X-EBAY-API-APP-NAME': this.appID,
			'X-EBAY-API-CERT-NAME': this.certID,
			'X-EBAY-API-SITEID': this.siteID,
			'X-EBAY-API-CALL-NAME': apiCall,
			'X-EBAY-API-COMPATIBILITY-LEVEL': this.compatLevel,
			'X-EBAY-API-DETAIL-LEVEL': 1,
		};
	}
	
	// Sends a HTTP request to the server for this session
	sendHttpRequest(apiCall, requestData) {
		return new Promise((resolve, reject) => {
			var result = '';
			var options = {
				host: this.serverHost,
				path: this.serverPath,
				method: 'POST',
				headers: this.buildEbayHeaders(apiCall)
			};
			options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
			options.headers['Content-Length'] = Buffer.byteLength(requestData);
			
			var req = https.request(options, (res) => {
				res.setEncoding('utf8');
				res.on('data', (chunk) => {
					result += chunk;
				});
				res.on('end', () => {
					resolve(result);
				});
			});

			req.on('error', (e) => {
				reject(e.message);
			});

			req.write(requestData);
			req.end();
        });
	}
}

module.exports = eBaySession;
