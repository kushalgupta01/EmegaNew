//  Discount Chemist
//  Order System Configuration
import { apiServer, wsHost, apiServerLocal, wsHostLocal } from '/common/api-server.js';

if (window.location.hostname == 'dco.discountchemist.com.au' || window.location.hostname == 'localdco.discountchemist.com.au') {
	let id = window.location.hostname.split('.')[0];
	window.apiServer = 'https://'+id+'.api.service.discountchemist.com.au:12443/api/';
	window.wsServer = id+'.ws.service.discountchemist.com.au:12443';
}
else {
	window.apiServer = apiServer;
    window.apiServerLocal = apiServerLocal;
	
	window.wsServer = wsHost;
	window.wsServerLocal = wsHostLocal;
}
window.imageServer = window.apiServer.replace('api', 'pictures');
//window.ACCESS_TOKEN_HEADER = 'DC-Access-Token';

// Services/marketplaces
window.SERVICE_IDS = {
	MULTISTORE: 0,
	EBAY: 1,
	AMAZON: 2,
	WOOCOMMERCE: 3,
	GROUPON: 4,
	MYDEAL: 5,
	NEWSERVICE: 6,
	EBAYAPI: 7,
	BIGCOMMERCE: 8,
	SHOPIFY: 9,
	MAGENTO: 10,
	NETO: 11,
	B2B: 12,
	CATCH: 13,
};

window.SERVICES = {
	'0': {
		id: 'multistore',
		name: 'MultiStore'
	},
	'1': {
		id: 'ebay',
		name: 'Ebay'
	},
	'2': {
		id: 'amazon',
		name: 'Amazon'
	},
	'3': {
		id: 'woocommerce',
		name: 'WooCommerce'
	},
	'4': {
		id: 'groupon',
		name: 'Groupon'
	},
	'5': {
		id: 'mydeal',
		name: 'Mydeal'
	},
	'6': {
		id: 'newservice',
		name: 'New Sservice'
	},
	'7': {
		id: 'ebayapi',
		name: 'Ebay Api'
	},
	'8': {
		id: 'bigcommerce',
		name: 'BigCommerce'
	},
	'9': {
		id: 'shopify',
		name: 'Shopify'
	},
	'10': {
		id: 'magento',
		name: 'Magento'
	},
	'11': {
		id: 'neto',
		name: 'Neto'
	},
	'12': {
		id: 'b2b',
		name: 'B2B'
	},
	'13': {
        id: 'catch',
        name: 'Catch'
    },
};

