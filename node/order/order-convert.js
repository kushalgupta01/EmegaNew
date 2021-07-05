// Discount Chemist
// Order System

// Convert/translate order data from the database into a common format

const {Config} = require('./config');
const {postageServiceName, dateIsoToEbay} = require('./utils');

const orderConvertEbay = {
	OrderID: 'orderID',
	RecordID: 'SalesRecordID',
	//ChannelID: 'channelID', // eBay
	//SellerID: 'sellerID', // eBay
	UserID: 'buyerID',
	BuyerFullName: 'finalDestinationAddressName',
	BuyerFirstName: 'buyerFirstName',
	BuyerLastName: 'buyerLastName',
	PhoneNumber: 'finalDestinationAddressPhone',
	Email: 'buyerEmail',
	BuyerAddress1: 'finalDestinationAddressLine1',
	BuyerAddress2: 'finalDestinationAddressLine2',
	BuyerCity: 'finalDestinationCity',
	BuyerState: 'finalDestinationStateOrProvince',
	BuyerPostcode: 'finalDestinationPostalCode',
	BuyerCountry: 'finalDestinationCountry',

	SalePrice: 'lineItemSumTotal',
	//CashOnDeliveryFee: 'cashOnDeliveryFee', // eBay
	TotalPrice: 'orderSumTotal',
	SaleCurrency: 'orderSumTotalCurrency',
	Postage: 'orderShippingPrice',
	PostageService: 'shippingMethod',
	DateCreated: 'createdDate',
	DateCheckout: 'checkoutDate', // eBay
	DateSold: 'saleDate', // eBay
	DatePaid: 'paidDate',
	PaymentMethod: 'PaymentMethod',
	PaymentStatus: 'orderPaymentStatus', // eBay
	TransactionID: 'paymentID',
	ClickCollect: 'clickCollect', // eBay
	ClickCollectID: 'clickCollectRefNum', // eBay
	Note: 'note',

	Items: 'items',
	ItemData: {
		SKU: 'sku',
		ItemID: 'itemID',
		Name: 'title',
		Currency: 'currency',
		Quantity: 'quantity',
		Price: 'unitPrice',
		Postage: 'shippingPrice',
		LineItemID: 'lineItemID',
		TransactionID: 'transactionID',
		VariationDetails: 'variationDetails', // eBay
	},
};

const orderConvertAmazon = {
	OrderID: 'order_id',
	RecordID: 'SalesRecordID',
	UserID: 'buyer_name',
	BuyerFullName: 'buyer_name',
	BuyerFirstName: 'buyer_first_name',
	BuyerLastName: 'buyer_last_name',
	PhoneNumber: 'buyer_phone_number',
	Email: 'buyer_email',
	BuyerAddress1: 'ship_address_1',
	BuyerAddress2: 'ship_address_2',
	// BuyerAddress3: 'ship-address-3', // Amazon
	BuyerCity: 'ship_city',
	BuyerState: 'ship_state',
	BuyerPostcode: 'ship_postal_code',
	BuyerCountry: 'ship_country',

	//SalePrice: 'total', // eBay
	//CashOnDeliveryFee: 'cashOnDeliveryFee', // eBay
	TotalPrice: 'item_price',
	SaleCurrency: 'currency',
	Postage: 'shipping_price',
	PostageService: 'ship_service_level',
	DateCreated: 'purchase_date',
	//DateCheckout: 'checkoutDate', // eBay
	//DateSold: 'date_paid', // eBay
	DatePaid: 'payments_date',
	// PaymentMethod: 'payment_method',
	// PaymentStatus: 'date_paid_gmt', // eBay
	// TransactionID: 'transaction_id',
	//ClickCollect: 'clickCollect', // eBay
	//ClickCollectID: 'clickCollectRefNum', // eBay
	Note: 'delivery_Instructions',

	Items: 'item_list',
	ItemData: {
		SKU: 'sku',
		ItemID: 'order_item_id',
		Name: 'product_name',
		Currency: 'currency',
		Quantity: 'quantity_purchased',
		Price: 'item_price',
		Postage: 'shipping_price',
		//LineItemID: 'lineItemID',
		//TransactionID: 'transactionID',
		// VariationDetails: 'meta_data', // eBay
	},
};

