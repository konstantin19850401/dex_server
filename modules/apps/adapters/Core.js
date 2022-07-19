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
	#coreApi;#dicts = {};#dictsList;
	#dictsV1 = {};#dictsListV1;
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

		//проверить наличие таблиц
		

		console.log(`\t\t========= Приложение ${this.name} запущено ======`);	
	}
	get name() {return APP_NAME}
	get title() {return this._name}
	get appDescription() {return this._description}
	get picture() {return this._pic;}
	get conname() {return APP_CONNECTOR}
	get appRoutes() {return that.ROUTES;}
	get tableShcemas() {
		let schemas = [
			{name: 'dicts_list', description: 'Справочник Список Справочников', table: 'dict_tables', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'dict', type: 'string', title: 'Справочник', sqlType: 'VARCHAR', len: 100, minLen: 1, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
				]
			},
			{name: 'flds_tables', description: 'Справочник Список полей таблиц', table: 'dict_flds_tables', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'dict', type: 'string', title: 'Справочник', sqlType: 'VARCHAR', len: 100, minLen: 1, unique: false},
					{name: 'fld', type: 'string', title: 'UID', sqlType: 'VARCHAR', len: 100, minLen: 1, unique: false},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
				]
			},
			{name: 'controls', description: 'Справочник контролей', table: 'dict_controls', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'apps', description: 'Справочник приложений', table: 'dict_apps', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'app', type: 'string', title: 'Приложение', sqlType: 'VARCHAR', len: 100, minLen: 1, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'sex', description: 'Справочник полов', table: 'dict_sex', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'user_groups', description: 'Справочник групп пользователей', table: 'dict_user_groups', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'apps', type: 'string', title: 'Доступные приложения', sqlType: 'VARCHAR', len: 100, foreignKey: 'apps.app', multy: true, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'regions', description: 'Справочник регионов', table: 'dict_regions', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 11, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'short_title', type: 'string', title: 'Сокращенное наименование', sqlType: 'VARCHAR', len: 50, unique: false},
					{name: 'sets_bases', type: 'number', title: 'Набор баз', sqlType: 'INT', len: 5, foreignKey: 'sets_bases.id', unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'statuses', description: 'Справочник статусов', table: 'dict_statuses', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 11, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false}
				]
			},
			{name: 'el_signs', description: 'Справочник статусов электронных подписей', table: 'dict_el_signs', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'uid', type: 'string', title: 'UID', sqlType: 'INT', len: 10, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'dex_document_statuses', description: 'Справочник статусов для документов DEX', table: 'dict_dex_document_statuses', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 11, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'uid', type: 'number', title: 'UID', sqlType: 'INT', len: 10, unique: true},
					{name: 'color', type: 'number', title: 'Цвет поля', sqlType: 'INT', len: 5,  foreignKey: 'colors.id', unique: false},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'sets_bases', description: 'Справочник наборов баз для доступа', table: 'dict_sets_bases', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 11, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'bases', type: 'string', title: 'Базы', sqlType: 'VARCHAR', len: 500, foreignKey: "bases.uid", multy: true, unique: false, },
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 500, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'bases', description: 'Справочник баз', table: 'dict_bases', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 11, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'uid', type: 'string', title: 'UID', sqlType: 'VARCHAR', len: 50, minLen: 1, unique: true},
					{name: 'operator', type: 'string', title: 'Оператор', sqlType: 'VARCHAR', len: 50, foreignKey: "oparators.uid", unique: false},
					{name: 'base', type: 'string', title: 'Название БД SQL', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'sqlPoolName', type: 'string', title: 'Название БД в пуле баз', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'title', type: 'string', title: 'Наименование базы', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'oparators', description: 'Справочник операторов сотовой связи', table: 'dict_operators', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 11, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'uid', type: 'string', title: 'UID', sqlType: 'VARCHAR', len: 50, minLen: 1, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'icc_length', type: 'number', title: 'Длина ICC', sqlType: 'INT', len: 2, unique: false},
					{name: 'msisdn_length', type: 'number', title: 'Длина MSISDN', sqlType: 'INT', len: 2, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'identity_documents', description: 'Справочник ДУЛов', table: 'dict_identity_documents', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 2, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'countries', description: 'Справочник стран', table: 'dict_countries', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 10, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'sim_types', description: 'Справочник типов SIM-карт', table: 'dict_sim_types', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'abonent_categories', description: 'Справочник категорий абонентов', table: 'dict_abonent_categories', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'uid', type: 'string', title: 'UID', sqlType: 'VARCHAR', len: 50, minLen: 1, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'visible_fields', description: 'Справочник видимых полей справочников', table: 'dict_visible_fields', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'dict', type: 'string', title: 'Справочник', sqlType: 'VARCHAR', len: 100, foreignKey: 'dicts_list.dict', unique: true},
					{name: 'flds', type: 'string', title: 'Набор полей', sqlType: 'VARCHAR', len: 300, foreignKey: 'flds_tables.fld', multy: true, where: {field: "dict", target: "dicts_list.dict"}, unique: false},
					{name: 'author', type: 'string', title: 'Автор', sqlType: 'VARCHAR', len: 32, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'contractor_types', description: 'Справочник типов контрагентов', table: 'dict_contractor_types', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'short_title', type: 'string', title: 'Сокращенное наименование', sqlType: 'VARCHAR', len: 50, unique: false},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'contractors', description: 'Справочник контрагентов', table: 'dict_contractors', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'contractor_type', type: 'number', title: 'Тип контрагента', sqlType: 'INT', len: 5, foreignKey: 'contractor_types.id', unique: false},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'lastname', type: 'string', title: 'Фамилия', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'firstname', type: 'string', title: 'Имя', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'secondname', type: 'string', title: 'Отчество', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'stores', description: 'Справочник торговых точек', table: 'dict_stores', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 10, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'dex_uid', type: 'number', title: 'DEX_UID', sqlType: 'INT', len: 10, minLen: 1, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 200, unique: false},
					{name: 'parent', type: 'number', title: 'Контрагент владелец', sqlType: 'INT', len: 10, foreignKey: 'contractors.id', unique: false},
					{name: 'region', type: 'number', title: 'Регион расположения', sqlType: 'INT', len: 5, foreignKey: 'regions.id', unique: false},
					{name: 'address', type: 'string', title: 'Адрес', sqlType: 'VARCHAR', len: 500, unique: false, ifAddress: true},
					{name: 'created', type: 'string', title: 'Дата создания', sqlType: 'TIMESTAMP', len: 100, unique: false},
					{name: 'allowed_bases', type: 'number', title: 'Набор доступных баз', sqlType: 'INT', len: 5, foreignKey: 'sets_bases.id', unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'mega_profiles', description: 'Справочник профилей МегаФон', table: 'dict_mega_profiles', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 10, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'username', type: 'string', title: 'Логин', sqlType: 'VARCHAR', len: 100, minLen: 1, unique: false},
					{name: 'password', type: 'string', title: 'Пароль', sqlType: 'VARCHAR', len: 100, minLen: 1, unique: false},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'agent_id', type: 'string', title: 'Агентский ID', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'mega_stores', description: 'Справочник торговых точек МегаФон', table: 'dict_megafon_stores', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 10, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'megafon_code', type: 'string', title: 'Имя точки', sqlType: 'VARCHAR', len: 100, minLen: 1, unique: false},
					{name: 'megafon_sale_point_id', type: 'string', title: 'Код точки', sqlType: 'VARCHAR', len: 100, minLen: 1, unique: false},
					{name: 'dex_store', type: 'number', title: 'Торговая точка DEX', sqlType: 'INT', len: 10, foreignKey: 'stores.id', unique: false},
					{name: 'dex_megafon_profile', type: 'number', title: 'Профиль отправки', sqlType: 'INT', len: 100, foreignKey: 'mega_profiles.id', unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'rights', description: 'Справочник прав', table: 'dict_rights', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 10, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'uid', type: 'string', title: 'UID', sqlType: 'VARCHAR', len: 50, minLen: 1, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, minLen: 1, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'sets_rights', description: 'Справочник наборы прав', table: 'dict_sets_rights', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 10, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'rights', type: 'string', title: 'Набор прав', sqlType: 'VARCHAR', len: 100, foreignKey: 'rights.uid', multy: true, unique: false},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, minLen: 1, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'dex_data_fields', description: 'Справочник полей документа dex', table: 'dict_dex_data_fields', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 10, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'uid', type: 'string', title: 'UID', sqlType: 'VARCHAR', len: 100, minLen: 3, unique: true},
					{name: 'dict', type: 'string', title: 'Данные из справочника', sqlType: 'VARCHAR', len: 100, minLen: 3, foreignKey: 'dicts_list.dict', unique: false},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, minLen: 1, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'dex_visible_fields', description: 'Справочник видимых полей для операторов dex', table: 'dict_dex_visible_fields', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 10, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'operator', type: 'string', title: 'Оператор', sqlType: 'VARCHAR', len: 50, minLen: 1, foreignKey: 'oparators.uid', unique: false},
					{name: 'flds', type: 'string', title: 'Набор полей', sqlType: 'VARCHAR', len: 100, foreignKey: 'dex_data_fields.uid', multy: true, unique: false},
					{name: 'author', type: 'string', title: 'Автор', sqlType: 'VARCHAR', len: 32, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'data_types', description: 'Справочник типов данных', table: 'dict_data_types', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'uid', type: 'string', title: 'UID', sqlType: 'VARCHAR', len: 20, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			},
			{name: 'colors', description: 'Справочник цветов', table: 'dict_colors', type: 'dict',
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'code', type: 'string', title: 'Код', sqlType: 'VARCHAR', len: 20, unique: true},
					{name: 'title', type: 'string', title: 'Наименование', sqlType: 'VARCHAR', len: 100, unique: false},
					{name: 'status', type: 'number', title: 'Статус', sqlType: 'INT', len: 1, foreignKey: 'statuses.id', unique: false}
				]
			}
		];
		return schemas;
	}
	get mappingSchems() {
		let schemas = [
			{name: 'sex', description: 'Таблица соответствий для справочника полов', fieldName: "Sex", table: 'mapping_sex', type: "mapping",
				fields: [
					{name: 'id', type: 'number', title: 'ID', sqlType: 'INT', len: 5, autoIncrement: true, primaryKey: true, unique: true},
					{name: 'target', type: 'string', title: 'Поле dex', sqlType: 'VARCHAR', len: 20, unique: true},
					{name: 'dex_dict', type: 'string', title: 'Набор значений из таблицы dex', sqlType: 'VARCHAR', len: 20, foreignKey: 'dex_data_fields.uid', multy: true, unique: false},
					{name: 'dict', type: 'string', title: 'Значение из таблицы', sqlType: 'VARCHAR', len: 20, unique: true},
				]
			}
		]
		return schemas;
	}
	async checkTables() {
		let schemas = this.tableShcemas;
		// для начала офомим самые первые справочники, настройки
		let rows = await this.toolbox.sqlRequest('skyline1', `SHOW TABLES FROM skyline1 LIKE 'dict_flds_tables'`);
		if (rows.length == 0) {
			let schema = schemas.find(item=> item.name == 'flds_tables');
			if (typeof schema !== 'undefined') {
				let data = [];
				for (let j = 0; j < schema.fields.length; j++) {
					let conf;
					if (schema.fields[j].sqlType == "TIMESTAMP") conf = `${schema.fields[j].name} ${schema.fields[j].sqlType} NOT NULL DEFAULT CURRENT_TIMESTAMP`;
					else conf = `${schema.fields[j].name} ${schema.fields[j].sqlType}(${schema.fields[j].len})`;
					if (typeof schema.fields[j].autoIncrement !== 'undefined' && schema.fields[j].autoIncrement == true) conf += ` AUTO_INCREMENT`;
					if (typeof schema.fields[j].primaryKey !== 'undefined' && schema.fields[j].primaryKey == true) conf += ` PRIMARY KEY`;
					data.push(conf);
				}
				await this.toolbox.sqlRequest('skyline1', `
					CREATE TABLE ${schema.table} ( ${data.join(',')} )
				`);
			}
		}

		for (let i = 0; i < schemas.length; i++) {
			let rows = await this.toolbox.sqlRequest('skyline1', `SHOW TABLES FROM skyline1 LIKE '${schemas[i].table}'`);
			if (rows.length == 0) {
				// такой таблицы нет, надо создать
				let data = [];
				let fldsForDict = [];
				for (let j = 0; j < schemas[i].fields.length; j++) {
					let conf;
					if (schemas[i].fields[j].sqlType == "TIMESTAMP") conf = `${schemas[i].fields[j].name} ${schemas[i].fields[j].sqlType} NOT NULL DEFAULT CURRENT_TIMESTAMP`;
					else conf = `${schemas[i].fields[j].name} ${schemas[i].fields[j].sqlType}(${schemas[i].fields[j].len})`;
					if (typeof schemas[i].fields[j].autoIncrement !== 'undefined' && schemas[i].fields[j].autoIncrement == true) conf += ` AUTO_INCREMENT`;
					if (typeof schemas[i].fields[j].primaryKey !== 'undefined' && schemas[i].fields[j].primaryKey == true) conf += ` PRIMARY KEY`;
					data.push(conf);
					// запомним поле для Справочник полей справочников
					fldsForDict.push({name: schemas[i].fields[j].name, title: schemas[i].fields[j].title});
					
				}
				let sqlReq = `CREATE TABLE ${schemas[i].table} ( ${data.join(',')} )`;
				await this.toolbox.sqlRequest('skyline1', sqlReq);

				// добавим название поля в Справочник полей справочников
				for (let j = 0; j < fldsForDict.length; j++) {
					await this.toolbox.sqlRequest('skyline1', `
						INSERT INTO dict_flds_tables 
						SET dict = '${schemas[i].name}', fld = '${schemas[i].name}.${fldsForDict[j].name}', title = '${fldsForDict[j].title}'
					`);
				}
				
				// а теперь добавим справочник в справочник справочников
				if (schemas[i].name != "dicts_list") {
					await this.toolbox.sqlRequest('skyline1', `
						INSERT INTO dict_tables 
						SET dict ='${schemas[i].name}', title = '${schemas[i].description}'
					`);
				}
			} else {
				console.log(`таблица ${schemas[i].table} существует. Не создаем.`);
			}
		} 
	}
	DictsByNames(names) {
		let dicts = [];
		let arr = [];
		if (Array.isArray(names) && names.length > 0) names.map(item=> arr.push(item));
		else if (typeof names === "string") arr.push(names);
		if (arr.length > 0) {
			for (let i = 0; i < arr.length; i++) {
				if (this.#dicts[arr[i]] != "undefined") dicts.push({name: arr[i], description: this.#dicts[arr[i]].description, list: Array.from(this.#dicts[arr[i]].rows)});
			}
		}
		return dicts;
	}
	DictsByNamesV1(names) {
		let dicts = [];
		let arr = [];
		if (Array.isArray(names) && names.length > 0) names.map(item=> arr.push(item));
		else if (typeof names === "string") arr.push(names);
		if (arr.length > 0) {
			for (let i = 0; i < arr.length; i++) {
				if (typeof this.#dictsV1[arr[i]] !== "undefined") {
					// так же отдадим схему справочника
					let schema = [];
					let schemas = this.tableShcemas;
					for (let j = 0; j < schemas.length; j++) {
						if (schemas[j].name == arr[i]) {
							schemas[j].fields.map(item=> { 
								let sch = {};
								sch.name = item.name;
								sch.title = item.title;
								sch.type = item.type;
								sch.len = item.len;
								sch.unique = item.unique;
								if (typeof item.multy !== 'undefined') sch.multy = item.multy
								if (typeof item.foreignKey !== 'undefined') sch.foreignKey = item.foreignKey;
								if (typeof item.where !== 'undefined') sch.where = item.where;
								if (typeof item.ifAddress !== 'undefined') sch.ifAddress = item.ifAddress;
								// if (typeof item.status !== "undefined") sch.status = item.status;
								schema.push(sch);
							});
							break;
						}
					}
					dicts.push({name: arr[i], description: this.#dictsV1[arr[i]].description, table: this.#dictsV1[arr[i]].table, schema: schema, list: Array.from(this.#dictsV1[arr[i]].rows)});
				}
			}
		}
		return dicts;
	}

	set connector(connector) {this._connector = connector;}

	async newInitDicts() {
		this.#dictsList = [
			{name: "users", description: "", table: "skyline.user", flds: ["uid","username","lastname","firstname","secondname"]},
			{name: "userGroups", description: "", table: "skyline.user_groups", flds: ["id","user_group_id","name","apps","status"]},
			{name: "apps", description: "", table: "skyline.dict_apps", flds: ["uid","title","status"]},
			{name: "docTypes", description: "", table: "skyline.dict_doc_types", flds: ["uid","title","status"]},
			{name: "stores", description: "Справочник торговых точек", table: "skyline.dict_stores", flds: ["uid","dex_uid","parent","lastname","firstname","secondname","title","status"]},
			{name: "docStatuses", description: "", table: "skyline.dict_doc_statuses", flds: ["uid","eng","title","status"]},
			{name: "statuses", description: "Справочник статусов", table: "skyline.dict_user_statuses", flds: ["uid","title"]},
			{name: "operators", description: "", table: "skyline.dex_dict_operators", flds: ["uid","title","icc_length","msisdn_length","status"]},
			{name: "typesProducts", description: "", table: "skyline.dict_types_products", flds: ["uid","title","status"]},
			{name: "stocks", description: "", table: "skyline.dict_stocks", flds: ["uid","title","status"]},
			{name: "dexBases", description: "", table: "skyline.dex_bases", flds: ["uid","base","operator","title","status"]},
			{name: "regions", description: "Справочник регионов РФ", table: "skyline.dict_regions", flds: ["uid","title","short_title","status"]},
			{name: "balance", description: "", table: "skyline.dex_dict_balance", flds: ["uid","title","status"]},
			{name: "simTypes", description: "", table: "skyline.dict_sim_types", flds: ["uid","title","status"]},
			{name: "contractors", description: "", table: "skyline.contractors", flds: ["uid","title","status"]},
			{name: "units", description: "Справочник отделений", table: "skyline.dict_units", flds: ["uid","title","lastname","firstname","secondname","region","data","date_create","fiz_address","legal_address","status"]},
			{name: "megafonProfiles", description: "", table: "skyline.dex_dict_megafon_dispatch_profiles", flds: ["uid","name","title","code","status"]},
			{name: "megafonStores", description: "", table: "skyline.dex_dict_megafon_stores", flds: ["id","megafon_code","megafon_sale_point_id","dex_store","dex_megafon_profile","status"]},
		];
		for (let i = 0; i < this.#dictsList.length; i++) {
			let data = this.#dictsList[i].table.split(".");
			let rows = await this.toolbox.sqlRequest(data[0], `
				SELECT ${this.#dictsList[i].flds.join(",")}
				FROM ${data[1]}
			`);
			//this.#dicts[this.#dictsList[i].name] = rows;
			this.#dicts[this.#dictsList[i].name] = {description: this.#dictsList[i].description, name: this.#dictsList[i].name, rows: rows};
			// console.log(this.#dicts[this.#dictsList[i].name]);
		}
	}

	async updateDictV1(dictName) {
		let shcemas = this.tableShcemas;
		let schema = shcemas.find(item=> item.type == "dict" && item.name == dictName);
		let flds = [];
		schema.fields.map(item=> flds.push(item.name));
		let rows = await this.toolbox.sqlRequest('skyline1', `
			SELECT ${flds.join(",")}
			FROM ${schema.table}
		`);
		this.#dictsV1[schema.name] = {description: schema.description, table: schema.table, name: schema.name, rows: rows};
	}
	async newInitDictsV1() {
		let shcemas = this.tableShcemas;
		this.#dictsListV1 = [];
		for (let i = 0; i < shcemas.length; i++) {
			if (shcemas[i].type == 'dict') {
				let flds = [];
				shcemas[i].fields.map(item=> flds.push(item.name));
				let dict = {name: shcemas[i].name, description: shcemas[i].description, table: `skyline1.${shcemas[i].table}`, flds: flds};
				this.#dictsListV1.push(dict);
			}
		}
		for (let i = 0; i < this.#dictsListV1.length; i++) {
			let data = this.#dictsListV1[i].table.split(".");
			let orderBy = '';
			if (this.#dictsListV1[i].flds.indexOf('title') != -1) orderBy = ' ORDER BY title';
			let rows = await this.toolbox.sqlRequest(data[0], `
				SELECT ${this.#dictsListV1[i].flds.join(",")}
				FROM ${data[1]} ${orderBy}
			`);
			this.#dictsV1[this.#dictsListV1[i].name] = {description: this.#dictsListV1[i].description, table: this.#dictsListV1[i].table, name: this.#dictsListV1[i].name, rows: rows};
		}
	}

	async getNewDicts(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetDicts( user, packet.data );
		return obj;
	}
	async getNewAllDicts(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetAllDicts( user, packet.data );
		return obj;
	}
	async updateNewDicts(name) {
		let dict = this.#dictsList.find(item=> item.name == name);
		if (typeof dict !== 'undefined') {
			let data = dict.table.split(".");
			let rows = await this.toolbox.sqlRequest(data[0], `
				SELECT ${dict.flds.join(",")}
				FROM ${data[1]}
			`);
			this.#dicts[name] = rows;
		}
	}

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

		await this.checkTables();
		await this.newInitDicts();
		await this.newInitDictsV1();
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
					if (operator == 'yota') this.adapters.push(new yotaAdapter(current, this));
					else if (operator == 'megafon') this.adapters.push(new megafonAdapter(current, this)); 
					else if (operator == 'mts') this.adapters.push(new mtsAdapter(current, this)); 
					else if (operator == 'beeline') this.adapters.push(new beelineAdapter(current, this)); 
				})
			}
			for (let j=0; j<this.adapters.length; j++) {
				this.adapters[j].TOOLBOX = this.toolbox;
			}
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
		console.log("Запрос стартовых данных приложения!");
		/*
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
		*/	

		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.StartingLocation( user, packet.data );
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
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.EditUnitFromUnitsDictionary( user, packet.data );
		// let obj = {};
		// let err = [];
		// obj.status = -1;
		// let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		// let appConfigufation = user.GetAppConfiguration('adapters');
		// if (user.AllowedApps.indexOf(this.name) == -1) err.push(`Для пользователя с uid = ${packet.uid} не доступно приложение ${this.name}`);
		// else {
		// 	let region;
		// 	let data = packet.data.fields;
		// 	if (typeof data.lastname === 'undefined' || data.lastname == '') err.push('Вы не указали фамилию');
		// 	if (typeof data.firstname === 'undefined' || data.firstname == '') err.push('Вы не указали имя');
		// 	if (typeof data.region === 'undefined' || data.region == '') err.push('Вы не указали регион');
		// 	if (typeof data.status === 'undefined' || data.status == '') err.push('Вы не указали статус');
		// 	let rows = await this.toolbox.sqlRequest('skyline', `SELECT * FROM dict_regions WHERE uid = '${data.region}'`);
		// 	if (rows.length == 0) err.push('Значение региона не принадлежит справочнику');
		// 	else region = rows[0];
		// 	if (err.length == 0) {
		// 		data.lastname = this.toolbox.normName(data.lastname);
		// 		data.firstname = this.toolbox.normName(data.firstname);
		// 		if (typeof data.secondname != 'undefined') data.secondname = this.toolbox.normName(data.secondname);
		// 		if (data.title == '') {
		// 			data.title = `пр. ${data.lastname} ${data.firstname}`;
		// 			if (typeof data.secondname != 'undefined') data.title = `${data.title} ${data.secondname}`;
		// 			data.title = `${data.title} - ${region.short_title}`;
		// 		}
		// 		let fields = ['lastname', 'firstname', 'secondname', 'region', 'title', 'status', 'doc_city', 'address'];
		// 		for (let i=0; i<fields.length; i++) {
		// 			if (typeof data[fields[i]] !== 'undefined') fields[i] = `${fields[i]}='${data[fields[i]]}'`;
		// 		}
		// 		let str = fields.join(',');
		// 		console.log(`UPDATE dict_units SET ${str}`);
		// 		let result = await this.toolbox.sqlRequest('skyline', `UPDATE dict_units SET ${str} WHERE uid = '${data.uid}'`);
		// 		if (result.affectedRows == 1) {
		// 			obj.status = 1;
		// 		} else {
		// 			err.push('Операция не была осуществлена');
		// 		}
		// 		console.log("result=> ", result);
		// 	}
		// }
		// if (err.length > 0) obj.err = err;
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

	async getDictDocTypes( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetDocTypes( user, packet.data );
		return obj;
	}
	async createNewDocType( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.CreateNewTypeInDocTypesDictionary( user, packet.data );
		return obj;
	}
	async getDictDocTypesSingleId( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetDocTypeFromDocTypesDictionary( user, packet.data );
		return obj;
	}
	async editDocType( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.EditDocTypeFromDocTypesDictionary( user, packet.data );
		return obj;
	}

	async getStoreJournal( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetUniversalJournal( user, packet.data );
		return obj;
	}
	async createDocumentInStoreHouse( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.СreateDocumentInUniversalJournal( user, packet.data );
		return obj;
	}

	async getDictMegafonStores( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetMegafonStoresDictionary( user, packet.data );
		return obj;
	}
	async getDictMegafonStoresSingleId( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetMegafonStoreFromMegafonStoresDictionary( user, packet.data );
		return obj;
	}
	async editMegafonStore( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.EditMegafonStoreFromMegafonStoresDictionary( user, packet.data );
		return obj;
	}

	async printAgreementUnits( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.PrintUnitsAgreementDocuments( user, packet.data );
		return obj;
	}

	async getDevelopJournal( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetDevelopJournal( user, packet.data );
		return obj;
	}
	async createNewRecordInDevelopJournal( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.CreateNewRecordInDevelopJournal( user, packet.data );
		return obj;
	}

	async getDictStatuses( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetStatuses( user, packet.data );
		return obj;
	}
	async getDictStatusesSingleId( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetStatusFromStatusesDictionary( user, packet.data );
		return obj;
	}
	async editStatus( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.EditStatusFromStatusesDictionary( user, packet.data );
		return obj;
	}
	async createNewStatus( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.CreateNewStatusInStatusesDictionary( user, packet.data );
		return obj;
	}

	async getDictSingleId( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetRecordFromDictById( user, packet.data );
		return obj;
	}
	async getDictRecords( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetDictRecords( user, packet.data );
		return obj;
	}

	async getDictsRecordsV1(packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetDictsRecordsV1( user, packet.data );
		return obj;
	}
	async getDictSingleIdV1( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetRecordFromDictByIdV1( user, packet.data );
		return obj;
	}
	async getNewAllDictsV1( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetAllDictsV1( user, packet.data );
		return obj;
	}
	async createNewRecordInDictV1( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.CreateNewRecordInDictV1( user, packet.data );
		return obj;
	}
	async getBasesV1( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetBasesV1( user, packet.data );
		return obj;
	}
	async getDictSchemaV1( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.GetDictSchemaV1( user, packet.data );
		return obj;
	}
	async delElementsFromDictV1( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.DeleteItemFromDictionaryV1( user, packet.data );
		return obj;
	}
	async clearDictV1( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.ClearDictV1( user, packet.data );
		return obj;
	}
	async editDictV1( packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS ) {
		let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
		let obj = await this.#coreApi.EditDictRecordV1( user, packet.data );
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

					'getKladrByOneString',

					"getDictDocTypes",
					"createNewDocType",
					'getDictDocTypesSingleId',
					"editDocType",
					"getStoreJournal",
					"createDocumentInStoreHouse",

					"getNewDicts",
					'getNewAllDicts',

					"getDictMegafonStores",
					"getDictMegafonStoresSingleId",
					"editMegafonStore",

					'printAgreementUnits',

					'getDevelopJournal',
					'createNewRecordInDevelopJournal',

					'getDictStatuses',
					'getDictStatusesSingleId',
					'editStatus',
					'createNewStatus',

					'getDictSingleId',
					'getDictRecords',

					'getDictsRecordsV1',
					'getDictSingleIdV1',
					'getNewAllDictsV1',
					'createNewRecordInDictV1',
					"getBasesV1",
					"getDictSchemaV1",
					"delElementsFromDictV1",
					"clearDictV1",
					"editDictV1"


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
									// obj.status = 1;
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
			{
				name: 'mts_kcr',
				configuration: {
					base: 'dex_mts_kcr',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXMTSKCR',
					description: 'МТС КЧР',
					pseudoRoute: 'mts_kcr',
					docid: 'DEXPlugin.Document.MTS.Jeans',
					loggingDir: 'logs',
					api: 'rdealer.ug.mts.ru/RemoteDealerWebServices',
				}
			},
			{
				name: 'mts_kcr_distr',
				configuration: {
					base: 'dex_mts_kcr_distr',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXMTSKCRDISTR',
					description: 'МТС КЧР ДИСТРИБУЦИЯ',
					pseudoRoute: 'mts_kcr_distr',
					docid: 'DEXPlugin.Document.MTS.Jeans',
					loggingDir: 'logs',
					api: 'rdealer.ug.mts.ru/RemoteDealerWebServices',
				}
			},
			{
				name: 'mts_kbr_salp',
				configuration: {
					base: 'dex_mts_kbr_salp',
					host: '192.168.0.33',
					user: 'dex',
					password: 'dex',
					pseudoName: 'DEXMTSKBRSALP',
					description: 'МТС КБР Салпагарова',
					pseudoRoute: 'mts_kbr_salp',
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
    constructor(value, core) {
        super(value, core);
    }
}
class megafonAdapter extends AdapterMegafon {
    constructor(value, core) {
        super(value, core);
    }
}
class mtsAdapter extends AdapterMTS {
    constructor(value, core) {
        super(value, core);
    }
}
class beelineAdapter extends AdapterBeeline {
    constructor(value, core) {
        super(value, core);
    }
}

// var core = new Core();
module.exports = Core;