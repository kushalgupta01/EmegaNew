// Discount Chemist
// Order System

// Download orders

const {Config} = require('./config');
const downloadItemsEbay = require('./items-download-ebay');
const downloadItemsWooCommerce = require('./items-download-woocommerce');
const downloadItemsBigCommerce = require('./items-download-bigcommerce');
const downloadItemsShopify = require('./items-download-shopify');
const downloadItemsMagento = require('./items-download-magento');
const downloadItemsNeto = require('./items-download-neto');
const downloadItemsBigCommerceAll = require('./items-download-bigcommerce-all');
const downloadItemsCatch = require('./items-download-catch');
const downloadItemsKogan = require('./items-download-kogan');

const downloadItems = function(req, res, next) {
	if (req.params.service == Config.SERVICE_IDS.EBAY || req.params.service == Config.SERVICE_IDS.EBAYAPI) {
		downloadItemsEbay(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.WOOCOMMERCE) {
		downloadItemsWooCommerce(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.BIGCOMMERCE) {
		downloadItemsBigCommerce(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.SHOPIFY) {
		downloadItemsShopify(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.MAGENTO) {
		downloadItemsMagento(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.NETO) {
		downloadItemsNeto(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.MULTISTORE) {
		downloadItemsBigCommerceAll(req, res, next);
	}
	else if (req.params.service == Config.SERVICE_IDS.CATCH) {
        downloadItemsCatch(req, res, next);
    }
    else if (req.params.service == Config.SERVICE_IDS.KOGAN) {
        downloadItemsKogan(req, res, next);
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

module.exports = downloadItems;