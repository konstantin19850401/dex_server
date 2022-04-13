'use strict'
let Api = require('./Api');
class CoreApi extends Api {
	#appid = 'salesRepresentative';
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
				WHERE owner = '${user.UserId}'
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
	async GetUserDocuments( user, data ) {
		console.log(`запрос GetUserDocuments для appid = ${this.#appid}`);
		let obj = {status: -1, list: [], errs: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let start, end;
			let moment = this.Toolbox.getMoment();
			if ( typeof data.start !== 'undefined' ) {
				let m = moment(data.start, 'YYYYMMDD');
				if (m.isValid()) start = data.start;
				else obj.errs.push('Дата начала периода ошибочна!'); 
			} else {
				let m = moment(new Date());
				let day = d => d.date() < 10 ? `0${d.date()}`: d.date(); 
				let month = d => d.month() + 1 < 10 ? `0${d.month()+1}`: d.month();
				start = `${m.year()}${month(m)}${day(m)}`;
			}
			if ( typeof data.end !== 'undefined' ) {
				let m = moment(data.end, 'YYYYMMDD');
				if (m.isValid()) end = data.end;
				else obj.errs.push('Дата окончания периода ошибочна!');
			} else end = start;
			if (obj.errs.length == 0) {
				// определим в какой группе находится юзер
				let where = `WHERE rsj.date >= '${start}' AND rsj.date <= '${end}'`;
				if (user.UserGroup != 0) where += ` AND rsj.owner = '${user.UserId}'`;
				let rows = await this.Toolbox.sqlRequest('skyline', `
					SELECT rsj.id, rsj.date, rsj.status, u.username 
					FROM RS_journal AS rsj
					LEFT JOIN user AS u 
					ON rsj.owner = u.uid
					${where} 
				`);
				obj.headers = [
					{id: 'docnum', name: 'Номер документа'}, 
					{id: 'date', name: 'Дата документа'}, 
					{id: 'owner', name: 'Создатель'},
					{id: 'status', name: 'Статус'}
				];
				if ( rows.length > 0 ) rows.map(item=> obj.list.push({docnum: item.id, date: item.date, owner: item.username, status: item.status}));
				obj.status = 1;
				console.log('obj=>', obj);
			}
		}
		return obj;
	}
	async GetUnits( user, data ) {
		console.log(`запрос GetUnits для appid = ${this.#appid}`);
		let obj = {status: -1, list: [], errs: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let cnf = user.AllAppsConfigs.find(item=> item.name == 'salesRepresentative');
			let els = [];
			let regions = cnf.configuration.regions;
			regions.map(item=> els.push(`'${item}'`));
			let where = `WHERE status = '1'`;
			if (els.length > 0) where += ` AND region IN (${els.join(',')})`;
			let rows = await this.Toolbox.sqlRequest('skyline', `
				SELECT uid, title 
				FROM dict_units 
				${where}
				ORDER BY title
			`);
			obj.list = rows;
			obj.status = 1;
		}
		return obj;
	}
	async GetChildsUnit(user, data) {
		console.log(`запрос GetChildsUnit для appid = ${this.#appid}`);
		let obj = {status: -1, list: [], errs: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			if (typeof data.uid !== 'undefined') {
				let rows = await this.Toolbox.sqlRequest('skyline', `
					SELECT uid, title, data
					FROM dict_stores
					WHERE parent = ${data.uid}
				`)
				obj.parent = data.uid;
				obj.list = rows;
				obj.status = 1;
			} else obj.errs.push('Вы не указали отделение для которого хотите получить торговые точки');
		}
		return obj;
	}
	// РАБОТА СО СПРАВОЧНИКАМИ
}
module.exports = CoreApi;