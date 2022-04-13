// БИБЛИОТЕКИ
let fs = require('fs');
// КЛАССЫ
let Toolbox = require('./Toolbox');
// ПЕРЕМЕННЫЕ
let APP_NAME = 'salesRepresentative';
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

	async fillUmData() {
		// let bases = ['dex_beeline_kbr'];
		let bases = ['dex_yota', 'dex_beeline_kbr', 'dex_beeline_kcr', 'dex_beeline_kcr_fmcg', 'dex_beeline_sts', 'dex_beeline_sts2', 'dex_beeline_sts_sr', 
		'dex_mega', 'dex_mts_kbr', 'dex_mts_kbr_salp', 'dex_mts_kcr', 'dex_mts_kcr_distr', 'dex_mts_sts', 'dex_mts_sts_062013'];
		for (let base of bases) {
			console.log("для базы ", base);
			let rows = await this.toolbox.sqlRequest(base, `SELECT msisdn, icc FROM um_data WHERE status = '0'`);
			for (let row of rows) {
				let hash = this.toolbox.getStringHash(`${row['msisdn']}${row['icc']}`);
				
				await this.toolbox.sqlRequest('skyline', `INSERT IGNORE INTO RS_um_data (msisdn, icc, hash, base) VALUES ('${row["msisdn"]}', '${row["icc"]}', '${hash}', '${base}')`);
				// break;
			}
			// break;
		}
	}

	async createSalesRDoc(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		console.log("Хотят добавить документ-распределение сим");
		let obj = {status: -1, err: []};
		let err = [];
		obj.list = [];
		obj.hash = packet.data.hash;

		console.log('packet===> ', packet);

		let list = [];
		for (let elem of packet.data.list) {
			console.log('elem=====> ', elem);
			if (list.indexOf(elem.hash) == -1) { 
				console.log('добавляем');
				list.push(elem.hash);
			}
		}
		console.log('list==> ', list);

		// сначала проверим, есть ли такое отделение и активно ли оно
		let rowUnits = await this.toolbox.sqlRequest('skyline', `
			SELECT uid FROM dict_units 
			WHERE uid = '${packet.data.unitId}' AND status = '1'`);
		if (rowUnits.length > 0) {
			// теперь проверим симки на наличие в поступивших
			let sqlArr = [];
			let ch = 3;
			console.log('list=====> ', list);
			if (list.length > ch) {
				let arr = [];
				for (let i=0; i<list.length; i++) {
					if (i % ch == 0) {
						sqlArr.push(arr);
						arr = [];
					} else arr.push(list[i]);
				}
				if (arr.length > 0) sqlArr.push(arr);
			} else {
				sqlArr.push(list);
			}
			console.log('sqlArr==> ', sqlArr);
			let sims = [];
			for (let elem of list) {
				let row = await this.toolbox.sqlRequest('skyline', `
					SELECT * FROM RS_um_data 
					WHERE hash = '${elem}'
				`);
				if (row.length == 0) err.push(`Для элемента ${elem} отсутствует запись в поступивших sim`);
				else {
					// сим есть и она по идее не отписана
					// проверим ее состояние в базе, в которой она находится
					let rows = await this.toolbox.sqlRequest(row[0].base, `
						SELECT * FROM um_data 
						WHERE icc='${row[0].icc}'
					`);
					if (rows.length == 0) err.push(`SIM ${row[0].icc} есть в общей базе новых, но почему-то отсутствует в базе ${row[0].base}`);
					else {
						if (rows.length > 1) {
							err.push(`SIM ${row[0].icc} есть в общей базе новых, но задвоена в базе ${row[0].base}`);
						} else {
							if (rows[0].status != 0) err.push(`SIM с icc ${row[0].icc} имеет статус отличный от 'поступила'!`);
							else {
								sims.push({MSISDN: row[0].msisdn, ICC: row[0].icc, BASE: row[0].base, HASH: row[0].hash});
							}
						}
					}
				}
			}

			// проверки окончены. Если нет err, то распределим сим и создадим запись
			if (err.length == 0) {
				obj.status = 1;
				let user = AUTH_USERS.find(element=> element.uid === packet.uid);
				let moment = this.toolbox.getMoment();
				let date = moment(new Date()).format('YYYYMMDD');
				let data = [];
				sims.map(sim=> data.push([`MSISDN=${sim.MSISDN}`, `ICC=${sim.ICC}`, `BASE=${sim.BASE}`, `HASH=${sim.HASH}`]));
				let str = '';
				for (let sim of data) str += `${sim.join(',')};`; 
				await this.toolbox.sqlRequest('skyline', `
					INSERT INTO RS_journal (owner, rs_uid, date, data) VALUES ('${user.userid}', '${packet.data.unitId}', '${date}', '${str}')
				`);
				for (let sim of sims) { 
					await this.toolbox.sqlRequest('skyline', `
						DELETE FROM RS_um_data WHERE hash = '${sim.HASH}'
					`);
					await this.toolbox.sqlRequest(sim.BASE, `
						UPDATE um_data SET status = '1', owner_id='${packet.data.unitId}', date_own='${date}' WHERE icc='${sim.ICC}'
					`);
				};
			} 
		} else {
			err.push('Отделение, на которое вы создаете запись, не существует или заблокировано!');
		}

		if (err.length > 0) obj.err = obj.err.concat(err);
		return obj;
	}

	async checkICC(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		console.log("Хотят проверить icc");
		let obj = {status: -1, err: []};
		let err = [];
		obj.list = [];
		obj.hash = packet.data.hash;
		let rows = await this.toolbox.sqlRequest('skyline', `
			SELECT * FROM RS_um_data
			WHERE icc = '${packet.data.icc}'
			`);
		if (rows.length == 0) err.push("SIM-карта не найдена");
		else {
			for (let row of rows) obj.list.push({icc: row.icc, msisdn: row.msisdn, hash: row.hash, base: row.base});
			obj.status = 1;
		}
		if (err.length > 0) obj.err = obj.err.concat(err);
		return obj;
	}

	async megaDots() {
		let arr = [];
		let rows = await this.toolbox.sqlRequest('dex_bases', `
				SELECT * FROM mega_dots WHERE mega_profile = '6825'
			`);

		for (let row of rows) {
			if (dots.indexOf(row['mega_code']) == -1) arr.push(row['mega_code']);
		}

		console.log(arr);
		if (arr.length > 0) {
			let str = `'${arr.join("','")}'`;
			console.log(str);
			await this.toolbox.sqlRequest('dex_bases', `
				DELETE FROM 'mega_dots' WHERE mega_code IN (${str})
			`);
		}
	}

	async getUserDocuments(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		console.log("запрос документов ", packet);
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetUserDocuments( user, packet.data );
		return obj;
	}
	async getUnits(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		console.log("запрос отделений");
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetUnits( user, packet.data );
		return obj;
	}
	async getChildsUnit(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		console.log("запрос торговых точек субдилера ", packet);
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetChildsUnit( user, packet.data );
		return obj;
	}

	async startingLocationApp(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		// let obj = {status: -1};
		// let err = [];
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	if (user.RunningApps.indexOf(this.name) == -1) {
		// 		err.push(`Для работы с приложением ${this.name} его нужно сначала запустить`);
		// 	} else {
		// 		// все норм, проверим какие базы доступны для пользователя
		// 		for (let key in DATA) {
		// 			let operator = DATA[key];
		// 			for (let i=0; i<operator.bases.length; i++) {
		// 				let element = operator.bases[i];
		// 				let sqlResponse = await this.toolbox.sqlRequest(element.configuration.base, `
		// 					SELECT * FROM users 
		// 					WHERE login = '${user.username}' 
		// 				`)
		// 				if (sqlResponse.length > 0) {
		// 					obj.list = [];
		// 					obj.units = [];
		// 					let rows = await this.toolbox.sqlRequest('skyline', `
		// 						SELECT id, date FROM RS_journal 
		// 						WHERE owner = '${user.userid}'`);
		// 					if (rows.length > 0 ) rows.map(item=> obj.list.push({docnum: item.id, date: item.date}));
		// 					obj.status = 1;

		// 					let runits = await this.toolbox.sqlRequest('skyline', `
		// 						SELECT uid, title FROM dict_units 
		// 						WHERE status = '1'`);
		// 					if (runits.length > 0 ) runits.map(item=> obj.units.push({uid: item.uid, title: item.title}));
		// 				}
		// 			}
		// 		}
		// 	}
		// }
		// if (err.length > 0) obj.err = err;
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
					'startingLocationApp',
					'getUserDocuments',
					'getUnits',
					'checkICC',
					'createSalesRDoc',
					'getChildsUnit'
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
			{
				name: 'yota',
				configuration: {
					base: 'dex_yota',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXYOTA',
				}
			},
			{
				name: 'beeline_kbr',
				configuration: {
					base: 'dex_beeline_kbr',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXBEELINEKBR',
				}
			},
			{
				name: 'beeline_kcr',
				configuration: {
					base: 'dex_beeline_kcr',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXBEELINEKCR',
				}
			},
			{
				name: 'dex_beeline_kcr_fmcg',
				configuration: {
					base: 'dex_beeline_kcr_fmcg',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXBEELINEKCRFMCG',
				}
			},
			{
				name: 'dex_beeline_sts',
				configuration: {
					base: 'dex_beeline_sts',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXBEELINESTS',
				}
			},
			{
				name: 'dex_beeline_sts2',
				configuration: {
					base: 'dex_beeline_sts2',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXBEELINESTS2',
				}
			},
			{
				name: 'dex_beeline_sts_sr',
				configuration: {
					base: 'dex_beeline_sts_sr',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXBEELINESTSSR',
				}
			},
			{
				name: 'dex_mega',
				configuration: {
					base: 'dex_mega',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXMEGA',
				}
			},
			{
				name: 'dex_mts_kbr',
				configuration: {
					base: 'dex_mts_kbr',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXMTSKBR',
				}
			},
			{
				name: 'dex_mts_kbr_salp',
				configuration: {
					base: 'dex_mts_kbr_salp',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXMTSKBRSALP',
				}
			},
			{
				name: 'dex_mts_kcr',
				configuration: {
					base: 'dex_mts_kcr',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXMTSKCR',
				}
			},
			{
				name: 'dex_mts_kcr_distr',
				configuration: {
					base: 'dex_mts_kcr_distr',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXMTSKCRDISTR',
				}
			},
			{
				name: 'dex_mts_sts',
				configuration: {
					base: 'dex_mts_sts',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXMTSSTS',
				}
			},
			{
				name: 'dex_mts_sts_062013',
				configuration: {
					base: 'dex_mts_sts_062013',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXMTSSTS062013',
				}
			}
		]
	}
}