const orderConvertWooCommerce = {
	OrderID: 'id',
	RecordID: 'number',
	UserID: 'order_key',
	BuyerFullName: ['shipping', 'full_name'],
	BuyerFirstName: ['shipping', 'first_name'],
	BuyerLastName: ['shipping', 'last_name'],
	PhoneNumber: ['billing', 'phone'],
	Email: ['billing', 'email'],
	BuyerCompany: ['shipping', 'conpany'],
	BuyerAddress1: ['shipping', 'address_1'],
	BuyerAddress2: ['shipping', 'address_2'],
	BuyerCity: ['shipping', 'city'],
	BuyerState: ['shipping', 'state'],
	BuyerPostcode: ['shipping', 'postcode'],
	BuyerCountry: ['shipping', 'country'],

	//SalePrice: 'total', // eBay
	//CashOnDeliveryFee: 'cashOnDeliveryFee', // eBay
	TotalPrice: 'total',
	SaleCurrency: 'currency',
	Postage: 'shipping_total',
	PostageService: ['shipping_lines', '0', 'method_title'],
	DateCreated: 'date_created_gmt',
	//DateCheckout: 'checkoutDate', // eBay
	//DateSold: 'date_paid', // eBay
	DatePaid: 'date_paid',
	PaymentMethod: 'payment_method',
	PaymentStatus: 'date_paid_gmt', // eBay
	TransactionID: 'transaction_id',
	//ClickCollect: 'clickCollect', // eBay
	//ClickCollectID: 'clickCollectRefNum', // eBay
	Note: 'customer_note',

	Items: 'line_items',
	ItemData: {
		SKU: 'sku',
		ItemID: 'product_id',
		Name: 'name',
		//Currency: 'currency',
		Quantity: 'quantity',
		Price: 'price',
		//Postage: 'shippingPrice',
		LineItemID: 'id',
		//TransactionID: 'transactionID',
		VariationDetails: 'meta_data', // eBay
	},
};

const orderConvertGroupon = {
	OrderID: 'orderID',
	RecordID: 'SalesRecordID',
	//ChannelID: 'channelID', // eBay
	//SellerID: 'sellerID', // eBay
	UserID: 'buyerID',
	BuyerFullName: 'shipment_address_name',
	BuyerFirstName: '',
	BuyerLastName: '',
	PhoneNumber: 'customer_phone',
	Email: '',
	BuyerAddress1: 'shipment_address_street',
	BuyerAddress2: 'shipment_address_street_2',
	BuyerCity: 'shipment_address_city',
	BuyerState: 'shipment_address_stat',
	BuyerPostcode: 'shipment_address_postal_code',
	BuyerCountry: 'shipment_address_country',

	SalePrice: 'sell_price',
	PostageService: 'shipment_method_requested',
	Postage: 'Postage',
	//CashOnDeliveryFee: 'cashOnDeliveryFee', // eBay
	TotalPrice: 'TotalPrice',
	DateCreated: 'order_date',
	PaymentMethod: 'fulfillment_method',
	PaymentStatus: 'bom_sku', // eBay

	Items: 'items',
	ItemData: {
		SKU: 'sku',
		Name: 'title',
		ItemID: 'itemID',
		Quantity: 'quantity',
		Price: 'unitPrice',
		LineItemID: 'lineItemID'
		
	},
};

const orderConvertMydeal = {
	OrderID: 'orderID',
	RecordID: 'SalesRecordID',
	//ChannelID: 'channelID', // eBay
	//SellerID: 'sellerID', // eBay
	UserID: 'buyerID',
	BuyerCompany: 'Company_Name',
	BuyerFullName: 'Name',
	BuyerFirstName: '',
	BuyerLastName: '',
	PhoneNumber: 'Phone',
	Email: '',
	BuyerAddress1: 'Address',
	BuyerAddress2: 'Address2',
	BuyerCity: 'Suburb',
	BuyerState: 'State',
	BuyerPostcode: 'Postcode',
	BuyerCountry: 'Country',
	SalePrice: 'Merchant_Fee',
	PostageService: 'Courier',
	Postage: 'Postage',
	//CashOnDeliveryFee: 'cashOnDeliveryFee', // eBay
	TotalPrice: 'TotalPrice',
	DateCreated: 'Purchased_Date',
	PaymentMethod: 'Payments',
	PaymentStatus: 'Payments', // eBay

	Items: 'items',
	ItemData: {
		SKU: 'sku',
		Name: 'title',
		ItemID: 'itemID',
		Quantity: 'quantity',
		Price: 'unitPrice',
		LineItemID: 'lineItemID'
		
	},
};

