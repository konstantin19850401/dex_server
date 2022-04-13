// БИБЛИОТЕКИ
let fs = require('fs');
// КЛАССЫ
let Toolbox = require('./Toolbox');
// ПЕРЕМЕННЫЕ
let APP_NAME = 'storeHouse';
let APP_CONNECTOR = 'mysql';
let CoreApi = require('./api/CoreApi');


class Core {
	#coreApi;
	constructor() {
		this.testname = APP_NAME;
		this._base = 'dex_bases';
		this.adapters = [];
		this._connector;
		this.dictionaries = {};
		this.ROUTES = {};
		this.createApp = false;
		this.toolbox = null;

		this._name;
		this._description;
		this._pic;
	}
	async startInits() {
		console.log(`\t\t========= Запуск приложения ${this.name} ========`);
		// await this.initAdapters();
		// await this.initConnectors('./modules/connectors');
		// await this.initLogging();
		await this.initToolbox();
		// await this.initRoutes();
		// await this.initDictionaries();
		// await this.initTikers();
		// await this.initUserControl();
		// this.createApp = true;
		
		console.log(`\t\t========= Приложение ${this.name} запущено ======`);	
	}
	async initBases() {
		for (let i=0; i<COMMONBASE.length; i++) this._connector.newBase(COMMONBASE[i]);
		for (let operator in DATA) {
			DATA[operator].bases.map((base)=> {
				this._connector.newBase(base.configuration);
			})
		}
	}
	async initToolbox() {
		this.toolbox = new Toolbox(this._connector);
		this.#coreApi = new CoreApi(DATA, this.toolbox, this);
	}
	async initLogging() {	
	}
	async initDictionaries() {
	}
	async uniqueMethods() {
		await this.initConfiguration();
	}
	async initConfiguration() {
		let row = await this.toolbox.sqlRequest(this._base, `
			SELECT name, description, pic 
			FROM skyline_apps 
			WHERE uid='${APP_NAME}'
		`);
		if (row.length > 0) {
			for (let key in row[0]) {
				this[`_${key}`] = row[0][key];
			}
		}
	}
	get name() {return APP_NAME}
	get title() {return this._name}
	get picture() {return this._pic;}
	get appDescription() {return this._description}
	get conname() {return APP_CONNECTOR}
	get appRoutes() {return that.ROUTES;}
	set connector(connector) {this._connector = connector;}

	async startingLocationApp(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = this.#coreApi.StartingLocation(user);
		return obj;
	};

