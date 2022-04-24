'use strict'
// КЛАССЫ
let Adapter = require('./Adapter');
let Api = new (require('./AdapterMegafonApi'))();
let Contract = require('./Contract');
let moment = require("moment");

class AdapterMegafon extends Adapter {
	#core;
	constructor(obj, core) {
		super(obj);
		that = this;
		this.receivingTokens = false;
		this.countFiledTokenRequest = 1; // допустимое количество неудачных попыток запроса токена до блокировки профиля
		this.#core = core;
		this.#Inits();
	}
	async #Inits() {
		await this.#UpdateMegafonStoresDictionary();
	}
	async #UpdateMegafonStoresDictionary() {

	}
	// async updateTokens() {
	// 	//статусы токена -1(заблокирован), 0(ок), 1(требуется обновить токен), 2(осуществляется обновление токена)
	// 	// console.log('обновим токены');
	// 	if (!this.receivingTokens) {
	// 		this.receivingTokens = !this.receivingTokens;
	// 		for (let prof in this.profiles) {
	// 			let profile = this.profiles[prof];
	// 			// console.log('для профиля ', prof, ' status=', profile.status);
	// 			if (profile.status == 1) {
	// 				profile.status = 2;
	// 				profile.countFiledTokenRequest = profile.countFiledTokenRequest == undefined ? 0 : profile.countFiledTokenRequest++;
	// 				if (profile.countFiledTokenRequest > 1) profile.status = -1;
	// 				// console.log(`Для профиля ${prof} будет запрошен новый токен`);
	// 				let megaData = { 
 //                        headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'Authorization': 'Basic cHNfc2VwOjExMTE='},
 //                        url: `${this.api}/ps/auth/api/token`,
 //                        method: "POST",
 //                        pfx: this.toolbox.fsReadFileSync(`${this.certifsDir}/cert.pfx`),
 //                        passphrase: this.certifsPassPhrase,
 //                        form: {
 //                            grant_type: "password",
 //                            username: profile.username,
 //                            password: profile.password
 //                        }
 //                    }
 //                    //console.log('==>', megaData);
 //                    let request = await this.toolbox.request(megaData);
 //                    //console.log('request=>', request);
 //                    if (request.err != null) {
 //                    	this.printMessage(`Ошибка получения токена для профиля ${prof}`);
 //                    	console.log(`Ошибка получения токена для профиля ${prof} Описание ошибки `, request.err);
 //                    } else {
 //                    	let check = this.toolbox.parseBody(request.body);
 //                    	if (!check.status) {
 //                    		this.printMessage(`Ошибка в процессе парсинга ответа на запрос токена для профиля ${prof}.`);
 //                    		console.log('Ошибка получения токена для профиля ${prof}. Описание ошибки ', check);
 //                    	} else {
 //                    		let tokenInfo = JSON.parse(request.body);
 //                    		if (tokenInfo.access_token) {
 //                    			this.printMessage(`Токен для профиля ${prof} получен`);
 //                    			profile.tokenInformation = tokenInfo;
 //                    			let newCreate = moment(profile.tokenInformation.date_creation, "DD-MM-YYYY hh:mm:ss").add(3, 'hours');//.format('DD-MM-YYYY hh:mm:ss');
 //                                let newExpiration = moment(profile.tokenInformation.date_expiration, "DD-MM-YYYY hh:mm:ss").add(3, 'hours');//.format('DD-MM-YYYY hh:mm:ss');
 //                                profile.tokenInformation.date_creation = newCreate;
 //                                profile.tokenInformation.date_expiration = newExpiration;
 //                    			profile.status = 0;
 //                    			profile.countFiledTokenRequest = 0;
 //                    		} else if (tokenInfo.error == "user_locked") {
 //                    			profile.status = -1;
 //                    			this.printMessage(`Аккаунт для профиля ${prof} заблокирован`);
 //                    		} else {
 //                    			this.printMessage(`Ошибка получения токена ${prof}. Описание пришедшего пакета ${request.body}`);
 //                    			//profile.status = 1;
 //                    		}
 //                    	}
 //                    }
	// 				//profile.status = 2;
	// 			}
	// 		}
	// 		this.receivingTokens = !this.receivingTokens;
	// 	}
	// }
	// async checkTokens() {
	// 	let ifNeedUpdateToken = false;
	// 	let nowDate = moment();
	// 	for (let prof in this.profiles) {
	// 		let profile = this.profiles[prof];
	// 		if (profile.status != -1 && profile.status != 2) {
	// 			if (profile.tokenInformation && profile.tokenInformation.date_expiration) {
	// 				let date_expiration = moment(profile.tokenInformation.date_expiration, "DD-MM-YYYY hh:mm:ss");
	// 				//console.log('Разница дат ', date_expiration.diff(nowDate, 'minutes'));
	// 				if (date_expiration.diff(nowDate, 'minutes') < 10) {
	// 					profile.status = 1;
	// 					ifNeedUpdateToken = true;
	// 				}
	// 			} else {
	// 				profile.status = 1; 
	// 				ifNeedUpdateToken = true;
	// 			}
	// 		}
	// 	}
	// 	if (ifNeedUpdateToken) this.updateTokens();
	// }

    async apiCommands(packet, user) {
        if (Api[packet.data.action] != undefined) return await Api[packet.data.action](packet, this.toolbox, this.base, user, this, this.getSchemas, this.dicts, this.#core);
        else return {err: 'Такого метода не существует'};
    }
 //    apiGetCommands(req, res) {
 //    	let packet = that.toolbox.parsingGet(req);
	// 	if (Api[packet.com] != undefined) Api[packet.com](req, res);
	// 	else res.end('Такого метода не существует');
	// }
	initRoutes() {
        this.ROUTES = {get: []};
        for (let key in ROUTES) {
            for (let i=0; i<ROUTES[key].length; i++) {
                let obj = {};
                obj.path = `/${this.pseudoRoute}${ROUTES[key][i].path}`;
                obj.action = this[ROUTES[key][i].action];
                this.ROUTES[key].push(obj);
            }
        }
    }
}

let that;
let ROUTES = {
	get: [
		{path: `/cmd*`, action: 'apiGetCommands'},
	]
}
module.exports = AdapterMegafon;