let dots = [
	'NTELEKOM_640_16',
'SK_SALPAG_12_20',
'SK_SALPAG_103_21',
'SK_SALPAG_05_20',
'NTELEKOM_77_17',
'SK_SALPAG_262_21',
'SALPAG_13_19',
'SK_SALPAG_32_19',
'SK_SALPAG_33_19',
'SK_SALPAG_35_21',
'SALPAG_06_18',
'SK_SALPAG_72_21',
'SK_SALPAG_108_21',
'SK_SALPAG_101_21',
'SK_SALPAG_74_21',
'NTELEKOM_649_16',
'SK_SALPAG_80_21',
'NTELEKOM_148_16',
'NTELEKOM_715_16',
'SK_SALPAG_47_19',
'SK_SALPAG_08_21',
'SK_SALPAG_92_19',
'SK_SALPAG_44_19',
'NTELEKOM_29_18',
'SK_SALPAG_59_21',
'SK_SALPAG_104_21',
'SK_SALPAG_106_21',
'NTELEKOM_105_17',
'SK_SALPAG_27_19',
'NTELEKOM_673_17',
'SK_SALPAG_179_21',
'SALPAG_18_18',
'SALPAG_17_18',
'SK_SALPAG_136_19',
'NTELEKOM_677_16',
'NTELEKOM_555_16',
'NTELEKOM_579_16',
'SK_SALPAG_259_21',
'SK_SALPAG_127_21',
'SK_SALPAG_160_21',
'NTELEKOM_632_16',
'SK_SALPAG_68_19',
'SALPAG_04_19',
'SK_SALPAG_182_21',
'NTELEKOM_680_16',
'SK_SALPAG_67_19',
'SK_SALPAG_14_20',
'SK_SALPAG_127_19',
'SK_SALPAG_154_19',
'SK_SALPAG_84_21',
'SK_SALPAG_169_21',
'SK_SALPAG_168_21',
'SK_SALPAG_167_21',
'SK_SALPAG_46_19',
'SK_SALPAG_37_21',
'SK_SALPAG_38_21',
'SK_SALPAG_150_19',
'NTELEKOM_730_16',
'SK_SALPAG_45_21',
'SK_SALPAG_12_21',
'SK_SALPAG_152_19',
'SK_SALPAG_64_21',
'SK_SALPAG_112_21',
'SK_SALPAG_112_21',
'SK_SALPAG_57_21',
'SK_SALPAG_187_21',
'SK_SALPAG_60_21',
'SK_SALPAG_03_21',
'SK_SALPAG_04_21',
'SK_SALPAG_200_21',
'SK_SALPAG_197_21',
'NTELEKOM_717_16',
'SK_SALPAG_39_21',
'SK_SALPAG_33_21',
'SK_SALPAG_88_21',
'SK_SALPAG_125_21',
'NTELEKOM_149_16',
'SK_SALPAG_36_21',
'SK_SALPAG_98_19',
'SK_SALPAG_142_21',
'SK_SALPAG_157_21',
'SK_SALPAG_153_21',
'SK_SALPAG_66_21',
'SK_SALPAG_140_21',
'SK_SALPAG_210_21',
'SK_SALPAG_19_20',
'SK_SALPAG_207_21',
'SK_SALPAG_148_21',
'SK_SALPAG_25_21',
'SK_SALPAG_43_19',
'SK_SALPAG_40_19',
'SK_SALPAG_105_21',
'NTELEKOM_617_16',
'NTELEKOM_694_16',
'SK_SALPAG_51_21',
'SK_SALPAG_185_21',
'SK_SALPAG_31_19',
'SK_SALPAG_79_19',
'SK_SALPAG_172_21',
'NTELEKOM_667_16',
'SK_SALPAG_161_21',
'SK_SALPAG_147_19',
'SK_SALPAG_103_19',
'SK_SALPAG_118_21',
'SK_SALPAG_155_21',
'SK_SALPAG_202_21',
'SK_SALPAG_05_21',
'SK_SALPAG_69_21',
'SK_SALPAG_93_21',
'SK_SALPAG_101_19',
'SK_SALPAG_97_21',
'NTELEKOM_655_16',
'SK_SALPAG_155_19',
'SK_SALPAG_170_21',
'SK_SALPAG_134_21',
'SK_SALPAG_135_21',
'SK_SALPAG_75_21',
'SK_SALPAG_62_21',
'SK_SALPAG_100_21',
'NTELEKOM_93_18',
'SK_SALPAG_102_21',
'SK_SALPAG_30_19',
'SALPAG_14_19',
'SK_SALPAG_129_19',
'NTELEKOM_331_16',
'SALPAG_15_19',
'SK_SALPAG_139_19',
'NTELEKOM_138_17',
'SK_SALPAG_89_21',
'SALPAG_16_19',
'SK_SALPAG_95_19',
'SK_SALPAG_96_21',
'SK_SALPAG_120_21',
'SK_SALPAG_07_21',
'SK_SALPAG_44_21',
'SK_SALPAG_135_19',
'SK_SALPAG_48_21',
'SK_SALPAG_146_19',
'SALPAG_07_19',
'SK_SALPAG_07_20',
'NTELEKOM_678_16',
'NTELEKOM_530_16',
'SK_SALPAG_83_21',
'NTELEKOM_641_16',
'SK_SALPAG_126_21',
'SK_SALPAG_128_21',
'SK_SALPAG_19_19',
'NTELEKOM_82_17',
'SK_SALPAG_159_19',
'SK_SALPAG_85_19',
'NTELEKOM_53_17',
'NTELEKOM_389_16',
'NTELEKOM_766_17',
'SK_SALPAG_164_21',
'NTELEKOM_604_16',
'SK_SALPAG_71_21',
'NTELEKOM_115_17',
'SK_SALPAG_150_21',
'NTELEKOM_739_17',
'SK_SALPAG_209_21',
'NTELEKOM_140_17',
'SK_SALPAG_13_21',
'SK_SALPAG_20_19',
'SK_SALPAG_23_20',
'SK_SALPAG_22_21',
'NTELEKOM_584_16',
'SK_SALPAG_110_19',
'NTELEKOM_576_16',
'NTELEKOM_168_16',
'SK_SALPAG_260_21',
'SK_SALPAG_94_21',
'SK_SALPAG_134_19',
'NTELEKOM_732_16',
'SK_SALPAG_56_21',
'SK_SALPAG_124_19',
'SK_SALPAG_53_21',
'SK_SALPAG_42_19',
'SK_SALPAG_171_21',
'NTELEKOM_650_16',
'SK_SALPAG_06_21',
'NTELEKOM_630_16',
'NTELEKOM_202_16',
'NTELEKOM_714_16',
'SK_SALPAG_173_21',
'SK_SALPAG_136_21',
'SK_SALPAG_113_21',
'SK_SALPAG_113_21',
'SK_SALPAG_95_21',
'SK_SALPAG_73_19',
'SK_SALPAG_82_21',
'SK_SALPAG_46_21',
'SK_SALPAG_73_21',
'SALPAG_09_19',
'SK_SALPAG_147_21',
'SK_SALPAG_177_21',
'SK_SALPAG_257_21',
'SK_SALPAG_76_21',
'SK_SALPAG_65_21',
'SK_SALPAG_31_21',
'NTELEKOM_12_16',
'SK_SALPAG_02_20',
'NTELEKOM_671_17',
'SK_SALPAG_122_21',
'SK_SALPAG_102_19',
'SK_SALPAG_29_21',
'SK_SALPAG_176_21',
'NTELEKOM_592_16',
'SALPAG_22_18',
'NTELEKOM_608_16',
'SK_SALPAG_114_19',
'SK_SALPAG_26_21',
'SK_SALPAG_156_19',
'NTELEKOM_127_17',
'SK_SALPAG_141_21',
'NTELEKOM_111_16',
'NTELEKOM_697_16',
'NTELEKOM_699_16',
'SK_SALPAG_42_21',
'NTELEKOM_702_16',
'NTELEKOM_701_16',
'SALPAG_06_19',
'SK_SALPAG_206_21',
'SK_SALPAG_68_21',
'SALPAG_11_19',
'SK_SALPAG_137_19',
'SK_SALPAG_20_20',
'SK_SALPAG_70_21',
'SK_SALPAG_129_21',
'SALPAG_05_19',
'SK_SALPAG_138_19',
'SALPAG_14_18',
'SALPAG_12_19',
'SK_SALPAG_190_21',
'SK_SALPAG_151_19',
'NTELEKOM_733_16',
'SK_SALPAG_137_21',
'SK_SALPAG_162_21',
'NTELEKOM_160_16',
'SK_SALPAG_81_21',
'NTELEKOM_612_16',
'SK_SALPAG_174_21',
'SK_SALPAG_158_21',
'SK_SALPAG_115_21',
'SK_SALPAG_205_21',
'SK_SALPAG_14_21',
'SK_SALPAG_110_21',
'SK_SALPAG_110_21',
'SK_SALPAG_114_21',
'SK_SALPAG_149_21',
'NTELEKOM_706_16',
'NTELEKOM_52_17',
'SALPAG_03_19',
'SK_SALPAG_66_19',
'NTELEKOM_668_16',
'SK_SALPAG_28_21',
'SK_SALPAG_36_19',
'SK_SALPAG_106_19',
'NTELEKOM_535_16',
'SK_SALPAG_133_19',
'SK_SALPAG_189_21',
'SK_SALPAG_208_21',
'SALPAG_02_18',
'SK_SALPAG_16_21',
'SK_SALPAG_144_21',
'SK_SALPAG_131_21',
'SK_SALPAG_132_21',
'SK_SALPAG_201_21',
'SK_SALPAG_78_21',
'SK_SALPAG_180_21',
'SK_SALPAG_117_21',
'SK_SALPAG_146_21',
'SK_SALPAG_11_21',
'NTELEKOM_112_17',
'SK_SALPAG_28_19',
'SK_SALPAG_29_19',
'SK_SALPAG_175_21',
'SK_SALPAG_181_21',
'NTELEKOM_102_17',
'SK_SALPAG_58_21',
'SK_SALPAG_258_21',
'SK_SALPAG_159_21',
'NTELEKOM_721_16',
'SK_SALPAG_27_21',
'SK_SALPAG_30_21',
'SK_SALPAG_18_19',
'SK_SALPAG_77_21',
'SK_SALPAG_211_21',
'NTELEKOM_565_16',
'SK_SALPAG_18_20',
'NTELEKOM_596_16',
'SK_SALPAG_11_20',
'SK_SALPAG_116_21',
'NTELEKOM_654_16',
'SK_SALPAG_152_21',
'SK_SALPAG_166_21',
'SK_SALPAG_188_21',
'SK_SALPAG_212_21',
'SK_SALPAG_203_21',
'NTELEKOM_08_16',
'SK_SALPAG_15_21',
'SK_SALPAG_09_20',
'SK_SALPAG_23_21',
'SK_SALPAG_108_19',
'SK_SALPAG_149_19',
'SK_SALPAG_85_21',
'SK_SALPAG_192_21',
'NTELEKOM_560_16',
'SK_SALPAG_163_21',
'SK_SALPAG_10_20',
'SK_SALPAG_10_20',
'SK_SALPAG_116_19',
'NTELEKOM_50_16',
'NTELEKOM_628_16',
'NTELEKOM_55_17',
'NTELEKOM_49_17',
'SK_SALPAG_52_19',
'SK_SALPAG_99_21',
'SK_SALPAG_144_19',
'NTELEKOM_566_16',
'NTELEKOM_567_16',
'SK_SALPAG_87_21',
'NTELEKOM_756_17',
'NTELEKOM_26_17',
'SALPAG_04_18',
'NTELEKOM_125_17',
'SK_SALPAG_121_21',
'SK_SALPAG_261_21',
'NTELEKOM_368_16',
'SK_SALPAG_20_21',
'NTELEKOM_662_16',
'SK_SALPAG_156_21',
'SK_SALPAG_90_21',
'SK_SALPAG_55_19',
'NTELEKOM_626_16',
'SK_SALPAG_145_19',
'SK_SALPAG_32_21',
'SK_SALPAG_41_21',
'SK_SALPAG_154_21',
'SK_SALPAG_49_21',
'SK_SALPAG_34_21',
'SK_SALPAG_178_21',
'SK_SALPAG_214_21',
'NTELEKOM_531_16',
'SALPAG_12_18',
'NTELEKOM_723_16',
'SK_SALPAG_02_21',
'NTELEKOM_568_16',
'SK_SALPAG_133_21',
'SK_SALPAG_139_21',
'SK_SALPAG_145_21',
'SK_SALPAG_124_21',
'SK_SALPAG_21_21',
'SK_SALPAG_21_20',
'SK_SALPAG_143_21',
'NTELEKOM_146_16',
'SK_SALPAG_204_21',
'SK_SALPAG_186_21',
'SK_SALPAG_158_19',
'SK_SALPAG_151_21',
'SK_SALPAG_193_21',
'SK_SALPAG_63_21',
'SK_SALPAG_118_19',
'NTELEKOM_542_16',
'NTELEKOM_695_16',
'SK_SALPAG_198_21',
'SK_SALPAG_17_20',
'SK_SALPAG_50_21',
'SK_SALPAG_10_21',
'SK_SALPAG_92_21',
'SK_SALPAG_111_19',
'SALPAG_16_18',
'SK_SALPAG_130_21',
'NTELEKOM_622_16',
'SK_SALPAG_138_21',
'SK_SALPAG_109_21',
'SK_SALPAG_213_21',
'SK_SALPAG_86_21',
'SK_SALPAG_91_21',
'SK_SALPAG_194_21',
'SK_SALPAG_195_21',
'SK_SALPAG_196_21'
]

module.exports = Core;