const orderConvertCharliChair = {
	OrderID: 'orderID',
	RecordID: 'SalesRecordID',
	//ChannelID: 'channelID', // eBay
	//SellerID: 'sellerID', // eBay
	UserID: 'buyerID',
	BuyerFullName: 'finalDestinationAddressName',
	BuyerFirstName: 'buyerFirstName',
	BuyerLastName: 'buyerLastName',
	PhoneNumber: 'finalDestinationAddressPhone',
	Email: 'buyerEmail',
	BuyerAddress1: 'finalDestinationAddressLine1',
	BuyerAddress2: 'finalDestinationAddressLine2',
	BuyerCity: 'finalDestinationCity',
	BuyerState: 'finalDestinationStateOrProvince',
	BuyerPostcode: 'finalDestinationPostalCode',
	BuyerCountry: 'finalDestinationCountry',

	SalePrice: 'lineItemSumTotal',
	//CashOnDeliveryFee: 'cashOnDeliveryFee', // eBay
	TotalPrice: 'orderSumTotal',
	SaleCurrency: 'orderSumTotalCurrency',
	Postage: 'orderShippingPrice',
	PostageService: 'shippingMethod',
	DateCreated: 'createdDate',
	DateCheckout: 'checkoutDate', // eBay
	DateSold: 'saleDate', // eBay
	DatePaid: 'paidDate',
	PaymentMethod: 'PaymentMethod',
	PaymentStatus: 'orderPaymentStatus', // eBay
	TransactionID: 'paymentID',
	ClickCollect: 'clickCollect', // eBay
	ClickCollectID: 'clickCollectRefNum', // eBay
	Note: 'note',

	Items: 'items',
	ItemData: {
		SKU: 'sku',
		ItemID: 'itemID',
		Name: 'title',
		Currency: 'currency',
		Quantity: 'quantity',
		Price: 'unitPrice',
		Postage: 'shippingPrice',
		LineItemID: 'lineItemID',
		TransactionID: 'transactionID',
		VariationDetails: 'variationDetails', // eBay
	},
};

const orderConvertBigCommerce = {
	OrderID: 'id',
	RecordID: 'id',
	UserID: 'buyerID',
	BuyerFullName: ['shipping_address', 'full_name'],
	BuyerFirstName: ['shipping_address', 'first_name'],
	BuyerLastName: ['shipping_address', 'last_name'],
	PhoneNumber: ['shipping_address', 'phone'],
	Email: ['shipping_address', 'email'],
	BuyerCompany: ['shipping_address', 'conpany'],
	BuyerAddress1: ['shipping_address', 'street_1'],
	BuyerAddress2: ['shipping_address', 'street_2'],
	BuyerCity: ['shipping_address', 'city'],
	BuyerState: ['shipping_address', 'state'],
	BuyerPostcode: ['shipping_address', 'zip'],
	BuyerCountry: ['shipping_address', 'country_iso2'],

	//SalePrice: 'total', // eBay
	//CashOnDeliveryFee: 'cashOnDeliveryFee', // eBay
	TotalPrice: 'total_inc_tax',
	SaleCurrency: 'currency_code',
	Postage: 'base_shipping_cost',
	PostageService: ['shipping_address', 'shipping_method'],
	DateCreated: 'createdDate',
	//DateCheckout: 'checkoutDate', // eBay
	//DateSold: 'date_paid', // eBay
	DatePaid: 'createdDate',
	PaymentMethod: 'payment_method',
	PaymentStatus: 'payment_status', // eBay
	TransactionID: 'payment_provider_id',
	//ClickCollect: 'clickCollect', // eBay
	//ClickCollectID: 'clickCollectRefNum', // eBay
	Note: 'customer_message',

	Items: 'items',
	ItemData: {
		SKU: 'sku',
		ItemID: 'product_id',
		Name: 'name',
		//Currency: 'currency',
		Quantity: 'quantity',
		Price: 'price_inc_tax',
		//Postage: 'shippingPrice',
		LineItemID: 'id',
		//TransactionID: 'transactionID',
		VariationDetails: 'product_options',
	},
};