// Stores
window.stores = {
	'1': {
		id: 'eterminal',
		name: 'OzPlaza',
		service: SERVICE_IDS.EBAY,
		storeID: 'EM',
		recID: 'EM-',
	},
	'2': {
		id: 'sos',
		name: 'SOSHydration',
		service: SERVICE_IDS.WOOCOMMERCE,
		storeID: 'SOS',
		recID: 'SOS-',
		checkPayment: false,
	},
	'3': {
		id: 'kitncaboodleau',
		name: 'Scrub Daddy',
		service: SERVICE_IDS.EBAYAPI,
		storeID: 'SD',
		recID: 'SD-',
	},
	'4': {
		id: 'idirect',
		name: 'Idirect',
		service: SERVICE_IDS.EBAY,
		storeID: 'ID',
		recID: 'ID-',
		substores: {'1': 'InterTrading', '2': 'Factory'},
	},
	/*'5': {
		id: 'Microsoft',
		name: 'Microsoft',
		service: SERVICE_IDS.EBAY,
		storeID: 'MI',
		recID: 'MI-',
	},*/
	'6': {
		id: 'emegaonline',
		name: 'SP Warehouse',
		service: SERVICE_IDS.EBAY,
		storeID: 'SP',
		recID: 'SP-',
	},
	'8': {
		id: 'hobbyco',
		name: 'Hobbyco',
		service: SERVICE_IDS.EBAY,
		storeID: 'HO',
		recID: 'HO-',
	},
	'7': {
		id: 'kobayashi',
		name: 'Kobayashi',
		service: SERVICE_IDS.WOOCOMMERCE,
		storeID: 'KB',
		recID: 'KB-',
		checkPayment: false,
	},
	/*'11': {
		id: 'groupon',
		name: 'Groupon',
		service: SERVICE_IDS.GROUPON,
		storeID: 'GO',
		recID: 'GO-',
		checkPayment: false,
	},
	'12': {
		id: 'mydeal',
		name: 'Mydeal',
		service: SERVICE_IDS.MYDEAL,
		storeID: 'MD',
		recID: 'MD-',
		checkPayment: false,
	},*/
	'21': {
		id: 'newstore',
		name: 'New Store',
		service: SERVICE_IDS.NEWSERVICE,
		storeID: 'NS',
		recID: 'NS-',
		checkPayment: false,
	},
	'30': {
		id: 'combinedgroup',
		name: 'Combined Group',
		service: SERVICE_IDS.MULTISTORE,
		storeID: 'CG',
		recID: 'CG-',
		checkPayment: false,
	},
	'31': {
		id: 'kitncaboodle',
		name: 'Kitncaboodle',
		service: SERVICE_IDS.BIGCOMMERCE,
		storeID: 'KI',
		recID: 'KI-',
		checkPayment: false,
	},
	'32': {
		id: 'packingsorted',
		name: 'Packing Sorted',
		service: SERVICE_IDS.BIGCOMMERCE,
		storeID: 'PS',
		recID: 'PS-',
		checkPayment: false,
	},
	'33': {
		id: 'roofstuff',
		name: 'RoofStuff',
		service: SERVICE_IDS.BIGCOMMERCE,
		storeID: 'RS',
		recID: 'RS-',
		checkPayment: false,
	},
	'34': {
		id: 'ankame',
		name: 'ANKAMe',
		service: SERVICE_IDS.BIGCOMMERCE,
		storeID: 'AN',
		recID: 'AN-',
		checkPayment: false,
	},
	'41': {
		id: 'amazon',
		name: 'Amazon',
		service: SERVICE_IDS.AMAZON,
		storeID: 'AM',
		recID: 'AM-',
		checkPayment: false,
	},
	'51': {
		id: 'emega',
		name: 'Emega-Magento',
		service: SERVICE_IDS.MAGENTO,
		storeID: 'MA',
		recID: 'MA-',
		checkPayment: false,
	},
	'61': {
		id: 'charlichair',
		name: 'CharliChair',
		service: SERVICE_IDS.SHOPIFY,
		storeID: 'CC',
		recID: 'CC-',
		checkPayment: false,
	},
	'62': {
		id: 'waterwipes',
		name: 'Waterwipes',
		service: SERVICE_IDS.NEWSERVICE,
		storeID: 'WP',
		recID: 'WP-',
		checkPayment: false,
	},
	'71': {
		id: 'hobyco_web',
		name: 'Hobbyco Website',
		service: SERVICE_IDS.NETO,
		storeID: 'HOW',
		recID: 'HOW-',
		checkPayment: false,
	},
	'81': {
		id: 'b2b',
		name: 'B2B',
		service: SERVICE_IDS.B2B,
		storeID: 'B2B',
		recID: 'B2B-',
		checkPayment: false,
	},
	'91': {
        id: 'hobyco_catch',
        name: 'Hobbyco Catch',
        service: SERVICE_IDS.CATCH,
        storeID: 'HOC',
        recID: 'HOC-',
        checkPayment: false,
    },
	/*'4': {
		id: 'discountchemistamazon',
		name: 'Discount Chemist Amazon',
		service: SERVICE_IDS.AMAZON,
		storeID: 'DCA',
		recID: 'DCA-',
		checkPayment: false,
	},
	'5': {
		id: 'discountchemistonline',
		name: 'Discount Chemist Online',
		service: SERVICE_IDS.WOOCOMMERCE,
		storeID: 'DCO',
		recID: 'DCO-',
		checkPayment: false,
	}*/
};

window.homeCountry = {name: 'australia', code: 'au'};
window.storeAddress = {
	address1: 'PO BOX 78',
	address2: 'ENFIELD NSW 2136',
	city: 'ENFIELD',
	state: 'NSW',
	postcode: '2136',
	country: 'Australia'
};
window.invoiceSenderAddress = {
	address1: 'PO BOX 78',
	address2: '',
	city: 'ENFIELD',
	state: 'NSW',
	postcode: '2136',
	country: 'Australia',
	abn: 'ABN 70 155 546 437'
};
window.homeLocale = 'en-AU';


