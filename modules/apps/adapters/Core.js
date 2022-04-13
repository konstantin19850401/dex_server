// БИБЛИОТЕКИ
let fs = require('fs');
// КЛАССЫ
let CoreApi = require('./api/CoreApi');
let AdapterYota = require('./AdapterYota');
let AdapterMTS = require('./AdapterMTS');
let AdapterBeeline = require('./AdapterBeeline');
let AdapterMegafon = require('./AdapterMegafon');
let Toolbox = require('./Toolbox');
// ПЕРЕМЕННЫЕ
let APP_NAME = 'adapters';
let APP_CONNECTOR = 'mysql';



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
		this.startInits();
		
	}
	async startInits() {
		console.log(`\t\t========= Запуск приложения ${this.name} ========`);
		// await this.initAdapters();
		// await this.initConnectors('./modules/connectors');
		// await this.initLogging();
		// await this.initToolbox();
		// await this.initRoutes();
		// await this.initDictionaries();
		// await this.initTikers();
		// await this.initUserControl();
		// this.createApp = true;
		console.log(`\t\t========= Приложение ${this.name} запущено ======`);	
	}
	get name() {return APP_NAME}
	get title() {return this._name}
	get appDescription() {return this._description}
	get picture() {return this._pic;}
	get conname() {return APP_CONNECTOR}
	get appRoutes() {return that.ROUTES;}
	set connector(connector) {this._connector = connector;}

	async initBases() {
		for (let i=0; i<COMMONBASE.length; i++) this._connector.newBase(COMMONBASE[i]);
		for (let operator in DATA) {
			DATA[operator].bases.map((base)=> {
				this._connector.newBase(base.configuration);
			})
		}
	}
	async initLogging() {
		// console.log('Инициализация логирования');
		for (let i=0; i<this.adapters.length; i++) {
			console.log(`Логирование адаптера ${this.adapters[i].pseudoRoute} для базы ${this.adapters[i].base} запущено`);
			this.adapters[i].logging();
			console.log(`Логирование адаптера ${this.adapters[i].pseudoRoute} для базы ${this.adapters[i].base} осуществлено`);
		}
	}
	async initToolbox() {
		
		this.toolbox = new Toolbox(this._connector);
		this.#coreApi = new CoreApi(DATA, this.toolbox, this);
	}
	async initDictionaries() {
		let dicts = [
			{id: 'countries',      table: 'dex_dict_countries'},
			{id: 'docTypes',       table: 'dex_dict_doctypes'},
			{id: 'creationTypes',  table: 'dex_dict_creation_type'},
			{id: 'genders',        table: 'dex_dict_genders'},
			{id: 'journalTypes',   table: 'dex_dict_journal_type'},
			{id: 'personTypes',    table: 'dex_dict_person_types'},
			{id: 'residentTypes',  table: 'dex_dict_resident_types'},
			{id: 'spheres',        table: 'dex_dict_spheres'},
			{id: 'units',          table: 'dex_dict_units'},
			{id: 'typePointSales', table: 'dex_dict_points_sale_type'},
			{id: 'dp_type',        table: 'dex_dict_dp_types'},
			{id: 'regions',        table: 'dex_dict_regions'},
			{id: 'simComplects',   table: 'dex_dict_sim_complects'},
			{id: 'payment',        table: 'dex_dict_payment'},
			{id: 'orgCodes',       table: 'dex_dict_organization_codes'},
			{id: 'deliverytypes',  table: 'dex_dict_deliverytypes'},
			{id: 'docfields',      table: 'dex_dict_doc_fields'},
		]
		for (let i=0; i<dicts.length; i++) {
			let dict = dicts[i];
			this.dictionaries[dict.id] = {};
			let row = await this.toolbox.sqlRequest('dex_bases', `SELECT uid, title, status FROM ${dict.table}`);
			row.map((el)=> {this.dictionaries[dict.id][el.uid] = el;});
		}
		for (let j=0; j<this.adapters.length; j++) {this.adapters[j].DICTIONARIES = this.dictionaries;}
		this.toolbox.DICTIONARIES = this.dictionaries;
	}
	async uniqueMethods() {
		await this.initAdapters();
		// await this.initTikers();
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
	async initAdapters() {
		try {
			console.log('\t\t\t\tИнициализация адаптеров');
			for (let operator in DATA) {
				DATA[operator].bases.map((base)=> {
					let current = {operator: operator};
					for (let property in base.configuration) current[property] = base.configuration[property];
					if (operator == 'yota') { 
						this.adapters.push(new yotaAdapter(current));
						// console.log("создание адаптера ", current);
					}
					else if (operator == 'megafon') this.adapters.push(new megafonAdapter(current)); 
					else if (operator == 'mts') this.adapters.push(new mtsAdapter(current)); 
					else if (operator == 'beeline') this.adapters.push(new beelineAdapter(current)); 
				})
			}
			for (let j=0; j<this.adapters.length; j++) {this.adapters[j].TOOLBOX = this.toolbox;}
			console.log('\t\t\t\tИнициализация адаптеров успешно завершена');
		} catch (e) {
			console.log(`\t\t\t\tИнициализация адаптеров прошла с ошибками ${e}`);
		}	
		return '';
	}
	async initTikers() {
		console.log('\t\t\t\tИнициализация тикеров');
		// опрос базы на предмет наличия договоров со статусом "на отправку"
		for (let i=0; i<this.adapters.length; i++) {
			for (let j=0; j<ACTION_FOR_TICKERS.length; j++) {
				if (this.adapters[i][ACTION_FOR_TICKERS[j].method]) {
					if (ACTION_FOR_TICKERS[j].action == 'timeout') {
						setTimeout(()=> {this.adapters[i][ACTION_FOR_TICKERS[j].method]()}, ACTION_FOR_TICKERS[j].timer)
					} else {
						setInterval(()=> {this.adapters[i][ACTION_FOR_TICKERS[j].method]()}, ACTION_FOR_TICKERS[j].timer)
					}
				}
			}
		}
		console.log('\t\t\t\tИнициализация тикеров успешно завершена');
	}

	async startingLocationApp(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		console.log("старт!");
		let obj = {status: -1};
		let err = [];
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);

		if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		else {
			if (user.RunningApps.indexOf(this.name) == -1) {
				console.log('приложение не запущено');
				err.push(`Для работы с приложением ${this.name} его нужно сначала запустить`);
			} else {
				console.log('все норм');
				// все норм, проверим какие базы доступны для пользователя
				// let bases = user.getBases;

				// console.log("config=> 111", user.GetAppConfiguration('adapters'));
				let appCnf = user.GetAppConfiguration('adapters');
				if (typeof obj.bases === 'undefined') obj.bases = [];
				if (typeof appCnf !== 'undefined') {
					let bases = appCnf.configuration.bases;
					bases.map(item=> {
						for (let key in DATA) {
							let operator = DATA[key];
							for (let i=0; i<operator.bases.length; i++) {
								let element = operator.bases[i];
								// console.log('element=> ', element, ' item=> ', item);
								if (element.name == item) {
									// console.log('user.username=> ',user.UserName, ' element.configuration.base=> ', element.configuration.base);
									obj.bases.push({id: element.configuration.pseudoName, description: element.configuration.description}); 
									obj.status = 1;
								}
							}
						}
					})
				}


				// for (let key in DATA) {
				// 	let operator = DATA[key];
				// 	for (let i=0; i<operator.bases.length; i++) {
				// 		let element = operator.bases[i];
				// 		// let sqlResponse = await this.toolbox.sqlRequest(element.configuration.base, `
				// 		// 	SELECT * FROM users 
				// 		// 	WHERE login = '${user.UserName}' 
				// 		// `)

				// 		console.log('user.username=> ',user.UserName, ' element.configuration.base=> ', element.configuration.base);
				// 		// if (sqlResponse.length > 0) {
				// 		// 	console.log('есть===> ');
				// 		// 	if (typeof obj.bases === 'undefined') obj.bases = [];
				// 		// 	obj.bases.push({id: element.configuration.pseudoName, description: element.configuration.description}); 
				// 		// 	obj.status = 1;
				// 		// }
				// 	}
				// }
			}
		}
		if (err.length > 0) obj.err = err;
		console.log("obj==> ", obj);
		return obj;
	}
	async getAppDicts(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		let dicts = {
			'docfields': 'dex_bases.dex_dict_doc_fields',
		};
		let obj = {status: -1};
		obj.action = packet.data.action;
		obj.dict = packet.data.dict;
		let err = [];
		let user = AUTH_USERS.find(element=> element.uid === packet.uid);
		if (user.allowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		else {
			let dict = packet.data.dict;
			let arr = dicts[dict].split('.');
			let cbase = arr[0];
			let ctable = arr[1];
			let where = '';
			if (typeof packet.data.onlyActual !== 'undefined' && (packet.data.onlyActual === 1 || packet.data.onlyActual === 0)) {
				where = `WHERE status = '${packet.data.onlyActual}'`;
			}
			let sqlString = `
				SELECT * FROM ${ctable}
				${where}
			`;
			obj.list = [];
			obj.type = 'global'; // имеет ли справоник рапространение на все приложение (global - да, local - нет)
			let result = await this.toolbox.sqlRequest(cbase, sqlString);
			for (let i=0; i<result.length; i++) obj.list.push(result[i]);
			obj.status = 1;
		}
		if (err.length > 0) obj.err = err;
		return obj;
	}	
	async getGlobalAppDicts (packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		console.log("запрос глобальных справочников");
		let dicts = {
			'units': `dict_units`, 
			'statuses': `dict_doc_statuses`,
			'genders': `dict_genders`,
			'docFields': `dex_dict_doc_fields`,
			'contextMenu': `dex_dict_contextmenu`,
			'regions': `dict_regions`
		}
		let obj = {};
		let err = [];
		obj.list = {};
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let appConfigufation = user.GetAppConfiguration('adapters');
		if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		else {
			if (user.RunningApps.indexOf(this.name) == -1) err.push(`Для работы с приложением ${this.name} его нужно сначала запустить`);
			else {
				for (let dict in dicts) {
					if ( typeof dicts[dict] !== 'undefined') {
						obj.list[dict] = { dictName: dict, elements: [] };
						let rows = await this.toolbox.sqlRequest('skyline', `SELECT * FROM ${ dicts[dict] }`);
						if ( typeof rows !== 'undefined' && rows.length > 0 ) obj.list[dict].elements = rows;
						obj.status = 1;
					}
				}
			}
		}
		return obj;
	}
	async changeAppFields ( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
        console.log('changeAppFields');
        let obj = {status: -1};
        let err = [];
        let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
       	if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		else {
			let app = user.GetAppConfiguration( 'adapters' );
			// let hiddenfields = app.configuration.documents.list.period.hiddenfields.fields;
			// let displayedfields = app.configuration.documents.list.period.displayedfields.fields;
			app.configuration.documents.list.period.hiddenfields.fields = packet.data.hiddens;
			app.configuration.documents.list.period.displayedfields.fields = packet.data.shown;
			let row = await this.toolbox.sqlRequest('skyline', `
				SELECT apps_configuration FROM user 
				WHERE uid = '${user.userid}' 
			`)
			if ( row.length > 0 ) {
				let newrow = JSON.parse( row[0].apps_configuration );
				newrow[0].configuration.documents.list.period.hiddenfields.fields = packet.data.hiddens;
				newrow[0].configuration.documents.list.period.displayedfields.fields = packet.data.shown;
				let conf = JSON.stringify( newrow );
				await this.toolbox.sqlRequest('skyline', `
					UPDATE user SET apps_configuration = '${conf}' 
					WHERE uid = '${user.userid}' 
				`);
				obj.status = 1;
			}
		} 
        return obj;
    }
    async getDocumentFields(  packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS  ) {
		let obj = {status: -1};
		let err = [];
		obj.tableFields = [];
		obj.action = packet.data.action;
		obj.tableFields = {};
		let row = await this.toolbox.sqlRequest('skyline', `SELECT uid, title FROM dex_dict_doc_fields WHERE fieldType = 'docfield'`);
		if ( row.length > 0 ) obj.tableFields.list = row;
		// теперь выбранные для показа 
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let appConfigufation = user.GetAppConfiguration('adapters');
		let displayedHeaders = appConfigufation.configuration.documents.list.period.displayedfields.fields;
		obj.tableFields.shown = displayedHeaders
		obj.status = 1;
		return obj;
	}
	async getConfigurationDexDocument( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log( 'getConfigurationDexDocument' );
		let obj = {status: -1};
		obj.action = 'configurationDexDocument';
        let err = [];
        let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
       	if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		else {
			let app = user.GetAppConfiguration( 'adapters' );
			let row = await this.toolbox.sqlRequest('skyline', `SELECT uid, type, name, description, rank, parent, status FROM dex_document`);
			if ( row.length > 0 ) obj.list = row;
			obj.status = 1;
		}
		return obj;
	}
	async deleteConfigurationDexDocumentItem ( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log( 'deleteConfigurationDexDocumentItem' );
		let that = this;
		let obj = {status: -1};
		obj.action = 'deleteConfigurationDexDocumentItem';
        let err = [];
        let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
       	if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		else {
			let uid = packet.data.item;
			let arrId = [];
			async function parse( uid ) {
				arrId.push(uid);
				let row = await that.toolbox.sqlRequest('skyline', `SELECT uid FROM dex_document WHERE parent = '${uid}'`);
				if (row.length > 0) {
					for ( let i =0; i<row.length; i++ ) {
						await parse( row[i].uid);
					}
				}
			}
			await parse(uid);
			console.log( "массив => ", arrId );
			let str = arrId.join(',');
			console.log(str);
			await this.toolbox.sqlRequest('skyline', `DELETE FROM dex_document WHERE uid IN (${str})`);
			obj.item = uid;
			obj.status = 1;
		}
		return obj;
	}
	async addNewItemConfigurationDexDocument ( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log( 'addNewItemConfigurationDexDocument' );
		let obj = {status: -1};
		obj.action = 'addNewItemConfigurationDexDocument';
        let err = [];
        let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
       	if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		else {
			if (typeof packet.data.newItem.name === 'undefined' || packet.data.newItem.name == '' ) err.push('Поле ID должно быть указано');
			if (typeof packet.data.newItem.description === 'undefined' || packet.data.newItem.description == '' ) err.push('Поле Описание должно быть указано');
			if (typeof packet.data.parent === 'undefined' ) err.push('Родительский узел должен быть указан');
			if ( err.length == 0) {
				let row = await this.toolbox.sqlRequest('skyline', `SELECT * FROM  dex_document WHERE uid = '${packet.data.parent}'`);
				if ( row.length > 0 ) {
					row = await this.toolbox.sqlRequest('skyline', `SELECT * FROM  dex_document WHERE name = '${packet.data.newItem.name}' AND parent = '${packet.data.parent}'`);
					if ( row.length > 0 ) err.push('Такой узел у родительского узла уже существует');
					else {
						row = await this.toolbox.sqlRequest('skyline', `SELECT MAX(uid) AS maxuid FROM  dex_document`);
						if (row.length > 0) {
							let cuid = row[0].maxuid + 1;
							let rank = 0;
							console.log("новый UID = ", cuid);
							let result = await this.toolbox.sqlRequest('skyline', `INSERT INTO dex_document (uid, type, name, description, rank, parent, status) VALUES ( '${cuid}', 'node', 
							'${packet.data.newItem.name}', '${packet.data.newItem.description}', '${rank}', '${packet.data.parent}', '1')`);
							if (result.insertId) {
								obj.newItem = {};
								obj.newItem.name = packet.data.newItem.name;
								obj.newItem.description = packet.data.newItem.description;
								obj.newItem.uid = cuid;
								obj.parent = packet.data.parent;
								obj.status = 1;
							} else {
								err.push('Проблема с вставкой нового узла');
							}
							// console.log('result=> ', result);
						} else err.push( 'Ошибка в процессе получения максимального uid' );
					}
				} else err.push('Родительский узел не существует');
			} 



			// let row = await this.toolbox.sqlRequest('skyline', `SELECT * FROM  dex_document WHERE uid = '${packet.data.parent}'`);
			// if ( row.length > 0 ) {
			// 	let rank = parseInt(packet.data.newItem.rank);
			// 	if (typeof packet.data.newItem.name === 'undefined' || packet.data.newItem.name == '' ) err.push('Поле ID должно быть указано');
			// 	if (typeof packet.data.newItem.description === 'undefined' || packet.data.newItem.description == '' ) err.push('Поле Описание должно быть указано');
			// 	if (isNaN(rank) || typeof rank !== 'number' ) err.push('Вес поля должен иметь тип число и должен быть указан.');

			// 	if ( err.length == 0 ) {
			// 		row = await this.toolbox.sqlRequest('skyline', `SELECT * FROM  dex_document WHERE name = '${packet.data.newItem.name}' AND parent = '${packet.data.section}'`);
			// 		if ( row.length > 0 ) {
			// 			err.push('Такое поле уже существует');
			// 		} else {
			// 			await this.toolbox.sqlRequest('skyline', `INSERT INTO dex_document (type, name, description, rank, parent, status) VALUES ( 'document_field', 
			// 				'${packet.data.newItem.name}', '${packet.data.newItem.description}', '${rank}', '${packet.data.section}', '1')`);
			// 			obj.status = 1;
						
			// 		}
			// 		obj.newItem = packet.data.newItem;
			// 		obj.newItem.status = 1;
			// 		obj.section = packet.data.section;
			// 	}
			// } else {
			// 	err.push('Родительский узел не существует');
			// }
		}
		if (err.length > 0) obj.err = err;
		return obj;
	}
	async changeStatusItemConfigurationDexDocument ( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log( 'changeStatusItemConfigurationDexDocument' );
		let obj = {status: -1};
		obj.action = 'changeStatusItemConfigurationDexDocument';
        let err = [];
        let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
       	if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		else {
			if (typeof packet.data.item.name === 'undefined' || packet.data.item.name == '' ) err.push('Поле ID должно быть указано');
			if ( err.length == 0 ) {
				let row = await this.toolbox.sqlRequest('skyline', `SELECT status FROM dex_document WHERE parent = '${packet.data.section}' AND name = '${packet.data.item.name}'`);
				if ( row.length > 0 ) {
					let statuses = [1,0];
					let status = row[0].status;
					await this.toolbox.sqlRequest('skyline', `UPDATE dex_document SET status = '${statuses[status]}' WHERE name = '${packet.data.item.name}' AND parent = '${packet.data.section}'`);
					obj.item = packet.data.item;
					obj.item.status = statuses[status];
					obj.section = packet.data.section;
					obj.status = 1;
				} else {
					err.push( 'Указанное поле не существует' );
				}
			} 
		}
		if (err.length > 0) obj.err = err;
		return obj;
	}
	async rankUpConfigurationDexDocumentItem ( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log( 'rankUpConfigurationDexDocumentItem' );
		let that = this;
		let obj = {status: -1};
		obj.action = 'rankUpConfigurationDexDocumentItem';
        let err = [];
        let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
       	if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		else {
			let uid = packet.data.item;
			let row = await that.toolbox.sqlRequest('skyline', `SELECT id, parent, rank FROM dex_document WHERE uid = '${uid}'`);
			if ( row.length > 0 ) {
				let rank = row[0].rank;
				let parentNode =  row[0].parent;
				let id = row[0].id;
				row = await that.toolbox.sqlRequest('skyline', `SELECT id, uid, rank FROM dex_document WHERE parent = '${parentNode}'`);
				if ( row.length == 0 ) err.push( 'Родительский узел не существует' );
				else if ( row.length == 1 ) err.push( 'У родительского узла только один узел. Невозможно увеличить ранг' );
				else if ( row.length > 0 ) {
					let sort = row.sort((a,b)=> a.rank > b.rank ? 1 : -1);
					let idDown, uidDown, newRank;
					let ifIsset = false;
					for ( let i = 0; i < sort.length; i++) {
						if ( sort[i].uid != uid && sort[i].rank > rank ) {
							newRank = sort[i].rank;
							idDown = sort[i].id;
							uidDown = sort[i].uid;
							ifIsset = true;
							break;
						}
					}
					if (ifIsset) {
						await that.toolbox.sqlRequest('skyline', `UPDATE dex_document SET rank = '${rank}' WHERE id='${idDown}'`);
						await that.toolbox.sqlRequest('skyline', `UPDATE dex_document SET rank = '${newRank}' WHERE id='${id}'`);
						obj.uidDown = uidDown;
						obj.rankDown = rank;
						obj.uidUp = uid;
						obj.rankUp = newRank;
					}
					obj.item = uid;
					obj.status = 1;
				}
			} else {	
				err.push('Такого узла не существует');
			}
		}
		return obj;
	}
	async rankDownConfigurationDexDocumentItem ( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log( 'rankDownConfigurationDexDocumentItem' );
		let that = this;
		let obj = {status: -1};
		obj.action = 'rankDownConfigurationDexDocumentItem';
        let err = [];
        let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
       	if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		else {
			let uid = packet.data.item;
			let row = await that.toolbox.sqlRequest('skyline', `SELECT id, parent, rank FROM dex_document WHERE uid = '${uid}'`);
			if ( row.length > 0 ) {
				let rank = row[0].rank;
				let parentNode =  row[0].parent;
				let id = row[0].id;
				row = await that.toolbox.sqlRequest('skyline', `SELECT id, uid, rank FROM dex_document WHERE parent = '${parentNode}'`);
				if ( row.length == 0 ) err.push( 'Родительский узел не существует' );
				else if ( row.length == 1 ) err.push( 'У родительского узла только один узел. Невозможно увеличить ранг' );
				else if ( row.length > 0 ) {
					let sort = row.sort((a,b)=> a.rank < b.rank ? 1 : -1);
					let idUp, uidUp, newRank;
					let ifIsset = false; 
					for ( let i = 0; i < sort.length; i++) {
						if ( sort[i].uid != uid && sort[i].rank < rank ) {
							newRank = sort[i].rank;
							uidUp = sort[i].uid;
							idUp = sort[i].id;
							ifIsset = true;
							break;
						}
					} 
					if (ifIsset) {
						await that.toolbox.sqlRequest('skyline', `UPDATE dex_document SET rank = '${rank}' WHERE id='${idUp}'`);
						await that.toolbox.sqlRequest('skyline', `UPDATE dex_document SET rank = '${newRank}' WHERE id='${id}'`);
						obj.uidDown = uid;
						obj.rankDown = newRank;
						obj.uidUp = uidUp;
						obj.rankUp = rank;
					}
					
					obj.item = uid;
					obj.status = 1;
				}
			} else {	
				err.push('Такого узла не существует');
			}
		}
		return obj;
	}
	async getDictUnits( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log("getDictUnits");
		// let obj = {};
		// let err = [];
		// obj.list = {};
		// obj.status = -1;
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// let appConfigufation = user.GetAppConfiguration('adapters');

		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	let rows = await this.toolbox.sqlRequest('skyline', `
		// 		SELECT uid, lastname, firstname, secondname FROM dict_units 
		// 		ORDER BY uid 
		// 	`);
		// 	obj.status = 1;
		// 	if (rows.length > 0) {
		// 		obj.list = rows;
		// 	}
		// }
		// if (err.length > 0) obj.err = err;
		let obj = await this.#coreApi.GetUnits( user, packet.data );
		return obj;
	}
	async getAppDictById( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log("getAppDictById");
		let obj = {};
		let err = [];
		obj.list = [];
		obj.status = -1;
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let appConfigufation = user.GetAppConfiguration('adapters');

		if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		else {
			let dicts = [
				{id: 'regions', table: 'dict_regions'},
				{id: 'apps', table: 'dict_apps'},
				{id: 'units', table: 'dict_units'}
			]
			let dict = dicts.find(item=> item.id == packet.data.dict);
			if (typeof dict !== 'undefined') {
				let rows = await this.toolbox.sqlRequest('skyline', `
					SELECT uid, title, status FROM ${dict.table}  
				`);
				obj.status = 1;
				obj.dictname = dict.id;
				if (rows.length > 0) {
					obj.list = rows;
				}
			} else {
				err.push('Вы указали не существующий справочник');
			}
			
		}
		if (err.length > 0) obj.err = err;
		return obj;
	}
	
	async createNewUnit( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log("createNewUnit ", packet);
		// let obj = {};
		// let err = [];
		// obj.status = -1;
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// let appConfigufation = user.GetAppConfiguration('adapters');
		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	let data = packet.data.fields;
		// 	let region;
		// 	let uid;
		// 	if (typeof data.lastname === 'undefined' || data.lastname == '') err.push('Вы не указали фамилию');
		// 	if (typeof data.firstname === 'undefined' || data.firstname == '') err.push('Вы не указали имя');
		// 	if (typeof data.region === 'undefined' || data.region == '') err.push('Вы не указали регион');
		// 	if (typeof data.status === 'undefined' || data.status == '') err.push('Вы не указали статус');
		// 	if (typeof parseInt(data.uid) !== 'number' || isNaN(data.uid) || data.uid == '') err.push('Вы не указали id отделения');
		// 	else {
		// 		let rows = await this.toolbox.sqlRequest('skyline', `SELECT id FROM dict_units WHERE uid = '${data.uid}'`);
		// 		if (rows.length > 0) err.push('Данный id уже существует');
		// 		else uid = parseInt(data.uid);
		// 	}
		// 	let rows = await this.toolbox.sqlRequest('skyline', `SELECT * FROM dict_regions WHERE uid = '${data.region}'`);
		// 	if (rows.length == 0) err.push('Значение региона не принадлежит справочнику');
		// 	else region = rows[0];
		// 	if (err.length == 0) {
		// 		data.lastname = this.toolbox.normName(data.lastname);
		// 		data.firstname = this.toolbox.normName(data.firstname);
		// 		if (typeof data.secondname != 'undefined') data.secondname = this.toolbox.normName(data.secondname);
		// 		else data.secondname = '';
		// 		// узнаем max значение uid отделений 
		// 		// let max = 0;
		// 		// let row = await this.toolbox.sqlRequest('skyline', `SELECT MAX(uid) AS uid FROM dict_units`);
		// 		// if (row.length > 0) max = row[0].uid;
		// 		// max++;
		// 		if (data.title == '') {
		// 			data.title = `пр. ${data.lastname} ${data.firstname}`;
		// 			if (typeof data.secondname != 'undefined' && data.secondname != '') data.title = `${data.title} ${data.secondname}`;
		// 			data.title = `${data.title} - ${region.short_title}`;
		// 		}
		// 		let fields = ['lastname', 'firstname', 'secondname', 'region', 'title', 'status', 'doc_city'];
		// 		for (let i=0; i<fields.length; i++) {
		// 			if (typeof data[fields[i]] !== 'undefined') fields[i] = `${fields[i]}='${data[fields[i]]}'`;
		// 		}
		// 		console.log("fields====> ", fields);
		// 		let str = fields.join(',');
		// 		await this.toolbox.sqlRequest('skyline', `
		// 			INSERT INTO dict_units SET uid='${uid}', ${str}, created = '${user.UserId}', data='' 
		// 		`);

		// 		// console.log('уникальное занчение=> ', this.toolbox.generateUniqueHash());
		// 		if (typeof packet.data.createNewUser !== 'undefined' && packet.data.createNewUser == true) {
		// 			let pass = (rows.find(item=> item.uid == data.region)).def_pass;
		// 			console.log('Помимо создания нового отделения, создаем еще пользователя для него');
		// 			let hash = this.toolbox.generateUniqueHash();
		// 			await this.toolbox.sqlRequest('skyline', `
		// 				INSERT INTO user SET uid='${hash}', username='user${uid}', firstname='${data.firstname}', lastname='${data.lastname}', secondname='${data.secondname}', 
		// 					user_group_id='2', status='1', created = '${user.userid}', password = '${pass}'
		// 			`);
		// 			// поставим линк на созданного пользователя новому отделению
		// 			await this.toolbox.sqlRequest('skyline', `
		// 				UPDATE dict_units SET link = '${hash}' WHERE uid = '${uid}'
		// 			`)

		// 		} else console.log('Создаем новое отделение, но пользователя для него не создаем');
		// 		obj.status = 1;
		// 	}
		// }
		// if (err.length > 0) obj.err = err;
		let obj = await this.#coreApi.CreateNewUnitInUnitsDictionary( user, packet.data );
		return obj;
	}
	async editUnit(  packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS  ) {
		console.log("editUnit ", packet);
		let obj = {};
		let err = [];
		obj.status = -1;
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let appConfigufation = user.GetAppConfiguration('adapters');
		if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		else {
			let region;
			let data = packet.data.fields;
			if (typeof data.lastname === 'undefined' || data.lastname == '') err.push('Вы не указали фамилию');
			if (typeof data.firstname === 'undefined' || data.firstname == '') err.push('Вы не указали имя');
			if (typeof data.region === 'undefined' || data.region == '') err.push('Вы не указали регион');
			if (typeof data.status === 'undefined' || data.status == '') err.push('Вы не указали статус');
			let rows = await this.toolbox.sqlRequest('skyline', `SELECT * FROM dict_regions WHERE uid = '${data.region}'`);
			if (rows.length == 0) err.push('Значение региона не принадлежит справочнику');
			else region = rows[0];
			if (err.length == 0) {
				data.lastname = this.toolbox.normName(data.lastname);
				data.firstname = this.toolbox.normName(data.firstname);
				if (typeof data.secondname != 'undefined') data.secondname = this.toolbox.normName(data.secondname);
				if (data.title == '') {
					data.title = `пр. ${data.lastname} ${data.firstname}`;
					if (typeof data.secondname != 'undefined') data.title = `${data.title} ${data.secondname}`;
					data.title = `${data.title} - ${region.short_title}`;
				}
				let fields = ['lastname', 'firstname', 'secondname', 'region', 'title', 'status', 'doc_city'];
				for (let i=0; i<fields.length; i++) {
					if (typeof data[fields[i]] !== 'undefined') fields[i] = `${fields[i]}='${data[fields[i]]}'`;
				}
				let str = fields.join(',');
				console.log(`UPDATE dict_units SET ${str}`);
				let result = await this.toolbox.sqlRequest('skyline', `UPDATE dict_units SET ${str} WHERE uid = '${data.uid}'`);
				if (result.affectedRows == 1) {
					obj.status = 1;
				} else {
					err.push('Операция не была осуществлена');
				}
				console.log("result=> ", result);
			}
		}
		if (err.length > 0) obj.err = err;
		return obj;
	}
	async delElementsFromDict( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log("delElementsFromDict", packet);
		// let obj = {};
		// let err = [];
		// obj.status = -1;
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// let appConfigufation = user.GetAppConfiguration('adapters');
		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	let dicts = [
		// 		{id: 'units', table: 'dict_units', field: 'uid'},
		// 		{id: 'userGroups', table: 'user_groups', field: 'user_group_id'},
		// 		{id: 'user', table: 'user', field: 'uid'}
		// 	]
		// 	let dict = dicts.find(item=> item.id == packet.data.dict);
		// 	if (typeof dict !== 'undefined') {
		// 		if ( Array.isArray(packet.data.elements) && packet.data.elements.length > 0) {
		// 			let str = '';
					
					
					
		// 			obj.deleted = [];
		// 			if (dict.id == 'units') {
		// 				for (let i = 0; i < packet.data.elements.length; i++) {
		// 					let row = await this.toolbox.sqlRequest('skyline', `
		// 						SELECT link FROM dict_units WHERE uid = '${packet.data.elements[i]}'
		// 					`)
		// 					if (row[0].link != '') {
		// 						await this.toolbox.sqlRequest('skyline', `
		// 							DELETE FROM user WHERE uid = '${row[0].link}'
		// 						`);	
		// 					}
		// 					await this.toolbox.sqlRequest('skyline', `
		// 						DELETE FROM ${dict.table} WHERE ${dict.field} = '${packet.data.elements[i]}'
		// 					`);	
		// 					obj.deleted.push(packet.data.elements[i]);
		// 				}
		// 			} else {

		// 				if (packet.data.elements.length == 1) str = `'${packet.data.elements[0]}'`;
		// 				else {
		// 					let newEls = [];
		// 					for (let i = 0; i < packet.data.elements.length; i++) newEls.push(`'${packet.data.elements[i]}'`);
		// 					str = newEls.join(',');
		// 				}
		// 				let rows = await this.toolbox.sqlRequest('skyline', `
		// 					DELETE FROM ${dict.table} WHERE ${dict.field} IN (${str})
		// 				`);	
		// 				obj.deleted = packet.data.elements;
		// 			}

					
		// 			// console.log(`DELETE FROM ${dict.table} WHERE ${dict.field} IN (${str})`);
					
		// 			obj.dictname = dict.id;
					
		// 			obj.status = 1;
					
		// 			// if (rows.affectedRows == packet.data.elements.length) {
		// 			// 	obj.deleted = packet.data.elements;
		// 			// } else {
		// 			// 	console.log('что-то не удалили ', arr);
		// 			// 	// что-то не удалено, определим, что не удалено
		// 			// 	let rows1 = await this.toolbox.sqlRequest('skyline', `
		// 			// 		SELECT uid FROM ${dict.table} WHERE uid IN (${arr})
		// 			// 	`);
		// 			// 	console.log('rows=> ', rows1);
		// 			// 	obj.notdels = [];
		// 			// 	rows1.map(item=> obj.notdels.push(item.uid));
		// 			// 	for (let i=0; i<packet.data.elements.length; i++) {
		// 			// 		if (obj.notdels.indexOf(packet.data.elements[i]) == -1) obj.deleted.push(packet.data.elements[i]);
		// 			// 	}
		// 			// }
		// 		} else {
		// 			err.length('Вы не указали что удалять');
		// 		}
		// 	} else {
		// 		err.push('Вы указали не существующий справочник');
		// 	}
			
		// }
		// if (err.length > 0) obj.err = err;
		let obj = await this.#coreApi.DeleteItemFromDictionary( user, packet.data );
		return obj;
	}
	async getDictUnitsSingleId( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log("getDictUnitsSingleId");
		// let obj = {list: {}, status: -1};
		// let err = [];
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// let appConfigufation = user.GetAppConfiguration('adapters');
		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	if (typeof packet.data.id !== 'undefined') {
		// 		let rows = await this.toolbox.sqlRequest('skyline', `
		// 			SELECT uid, lastname, firstname, secondname, title, region, doc_city, status, data FROM dict_units WHERE uid = '${ packet.data.id }' 
		// 		`);
		// 		obj.status = 1;
		// 		if (rows.length > 0) {
		// 			obj.list = rows;
		// 		}
		// 	} else {
		// 		err.push('Вы не указали что запрашивать.');
		// 	}
		// }
		// if (err.length > 0) obj.err = err;
		let obj = await this.#coreApi.GetUnitFromUnitsDictionary( user, packet.data );
		return obj;
	}


	async getGroupsUsers( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log("getGroupsUsers");
		// let obj = {};
		// let err = [];
		// obj.list = {};
		// obj.status = -1;
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// let appConfigufation = user.GetAppConfiguration('adapters');
		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	let rows = await this.toolbox.sqlRequest('skyline', `
		// 		SELECT user_group_id, name, apps, status FROM user_groups ORDER BY user_group_id 
		// 	`);
		// 	obj.status = 1;
		// 	if (rows.length > 0) {
		// 		obj.list = rows;
		// 	}
		// }
		// if (err.length > 0) obj.err = err;
		let obj = await this.#coreApi.GetUserGroups( user, packet.data );
		return obj;
	}
	async getDictGroupsSingleId( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log("getDictGroupsSingleId");
		// let obj = {list: {}, status: -1};
		// let err = [];
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// let appConfigufation = user.GetAppConfiguration('adapters');
		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	if (typeof packet.data.id !== 'undefined') {
		// 		let rows = await this.toolbox.sqlRequest('skyline', `
		// 			SELECT user_group_id, name, apps, status 
		// 			FROM user_groups 
		// 			WHERE user_group_id = '${ packet.data.id }'`);
		// 		obj.status = 1;
		// 		if (rows.length > 0) {
		// 			obj.list = rows;
		// 		}
		// 	} else {
		// 		err.push('Вы не указали что запрашивать.');
		// 	}
		// }
		// if (err.length > 0) obj.err = err;
		let obj = await this.#coreApi.GetGroupFromUserGroups( user, packet.data );
		return obj;
	}
	async createNewUserGroup( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log("createNewUnit");
		// let obj = {};
		// let err = [];
		// obj.status = -1;
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// let appConfigufation = user.GetAppConfiguration('adapters');
		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	let data = packet.data.fields;
		// 	if (typeof data.name === 'undefined' || data.name == '') err.push('Вы не указали название группы');
		// 	if (typeof data.status === 'undefined' || data.status == '') err.push('Вы не указали статус');
		// 	if (typeof data.apps === 'undefined' || !Array.isArray(data.apps)) err.push('Вы не указали доступные приложения создавайемой группе.');
		// 	if (err.length == 0) {
		// 		let max = 0;
		// 		let row = await this.toolbox.sqlRequest('skyline', `SELECT MAX(user_group_id) AS ugi FROM user_groups`);
		// 		if (row.length > 0) max = row[0].ugi;
		// 		max++;
		// 		let fields = ['name', 'apps', 'status'];
		// 		for (let i=0; i<fields.length; i++) {
		// 			if (typeof data[fields[i]] !== 'undefined' && fields[i] != 'apps') fields[i] = `${fields[i]}='${data[fields[i]]}'`;
		// 			else if (typeof data[fields[i]] !== 'undefined' && fields[i] == 'apps') fields[i] = `${fields[i]}= '${JSON.stringify(data[fields[i]])}'`;
		// 		}
		// 		let str = fields.join(',');
		// 		await this.toolbox.sqlRequest('skyline', `
		// 			INSERT INTO user_groups SET user_group_id='${max}', ${str}`);
		// 		obj.status = 1;
		// 	}
		// }
		// if (err.length > 0) obj.err = err;
		let obj = await this.#coreApi.CreateNewGroupInUserGroups( user, packet.data );
		return obj;
	}
	async editGroup( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log("editGroup");
		// let obj = {};
		// let err = [];
		// obj.status = -1;
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// let appConfigufation = user.GetAppConfiguration('adapters');
		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	let data = packet.data.fields;
		// 	if (typeof data.name === 'undefined' || data.name == '') err.push('Вы не указали название группы');
		// 	if (typeof data.status === 'undefined' || data.status == '') err.push('Вы не указали статус');
		// 	if (typeof data.apps === 'undefined' || !Array.isArray(data.apps)) err.push('Вы не указали доступные приложения создавайемой группе.');
		// 	if (err.length == 0) {
		// 		let fields = ['name', 'apps', 'status'];
		// 		for (let i=0; i<fields.length; i++) {
		// 			if (typeof data[fields[i]] !== 'undefined' && fields[i] != 'apps') fields[i] = `${fields[i]}='${data[fields[i]]}'`;
		// 			else if (typeof data[fields[i]] !== 'undefined' && fields[i] == 'apps') fields[i] = `${fields[i]}= '${JSON.stringify(data[fields[i]])}'`;
		// 		}
		// 		let str = fields.join(',');
		// 		let result = await this.toolbox.sqlRequest('skyline', `UPDATE user_groups SET ${str} WHERE user_group_id = '${data.user_group_id}'`);
		// 		if (result.affectedRows == 1) { 
		// 			obj.status = 1;
		// 		} else {
		// 			err.push('Операция не была осуществлена');
		// 		}
		// 	}
		// }
		// if (err.length > 0) obj.err = err;
		let obj = await this.#coreApi.EditUserGroupFromUserGroups( user, packet.data );
		return obj;
	}	


	async getUsers( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log("getUsers");
		// let obj = {};
		// let err = [];
		// obj.list = {};
		// obj.status = -1;
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// let appConfigufation = user.GetAppConfiguration('adapters');

		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	let rows = await this.toolbox.sqlRequest('skyline', `
		// 		SELECT uid, username, lastname, firstname, user_group_id FROM user
		// 	`);
		// 	obj.status = 1;
		// 	if (rows.length > 0) {
		// 		obj.list = rows;
		// 	}
		// }
		// if (err.length > 0) obj.err = err;
		// return obj;
		let obj = await this.#coreApi.GetUsersDictionary( user, packet.data );
		return obj
	}
	async getDictUserSingleId( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log("getDictUserSingleId");
		// let obj = {list: {}, status: -1};
		// let err = [];
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// let appConfigufation = user.GetAppConfiguration('adapters');
		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	if (typeof packet.data.id !== 'undefined') {
		// 		let rows = await this.toolbox.sqlRequest('skyline', `
		// 			SELECT uid, username, lastname, firstname, secondname, user_group_id, status 
		// 			FROM user 
		// 			WHERE uid = '${ packet.data.id }'`);
		// 		obj.status = 1;
		// 		if (rows.length > 0) {
		// 			obj.list = rows;
		// 		}
		// 	} else {
		// 		err.push('Вы не указали что запрашивать.');
		// 	}
		// }
		// if (err.length > 0) obj.err = err;
		let obj = await this.#coreApi.GetUserFromUsersDictionary( user, packet.data );
		return obj;
	}
	async createNewUser( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log("createNewUser");
		// let obj = {};
		// let err = [];
		// obj.status = -1;
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// let appConfigufation = user.GetAppConfiguration('adapters');
		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	let data = packet.data.fields;
		// 	if (typeof data.username === 'undefined' || data.username.length < 5) err.push('Ошибка логина. Длина логина не менее 5 символов');
		// 	else {
		// 		let row = await this.toolbox.sqlRequest('skyline', `SELECT uid FROM user WHERE username = '${data.username}'`);
		// 		if (row.length > 0) err.push('Логин занят.');
		// 	}
		// 	if (typeof data.user_group_id === 'undefined' || data.user_group_id == '') err.push('Вы не указали название группы');
		// 	else {
		// 		let row = await this.toolbox.sqlRequest('skyline', `SELECT user_group_id FROM user_groups WHERE user_group_id = '${data.user_group_id}'`);
		// 		if (row.length == 0) err.push('Указанное вами значение группа не содержится в справочнике');
		// 	}
		// 	if (typeof data.status === 'undefined' || data.status == '') err.push('Вы не указали статус');
		// 	else {
		// 		let row = await this.toolbox.sqlRequest('skyline', `SELECT uid FROM dict_user_statuses WHERE uid = '${data.status}'`);
		// 		if (row.length == 0) err.push('Указанное вами значение статуса не содержится в справочнике');
		// 	}
		// 	if (typeof data.lastname === 'undefined' || data.lastname == '') err.push('Вы не указали фамилию');
		// 	if (typeof data.firstname === 'undefined' || data.firstname == '') err.push('Вы не указали имя');
		// 	// if (typeof data.apps === 'undefined' || !Array.isArray(data.apps)) err.push('Вы не указали доступные приложения создавайемой группе.');
		// 	if (err.length == 0) {
		// 		data.lastname = this.toolbox.normName(data.lastname);
		// 		data.firstname = this.toolbox.normName(data.firstname);
		// 		if (typeof data.secondname != 'undefined') data.secondname = this.toolbox.normName(data.secondname);
		// 		else data.secondname = '';
		// 		let hash = this.toolbox.getHash(32);
		// 		let fields = ['lastname', 'firstname', 'secondname', 'status', 'user_group_id', 'username'];
		// 		for (let i=0; i<fields.length; i++) {
		// 			if (typeof data[fields[i]] !== 'undefined') fields[i] = `${fields[i]}='${data[fields[i]]}'`;
		// 			//else if (typeof data[fields[i]] !== 'undefined' && fields[i] == 'apps') fields[i] = `${fields[i]}= '${JSON.stringify(data[fields[i]])}'`;
		// 		}
		// 		let str = fields.join(',');

		// 		console.log('str=> ', str);
		// 		await this.toolbox.sqlRequest('skyline', `
		// 			INSERT INTO user SET uid='${hash}', ${str}`);
		// 		obj.status = 1;
		// 	}
		// }
		// if (err.length > 0) obj.err = err;
		let obj = await this.#coreApi.CreateNewUserInUsersDictionary( user, packet.data );
		return obj;
	}
	async editUser( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		console.log("editUser");
		// let obj = {};
		// let err = [];
		// obj.status = -1;
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// let appConfigufation = user.GetAppConfiguration('adapters');
		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	let data = packet.data.fields;

		// 	if (typeof data.user_group_id === 'undefined' || data.user_group_id == '') err.push('Вы не указали название группы');
		// 	else {
		// 		let row = await this.toolbox.sqlRequest('skyline', `SELECT user_group_id FROM user_groups WHERE user_group_id = '${data.user_group_id}'`);
		// 		if (row.length == 0) err.push('Указанное вами значение группа не содержится в справочнике');
		// 	}
		// 	if (typeof data.status === 'undefined' || data.status == '') err.push('Вы не указали статус');
		// 	else {
		// 		let row = await this.toolbox.sqlRequest('skyline', `SELECT uid FROM dict_user_statuses WHERE uid = '${data.status}'`);
		// 		if (row.length == 0) err.push('Указанное вами значение статуса не содержится в справочнике');
		// 	}
		// 	if (typeof data.lastname === 'undefined' || data.lastname == '') err.push('Вы не указали фамилию');
		// 	if (typeof data.firstname === 'undefined' || data.firstname == '') err.push('Вы не указали имя');
		// 	if (err.length == 0) {
		// 		data.lastname = this.toolbox.normName(data.lastname);
		// 		data.firstname = this.toolbox.normName(data.firstname);
		// 		if (typeof data.secondname != 'undefined') data.secondname = this.toolbox.normName(data.secondname);
		// 		else data.secondname = '';
		// 		let fields = ['lastname', 'firstname', 'secondname', 'status', 'user_group_id'];
		// 		for (let i=0; i<fields.length; i++) {
		// 			if (typeof data[fields[i]] !== 'undefined') fields[i] = `${fields[i]}='${data[fields[i]]}'`;
		// 			//else if (typeof data[fields[i]] !== 'undefined' && fields[i] == 'apps') fields[i] = `${fields[i]}= '${JSON.stringify(data[fields[i]])}'`;
		// 		}
		// 		let str = fields.join(',');
		// 		let result = await this.toolbox.sqlRequest('skyline', `UPDATE user SET ${str} WHERE uid = '${data.uid}'`);
		// 		if (result.affectedRows == 1) { 
		// 			obj.status = 1;
		// 		} else {
		// 			err.push('Операция не была осуществлена');
		// 		}
		// 	}


		// }
		// if (err.length > 0) obj.err = err;
		let obj = await this.#coreApi.EditUserFromUsersDictionary( user, packet.data );
		// console.log('obj=-> ', obj);
		return obj;
	}

	async getDictStores( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetStores( user, packet.data );
		return obj;
	}
	async getDictStoresSingleId( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetStoreFromStoresDictionary( user, packet.data );
		return obj;
	}
	async createNewStore( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.CreateNewStoreInStoresDictionary( user, packet.data );
		return obj;
	}
	async editStore( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.EditStoreFromStoresDictionary( user, packet.data );
		return obj;
	}

	async getKladrByOneString( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetKladrByOneString( user, packet.data );
		return obj;
	}


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
				// console.log("2");
				let coreActions = [
					'startingLocationApp',
					'getGlobalAppDicts',
					'changeAppFields',
					'getDocumentFields',
					'getConfigurationDexDocument',
					'deleteConfigurationDexDocumentItem',
					'addNewItemConfigurationDexDocument',
					'changeStatusItemConfigurationDexDocument',
					'rankUpConfigurationDexDocumentItem',
					'rankDownConfigurationDexDocumentItem',
					
					'getDictUnits',
					'getDictUnitsSingleId',
					'getAppDictById',
					'delElementsFromDict',
					'createNewUnit',
					'editUnit',

					'getGroupsUsers',
					'getDictGroupsSingleId',
					'editGroup',
					'createNewUserGroup',

					'getUsers',
					'getDictUserSingleId',
					'createNewUser',
					'editUser',

					'getDictStores',
					'getDictStoresSingleId',
					'createNewStore',
					'editStore',

					'getKladrByOneString'
				];

				// let coreApi = new CoreApi(DATA);
				// console.log( coreApi.StartingLocation(this, user, this.name, packet.data) );
				// console.log("+++");
				if (coreActions.indexOf(packet.data.action) != -1) {
					// console.log('111111111');
					let o = await this[packet.data.action](packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
					for (let key in o) obj[key] = o[key];

					// o = await method.m(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
					// for (let key in o) obj[key] = o[key];
				} else {
					// console.log("222222222");
				

				// if (packet.data.action === 'startingLocationApp') {
				// 	let o = await this.startingLocationApp(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
				// 	for (let key in o) obj[key] = o[key];
				// } else if ( packet.data.action == 'getGlobalAppDicts' ) {
				// 	let o = await this.getGlobalAppDicts(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
				// 	for (let key in o) obj[key] = o[key];
				// } else if ( packet.data.action == 'changeAppFields' ) {
				// 	let o = await this.changeAppFields(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
				// 	for (let key in o) obj[key] = o[key];
				// } else if ( packet.data.action == 'getDocumentFields' ) {
				// 	let o = await this.getDocumentFields(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
				// 	for (let key in o) obj[key] = o[key];
				// } else if ( packet.data.action == 'getConfigurationDexDocument' ) {
				// 	let o = await this.getConfigurationDexDocument(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
				// 	for (let key in o) obj[key] = o[key];
				// } else if ( packet.data.action == 'deleteConfigurationDexDocumentItem' ) {
				// 	let o = await this.deleteConfigurationDexDocumentItem(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
				// 	for (let key in o) obj[key] = o[key];
				// } else if ( packet.data.action == 'addNewItemConfigurationDexDocument' ) {
				// 	let o = await this.addNewItemConfigurationDexDocument(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
				// 	for (let key in o) obj[key] = o[key];
				// } else if ( packet.data.action == 'changeStatusItemConfigurationDexDocument' ) {
				// 	let o = await this.changeStatusItemConfigurationDexDocument(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
				// 	for (let key in o) obj[key] = o[key];
				// } else if ( packet.data.action == 'rankUpConfigurationDexDocumentItem' ) {
				// 	let o = await this.rankUpConfigurationDexDocumentItem(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
				// 	for (let key in o) obj[key] = o[key];
				// } else if ( packet.data.action == 'rankDownConfigurationDexDocumentItem' ) {
				// 	let o = await this.rankDownConfigurationDexDocumentItem(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
				// 	for (let key in o) obj[key] = o[key];
				// }

				// else {
					if (packet.data.base) {
						// теперь проверим доступна ли база пользователю
						let availableBases = [];
						let ob;

						let appCnf = user.GetAppConfiguration('adapters');
						let bases = appCnf.configuration.bases;
						// if (typeof appCnf.bases === 'undefined') obj.bases = [];
						// if (typeof appCnf !== 'undefined') {
						// 	let bases = appCnf.configuration.bases;
						// 	// bases.map(item=> {
						// 	// 	for (let key in DATA) {
						// 	// 		let operator = DATA[key];
						// 	// 		for (let i=0; i<operator.bases.length; i++) {
						// 	// 			let element = operator.bases[i];
						// 	// 			// console.log('element=> ', element, ' item=> ', item);
						// 	// 			if (element.name == item) {
						// 	// 				// console.log('user.username=> ',user.UserName, ' element.configuration.base=> ', element.configuration.base);
						// 	// 				availableBases.push(element.configuration.pseudoName); 
						// 	// 			}
						// 	// 		}
						// 	// 	}
						// 	// })
						// }


						for (let key in DATA) {
							let operator = DATA[key];
							for (let i=0; i<operator.bases.length; i++) {
								let element = operator.bases[i];
								if (packet.data.base) {
									// если есть база, то определим оператора
									if (packet.data.base === element.configuration.pseudoName) ob = key;
								}
								if (bases.indexOf(element.name) != -1) availableBases.push(element.configuration.pseudoName);

								// let sqlResponse = await this.toolbox.sqlRequest(element.configuration.base, `
								// 	SELECT * FROM users 
								// 	WHERE login = '${user.username}' 
								// `)
								// if (sqlResponse.length > 0) availableBases.push(element.configuration.pseudoName);
							}
						}
						if (availableBases.indexOf(packet.data.base) == -1) err.push(`Пользователю доступно приложение, но выбранная база не доступна`);
						else {
							// приложение доступно пользователю и запущено им. Значит выполним то, что он просит
							for (let i=0; i<this.adapters.length; i++) {
								if (this.adapters[i].operator == ob && this.adapters[i].pseudoName == packet.data.base && typeof this.adapters[i].apiCommands !== 'undefined') {
									// console.log('api для адаптера ', this.adapters[i]);
									let o = await this.adapters[i].apiCommands(packet, user);
									// if (o.err) {
									// 	// obj.err = o.err;
									// 	if (o.hash) obj.hash = o.hash;
									// 	if (o.appHash) obj.appHash = o.appHash;
									// 	for (let key in o) obj[key] = o[key];
									// } else { 
									// 	for (let key in o) obj[key] = o[key];
									// 	//obj.list = result.data;
									// }
									for (let key in o) obj[key] = o[key];
									obj.status = 1;
									break;
								}
							}
							// let subscriber =  SUBSCRIBERS[packet.uid];
					  //       delete SUBSCRIBERS[packet.uid];
					  //       subscriber.res.end(JSON.stringify(dp));
						}
					}
				}
				
			}
		}
		return obj;



		// let err = [];
		// let dp = JSON.parse(JSON.stringify(defPacket));
		// dp.subcom = 'appApi';
		// dp.data.action = packet.data.action;
		// // проверим какие базы доступны пользователю 
		// let user = AUTH_USERS.find(element=> element.uid === packet.uid);
		// if (user.allowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	if (user.runningApps.indexOf(this.name) == -1) {
		// 		err.push(`Для работы с приложением ${this.name} его нужно сначала запустить`);
		// 	} else {
		// 		// console.log("11111");
		// 		if (packet.data.action === 'startingLocationApp') {
		// 			await this.startingLocationApp(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
		// 		} else {
		// 			// теперь проверим, доступна ли база для пользователя
		// 			let availableBases = [];
		// 			let ob;
		// 			for (let key in DATA) {
		// 				let operator = DATA[key];
		// 				for (let i=0; i<operator.bases.length; i++) {
		// 					let element = operator.bases[i];
		// 					if (packet.data.base) {
		// 						// если есть база, то определим оператора
		// 						if (packet.data.base === element.configuration.pseudoName) ob = key;
		// 					}
		// 					let sqlResponse = await this.toolbox.sqlRequest(element.configuration.base, `
		// 						SELECT * FROM users 
		// 						WHERE login = '${user.username}' 
		// 					`)
		// 					if (sqlResponse.length > 0) availableBases.push(element.configuration.pseudoName);
		// 				}
		// 			}
		// 			if (availableBases.indexOf(packet.data.base) == -1) err.push(`Пользователю доступно приложение, но выбранная база не доступна`);
		// 			else {
		// 				// приложение доступно пользователю и запущено им. Значит выполним то, что он просит
		// 				for (let i=0; i<this.adapters.length; i++) {
		// 					if (this.adapters[i].operator == ob && typeof this.adapters[i].apiCommands !== 'undefined') {
		// 						let result = await this.adapters[i].apiCommands(packet, user);
		// 						if (result.err) dp.data.err = result.err;
		// 						else dp.data.result = result.data;
		// 						break;
		// 					}
		// 				}
		// 				// console.log("++++++");
		// 				let subscriber =  SUBSCRIBERS[packet.uid];
		// 		        delete SUBSCRIBERS[packet.uid];
		// 		        subscriber.res.end(JSON.stringify(dp));
		// 			}
		// 		}
		// 	}
		// }
	}
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let defPacket = {
    com: `skyline.apps.${APP_NAME}`,
    data: {}
}

let ROUTES = {};
let that;

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
const TIMERS = {
	SENDING_DOCUMENTS: 1500,
	SEARCH_DOCUMENTS_FOR_EXPORT: 5000,
	SEARCH_TERRORISTS: 1000*60*60*4,// проверка каждые 4 часа
	PICK_UP_OLD_SENDING: 10000,
	TOKEN_CHECK_ON_AGING: 30000,
}
const ACTION_FOR_TICKERS = [
	{
		action: 'interval',
		timer: TIMERS.SEARCH_DOCUMENTS_FOR_EXPORT,
		method: 'checkDocumentForExport'
	},
	{
		action: 'interval',
		timer: TIMERS.SENDING_DOCUMENTS,
		method: 'sendDocument'
	},
	{
		action: 'timeout',
		timer: TIMERS.PICK_UP_OLD_SENDING,
		method: 'pickUpOldSending'
	},
	{
		action: 'interval',
		timer: TIMERS.TOKEN_CHECK_ON_AGING,
		method: 'checkTokens'
	},
]

let COMMONBASE = [
	{connectionLimit:60, host:'192.168.0.33', user:"dex", password:"dex", base:"dex_bases", pseudoName: 'DEXSERVER'}
]


class yotaAdapter extends AdapterYota {
    constructor(value) {
        super(value);
    }
}
class megafonAdapter extends AdapterMegafon {
    constructor(value) {
        super(value);
    }
}
class mtsAdapter extends AdapterMTS {
    constructor(value) {
        super(value);
    }
}
class beelineAdapter extends AdapterBeeline {
    constructor(value) {
        super(value);
    }
}

// var core = new Core();
module.exports = Core;