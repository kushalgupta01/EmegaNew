import { apiServer, apiServerLocal } from '/common/api-server.js';

window.apiServer = apiServer;
window.apiServerLocal = apiServerLocal;

if (window.location.hostname.startsWith('192.168')) {
    window.apiServer = apiServerLocal;
}

var ETERMINAL = 1,
    SOSHydration = 2,
    SCRUBDADDY = 3,
    IDIRECT = 4,
    //MICROSOFT = 5,
    SPWAREHOUSE = 6,
    KOBAYASHI = 7,
    HOBBYCO = 8,
    HabitaniaeBay = 9,
    //Groupon = 11,
    //Mydeal = 12,
    CATWALK = 15,
    SONSOFAMAZON = 16,
    NEWSTORE = 21,
    CombinedGroup = 30,
    Kitncaboodle = 31,
    Packingsorted = 32,
    Roofstuff = 33,
    ANKAMe = 34,
    CleanHQ = 35,
    EvoBuild = 36,
    BHANDG = 37,
    Amazon = 41,
    EmegaMagento = 51,
    CharliChair = 61,
    WaterWipes = 62,
    Habitania = 63,
    SonsofamazonShopify = 64,
    Trinityconnectshopify = 65,
    Hobbycowebsite = 71,
    Hobbycokogan = 74,
    Trinityconnectkogan = 75,
    Hobbycob2bwholesale = 81,
    Hobbycob2btransfer = 82,
    Hobbycocatch = 91,
    Trinityconnectcatch = 92,
    Emegacatch = 93,
    Autowell = 101,
    Circular2nds = 102,
    Fiestaelectronics = 103,
    Eliabathrooms = 104,
    Spartan = 105,
    Atpack = 106;

window.stores = {};

window.stores[ETERMINAL] = {
    id: 'eterminal',
    name: 'OzPlaza',
    storeID: 'EM',
    recID: 'EM-',
};

window.stores[IDIRECT] = {
    id: 'idirect',
    name: 'IDirect',
    storeID: 'ID',
    recID: 'ID-',
};

/*window.stores[MICROSOFT] = {
    id: 'microsoft',
    name: 'MICROSOFT',
    storeID: 'MI',
    recID: 'MI-',
};*/

window.stores[SPWAREHOUSE] = {
    id: 'spwarehouse',
    name: 'SPWAREHOUSE',
    storeID: 'SP',
    recID: 'SP-',
};

window.stores[SCRUBDADDY] = {
    id: 'scrubdaddy',
    name: 'Scrub Daddy',
    storeID: 'SD',
    recID: 'SD-',
};

window.stores[SOSHydration] = {
    id: 'sos',
    name: 'SOSHydration',
    storeID: 'SOS',
    recID: 'SOS-',
};

window.stores[KOBAYASHI] = {
    id: 'kobayshi',
    name: 'Kobaysahi',
    storeID: 'KB',
    recID: 'KB-',
};

window.stores[HOBBYCO] = {
    id: 'hobbyco',
    name: 'Hobbyco',
    storeID: 'HO',
    recID: 'HO-',
};

window.stores[HabitaniaeBay] = {
    id: 'habitaniaebay',
    name: 'HabitaniaeBay',
    storeID: 'HABE',
    recID: 'HABE-',
};

/*window.stores[Groupon] = {
    id: 'groupon',
    name: 'Groupon',
    storeID: 'GO',
    recID: 'GO-',
};

window.stores[Mydeal] = {
    id: 'mydeal',
    name: 'Mydeal',
    storeID: 'MD',
    recID: 'MD-',
};*/

window.stores[CharliChair] = {
    id: 'charlichair',
    name: 'Charli Chair',
    storeID: 'CC',
    recID: 'CC-',
};

window.stores[Habitania] = {
    id: 'habitania',
    name: 'Habitania',
    storeID: 'HAB',
    recID: 'HAB-',
};

window.stores[WaterWipes] = {
    id: 'waterwipes',
    name: 'WaterWipes',
    storeID: 'WP',
    recID: 'WP-',
};

window.stores[NEWSTORE] = {
    id: 'newstore',
    name: 'New Store',
    storeID: 'NS',
    recID: 'NS-',
};

