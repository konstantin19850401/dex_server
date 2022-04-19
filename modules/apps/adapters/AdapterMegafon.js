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
	}
	async updateTokens() {
		//статусы токена -1(заблокирован), 0(ок), 1(требуется обновить токен), 2(осуществляется обновление токена)
		// console.log('обновим токены');
		if (!this.receivingTokens) {
			this.receivingTokens = !this.receivingTokens;
			for (let prof in this.profiles) {
				let profile = this.profiles[prof];
				// console.log('для профиля ', prof, ' status=', profile.status);
				if (profile.status == 1) {
					profile.status = 2;
					profile.countFiledTokenRequest = profile.countFiledTokenRequest == undefined ? 0 : profile.countFiledTokenRequest++;
					if (profile.countFiledTokenRequest > 1) profile.status = -1;
					// console.log(`Для профиля ${prof} будет запрошен новый токен`);
					let megaData = { 
                        headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'Authorization': 'Basic cHNfc2VwOjExMTE='},
                        url: `${this.api}/ps/auth/api/token`,
                        method: "POST",
                        pfx: this.toolbox.fsReadFileSync(`${this.certifsDir}/cert.pfx`),
                        passphrase: this.certifsPassPhrase,
                        form: {
                            grant_type: "password",
                            username: profile.username,
                            password: profile.password
                        }
                    }
                    //console.log('==>', megaData);
                    let request = await this.toolbox.request(megaData);
                    //console.log('request=>', request);
                    if (request.err != null) {
                    	this.printMessage(`Ошибка получения токена для профиля ${prof}`);
                    	console.log(`Ошибка получения токена для профиля ${prof} Описание ошибки `, request.err);
                    } else {
                    	let check = this.toolbox.parseBody(request.body);
                    	if (!check.status) {
                    		this.printMessage(`Ошибка в процессе парсинга ответа на запрос токена для профиля ${prof}.`);
                    		console.log('Ошибка получения токена для профиля ${prof}. Описание ошибки ', check);
                    	} else {
                    		let tokenInfo = JSON.parse(request.body);
                    		if (tokenInfo.access_token) {
                    			this.printMessage(`Токен для профиля ${prof} получен`);
                    			profile.tokenInformation = tokenInfo;
                    			let newCreate = moment(profile.tokenInformation.date_creation, "DD-MM-YYYY hh:mm:ss").add(3, 'hours');//.format('DD-MM-YYYY hh:mm:ss');
                                let newExpiration = moment(profile.tokenInformation.date_expiration, "DD-MM-YYYY hh:mm:ss").add(3, 'hours');//.format('DD-MM-YYYY hh:mm:ss');
                                profile.tokenInformation.date_creation = newCreate;
                                profile.tokenInformation.date_expiration = newExpiration;
                    			profile.status = 0;
                    			profile.countFiledTokenRequest = 0;
                    		} else if (tokenInfo.error == "user_locked") {
                    			profile.status = -1;
                    			this.printMessage(`Аккаунт для профиля ${prof} заблокирован`);
                    		} else {
                    			this.printMessage(`Ошибка получения токена ${prof}. Описание пришедшего пакета ${request.body}`);
                    			//profile.status = 1;
                    		}
                    	}
                    }
					//profile.status = 2;
				}
			}
			this.receivingTokens = !this.receivingTokens;
		}
	}
	async checkTokens() {
		let ifNeedUpdateToken = false;
		let nowDate = moment();
		for (let prof in this.profiles) {
			let profile = this.profiles[prof];
			if (profile.status != -1 && profile.status != 2) {
				if (profile.tokenInformation && profile.tokenInformation.date_expiration) {
					let date_expiration = moment(profile.tokenInformation.date_expiration, "DD-MM-YYYY hh:mm:ss");
					//console.log('Разница дат ', date_expiration.diff(nowDate, 'minutes'));
					if (date_expiration.diff(nowDate, 'minutes') < 10) {
						profile.status = 1;
						ifNeedUpdateToken = true;
					}
				} else {
					profile.status = 1; 
					ifNeedUpdateToken = true;
				}
			}
		}
		if (ifNeedUpdateToken) this.updateTokens();
	}

	async exportContractToMegafonV1(row) {
		try {
			let docStatus = this.DOCUMENT_RETURNED;
			let contract = new Contract(await this.toolbox.xmlToJs(row.data), this.toolbox, this.base, this.dictionaries);
			let document = contract.megafon;
			let msisdn = document.SIM.MSISDN;
        	console.log('document=> ', document);
        	let status = false;
        	if (document.DOCUMENT.PROFILE_CODE) {
        		let errors = await contract.errors();
        		if (errors.length > 0) {
	                errors.unshift(`${msisdn} Во время валидации документа были обнаружены ошибки: `);
	                await this.printMessage(errors.join('\n'), row.id, docStatus);
	            } else {
	            	let arrMethods = ["getKitId", "getKitData", "getRegistrationTemplate", "getCountry", "getCheckRegistration", "getKitPlans", "sendContract"];
	            	let profileCode = document.DOCUMENT.PROFILE_CODE, mainObject = {};
	            	let endMethod = "";	            	
	            	for (let i=0; i<arrMethods.length;i++) {
	            		if (this.profiles[profileCode].status == 0) {
	            			let obj = await this[arrMethods[i]](document, errors, row, profileCode, docStatus, mainObject, contract);
	            			if (obj.status == -1) {
		                        endMethod = arrMethods[i];
		                        break;
		                    }
	            		} else if (this.profiles[profileCode].status == 1) {
	            			await this.printMessage(`${msisdn} Происходит запрос нового токена для профиля.`, row.id, docStatus);
	            			break;
                    	} else if (this.profiles[profileCode].status == -1) {
                    		await this.printMessage(`${msisdn} Токен ${profileCode} заблокирован.`, row.id, docStatus);
                    		break;
	            		} else { 
	            			await this.printMessage(`${msisdn} Токен ${profileCode} неизвесная ошибка.`, row.id, docStatus);
	            			break;
	            		}
	            	}
	            	if (endMethod == '') status = true; 
	            	else await this.printMessage(`${msisdn} Выполнение процедуры регистрации прервано на методе ${endMethod}`);         	
	            }
        	} else {
        		await this.printMessage(`${msisdn} Профиль отправки не установлен.`, row.id, docStatus);
        	}
        	return status;
		} catch(e) {
			console.log('e=>', e);
        	this.printMessage(`Критическая ошибка в процессе регистрации договора ${this.toolbox.formatingExc(e).text}`);
        	return false;
		}
    }

    async getKitId(document, docErrors, row, profileCode, docStatus, mainObject) {
    	let o = {status: -1};
    	try {
    		let data = { 
                headers: {'authToken': this.profiles[profileCode].tokenInformation.access_token},
                url: `${this.api}/openapi/v1/subscribers/mobile/kits/location`,
                qs: {MSISDN: document.SIM.MSISDN},
                method: "GET",
                pfx: this.toolbox.fsReadFileSync(`${this.certifsDir}/cert.pfx`),
                passphrase: this.certifsPassPhrase
            }
            let request = await this.toolbox.request(data);
            if (request.err != null) await this.printMessage(`${document.SIM.MSISDN} Ошибка получения kitId. Описание ошибки=> ${JSON.stringify(request.err)}`, row.id, docStatus);
            else {
            	let check = this.toolbox.parseBody(request.body);
            	if (!check.status) await this.printMessage(`${document.SIM.MSISDN} Критическая ошибка в процессе получения kitId. Описание ошибки=> ${JSON.stringify(check.developerMessage)}`, row.id, docStatus);
            	else {
            		o.response = JSON.parse(request.body);
            		if (o.response.kitLocation != undefined) {
            			if (o.response.kitLocation.customerDatabaseType == "GF") o.status = 1;
                        else await this.printMessage(`${document.SIM.MSISDN} В процессе получения информаци по kitId комплекта сервер МЕГА ответил, что комплект не принадлежит GF. Описание ошибки=> ${JSON.stringify(o.response)}`, row.id, docStatus);
            		} else {
            			if (o.response.error != undefined) {
                            if (o.response.error == "token_invalid") await this.printMessage(`${document.SIM.MSISDN} В процессе получения kitId, выяснилось, что токен устарел. Будет запрошен новый.`);
                            else await this.printMessage(`${document.SIM.MSISDN} В процессе получения kitId была получена ошибка. Пришедший пакет=> ${JSON.stringify(o.response)}`);
                        } else {
                        	await this.printMessage(`${document.SIM.MSISDN} В процессе получения kitId сервер МЕГА ответил следующим пакетом. Описание ошибки=> ${JSON.stringify(o.response)}`, row.id, docStatus);
                        }
            		}
            	}
            }
    	} catch (e) {
    		await this.printMessage(`${document.SIM.MSISDN} Критическая ошибка в процессе получения kitId ${this.toolbox.formatingExc(e).text}`);
    	}
    	return o;
    }
    async getKitData(document, docErrors, row, profileCode, docStatus, mainObject) {
    	let o = {status: -1};
    	try {
    		let data = {
    			headers: {'authToken': this.profiles[profileCode].tokenInformation.access_token,'Content-Type': 'application/json'},
                url: `${this.api}/openapi/v1/subscribers/mobile/kits/search?limit=0`,
                qs: {
                    standardId: 1,
                    isNotPAC: true,
                    isNotActivatedPAC: true,
                    isActivatedPAC: true,
                    phoneNumbers: document.SIM.MSISDN
                },
                method: "POST",
                pfx: this.toolbox.fsReadFileSync(`${this.certifsDir}/cert.pfx`),
                passphrase: this.certifsPassPhrase
    		}
    		let request = await this.toolbox.request(data);
    		if (req.err != null) await this.printMessage(`${document.SIM.MSISDN} Ошибка получения kitData для комплекта. Описание ошибки=> ${JSON.stringify(req.err)}`, row.id, docStatus);
            else {
            	let check = this.toolbox.parseBody(request.body);
            	if (!check.status) await this.printMessage(`${document.SIM.MSISDN} Ошибка получения KitData для комплекта. Описание ошибки=> ${JSON.stringify(check.developerMessage)}`, row.id, docStatus);
            	else {
            		o.response = JSON.parse(request.body);
            		if (o.response.items) {
            			if (o.response.items.length == 0) {
                            await this.printMessage(`${document.SIM.MSISDN} Данного комплекта не существует или он уже зарегистрирован ${JSON.stringify(o.response)}`, row.id, docStatus);
                        } else {
                        	o.status = 1;
                        	o.data = {};
                            o.data.kitId = o.response.items[0].kitId;
                            o.data.ratePlanId = o.response.items[0].ratePlan.ratePlanId;
                            o.data.tpIdForRegister = o.response.items[0].ratePlan.ratePlanId;
                            o.data.isActivated = o.response.items[0].isActivated;          
                            o.data.ratePlanName = o.response.items[0].ratePlan.name;
                            o.data.kitICC = o.response.items[0].ICC;
                            if (o.data.isActivated == false) {
                            	await this.printMessage(`${document.SIM.MSISDN} сим-карта не активирована. ID = ${document.SIM.PLAN.ID} , NAME = ${document.SIM.PLAN.NAME}`);
                            	o.data.tpIdForRegister = document.SIM.PLAN.ID;
                                o.data.ratePlanName = document.SIM.PLAN.NAME;
                            } else {
                            	await this.printMessage(`${document.SIM.MSISDN} сим-карта активирована. ID = ${o.data.tpIdForRegister} , NAME = ${o.data.ratePlanName}`)
                            	if (o.data.tpIdForRegister == 53) {
                            		await this.printMessage(`${document.SIM.MSISDN} сим-карта активирована, но МЕГА тупит и поставил ТП стартовый, потому ставим как указанов договоре. ID = ${document.SIM.PLAN.ID} , NAME = ${document.SIM.PLAN.NAME}`);
                            		o.data.tpIdForRegister = document.SIM.PLAN.ID;
                                    o.data.ratePlanName = document.SIM.PLAN.NAME;
                            	} else {
                            		document.SIM.PLAN.ID = o.data.tpIdForRegister;
                                    document.SIM.PLAN.NAME = o.data.ratePlanName;
                            	}
                            	o.data.isPAC = o.response.items[0].isPAC;
	                            o.data.numberClass = o.response.items[0].numberClass;
	                            o.data.directPSTNNumber = o.response.items[0].directPSTNNumber;
	                            o.data.additionalCityPhoneNumber = o.response.items[0].additionalCityPhoneNumber;
	                            o.data.numberType = o.response.items[0].numberType;
	                            o.data.kitSwitch = o.response.items[0].switch;
	                            mainObject.kitData = o.data;
	                            await this.printMessage(`${document.SIM.MSISDN} Данные комплекта ${request.body}`);
                            }
                        }
            		} else {
            			o.response = body != undefined ? body.substring(0, 200) : "";
            			await this.printMessage(`${document.SIM.MSISDN} Критическая ошибка в процессе получения данных комплекта ${o.response}`, row.id, docStatus);
            		}	
            	}
            }
    	} catch (e) {
    		await this.printMessage(`${document.SIM.MSISDN} Критическая ошибка в процессе получения данных комплекта  ${this.toolbox.formatingExc(e).text}`);
    	}
    	return o;
    }
    async getRegistrationTemplate(document, docErrors, row, profileCode, docStatus, mainObject) {
    	let o = {status: -1};
    	try {
    		let data = {
    			headers: {'authToken': this.profiles[profileCode].tokenInformation.access_token,'Content-Type': 'application/json',},
                url: `https://${this.api}/openapi/v1/common/batchExecute`,
                body: JSON.stringify({
                    functions: [
                        {
                            url : "openapi/v1/customers/templates/individualCustomer",
                            params : {kitId: mainObject.kitData.kitId},
                            requestId : "customersTemplate",
                            method : "GET"
                        },
                        {   
                            url : "openapi/v1/customers/contracts/templates/fromKit",
                            params : {kitId: mainObject.kitData.kitId},
                            requestId : "contractsTemplate",
                            method : "GET"
                        },
                        { 
                            url : "openapi/v1/subscribers/mobile/templates/fromKit",
                            params : {kitId: mainObject.kitData.kitId},
                            requestId : "contractsTemplate",
                            method : "GET"
                        }
                    ]
                }),
                method: "POST",
                pfx: this.toolbox.fsReadFileSync(`${this.certifsDir}/cert.pfx`),
                passphrase: this.certifsPassPhrase
    		}
    		let request = await this.toolbox.request(data);
            if (request.err != null) await this.printMessage(`${document.SIM.MSISDN} Ошибка получения registrationTemplate для комплекта. Описание ошибки=> ${JSON.stringify(req.err)}`, row.id, docStatus);
            else {
            	let check = this.toolbox.parseBody(request.body);
            	if (!check.status) await this.printMessage(`${document.SIM.MSISDN} Ошибка получения registrationTemplate для комплекта. Описание ошибки=> ${JSON.stringify(check.developerMessage)}`, row.id, docStatus);
            	else {
            		o.status = 1;
                    o.response = JSON.parse(req.body);
                    o.data = {};
                    o.data.branchId = o.response[0].result.branch.branchId;
                    o.data.juralTypeId = o.response[0].result.juralType.juralTypeId;
                    o.data.customerTypeId = o.response[0].result.customerType.customerTypeId;
                    o.data.customerClassId = o.response[0].result.customerClass.customerClassId;
                    o.data.customerStatusId = o.response[0].result.status.customerStatusId;
                    o.data.customerCategoryId = o.response[0].result.category.customerCategoryId;
                    o.data.languageId = o.response[0].result.language.languageId;
                    o.data.registrationCategoryId = o.response[0].result.registrationCategory.registrationCategoryId;
                    o.data.comment = o.response[0].result.comment;
                    o.data.secretWord = o.response[0].result.personalData.secretWord;
                    o.data.financialInfo = {
                        taxes: [{
                            taxId: o.response[0].result.financialInfo.taxes[0].tax.taxId,
                            startDate: o.response[0].result.financialInfo.taxes[0].startDate
                        }]
                    }
                    o.data.statusId = o.response[1].result.status.contractStatusId;
                    o.data.agentId = o.response[1].result.agent.agentId;
                    o.data.agentName = o.response[1].result.agent.name;
                    o.data.agentContractNumber = o.response[1].result.agent.contractNumber;
                    o.data.isMain = o.response[1].result.isMain;
                    o.data.signingDate = o.response[1].result.signingDate;
                    if (o.response[2].result.salePoint != null) o.data.salePointId = o.response[2].result.salePoint.salePointId;
                    //o.data.salePointId = o.response[2].result.salePoint ? o.response[2].result.salePoint.salePointId : ;
                    o.data.fio = `${document.PERSON.FNAME.LAST_NAME} ${document.PERSON.FNAME.FIRST_NAME} ${document.PERSON.FNAME.SECOND_NAME}`;
                    mainObject.kitTemplate = o.data;
            	}
            }
    	} catch(e) {
    		await this.printMessage(`${document.SIM.MSISDN} Критическая ошибка получения registrationTemplate для комплекта. Описание ошибки=> ${this.formatingExc(e)}`, row.id, docStatus);
    	}
    	return o;
    }
    async getCountry(document, docErrors, row, profileCode, docStatus, mainObject) {
    	let o = {status: -1};
    	try {
            let rw = await this.sqlRequest(this.currentModeBase, `SELECT title FROM efd_country WHERE id= '${document.PERSON.ADDRESS.COUNTRY}'`);
            if (rw.length == 0) {
                await this.printMessage(`${document.SIM.MSISDN} В договоре не указана страна.`, row.id, docStatus);
            } else {
                if (rw[0].title == "") await this.printMessage(`${document.SIM.MSISDN} В договоре не указана страна.`, row.id, docStatus);
                else {
                    o.status = 1;
                    o.data = {};
                    o.data.country = rw[0].title;
                    mainObject.country = rw[0].title;
                }
            }
    	} catch (e) {
    		await this.printMessage(`${document.SIM.MSISDN} Критическая ошибка в процессе получения страны. Описание ошибки => ${this.toolbox.formatingExc(e).text}`);
    	}
    	return o;
    }
    async getCheckRegistration(document, docErrors, row, profileCode, docStatus, mainObject, contract) {
    	let o = {status: -1};
    	try {
    		let checkFromKit = contract.toOperatorData(mainObject);
    		await this.printMessage(`${document.SIM.MSISDN} данные для проверки возможности регистрации ${JSON.stringify(checkFromKit)}`);
    		let data = {
    			headers: {'authToken': this.profiles[profileCode].tokenInformation.access_token,'Content-Type': 'application/json'},
                url: `https://${this.api}/openapi/v1/customers/fromKit/add/check`,
                body: JSON.stringify(checkFromKit),
                method: "POST",
                pfx: this.toolbox.fsReadFileSync(`${this.certifsDir}/cert.pfx`),
                passphrase: this.certifsPassPhrase
    		};
    		let request = await this.toolbox.request(data);
            if (request.err != null) await this.printMessage(`${document.SIM.MSISDN} Ошибка попытки проверки данных для регистрации. Описание ошибки=> ${JSON.stringify(request.err)}`, row.id, docStatus);
            else {
            	let check = this.toolbox.parseBody(request.body);
                if (check.status == false) {
                    await this.printMessage(`${document.SIM.MSISDN} Критическая ошибка в процесcе проверки возможности регистрации контракта. Описание ошибки=> ${request.body}`, row.id, docStatus);
                } else {
                    o.status = 1;
                    o.checkFromKit = checkFromKit;
                    mainObject.checkFromKit = checkFromKit;
                }
            }
    	} catch(e) {
    		await this.printMessage(`${document.SIM.MSISDN} Критическая ошибка в процессе проверки контракта. Описание ошибки => ${this.formatingExc(e)}`, row.id, docStatus);
    	}
    	return o;
    }
    async getKitPlans(document, docErrors, row, profileCode, docStatus, mainObject) {
    	let o = {status: -1};
    	try {
    		o.status = 1;
    	} catch(e) {
    		await this.printMessage(`${document.SIM.MSISDN} Критическая ошибка в процессе получения тарифного плана. Описание ошибки => ${this.toolbox.formatingExc(e).text}`);
    	}
    	return o;
    }
    async sendContract(document, docErrors, row, profileCode, docStatus, mainObject) {
    	let o = {status: -1};
    	try {
    		let patternDate = /(\d{2})\.(\d{2})\.(\d{4})/, salePointId = "";
    		if (parseInt(mainObject.kitTemplate.agentId) != this.profiles[profileCode].agentId) await this.printMessage(`${document.SIM.MSISDN} ID агента не совпадает.`, row.id, docStatus);
    		else {
    			await this.printMessage(`${document.SIM.MSISDN} ID агента совпадает. Будем отправлять документ.`);
    			let points = await this.getPoint(this.profiles[profileCode].agentId, row.unitid);
    			if (points.length == 1) {
    				await this.printMessage(`${document.SIM.MSISDN} Есть точка продаж для этого договора`);
    				salePointId = points[0].mega_salePointId;
    			} else {
    				if (points.length == 0) await this.printMessage(`${document.SIM.MSISDN} Точка продаж для этого договора отсутствует. Ставим основную.`); 
    				else await this.printMessage(`${document.SIM.MSISDN} Для этого договора присутствует несколько точек продаж`);
    				salePointId = undefined;
                    if (salePointId == undefined) {
                        let points = await this.getPoint(this.profiles[profileCode].agentId, row.unitid, true);
                        let randIndex =  this.toolbox.getRandom(0, points.length-1);
                        console.log(`длина списка точек для выбора ${points.length} для агента ${this.profiles[profileCode].agentId}`);
                        salePointId = points[randIndex].mega_salePointId;
                        await this.printMessage(`${document.SIM.MSISDN} Так как точки продаж нет для этого суба, поставил случайную. Случайное число ${randIndex}, в таблице salePointId = ${salePointId}`);
                    } else {
                        await this.printMessage(`${document.SIM.MSISDN} salePointId присутствует в шаблоне. salePointId = ${mainObject.kitTemplate.salePointId}`);
                    }
    			}
    			if (salePointId == undefined) salePointId = mainObject.kitTemplate.salePointId;
    			await this.printMessage(`${document.SIM.MSISDN} будет поставлена точка salePointId = ${salePointId} для отделения ${row.unitid}`);
    			

    			let registerObj = {
                    functions: [
                        {
                            url: "customers/fromKit/add",
                            requestId: "customerCreate",
                            params: {
                                fields: "customerId,customerAccountNumber",
                                businessProcessCode: "CustomerCreate"
                            },
                            requestBody: {
                                kitId: mainObject.kitData.kitId,
                                customer: mainObject.checkFromKit.customer
                            },
                            outParams: ["customerId"],
                            method: "POST"
                        },
                        {
                            url: "customers/${customerId}/contracts/fromKit",
                            internal: true,
                            requestId: "contractCreate",
                            params: {
                                kitId: mainObject.kitData.kitId,
                                businessProcessCode: "CustomerCreate"
                            },
                            requestBody: {
                                contractSupplementaryAgreementDate: null,
                                comment: null,
                                contractClassId: 1,
                                isMain: mainObject.kitTemplate.isMain,
                                signingDate: mainObject.kitTemplate.signingDate,
                                statusId: mainObject.kitTemplate.statusId,
                                agentId: mainObject.kitTemplate.agentId,
                                customerSigning: {
                                    signingName: this.profiles[profileCode].employee,
                                    proxyAuthority: {
                                        number: this.registers.MainDealerPowAt.rvalue, // ?
                                        issueDate: dateFormat(new Date(this.registers.MainDealerDatePowAt.rvalue.replace(patternDate,'$3-$2-$1')), 'yyyy-mm-dd\'T\'00:00:00'),
                                        issuedBy: this.profiles[profileCode].employee
                                    }
                                },
                                assents: {
                                    isPersonalInfoForOperatorAllowed : true,
                                    isPersonalInfoForServicesAllowed : false,
                                    isPersonalInfoForOthersAllowed : false,
                                    isPersonalInfoForDebtsAllowed : false,
                                    isGetAdvertisementsAllowed : false,
                                    isNeutralBenefitOwners : true,
                                    isPersonalBudgetOnAllMSISDNsAllowed : false
                                }
                            },
                            method: "POST"
                        },
                        {
                            url: "customers/${customerId}/subscribers/mobile/fromKit",
                            requestId: "subscriberCreate",
                            requestBody: {
                                subscriber: {
                                    ratePlanId: mainObject.kitData.tpIdForRegister,
                                    salePointId: salePointId // код  точки продаж
                                },
                                currentRatePlanId: mainObject.kitData.ratePlanId,
                                kitId: mainObject.kitData.kitId
                            },
                            method: "POST"
                        }
                    ]
                }

                await this.printMessage(`${document.SIM.MSISDN} Данные для регистрации ${JSON.stringify(registerObj)}`);
                let data = { 
                    headers: {'authToken': this.profiles[profileCode].tokenInformation.access_token, 'Content-Type': 'application/json', 'Accept': 'application/json'},
                    url: `https://${this.api}/openapi/v1/oapi-bis-service/batchExecute`,
                    body: JSON.stringify(registerObj),
                    method: "POST",
                    pfx: this.toolbox.fsReadFileSync(`${this.certifsDir}/cert.pfx`),
                	passphrase: this.certifsPassPhrase
                }
                let request = await this.toolbox.request(data);
                if (request.err != null) await this.printMessage(`${document.SIM.MSISDN} Ошибка попытки проверки данных для регистрации. Описание ошибки=> ${JSON.stringify(request.err)}`, row.id, docStatus);
           		else {
					await this.printMessage(`${document.SIM.MSISDN} Ответ сервера МЕГА на попытку регистрации ${request.body}`);
					let check = this.toolbox.parseBody(request.body);
	                if (check.status == false) {
	                    await this.printMessage(`${document.SIM.MSISDN} Критическая ошибка в процесcе проверки возможности регистрации контракта. Описание ошибки=> ${request.body}`, row.id, docStatus);
	                } else {
	                	let registrationResult = JSON.parse(request.body);
	                	if (registrationResult[1] != undefined && registrationResult[1].result != undefined) {
	                		if (registrationResult[1].result.conflictMessage == null && registrationResult[1].result.conflictType == null) {
	                			o.status = 1;
                                document.DOCUMENT.OPERATOR_NUM = registrationResult[1].result.contractId;
                                document.DOCUMENT.CUSTOMER_ACCOUNT_NUMBER = registrationResult[0].result.customerAccountNumber;
                                document.DOCUMENT.CUSTOMER_ID = registrationResult[0].result.customerId;
                                docStatus = this.DOCUMENT_EXPORTED;
                                await this.printMessage(`${document.SIM.MSISDN} Договор помещен в Компанию.\nID документа в Компании: ${document.DOCUMENT.OPERATOR_NUM}; customerAccountNumber: ${document.DOCUMENT.CUSTOMER_ACCOUNT_NUMBER}. Статус: Зарегистрирован автоматически. Дата регистрации: ${this.toolbox.dateFormat(new Date(), 'dd.mm.yyyy')}`, row.id, docStatus);
	                			
	                			let builder = new xml2js.Builder();
	                			let FizDocOrg = this.toolbox.htmlspecialchars(document.PERSON.IDENTITY_DOCUMENT.ORGANIZATION);
	                			this.log.h(`${document.SIM.MSISDN} Данные организации выдавшей удостоверение до преобразования=> ${document.PERSON.IDENTITY_DOCUMENT.ORGANIZATION}. Данные после преобразования=> ${FizDocOrg}`);
	                			document.PERSON.IDENTITY_DOCUMENT.ORGANIZATION = FizDocOrg;
	                			// let dataXml = builder.buildObject(document.);
	                		} else await this.printMessage(`${document.SIM.MSISDN} Ошибка регистрации. Описание ошибки=> ${JSON.stringify(registrationResult[1].result.conflictMessage)}`, row.id, docStatus);
	                	} else {
	                		await this.printMessage(`${document.SIM.MSISDN} Критическая ошибка в процессе регистрации. Описание ошибки=> ${req.body}`, row.id, docStatus);
	                	}
	                }
				}
    		} 
    	} catch(e) {
    		await this.printMessage(`${document.SIM.MSISDN} Критическая ошибка в процессе регистрации контракта ${this.toolbox.formatingExc(e).text}`, row.id, docStatus);
    	}
    	return o;
    }

	async exportContractToOperator(row) {

        return await this.exportContractToMegafonV1(row);
    }
    async getPoint(agentId, uid, ifNeed) {
        let row;
        if (ifNeed) row = this.toolbox.sqlRequest('dex_bases', `SELECT * FROM mega_dots WHERE mega_profile='${agentId}'`);
        else row = this.toolbox.sqlRequest('dex_bases', `SELECT * FROM mega_dots WHERE mega_profile='${agentId}' AND dex_uid='${uid}'`);
        return row;
    }
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