// Orders
window.ORDER_TYPE = {
	FASTWAY: 1,
	AUSPOST: 2,
	FLATPACK: 3,
	INTERNATIONAL: 4,
	EXPRESS: 5,
	FASTWAYFLATPACK: 8,
	FASTWAYFLATPACK1KG: 9,
	PARCEL: 10,
	//FASTWAYBROWN: 11,
	FASTWAYFLATPACK5KG: 12,
	BLANK: -1,
};
window.ORDER_TYPE_NAME = {
	1: 'Fastway',
	2: 'Australia Post',
	3: 'Flat-pack',
	4: 'International',
	5: 'Express',
	6: 'VR',
	8: 'Fastway Flatpack',
	9: 'Fastway Flatpack 1kg',
	//11: 'Fastway Brown',
	12: 'Fastway Flatpack 5kg+',
};
window.ORDER_TYPE_DATASET = {
	'fastway': ORDER_TYPE.FASTWAY,
	'auspost': ORDER_TYPE.AUSPOST,
	'flatpack': ORDER_TYPE.FLATPACK,
	'express': ORDER_TYPE.EXPRESS,
	'international': ORDER_TYPE.INTERNATIONAL,
	'parcel': ORDER_TYPE.PARCEL,
	'fastway-go': ORDER_TYPE.FASTWAY,
	'auspost-go': ORDER_TYPE.AUSPOST,
	'fastway-md': ORDER_TYPE.FASTWAY,
	'auspost-md': ORDER_TYPE.AUSPOST,
	'fastwayflatpack': ORDER_TYPE.FASTWAYFLATPACK,
	'fastwayflatpack1kg': ORDER_TYPE.FASTWAYFLATPACK1KG,
	//'fastwaybrown': ORDER_TYPE.FASTWAYBROWN,
	'fastwayflatpack5kg': ORDER_TYPE.FASTWAYFLATPACK5KG,
};
window.ORDER_TYPE_RANK = {};
ORDER_TYPE_RANK[ORDER_TYPE.EXPRESS] = 4;
ORDER_TYPE_RANK[ORDER_TYPE.FASTWAY] = 3;
ORDER_TYPE_RANK[ORDER_TYPE.AUSPOST] = 3;
ORDER_TYPE_RANK[ORDER_TYPE.FASTWAYFLATPACK5KG] = 3;
ORDER_TYPE_RANK[ORDER_TYPE.PARCEL] = 3;
ORDER_TYPE_RANK[ORDER_TYPE.FASTWAYFLATPACK] = 2;
ORDER_TYPE_RANK[ORDER_TYPE.FASTWAYFLATPACK1KG] = 2;
ORDER_TYPE_RANK[ORDER_TYPE.FLATPACK] = 1;

window.ORDER_STATUS = {
	COLLECTED: 1,
	PROGRESS: 2,
	PACKED: 3,
	OUTOFSTOCK: 4,
	CANCELLED: {
		OUTOFSTOCK: 5,
		DISCONTINUED: 6,
		DONE: 7,
	},
	OVERRIDE: 8,
	LATER: 9,
	READYTOPACK: 10,
	NONE: 0,
	UNKNOWN: -1,
	ORDERED: 11,
	READYTOPRINT: 12,
	RTS: 13,
	DAMAGEDRTS: 14,
	RESENDRTS: 15,
	PENDINGREVIEW: 16,
	PARTIALCOLLECT: 17,
	WAREHOUSECOLLECT: 18,
};
window.ORDER_STATUS_NAME = {
	1: 'Collected',
	2: 'In progress',
	3: 'Packed',
	4: 'Out of stock',
	5: 'Cancellation - Out of stock',
	6: 'Cancellation - Discontinued',
	7: 'Cancellation done',
	8: 'Override',
	9: 'Pack later',
	10: 'Ready to pack',
	0: 'New order',
	11: 'Ordered',
	12: 'Ready to print',
	13: 'RTS',
	14: 'Damaged RTS',
	15: 'Resend RTS',
	16: 'Pending Review',
	17: 'Partial Collect',
	18: 'Warehouse Collect',
};
window.ORDER_STATUS_DATASET = {
	'collected': ORDER_STATUS.COLLECTED,
	'packed': ORDER_STATUS.PACKED,
	'outofstock': ORDER_STATUS.OUTOFSTOCK,
	'none': ORDER_STATUS.NONE,
	'ordered': ORDER_STATUS.ORDERED,
	'cancelledoos': ORDER_STATUS.CANCELLED.OUTOFSTOCK,
	'alternative': ORDER_STATUS.PENDINGREVIEW,
	'partialcollect': ORDER_STATUS.PARTIALCOLLECT,
	'warehousecollect': ORDER_STATUS.WAREHOUSECOLLECT,
};

