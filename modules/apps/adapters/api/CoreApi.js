'use strict'
let Api = require('./Api');
class CoreApi extends Api {
	#appid = 'adapters';
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
	StartingLocation( user, data ) {
		console.log(`запрос StartingLocation для appid = ${this.#appid}`);
		let obj = {status: -1, bases: [], errs: []};
		let userConfiguration = user.GetAppConfiguration(this.#appid);
		if ( typeof userConfiguration !== 'undefined' ) {
			let bases = userConfiguration.configuration.bases;
			bases.map(base=> {
				let allOperators = this.Bases;
				for ( let key in allOperators ) {
					let operator = allOperators[key];
					for (let i=0; i<operator.bases.length; i++) {
						let element = operator.bases[i];
						if (element.name == base) {
							obj.bases.push({id: element.configuration.pseudoName, description: element.configuration.description}); 
							obj.status = 1;
						}
					}
				}
			})
		} else obj.errs.push(`У пользователя ${user.UserName} не найдена конфигурация для приложения ${this.#appid}`);
		return obj;
	}
	// РАБОТА СО СПРАВОЧНИКАМИ
	GetDicts( user, data ) {
		let obj = {status: -1, errs: [], list: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			if (Array.isArray(data.dicts)) {
				let dicts = this.#core.DictsByNames(data.dicts);
				if (dicts.length > 0) {
					for (let i = 0; i < dicts.length; i++) {
						obj.list.push({name: dicts[i].name, list: dicts[i].list});
					}
					obj.status = 1;
				}
			} else obj.errs.push('Запрашиваемые справочники должны передаваться массивом');
		}
		return obj;
	}
	
	// удаление записи из справочника
	async DeleteItemFromDictionary( user, data ) {
		console.log(`запрос DeleteItemFromDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], deleted: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let dicts = [
				{id: 'units', table: 'dict_units', field: 'uid'},
				{id: 'userGroups', table: 'user_groups', field: 'user_group_id'},
				{id: 'user', table: 'user', field: 'uid'},
				{id: 'stores', table: 'dict_stores', field: 'uid'},
				{id: 'docTypes', table: 'dict_doc_types', field: 'uid'}
			]
			let dict = dicts.find(item=> item.id == data.dict);
			if ( typeof dict !== 'undefined' ) {
				if ( Array.isArray(data.elements) && data.elements.length > 0 ) {
					let els = [];
					data.elements.map(item=> els.push(`'${item}'`));					
					if ( dict.id == 'units' ) {
						let rows = await this.Toolbox.sqlRequest('skyline', `
							SELECT link FROM dict_units 
							WHERE uid IN (${els.join(',')})
						`);
						let links = [];
						rows.map(item=> links.push(`'${item.link}'`));
						if (rows.length > 0) {
							await this.Toolbox.sqlRequest('skyline', `
								DELETE FROM user 
								WHERE uid IN (${links.join(',')})
							`);
						}
						// теперь удалить торговые точки
						await this.Toolbox.sqlRequest('skyline', `
							DELETE FROM dict_stores 
							WHERE parent IN (${els.join(',')})
						`);
					}
					if (dict.id == 'stores') {
						let storeRow = await this.Toolbox.sqlRequest('skyline', `
							SELECT parent FROM dict_stores 
							WHERE uid IN (${els.join(',')})
						`);
						if (storeRow.length > 0) {
							for (let i=0; i < storeRow.length; i++) {
								let unitsRow = await this.Toolbox.sqlRequest('skyline', `
									SELECT cnt_stores 
									FROM dict_units 
									WHERE uid = '${storeRow[i].parent}'
								`);
								if (unitsRow.length > 0) {
									let cnt = unitsRow[0].cnt_stores;
									cnt--;
									if (cnt < 0) cnt = 0;
									await this.Toolbox.sqlRequest('skyline', `
										UPDATE dict_units 
										SET cnt_stores = '${cnt}'
										WHERE uid = '${storeRow[i].parent}'
									`);
								}
							}
						}
					}
					await this.Toolbox.sqlRequest('skyline', `
						DELETE FROM ${dict.table} 
						WHERE ${dict.field} IN (${els.join(',')})
					`);
					obj.dictname = dict.id;
					obj.deleted = data.elements;
					obj.status = 1;
				} else obj.errs.push('Вы не указали что удалять!');
			} else obj.errs.push('Вы указали не существующий справочник!');
		}
		return obj;
	}

	// справочник пользователей
	async GetUsersDictionary( user, data ) {
		console.log(`запрос GetUsersDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: {}};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let rows = await this.Toolbox.sqlRequest(`skyline`, `
				SELECT uid, username, lastname, firstname, user_group_id 
				FROM user
			`);
			if ( rows.length > 0 ) obj.list = rows;
			obj.status = 1;
		}
		return obj;
	}
	async GetUserFromUsersDictionary( user, data ) {
		console.log(`запрос GetUserFromUsersDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: {}};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			if (typeof data.id !== 'undefined') {
				let rows = await this.Toolbox.sqlRequest(`skyline`, `
					SELECT uid, username, lastname, firstname, secondname, user_group_id, status 
					FROM user 
					WHERE uid = '${data.id}'
				`);
				if ( rows.length > 0 ) { 
					obj.list = rows;
					obj.status = 1;
				} else obj.errs.push( 'Запрошенная вами запись не существует!' );
			} else obj.errs.push("Вы не указали, что запрашивать");
		}
		return obj;
	}
	async CreateNewUserInUsersDictionary( user, data ) {
		console.log(`запрос CreateNewUserInUsersDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let newUserData = data.fields;
			if ( typeof newUserData.username !== 'string') obj.errs.push('Для поля "Логин" тип данных должен быть строка!');
			else {
				if ( newUserData.username.length < 5 ) obj.errs.push('Длина строки поля "Логин" не может быть меньше 5 символов!');
				else {
					let row = await this.Toolbox.sqlRequest('skyline', `
						SELECT uid 
						FROM user 
						WHERE username = '${newUserData.username}'`);
					if (row.length > 0) obj.errs.push('Данный логин уже занят. Придумайте другой!');
				}
			}
			if ( !isNaN(parseFloat(newUserData.user_group_id)) && isFinite(newUserData.user_group_id) ) {
				let row = await this.Toolbox.sqlRequest('skyline', `
					SELECT user_group_id 
					FROM user_groups 
					WHERE user_group_id = '${newUserData.user_group_id}'`);
				if (row.length == 0) obj.errs.push('Указанное вами значение для поля "Группа пользователя" не содержится в справочнике!');
			} else obj.errs.push('Поле "Группа пользователя" обязательно для заполнения!');
			if ( !isNaN(parseFloat(newUserData.status)) && isFinite(newUserData.status) ) {
				let row = await this.Toolbox.sqlRequest('skyline', `
					SELECT uid 
					FROM dict_user_statuses 
					WHERE uid = '${newUserData.status}'`);
				if (row.length == 0) obj.err.push('Указанное вами значение для поля "Статус" не содержится в справочнике!');
			} else obj.errs.push('Поле "Статус" обязательно для заполнения!');
			if ( typeof newUserData.lastname !== 'string' || newUserData.lastname == '' ) obj.errs.push('Поле "Фамилия" обязательно для заполнения!');
			if ( typeof newUserData.firstname !== 'string' || newUserData.firstname == '' ) obj.errs.push('Поле "Имя" обязательно для заполнения!');
			if ( obj.errs.length == 0 ) {
				newUserData.lastname = this.Toolbox.normName(newUserData.lastname);
				newUserData.firstname = this.Toolbox.normName(newUserData.firstname);
				if ( typeof newUserData.secondname === 'string' ) newUserData.secondname = this.Toolbox.normName(newUserData.secondname);
				newUserData.secondname = '';
				let hash = this.Toolbox.generateUniqueHash();
				await this.Toolbox.sqlRequest('skyline', `
					INSERT INTO user 
					SET uid = '${hash}', username = '${newUserData.username}', lastname = '${newUserData.lastname}', firstname = '${newUserData.firstname}', secondname = '${newUserData.secondname}',
						status = '${newUserData.status}', user_group_id = '${newUserData.user_group_id}'
				`);
				obj.status = 1;
			}
		}
		return obj;
	}
	async EditUserFromUsersDictionary( user, data ) {
		console.log(`запрос EditUserFromUsersDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let editUserData = data.fields;
			if ( !isNaN(parseFloat(editUserData.user_group_id)) && isFinite(editUserData.user_group_id) ) {
				let row = await this.Toolbox.sqlRequest('skyline', `
					SELECT user_group_id 
					FROM user_groups 
					WHERE user_group_id = '${editUserData.user_group_id}'`);
				if (row.length == 0) obj.errs.push('Указанное вами значение для поля "Группа пользователя" не содержится в справочнике!');
			} else obj.errs.push('Поле "Группа пользователя" обязательно для заполнения!');
			if ( !isNaN(parseFloat(editUserData.status)) && isFinite(editUserData.status) ) {
				let row = await this.Toolbox.sqlRequest('skyline', `
					SELECT uid 
					FROM dict_user_statuses 
					WHERE uid = '${editUserData.status}'`);
				if (row.length == 0) obj.err.push('Указанное вами значение для поля "Статус" не содержится в справочнике!');
			} else obj.errs.push('Поле "Статус" обязательно для заполнения!');
			if ( typeof editUserData.lastname !== 'string' || editUserData.lastname == '' ) obj.errs.push('Поле "Фамилия" обязательно для заполнения!');
			if ( typeof editUserData.firstname !== 'string' || editUserData.firstname == '' ) obj.errs.push('Поле "Имя" обязательно для заполнения!');
			if ( obj.errs.length == 0 ) {
				editUserData.lastname = this.Toolbox.normName(editUserData.lastname);
				editUserData.firstname = this.Toolbox.normName(editUserData.firstname);
				if ( typeof editUserData.secondname === 'string' ) editUserData.secondname = this.Toolbox.normName(editUserData.secondname);
				editUserData.secondname = '';
				let row = await this.Toolbox.sqlRequest('skyline', `
					UPDATE user 
					SET lastname = '${editUserData.lastname}', firstname = '${editUserData.firstname}', secondname = '${editUserData.secondname}',
						status = '${editUserData.status}', user_group_id = '${editUserData.user_group_id}' 
					WHERE uid = '${editUserData.uid}'
				`);
				if ( row.affectedRows == 1 ) obj.status = 1;
				else obj.errs.push('Редактирование записи завершилось с ошибкой!');
			}
		}
		return obj;
	}

	// справочник групп пользователей
	async GetUserGroups( user, data ) {
		console.log(`запрос GetUserGroups для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: {}};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let rows = await this.Toolbox.sqlRequest(`skyline`, `
				SELECT user_group_id, name, apps, status 
				FROM user_groups 
				ORDER BY user_group_id
			`);
			if ( rows.length > 0 ) obj.list = rows;
			obj.status = 1;
		}
		return obj;
	}
	async GetGroupFromUserGroups( user, data ) {
		console.log(`запрос GetGroupFromUserGroups для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: {}};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			if (typeof data.id !== 'undefined') {
				let rows = await this.Toolbox.sqlRequest('skyline', `
					SELECT user_group_id, name, apps, status 
					FROM user_groups 
					WHERE user_group_id = '${ data.id }'`);
				if ( rows.length > 0 ) {
					obj.list = rows;
					obj.status = 1;
				} else obj.errs.push( 'Запрошенная вами запись не существует!' );
			} else obj.errs.push("Вы не указали, что запрашивать");
		}
		return obj;
	}
	async CreateNewGroupInUserGroups( user, data ) {
		console.log(`запрос CreateNewGroupInUserGroups для appid = ${this.#appid}`);
		let obj = {status: -1, errs: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let newUserGroupsData = data.fields;
			if (typeof newUserGroupsData.name === 'undefined' || newUserGroupsData.name == '') obj.errs.push('Вы не указали название группы!');
			if (typeof newUserGroupsData.status === 'undefined' || newUserGroupsData.status == '') obj.errs.push('Вы не указали статус!');
			if (typeof newUserGroupsData.apps === 'undefined' || !Array.isArray(newUserGroupsData.apps)) obj.errs.push('Вы не указали доступные приложения создавайемой группе!');
			if (obj.errs.length == 0) {
				let max = 0;
				let row = await this.Toolbox.sqlRequest('skyline', `SELECT MAX(user_group_id) AS ugi FROM user_groups`);
				if (row.length > 0) max = row[0].ugi;
				max++;
				await this.Toolbox.sqlRequest('skyline', `
					INSERT INTO user_groups 
					SET user_group_id='${max}', name = '${newUserGroupsData.name}', apps = '${JSON.stringify(newUserGroupsData.apps)}', status= '${newUserGroupsData.status}'`);
				obj.status = 1;
			}
		}
		return obj;
	}
	async EditUserGroupFromUserGroups( user, data ) {
		console.log(`запрос EditUserGroupFromUserGroups для appid = ${this.#appid}`);
		let obj = {status: -1, errs: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let editUserGroupsData = data.fields;
			if (typeof editUserGroupsData.name === 'undefined' || editUserGroupsData.name == '') obj.errs.push('Вы не указали название группы!');
			if (typeof editUserGroupsData.status === 'undefined' || editUserGroupsData.status == '') obj.errs.push('Вы не указали статус!');
			if (typeof editUserGroupsData.apps === 'undefined' || !Array.isArray(editUserGroupsData.apps)) obj.errs.push('Вы не указали доступные приложения создавайемой группе!');
			if (obj.errs.length == 0) {
				let row = await this.Toolbox.sqlRequest('skyline', `
					UPDATE user_groups 
					SET name = '${editUserGroupsData.name}', apps = '${JSON.stringify(editUserGroupsData.apps)}', status = '${editUserGroupsData.status}'
					WHERE user_group_id = '${editUserGroupsData.user_group_id}'`);
				if ( row.affectedRows == 1 ) obj.status = 1;
				else obj.errs.push('Редактирование записи завершилось с ошибкой!');
			} else console.log(obj.errs);
		}
		return obj;
	}

	// справочник отделений
	async GetUnits( user, data ) {
		console.log(`запрос GetUnits для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: {}};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let rows = await this.Toolbox.sqlRequest('skyline', `
				SELECT uid, lastname, firstname, secondname, title FROM dict_units 
				ORDER BY uid 
			`);
			obj.status = 1;
			obj.list = rows;
		}
		return obj;
	}
	async GetUnitFromUnitsDictionary( user, data ) {
		console.log(`запрос GetUnitFromUnitsDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: {}};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			if (typeof data.id !== 'undefined') {
				let rows = await this.Toolbox.sqlRequest('skyline', `
					SELECT uid, lastname, firstname, secondname, title, region, doc_city, status, data 
					FROM dict_units 
					WHERE uid = '${ data.id }' 
				`);
				if (rows.length > 0) {
					obj.status = 1;
					obj.list = rows;
					// так же торговые точки привяжем
					if (rows.length > 0) {
						let stores = await this.Toolbox.sqlRequest('skyline', `
							SELECT uid, dex_uid, title, status
							FROM dict_stores
							WHERE parent = '${data.id}'
							ORDER BY uid
						`);
						obj.list[0].stores = stores;
					}
				} else obj.errs.push('Запрошенная вами запись не существует!');
			} else obj.errs.push("Вы не указали, что запрашивать");
		}
		return obj;
	}
	async CreateNewUnitInUnitsDictionary( user, data ) {
		console.log(`запрос CreateNewUnitInUnitsDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let newUnitData = data.fields;
			let region;
			let uid;
			if (typeof newUnitData.lastname === 'undefined' || newUnitData.lastname == '') obj.errs.push('Вы не указали фамилию');
			if (typeof newUnitData.firstname === 'undefined' || newUnitData.firstname == '') obj.errs.push('Вы не указали имя');
			if (typeof newUnitData.region === 'undefined' || newUnitData.region == '') obj.errs.push('Вы не указали регион');
			if (typeof newUnitData.status === 'undefined' || newUnitData.status == '') obj.errs.push('Вы не указали статус');
			// if (typeof parseInt(newUnitData.uid) !== 'number' || isNaN(newUnitData.uid) || newUnitData.uid == '') obj.errs.push('Вы не указали id отделения');
			// else {
			// 	let rows = await this.Toolbox.sqlRequest('skyline', `SELECT id FROM dict_units WHERE uid = '${newUnitData.uid}'`);
			// 	if (rows.length > 0) obj.errs.push('Данный id уже существует');
			// 	else uid = parseInt(newUnitData.uid);
			// }
			let rows = await this.Toolbox.sqlRequest('skyline', `SELECT * FROM dict_regions WHERE uid = '${newUnitData.region}'`);
			if (rows.length == 0) obj.errs.push('Значение региона не принадлежит справочнику');
			else region = rows[0];
			if (obj.errs.length == 0) {
				newUnitData.lastname = this.Toolbox.normName(newUnitData.lastname);
				newUnitData.firstname = this.Toolbox.normName(newUnitData.firstname);
				if (typeof newUnitData.secondname != 'undefined') newUnitData.secondname = this.Toolbox.normName(newUnitData.secondname);
				else newUnitData.secondname = '';
				// узнаем max значение uid отделений 
				let max = 0;
				let row = await this.Toolbox.sqlRequest('skyline', `SELECT MAX(uid) AS uid FROM dict_units`);
				if (row.length > 0) max = row[0].uid;
				max++;
				let uid = max;
				if (newUnitData.title == '') {
					newUnitData.title = `пр. ${newUnitData.lastname} ${newUnitData.firstname}`;
					if (typeof newUnitData.secondname != 'undefined' && newUnitData.secondname != '') newUnitData.title = `${newUnitData.title} ${newUnitData.secondname}`;
					newUnitData.title = `${newUnitData.title} - ${region.short_title}`;
				}
				let fields = ['lastname', 'firstname', 'secondname', 'region', 'title', 'status', 'doc_city'];
				for (let i=0; i<fields.length; i++) {
					if (typeof newUnitData[fields[i]] !== 'undefined') fields[i] = `${fields[i]}='${newUnitData[fields[i]]}'`;
				}
				// console.log("fields====> ", fields);
				let str = fields.join(',');
				let result = await this.Toolbox.sqlRequest('skyline', `
					INSERT INTO dict_units SET uid='${uid}', ${str}, created = '${user.UserId}', data='' 
				`);

				if (result.affectedRows != 1) obj.errs.push("Ошибка добавления нового отделения. Проверьте вводимые данные!");
				else obj.status = 1;

				// console.log('уникальное занчение=> ', this.Toolbox.generateUniqueHash());
				if (typeof data.createNewUser !== 'undefined' && data.createNewUser == true && result.affectedRows == 1) {
					let pass = (rows.find(item=> item.uid == newUnitData.region)).def_pass;
					console.log('Помимо создания нового отделения, создаем еще пользователя для него');
					let hash = this.Toolbox.generateUniqueHash();
					result = await this.Toolbox.sqlRequest('skyline', `
						INSERT INTO user SET uid='${hash}', username='user${uid}', firstname='${newUnitData.firstname}', lastname='${newUnitData.lastname}', secondname='${newUnitData.secondname}', 
							user_group_id='2', status='1', created = '${user.UserId}', password = '${pass}'
					`);
					if (result.affectedRows != 1) obj.errs.push("Новое отделение было создано, но новый пользователь не был создан. Проверьте вводимые данные!");
					// поставим линк на созданного пользователя новому отделению
					await this.Toolbox.sqlRequest('skyline', `
						UPDATE dict_units SET link = '${hash}' WHERE uid = '${uid}'
					`)
				} else console.log('Создаем новое отделение, но пользователя для него не создаем');

				// так был создано новое отделение, то нужно создать для него торгорую точку
				data.fields.parent = uid;
				await this.CreateNewStoreInStoresDictionary( user, data );
				
			}
		}
		return obj;
	}


	// справочник торговых точек
	async GetStores( user, data ) {
		console.log(`запрос GetStores для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let rows = await this.Toolbox.sqlRequest(`skyline`, `
				SELECT dict_stores.uid, dict_stores.dex_uid, dict_stores.title, dict_stores.parent, dict_stores.status, dict_units.title AS parent_title
				FROM dict_stores
				LEFT JOIN dict_units ON dict_units.uid = dict_stores.parent
				ORDER BY dict_stores.title 
			`);
			if ( rows.length > 0 ) obj.list = rows;
			obj.status = 1;
		}
		return obj;
	}
	async GetStoreFromStoresDictionary( user, data ) {
		console.log(`запрос GetStoreFromStoresDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			if (typeof data.id !== 'undefined') {
				let rows = await this.Toolbox.sqlRequest('skyline', `
					SELECT dict_stores.uid, dict_stores.parent, dict_stores.dex_uid, dict_stores.lastname, dict_stores.firstname, 
						dict_stores.secondname, dict_stores.title, dict_stores.region, dict_stores.status, dict_stores.doc_city, 
						dict_stores.address, dict_units.title AS parent_title 
					FROM dict_stores 
					LEFT JOIN dict_units ON dict_stores.parent = dict_units.uid
					WHERE dict_stores.uid = ${data.id}
				`);
				if ( rows.length > 0 ) {
					obj.list = rows;
					obj.status = 1;
				} else obj.errs.push( 'Запрошенная вами запись не существует!' );
			} else obj.errs.push("Вы не указали, что запрашивать");
		}
		return obj;
	}
	async CreateNewStoreInStoresDictionary( user, data ) {
		console.log(`запрос CreateNewStoreInStoresDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let newStoreData = data.fields;
			if (typeof newStoreData.parent !== 'undefined') {
				let rows = await this.Toolbox.sqlRequest('skyline', `
					SELECT uid, lastname, firstname, secondname, region, cnt_stores
					FROM dict_units
					WHERE uid = '${newStoreData.parent}'
				`);
				if (rows.length > 0) {
					let regions = await this.Toolbox.sqlRequest('skyline', `
						SELECT uid, short_title 
						FROM dict_regions
						WHERE uid = '${newStoreData.region}' AND status = '1'
					`);
					if (regions.length > 0) {
						// теперь проверим, есть ли торговая точка с тем же dex_uid
						if (typeof newStoreData.dex_uid !== 'undefined' && newStoreData.dex_uid !== '') {
							let dexUidRow = await this.Toolbox.sqlRequest('skyline', `
								SELECT uid 
								FROM dict_stores
								WHERE dex_uid = '${newStoreData.dex_uid}'
							`);
							if (dexUidRow.length > 0) obj.errs.push("DEX IUD, который Вы указали, уже занят! Торговая точка не будет создана!");
						}
						if (obj.errs.length == 0) {
							let titleRegion = regions[0].short_title;
							let max = 0;
							let row = await this.Toolbox.sqlRequest('skyline', `SELECT MAX(uid) AS u FROM dict_stores`);
							if (row.length > 0) max = row[0].u;
							max++;
							let cntStores = rows[0].cnt_stores == 0 ? `` : ` ${rows[0].cnt_stores}`;
							//cntStores++;
							let fname = rows[0].lastname;
							if (rows[0].firstname != '') fname += ` ${rows[0].firstname}`;
							if (rows[0].secondname != '') fname += ` ${rows[0].secondname}`;
							let title = `пр. ${fname}${cntStores} - ${titleRegion}`;
							let result = await this.Toolbox.sqlRequest('skyline', `
								INSERT INTO dict_stores 
								SET uid='${max}', parent = '${rows[0].uid}', dex_uid = '${newStoreData.dex_uid}', lastname = '${rows[0].lastname}', firstname= '${rows[0].firstname}', secondname = '${rows[0].secondname}', title = '${title}', 
								region = '${regions[0].uid}', doc_city = '', address = '', status = '${newStoreData.status}', data= '', 
								created = '${user.UserId}', allowed_bases = '', link = ''`);
							if (result.affectedRows == 1) {
								let cnt = rows[0].cnt_stores;
								cnt++;
								let row = await this.Toolbox.sqlRequest('skyline', `
									UPDATE dict_units 
									SET cnt_stores = '${cnt}'
									WHERE uid = '${rows[0].uid}'
								`);
								obj.status = 1;
							} else {
								obj.errs.push("Ошибка добавления новой торговой точки. Проверьте вводимые данные!");
							}
							// обновим справочники
							this.#core.newInitDicts();
						}
					} else obj.errs.push("Указанный Вами регион не существует или не активен!");
				} else obj.errs.push("Указанное Вами отделение не существует!");
			} else obj.errs.push("Вы не указали отделение для создаваемой торговой точки!");
		}
		return obj;
	}
	async EditStoreFromStoresDictionary( user, data ) {
		console.log(`запрос EditStoreFromStoresDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let editStoreData = data.fields;
			if (typeof editStoreData.dex_uid === 'undefined') obj.errs.push("Вы не указали DEX uid");
			if ( !isNaN(parseFloat(editStoreData.status)) && isFinite(editStoreData.status) ) {
				let row = await this.Toolbox.sqlRequest('skyline', `
					SELECT uid 
					FROM dict_user_statuses 
					WHERE uid = '${editStoreData.status}'`);
				if (row.length == 0) obj.err.push('Указанное вами значение для поля "Статус" не содержится в справочнике!');
			} else obj.errs.push('Поле "Статус" обязательно для заполнения!');
			if ( typeof editStoreData.lastname !== 'string' || editStoreData.lastname == '' ) obj.errs.push('Поле "Фамилия" обязательно для заполнения!');
			if ( typeof editStoreData.firstname !== 'string' || editStoreData.firstname == '' ) obj.errs.push('Поле "Имя" обязательно для заполнения!');
			if (!isNaN(parseFloat(editStoreData.region)) && isFinite(editStoreData.region)) {
				let row = await this.Toolbox.sqlRequest('skyline', `
					SELECT uid 
					FROM dict_regions 
					WHERE uid = '${editStoreData.region}'`);
				if (row.length == 0) obj.err.push('Указанное вами значение для поля "Регион" не содержится в справочнике!');
			} else obj.errs.push('Поле "Регион" обязательно для заполнения!');
			if (!isNaN(parseFloat(editStoreData.parent)) && isFinite(editStoreData.parent)) {
				let row = await this.Toolbox.sqlRequest('skyline', `
					SELECT uid 
					FROM dict_units 
					WHERE uid = '${editStoreData.parent}'`);
				if (row.length == 0) obj.err.push('Указанное вами значение для поля "Отделение" не содержится в справочнике!');
			}
			if ( obj.errs.length == 0 ) {
				editStoreData.lastname = this.Toolbox.normName(editStoreData.lastname);
				editStoreData.firstname = this.Toolbox.normName(editStoreData.firstname);
				if ( typeof editStoreData.secondname === 'string' ) editStoreData.secondname = this.Toolbox.normName(editStoreData.secondname);
				else editStoreData.secondname = '';
				let docCity = '';
				if (typeof editStoreData.doc_city !== 'undefined') docCity = editStoreData.doc_city;
				let row = await this.Toolbox.sqlRequest('skyline', `
					UPDATE dict_stores 
					SET parent = '${editStoreData.parent}', dex_uid = '${editStoreData.dex_uid}', lastname = '${editStoreData.lastname}',
						firstname = '${editStoreData.firstname}', secondname = '${editStoreData.secondname}', title = '${editStoreData.title}',
						region = '${editStoreData.region}', doc_city = '${docCity}', address = '${editStoreData.address}', status = '${editStoreData.status}',
						data = ''
					WHERE uid = '${editStoreData.uid}'`);
				if ( row.affectedRows == 1 ) { 
					obj.status = 1;
					obj.list.push({uid: editStoreData.uid, title: editStoreData.title, status: editStoreData.status});
				}
				else obj.errs.push('Редактирование записи завершилось с ошибкой!');
			}
		}
		return obj;
	}

	// Кладр
	async GetKladrByOneString( user, data ) {
		console.log(`запрос GetKladrByOneString для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let result = await this.Toolbox.request({
				url: `https://kladr-api.ru/api.php?query=${encodeURIComponent(data.string)}&oneString=1&limit=15&withParent=1`,
				headers: {
					'Content-Type': 'application/json'
				},
				method: "GET",
			});
			if (!result.err) {
				let d = JSON.parse(result.body);
				obj.search = d.searchContext;
				console.log("d=====> ", d);
				if (d.result && d.result.length > 0) {
					let list = d.result;
					console.log("Больше!!!!!!!!!");
					for (let i =0; i < list.length; i++) {
						console.log("list[i]=> ", list[i]);
						if (typeof list[i].fullName !== 'undefined') obj.list.push(list[i].fullName);
					}
				} else obj.list = [];
				obj.status = 1;
			} else {
				obj.list = [];
			}
			
			
		}
		return obj;
	}

	// Получение записей журнала разработчика
	async GetDevelopJournal( user, data ) {
		console.log(`запрос GetDevelopJournal для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let rows = await this.Toolbox.sqlRequest(`skyline`, `
				SELECT *
				FROM develop_journal
				ORDER BY date 
			`);
			if ( rows.length > 0 ) obj.list = rows;
			obj.status = 1;
		}
		return obj;
	}

	// справочнки типы документов для склада
	async GetDocTypes( user, data ) {
		console.log(`запрос GetDocTypes для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let rows = await this.Toolbox.sqlRequest(`skyline`, `
				SELECT uid, title, status
				FROM dict_doc_types
				ORDER BY uid
			`);
			if ( rows.length > 0 ) obj.list = rows;
			obj.status = 1;
		}
		return obj;
	}
	async CreateNewTypeInDocTypesDictionary( user, data ) {
		console.log(`запрос CreateNewTypeInDocTypesDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let newDocTypeData = data.fields;
			if (typeof newDocTypeData.title === "undefined" || newDocTypeData.title == "") obj.errs.push("Вы не указали наименование");
			if (typeof newDocTypeData.status === "undefined" || newDocTypeData.status == "") obj.errs.push("Вы не указали статус");
			if (obj.errs.length == 0) {
				let max = 0;
				let row = await this.Toolbox.sqlRequest('skyline', `SELECT MAX(uid) AS u FROM dict_doc_types`);
				if (row.length > 0) max = row[0].u;
				max++;
				let result = await this.Toolbox.sqlRequest('skyline', `
					INSERT INTO dict_doc_types 
					SET uid='${max}', title = '${newDocTypeData.title}', status = '${newDocTypeData.status}'`
				);
				if (result.affectedRows == 1) {
					obj.status = 1;
				} else {
					obj.errs.push("Ошибка добавления нового типа документа. Проверьте вводимые данные!");
				}
			}
		}
		return obj;
	}
	async GetDocTypeFromDocTypesDictionary( user, data ) {
		console.log(`запрос GetDocTypeFromDocTypesDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			if (typeof data.id !== 'undefined') {
				let rows = await this.Toolbox.sqlRequest('skyline', `
					SELECT uid, title, status
					FROM dict_doc_types
					WHERE uid = '${data.id}'
				`);
				if ( rows.length > 0 ) {
					obj.list = rows;
					obj.status = 1;
				} else obj.errs.push( 'Запрошенная вами запись не существует!' );
			} else obj.errs.push("Вы не указали, что запрашивать");
		}
		return obj;
	}
	async EditDocTypeFromDocTypesDictionary( user, data ) {
		console.log(`запрос EditDocTypeFromDocTypesDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			console.log("data.fields=> ", data.fields);
			let editDocTypeData = data.fields;
			if (typeof editDocTypeData.uid === "undefined" || editDocTypeData.uid == "") obj.errs.push("Вы не указали uid");
			if (!isNaN(parseFloat(editDocTypeData.status)) && isFinite(editDocTypeData.status)) {
				let row = await this.Toolbox.sqlRequest('skyline', `
					SELECT uid 
					FROM dict_user_statuses 
					WHERE uid = '${editDocTypeData.status}'`);
				if (row.length == 0) obj.err.push('Указанное вами значение для поля "Статус" не содержится в справочнике!');
			} else obj.errs.push('Поле "Статус" обязательно для заполнения!');
			if (typeof editDocTypeData.title === "undefined" || editDocTypeData.title == "") obj.errs.push("Вы не указали наименование");
			if (obj.errs.length == 0) {
				let row = await this.Toolbox.sqlRequest('skyline', `
					UPDATE dict_doc_types 
					SET title = '${editDocTypeData.title}', status = '${editDocTypeData.status}'
					WHERE uid = '${editDocTypeData.uid}'`);
				if ( row.affectedRows == 1 ) { 
					obj.status = 1;
					obj.list.push({uid: editDocTypeData.uid, title: editDocTypeData.title, status: editDocTypeData.status});
				}
				else obj.errs.push('Редактирование записи завершилось с ошибкой!');
			} 
		}
		return obj;
	}

	async GetUniversalJournal( user, data ) {
		console.log(`запрос GetUniversalJournal для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let start, end;
			let moment = this.Toolbox.getMoment();
			if (typeof data.start === "undefined") { 
				console.log("start не существует ", data);
				start = moment(new Date(), "YYYY-MM-DD");
			} else {
				console.log("start существует");
				start = moment(data.start, "YYYYMMDD");
				if (!start.isValid()) obj.errs.push('Дата начала периода задана не верно!');
			}
			if (typeof data.end === "undefined") end = start;
			else {
				end = moment(data.end, "YYYYMMDD");
				if (!end.isValid()) obj.errs.push('Дата окончания периода задана не верно!');
			}
			console.log("start=> ", start);
			if (obj.errs.length == 0) {
				let where = []; 
				if (typeof data.type !== "undefined") where.push(`type = '${data.type}'`);
				where.push(`date BETWEEN '${start.format("YYYY-MM-DD")} 00:00:00' AND '${end.format("YYYY-MM-DD")} 23:59:59'`);
				let rows = await this.Toolbox.sqlRequest(`skyline`, `
					SELECT id, type, date, sum, creater, stock, fromStock, status
					FROM journal
					WHERE ${where.join(" AND ")}
				`);
				if (rows.length > 0) { 
					// так как будут uid пользователей, было бы фигово их передавать в открытом виде. Превратим в usernames
					let dicts = this.#core.DictsByNames(["users","docTypes","stores", "stocks"]);
					if (dicts.length > 0) {
						let users = dicts.find(item=> item.name == "users");
						let docTypes = dicts.find(item=> item.name == "docTypes");
						let stores = dicts.find(item=> item.name == "stores");
						let stocks = dicts.find(item=> item.name == "stocks");
						for (let i = 0; i < rows.length; i++) {
							for (let j = 0; j <users.list.length; j++) {
								if (rows[i].creater == users.list[j].uid) { 
									rows[i].creater = this.Toolbox.fullNameToFio(users.list[j].lastname, users.list[j].firstname, users.list[j].secondname);
									break;
								}
							}
							for (let j = 0; j <docTypes.list.length; j++) {
								if (rows[i].type == docTypes.list[j].uid) { 
									rows[i].type = docTypes.list[j].title;
									break;
								}
							}
							for (let j = 0; j <stores.list.length; j++) {
								if (rows[i].target == stores.list[j].uid) { 
									rows[i].target = stores.list[j].title;
									break;
								}
							}
							for (let j = 0; j < stocks.list.length; j++) {
								if (rows[i].stock == stocks.list[j].uid) { 
									rows[i].stock = stocks.list[j].title;
									break;
								}
							}
							if (rows[i].fromStock != -1) {
								for (let j = 0; j < stocks.list.length; j++) {
									if (rows[i].fromStock == stocks.list[j].uid) { 
										rows[i].fromStock = stocks.list[j].title;
										break;
									}
								}
							} else rows[i].fromStock = '';
						}
					}
					obj.list = rows;
				}
				obj.status = 1;
			}
		}
		return obj;
	}
	async СreateDocumentInUniversalJournal( user, data ) {
		console.log(`запрос СreateDocumentInUniversalJournal для appid = ${this.#appid}`);
		let obj = {status: -1, errs: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let dicts = this.#core.DictsByNames(['contractors','balance','simTypes','operators','dexBases','regions']);
			let params = data.params;
			let list = data.list;

			let contractors = dicts.find(item=> item.name == "contractors");
			console.log("contractors=> ", contractors);
			let contractor = contractors.list.find(item=> item.uid == data.params.contractors);
			if ( typeof contractor === 'undefined') obj.errs.push('Указанный вами контраагент не существует');
			let balance;
			let chechProducts = [0,1];
			if (list.length == 0) obj.errs.push('Вы пытаетесь создать пустой документ'); 
			else {
				if (params.product == 0) {
					let balances = dicts.find(item=> item.name == "balance");
					balance = balances.list.find(item=> item.uid == data.params.balance);
					if ( typeof balance === 'undefined') obj.errs.push('Указанный вами баланс не существует в справочнике балансов');
					
					let simTypes = dicts.find(item=> item.name == "simTypes");
					let simType = simTypes.list.find(item=> item.uid == data.params.simTypes);
					if ( typeof simType === 'undefined') obj.errs.push('Указанный вами тим Сим-карты не существует');
					
					let operators = dicts.find(item=> item.name == "operators");
					let operator = operators.list.find(item=> item.uid == data.params.operator);
					if ( typeof operator === 'undefined') obj.errs.push('Указанный вами Оператор не существует');
					
					let bases = dicts.find(item=> item.name == "dexBases");
					let base = bases.list.find(item=> item.uid == data.params.base);
					if ( typeof base === 'undefined') obj.errs.push('Указанная вами База не существует');

					let regions = dicts.find(item=> item.name == "regions");
					let region = regions.list.find(item=> item.uid == data.params.region && item.status == 1);
					if ( typeof region === 'undefined') obj.errs.push('Указанный вами Регион не существует');
				}
				// надо теперь проверить есть, есть ли такой товар в базе для определенных видов продуктов
				if (chechProducts.indexOf(params.product) != -1) {
					let chkErrs = {double:[]};
					for (let i = 0; i < list.length; i++) {
						let hash;
						if (params.product == 0) hash = this.Toolbox.criptoHashMD5(`${params.product}${list[i].icc}${list[i].msisdn}`);
						else if (params.product == 0) hash = this.Toolbox.criptoHashMD5(`${params.product}${list[i].imai}`);
						let row = await this.Toolbox.sqlRequest('skyline', `
							SELECT * FROM records
							WHERE hash = '${hash}'
						`);
						if (row.length > 0) chkErrs.double.push(i);
					}
					if (chkErrs.double.length > 0) { 
						obj.errs.push('В списке присутствуют дублирующиеся записи');
						obj.double = chkErrs.double;
					}
				}
			}
			if (obj.errs.length == 0) {
				let newRecord = {
					stock: data.params.stock,
					contractor: data.params.contractors,
					product: data.params.product,
					operator: data.params.operator,
					base: data.params.base,
					region: data.params.region,
					balance: data.params.balance,
				}

				let arr = [];
				let cbalance = 0;
				if (balance.uid != 0) cbalance = parseInt(balance.title);
				let sum = cbalance * list.length;
				for (let key in newRecord) arr.push(`${key}=${newRecord[key]}`);
				let dataJournal = arr.join(',');

				let result = await this.Toolbox.sqlRequest('skyline', `
					INSERT INTO journal 
					SET type = '3', creater = '${user.UserId}', stock = '0', data = '${dataJournal}', sum='${sum}', status = '102'
				`);
				if (typeof result !== 'undefined' && typeof result.insertId !== 'undefined') {
					let hash = '';

					if (chechProducts.indexOf(params.product) != -1) {
						for (let i = 0; i < list.length; i++) {
							let arrRecord = [];
							for (let key in list[i]) arrRecord.push(`${key}=${list[i][key]}`);
							let dataRecord = arrRecord.join(',');
							if (params.product == 0) hash = this.Toolbox.criptoHashMD5(`${params.product}${list[i].icc}${list[i].msisdn}`);
							else if (params.product == 0) hash = this.Toolbox.criptoHashMD5(`${params.product}${list[i].imai}`);
							await this.Toolbox.sqlRequest('skyline', `
								INSERT INTO records
								SET parent = '${result.insertId}', data = '${dataRecord}', hash = '${hash}'
							`);
						}
					} else {
						let arrRecord = [];
						for (let key in list[i]) arrRecord.push(`${key}=${list[i][key]}`);
						let dataRecord = arrRecord.join(',');
						for (let i = 0; i < list.length; i++) {
							await this.Toolbox.sqlRequest('skyline', `
								INSERT INTO records
								SET parent = '${result.insertId}', data = '${dataRecord}', hash = '${hash}'
							`);
						}
					}
					obj.status = 1;		
				}
			}
		}
		return obj;
	}

	async GetMegafonStoresDictionary( user, data ) {
		console.log(`запрос GetMegafonStoresDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let dicts = this.#core.DictsByNames(["megafonStores","stores","megafonProfiles"]);
			let mStores = dicts.find(item=> item.name == "megafonStores");
			let uStores = dicts.find(item=> item.name == "stores");
			let megaProfiles = dicts.find(item=> item.name == "megafonProfiles");
			for (let i = 0; i < mStores.list.length; i++) {
				let unitStore = uStores.list.find(item=> item.dex_uid == mStores.list[i].dex_store);
				if (typeof unitStore !== "undefined") mStores.list[i].dex_store = unitStore.title;
				let mProfiles = megaProfiles.list.find(item=> item.code == mStores.list[i].dex_megafon_profile);
				if (typeof mProfiles !== "undefined") mStores.list[i].dex_megafon_profile = mProfiles.title;
			}
			obj.list = mStores.list;				
			obj.status = 1;
		}
		return obj;
	} 
	async GetMegafonStoreFromMegafonStoresDictionary( user, data ) {
		console.log(`запрос GetMegafonStoreFromMegafonStoresDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			if (typeof data.id !== 'undefined') {
				let rows = await this.Toolbox.sqlRequest('skyline', `
					SELECT id, megafon_code, megafon_sale_point_id, dex_store, dex_megafon_profile, status
					FROM dex_dict_megafon_stores
					WHERE id = '${data.id}'
				`);
				if ( rows.length > 0 ) {
					obj.list = rows;
					obj.status = 1;
				} else obj.errs.push( 'Запрошенная вами запись не существует!' );
			}
		}
		return obj;
	}
	async EditMegafonStoreFromMegafonStoresDictionary( user, data ) {
		console.log(`запрос EditMegafonStoreFromMegafonStoresDictionary для appid = ${this.#appid}`);
		let obj = {status: -1, errs: [], list: []};
		let userConfiguration = this.#ValidateUser( user );
		if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
		else {
			let editMegafonStoreData = data.fields;
			if (typeof editMegafonStoreData.id === "undefined" || editMegafonStoreData.id == "") obj.errs.push("Вы не указали id");
			else {
				if (!isNaN(parseFloat(editMegafonStoreData.status)) && isFinite(editMegafonStoreData.status)) {
				let row = await this.Toolbox.sqlRequest('skyline', `
					SELECT uid 
					FROM dict_user_statuses 
					WHERE uid = '${editMegafonStoreData.status}'`);
				if (row.length == 0) obj.err.push('Указанное вами значение для поля "Статус" не содержится в справочнике!');
				if (typeof editMegafonStoreData.dex_store === "undefined" || editMegafonStoreData.dex_store == "") obj.errs.push("Вы не указали торговую точку!");
				if (obj.errs.length == 0) {
					let row = await this.Toolbox.sqlRequest('skyline', `
						UPDATE dex_dict_megafon_stores 
						SET dex_store = '${editMegafonStoreData.dex_store}', status = '${editMegafonStoreData.status}'
						WHERE id = '${editMegafonStoreData.id}'`);
					if ( row.affectedRows == 1 ) { 
						obj.status = 1;
						obj.list.push({id: editMegafonStoreData.id, title: editMegafonStoreData.dex_store, status: editMegafonStoreData.status});
						// обновим измененный справочник
						this.#core.updateNewDicts("megafonStores");
					}
					else obj.errs.push('Редактирование записи завершилось с ошибкой!');
				}
			} else obj.errs.push('Поле "Статус" обязательно для заполнения!');
			}
		}
		return obj;
	}
}
module.exports = CoreApi;