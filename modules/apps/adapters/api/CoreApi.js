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
				{id: 'stores', table: 'dict_stores', field: 'uid'}
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
				ORDER BY dict_stores.uid 
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
							let dexUidRow = await this.Toolbox.sqlRequest('sqyline', `
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

	

}
module.exports = CoreApi;