// Other order data
window.ORDER_DATA = {
	MNB: 'mnb',
	VR: 'vr',
	DO: 'do',
	CG: 'cg',
	SOS: 'sos',
	KOBAYASHI: 'kb',
	AMAZON: 'am',
	INTERTRADING: 'it',
	FACTORY: 'fac',
	COSTCO: 'cos',
	CHARLICHAIR: 'cc',
	MAGENTO: 'ma',
	MICROSOFT: 'mi',
	FGB:'fgb',
	MORLIFE:'mor',
	SPWAREHOUSE: 'sp',
	ORBIT: 'orb',
	WV: 'wv',
	SCHOLASTIC: 'scho',
	KORIMCO: 'kor',
	HYCLOR: 'hyc',
	SPLOSH: 'splo',
	SIGMA: 'sig',
	MISC: 'misc',
	NOTRACKING: 'notr',
	RTS: 'rts',
	DAMAGEDRTS: 'damrts',
	RESENDRTS: 'rerts',
	// SIXPACK: 'sixp',
	// TENPACK: 'tenp',
	// TWENTYPACK: 'twentyp',
	// THIRTYPACK: 'thirtyp',
	// SIXTYPACK: 'sixtyp',
	// GUCCI: 'gucci',
	PENDINGREFUND: 'penref',
	REFUNDDONE: 'refdone',
	TPROLLS: 'tprolls',
	HOBBYCO: 'hobbyco',
	PARTIALREFUND: 'partialrefund',
	ALTERNATIVE: 'alternative',
	B2B: 'b2b',
};


// Pages
window.PAGE_TYPE = {
	COLLECT: 1,
	STOCK: 2,
	REFUNDS: 3,
	LABELS: 4,
	MANAGE: 5,
	ORDERHOME: 6,
	HOME: 7,
	PACK: 8,
	ORDERED: 9,
	AWAITINGLIST: 10,
	RTS: 11,
	MORELABELS:12,
	PARTIALCOLLECT: 13,
	WAREHOUSECOLLECT: 14,
};

window.PAGE_INFO = {};
PAGE_INFO[PAGE_TYPE.COLLECT] = {
	name: 'collect',
	title: 'Orders 🗃',
	heading: 'New Orders 🗃',
	position: 'left',
	action: 'collect',
}
PAGE_INFO[PAGE_TYPE.PARTIALCOLLECT] = {
	name: 'partialcollect',
	title: 'Orders 🗃',
	heading: 'Parttial Collect Orders 🗃',
	position: 'left',
	action: 'partialcollect',
}
PAGE_INFO[PAGE_TYPE.WAREHOUSECOLLECT] = {
	name: 'warehousecollect',
	title: 'Orders 🗃',
	heading: 'Warehouse Collect 🗃',
	position: 'left',
	action: 'warehousecollect',
}
PAGE_INFO[PAGE_TYPE.STOCK] = {
	name: 'stock',
	title: 'Out of Stock Orders 📤',
	heading: '',
	position: 'left',
	action: 'do',
}
PAGE_INFO[PAGE_TYPE.REFUNDS] = {
	name: 'refunds',
	title: 'Refund Orders 📩',
	heading: '',
	position: 'left',
	action: 'refund',
}
PAGE_INFO[PAGE_TYPE.LABELS] = {
	name: 'labels',
	title: 'Create Labels 🖨',
	heading: '',
	position: 'left',
	action: 'do',
}
PAGE_INFO[PAGE_TYPE.MORELABELS] = {
	name: 'morelabels',
	title: 'Create More Labels 🖨',
	heading: '',
	position: 'left',
	action: 'do',
}
PAGE_INFO[PAGE_TYPE.MANAGE] = {
	name: 'manage',
	title: 'Manage Orders 📊',
	heading: '',
	position: '',
	adminonly: true,
}
PAGE_INFO[PAGE_TYPE.ORDERHOME] = {
	name: 'order-home',
	title: 'Orders - Home',
	heading: 'Order Management',
	position: '',
}
PAGE_INFO[PAGE_TYPE.HOME] = {
	name: 'home',
	title: 'Emega - Home',
	heading: 'Welcome to Emega',
	position: '',
}
PAGE_INFO[PAGE_TYPE.PACK] = {
	name: 'pack',
	title: 'Pack Orders',
	heading: '',
	position: '',
}
PAGE_INFO[PAGE_TYPE.ORDERED] = {
	name: 'ordered',
	title: 'Ordered 📦',
	heading: '', 
	position: 'left',
	action: 'do',
}

