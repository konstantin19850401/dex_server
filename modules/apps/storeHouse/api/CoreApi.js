'use strict'
let Api = require('./Api');
class CoreApi extends Api {
	#appid = 'storeHouse';
	#core;
	constructor(bases, toolbox, core) {
		super(bases, toolbox);
		this.#core = core;
	}
	// ПРИВАТНЫЕ МЕТОДЫ
	#ValidateUser( user ) {
		let obj = {errs: [], configuration: null};
		if ( typeof user !== 'undefined' ) {
			if ( user.AllowedApps.indexOf(this.#appid) != -1 ) {
				let userConfiguration = user.GetAppConfiguration(this.#appid);
				if ( typeof userConfiguration !== 'undefined' ) obj.configuration = userConfiguration;
				else obj.errs.push(`У пользователя ${user.UserName} не найдена конфигурация для приложения ${this.#appid}`);
			} else obj.errs.push(`Для пользователя ${user.UserName} не доступно приложение ${this.#appid}`);
		} else obj.errs('Пользователь отсутствует!');
		return obj;
	}
	// ПУБЛИЧНЫЕ МЕТОДЫ
	async StartingLocation( user, data ) {
		console.log(`запрос StartingLocation для appid = ${this.#appid}`);
		let obj = {status: -1, list: [], units: [], errs: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let documents = await this.Toolbox.sqlRequest('skyline', `
				SELECT id, date 
				FROM RS_journal
			`);
			if ( documents.length > 0 ) documents.map(item=> obj.list.push({docnum: item.id, date: item.date}));
			let units = await this.Toolbox.sqlRequest('skyline', `
				SELECT uid, title  
				FROM dict_units 
				WHERE status = '1'
			`);
			if ( units.length > 0 ) units.map(item=> obj.units.push({uid: item.uid, title: item.title}));
			obj.status = 1; 
		} 
		return obj;
	}
	// РАБОТА СО СПРАВОЧНИКАМИ
}
module.exports = CoreApi;