const orderConvertShopify = {
	OrderID: 'id',
	RecordID: 'SalesRecordID',
	UserID: 'buyerID',
	BuyerFullName: ['shipping_address', 'name'],
	BuyerFirstName: ['shipping_address', 'first_name'],
	BuyerLastName: ['shipping_address', 'last_name'],
	PhoneNumber: ['shipping_address', 'phone'],
	Email: 'email',
	BuyerCompany: ['shipping_address', 'conpany'],
	BuyerAddress1: ['shipping_address', 'address1'],
	BuyerAddress2: ['shipping_address', 'address2'],
	BuyerCity: ['shipping_address', 'city'],
	BuyerState: ['shipping_address', 'province'],
	BuyerPostcode: ['shipping_address', 'zip'],
	BuyerCountry: ['shipping_address', 'country_code'],

	//SalePrice: 'total', // eBay
	//CashOnDeliveryFee: 'cashOnDeliveryFee', // eBay
	TotalPrice: 'total_price',
	SaleCurrency: 'currency',
	Postage: 'postage',
	PostageService: 'postage_service',
	DateCreated: 'created_at',
	//DateCheckout: 'checkoutDate', // eBay
	//DateSold: 'date_paid', // eBay
	DatePaid: 'created_at',
	PaymentMethod: 'gateway',
	PaymentStatus: 'financial_status', // eBay
	TransactionID: '',
	//ClickCollect: 'clickCollect', // eBay
	//ClickCollectID: 'clickCollectRefNum', // eBay
	Note: 'note',

	Items: 'line_items',
	ItemData: {
		SKU: 'sku',
		ItemID: 'product_id',
		Name: 'name',
		//Currency: 'currency',
		Quantity: 'quantity',
		Price: 'price',
		//Postage: 'shippingPrice',
		LineItemID: 'id',
		//TransactionID: 'transactionID',
		//VariationDetails: 'meta_data', // eBay
	},
};

const orderConvertMagento = {
	OrderID: 'orderID',
	RecordID: 'SalesRecordID',
	UserID: 'buyerID',
	BuyerFullName: ['shippingAddress', 'fullname'],
	BuyerFirstName: ['shippingAddress', 'firstname'],
	BuyerLastName: ['shippingAddress', 'lastname'],
	PhoneNumber: ['shippingAddress', 'telephone'],
	Email: ['shippingAddress', 'email'],
	BuyerCompany: '',
	BuyerAddress1: ['shippingAddress', 'address1'],
	BuyerAddress2: ['shippingAddress', 'address2'],
	BuyerCity: ['shippingAddress', 'city'],
	BuyerState: ['shippingAddress', 'region_code'],
	BuyerPostcode: ['shippingAddress', 'postcode'],
	BuyerCountry: ['shippingAddress', 'country_id'],

	//SalePrice: 'total', // eBay
	//CashOnDeliveryFee: 'cashOnDeliveryFee', // eBay
	TotalPrice: 'grand_total',
	SaleCurrency: 'order_currency_code',
	Postage: 'shipping_amount',
	PostageService: 'shipping_description',
	DateCreated: 'created_at',
	//DateCheckout: 'checkoutDate', // eBay
	//DateSold: 'date_paid', // eBay
	DatePaid: 'created_at',
	PaymentMethod: '',
	PaymentStatus: '', // eBay
	TransactionID: '',
	//ClickCollect: 'clickCollect', // eBay
	//ClickCollectID: 'clickCollectRefNum', // eBay
	Note: '',

	Items: 'items',
	ItemData: {
		SKU: 'sku',
		ItemID: 'product_id',
		Name: 'name',
		//Currency: 'currency',
		Quantity: 'qty_ordered',
		Price: 'price',
		//Postage: 'shippingPrice',
		LineItemID: 'item_id',
		//TransactionID: 'transactionID',
		//VariationDetails: 'meta_data', // eBay
	},
};