PAGE_INFO[PAGE_TYPE.AWAITINGLIST] = {
	name: 'awaitinglist',
	title: 'Awaiting List',
	heading: '',
	position: 'left',
	action: 'do',
}

PAGE_INFO[PAGE_TYPE.RTS] = {
	name: 'rts',
	title: 'RTS',
	heading: '',
	position: 'left',
	action: 'do',
}

PAGE_INFO[PAGE_TYPE.INVOICE] = {
	name: 'invoice',
	title: 'INVOICE',
	heading: '',
	position: 'left',
	action: 'do',
}

// Page tabs - ordered by their numbers
window.PAGE_TAB = {
	HOBBYCO: 44,
	PARCELS: 1,
	FLATPACK: 2,
	FASTWAYFLATPACK: 3,
	FASTWAYFLATPACK1KG: 4,
	FASTWAYFLATPACK5KG: 5,
	EXPRESS: 6,
	INTERNATIONAL: 7,
	NOTRACKING: 8,
	RTS: 9,
	DAMAGEDRTS: 10,
	//MNB: 11,
	VR: 12,
	DO: 13,
	COMBINED: 14,
	SOS: 15,
	AMAZON: 16,
	INTERTRADING: 17,
	FACTORY: 18,
	COSTCO: 19,
	CHARLICHAIR: 20,
	MAGENTO: 21,
	//MICROSOFT: 22,
	FGB: 23,
	MORLIFE: 24,
	SPWAREHOUSE: 25,
	ORBIT: 26,
	WV: 27,
	SCHOLASTIC: 28,
	KORIMCO: 29,
	HYCLOR: 30,
	SPLOSH: 31,
	SIGMA: 32,
	MISC: 33,
	// SIXPACK: 34,
	// TENPACK: 35,
	// TWENTYPACK: 36,
	// THIRTYPACK: 37,
	// SIXTYPACK: 38,
	// GUCCI: 39,
	KOBAYASHI: 40,
	PARTIALREFUND: 45,
	PENDINGREFUND: 41,
	REFUNDDONE: 42,
	TPROLLS: 43,
	ALTERNATIVE: 46,
	B2B: 47,
};