window.stores[CombinedGroup] = {
    id: 'combinedgroup',
    name: 'CombinedGroup',
    storeID: 'CG',
    recID: 'CG-',
};

window.stores[Kitncaboodle] = {
    id: 'kitncaboodle',
    name: 'Kitncaboodle',
    storeID: 'KI',
    recID: 'KI-',
};

window.stores[Packingsorted] = {
    id: 'packingsorted',
    name: 'Packing Sorted',
    storeID: 'PS',
    recID: 'PS-',
};

window.stores[Roofstuff] = {
    id: 'roofstuff',
    name: 'RoofStuff',
    storeID: 'RS',
    recID: 'RS-',
};

window.stores[ANKAMe] = {
    id: 'ankame',
    name: 'ANKAMe',
    storeID: 'AN',
    recID: 'AN-',
};

window.stores[CleanHQ] = {
    id: 'cleanHQ',
    name: 'CleanHQ',
    storeID: 'CH',
    recID: 'CH-',
};

window.stores[EvoBuild] = {
    id: 'evobuild',
    name: 'Evo Build',
    storeID: 'EB',
    recID: 'EB-',
};

window.stores[BHANDG] = {
    id: 'bhandg',
    name: 'BH&G',
    storeID: 'BHG',
    recID: 'BHG-',
};

window.stores[Amazon] = {
    id: 'amazon',
    name: 'Amazon',
    storeID: 'AM',
    recID: 'AM-',
};

window.stores[EmegaMagento] = {
    id: 'emm',
    name: 'Emega Magento',
    storeID: 'MA',
    recID: 'MA-',
};

window.stores[Hobbycowebsite] = {
    id: 'how',
    name: 'Hobbyco Website',
    storeID: 'HOW',
    recID: 'HOW-',
};

window.stores[Hobbycob2bwholesale] = {
    id: 'hob2bw',
    name: 'Hobbyco B2B Wholesale',
    storeID: 'HOBW',
    recID: 'HOBW-',
};

window.stores[Hobbycob2btransfer] = {
    id: 'hob2bt',
    name: 'Hobbyco B2B Transfer',
    storeID: 'HOBT',
    recID: 'HOBT-',
};

window.stores[Hobbycocatch] = {
    id: 'hoc',
    name: 'Hobbyco Catch',
    storeID: 'HOC',
    recID: 'HOC-',
};

window.stores[Emegacatch] = {
    id: 'emc',
    name: 'Emega Catch',
    storeID: 'EMC',
    recID: 'EMC-',
}

window.stores[CATWALK] = {
    id: 'cw',
    name: 'Catwalk',
    storeID: 'CW',
    recID: 'CW-',
};

window.stores[Hobbycokogan] = {
    id: 'hok',
    name: 'Hobbyco Kogan',
    storeID: 'HOK',
    recID: 'HOK-',
};

window.stores[SonsofamazonShopify] = {
    id: 'SOAS',
    name: 'Sons Of Amazon Shopify',
    storeID: 'SOAS',
    recID: 'SOAS-',
};

window.stores[Autowell] = {
    id: 'AW',
    name: 'Autowell',
    storeID: 'AW',
    recID: 'AW-',
};

window.stores[Trinityconnectkogan] = {
    id: 'trinityconnectkogan',
    name: 'Trinityconnectkogan',
    storeID: 'TCK',
    recID: 'TCK-',
};

window.stores[Trinityconnectcatch] = {
    id: 'trinityconnectcatch',
    name: 'Trinityconnectcatch',
    storeID: 'TCC',
    recID: 'TCC-',
};

window.stores[Trinityconnectshopify] = {
    id: 'trinityconnectshopify',
    name: 'Trinityconnectshopify',
    storeID: 'TCS',
    recID: 'TCS-',
};

window.stores[Circular2nds] = {
    id: 'circular2nds',
    name: 'Circular2nds',
    storeID: 'C2',
    recID: 'C2-',
};

window.stores[Fiestaelectronics] = {
    id: 'fiestaelectronics',
    name: 'Fiestaelectronics',
    storeID: 'FE',
    recID: 'FE-',
};