const orderConvertNeto = {
	OrderID: 'orderID',
	RecordID: 'SalesRecordID',
	UserID: 'buyerID',
	PurchaseOrderID: 'PurchaseOrderNumber',
	SalesChannel: 'SalesChannel',
	BuyerFullName: 'ShipFullName',
	BuyerFirstName: 'ShipFirstName',
	BuyerLastName: 'ShipLastName',
	PhoneNumber: 'ShipPhone',
	Email: 'Email',
	BuyerCompany: '',
	BuyerAddress1: 'ShipStreetLine1',
	BuyerAddress2: 'ShipStreetLine2',
	BuyerCity: 'ShipCity',
	BuyerState: 'ShipState',
	BuyerPostcode: 'ShipPostCode',
	BuyerCountry: 'ShipCountry',

	TotalPrice: 'GrandTotal',
	//SaleCurrency: 'order_currency_code',
	Postage: 'ShippingTotal',
	PostageService: 'postage_service',
	DateCreated: 'createdDate',
	//DateCheckout: 'checkoutDate', // eBay
	//DateSold: 'date_paid', // eBay
	DatePaid: 'createdDate',
	PaymentMethod: '',
	PaymentStatus: '', // eBay
	TransactionID: '',
	//ClickCollect: 'clickCollect', // eBay
	//ClickCollectID: 'clickCollectRefNum', // eBay
	Note: '',

	CouponCode: 'CouponCode',
	CouponDiscount: 'CouponDiscount',

	Items: 'OrderLine',
	ItemData: {
		SKU: 'SKU',
		ItemID: 'itemID',
		Name: 'ProductName',
		//Currency: 'currency',
		Quantity: 'Quantity',
		Price: 'UnitPrice',
		//Postage: 'shippingPrice',
		LineItemID: 'OrderLineID',
		//TransactionID: 'transactionID',
		//VariationDetails: 'meta_data', // eBay
		CouponDiscount: 'CouponDiscount',
	},
};

const orderConvertB2B = {
	OrderID: 'orderID',
	RecordID: 'SalesRecordID',
	//ChannelID: 'channelID', // eBay
	//SellerID: 'sellerID', // eBay
	UserID: 'buyerID',
	BuyerFullName: 'finalDestinationAddressName',
	BuyerFirstName: 'buyerFirstName',
	BuyerLastName: 'buyerLastName',
	PhoneNumber: 'finalDestinationAddressPhone',
	Email: 'buyerEmail',
	BuyerAddress1: 'finalDestinationAddressLine1',
	BuyerAddress2: 'finalDestinationAddressLine2',
	BuyerCity: 'finalDestinationSuburb',
	BuyerState: 'finalDestinationStateOrProvince',
	BuyerPostcode: 'finalDestinationPostalCode',
	BuyerCountry: 'finalDestinationCountry',

	SalePrice: 'lineItemSumTotal',
	//CashOnDeliveryFee: 'cashOnDeliveryFee', // eBay
	TotalPrice: 'orderSumTotal',
	// SaleCurrency: 'orderSumTotalCurrency',
	Postage: 'orderShippingPrice',
	PostageService: 'shippingMethod',
	DateCreated: 'createdDate',
	// DateCheckout: 'checkoutDate', // eBay
	// DateSold: 'saleDate', // eBay
	// DatePaid: 'paidDate',
	PaymentMethod: 'PaymentMethod',
	PaymentStatus: 'orderPaymentStatus', // eBay
	TransactionID: 'paymentID',
	ClickCollect: 'clickCollect', // eBay
	ClickCollectID: 'clickCollectRefNum', // eBay
	Note: 'note',

	Items: 'items',
	ItemData: {
		SKU: 'sku',
		ItemID: 'itemID',
		Name: 'title',
		// Currency: 'currency',
		Quantity: 'quantity',
		Price: 'unitPrice',
		// Postage: 'shippingPrice',
		LineItemID: 'lineItemID',
		// TransactionID: 'transactionID',
		// VariationDetails: 'variationDetails', // eBay
	},
};

