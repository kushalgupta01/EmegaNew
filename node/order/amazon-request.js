// Discount Chemist
// Order System

// WooCommerce client



const AmazonMwsClient = require('./amazon-client');

const AMWS = new AmazonMwsClient(
    'AKIAIB4QMAZP5QLNYGWQ',
    'A1eGMPBg1BtIThh5LfWd0qBv62ee59+CJeTylVwk',
    'A2BQT5PTOSA3P7',
    {
        host: 'mws.amazonservices.com.au',
        mwsAuthToken: 'amzn.mws.8ab1ebc1-3600-c886-a1e5-b5cbea6462fe'
    }
);

class AmazonMwsRequest {
    RequestReport(params) {
        var validParams = {
            ReportType: { required: true },
            StartDate: { required: false },
            EndDate: { required: false },
            ReportOptions: { required: false },
        };
        if (!AmazonMwsRequest.hasValidParams(params, validParams)) {
            throw new Error('RequestReport: Invalid Parameters.');
        }

        return AMWS.call(
            { path: '/Reports/2009-01-01', version: '2009-01-01' },
            'RequestReport',
            params
        );
    }

    GetReportRequestList(params) {
        var validParams = { // true; required. false; not required.
            ReportRequestIdList: { required: false, list: 'Id' },
            ReportTypeList: { required: false, list: 'Type' },
            ReportProcessingStatusList: { required: false, list: 'Status' },
            MaxCount: { required: false },
            RequestedFromDate: { required: false },
            RequestedToDate: { required: false },
        };
        if (!AmazonMwsRequest.hasValidParams(params, validParams)) {
            throw new Error('RequestReport: Invalid Parameters.');
        }

        return AMWS.call(
            { path: '/Reports/2009-01-01', version: '2009-01-01' },
            'GetReportRequestList',
            params
        );
    }

    GetReportList(params) {
        var validParams = { // true; required. false; not required.
            MaxCount: false,
            ReportTypeList: false,
            Acknowledged: false,
            ReportRequestIdList: false,
            AvailableFromDate: false,
            AvailableToDate: false
        };
        if (!AmazonMwsRequest.hasValidParams(params, validParams)) {
            throw new Error('RequestReport: Invalid Parameters.');
        }

        return AMWS.call(
            { path: '/Reports/2009-01-01', version: '2009-01-01' },
            'GetReportList',
            params
        );
    }

    GetReport(params) {
        var validParams = {
            ReportId: false
        }
        if (!AmazonMwsRequest.hasValidParams(params, validParams)) {
            throw new Error('RequestReport: Invalid Parameters.');
        }

        return AMWS.call(
            { path: '/Reports/2009-01-01', version: '2009-01-01' },
            'GetReport',
            params
        );
    }

    static hasValidParams(params, validParams) {
        // Check to see if keys in params exist in validParams
        for (let key in params) {
            if (!validParams.hasOwnProperty(key)) {
                return false;
            } else if (validParams[key].hasOwnProperty('list')) {
                if (params[key] ) {}
            }
        }
        // Check if required keys in validParams exist in params
        for (let key in validParams) {
            if (validParams[key].required === true) {
                if (params[key] == null) {
                    return false;
                }
            }
        }
        return true;
    }
}

module.exports = AmazonMwsRequest;
