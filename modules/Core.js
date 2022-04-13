'use strict'
let fs = require('fs');

const APICORE = require(`./api/Core`);

const DIR_CONNECTORS = `${__dirname}/connectors`;
const DIR_APPS = `${__dirname}/apps`;
const DIR_LIBS = `${__dirname}/libs`;
const TAB = '\t';
const APP_NAME = 'skyline';
const COLORS = {
	BLACK: '\x1b[40m',
	GREEN: '\x1b[42m',
	RED: '\x1b[41m',
}
let that;
let API = {};
let AUTH_USERS = []; // авторизованные пользователи
let SUBSCRIBERS = {}; // подписчики на события
let AWAIT_SENDING_PACKETS = []; // массив пакетов на отправку. Пакет попадает туда в случае, если пользователь авторизован, но не подписан. Когда он подпишется, пакет будет отправлен ему

class Core {
	constructor() {
		this.apps = [];
		this.connectors = [];
		this.express = null;
		this.toolbox = null;
		this.appname = APP_NAME;
		that = this;
		setTimeout(()=> {this.startInits()}, 2000);
	}
	async startInits() {
		console.log(`${tabs(1)}ЯДРО. ЗАПУСК ЯДРА`);
		let status = 1;
		let operations = ['initCoreConnectors', 'initCoreLibs', 'initApiCore', 'initCoreAuthUsersValidate', 'initApps', 'initAppsConnectors', 'initAppsBases', 'initAppsToolbox', 'initAppsLogging', 'initAppsDictionaries', 
						'initAppsUniqueMethods', 'initRoutes'];
		// let operations = ['initCoreConnectors', 'initCoreLibs', 'initApiCore'];
		for (let i=0; i<operations.length; i++) {
			let resultOperation = await this[operations[i]]();
			if (resultOperation.status == 0) {
				status = 0;
				console.log(`${tabs(1)}${COLORS.RED} ИНИЦИАЛИЗАЦИЯ ЯДРА ПРЕКРАЩЕНА. ОШИБКА НА ЭТАПЕ ${resultOperation.operation}. СТЕК ${resultOperation.err.stack}`);
				console.log(`${tabs(1)}${COLORS.BLACK}`);
				break;
			}
		}
		if (status != 0) { 
			console.log(`${tabs(1)}ЯДРО. ЯДРО УСПЕШНО ЗАПУЩЕНО`);
			// console.log(this.GLOBAL_APP);
			// this.GLOBAL_APP.use(allowCrossDomain);
		} else {
			console.log(`${tabs(1)}ЯДРО. ЯДРО БЫЛО ЗАПУЩЕНО С ОШИБКАМИ`);
		}
	}
	async initCoreConnectors() {
		try {
			console.log(`${tabs(1)}ЯДРО. НАЧАЛО ПРОЦЕССА ИНИЦИАЛИЗАЦИИ АДАПТЕРОВ СОЕДИНЕНИЙ С БАЗОЙ ДАННЫХ`);
			let dirs = fs.readdirSync(DIR_CONNECTORS, { withFileTypes: true });
			dirs.map((dir)=> {
				console.log("dir=> ", dir.name);
				let connector = new (require(`${DIR_CONNECTORS}/${dir.name}/index`))();
				this.connectors.push(connector);
				if (typeof listDefCons[connector.name] !== 'undefined') {

					listDefCons[connector.name].map((item)=> connector.newBase(item))
				}
				// console.log("есть на добавление", connector);
			})
			console.log(`${tabs(1)}ЯДРО. ПРОЦЕСС ИНИЦИАЛИЗАЦИИ АДАПТЕРОВ СОЕДИНЕНИЙ С БАЗОЙ ДАННЫХ УСПЕШНО ОСУЩЕСТВЛЕН. СПИСОК ДОСТУПНЫХ КОННЕКТОРОВ=> ${this.connectors.map((item)=> item.name)}`);
			return {status: 1, operation: 'initConnectors'};
		} catch(e) {
			return {status: 0, operation: 'initConnectors', err: e};
		}
	}
	async initCoreLibs() {
		try {
			console.log(`${tabs(1)}ЯДРО. ИНИЦИАЛИЗАЦИЯ БИБЛИОТЕК ЯДРА`);
			let libs = fs.readdirSync(DIR_LIBS, { withFileTypes: true });
			libs.map((dir)=> {
				let lib = new (require(`${DIR_LIBS}/${dir.name}`))();
				this[lib.name] = lib;
			})
			console.log(`${tabs(1)}ЯДРО. ИНИЦИАЛИЗАЦИЯ БИБЛИОТЕК ЯДРА УСПЕШНО ОСУЩЕСТВЛЕНА`);
			return {status: 1, operation: 'initCoreLibs'};
		} catch (e) {
			return {status: 0, operation: 'initCoreLibs', err: e};
		}
	}
	async initApiCore() {
		try {
			console.log(`${tabs(1)}ЯДРО. ЗАПУСК МОДУЛЯ API ДЛЯ ЯДРА`);
			let apicore = new APICORE(this.toolbox);
			apicore.connector = this.connectors.find(element=> element.name === apicore.conname);
			apicore.initModules();
			API.core = apicore;
			console.log(`${tabs(1)}ЯДРО. ЗАПУСК МОДУЛЯ API ДЛЯ ЯДРА УСПЕШНО ОСУЩЕСТВЛЕН`);
			return {status: 1, operation: 'initApiCore'};
		} catch(e) {
			return {status: 0, operation: 'initApiCore', err: e};
		}
	}
	async initCoreAuthUsersValidate() {
		try {
			console.log(`${tabs(1)}ЯДРО. ИНИЦИАЛИЗАЦИЯ ПРОВЕРКИ АВТОРИЗОВАННОСТИ ДЛЯ API`);
			API.core.validate.authUsers = AUTH_USERS;
			console.log(`${tabs(1)}ЯДРО. ИНИЦИАЛИЗАЦИЯ ПРОВЕРКИ АВТОРИЗОВАННОСТИ ДЛЯ API УСПЕШНО ОСУЩЕСТВЛЕНА`);
			return {status: 1, operation: 'initCoreAuthUsersValidate'};
		} catch(e) {
			return {status: 0, operation: 'initCoreAuthUsersValidate', err: e};
		}
	}
	async initApps() {
		try {
			let that = this;
			console.log(`${tabs(1)}ЯДРО. НАЧАЛО ПРОЦЕССА ИНИЦИАЛИЗАЦИИ ПРИЛОЖЕНИЙ`);
			let dirs = fs.readdirSync(DIR_APPS, { withFileTypes: true });
			dirs.map((dir)=> {
				let app = new (require(`${DIR_APPS}/${dir.name}/Core`));
				// console.log('app1=> ', app);
				this.apps.push(app);
				if (typeof API.apps === 'undefined') API.apps = {};
				API.apps[app.name] = app;
				API.core.apps.newapp = app;
				// console.log('app=>', app);
			})
			
			console.log(`${tabs(1)}ЯДРО. ПРОЦЕСС ИНИЦИАЛИЗАЦИИ ПРИЛОЖЕНИЙ УСПЕШНО ОСУЩЕСТВЛЕН`);
			return {status: 1, operation: 'initApps'};
		} catch(e) {
			return {status: 0, operation: 'initApps', err: e};
		}
	}
	async initAppsConnectors() {
		try {
			console.log(`${tabs(2)}Передача в приложения соответствующих коннекторов`);
			this.apps.map((app)=> {
				console.log(`${tabs(3)}Для приложения ${app.name} выбран коннектор ${app.conname}`);
				for (let i=0; i<this.connectors.length; i++) {
					if (this.connectors[i].name === app.conname) {
						app.connector = this.connectors[i];
						console.log(`${tabs(3)}Коннектор ${app.conname} успешно передан в приложение ${app.name}`);
						break;
					}
				}
			});
			console.log(`${tabs(2)}Передача в приложения соответствующих коннекторов успешно осуществлена`);
			return {status: 1, operation: 'initAppsConnectors'};
		} catch(e) {
			return {status: 0, operation: 'initAppsConnectors', err: e};
		}
	}
	async initAppsBases() {
		try {
			console.log(`${tabs(2)}Запуск процесса инициализации соединений с базами данных`);
			this.apps.map((app)=> {
				console.log(`${tabs(3)}Инициализации соединений с базами данных для приложения ${app.name}`);
				app.initBases();
				console.log(`${tabs(3)}Инициализации соединений с базами данных для приложения ${app.name} успешно осуществлен`);
			})
			console.log(`${tabs(2)}Процесс инициализации соединений с базами данных успешно осуществлен`);
			return {status: 1, operation: 'initAppsBases'};
		} catch(e) {
			return {status: 0, operation: 'initAppsBases', err: e};
		}
	}
	async initAppsToolbox() {
		try {
			console.log(`${tabs(2)}Запуск toolbox для приложений`, );
			this.apps.map((app)=> {
				console.log(`${tabs(3)}Запуск toolbox для приложения ${app.name}`);
				app.initToolbox();
				console.log(`${tabs(3)}Запуск toolbox для приложения ${app.name} успешно осуществлен`);
			})
			console.log(`${tabs(2)}Запуск toolbox для приложений успешно осуществлен`);
			return {status: 1, operation: 'initAppsToolbox'};
		} catch(e) {
			return {status: 0, operation: 'initAppsToolbox', err: e};
		}
	}
	async initAppsLogging() {
		try {
			console.log(`${tabs(2)}Запуск логирования приложений`);
			this.apps.map((app)=> {
				console.log(`${tabs(3)}Запуск логирования для приложения ${app.name}`);
				app.initLogging();
				console.log(`${tabs(3)}Запуск логирования для приложения ${app.name} успешно осуществлен`);
			})
			console.log(`${tabs(2)}Запуск логирования приложений успешно осуществлен`);
			return {status: 1, operation: 'initAppsLogging'};
		} catch(e) {
			return {status: 0, operation: 'initAppsLogging', err: e};
		}
	}
	async initAppsDictionaries() {
		try {
			console.log(`${tabs(2)}Запуск процесса получения справочников`);
			this.apps.map((app)=> {
				console.log(`${tabs(3)}Запуск процесса получения справочников для приложения ${app.name}`);
				app.initDictionaries();
				console.log(`${tabs(3)}Запуск процесса получения справочников для приложения ${app.name} успешно осуществлен`);
			})
			console.log(`${tabs(2)}Процесс получения справочников успешно осуществлен`);
			return {status: 1, operation: 'initAppsDictionaries'};
		} catch(e) {
			return {status: 0, operation: 'initAppsDictionaries', err: e};
		}
	}
	async initAppsUniqueMethods() {
		try {
			console.log(`${tabs(2)}Запуск специфичных методов для приложений`);
			for (let i=0; i<this.apps.length; i++) {
				console.log(`${tabs(3)}Запуск специфичных методов для приложения ${this.apps[i].name}`);
				await this.apps[i].uniqueMethods();
				console.log(`${tabs(3)}Запуск специфичных методов для приложения ${this.apps[i].name} успешно осуществлен`);
			}
			console.log(`${tabs(2)}Запуск специфичных методов для приложений успешно осуществлен`);
			return {status: 1, operation: 'initAppsUniqueMethods'};
		} catch(e) {
			return {status: 0, operation: 'initAppsUniqueMethods', err: e};
		}
	}
	async initRoutes() {
		try {
			console.log(`${tabs(1)}ЯДРО. ИНИЦИАЛИЗАЦИЯ РОУТИНГА`);
			if (this.GLOBAL_APP != null) {
				this.GLOBAL_APP.get('/cmd', this.commands);
				this.GLOBAL_APP.put('/cmd', this.commands);
				this.GLOBAL_APP.get('/subscription', this.subscription);
				console.log(`${tabs(1)}ЯДРО. ИНИЦИАЛИЗАЦИЯ РОУТИНГА УСПЕШНО ОСУЩЕСТВЛЕНА`);
				return {status: 1, operation: 'initRoutes'};
			} else {
				await sleep(2000);
				return this.initRoutes();
			}
		} catch(e) {
			return {status: 0, operation: 'initRoutes', err: e};
		}
	}
	async commands(req, res) {
		try {
			// console.log("получили команду");
			let packet;
			if (req.method == 'GET') packet = that.toolbox.parsingGet(req);
			else if (req.method == 'PUT') packet = await that.toolbox.parsingPut(req);
			console.log("core packet==> ", packet);
			 // = that.toolbox.parsingGet(req);
			let com = packet.com.split('.');
			let obj = {};
			obj.com = packet.com;
			obj.subcom = packet.subcom;
			obj.data = {};
			if (com[0] == APP_NAME) {
				console.log("проверили имя приложения");
				if (typeof API[com[1]] !== "undefined" && packet.data) {
					// console.log("Убедились, что есть data");
					let module = API[com[1]][com[2]];
					// если метод есть, то для начала проверим, авторизован ли пользователь и есть ли у него права на доступ в данный раздел
					if (typeof module[packet.subcom] !== 'undefined') {
						console.log("Убедились что есть subcom");

						let err = [];
						// для начала проверим, нет ли ошибок в пакете
						console.log('есть ли ошибки в пакете');

						if (!API.core.validate.ifAuthorized(packet.uid, AUTH_USERS)) {	
							if (packet.subcom === 'initsession') {
								console.log("не авторизован, но пакет на создание сессии");
								let o = await module[packet.subcom](packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
								for (let key in o) obj.data[key] = o[key];
								if (typeof o.uid !== 'undefined') obj.status = HTTP_STATUSES.OK;
								else obj.status = HTTP_STATUSES.UNAUTHORIZED;
								if ( typeof packet.hash !== 'undefined' ) obj.hash = packet.hash;
							} else {
								console.log('Запрещено. Необходима авторизация');
								obj.err = ['Запрещено. Необходима авторизация'];
								obj.status = HTTP_STATUSES.UNAUTHORIZED;
							}
							res.end(JSON.stringify(obj));
						} else {
							err = API.core.validate.checkPacket(packet);
							if (err.length > 0) {
								console.log('ошибки есть ', err);
								obj.err = err;
								obj.status = HTTP_STATUSES.BAD_REQUEST;
								res.end(JSON.stringify(obj));
							} else {
								console.log("Ошибок нет");
								// теперь проверим, авторизован ли пользователь
					
								console.log('Получим статус');
								// теперь проверим статус пользователя. 
								// console.log("получим статус");
								let status = API.core.validate.userStatus(packet.uid, AUTH_USERS);
								console.log("проверка статуса =>", status);
								if (status === 1) {
									console.log('со статусом норм');
									// console.log("==>", packet);
									// ошибок пакета нет, пользователь авторизован. 
									// сразу ответим пользователю, что его пакет нормальный
									let answer = {com: packet.com, subcom: packet.subcom, msg: `ok`, status: HTTP_STATUSES.OK};
									res.end(JSON.stringify(answer));
									if (typeof module[packet.subcom] === 'function') {
										console.log('функция');
										// console.log("function=>", packet);
										// if (packet.data.base == 'DEXMTSSTS062013') {
										// 	console.log(module)
										// }
										let o = await module[packet.subcom](packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);

										// console.log("oooo=>", o);
										for (let key in o) obj.data[key] = o[key];
										
									} else {
										// console.log(  );
										console.log("не function=>");
										obj.data = module[packet.subcom];
									}
									if (obj.data.status == 1) obj.data.status = HTTP_STATUSES.OK;
									if ( typeof packet.hash !== 'undefined') obj.hash = packet.hash;
									
								} else if (status === 2) {
									console.log('статус unlocksession');
									if (packet.subcom === 'unlocksession' && packet.com === 'skyline.core.auth') {
										let o = await module[packet.subcom](packet, AUTH_USERS, SUBSCRIBERS, AWAIT_SENDING_PACKETS);
										for (let key in o) obj.data[key] = o[key];
										obj.status = HTTP_STATUSES.OK;
										if ( typeof packet.hash !== 'undefined' ) obj.hash = packet.hash;

									} else  if (packet.subcom === 'locksession') {
										console.log('статус locksession');
										obj.com = "skyline.core.auth";
										obj.subcom = "locksession";
										obj.data.err = ['Для дальнейшего действия вам необходимо разблокировать аккаунт'];
										obj.status = HTTP_STATUSES.LOCKED;
										res.end(JSON.stringify(obj));
									} else {
										console.log('неизвестный статус');
										//res.end(JSON.stringify(obj));
									}

									
								} else if (status === 3) {
									obj.data.err = ['Для дальнейшего действия вам необходимо разбанить аккаунт'];
									obj.status = HTTP_STATUSES.FORBIDDEN;
									res.end(JSON.stringify(obj));
								}
								if (!API.core.validate.ifSibscribe(packet.uid, SUBSCRIBERS)) {
									// так как пользователь не успел подписаться, запомним пакет и как только подпишется, отправим ему его
									AWAIT_SENDING_PACKETS.push({uid: packet.uid, packet: obj});
									// console.log("нет подписки, запомним");
								} else {
									let subscriber =  SUBSCRIBERS[packet.uid];
							        delete SUBSCRIBERS[packet.uid];
							        subscriber.res.end(JSON.stringify(obj))
								}
								
							}
						}



						
					} else {
						res.end(JSON.stringify("и снова кто ты1111?"));
					}
				} else {
					res.end("что-то не так с параметрами пакета");
				}
			} else {
				res.end(JSON.stringify("кто ты?"));
			}
			// console.log("конец обработки команды");
		} catch(e) {
			console.log("==>", e);
		}
	}
	async subscription(req, res) {
		try {
			console.log("Заявка на подписку");
			let packet = that.toolbox.parsingGet(req);
			if (typeof packet.uid !== 'undefined') {
				let uid = AUTH_USERS.findIndex(element=> element.Uid === packet.uid);
				if (uid == -1) {
					console.log('packet=> ', packet);
					let obj = {err: 'Запрещено. Необходима авторизация', status: 401};
					res.end(JSON.stringify(obj));
				} else {
					if (typeof SUBSCRIBERS[packet.uid] !== 'undefined') {
						// если такой подписчик есть, то новую подписку не оформляем, переписываем лишь соединение
						// теперь данные по подписке будут идти на это соединение
						let subscriber = SUBSCRIBERS[packet.uid];
						subscriber.res = res;
						SUBSCRIBERS[packet.uid] = subscriber;
					} else {
						// оформим подписку
						let subscriber = {res: res};
						SUBSCRIBERS[packet.uid] = subscriber;

						// проверим, не было ли пакетов для этого uid, пока он не успел оформить подписку
						for (let i=0; i < AWAIT_SENDING_PACKETS.length; i++) {
							if (AWAIT_SENDING_PACKETS[i].uid === packet.uid) {
								// console.log("есть пакет для запоздавшей подписки");
								let subscriber =  SUBSCRIBERS[packet.uid];
								delete SUBSCRIBERS[packet.uid];
								let p = AWAIT_SENDING_PACKETS.splice(i, 1);
								// console.log("ppppp=>", p);
						        subscriber.res.end(JSON.stringify(p[0].packet));
								
								break;
							}
						}
					}

					// поставим текущее значение времени в подписки для пользователя
					for (let i=0; i< AUTH_USERS.length; i++) {
						if (AUTH_USERS[i].uid === packet.uid) {
							AUTH_USERS[i].lastSubscribe = that.toolbox.getTime();
							break;
						}
					}

				}
			} else {
				res.end('Ошибка запроса. Проверьте параметры');
			}
		} catch (e) {
			console.log("e==>", e);
		}
		// console.log("длина AWAIT_SENDING_PACKETS=>", AWAIT_SENDING_PACKETS.length);
	}


	// get EXPRESS() {return this.GLOBAL_APP;}
	set EXPRESS(app) {this.GLOBAL_APP = app;}

}

function tabs(num) {
	let tab = '';
	for (let i=0; i< num; i++) tab += TAB;
	return tab;
}
// тут мы проверяем какие подписки истекли и просим осуществить подписку снова
setInterval(()=> {checkSubscribers()}, 10000);
function checkSubscribers() {
	for (let subscriber in SUBSCRIBERS) {
		for (let i=0; i<AUTH_USERS.length; i++) {
			if (AUTH_USERS[i].uid == subscriber) {
				// console.log('Date().getTime()=>', new Date().getTime(), " AUTH_USERS[i].lastSubscribe=>", AUTH_USERS[i].lastSubscribe, " dif=>", new Date().getTime() - AUTH_USERS[i].lastSubscribe);
				if (new Date().getTime() - AUTH_USERS[i].lastSubscribe > 80000) {
					SUBSCRIBERS[subscriber].res.end(JSON.stringify({com: "subscription", subcom: "reconnect"}));
				} 
				break;
			}
		}
	}
}

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Length');
    res.header("Content-Type", "application/json; charset=utf-8");


    // res.header('Access-Control-Allow-Origin', '*');
    // res.header('Access-Control-Allow-Credentials', 'true');
    // res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    // // res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range');
    // res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    // res.header('Access-Control-Expose-Headers', 'Content-Length');
    // res.header('Content-Type', 'application/json; charset=utf-8');
    next();
 };

const listDefCons = {
	'mysql' : [
		{connectionLimit:60, host:'192.168.0.33', user:"dex", password:"dex", base:"skyline", pseudoName: 'skyline'}
	]
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
var core = new Core();
module.exports = core;

let HTTP_STATUSES = {
	OK: 200,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	LOCKED: 423
}