window.PAGE_TAB_INFO = {};
PAGE_TAB_INFO[PAGE_TAB.PARCELS] = {
	name: 'Parcels', id: 'tab-parcels', href: '#parcels'
};
PAGE_TAB_INFO[PAGE_TAB.FLATPACK] = {
	name: 'Flat-pack', id: 'tab-flatpack', href: '#flatpack'
};
PAGE_TAB_INFO[PAGE_TAB.FASTWAYFLATPACK] = {
	name: 'Fastway Flatpack', id: 'tab-fastwayflatpack', href: '#fastwayflatpack'
};
PAGE_TAB_INFO[PAGE_TAB.FASTWAYFLATPACK1KG] = {
	name: 'Fastway Flatpack 1kg', id: 'tab-fastwayflatpack1kg', href: '#fastwayflatpack1kg'
};
PAGE_TAB_INFO[PAGE_TAB.FASTWAYFLATPACK5KG] = {
	name: 'Fastway Flatpack 5kg+', id: 'tab-fastwayflatpack5kg', href: '#fastwayflatpack5kg'
};
PAGE_TAB_INFO[PAGE_TAB.EXPRESS] = {
	name: 'Express', id: 'tab-express', href: '#express'
};
PAGE_TAB_INFO[PAGE_TAB.INTERNATIONAL] = {
	name: 'International', id: 'tab-international', href: '#international'
};
PAGE_TAB_INFO[PAGE_TAB.NOTRACKING] = {
	name: 'No Tracking', id: 'tab-notracking', href: '#notracking'
};
PAGE_TAB_INFO[PAGE_TAB.RTS] = {
	name: 'RTS', id: 'tab-rts', href: '#rts', status: 13
};
PAGE_TAB_INFO[PAGE_TAB.DAMAGEDRTS] = {
	name: 'DamagedRTS', id: 'tab-damagedrts', href: '#damagedrts', status: 14
};
PAGE_TAB_INFO[PAGE_TAB.MNB] = {
	name: 'MNB', id: 'tab-mnb', href: '#mnb'
};
PAGE_TAB_INFO[PAGE_TAB.VR] = {
	name: 'VR', id: 'tab-vr', href: '#vr'
};
PAGE_TAB_INFO[PAGE_TAB.DO] = {
	name: 'Daily Order', id: 'tab-do', href: '#do'
};
PAGE_TAB_INFO[PAGE_TAB.COMBINED] = {
	name: 'Combined Group', id: 'tab-cg', href: '#cg', supplier: 'CombinedGroup', class: 'cg'
};
PAGE_TAB_INFO[PAGE_TAB.SOS] = {
	name: 'SOS', id: 'tab-sos', href: '#sos'
};
PAGE_TAB_INFO[PAGE_TAB.AMAZON] = {
	name: 'Amazon', id: 'tab-am', href: '#am'
};
PAGE_TAB_INFO[PAGE_TAB.INTERTRADING] = {
	name: 'INTERTRADING', id: 'tab-it', href: '#it'
};
PAGE_TAB_INFO[PAGE_TAB.FACTORY] = {
	name: 'FACTORY', id: 'tab-fac', href: '#fac'
};
PAGE_TAB_INFO[PAGE_TAB.COSTCO] = {
	name: 'COSTCO', id: 'tab-cos', href: '#cos'
};
PAGE_TAB_INFO[PAGE_TAB.CHARLICHAIR] = {
	name: 'Charli Chair', id: 'tab-cc', href: '#cc'
};
PAGE_TAB_INFO[PAGE_TAB.MAGENTO] = {
	name: 'Emega Magento', id: 'tab-ma', href: '#ma'
};
PAGE_TAB_INFO[PAGE_TAB.MICROSOFT] = {
	name: 'Microsoft', id: 'tab-mi', href: '#mi'
};
PAGE_TAB_INFO[PAGE_TAB.FGB] = {
	name: 'FGB', id: 'tab-fgb', href: '#fgb'
};
PAGE_TAB_INFO[PAGE_TAB.MORLIFE] = {
	name: 'MORLIFE', id: 'tab-mor', href: '#mor'
};
PAGE_TAB_INFO[PAGE_TAB.SPWAREHOUSE] = {
	name: 'SPWAREHOUSE', id: 'tab-sp', href: '#sp'
};
PAGE_TAB_INFO[PAGE_TAB.ORBIT] = {
	name: 'ORBIT', id: 'tab-orb', href: '#orb'
};
PAGE_TAB_INFO[PAGE_TAB.WV] = {
	name: 'WV', id: 'tab-wv', href: '#wv'
};
PAGE_TAB_INFO[PAGE_TAB.SCHOLASTIC] = {
	name: 'SCHOLASTIC', id: 'tab-scho', href: '#scho'
};
PAGE_TAB_INFO[PAGE_TAB.KORIMCO] = {
	name: 'KORIMCO', id: 'tab-kor', href: '#kor'
};
PAGE_TAB_INFO[PAGE_TAB.HYCLOR] = {
	name: 'HY-CLOR', id: 'tab-hyc', href: '#hyc'
};
PAGE_TAB_INFO[PAGE_TAB.SPLOSH] = {
	name: 'SPLOSH', id: 'tab-splo', href: '#splo'
};
PAGE_TAB_INFO[PAGE_TAB.SIGMA] = {
	name: 'SIGMA', id: 'tab-sig', href: '#sig'
};
PAGE_TAB_INFO[PAGE_TAB.MISC] = {
	name: 'MISC', id: 'tab-misc', href: '#misc'
};
// PAGE_TAB_INFO[PAGE_TAB.SIXPACK] = {
// 	name: '6 PACK', id: 'tab-sixp', href: '#sixp'
// };
// PAGE_TAB_INFO[PAGE_TAB.TENPACK] = {
// 	name: '12 PACK', id: 'tab-tenp', href: '#tenp'
// };
// PAGE_TAB_INFO[PAGE_TAB.TWENTYPACK] = {
// 	name: '24 PACK', id: 'tab-twentyp', href: '#twentyp'
// };
// PAGE_TAB_INFO[PAGE_TAB.THIRTYPACK] = {
// 	name: '30 PACK', id: 'tab-thirtyp', href: '#thirtyp'
// };
// PAGE_TAB_INFO[PAGE_TAB.SIXTYPACK] = {
// 	name: '60 PACK', id: 'tab-sixtyp', href: '#sixtyp'
// };
// PAGE_TAB_INFO[PAGE_TAB.GUCCI] = {
// 	name: 'GUCCI', id: 'tab-gucci', href: '#gucci'
// };
PAGE_TAB_INFO[PAGE_TAB.KOBAYASHI] = {
	name: 'KOBAYASHI', id: 'tab-kb', href: '#kb'
};
PAGE_TAB_INFO[PAGE_TAB.PENDINGREFUND] = {
	name: 'Pending Refund', id: 'tab-penref', href: '#penref'
};
PAGE_TAB_INFO[PAGE_TAB.REFUNDDONE] = {
	name: 'Refund Done', id: 'tab-refdone', href: '#refdone'
};
PAGE_TAB_INFO[PAGE_TAB.TPROLLS] = {
	name: 'Toilet Paper', id: 'tab-tprolls', href: '#tptolls'
};
PAGE_TAB_INFO[PAGE_TAB.HOBBYCO] = {
	name: 'Hobbyco', id: 'tab-hobbyco', href: '#hobbyco', supplier: 'HOBBYCO', class:'hobbyco',
};
PAGE_TAB_INFO[PAGE_TAB.PARTIALREFUND] = {
	name: 'Partial Refund', id: 'tab-parref', href: '#parref'
};
PAGE_TAB_INFO[PAGE_TAB.ALTERNATIVE] = {
	name: 'Alternative', id: 'tab-alternative', href: '#alternative'
};
PAGE_TAB_INFO[PAGE_TAB.B2B] = {
	name: 'B2B', id: 'tab-b2b', href: '#b2b'
};