window.stores[Eliabathrooms] = {
    id: 'eliabathrooms',
    name: 'Eliabathrooms',
    storeID: 'EL',
    recID: 'EL-',
};

window.stores[Spartan] = {
    id: 'spartan',
    name: 'Spartan',
    storeID: 'SPA',
    recID: 'SPA-',
};

window.stores[SONSOFAMAZON] = {
    id: 'sonsofamazon',
    name: 'sonsofamazon',
    storeID: 'SOA',
    recID: 'SOA-',
};

window.stores[Atpack] = {
    id: 'atpack',
    name: 'Atpack',
    storeID: 'AP',
    recID: 'AP-',
};

// var apiUrl = '//api.local.discountchemist.com.au/api/';
var apiUrl = window.apiServer;

//console.log(apiUrl);

window.apiUrls = {
    getNextUrl: apiUrl + "getnextrecord",
    loadOrdersUrl: apiUrl + "orders/load",
    getEntireOrderUrl: apiUrl + "getentireorder",
    getItemDetailsUrl: apiUrl + "items/get",
    changeStatusUrl: apiUrl + "changestatus",
    toCollectingUrl: apiUrl + "tocollecting",
    changeTypeUrl: apiUrl + "changetype",
    getStatsUrl: apiUrl + "getpackingstats",
    loginUrl: apiUrl + "users/login",
    saveTrackingUrl: apiUrl + "savetracking",
    getBundleItemsUrl: apiUrl + "bundleitems/get",
    updateStockUrl: apiUrl + "stock/update",
    pictureUrl: apiUrl.replace('api', 'pictures'),
    getOrdersLeftUrl: apiUrl + 'getordersleft'
};

window.apiOptions = {
    loadOrders: {
        //storeS: "store=all",
        //statusS: "status[]=10&status[]=2&status[]=9"
        statusS: "status=10&status=2&status=9"
    },
    packingManage: {
        storeS: "store=all"
    }
};

window.ORDER_STATUS = {
    NOT_COLLECTED: 0,
    COLLECTED: 1,
    IN_PROGRESS: 2,
    PACKED: 3,
    OUT_OF_STOCK: 4,
    CANCELLED: 7,
    OVERRIDE: 8,
    DO_ORDER_LATER: 9,
    READY_TO_PACK: 10
};

window.PACKING_TYPE = [{
        type: 1,
        name: "Fastway Couriers",
        nameShort: "Fastway"
    }, {
        type: 2,
        name: "Australia Post",
        nameShort: "Auspost"
    }, {
        type: 8,
        name: "Fastway Flatpack",
        nameShort: "Fastway Flatpack"
    }, {
        type: 9,
        name: "Fastway Flatpack 1kg",
        nameShort: "Fastway Flatpack 1kg"
    }
    ,/* {
        type: 11,
        name: "Fastway Brown",
        nameShort: "Fastway Brown"
    }, */
    {
        type: 12,
        name: "Fastway 5kg+",
        nameShort: "Fastway 5kg+"
    },{
        type: 15,
        name: "DeliverE",
        nameShort: "DeliverE"
    },{
        type: 3,
        name: "Flatpack",
        nameShort: "Flatpack"
    }, {
        type: 4,
        name: "International",
        nameShort: "International"
    }, {
        type: 5,
        name: "Express",
        nameShort: "Express"
}];

window.DONE_SCREEN_IMAGES_URL = 'img/';

window.DONE_SCREEN_IMAGES = [
    DONE_SCREEN_IMAGES_URL + 'fireworks.gif'
];

window.PACKING_SCREEN_URL = 'packing.html';
window.MENU_SCREEN_URL = '../../index.html';
window.PACKING_SCAN_URL = 'packscan.html';

window.USER_TYPE = {
    ADMIN: 1,
    USER: 2,
};

window.IMAGE_SET_HEIGHT = 300;

// Flat-pack symbols
window.fpSymbols = { 'ツ': true, '?': true, '~': true, '*': true };
window.DATE_SET_BACK = 180;
//window.OVERRIDE_BARCODE = 'instant';
window.OVERRIDE_BARCODE = 'xZ5aWwTG';