const orderConvertCatch = {
    OrderID: 'orderID',
    RecordID: 'SalesRecordID',
    UserID: 'buyerID',
    BuyerFullName: 'ShipFullName',
    BuyerFirstName: ['customer', 'shipping_address', 'firstname'],
    BuyerLastName: ['customer', 'shipping_address', 'lastname'],
    PhoneNumber: ['customer', 'shipping_address', 'phone'],
    Email:'',
    BuyerCompany: ['customer', 'shipping_address', 'company'],
    BuyerAddress1: ['customer', 'shipping_address', 'street_1'],
    BuyerAddress2: ['customer', 'shipping_address', 'street_2'],
    BuyerCity: ['customer', 'shipping_address', 'city'],
    BuyerState: ['customer', 'shipping_address', 'state'],
    BuyerPostcode: ['customer', 'shipping_address', 'zip_code'],
    BuyerCountry: ['customer', 'shipping_address', 'country'],

    TotalPrice: 'total_price',
    Postage: 'shipping_price',
    PostageService: 'shipping_company',
    DateCreated: 'created_date',
    DatePaid: 'customer_debited_date',
    PaymentMethod: '',
    PaymentStatus: '',
    TransactionID: '',
    Note: '',

    Items: 'order_lines',
    ItemData: {
        SKU: 'offer_sku',
        ItemID: 'offer_id',
        Name: 'product_title',
        //Currency: 'currency',
        Quantity: 'quantity',
        Price: 'price_unit',
        //Postage: 'shippingPrice',
        LineItemID: 'order_line_id',
        //TransactionID: 'transactionID',
        //VariationDetails: 'meta_data', // eBay
    },
};

const orderConvertKogan = {
    OrderID: 'orderID',
    RecordID: 'SalesRecordID',
    UserID: 'buyerID',
    BuyerFullName: 'ShipFullName',
    BuyerFirstName: ['ShippingAddress', 'FirstName'],
    BuyerLastName: ['ShippingAddress', 'LastName'],
    PhoneNumber: ['ShippingAddress', 'DaytimePhone'],
    Email: ['ShippingAddress', 'EmailAddress'],
    BuyerCompany: ['ShippingAddress', 'CompanyName'],
    BuyerAddress1: ['ShippingAddress', 'AddressLine1'],
    BuyerAddress2: ['ShippingAddress', 'AddressLine2'],
    BuyerCity: ['ShippingAddress', 'City'],
    BuyerState: ['ShippingAddress', 'StateOrProvince'],
    BuyerPostcode:['ShippingAddress', 'PostalCode'],
    BuyerCountry: ['ShippingAddress', 'Country'],

    TotalPrice: 'TotalPrice',
    Postage: 'TotalShippingPrice',
    PostageService: 'ShippingLabelURL',
    DateCreated: 'OrderDateUtc',
    DatePaid: '',
    PaymentMethod: 'PaymentMethod',
    PaymentStatus: '',
    TransactionID: 'PaymentTransactionID',
    Note: '',

    Items: 'Items',
    ItemData: {
        SKU: 'SellerSku',
        ItemID: 'SellerSku',
        Name: 'ProductTitle',
        //Currency: 'currency',
        Quantity: 'Quantity',
        Price: 'UnitPrice',
        //Postage: 'shippingPrice',
        LineItemID: 'ID',
        //TransactionID: 'transactionID',
        //VariationDetails: 'meta_data', // eBay
    },
};

const commonData = (orderData, store) => {
	if (typeof orderData !== 'object') {
		orderData = JSON.parse(orderData);
	}
	let CD = getConversionData(store);
	let newData = {};
	for (let cdField in CD) {
		let field = getField(orderData, CD[cdField]);
		if (field !== null) newData[cdField] = field;
	}

	// Items
	let newItemData = [];
	for (let item of orderData[CD.Items]) {
		let itemEntry = {};
		for (let cdField in CD.ItemData) {
			let field = getField(item, CD.ItemData[cdField]);
			if (field !== null) itemEntry[cdField] = field;
		}
		newItemData.push(itemEntry);
	}
	newData.Items = newItemData;

	return newData;
}