// Done screen
window.doneScreenImages = [
	// [weight, [src, alt]]
	['0.075', ['img/fireworks.gif', 'Fireworks']],
	['0.10', ['img/celebrate-yes.gif', 'KakaoTalk celebration yes']],
	['0.075', ['img/celebrate-flags.gif', 'KakaoTalk celebration flags']],
	['0.075', ['img/celebrate-thumbs-up.gif', 'KakaoTalk celebration thumbs up']],
	['0.075', ['img/celebrate-glowsticks.gif', 'KakaoTalk celebration glow sticks']],
	['0.075', ['img/celebrate-jump.gif', 'KakaoTalk celebration jump']],
	['0.075', ['img/celebrate-jump-stars.gif', 'KakaoTalk celebration jump to the stars']],
	['0.075', ['img/celebrate-music.gif', 'KakaoTalk celebration music']],
	['0.075', ['img/celebrate-praise.gif', 'KakaoTalk celebration praise']],
	['0.075', ['img/dance.gif', 'KakaoTalk dance']],
	['0.075', ['img/dance2.gif', 'KakaoTalk dance 2']],
	['0.075', ['img/proper.gif', 'KakaoTalk proper']],
	['0.075', ['img/salute.gif', 'KakaoTalk salute']],
];

// Actions
window.LIVE_ACTIONS = {
	STATUS_CHANGED: 1,
	RECORD_OPENED: 2,
	RECORD_CLOSED: 3,
	RECORD_ALL: 4,
};

