// Discount Chemist
// Order System

// Get/update orders from the database

const { Config } = require('./config');
const { userCheckToken } = require('./users-token');
const rp = require('request-promise');

const ORDER_TYPE = {
	Fastway: 1,
	AustraliaPost: 2,
	International: 4,
	Express: 5
};

const FASTWAY_API_PARAMS = {
	URL: 'https://au.api.fastway.org',
	API_KEY: '3d1a26dad0d628e4150a298de3465b5a'
};

const AUSPOST_API_PARAMS = {
	URL: 'https://digitalapi.auspost.com.au',
	USERNAME: '8106e0df-2531-4b37-8e51-2a0581c70734',
	PASSWORD: 'x759932b6881406d77cf',
	ACCOUNT_NUMBER: '0008515116'
};

const getOrderTrackingStatus = async function(req, res, next) {
	var method = req.method.toLowerCase();

	var token = req.header(Config.ACCESS_TOKEN_HEADER);
	var { trackingNumber, type } = req.body;

	var output = {result: null};
	var httpStatus = 400;

	try {
		do {
			if (method != 'post') {
				output.result = 'wrong method';
				break;
			}

			let loggedInUser = await userCheckToken(token);

			if (!loggedInUser) {
				httpStatus = 401;
				output.result = 'Not logged in.';
				break;
			}

			if (!trackingNumber || !type) {
				output.result = 'Invalid tracking number or type';
				break;
			}

			let trackingStatus = [];
			type = parseInt(type);

			if ([ORDER_TYPE.Fastway].indexOf(type) >= 0) {
				trackingStatus = await getFastwayStatus(trackingNumber);
			} else if ([ORDER_TYPE.AustraliaPost, ORDER_TYPE.International, ORDER_TYPE.Express].indexOf(type) >= 0) {
				trackingStatus = await getAusPostStatus(trackingNumber);
			}

			if (trackingStatus) {
				output.trackingStatus = trackingStatus;
				output.result = 'success';
				httpStatus = 200;
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

async function getFastwayStatus(trackingNumber) {
	try {
		let params = {
			url: [
				FASTWAY_API_PARAMS.URL,
				'/latest/tracktrace/detail/',
				trackingNumber,
				'?api_key=', FASTWAY_API_PARAMS.API_KEY
			].join(''),
			method: 'get',
			headers: {
				'Content-Type': 'application/json'
			}
		};

		let result = await rp(params);
		let resulstJson = JSON.parse(result);

		let scans = resulstJson.result.Scans;

		return scans.map(sc => ({
			time: sc.RealDateTime,
			description: sc.Description,
			status: sc.Status,
			statusDescription: sc.StatusDescription,
			signature: sc.Signature,
			company: sc.CompanyInfo.contactName,
			depot: sc.Name
		})).reverse();

	} catch (error) {
		console.log(error);
		return null;
	}
}

async function getAusPostStatus(trackingNumber) {
	try {
		let params = {
			url: [
				AUSPOST_API_PARAMS.URL,
				'/shipping/v1/track?tracking_ids=',
				trackingNumber
			].join(''),
			method: 'get',
			headers: {
				'Content-Type': 'application/json',
				'account-number': AUSPOST_API_PARAMS.ACCOUNT_NUMBER
			},
			'auth': {
				'user': AUSPOST_API_PARAMS.USERNAME,
				'pass': AUSPOST_API_PARAMS.PASSWORD
			}
		};
console.log(params);
		const result = await rp(params);
		const { tracking_results } = JSON.parse(result);
		const item = tracking_results[0].trackable_items[0].items[0];


		let events = item.events;

		return events.map(ev => ({
			time: ev.date,
			description: ev.description,
			status: '',
			statusDescription: '',
			signature: '',
			company: '',
			depot: ev.location
		}));

	} catch (error) {
		console.log(error);
		return null;
	}
}

module.exports = {getOrderTrackingStatus,getFastwayStatus,getAusPostStatus};