	// главный вход для api приложения
	async appApi(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		console.log("похоже будет вызов api");
		let err = [];
		let obj = {status: -1};
		obj.action = packet.data.action;
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		else {
			// console.log("1");
			if (user.RunningApps.indexOf(this.name) == -1) err.push(`Для работы с приложением ${this.name} его нужно сначала запустить`);
			else {
				let coreActions = [
					"startingLocationApp"
				];
				// console.log("2");
				if (coreActions.indexOf(packet.data.action) != -1) {
					console.log('111111111');
					let o = await this[packet.data.action](packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
					for (let key in o) obj[key] = o[key];

					// o = await method.m(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
					// for (let key in o) obj[key] = o[key];
				} else {
					if (packet.data.base) {
						console.log("проверим доступна ли база пользователю");
						// теперь проверим доступна ли база пользователю
						let availableBases = [];
						let ob;
						for (let key in DATA) {
							let operator = DATA[key];
							for (let i=0; i<operator.bases.length; i++) {
								let element = operator.bases[i];
								if (packet.data.base) {
									// если есть база, то определим оператора
									if (packet.data.base === element.configuration.pseudoName) ob = key;
								}
								let sqlResponse = await this.toolbox.sqlRequest(element.configuration.base, `
									SELECT * FROM users 
									WHERE login = '${user.username}' 
								`)
								if (sqlResponse.length > 0) availableBases.push(element.configuration.pseudoName);
							}
						}
						if (availableBases.indexOf(packet.data.base) == -1) err.push(`Пользователю доступно приложение, но выбранная база не доступна`);
						else {
							console.log("перед вызовом api");
							// приложение доступно пользователю и запущено им. Значит выполним то, что он просит
							for (let i=0; i<this.adapters.length; i++) {
								if (this.adapters[i].operator == ob && typeof this.adapters[i].apiCommands !== 'undefined') {
									let o = await this.adapters[i].apiCommands(packet, user);
									if (o.err) obj.err = o.err;
									else { 
										for (let key in o) obj[key] = o[key];
										//obj.list = result.data;
									}
									obj.status = 1;
									break;
								}
							}
						}
					}
				}
				
			}
		}
		return obj;
	}
}

let defPacket = {
    com: `skyline.apps.${APP_NAME}`,
    data: {}
}

let COMMONBASE = [
	{connectionLimit:60, host:'192.168.0.33', user:"dex", password:"dex", base:"dex_bases", pseudoName: 'DEXSERVER'}
]

let DATA = {
	yota: {
		bases: [
			// {
			// 	name: 'yota_test',
			// 	configuration: {
			// 		base: 'dex_yota_test',
			// 		host: '192.168.0.33',
			// 		user: 'dex',
			// 		password: 'dex',
			// 		pseudoName: 'DEXYOTATEST',
			// 		description: 'YOTA TEST',
			// 		pseudoRoute: 'yota_test',
			// 		docid: 'DEXPlugin.Document.Yota.Contract',
			// 		loggingDir: 'logs',
			// 		api: 'https://partner.yota.ru/rd/api/rd/api.wsdl',
			// 		profiles: {
		 //                general: {
		 //                    username: 'olgakmv@inbox.ru',
		 //                    password: 'ScSdNUW9',
		 //                },
		 //                ermakova: {
		 //                    username: 'ermakovil-7@mail.ru',
		 //                    password: 'GdhsnDAP',
		 //                },
		 //                pojidaeva: {
		 //                    username: 'popova@n-telecom.net',
		 //                    password: '6fxenrBr',
		 //                }
		 //            }
			// 	}
			// },
			{
				name: 'yota',
				configuration: {
					base: 'dex_yota',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXYOTA',
					description: 'YOTA',
					pseudoRoute: 'yota',
					docid: 'DEXPlugin.Document.Yota.Contract',
					loggingDir: 'logs',
					api: 'https://partner.yota.ru/rd/api/rd/api.wsdl',
					profiles: {
		                general: {
		                    username: 'olgakmv@inbox.ru',
		                    password: 'ScSdNUW9',
		                },
		                ermakova: {
		                    username: 'ermakovil-7@mail.ru',
		                    password: 'GdhsnDAP',
		                },
		                pojidaeva: {
		                    username: 'popova@n-telecom.net',
		                    password: '6fxenrBr',
		                }
		            }
				}
			}
		]
	},
	mts: {
		bases: [
			{
				name: 'mts_sts_062013',
				configuration: {
					base: 'dex_mts_sts_062013',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXMTSSTS062013',
					description: 'МТС СК 062013',
					pseudoRoute: 'mts_sts_062013',
					docid: 'DEXPlugin.Document.MTS.Jeans',
					loggingDir: 'logs',
					api: 'rdealer.ug.mts.ru/RemoteDealerWebServices',
				}
			},
		]
	},
	megafon: {
		bases: [
			{
				name: 'mega',
				configuration: {
					base: 'dex_mega',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXMEGA',
					description: 'МЕГАФОН',
					pseudoRoute: 'mega',
					docid: 'DEXPlugin.Document.Mega.EFD.Fiz',
					loggingDir: 'logs',
					certifsDir: `${__dirname}/certs/megafon`,
					certifsPassPhrase: '123',
					api: 'https://alldealers.megafon.ru:9443',
					// profiles: {
					// 	ofis_sk_new: { // общий ск
     //                        username: "MB10_SK_NTELEKOM_01_16",
     //                        password: "MB10_SK_NTELEKOm_03",
     //                        employee: "Луганская Е.А.",
     //                        dealer: "ИП Салпагарова А.А.",
     //                        certDate: "01.07.2009",
     //                        certNumber: "23АГ554154",
     //                        agentId: 6825,
     //                    },
					// }
				}
			}
		]
	}
}


module.exports = Core;