window.SCAN_ACTIONS = {
	DONE: 1,
	WAITING: 2,
	WAITING_FLASH: 3,
};


// Label template
window.PACKAGING_WEIGHT = 0; // Mass in grams of the packaging e.g. box, bubble wrap
window.PANEL_TYPE = {
	FASTWAY: 1,
	AUSPOST: 2,
	REPEATCUSTOMER: 3,
	FWFP: 4,
	EXPRESS: 5,
	INTERNATIONAL: 6
};

window.PANEL_INFO = {};
PANEL_INFO[PANEL_TYPE.FASTWAY] = {
	name: 'Fastway Couriers',
	id: 'template-fastway',
	types: [ORDER_TYPE.FASTWAY, ORDER_TYPE.FASTWAYFLATPACK5KG],
};
PANEL_INFO[PANEL_TYPE.AUSPOST] = {
	name: 'Auspost',
	id: 'template-auspost',
	types: [ORDER_TYPE.AUSPOST],
};
PANEL_INFO[PANEL_TYPE.REPEATCUSTOMER] = {
	name: 'Repeat Customer',
	id: 'template-repeatcustomer',
	types: [],
};
PANEL_INFO[PANEL_TYPE.FWFP] = {
	name: 'FastTrack FWFP',
	id: 'template-fwfp',
	types: [ORDER_TYPE.FASTWAYFLATPACK, ORDER_TYPE.FASTWAYFLATPACK1KG],
};
PANEL_INFO[PANEL_TYPE.EXPRESS] = {
	name: 'Express',
	id: 'template-express',
	types: [ORDER_TYPE.EXPRESS],
};
PANEL_INFO[PANEL_TYPE.INTERNATIONAL] = {
	name: 'International',
	id: 'template-international',
	types: [ORDER_TYPE.INTERNATIONAL],
};

// Management
window.USER_TYPE = {
	ADMIN: 1,
	USER: 2,
	SUPPLIER: 3,
	CLIENT: 5,
	DISABLED: 4,
};

window.USER_TYPE_INFO = {};
USER_TYPE_INFO[USER_TYPE.ADMIN] = {
	name: 'Admin',
};
USER_TYPE_INFO[USER_TYPE.USER] = {
	name: 'User',
	default: true,
};
USER_TYPE_INFO[USER_TYPE.SUPPLIER] = {
	name: 'Supplier',
};
USER_TYPE_INFO[USER_TYPE.CLIENT] = {
    name: "Client",
};
USER_TYPE_INFO[USER_TYPE.DISABLED] = {
	name: 'Disabled',
};

window.SUPPLIER = {
	'NonSupplier': 1,
	'CharliChair': 2,
	'MNB': 3,
	'IDirect': 4,
	'CombinedGroup': 5,
	'SOS': 6,
	'HOBBYCO': 7,
}

window.SUPPLIER_INFO = {};
SUPPLIER_INFO[SUPPLIER.NonSupplier] = {
	id: 'nonsupplier',
	name: 'NonSupplier',
	default: 'true',
}
SUPPLIER_INFO[SUPPLIER.CharliChair] = {
	id: 'charlichair',
	name: 'Charli Chair',
	stores: ['61'],
}
SUPPLIER_INFO[SUPPLIER.MNB] = {
	id: 'mnb',
	name: 'MNB',
	stores: ['11'],
}
SUPPLIER_INFO[SUPPLIER.IDirect] = {
	id: 'idirect',
	name: 'IDirect',
	stores: ['4'],
}
SUPPLIER_INFO[SUPPLIER.CombinedGroup] = {
	id: 'combinedgroup',
	name: 'Combined Group',
	stores: ['31', '32', '33', '34'],
}
SUPPLIER_INFO[SUPPLIER.SOS] = {
	id: 'sos',
	name: 'SOSHydration',
	stores: ['2'],
}
SUPPLIER_INFO[SUPPLIER.HOBBYCO] = {
	id: 'hobbyco',
	name: 'Hobbyco',
	stores: ['8','71','91'],
}

window.auspostCustomers = ['Mark Lazzarotti'];