const getConversionData = (store) => {
	let data = null;
	let serviceID = Config.STORES[store] ? Config.STORES[store].service : null;
	if (serviceID == Config.SERVICE_IDS.EBAY || serviceID == Config.SERVICE_IDS.EBAYAPI || serviceID == Config.SERVICE_IDS.NEWSERVICE) {
		data = orderConvertEbay;
	}
	else if (serviceID == Config.SERVICE_IDS.AMAZON) {
		data = orderConvertAmazon;
	}
	else if (serviceID == Config.SERVICE_IDS.WOOCOMMERCE) {
		data = orderConvertWooCommerce;
	}
	else if (serviceID == Config.SERVICE_IDS.GROUPON) {
		data = orderConvertGroupon;
	}
	else if (serviceID == Config.SERVICE_IDS.MYDEAL) {
		data = orderConvertMydeal;
	}
	else if (serviceID == Config.SERVICE_IDS.CHARLICHAIR) {
		data = orderConvertCharliChair;
	}
	else if (serviceID == Config.SERVICE_IDS.BIGCOMMERCE) {
		data = orderConvertBigCommerce;
	}
	else if (serviceID == Config.SERVICE_IDS.SHOPIFY) {
		data = orderConvertShopify;
	}
	else if (serviceID == Config.SERVICE_IDS.MAGENTO) {
		data = orderConvertMagento;
	}
	else if (serviceID == Config.SERVICE_IDS.NETO) {
		data = orderConvertNeto;
	}
	else if (serviceID == Config.SERVICE_IDS.B2B) {
		data = orderConvertB2B;
	}
	else if (serviceID == Config.SERVICE_IDS.CATCH) {
        data = orderConvertCatch;
    }
    else if (serviceID == Config.SERVICE_IDS.KOGAN) {
        data = orderConvertKogan;
    }
	
	return data;
}

const getConversionDataByService = (serviceID) => {
	let data = null;
	if (serviceID == Config.SERVICE_IDS.EBAY || serviceID == Config.SERVICE_IDS.EBAYAPI || serviceID == Config.SERVICE_IDS.NEWSERVICE) {
		data = orderConvertEbay;
	}
	else if (serviceID == Config.SERVICE_IDS.AMAZON) {
		data = orderConvertAmazon;
	}
	else if (serviceID == Config.SERVICE_IDS.WOOCOMMERCE) {
		data = orderConvertWooCommerce;
	}
	else if (serviceID == Config.SERVICE_IDS.GROUPON) {
		data = orderConvertGroupon;
	}
	else if (serviceID == Config.SERVICE_IDS.MYDEAL) {
		data = orderConvertMydeal;
	}
	else if (serviceID == Config.SERVICE_IDS.CHARLICHAIR) {
		data = orderConvertCharliChair;
	}
	else if (serviceID == Config.SERVICE_IDS.BIGCOMMERCE) {
		data = orderConvertBigCommerce;
	}
	else if (serviceID == Config.SERVICE_IDS.SHOPIFY) {
		data = orderConvertShopify;
	}
	else if (serviceID == Config.SERVICE_IDS.MAGENTO) {
		data = orderConvertMagento;
	}
	else if (serviceID == Config.SERVICE_IDS.NETO) {
		data = orderConvertNeto;
	}
	else if (serviceID == Config.SERVICE_IDS.B2B) {
		data = orderConvertB2B;
	}
	else if (serviceID == Config.SERVICE_IDS.CATCH) {
        data = orderConvertCatch;
    }
    else if (serviceID == Config.SERVICE_IDS.CIN7) {
        data = orderConvertCin7;
    }
    else if (serviceID == Config.SERVICE_IDS.KOGAN) {
        data = orderConvertKogan;
    }
	
	return data;
}

const getField = (order, fields) => {
	if (!Array.isArray(fields)) fields = [fields];
	let data = order;
	for (let field of fields) {
		//console.log(field, ', ', data[field]);
		data = data[field];
		if (data === undefined) return null;
	}
	return data;
}


