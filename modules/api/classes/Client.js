'use_strict'
const HASH_LENGTH = 32;
const STATUSES = {
	INACTIVE:0,
	ACTIVE: 1,
	BLOCKED: 2
}

class Client {
	#data = {system:{}, info: {}, tasks: {}};
	// #create;#currentLocation;#expired;#lastAccessTime;#lastSubscribe;
	// #username;#userpic;#firstName;#lastName;#secondName;#userGroupId;#settings;#uid;#userid;
	// #tasks;
	// #allowedApps = []; #runningApps = []; #appsConfig = [];
	// #status = STATUSES.ACTIVE; #locationInfo = 'core.apps'; #userLocations = [];
	#toolbox;#connector;
	#errs = [];
	constructor( data, toolbox, connector ) {
		if (typeof toolbox === 'undefined') this.arrs.push( 'Не передан toolbox в создаваемый объект Client' );
		if (typeof connector === 'undefined') this.arrs.push( 'Не передан connector в создаваемый объект Client' );
		if (typeof data === 'undefined') this.arrs.push( 'Не переданы данные data в создаваемый объект Client' );
		if (this.#errs.length == 0 ) {
			this.#toolbox = toolbox;
			this.#connector = connector;
			this.#data.system.create = this.#toolbox.getTime();
			this.#data.system.currentLocation = null;
			this.#data.system.expired = this.#data.system.create + 3600000; // +1 час
			this.#data.system.lastAccessTime = this.#data.system.create;
			this.#data.system.lastSubscribe = null;
			this.#data.system.appsConfig = [];
			this.#data.system.allowedApps = [];
			this.#data.system.runningApps = [];

			this.#data.info.username = typeof data.username !== 'undefined' ? data.username : this.#errs.push( 'Не передан параметр username' );
			this.#data.info.userpic = data.userpic;
			this.#data.info.lastName = data.lastname;
			this.#data.info.firstName = data.firstname;
			this.#data.info.secondName = data.secondname;
			this.#data.info.userGroupId = data.user_group_id;
			// this.#data.info.settings = data.apps_configuration; //?
			this.#data.info.userid = data.uid;
			this.#data.info.uid = toolbox.generateUniqueHash();
			this.#data.info.status = STATUSES.ACTIVE;
			this.#data.info.locationInfo = 'core.apps';
			this.#data.info.userLocations = [];

			this.#data.info.tasks = [];

			// инициальзация настроек пользователя
			this.#InitAllowedApplications(data.apps);
			this.#InitAppsConfigurations(data.apps_configuration);
		}
	}
	
	#InitAllowedApplications(apps) {
		let applications;
		if (typeof apps === 'string') applications = JSON.parse(apps);
		else applications = apps;
		applications.map(app=> this.#data.system.allowedApps.push(app));
	}
	#InitAppsConfigurations(configurations) {
		if (typeof configurations === 'string') configurations = JSON.parse(configurations);
		// console.log('configurations==> ', configurations);
		for (let i = 0; i < configurations.length; i++) {
			// console.log('configurations[i].name=> ', configurations[i].name);
			if ( this.#data.system.allowedApps.indexOf(configurations[i].name) != -1) {
				let cnf = configurations[i];
				if ( typeof cnf === 'string' ) cnf = JSON.parse(cnf);
				this.#data.system.appsConfig.push(cnf);
			}
		}




