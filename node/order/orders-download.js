// Discount Chemist
// Order System

// Download orders

const {Config} = require('./config');
const downloadOrdersEbay = require('./orders-download-ebay');
const downloadOrdersEbayApi = require('./orders-download-ebayapi');
const downloadOrdersAmazon = require('./orders-download-amazon');
const downloadOrdersWooCommerce = require('./orders-download-woocommerce');
const downloadOrdersBigCommerce = require('./orders-download-bigcommerce');
const downloadOrdersShopify = require('./orders-download-shopify');
const downloadOrdersMagento = require('./orders-download-magento');
const downloadOrdersNeto = require('./orders-download-neto');
const downloadOrdersCatch = require('./orders-download-catch');
const downloadOrdersKogan = require('./orders-download-kogan');

const downloadOrders = function(req, res, next) {
	if (req.params.service == Config.SERVICE_IDS.EBAYAPI) {
		downloadOrdersEbayApi(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.EBAY) {
		downloadOrdersEbay(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.AMAZON) {
		downloadOrdersAmazon(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.WOOCOMMERCE) {
		downloadOrdersWooCommerce(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.BIGCOMMERCE) {
		downloadOrdersBigCommerce(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.SHOPIFY) {
		downloadOrdersShopify(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.MAGENTO) {
		downloadOrdersMagento(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.NETO) {
		downloadOrdersNeto(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.CATCH) {
        downloadOrdersCatch(req, res, next);
    }
    else if (req.params.service == Config.SERVICE_IDS.KOGAN) {
        downloadOrdersKogan(req, res, next);
    }
	else {
		let output = {result: 'Service not supported.'};
		let httpStatus = 503;

		res.set({
			'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
			'Pragma': 'no-cache',
		});
		res.json(httpStatus, output);
		next();
	}
}

module.exports = downloadOrders;
