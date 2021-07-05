
// Config

const fs = require('fs');
const json = require('json5');
const DBConfig = require('./dbconfig');

var Config = {
	configFile: __dirname+'/config.json',
	TIMEZONE: 'UTC', // Default

	ACCESS_TOKEN_HEADER: 'DC-Access-Token',
	EBAY_MIP_SETTINGS: {
		host: 'mip.ebay.com',
		port: 22
	},

	// Services
	SERVICE_IDS: {
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
		KOGAN: 15,
	},
	SERVICES: {
		'1': {
			id: 'ebay',
			name: 'eBay'
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
			name: 'NewService'
		},
		'7': {
			id: 'ebayapi',
			name: 'EbayApi'
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
		'15': {
			id: 'kogan',
			name: 'Kogan'
		},
	},

	SUPPLIER_IDS: {
		NonSupplier: 1,
	    CharliChair: 2,
		COMBINEDGROUP: 5,
		HOBBYCO: 7,
		Habitania: 8,
		CATWALK: 9,
		SONSOFAMAZON: 10,
		AUTOWELL: 11,
		TRINITYCONNECT: 12,
		RRV: 13,
		EMEGA: 14,
		ATPACK: 15,
		PACOJAANSON: 16,
	},

	SUPPLIERS: {
		'2': {
			stores: ['61'],
		},
		'5': {
			stores: ['31','32','33','35','36','37'],
		},
		'7': {
			stores: ['8','71','91','74','81','82'],
		},
		'8': {
			stores: ['9','63'],
		},
		'9': {
			stores: ['15'],
		},
		'10': {
			stores: ['64','16'],
		},
		'11': {
			stores: ['101'],
		},
		'12': {
			stores: ['75','92', '65', '4', '103'],
		},
		'13': {
			stores: ['1','102'],
		},
		'14': {
			stores: ['1','51','93'],
		},
		'15': {
			stores: ['106'],
		},
		'16': {
			stores: ['1'],
		},
		
	},

	// Stores
	STORE_IDS: {},
	STORES: {},

	// Postage couriers
	POSTAGE_COURIER_IDS: {
		FASTWAY: 1,
		AUSPOST: 2,
	},
	POSTAGE_COURIERS: {
		'1': { // eBay
			'1': 'Fastway Couriers',
			'2': 'Australia Post'
		},
		'2': { // Amazon
			'1': 'Fastway Couriers',
			'2': 'Australia Post'
		},
		'3': { // WooCommerce
			'1': 'Fastway Couriers',
			'2': 'Australia Post'
		},
		'8': { // BigCommerce
			'1': 'fastway-au',
			'2': 'australia-post'
		},
		'9': { // Shopify
			'1': 'Fastway Australia',
			'2': 'Australia Post'
		},
		'10': { // magento
			'1': 'Fastway Couriers',
			'2': 'Australia Post'
		},
		'11': { // magento
			'1': 'PARCEL POST + SIGNATURE',
			'2': 'PARCEL POST + SIGNATURE'
		},
		'12': { // b2b
			'1': 'Fastway Couriers',
			'2': 'Australia Post'
		},
		'13': { // Catch
            '1': 'Fastway Couriers',
            '2': 'Australia Post'
        },
        '15': { // Kogan
            '1': 'Fastway',
            '2': 'Australia Post'
        },
	},

	// Management
	USER_MANAGEMENT_PW: null,
	USER_TYPE: {
		ADMIN: 1,
		USER: 2,
		SUPPLIER: 3,
		DISABLED: 4,
		CLIENT: 5,
	},

	props: {
		// These property names will be copied as properties of Config
		STORE_IDS: 'store_ids',
		STORES: 'stores',
		TIMEZONE: 'timezone',
		USER_MANAGEMENT_PW: 'user_management_pw',
	},

	PACKING: {
		MINUTES_RELATIVE_TO_UTC: 720, // 10 Hours
		TIMEOUT: 20 // In minutes
	},

	ebayAPI: {
		appID: 'Xiaochua-php-PRD-7f8fe589d-efab0546',
		devID: 'ed491a72-b398-462c-a106-0feda6a0ba96',
		certID: 'PRD-f8fe589d0d8c-1551-4606-a2cc-acd9',
		siteID: 15,
		tokens: {
			1: 'AgAAAA**AQAAAA**aAAAAA**ZKtrYA**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6AGkoChDpCGoQ2dj6x9nY+seQ**dMgEAA**AAMAAA**P1r/yxR/Yy3Z8TyR3rC8Wdpvio9BDaDAMNUqx4vp96bvtwhCA+So6jKPhdBQQF2FdLMYrMbmDVFzxS5Rz4l83KQ9J199mCrEVxexbwbShsz88cu+Pgw/ZWqenHCZ0iD46KhBI7rLyP8OawwQbW1WT3p0BTEJGpbf+YCKCOhXXFEuj0/+E0T42xKoGs5wQtPksspSflv7O5iwGSXRgW6lOGILXXgWzg6zW8p4NFbK0EBHzjAN2gt7+udwQNXOQqZgoaeatgGadJ/0QedYdKLLTsK6UxMQLglvT7G5rr13P3e4zpOK0rv3gOmvRvN5BWGLj3BoViikU67ItV1HM6gH27D0u4MHtpZFLZ7Nd8Oa55/qWlcZYK7BUVZIYlfkZpJjOh5cl8zOHXEbHerqH43NyM/DS48qytF1SMeckdVzsC12YCEg3DJK+6MxTpRRQjYIH3poZpm1ugvs/TG0ViMbUesVtgQPsZSMDg4vGB3lYFtk9oV3SDdw58PMDIPPjQP2ojjKMeh9boadHhahDMEkIamV5favfNK4Z2aZOdukgePXU7J8+K9A7GrTXYqPSVKHVk7OicTStNG/PTxNIjaW4+qFONdSM2hfKkIjBFU+zUU0N0uAaxFmJdBPkvE/OxNlRNr58U26I62yQicT/02r//YpFKueZRxCjjPaEgrUzsKMxTYiNmYwcFIYwQFLVzWue0zZQPr2VHTplXKX7cPVIqSfAwlndHMQd7IM6FxWtlJVybxXFpPwPPRX8AMgKBZR',
			3: 'AgAAAA**AQAAAA**aAAAAA**IhK0XA**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6AFl4ugDpmKpg2dj6x9nY+seQ**dMgEAA**AAMAAA**1h0SnDLynzKkVEqW0YKaDSdiCGlaKqssLQmVb8oa7dZssOIU9otYrpCMmdLdjIddNSTSrbNGOaMCPeZvzCXQaboxSAzBVzXE9SZl5GdXdJLXE/Nc9Owv7hFEE70OkNr8i00UzqGeJUvcgH78tIV3wf8n89vmJ8Yc/VJQxSvUlB9Oe3O/CJUwlctMEqmkEHWaNrOrQ8/07fGdyAE1rcMZEMRg11HQvl125IISNVK5u20qD6hM7LUs1TZorFRvQXEQORO24+ewHXQ/28BJvhSxVKYUkuggGTsfJKzuNr4NKqKvJilkqwTw2pkIjDwjfHyolWx8nyQ9lo62jEZFihGuot5crQ3w+1sY+AgzCx8TjTgqEMwoHDIBrCmbmG93rqXcV5HNEjkS489nGcuzbDf6VRjNvib1RIyv1q2aXQJeT3spfs8xiituW622Nkc/YTMIC6qKlV03/a1zhR0ok3hsfC5MTDowL6iGw2VTRrLso1QcAi2z1Tbp2O8uPxghHpiQNCYisHauNAc04maN+WRFgFWUILuVHOXzoBVZcxc2jfQVUHQ7vwcOBDhnzbCpDDDoLwST25Bmea2glql/C1ovSnRV3rkQ5lHVAN52TeXKrR/+zISyK1CT0aKlHfGarCt1UOLiUdKW5mGIUB1SiSfAZe00XRYBj+U+8SfCYyEEOicmyAn2BcgYj9WpZUhN6Dh3rSzoKdWMda5PR6KTqgygPKDojYwoNRWQtk+jrMJkWyAIBmIH8RV3FM3Uw+/tMvlI',
			4: 'AgAAAA**AQAAAA**aAAAAA**zyY3YA**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6AHloWjDJOHogydj6x9nY+seQ**dMgEAA**AAMAAA**qGc3Mvgs6HECJ3hhWKg6NsVvu0SnnQQzi/U1GJQ1uyONAnJ03/51AwPRK5dkaD5Wb2yCXG5SIAGSJ4SLJQpSaOFC7S1afcGXK98KI+0cSZyBXkcZXdfOUQj5FaU/srVOCagNEWMUril0cnhKqVnTXTz3ckehp5cXFdPhs4dJr4PPmnU1dQoAFEosCZxME8K2MNm/ygKo7TCBh3MCsQBgkq7KItywoWmjkBn+675pXhAuDmndCzY85KiLKq4ED203LFOr+WLf3GCD0cm+42iX15WvBuByaMJeYfya74kolwJT1jTxGqV4A5TFqXTyvKY8YEMT/h5jzrtlRyrRmYkoEC6n6Cc+viLGJ7o736ytIcaDIRhE2w59jaQq5K8r1W5RxDO4SB2f0zQ3wRtdvp0+L+8LWoGUwR3we48yZGzJ/EbwkhoF+3mphl7Vf70R8oV6uunNbhIsmsOasK6z3alzru6Eikr21JxDA97WlqooZ2rqMf2J2vjcxj77hm9sxYI4Mcykby0XhDxr4MtTfuBBQPB8vlyQxSH5h8O+HQCXy939jHvhgofO023YSqnES84uFkLX8BGqlJPywzuMU9CcYFqEFY30XJoF6KQqF/eohRJI4ALtJ7EhxcQUhqeAQCsSAjAen7uCYBgGfKnE1oD/BlXBr/49Vsp74QTixw2mupU+N5uvFRc5iLEIxSewVqOoO9v3mcObphleZFtN6vfQE7rJ9/ZOgx/Aw+bMhu3ywUzYRogMVH/J9b4qXevdOpTk',
			5: 'AgAAAA**AQAAAA**aAAAAA**xs4rXQ**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6AFkYSgDJeEqQ6dj6x9nY+seQ**dMgEAA**AAMAAA**G3W/jGoEV1I80wwspYY0wFCquxOW/NROSOMjGVl2zlr9BrxCDA0RlkMuI5HFFPHF+3sGeBqwmvUa0bQRHYHDVnUdGjV81hGh8ou9PHlSBoHaHJKlz7ISyBJINEkitD2w9dD7KfZHwl0aom7ycrdovOu7rk9gSJffbU4JGEJu+Wzd+YEmGi+i232uLeBSBUzbQuwHhvUkN/pp/g0kKd+6yUj0uBOO1eh6rs2cj8ZnxFHsENAUiQCS+CBUQKl6u3AE4gIysZkvmoJXMHFscsLQC3J/LLFcIfwJ7tGuNtyN511lyiJWt8mZ1BSM3Y+QulkNLjRSw9qcHifo2bQmWY2P9sBxQMImLZodPrejEq7qaY0jq94GQ0xETiUYdhQaze4EZzW/GXPh2RqhO0DNE5UynQtFNT4GoacVVe7aUY9DwTSpFtyejPbQDdhBJC+mnX5nGHRPBbsuiLvANb1Qq7Jkk60DANLG4HxRIjc/Xs5DemhktVElZP3LmPS2jmRqcIMPBrBve/u2TkrQPTu3MIS3EtSe7EhG0AXYQEHUk1p9+rzK64Nk/bFQBpwmskEv81pT55Mibq+t2QALzJgiOK9acwIt6yeulz6zxklouDWJltPNetuSnlLfh7CX+PL6WhdxL7JZzmKSxW9qff1XL07DNKi5s4Qrbc/3vsh0W2D094PO1C1UTLzxPIrbjB37IaElb1UudCfTosZcxtRfD1/wFThT6HMFqgmqxKINrRgX4uufKggxxojwdgV8Bswajq+k',
			//5: 'AgAAAA**AQAAAA**aAAAAA**j3JkXQ**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6AMl4WhC5CHpASdj6x9nY+seQ**dMgEAA**AAMAAA**vHUdXGFY69yAiSGYHtQennjqVZgR9nMjTkS6uBh/I4zYOIRLuFCYO+v93FZGW56+EoevM63frvd4EBah38dz4HLP9HmyhTVl9w0k8moOOKMiGbKNM7VC4quuulycy5BO0Do2wi0shnMWUtxsLjjVCt+1JAqKgRhuduJrsYeTvk23xnWWck9KqTfOJSqkRu1vBOy9L1bZYbd2xMbrS2lan+QBQL4EdFMiPDWF0R/ByCKrf4Y6gpOo0rRHjIkGuq2/WvSkDtmDJd8wmFseULo64lrvRgqs+pJHkxEsdQ77bIf2wolRzO3N3IugvoKnx21ulpLO83uo3R7LSC1BqlsJMFa1Cmr6pjrMoOt/GOiib0Z6TZ/mCdUB5fHQGVd/9z70xo8VCvQeAyXSvlxVi2WYO3xMZOjKypxsW5BV8KQDqFaHM/tjyd+Ic/QWEyvxAdNFiClUfhxsOSAttbEYQAaSdUSFuSO5L+QynhmSJAIJexV+vPElaPB6r3GEluI/6M3pZTYwO9U9XoD9E78zNYerdB9qKFUUJjlK9E3pAauYLpBzpcOenmHlPqiYfuikvWRlPY/jhcf/Y712o4mt4/h7m34M6ctuG3oiO8zz8cSyRcuRqy3xwmkU2Du3SeepXqMpE2dIohNvPOpcG8Iubb8pBaPq1PeSFEerwQUEGiSWEH1woE/mMpBKDx64NpXSsRNvY0v4FXzcXgCR8ssVDjNpEB4XoXKa3UMDOMwjYe7UpQRGwwwcPpUDTTe4cQ8BqDau',
			6: 'AgAAAA**AQAAAA**aAAAAA**IEj4XQ**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6ANl4OmC5eHow6dj6x9nY+seQ**dMgEAA**AAMAAA**iv62QGlEf2EMD6zuy2/VfqgZ/3kbSKDXU3YHUCihiIkB7lY/J7PyRJAAE6g4wQmcHBWJqfAblGGYscBKVDPUzAWXJ+0crL9KijVsY+4VDT8yYqaExM8eLmrzXk1pNAE/QCpRd5Er6UL06mq8lvUZcjjBG83izQ838h+U5qufWrHwT0LfVKLdhIxmViTy+Km9cqX/HZAKUwYEGAHNDLFA8fHyS3FZgr161pPOl6hKE7HNCIR4htUyh1vg9gNS1jHxeXNiEJqKHQoolYtGOtbSaGuOwRLK5jBTPWnZRKsk1IB3g2mEPmNRUpfT33BFoDQ2dvWt2Q2KDIlMGgtagEkH4poUh/x40RRiPJRdHHReDDFfL7EtQIoiqlgkNDTZIL3tvvN6LkeR0moInNSTP8LQ2HqgPPTwKk08VrIqoiCufDHqgdW72QVi0DKrSTWjcg7SlGeojMTnqq5sZuDLCXu1Lzda70ebwGLpqW2MLuaUrCbm76Upc7j36Zf2I3KaCME5CA0yptVc1X8ahGrC4s61EKdK0n9Ky8WqZOCLy2MdEnxCMogx7d7m0/OOmv7gtrye8bulVi5aVKSMixqg3pqRCsKkBGFH8xaOoUtKiajcW9x+rfiYZefHZqo6jjRGHv3ZnNQpevoCT9vptrI4WY+ShhYkNZdYaorbR3LNS+Kkug3Ov2JbDNh38sOXcb6FIL9co6bCW2V6WSZAG9iasjq1TEtHynKalMGf3miyhqEjDrMI66fPibZOE4LeqC0P6gvW',
			8: 'AgAAAA**AQAAAA**aAAAAA**9q3HXg**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6MElIOmCJaHqAidj6x9nY+seQ**dMgEAA**AAMAAA**niczQMlIYDamuVo2HZVbezU/YDQ4SKCi3z3Uz+BL79iMJwvFXKToV4ny4JdzvLbThC4aDTrTLcGwRvbyvB0IEkp78y9447msMRHGlI3fDDJ/qKXNLEyzox6ICtxS7tqhJWtwyKiiUwrqVQD6UX69O8Q54b87khKwyn4BAB5Uok+4S7Rwi8a8VCa1zk6WmpRUy0Nv2GSSQw3pC0uaQKxE2YHvt0AIhs3IE+x6g+/MOJOqEOfDHNbW6HKCO6uifXM6X4nm/sT2SzcUSiUXrLsd5n6ZpAFPOIreZclv18lJPe9M8pWj53FFQP/I1mTqcuFrU8QfSkaYVFGIFHUE3dT+fv/pV0i3j29sjItBcLbKpq5ihzl4+BfuVwmr+kQLEcxlNnxJoAsqtHIAgks1Xd0bmgmjdQl/pbYhxK5k0/B9my55wLaTxTbrVAheWzE/TSdOCfeJvDoMpnB+XAWurwSolo5g3UDeiUNk0MvPy3B/qFgSiCK6Kb1PeOIe18ZiV/4iX2gdM3nKvYwvt3E+L8JaVqgKXgXWHYrneRT+lfUbRYBMbDxZjtYTT09e4Z/Q/aR7gkPdj//9I7xONvRcp/4nZc1mC/gmFG+AzpZMEhcvHjKHDXYXMtZMPo0KwsJ1xQK/OHbN+aH+AG3EGMrn7d8e9gxHoXpOlBFPVDiJ1qhZV+rd7OjdHVAnj2BNtPyv0jtea7LRlOLfXXEmzsoj+VUA412QP9D0pMxY5avCqHHDl3j1E1nRF9qC+BALiuBZI7Bn',
			9: 'AgAAAA**AQAAAA**aAAAAA**iGeOXw**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6MGkYOgAZOAowudj6x9nY+seQ**dMgEAA**AAMAAA**YxxB5vsuiZbVJRkXEu0AcC1gW7EHXXU1I/6ktpIpTXMaP8MZ5+ayOdgCwlJ68IRxXGxrWBdiamLhUVPiC2AwZPZGO2KnBC3n2HwaL9T/J8EMtRzsravd7LTmiYyZBvG1tu/xHyt7x3FvhxhMsDr+WEU1kvgUI2TeeK0k+ymXmUIHadWzlrKDapSjzXgZP2L/k8BT4qrXIoFhyBxQEeO0oh9AmmDPA+m99TldFA3+6RM9lU35DroMmvVtGZgAgh5qcoXZiFSQ7o/6aXxGvqsGK+d2CaZqKhEp1bldEMEpCMRBq5xKRsxSVvmNgDpeKKHylGu2IwCn5sxgYUtJw06TkOI5MDER6of+sc0hwh/v7xDOJHRJt4401vGYX/6zT2yUK9MzheFwcmBEMgs9Vj6JNSU2k4Uq88Q/zD2dDK8VDbs3YyFWrBXCIDNCg7uuBqNJL71fB0mJawwpZQXK8RwBiqD7djn42o0Cc/IZKFVI29kLxHyqIZ97BciYCX3Q5KYUwqZVvEjv1EbGdId9Nuw/ay7EQXUAJjWAjbIjHaJ5V8j8SoR3Ul40+irptk93wCeN/LrAnwqAX0A047msCZXh2CopYuzHcDXZSKy4PtD6hoYnzMydJzQOPqr+CIjP/7/c4RVvrNFAb/NplWgRvC+Khqbq3wsODgdacRb5/E/WH4COCeUuqWimC+WUaCoesog2J5IfUOkzPn2Gh5K2s1zqCzgreP5plSFrjpYIzbr2A536pkehEylUVuCGC88h1ELK',
			101: 'AgAAAA**AQAAAA**aAAAAA**vrYQYA**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6ADloWlCpaAqQydj6x9nY+seQ**dMgEAA**AAMAAA**FLytkUICcdcJdfLgg6RdtF6HntCGBf3JtBkLEtW2JJ7TYBZoQP+6EY1DGuq9aS4pbPZjxmYhkRMjfGv1lZiJlqiRDstOmt1fjUs6DjjyGOukyaEj0b3hfzaKYePwHaC/3hItdFxjJls6hDh5bN36c4sLr5wgHr399Rvk021hGydLkQ2VJ96eyZ7QYUhlXcNQUJBRZGZImtaULcyhgEiqCOjYAvEZkCVBJ6o62UsJXGMFIdkt0bEcA8gn7DSddh7OvMSAC0GDGHPLNdppR/+RPjQc0vCgJ0TyqbasOYBs+Dkn33gLUM5FkJbpdPtDYT4xUbrVdtXDlj/zkU04vBT1bYzYwJMmfRvxoV+qb/+ymGH0c7S0HRr+0ynQliVRm5/wN/SXC7r1oZiEu1tD3ZSkatCV5uTbHahskjai7u/Zbhx5eWctR0EKkNCwuQ9eOfwL3Id8g9mHAwLAK1h2Y1+HZIBn5bffbPY3ZoIOg075YDPut4N4AtO52E9ELb8OvI+H0fS2DQOIQaIZ+zpLQyW1OqGKhlaafuNuLMkwdxXwDHJXdDCX/6fyMmH3jVhy9cTQWR3Dh4Gj4Ats5sS5ho+yOFKeLb9NMp3btG7EfIoCyM+iMvjEYZNd0BACopUaJ9CupnuymMy1MnBD6jGn1gXIRFOBdB5eYSd/fRcQvGrXLWYuMOPtBTC0SaQL9DAGEzFu5cVYtOEOEYQeEhglGIzim+I2ohk3s4dgKaAmi8dBaIMrNxhJ6Ee4+oSid4hS02A+',
			102: 'AgAAAA**AQAAAA**aAAAAA**UO5sYA**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6MGk4GhCZCFqAmdj6x9nY+seQ**dMgEAA**AAMAAA**te7FkrhyjCuyJ8rzkmSqDJjqH2Tz6OlsqRL6d78WSdlZx/bLd4/TKG6lZWNtaZ4NOcGR2MdNfrjLqhubkiBhajdwycH9/pjS7i8A80AW5tdAVAwqmp7je0BknCqrmy12+iatffbSDnZKVmuGALzWfCXA5qOFq46TgXZ03+eWSoxyERAGANwc+oQtqRqeb1eMMnJeMgsQVqri6noNDV73HKXbnbhUNF6GVbJKkNCrpbmmhZII2GCdFWDxbDL8xZVY2ePmJGhE+RkAIc01C8LzlMkIJXftkkP54/0Pg1kaP8D7Anv0W3KdulTHoNxrgYAwzghjwRiQCtojGwRNcMpSUn/Vx1dcJZEwc61dpdSwhm+N6w7r6CTPh0nbqbOvvOL/VBJXAII1k7kBX3bUgTKRyMPBdsxV2WVP7oGD5aT0dMbuPvALTDeylqJjTgNDxyS0/cBl46Be8IVJ+2thfM2HrW5QHVbSTJLATWz70773NhjjlvIgSF7n+xMDxRKWLJIl5FVfik5OmRMvcQOjOYB4VV8UMKeS40/1bX8J2E2eWXwglgn8mO1kVjaHNMpPPGjOhcTyfgjjt8IrERu7rLpCczr5osOaOhJ4LRGzeJGJzGuPb4ijFS3QxpitzabRruy3CDxfg+n70OlHf/vQnA5CTFQFU2wSlneTaPUXGBZWLpDvMZVFv73+bG7ogv0p4uudsGuTfKmcTVjWzsJ5B27YFaxwF3FVh010cQsxI0nXmuxlT2NgXo604nL3kI2HClxP',
			103: 'AgAAAA**AQAAAA**aAAAAA**mSw3YA**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6MGkYuiAZGLoQWdj6x9nY+seQ**dMgEAA**AAMAAA**ECKnVvwUCEvQrj166F5fWvNK3MOLymflj0RLnhEbC9UCevfGZe4w7W1m1Gq3loOzfSGsNKieQtudaEPtirLwjLO/i7uEe6G8AWmve3AcYUNG4krWLLrcRM0fdBM9oZalFSpxopsMj088LL5qh0SGM8fGZJFscX0eL4yT6UgeECCMo1tqpk/C68NNXu3SN8YRj0lijR8Zg7bzM8tKtq+kb1EnLQ+1QpP3KWsjf9krTaO3abOHIaYVDal19qOV9DsYhEY6VvH/YcikiwrW4Yl+VKpPNXES2QleWmOuox+zH15fGIbaxYL44lk9XIG3HIru8bOyphebrTuBfTbT/0uuPEs4ymSdz937BFMHCDqRq+caK9kvxBngNXrZUyzgYt0HhTYpyKDjcuxw1lpsYg6WLNkKJtyEE+QnyYyyd/4tCxKI4pZNAdKv2NwJEbQSM1Lo0Cl9glWNYDDv+UHHSDa11UGBGOfHeeixeeHWmgyw6wpnXYJOebNc55bACj1Aewxo8/xgLBFGFDFuOObRcsbiOTZezy5XhYw68fm+R002X1WDANaCm7Q5/dMGHfYshGC7hCz5feYoZI/B3PF9g1vJ4rw9OdCerxrR+KLaiqnLV+x8jviXUr5d/YToZhbiMjQFS/Dri7UyaDQkZ0BrUO03vOa5kBNFFde5/RxDqqDz2tSzWHt9Ab963srf+A4n66TcjsU/EDPAbv7N8/tL4wNIjUGRLudSbTzkraf9D+JUScU5QF5W7pg2L2zzoQFNcGuN',
			104: 'AgAAAA**AQAAAA**aAAAAA**K8hBYA**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6MGkounD5WLqQ6dj6x9nY+seQ**dMgEAA**AAMAAA**GMfsv3+o1VGmsD1Pvr4m96sLco8bTdHDw/luLuF4rpkladWMwGxhh7b8aqmisEB5cRGuplE+58EibKOMzj4pPRzB+adbSokyW1KxZ6inYp5aD084cTA5LiBPIKb3n2ICQ/S5fPM9SEWE3WXZHoRPPBEGxXpW3Quig1vCqvRRoeIS/PY+Ncc3SgN0l0my8Z5MOTGe3gXvYEbmRjyjSYJw86wIpIVZGbG33xBk9IRXsvCiyD6EZ/SbdbQiNQMPfHAC6/h4XpBam9RFoGug+SGha+Dc5b/iN/5r0a5d4pBTv4dx1dybvLqxAyhYXRg2/IobIjTd4BEsgPHGW57oTtr+tHB8Qa2d5dgV2kTItdw4pSplo53HqTBTf9WAah03Lpp8Hivn/MlxK+VKCSa2w8Th0a7fsjCrdLnI4P9yhMLGPpYoopymCy3b6B5NBf4aO7Z+zWSAlq8o87Vijl3/koUigJtky52SBe0STcvjwDic7e2mibKPi95udltg7fFkjOWZ7D3G/ZKP59MjykKyvlU5X7OqaisGvzPqlfocLWTATnVgGYCvei6USpHpibZlDGsdF/n/9xZcKKtoJ02FVMZ1pUMFnbcqLsLPfVElBxA4mmoEFNbayY9oU+t3TGtKJWyqge0Qc9agYCEIclaEIglO74Bqc4tFuuQ+e27H+jTiVZryp1AXtU2b0NAiqln7XaWOZc3BwoXhRkTika3+JnCKFJ3VBpUVUyK05tZkfLUr0LwbHTmcP1dyN5DJceCw+r+X',
			105: 'AgAAAA**AQAAAA**aAAAAA**17FGYA**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6AElIeoCpWApwSdj6x9nY+seQ**dMgEAA**AAMAAA**eWHxvNqYGus3OOTjIc80c+Oxmxs0kkTnMpu6eGhg0FYxvWkNot7mW6Vwp+u4MlG8QN1va/6p2p7qqqgqFdNnA1zgU8eiGQfeijEhciC42ioGMHaGpoVTs3gS+W4LfYbLcsTVjwTNLr7jSlwnFA4WNB/av5n9+/6jZwFh6yIO5SxMBnnfvfTligzKI03KZKqtNCMBI47wiSYHofJ+DbLxSn6I4V5h2RAmY0lJaGRcq2x1CCraA55cZn3TaUs9TVrmr5N/5+ZuGLSuqpddV9FYwOW7z4qU6ZCNSs6VEybryYx88alZjxcFd2TA607oojuK0r0IOZX5UUDHcJVtoCZJAMsYTmzaWeB8yNYH7O+cHagkT6DDtzWp4ugsJMarUKU0LV4wGwpSDKS3DbNsiCvcQmaM6LZl7QcbEaCIc2yWSBs+jwzrUH9F3sJurGF1Pk52G/I2B6cYfsToUl+N0JDwYWSe3plLYDy7YbhjaiuSe5BGJYILKWo1Nc6BwzoQhEQMJu214Wag/hGG8k9JSsn0pYBQSqMlR0Jnf0dOBpJ0usDosvW8Uxx1H0VYOrwfHX/FD6+/s/rxRlUthiOgrPPe5dkqR3Am6Fw/kwWUL/1gDGGNahQlVk3libFcSGRn6gQvY6K6cTNl2cJ2hinW+poVDn9XQOrG91oOnEWFhR1i7dGslcXGJ8tZVvQJ+9RAL6phPYHT7aeMEvkudIjXor51v/72IzfYYauv5TIc3foqFxvJ8rhLUd/zcnjtHowguKpn',
			16: 'AgAAAA**AQAAAA**aAAAAA**H9dOYA**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6MGkoagAZGDqQmdj6x9nY+seQ**dMgEAA**AAMAAA**PIeX+LlI1Fu32IH9vfIE84NPzOE4aL/EA/q153uU2Qrser3KjsGM4hNz+Dgc44HbiQeKobZzcfd1jbD4MeikucjvfAHOcd5OQtckhwl7LPRzFdSIxml1/I78bmXSqYLXqiE2eqRSzuwCv+XJsCOz5MMPON+hO06A59XLX6XNoNopy68Z21fkkGInYLLx21yPnSIIfQNJSAQAOcrE1cN4jq83F+V8u8o1AeLbYl7pK6hTenwldXbSFc8lkHbBo/jxjMqgCN281u5QvtgPNSM6TbUC4xKgWex4+Xt9pMjG7gz4kKTBpmDQUv+TZcWX8G70TH2/Sw0iYMW53NTzpyh8D3x5l/nu9CcKwsI1l92r7mAfd1saaPDBwmnalX/xMw6mlOQvmXZyaqUq43v71i7BJuhPV+O1ch4Hjf6qiDxsQje8WUvGxiJ5V48sVpP2eYrAdth51NzqojwwWkdfLKadfnuC8hnAKq0O03W18S/59lJqoM1WUK8AAeGpzRHNk9GDEwg8yM+fjTVwlS7d+0+F7Ue/on+pwH78ETuWuECOuHWqBD2XmQKekBQucSUgmW2WZdTUqfKrAFuzPw+iHXDGPUi4XPGFNMKvU6Rx0egBnOORDNFrpkSm4fVqZwAS1UI9fDKjbKs7Ju/YocZODre5zzjgEH40ZmjyW4bUU4bTxIwqWL+VV0gXjUmFMiJdk2G6+YZU9j/qN8Ozrg82rt9PnN5TGg+E5388gj86w3f7dAjvoJaogy1g5p+Q8OycGFXP',
			106: 'AgAAAA**AQAAAA**aAAAAA**4eJbYA**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6wNkoKnDpmCpgmdj6x9nY+seQ**dMgEAA**AAMAAA**SpYk0R8Jbt2hdsihi+Q8A0DFW4Bw/ZrAcC/SwuZSldy7xE1JnN4Lt6rtufeSbx6p9FpVQx1FmtBx0f1QWpvsf0oUhuRlYtv5nUHO0Abt70eKiV8oqxR0gMxUkj+xO/AadMXprF/9Co6GY2y/vQ2EN+Ikd/AD8LJ4NavFcfpJRxJGiULQE1BD3p5LHRsZ/DKmUY2oLIe117k3SwCjo0dJwEd7Q3u0o/zCtLCmOR4db06lw/KhH8mUtOP3VVlvfHf3uKUNmOOt0LvFRqp+aBSC7rDCG/K0au+2wLAJmlAQWEKUiLXIFhIu2OhIyzGi+n8ikVoevh07TlpnQYJwv9tVDieeO6K3fQris93eUK+2b6UZtNd31+R0inpcfT7gw065rfuRe2iFMouHAlGe3fGjogJ70FXl0gTWAti5e9r9StY4/dvi2IOJdt1ACVxcVrUJyOmf+EopG/kS9T/lZ0eoctjVJcsG+Ocho1PvYGIC/U6fmp0dhv8ts2QLHaFaMKrh+ITPxCEjVHZnOPuWE4DQK6oG4hZgJFRKOtAWYhFR5fYk5dekzT6bG+rQGGDDYgrBmg5kPE7SzvZXrHcCO/HPiyR9e3XMyg8WXbnNTeFQqtfApjZpWB1UiPEAH0dvytQmL6XPigJ6tm3lLvXEJPegi3NP2xTIPxCqsqv11B5p6P3N9lOw74b9SAZ/K1XrG5ExgB+S/iuE/tyTUwGtD6DUmp/O3CHNrCXdQ7jiq6MYWT3Z3EP1vsbPZ+PJ8pBke2OM',
		},
	},

	woocommerceAPI: {
		2: {
			url: 'https://soshydration.com.au/',
			consumerKey: 'ck_e657eb6b9a7e792bbe588540a054ac62ee749447',
			consumerSecret: 'cs_950294bb6d07036514cad5b8caa3fb0c05d5f565',
		},
	},

	catchAPI: {
        url: 'https://marketplace.catch.com.au/',
        token: '9ee6eb29-0b46-4ce3-afe6-5d2db1056e29',
    },

    kogan7API: {
		url: 'https://nimda-marketplace.aws.kgn.io',
        username: 'hobbyco',
        password: 'ff9e7db3c04982b08c9de979cbe439785acf0e8e',
    },

	attributesName: {
		1: {
			
			'fullName': 'finalDestinationAddressName',
			'address1': 'finalDestinationAddressLine1', 
			'address2': 'finalDestinationAddressLine2', 
			'suburb': 'finalDestinationCity', 
			'state': 'finalDestinationStateOrProvince', 
			'postcode': 'finalDestinationPostalCode', 
			'country': 'finalDestinationCountry', 
			'phone': 'finalDestinationAddressPhone', 
			'email':  'buyerEmail',
			'PaymentStatus': 'orderPaymentStatus'

		},
		2: {
			
			'fullName': 'buyer_name',
			'address1': 'ship_address_1', 
			'address2': 'ship_address_2', 
			'suburb': 'ship_city', 
			'state': 'ship_state', 
			'postcode': 'ship_postal_code', 
			'country': 'ship_country', 
			'phone': 'buyer_phone_number', 
			'email':  'buyer_email',
			'PaymentStatus': ''

		},
		3: {
			
			'fullName': 'full_name',
			'address1': 'address_1', 
			'address2': 'address_2', 
			'suburb': 'city', 
			'state': 'state', 
			'postcode': 'postcode', 
			'country': 'country', 
			'phone':  'phone', 
			'email':  'email',
			'PaymentStatus': ''

		},
		4: {
			
			'fullName': 'shipment_address_name',
			'address1': 'shipment_address_street',
			'address2': 'shipment_address_street_2',
			'suburb': 'shipment_address_city',
			'state': 'shipment_address_stat',
			'postcode': 'shipment_address_postal_code',
			'country': 'shipment_address_country',
			'phone': 'customer_phone',
			'email':  '',
			'PaymentStatus': ''
			
		},
		5: {

			'fullName': 'Name',
			'address1': 'Address', 
			'address2': 'Address2', 
			'suburb': 'Suburb', 
			'state': 'State', 
			'postcode': 'Postcode', 
			'country': 'Country', 
			'phone': 'Phone', 
			'email':  '',
			'PaymentStatus': ''
			
		},
		6: {

			'fullName': 'buyerLastName',
			'address1': 'finalDestinationAddressLine1', 
			'address2': 'finalDestinationAddressLine2', 
			'suburb': 'finalDestinationCity', 
			'state': 'finalDestinationStateOrProvince', 
			'postcode': 'finalDestinationPostalCode', 
			'country': 'finalDestinationCountry', 
			'phone': 'finalDestinationAddressPhone', 
			'email':  'buyerEmail',
			'PaymentStatus': ''
			
		},
		7: {
			
			'fullName': 'finalDestinationAddressName',
			'address1': 'finalDestinationAddressLine1', 
			'address2': 'finalDestinationAddressLine2', 
			'suburb': 'finalDestinationCity', 
			'state': 'finalDestinationStateOrProvince', 
			'postcode': 'finalDestinationPostalCode', 
			'country': 'finalDestinationCountry', 
			'phone': 'finalDestinationAddressPhone', 
			'email':  'buyerEmail',
			'PaymentStatus': 'orderPaymentStatus'

		},
		8: {
			
			'fullName': 'full_name',
			'address1': 'street_1', 
			'address2': 'street_2', 
			'suburb': 'city', 
			'state': 'state', 
			'postcode': 'zip', 
			'country': 'country_iso2', 
			'phone': 'phone', 
			'email':  'email',
			'PaymentStatus': 'payment_status'

		},
		9: {
			
			'fullName': 'name',
			'address1': 'address1', 
			'address2': 'address2', 
			'suburb': 'city', 
			'state': 'province', 
			'postcode': 'zip', 
			'country': 'country_code', 
			'phone': 'phone', 
			'email':  'email',
			'PaymentStatus': 'financial_status'

		},
		10: {
			
			'fullName': 'fullname',
			'address1': 'address1', 
			'address2': 'address2', 
			'suburb': 'city', 
			'state': 'region_code', 
			'postcode': 'postcode', 
			'country': 'country_id', 
			'phone': 'telephone', 
			'email':  'email',
			'PaymentStatus': ''

		},
	},
	

	loadConfig: function() {
		try {
			if (fs.existsSync(this.configFile)) {
				let config = json.parse(fs.readFileSync(this.configFile).toString());
				for (let key in config) {
					for (let propKey in this.props) {
						if (this.props[propKey] == key) {
							this[propKey] = config[key];
							break;
						}
					}
				}
			}
		}
		catch (e) {}
	}
};

Config.loadConfig();

module.exports = {Config, DBConfig};