		// if (this.#data.system.allowedApps.length > 0) {
		// 	let apps = [];
		// 	this.#data.system.allowedApps.map(item=> apps.push(`'${item}'`));
		// 	apps = apps.join(',');
		// 	let rows = await this.#toolbox.sqlRequest(this.#connector, 'skyline', `SELECT app_configuration FROM dict_apps WHERE uid IN (${apps})`);
		// 	for (let i = 0; i < rows.length; i++) { 
		// 		let cnf = rows[i].app_configuration
		// 		if ( typeof cnf === 'string' ) cnf = JSON.parse(cnf);
		// 		this.#data.system.appsConfig.push(cnf);
		// 		console.log('cnf=> ', cnf);
		// 	}
		// }

	}



	//ГЕТТЕРЫ
	get AllowedApps() { return this.#data.system.allowedApps; }
	get AllAppsConfigs() { return this.#data.system.appsConfig; }
	get UserName() { return this.#data.info.username; }
	get FirstName() { return this.#data.info.firstName; }
	get LastName() { return this.#data.info.lastName; }
	get SecondName() { return this.#data.info.secondName; }
	get Userpic() { return this.#data.info.userpic; }
	get Uid() { return this.#data.info.uid; }
	get UserId() { return this.#data.info.userid; }
	get UserGroup() { return this.#data.info.userGroupId; }
	get UserStatus() { return this.#data.info.status; }
	get RunningApps() { return this.#data.system.runningApps; }

	// ПУБЛИЧНЫЕ МЕТОДЫВ
	async Inits() {
		// await this.#InitAppsConfigurations();
	}
	// appSettings(app) { return this._appsConf.find((app)=> app.name == needed); }

	RunApp(app) {
		console.log('Список разрешенных приложений ', this.#data.system.allowedApps);
		console.log("попытка запустить приложение ", app);
		if (this.#data.system.allowedApps.indexOf(app) != -1) {
			if (this.#data.system.runningApps.indexOf(app) == -1) { 
				// console.log('приложение разрешено');
				this.#data.system.runningApps.push(app);
				return 1;
			} else {
				return 0;
			} 
		} else {
			console.log('не разрешено ');
			return -1;
		}
	}
	GetAppConfiguration(appName) {
		return this.#data.system.appsConfig.find(item=> item.name == appName);
	}

	BlockUser() { this.#data.info.status = STATUSES.BLOCKED; }
	UnBlockUser() { this.#data.info.status = STATUSES.ACTIVE; }
}



// class Client {
// 	constructor(data, toolbox, connector) {
// 		let now = getNow();
// 		this._create = now;
// 		this._currentLocation = null;
// 		this._expired = now + 3600000; // +1 час
// 		this._lastReq = now;
// 		this._lastSubscribe = null;
// 		this._username = data.username;
// 		this._userpic = data.userpic;
// 		this._userFirstName = data.firstname;
// 		this._userSecondName = data.secondname;
// 		this._userLastName = data.lastname;
// 		this._userpic = data.userpic;
// 		this._userGroupId = data.user_group_id;
// 		this._settings = data.apps_configuration;
// 		this._uid = createHash();
// 		this._userid = data.uid;
// 		this._tasks = [];
// 		this._allowedApps = []; // разрешенные для пользователя приложения
// 		this._runningApps = []; // запущенные пользователем приложения
// 		this._appsConf = []; // настройки приложений
// 		this._status = STATUSES.ACTIVE; // статус юзера
// 		this._locationInfo = 'core.apps'; // информация о местонахождении пользователя в приложении
// 		this._userLocations = []; // все запущенные локации пользователя
// 		JSON.parse(data.apps).map((app)=> this._allowedApps.push(app));
// 		this.#initBases();
// 		// запомним настройки приложений
// 		// console.log('this._allowedApps=> ', this._allowedApps);
// 		// console.log('data.apps_configuration=> ', data.apps_configuration);

// 		// console.log("this._allowedApps=> ", this._allowedApps);

// 		// JSON.parse(data.apps_configuration).map((app)=> { if (this._allowedApps.indexOf(app.name) != -1) this._appsConf.push(app)})
// 	}

// 	#initBases() {

// 	}

// 	get create() {return this._create;}
// 	get username() {return this._username;}
// 	get lastReq() {return this._lastReq;}
// 	get uid() {return this._uid;}
// 	get userid() {return this._userid;}
// 	get runningApps() {return this._runningApps;}
// 	get allowedApps() {return this._allowedApps;}
// 	get lastSubscribe() {return this._lastSubscribe;}
// 	get userGroupId() {return this._userGroupId;}
// 	get userStatus() {return this._status;}
// 	get firstname() {return this._userFirstName;}
// 	get lastname() {return this._userLastName;}
// 	get secondname() {return this._userSecondName;}
// 	get userpic() {return this._userpic;}
// 	get settings() {return this._settings;}

// 	set username(newname) {this._username = newname;}
// 	set allowedApps(apps) {this._allowedApps = apps;}
// 	set lastSubscribe(now) {this._lastSubscribe = now;}
// 	set updateSettings(settings) {this._settings = settings;}

// 	statusLock() {this._status = STATUSES.LOCK;}
// 	statusBlock() {this._status = STATUSES.BLOCKED;}
// 	statusActive() {this._status = STATUSES.ACTIVE;}
	

// 	ifAllowedApp(app) {return this._allowedApps.indexOf(app) != -1 ? true : false}
// 	appsConfig(needed) {return this._appsConf.find((app)=> app.name == needed);}

// 	runApp(app) {
// 		console.log('Список разрешенных приложений ', this._allowedApps);
// 		console.log("попытка запустить приложение ", app);
// 		if (this._allowedApps.indexOf(app) != -1) {
// 			if (this._runningApps.indexOf(app) == -1) { 
// 				// console.log('приложение разрешено');
// 				this._runningApps.push(app);
// 				return 1;
// 			} else {
// 				return 0;
// 			} 
// 		} else {
// 			// console.log('не разрешено ');
// 			return -1;
// 		}
// 	}
// 	killApp(app) {
// 		if (this._allowedApps.indexOf(app) != -1) {
// 			if (this._runningApps.indexOf(app) != -1) {
// 				this._runningApps.splice(this._runningApps.indexOf(app), 1);
// 				return 1;
// 			} else {
// 				return 0;
// 			}
// 		} else {
// 			return -1;
// 		}
// 	}
// 	killAllApps() {
// 		this._runningApps = [];
// 		return 1;
// 	}
// 	async initAppConfigurations(toolbox, connector) {
// 		if (toolbox) {
// 			let arrApps = [];
// 			for (let i = 0; i < this._allowedApps.length; i++) arrApps.push(`'${this._allowedApps[i]}'`);
// 			let apps = arrApps.join(',');
// 			let rows = await toolbox.sqlRequest(connector, 'skyline', `SELECT * FROM dict_apps WHERE uid IN (${apps})`);
// 			for (let i = 0; i < rows.length; i++) {
// 				console.log('rows[i].app_configuration=> ', JSON.parse( rows[i].app_configuration) ); 
// 				this._appsConf.push( JSON.parse(rows[i].app_configuration) );
// 			}
// 		};
		
// 	}
// }

function getNow() {return new Date().getTime();}
function createHash() {
	var idstr=String.fromCharCode(Math.floor((Math.random()*25)+65));
	do {                
		var ascicode=Math.floor((Math.random()*42)+48);
		if (ascicode<58 || ascicode>64) idstr+=String.fromCharCode(ascicode);        
	} while (idstr.length<HASH_LENGTH);
	return  idstr.toLowerCase();
}	
module.exports = Client;