const orderToRecord = (orderRow) => {
	let order = JSON.parse(orderRow.data);
	let TD = getConversionData(orderRow.store); // Translation method data
	if (!TD) return null;

	let recordData = {
		DatabaseID: orderRow.id,
		DeliveryNote: orderRow.deliveryNote || null,
		RecordNum: getField(order, TD.OrderID).toString(),
		OrderID: getField(order, TD.OrderID).toString(),
		SalesRecordID: (getField(order, TD.RecordID) || getField(order, TD.OrderID)).toString(),
		PurchaseOrderID: getField(order, TD.PurchaseOrderID),
	    SalesChannel: getField(order, TD.SalesChannel),
	    CouponCode: getField(order, TD.CouponCode),
	    CouponDiscount: getField(order, TD.CouponDiscount),
		//ChannelID: getField(order, TD.ChannelID) || null, // Used to detect orders from MIP (only MIP provides this)
		UserID: getField(order, TD.UserID),
		BuyerFullName: TD.BuyerFullName ? getField(order, TD.BuyerFullName) : getField(order, TD.BuyerFirstName)+' '+getField(order, TD.BuyerLastName),
		PhoneNum: getField(order, TD.PhoneNumber),
		Email: getField(order, TD.Email),
		BuyerCompany: getField(order, TD.BuyerCompany),
		BuyerAddress1: getField(order, TD.BuyerAddress1),
		BuyerAddress2: getField(order, TD.BuyerAddress2),
		BuyerCity: getField(order, TD.BuyerCity),
		BuyerState: getField(order, TD.BuyerState),
		BuyerPostCode: getField(order, TD.BuyerPostcode),
		BuyerCountry: getField(order, TD.BuyerCountry),

		SalePrice: getField(order, TD.SalePrice),
		Postage: getField(order, TD.Postage),
		//CashOnDeliveryFee: getField(order, TD.CashOnDeliveryFee) || null,
		TotalPrice: getField(order, TD.TotalPrice),
		PaymentMethod: getField(order, TD.PaymentMethod) || null,
		SaleDate: dateIsoToEbay(getField(order, TD.DateSold) || getField(order, TD.DateCreated), Config.TIMEZONE),
		CheckoutDate: dateIsoToEbay(getField(order, TD.DateCheckout) || getField(order, TD.DateCreated), Config.TIMEZONE),
		PaidDate: dateIsoToEbay(getField(order, TD.DatePaid) || getField(order, TD.DateCreated), Config.TIMEZONE),
		//PostDate: dateIsoToEbay(getField(order, TD.DatePosted] || getField(order, TD.DateCreated), Config.TIMEZONE),

		NotesToSelf: getField(order, TD.Note),
		PaypalTransID: getField(order, TD.TransactionID),
		PostService: postageServiceName(getField(order, TD.PostageService)) || getField(order, TD.PostageService),
		ClickCollect: !!(getField(order, TD.ClickCollectID) || getField(order, TD.BuyerAddress1).startsWith('CnC ') || (getField(order, TD.BuyerAddress2) ? getField(order, TD.BuyerAddress2).startsWith('eCP:') : false)),
		ClickCollectRefNum: getField(order, TD.ClickCollectID) || getField(order, TD.BuyerAddress1).startsWith('CnC ') || (getField(order, TD.BuyerAddress2) ? getField(order, TD.BuyerAddress2).startsWith('eCP:') : false),
		//OrderLineID: getField(order, TD.OrderID) || null,
		Items: [],
	};

	// Items
	for (let item of getField(order, TD.Items)) {
		let itemData = {
			SKU: getField(item, TD.ItemData.SKU) || null,
			ItemTitle: getField(item, TD.ItemData.Name),
			ItemNum: getField(item, TD.ItemData.ItemID),
			Quantity: getField(item, TD.ItemData.Quantity),
			SalePrice: getField(item, TD.ItemData.Price),
			TransID: getField(item, TD.ItemData.TransactionID),
			VariationDetails: '',
			partialrefund: item.partialrefund,
			AlterItem: item.alterItem,
			ReplacedItem: item.replacedItem,
			scannedQty: item.scannedQty,
			CouponDiscount: item.CouponDiscount,
		}

		let variationDetails = getField(item, TD.ItemData.VariationDetails);
		if (variationDetails !== null && variationDetails.length) {
			if (TD == orderConvertWooCommerce) {
				let data = {};
				for (let entry of variationDetails) {
					data[entry.key] = entry.value;
				}
				itemData.VariationDetails = data;
			}
			else {
				itemData.VariationDetails = variationDetails;
			}
		}

		if (getField(item, TD.ItemData.LineItemID)) itemData.LineItemID = getField(item, TD.ItemData.LineItemID);
		if (getField(item, TD.ItemData.Postage)) itemData.ShippingPrice = getField(item, TD.ItemData.Postage);

		recordData.Items.push(itemData);
	}

	return recordData;
};

module.exports = {commonData, getConversionData, getField, orderToRecord, getConversionDataByService};
