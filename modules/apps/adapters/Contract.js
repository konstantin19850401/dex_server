class Contract {
	// constructor(data, toolbox, base, vendor, fnames, schemas, user, operatorSchemas) {
	constructor(data, schema, user, operator, toolbox, base) {
		this.ifAllowedToSave = false;
		this.contract = {};
		if (arguments.length == 3 && data) {
			this.operator = CONTRACTS_ID.find(el=> el.id == data.Document.$.ID).vendor;
			this.data = data.Document;
			this.schema = schema;
			this.userid = user;
			this.initContract();
		} else if (arguments.length == 6 && data) {
			this.operator = operator;
			this.data = data;
			this.toolbox = toolbox;
			this.base = base;
			this.schema = schema;
			this.userid = user;
			this.initContract();
		} else {

		}
	};
	get getContract() {return this.contract};
	initContract() {
		try {
			let that = this;
			let fields = this.data;
			for (let key in fields) {
				if (typeof DOCUMENT_TO_CONTRACT[key] !== 'undefined') { 
					let arr = DOCUMENT_TO_CONTRACT[key].split(".");
					let o = this.contract;
					let prep;
					// сформируем web-контракт
					arr.map((item, index)=> {
						if (typeof o[item] === 'undefined' && index != (arr.length - 1)) { 
							o[item] = {};
							prep = o = o[item];
						} else { 
							if (index != (arr.length - 1)) prep = o = o[item];
							else { 
								if (typeof prep[item] === 'undefined') prep[item] = typeof fields[key] === 'object' ? fields[key][0] : fields[key];
								return;
							}
						}
					});
				}
			}
		} catch(e) {
			console.log("e=> ", e);
		}
	};
	async checkContract() {
		let err = [];
		try {
			let contractInspector = new ContractInspector(this.contract, this.toolbox, this.base);
			let ferr = await contractInspector.checkContractFields();
			err = err.concat(ferr);
			if (err.length == 0) this.ifAllowedToSave = true;
		} catch(e) {
			err.push('Критическая ошибка в процессе проверки полей документа');
			console.log(e);
		}
		return err;
	};
	async dexToWeb() {
		if (typeof this.contract.PERSON.ADDRESS.COUNTRY !== 'undefined') this.contract.PERSON.ADDRESS.COUNTRY = await this.schema.dexToWeb('countries', this.contract.PERSON.ADDRESS.COUNTRY);
		if (typeof this.contract.PERSON.SEX !== 'undefined') this.contract.PERSON.SEX = await this.schema.dexToWeb('genders', this.contract.PERSON.SEX);
		if (typeof this.contract.PERSON.CITIZENSHIP !== 'undefined') this.contract.PERSON.CITIZENSHIP = await this.schema.dexToWeb('citizenship', this.contract.PERSON.CITIZENSHIP);
		if (typeof this.contract.CONTRACT_INFORMATION.REGION !== 'undefined') this.contract.CONTRACT_INFORMATION.REGION = await this.schema.dexToWeb('umRegions', this.contract.CONTRACT_INFORMATION.REGION);
		if (typeof this.contract.PERSON.IDENTITY_DOCUMENT.TYPE !== 'undefined') this.contract.PERSON.IDENTITY_DOCUMENT.TYPE = await this.schema.dexToWeb('doctypes', this.contract.PERSON.IDENTITY_DOCUMENT.TYPE);
		if (typeof this.contract.PERSON.IDENTITY_DOCUMENT.TYPE_OTHER !== 'undefined') this.contract.PERSON.IDENTITY_DOCUMENT.TYPE_OTHER = await this.schema.dexToWeb('doctypesOther', this.contract.PERSON.IDENTITY_DOCUMENT.TYPE_OTHER);
		if (typeof this.contract.PERSON.RESIDENCE_DOCUMENT !== 'undefined' && typeof this.contract.PERSON.RESIDENCE_DOCUMENT.TYPE !== 'undefined') this.contract.PERSON.RESIDENCE_DOCUMENT.TYPE = await this.schema.dexToWeb('docresidence', this.contract.PERSON.RESIDENCE_DOCUMENT.TYPE);
	};
	async webToDex() {
		if (typeof this.contract.PERSON.ADDRESS.COUNTRY !== 'undefined') this.contract.PERSON.ADDRESS.COUNTRY = await this.schema.webToDex('countries', this.contract.PERSON.ADDRESS.COUNTRY);
		if (typeof this.contract.PERSON.SEX !== 'undefined') this.contract.PERSON.SEX = await this.schema.webToDex('genders', this.contract.PERSON.SEX);
		if (typeof this.contract.PERSON.CITIZENSHIP !== 'undefined') this.contract.PERSON.CITIZENSHIP = await this.schema.webToDex('citizenship', this.contract.PERSON.CITIZENSHIP);
		if (typeof this.contract.CONTRACT_INFORMATION.REGION !== 'undefined') this.contract.CONTRACT_INFORMATION.REGION = await this.schema.webToDex('umRegions', this.contract.CONTRACT_INFORMATION.REGION);
		if (typeof this.contract.PERSON.IDENTITY_DOCUMENT.TYPE !== 'undefined') this.contract.PERSON.IDENTITY_DOCUMENT.TYPE = await this.schema.webToDex('doctypes', this.contract.PERSON.IDENTITY_DOCUMENT.TYPE);
		if (typeof this.contract.PERSON.IDENTITY_DOCUMENT.TYPE_OTHER !== 'undefined') this.contract.PERSON.IDENTITY_DOCUMENT.TYPE_OTHER = await this.schema.webToDex('doctypesOther', this.contract.PERSON.IDENTITY_DOCUMENT.TYPE_OTHER);
		if (typeof this.contract.PERSON.RESIDENCE_DOCUMENT !== 'undefined' && typeof this.contract.PERSON.RESIDENCE_DOCUMENT.TYPE !== 'undefined') this.contract.PERSON.RESIDENCE_DOCUMENT.TYPE = await this.schema.webToDex('docresidence', this.contract.PERSON.RESIDENCE_DOCUMENT.TYPE);
	};
	async save() {
		let o = {status: 0, msg: ''};
		try {
			this.ifAllowedToSave = true;
			if (this.ifAllowedToSave) {
				// теперь преобразуем в зависимости от поведения контракт и уберем лишние поля
				let rows = await this.toolbox.sqlRequest(`skyline`, `SELECT * FROM dex_dict_doc_fields WHERE behaviors != ''`);
				let rowsAll = await this.toolbox.sqlRequest(`skyline`, `SELECT * FROM dex_dict_doc_fields`);
				console.log('behaviors.length=> ', rows.length);
				for (let i=0; i<rows.length; i++) {
					let uid = rows[i].uid;
					let wn = rows[i].web_name;
					
					// для начала получим значение проверяемого поля, которое оно имеет в контракте
					let field = [];
					let value;
					function getNextProp(contract, field, search) {
						for (let key in contract) {
							field.push(key);
							if (typeof contract[key] === 'object') getNextProp(contract[key], field, search);
							else {
								let f = field.join('.');
								if (f == search) {
									value = contract[key];
									break;
								}
							}
							field.pop();
						}
					}
					// определим поведение этого поля
					let behaviors = JSON.parse(JSON.parse(rows[i].behaviors));
					let ifdelete = true;
					for (let j=0; j<behaviors.length; j++) {
						let performed = 0;
						let behaviorsCnt = 0;
						for (let k=0; k<behaviors[j].length; k++) {
							let behavior = behaviors[j][k];
							if (typeof behavior.fieldDependence !== 'undefined') {
								let fieldDependence = behavior.fieldDependence;
								let nwm = (rowsAll.find((item)=> item.uid == fieldDependence)).web_name;
								field = [];
								getNextProp(this.contract, field, nwm);
								if (behavior.valuesDependence.indexOf(value) !== -1) performed++;
							}
							behaviorsCnt++;
						}
						if (performed == behaviorsCnt) {
							ifdelete = false;
							break;
						} 
					}

					// если поле по behaviors должно быть скрыто, то выкинем его
					if (ifdelete) this.contract = this.toolbox.copyObjectWithoutOneField(this.contract, wn);
				}

				// преобразуем web-контракт в контракт для dex
				await this.webToDex();
				let field = [];
				function getProp(contract, newschema, field) {
					for (let key in contract) {
						field.push(key);
						if (typeof contract[key] == 'object') getProp(contract[key], newschema, field);
						else {
							let f = field.join('.');
							newschema[f] = contract[key];
						}
						field.pop();
 					}
				} 
				let newschema = {};
				getProp(this.contract, newschema, field);
				let newContract = {};
				for (let key in newschema) {
					for (let dtc in DOCUMENT_TO_CONTRACT) {
						if (key == DOCUMENT_TO_CONTRACT[dtc]) {
							newContract[dtc] = newschema[key];
							break;
						}
					}
				}

				console.log("newContract==> ", newContract);
				

				// все, можно сохранять документ
				let contractId = CONTRACTS_ID.find(el=> el.vendor == this.operator).id;
				let fio = '';
				if (newContract.LastName != '') fio += `${newContract.LastName}`;
				if (newContract.FirstName != '') fio += ` ${newContract.FirstName}`;
				if (newContract.SecondName != '') fio += ` ${newContract.SecondName}`;
				let digest = `${newContract.ICC}, ${fio}`;
				let NEWROW = await this.toolbox.preparationContract(this.userid, newContract, contractId, digest, ['ICC'], this.base);
				let arr = [];
	            for (let key in NEWROW) arr.push(`${key} = '${NEWROW[key]}'`);
	            let str = arr.join(",");
				let additionResult = await this.toolbox.sqlRequest(this.base, `INSERT INTO journal SET ${str}`);
				if (additionResult.insertId != null && additionResult.affectedRows != null) { 
					o.status = 1;
					o.newid = additionResult.insertId;
					o.msg = 'Новый документ успешно добавлен в журнал.';
					if (NEWROW.status == SIM_STATUSES.DRAFT) {
						obj.status = 2;
						obj.mgs += 'Выявлены совпадения. Документу установлен статус ЧЕРНОВИК';
					} else {
						await this.toolbox.sqlRequest(this.base, `INSERT INTO criticals SET signature='${NEWROW.signature}', cname='ICC', cvalue='${newContract.ICC}'`);
	                    console.log("в criticals добавлены данные");
					}
				} else {
					o.status = 3;
					o.msg = 'Документ не добавлен в журнал';
					o.devMsg = JSON.stringify(additionResult);
				}



				console.log("additionResult==> ", additionResult);
				return o;
			} else {
				o.status = false;
				o.msg = 'Контракт не сохранен. Возможно, вы не проверили его на ошибки';
				return o;
			}
		} catch (e) {
			console.log('Критическая ошибка в процессе сохранения договор', e);
			o.status = false;
			o.msg = this.toolbox.formatingExc(e);
			return o;
		}
	};
	async checkBehaviors(contract) {
	};
	maket () {
		let s = {DOCUMENT:FIELDS}
		return s;
	}
}

let SIM_STATUSES = {
	ENTERED: 0, // поступила
	DISTRIBUTED: 1, // распределена
	SOLD: 2, // продана
	BLOCKED: 3, // заблокирована
	LOST: 4, // утеряна
	DRAFT: 5 // черновик
}



class ContractInspector {
	constructor(contract, toolbox, base) {
		this.contract = contract;
		this.toolbox = toolbox;
		this.base = base;
	}
	// проверка заполнения обязательных полей и их содержимого
	async checkContractFields() {
		let err = [];
		let iccRegexp = /^\d{10}$/;
		let phoneRegexp = /^\d{10}$/;
		let dateRegexp = /^(\d{1,2}).(\d{1,2}).(\d{4})$/;
		let seriesRegexp = /^\d{4}$/;
		let numberRegexp = /^\d{6}$/;
		let orgCodeRegexp = /^\d{3}-\d{3}$/;
		let moment = this.toolbox.getMoment();

		// первичные проверки без запросов к БД. Если ок, то можно и к базе обратиться, если нет, то нафига к базе обращаться?
		let date = moment(this.contract.CONTRACT_INFORMATION.DATE, "DD.MM.YYYY");
		if (!dateRegexp.test(this.contract.CONTRACT_INFORMATION.DATE) || !date.isValid()) err.push("Некорректная дата подписания договора");
		date = moment(this.contract.CONTRACT_INFORMATION.JOURNAL_DATE, "DD.MM.YYYY");
		if (!dateRegexp.test(this.contract.CONTRACT_INFORMATION.JOURNAL_DATE) || !date.isValid()) err.push("Некорректная дата договора в журнале");
		date = moment(this.contract.PERSON.BIRTH.DATE, "DD.MM.YYYY");
		if (!dateRegexp.test(this.contract.PERSON.BIRTH.DATE) || !date.isValid()) err.push("Некорректная дата рождения абонента");
		else {
			let birthDate = moment(this.contract.PERSON.BIRTH.DATE, "DD.MM.YYYY");
			let docDate = moment(this.contract.CONTRACT_INFORMATION.DATE, "DD.MM.YYYY");
			if (docDate.isBefore(birthDate) || docDate.isSame(birthDate)) err.push('Дата подписания договора должна быть больше даты рождения абонента');
			else {
				let dif = docDate.diff(birthDate, 'years', false);
				if (dif < 18) err.push('Абонент не должен быть младше 18 лет');
			}
		}

        if (!this.toolbox.ifIssetString(this.contract.CONTRACT_INFORMATION.CITY)) err.push("Вы не указали город заключения договора");
        if (!this.toolbox.ifIssetString(this.contract.PERSON.FNAME.LAST_NAME)) err.push('Вы не указали фамилию абонента');
        if (!this.toolbox.ifIssetString(this.contract.PERSON.FNAME.FIRST_NAME)) err.push('Вы не указали имя абонента');
        if (!this.toolbox.ifIssetString(this.contract.PERSON.IDENTITY_DOCUMENT.ORGANIZATION)) err.push("Вы не указали кем выдано удостоверение личности");
        if (!this.toolbox.ifIssetString(this.contract.PERSON.ADDRESS.CITY)) err.push('Не указана населенный пункт в адресе абонента');
        if (!this.toolbox.ifIssetString(this.contract.PERSON.ADDRESS.HOUSE)) err.push('Не указан дом в адресе абонента');
        if (!this.toolbox.ifIssetString(this.contract.PERSON.ADDRESS.COUNTRY) || this.contract.PERSON.ADDRESS.COUNTRY == '0') err.push('Не указана страна в адресе абонента');
        else {
        	let countryRows = await this.toolbox.sqlRequest(`skyline`, `SELECT * FROM dict_countries WHERE uid = '${this.contract.PERSON.ADDRESS.COUNTRY}'`);
        	if (countryRows.length === 0) err.push('Указанная страна в адресе отсутствует в справочнике');
        }
        // if (!this.toolbox.ifIssetString(this.data.DOCUMENT.CONTRACT_INFORMATION.CREATION_TYPE)) err.push("Вы не указали тип создания договора");
        if (typeof this.contract.PERSON.CONTACTS !== 'undefined') {
        	if (!phoneRegexp.test(this.contract.PERSON.CONTACTS.PHONE)) err.push("Вы не указали контактый телефон");
        } else err.push("Вы не указали контактый телефон");

        if (!this.toolbox.ifIssetString(this.contract.CONTRACT_INFORMATION.REGION)) err.push('Вы не указали регион регистрации');
        else {
        	let row = await this.toolbox.sqlRequest('skyline', `SELECT * FROM dict_regions WHERE uid = '${this.contract.CONTRACT_INFORMATION.REGION}'`);
        	if (row.length == 0) err.push('Указанный регион отсутсвует в справочнике');
        }     
        
        // если нет ошибок, то будем работать с БД
        if (err.length === 0) {
        	if (!iccRegexp.test(this.contract.CONTRACT_INFORMATION.SIM.ICC)) err.push("Поле ICC заполнено с ошибками! Длина должна составлять 10 цифр!");
			else {
				if (!this.toolbox.ifIssetString(this.contract.CONTRACT_INFORMATION.UNIT)) err.push('Вы не указали отделение, на которое отписана сим-карта');
				else {
					let simRows = await this.toolbox.sqlRequest(this.base, `SELECT * FROM um_data WHERE icc = '${this.contract.CONTRACT_INFORMATION.SIM.ICC}'`);
					if (simRows.length === 0) err.push('Сим-карта не существует');
					else {
						if (simRows.length > 1) err.push("В справочнике сим-карт обнаружен дубль сим-карты. Обратитесь в офис!");
						else {
							if (simRows[0].status != SIM_STATUSES.DISTRIBUTED) err.push("Сим-карта продана или не отписана на данного субдилера!");
							else {
								let unitRows = await this.toolbox.sqlRequest(this.base, `SELECT * FROM units WHERE uid = '${this.contract.CONTRACT_INFORMATION.UNIT}'`);
								if (unitRows.length === 0) err.push("Указанное отделение отсутствует в справочнике!");
								else {
									if (simRows[0].owner_id != this.contract.CONTRACT_INFORMATION.UNIT) err.push("Сим-карта не отписана данному субдилеру!");
								}
							}
						}
					}
				}
			}

			if (!this.toolbox.ifIssetString(this.contract.CONTRACT_INFORMATION.STATUS)) err.push("Вы не указали статус договора");
			else {
				let statusRows = await this.toolbox.sqlRequest('skyline', `SELECT * FROM dict_doc_statuses WHERE uid = '${this.contract.CONTRACT_INFORMATION.STATUS}'`);
				if (statusRows.length === 0) err.push('Статус договора отсутствует в справочнике статусов'); 
			}

			if (!this.toolbox.ifIssetString(this.contract.PERSON.SEX) || this.contract.PERSON.SEX == '0') err.push("Вы не указали пол абонента");
			else {
				let genderRows = await this.toolbox.sqlRequest('skyline', `SELECT * FROM dict_genders WHERE uid = '${this.contract.PERSON.SEX}'`);
				if (genderRows.length === 0) err.push('Указанный пол абонента отсутствует в справочнике'); 
				else {
					if (this.contract.PERSON.SEX == 0) err.push('Вы не указали пол абонента');
				}
			}

			if (!this.toolbox.ifIssetString(this.contract.PERSON.CITIZENSHIP) || this.contract.PERSON.CITIZENSHIP == '0') err.push('Вы не указали гражданство!');
			else {
				if (this.contract.PERSON.CITIZENSHIP == '208')  {
					if (!this.toolbox.ifIssetString(this.contract.PERSON.CITIZENSHIP_OTHER)) err.push('Для типа гражданства - иное, нужно указать какое в соответствующем поле!');
	 			} else {
					// let citizenRows = await this.toolbox.sqlRequest(this.base, `SELECT * FROM yota_doccountry_for_skyline WHERE uid = '${this.contract.PERSON.CITIZENSHIP}'`);
					let citizenRows = await this.toolbox.sqlRequest(`skyline`, `SELECT * FROM dict_countries WHERE uid = '${this.contract.PERSON.CITIZENSHIP}'`);
					if (citizenRows.length === 0) err.push('Указанная страна гражданства отсутствует в справочнике'); 
				}
			}

			if (!this.toolbox.ifIssetString(this.contract.PERSON.IDENTITY_DOCUMENT.TYPE) || this.contract.PERSON.IDENTITY_DOCUMENT.TYPE == '0') err.push('Вы не указали тип ДУЛ');
			else {
				let typeRows = await this.toolbox.sqlRequest(`skyline`, `SELECT * FROM dex_dict_doctypes WHERE uid = '${this.contract.PERSON.IDENTITY_DOCUMENT.TYPE}'`);
				if (typeRows.length === 0) err.push('Указанный тип ДУЛ отсутствует в справочнике');
				else {
					// если паспорт РФ
					if (this.contract.PERSON.IDENTITY_DOCUMENT.TYPE == '1') {
						console.log("паспорт РФ");
						let er = [];
						date = moment(this.contract.PERSON.IDENTITY_DOCUMENT.DATE, "DD.MM.YYYY");
						if (!dateRegexp.test(this.contract.PERSON.IDENTITY_DOCUMENT.DATE) || !date.isValid()) er.push("Некорректная дата получения удостоверения личности");
						else {
							let docDate = moment(this.contract.CONTRACT_INFORMATION.DATE, "DD.MM.YYYY");
							let fizDocDate = moment(this.contract.PERSON.IDENTITY_DOCUMENT.DATE, "DD.MM.YYYY");
							if (fizDocDate.isAfter(docDate) && !fizDocDate.isSame(docDate)) er.push("Дата выдачи документа не может быть больше даты заключения договора");
				        }
						if (!seriesRegexp.test(this.contract.PERSON.IDENTITY_DOCUMENT.SERIES)) er.push('Серия паспорта РФ должна иметь вид xxxx и содержать только цифры'); 
						if (!numberRegexp.test(this.contract.PERSON.IDENTITY_DOCUMENT.NUMBER)) er.push('Номер паспорта РФ должен иметь вид xxxxxx и содержать только цифры'); 
						if (!orgCodeRegexp.test(this.contract.PERSON.IDENTITY_DOCUMENT.ORGANIZATION_CODE)) er.push('Код подразделения должен иметь вид xxx-xxx');
						if (er.length > 0) err = err.concat(er);
						else {
							console.log('проверим паспорт');
							let chk = await this.toolbox.ifExpiredPassport(this.contract.PERSON.IDENTITY_DOCUMENT);
							console.log("chk==> ", chk);
							if (chk == true) err.push('Паспорт находится в списках недействительных!');
							else {
								// проверим абонента по спискам террористов
								chk = await this.toolbox.checkTerroristsList(this.contract.PERSON.FNAME.LAST_NAME, this.contract.PERSON.FNAME.FIRST_NAME, this.contract.PERSON.BIRTH.DATE);
								if (chk == true) err.push('Абонент находится в списке террористов!');
								// проверка по списку паспортных данных запрещенных для заполнения на уровне офиса
								chk = await this.toolbox.checkForbiddenPassports(this.contract.PERSON.IDENTITY_DOCUMENT.SERIES, this.contract.PERSON.IDENTITY_DOCUMENT.NUMBER);
								if (chk == true) err.push('Абонент находится в списке запрещенных на уровне офиса. Обратитесь в офис!');
								// проверка на расхождение между серией и датой выдачи дул
								chk = await this.toolbox.checkSeriesByDate(this.contract.PERSON);
								if (chk.length > 0) err = err.concat(chk);
								// проверка дат ДУЛ и документа
								chk = await this.toolbox.checkIdentityDocumentDates(this.contract.CONTRACT_INFORMATION, this.contract.PERSON);
								if (chk.length > 0) err = err.concat(chk);
								// проверка ДУЛ на устаревание
								chk = await this.toolbox.checkOutdatedIdentityDocument(this.contract.CONTRACT_INFORMATION, this.contract.PERSON);
								if (chk.length > 0) err = err.concat(chk);
								// проверка по списку подтвержденных ПД
								chk = await this.toolbox.checkByListOfConfirmed(this.contract.PERSON);
								if (chk.length > 0) err = err.concat(chk);
							}
						}
					} else {
						// если не паспорт РФ
						// console.log("this.data=> ", JSON.stringify(this.data));
						if (this.contract.PERSON.IDENTITY_DOCUMENT.TYPE == '2' || this.contract.PERSON.IDENTITY_DOCUMENT.TYPE == '17') {
							let er = [];
							date = moment(this.contract.PERSON.IDENTITY_DOCUMENT.DATE, "DD.MM.YYYY");
							if (!dateRegexp.test(this.contract.PERSON.IDENTITY_DOCUMENT.DATE) || !date.isValid()) er.push("Некорректная дата получения удостоверения личности");
							else {
								let docDate = moment(this.contract.CONTRACT_INFORMATION.DATE, "DD.MM.YYYY");
								let fizDocDate = moment(this.contract.PERSON.IDENTITY_DOCUMENT.DATE, "DD.MM.YYYY");
								if (fizDocDate.isAfter(docDate) && !fizDocDate.isSame(docDate)) er.push("Дата выдачи документа не может быть больше даты заключения договора");
					        }
							if (!this.toolbox.ifIssetString(this.contract.PERSON.IDENTITY_DOCUMENT.SERIES)) er.push('Вы не указали серию удостоверения личности'); 
							if (!this.toolbox.ifIssetString(this.contract.PERSON.IDENTITY_DOCUMENT.NUMBER)) er.push('вы не указали номер удостоверения личности'); 
							if (er.length > 0) {
								err = err.concat(er);
							} else {
								if (!this.toolbox.ifIssetString(this.contract.PERSON.RESIDENCE_DOCUMENT.TYPE)) err.push('Вы не указали тип документа, подтверждающего право пребывания на территории РФ');
								else {
									// let rtypeRows = await this.toolbox.sqlRequest(this.base, `SELECT * FROM yota_docresidence_for_skyline WHERE uid = '${this.contract.PERSON.IDENTITY_DOCUMENT.RESIDENCE.TYPE}'`);
									let rtypeRows = await this.toolbox.sqlRequest(`skyline`, `SELECT * FROM dex_dict_doctypes WHERE uid = '${this.contract.PERSON.RESIDENCE_DOCUMENT.TYPE}'`);
									if (rtypeRows.length === 0) err.push('Указанный тип документа, который подтверждает право пребывания на территории РФ, отсутствует в справочнике');
									else {
										if (this.contract.PERSON.RESIDENCE_DOCUMENT.TYPE == '16') {
											if (!this.toolbox.ifIssetString(this.contract.PERSON.RESIDENCE_DOCUMENT.TYPE_OTHER)) err.push("Вы не указали неизвестный документ!");
										}  
										if (!this.toolbox.ifIssetString(this.contract.PERSON.RESIDENCE_DOCUMENT.SERIES)) err.push('Вы не указали серию документа, подтверждающего право пребывания на территории РФ');
										if (!this.toolbox.ifIssetString(this.contract.PERSON.RESIDENCE_DOCUMENT.NUMBER)) err.push('Вы не указали номер документа, подтверждающего право пребывания на территории РФ');
										let date1 = moment(this.contract.PERSON.RESIDENCE_DOCUMENT.DATE_START, 'DD.MM.YYYY');
										if (!dateRegexp.test(this.contract.PERSON.RESIDENCE_DOCUMENT.DATE_START) || !date1.isValid()) err.push('Некорректная дата начала действия документа, подтверждающего право пребывания на территории РФ');
										let date2 = moment(this.contract.PERSON.RESIDENCE_DOCUMENT.DATE_END, 'DD.MM.YYYY');
										if (!dateRegexp.test(this.contract.PERSON.RESIDENCE_DOCUMENT.DATE_END) || !date2.isValid()) err.push('Некорректная дата окончания действия документа, подтверждающего право пребывания на территории РФ');
										if (date1.isAfter(date2) || date1.isSame(date2)) err.push('Дата окончания действия документа, подтверждающего право пребывания на территории РФ, не может быть меньше даты начала его действия или равным ему!');

										let docDate = moment(this.contract.CONTRACT_INFORMATION.DATE, "DD.MM.YYYY");
										if (date1.isAfter(docDate) && !date1.isSame(docDate)) err.push('Дата заключения договора не может быть меньше даты начала действия документа, подтверждающего право пребывания на территории РФ');
										if (docDate.isAfter(date2) || docDate.isSame(date2)) err.push('Дата заключения договора не может быть больше даты окончания действия документа, подтверждающего право пребывания на территории РФ или равным ему!');
									}
								}
							}
						} else if (this.contract.PERSON.IDENTITY_DOCUMENT.TYPE == '16') {
							if (!this.toolbox.ifIssetString(this.contract.PERSON.IDENTITY_DOCUMENT.TYPE_OTHER) || this.contract.PERSON.IDENTITY_DOCUMENT.TYPE_OTHER == '0') err.push('Вы не указали тип удостоверяющего документа - другой');
							else {
								// let tRows = await this.toolbox.sqlRequest(this.base, `SELECT * FROM yota_other_document_type_for_skyline WHERE uid = '${this.contract.PERSON.IDENTITY_DOCUMENT.TYPE_OTHER}'`);
								let tRows = await this.toolbox.sqlRequest(`skyline`, `SELECT * FROM dex_dict_doctypes WHERE uid = '${this.contract.PERSON.IDENTITY_DOCUMENT.TYPE_OTHER}'`);
								if (tRows.length === 0) err.push('Указанный тип удостоверяющего документа - другой, отсутствует в справочнике');
								else {
									// let typeOther1 = ['military_ticket', 'soldier_identity_card', 'sailor_identity_card', 'residence_permit'];
									let typeOther1 = ['3', '13', '10', '4'];
									let typeOther2 = ['7', '14', '12', '11'];
									if (typeOther1.indexOf(this.contract.PERSON.IDENTITY_DOCUMENT.TYPE_OTHER) !== -1) {
										date = moment(this.contract.PERSON.IDENTITY_DOCUMENT.DATE, "DD.MM.YYYY");
										if (!dateRegexp.test(this.contract.PERSON.IDENTITY_DOCUMENT.DATE) || !date.isValid()) err.push("Некорректная дата получения удостоверения личности");
										else {
											let docDate = moment(this.contract.CONTRACT_INFORMATION.DATE, "DD.MM.YYYY");
											let fizDocDate = moment(this.contract.PERSON.IDENTITY_DOCUMENT.DATE, "DD.MM.YYYY");
											if (fizDocDate.isAfter(docDate) && !fizDocDate.isSame(docDate)) err.push("Дата выдачи документа не может быть больше даты заключения договора");
								        }
										if (!this.toolbox.ifIssetString(this.contract.PERSON.IDENTITY_DOCUMENT.SERIES)) err.push('Вы должны указать серию удостоверения личности');
										if (!this.toolbox.ifIssetString(this.contract.PERSON.IDENTITY_DOCUMENT.NUMBER)) err.push('Вы должны указать номер удостоверения личности');
									} 

									if (typeOther2.indexOf(this.contract.PERSON.IDENTITY_DOCUMENT.TYPE_OTHER) !== -1) {
										if (!this.toolbox.ifIssetString(this.contract.PERSON.RESIDENCE_DOCUMENT.SERIES)) err.push('Вы не указали серию документа, подтверждающего право пребывания на территории РФ');
										if (!this.toolbox.ifIssetString(this.contract.PERSON.RESIDENCE_DOCUMENT.NUMBER)) err.push('Вы не указали номер документа, подтверждающего право пребывания на территории РФ');

										let date1 = moment(this.contract.PERSON.RESIDENCE_DOCUMENT.DATE_START, 'DD.MM.YYYY');
										if (!dateRegexp.test(this.contract.PERSON.RESIDENCE_DOCUMENT.DATE_START) || !date1.isValid()) err.push('Некорректная дата начала действия документа, подтверждающего право пребывания на территории РФ');
										let date2 = moment(this.contract.PERSON.RESIDENCE_DOCUMENT.DATE_END, 'DD.MM.YYYY');
										if (!dateRegexp.test(this.contract.PERSON.RESIDENCE_DOCUMENT.DATE_END) || !date2.isValid()) err.push('Некорректная дата окончания действия документа, подтверждающего право пребывания на территории РФ');
										if (date1.isAfter(date2) || date1.isSame(date2)) err.push('Дата окончания действия документа, подтверждающего право пребывания на территории РФ, не может быть меньше даты начала его действия или равным ему!');
										
										let docDate = moment(this.contract.CONTRACT_INFORMATION.DATE, "DD.MM.YYYY");
										if (date1.isAfter(docDate) && !date1.isSame(docDate)) err.push('Дата заключения договора не может быть меньше даты начала действия документа, подтверждающего право пребывания на территории РФ');
										if (docDate.isAfter(date2) || docDate.isSame(date2)) err.push('Дата заключения договора не может быть больше даты окончания действия документа, подтверждающего право пребывания на территории РФ или равным ему!');
									}
								}
							}
						}
					}
				}
			}


        } 


        
       	

        

		return err;
	}
}


// правила преобразовния содержимого документа к общему представлению контракта
const DOCUMENT_TO_CONTRACT = {
	AssignedDPCode: 'CONTRACT_INFORMATION.DP_CODE',
	ProfileCode: 'CONTRACT_INFORMATION.PROFILE_CODE',
	fs: 'CONTRACT_INFORMATION.FS',
	DocNum: 'CONTRACT_INFORMATION.COMPANY_NUM',
	OperatorNum: 'CONTRACT_INFORMATION.OPERATOR_NUM',
	unitid: 'CONTRACT_INFORMATION.UNIT',
	UnitUmData: 'CONTRACT_INFORMATION.UNIT_UM_DATA',
	DocCity: 'CONTRACT_INFORMATION.CITY',
	DocDate: 'CONTRACT_INFORMATION.DATE',
	DocDateJournal: 'CONTRACT_INFORMATION.JOURNAL_DATE',
	DocReg: 'CONTRACT_INFORMATION.REGION',
	DPCodeKind: 'CONTRACT_INFORMATION.DP_CODE_KIND',
	TypeComplect: 'CONTRACT_INFORMATION.TYPE_COMPLECT',
	SellerId: 'CONTRACT_INFORMATION.SELLER',
	Control: 'CONTRACT_INFORMATION.CONTROL',
	CreationType: 'CONTRACT_INFORMATION.CREATION_TYPE',
	customerId: 'CONTRACT_INFORMATION.CUSTOMER_ID',
	sbms_paccount: 'CONTRACT_INFORMATION.CUSTOMER_ACCOUNT_NUMBER',
	status: 'CONTRACT_INFORMATION.STATUS',

	MSISDN: 'CONTRACT_INFORMATION.SIM.MSISDN',
	ICC: 'CONTRACT_INFORMATION.SIM.ICC',
	ICCCTL: 'CONTRACT_INFORMATION.SIM.ICCCTL',
	PlanID: 'CONTRACT_INFORMATION.SIM.PLAN.ID',
	PlanName: 'CONTRACT_INFORMATION.SIM.PLAN.NAME',
	Payment: 'CONTRACT_INFORMATION.SIM.PAYMENT',
	Day_Payment: 'CONTRACT_INFORMATION.SIM.PAYMENT',
	Comment: 'CONTRACT_INFORMATION.SIM.COMMENT',
	SecretWord: 'CONTRACT_INFORMATION.SIM.SECRET_WORD',

	LastName: 'PERSON.FNAME.LAST_NAME',
	FirstName: 'PERSON.FNAME.FIRST_NAME',
	SecondName: 'PERSON.FNAME.SECOND_NAME',
	Birth: 'PERSON.BIRTH.DATE',
	FizBirthPlace: 'PERSON.BIRTH.PLACE',
	Sex: 'PERSON.SEX',
	DocSphere: 'PERSON.SPHERE',
	DocClientType: 'PERSON.TYPE',
	FizDocType: 'PERSON.IDENTITY_DOCUMENT.TYPE',
	FizDocOtherDocTypes: 'PERSON.IDENTITY_DOCUMENT.TYPE_OTHER',
	
	FizDocDate: 'PERSON.IDENTITY_DOCUMENT.DATE',
	FizDocOrg: 'PERSON.IDENTITY_DOCUMENT.ORGANIZATION',
	FizDocOrgCode: 'PERSON.IDENTITY_DOCUMENT.ORGANIZATION_CODE',
	FizDocSeries: 'PERSON.IDENTITY_DOCUMENT.SERIES',
	FizDocNumber: 'PERSON.IDENTITY_DOCUMENT.NUMBER',
	FizDocExp: 'PERSON.IDENTITY_DOCUMENT.EXPIRES',
	FizDocScan: 'PERSON.IDENTITY_DOCUMENT.SCAN',

	FizDocTypeResidence: 'PERSON.RESIDENCE_DOCUMENT.TYPE',
	FizDocUnknownDoc: 'PERSON.RESIDENCE_DOCUMENT.TYPE_OTHER',
	FizDocResidenceDocSeries: 'PERSON.RESIDENCE_DOCUMENT.SERIES',
	FizDocResidenceDocNumber: 'PERSON.RESIDENCE_DOCUMENT.NUMBER',
	FizDocResidenceStart: 'PERSON.RESIDENCE_DOCUMENT.DATE_START',
	FizDocResidenceEnd: 'PERSON.RESIDENCE_DOCUMENT.DATE_END',


	Citizenship: 'PERSON.CITIZENSHIP',
	CitizenshipOther: 'PERSON.CITIZENSHIP_OTHER',
	FizDocCitizen: 'PERSON.CITIZENSHIP',
	FizDocCitizenOther: 'PERSON.CITIZENSHIP_OTHER',
	AddrZip: 'PERSON.ADDRESS.ZIP',
	AddrCountry: 'PERSON.ADDRESS.COUNTRY',
	AddrState: 'PERSON.ADDRESS.STATE',
	AddrRegion: 'PERSON.ADDRESS.REGION',
	AddrCity: 'PERSON.ADDRESS.CITY',
	AddrStreet: 'PERSON.ADDRESS.STREET',
	AddrHouse: 'PERSON.ADDRESS.HOUSE',
	AddrBuilding: 'PERSON.ADDRESS.BUILDING',
	AddrApartment: 'PERSON.ADDRESS.APARTMENT',

	ResidenceAddrZip: 'PERSON.RESIDENCE_ADDRESS.ZIP',
	ResidenceAddrCountry: 'PERSON.RESIDENCE_ADDRESS.COUNTRY',
	ResidenceAddrState: 'PERSON.RESIDENCE_ADDRESS.STATE',
	ResidenceAddrRegion: 'PERSON.RESIDENCE_ADDRESS.REGION',
	ResidenceAddrCity: 'PERSON.RESIDENCE_ADDRESS.CITY',
	ResidenceAddrStreet: 'PERSON.RESIDENCE_ADDRESS.STREET',
	ResidenceAddrHouse: 'PERSON.RESIDENCE_ADDRESS.HOUSE',
	ResidenceAddrBuilding: 'PERSON.RESIDENCE_ADDRESS.BUILDING',
	ResidenceAddrApartment: 'PERSON.RESIDENCE_ADDRESS.APARTMENT',
	ContactsMail: 'PERSON.CONTACTS.MAIL',
	AddrPhone: 'PERSON.CONTACTS.PHONE',
	ContactsFax: 'PERSON.CONTACTS.FAX',
	FizInn: 'PERSON.INN',

	DeliveryType: 'DELIVERY.TYPE',
	DeliveryComment: 'DELIVERY.COMMENT',
	DeliveryZip: 'DELIVERY.ADDRESS.ZIP',
	DeliveryCountry: 'DELIVERY.ADDRESS.COUNTRY',
	DeliveryState: 'DELIVERY.ADDRESS.STATE',
	DeliveryRegion: 'DELIVERY.ADDRESS.REGION',
	DeliveryCity: 'DELIVERY.ADDRESS.CITY',
	DeliveryStreet: 'DELIVERY.ADDRESS.STREET',
	DeliveryHouse: 'DELIVERY.ADDRESS.HOUSE',
	DeliveryBuilding: 'DELIVERY.ADDRESS.BUILDING',
	DeliveryApartment: 'DELIVERY.ADDRESS.APARTMENT',
	DeliveryLastName: 'DELIVERY.PERSON.LAST_NAME',
	DeliveryFirstName: 'DELIVERY.PERSON.FIRST_NAME',
	DeliverySecondName: 'DELIVERY.PERSON.SECOND_NAME',
	DeliveryContactsMail: 'DELIVERY.PERSON.CONTACTS.MAIL',
	DeliveryContactsPhone: 'DELIVERY.PERSON.CONTACTS.PHONE',
	DeliveryContactsFax: 'DELIVERY.PERSON.CONTACTS.FAX',
}
// Общее представление контракта
const FIELDS = {
	CONTRACT_INFORMATION: {
		ID: null,
		DOCID: null,
		PROFILE_CODE: null, // профиль отправки
		FS: null, // фирменный салон зарегистрировал сим или нет
		COMPANY_NUM: null, // номер договора по компании н-телеком
		OPERATOR_NUM: null, // номер договора у оператора
		UNIT: null, // отделение, на которое заполнен договор,
		UNIT_UM_DATA: null, // отделение, на которое была отписана sim перед заполнением договора
		CITY: null, // город подписания договора
		DATE: null, // дата документа
		JOURNAL_DATE: null, // дата документа в журнале
		REGION: null, // регион регистрации
		DP_CODE: null, // код точки продаж
		DP_CODE_KIND: null, // тип кода точки продаж (П или НП)
		TYPE_COMPLECT: null, // тип комплекта(статика, динамика)
		SELLER: null, //код продавца
		CONTROL: null, // контроль
		CREATION_TYPE: null, // тип создания документа (вручную или автоматически - автодок)
		CUSTOMER_ID: null, // пользовательский id 
		CUSTOMER_ACCOUNT_NUMBER: null, // номер счета клиента
		ORIGINAL_DOCUMENT_SCAN: null, // скан контракта,
		STATUS: null, // статус договора
		SIM: {
			MSISDN: null,
			ICC: null,
			ICCCTL: null,
			PLAN: {
				ID: null,
				NAME: null
			},
			PAYMENT: null,
			DAY_PAYMENT: null,
			COMMENT: null,
			SECRET_WORD: null,
			TYPE: null, // тип сим-карты
			BALANCE: null
		},
	},
	PERSON: {
		FNAME: {
			LAST_NAME: null,
			FIRST_NAME: null,
			SECOND_NAME: null
		},
		BIRTH: { 
			DATE: null,
			PLACE: null
		},
		SEX: null, // пол
		SPHERE: null, // сфера деятельности
		TYPE: null, // частное ли лицо
		IDENTITY_DOCUMENT: {
			TYPE: null,
			TYPE_OTHER: null,
			DATE: null,
			ORGANIZATION: null,
			ORGANIZATION_CODE: null,
			SERIES: null,
			NUMBER: null,
			EXPIRES: null,
			SCAN: null
		},
		RESIDENCE_DOCUMENT: { // документ, подтверждающий право на пребывание в РФ
			TYPE: null,
			TYPE_OTHER: null,
			SERIES: null,	
			NUMBER: null,
			DATE_START: null,
			DATE_END: null
		},
		CITIZENSHIP: null, // гражданство
		CITIZENSHIP_OTHER: null, // гражданство другое
		//FIZDOCCITIZEN: null, // гражданство (к сож поле для yota задублировано)
		//FIZDOCCITIZEN_OTHER: null, // гражданство другое для yota
		ADDRESS: { // адрес проживания
			ZIP: null,
			COUNTRY: null,
			STATE: null,
			REGION: null,
			CITY: null,
			STREET: null,
			HOUSE: null,
			BUILDING: null,
			APARTMENT: null
		},
		RESIDENCE_ADDRESS: { // адрес пребывания
			ZIP: null,
			COUNTRY: null,
			STATE: null,
			REGION: null,
			CITY: null,
			STREET: null,
			HOUSE: null,
			BUILDING: null,
			APARTMENT: null
		},
		CONTACTS: { // контакты
			MAIL: null,
			PHONE: null,
			FAX: null
		},
		INN: null,	
	},
	DELIVERY: { // доставка
		TYPE: null, // тип
		COMMENT: null, // комментарий
		ADDRESS: { // адрес доставки
			ZIP: null,
			COUNTRY: null,
			STATE: null,
			REGION: null,
			CITY: null,
			STREET: null,
			HOUSE: null,
			BUILDING: null,
			APARTMENT: null
		},
		PERSON: {
			FNAME: {
				LAST_NAME: null,
				FIRST_NAME: null,
				SECOND_NAME: null
			},
			CONTACTS: { // контакты
				MAIL: null,
				PHONE: null,
				FAX: null
			}
		}
	},
	SERVICES: { // особые условия

	}
}
// Обязательные поля в общем представлении контракта
const RULES = [
	{field: 'DOCUMENT.DP_CODE', rules: {opers:[], required: false}},
	{field: 'DOCUMENT.PROFILE_CODE', rules: {opers:[], required: true}},
	{field: 'DOCUMENT.FS', rules: {opers:[], required: false}},
	{field: 'DOCUMENT.COMPANY_NUM', rules: {opers:[], required: false}},
	{field: 'DOCUMENT.OPERATOR_NUM', rules: {opers:[], required: false}},
	// {field: 'DOCUMENT.UNIT', rules: {opers:['yota', 'mts', 'megafon', 'beeline'], required: true, patterns: ['^[0-9]+$']}, type: 'dict', table: 'units'},
	// {field: 'DOCUMENT.UNIT_UM_DATA', rules: {opers:['yota', 'mts', 'megafon', 'beeline'], required: true, patterns: ['^[0-9]+$']}, type: 'dict', table: 'units'},
	{field: 'DOCUMENT.UNIT', rules: {opers:['yota', 'mts', 'megafon', 'beeline'], required: false, patterns: ['^[0-9]+$']}},
	{field: 'DOCUMENT.UNIT_UM_DATA', rules: {opers:['yota', 'mts', 'megafon', 'beeline'], required: false, patterns: ['^[0-9]+$']}},
	{field: 'DOCUMENT.CITY', rules: {opers:[], required: false}},
	{field: 'DOCUMENT.DATE', rules: {opers:['yota'], required: true, patterns: ['^(\\d{2}).(\\d{2}).(\\d{4})$']}},
	{field: 'DOCUMENT.JOURNAL_DATE', rules: {opers:['yota'], required: true, patterns: ['^(\\d{2}).(\\d{2}).(\\d{4})$']}},
	{field: 'DOCUMENT.REGION', rules: {opers:['yota'], required: false}},
	{field: 'DOCUMENT.DP_CODE_KIND', rules: {opers:[], required: false}},
	{field: 'DOCUMENT.TYPE_COMPLECT', rules: {opers:[], required: false}},
	{field: 'DOCUMENT.SELLER', rules: {opers:['yota'], required: false}},
	{field: 'DOCUMENT.CONTROL', rules: {opers:[], required: false}},
	// {field: 'DOCUMENT.CREATION_TYPE', rules: {opers:['yota'], required: false}, type: 'dict', table: 'creationTypes'},
	{field: 'DOCUMENT.CREATION_TYPE', rules: {opers:['yota'], required: false}},
	{field: 'DOCUMENT.CUSTOMER_ID', rules: {opers:[], required: false}},
	{field: 'DOCUMENT.CUSTOMER_ACCOUNT_NUMBER', rules: {opers:[], required: false}},
	
	{field: 'SIM.MSISDN', rules: {opers:['mts', 'megafon', 'beeline'], required: true, individualPatterns: {mts: ['^\\d{10}$'], megafon: ['^\\d{10}$'], beeline: ['^\\d{10}$']}}},
	{field: 'SIM.ICC', rules: {opers:['yota', 'mts', 'megafon', 'beeline'], required: true, patterns: [], individualPatterns: {yota: ['^\\d{10}$'], mts: ['^\\d{19}$'], megafon: ['^\\d{17}$'], beeline: ['^\\d{17}$']}}},
	{field: 'SIM.ICCCTL', rules: {opers:['mts'], required: true, individualPatterns: {mts: ['^\\d{1}$']}}},
	{field: 'SIM.PLAN.ID', rules: {opers:['yota'], required: false}},
	{field: 'SIM.PLAN.NAME', rules: {opers:['yota'], required: false}},
	{field: 'SIM.PAYMENT', rules: {opers:['yota'], required: false}},
	{field: 'SIM.DAY_PAYMENT', rules: {opers:['yota'], required: false}},
	{field: 'SIM.COMMENT', rules: {opers:[], required: false}},
	{field: 'SIM.SECRET_WORD', rules: {opers:[], required: false}},

	{field: 'PERSON.FNAME.LAST_NAME', rules: {opers:['yota'], required: true, patterns: ['^([\-\ а-яА-ЯёЁ]+)$']}},
	{field: 'PERSON.FNAME.FIRST_NAME', rules: {opers:['yota'], required: true, patterns: ['^([\-\ а-яА-ЯёЁ]+)$']}},
	{field: 'PERSON.FNAME.SECOND_NAME', rules: {opers:['yota'], required: false, patterns: ['^([\-\ а-яА-ЯёЁ]+)$']}},
	{field: 'PERSON.BIRTH.DATE', rules: {opers:['yota', 'mts', 'megafon', 'beeline'], required: true, patterns: ['^(\\d{2}).(\\d{2}).(\\d{4})$']}},
	{field: 'PERSON.BIRTH.PLACE', rules: {opers:['yota', 'mts', 'megafon', 'beeline'], required: true}},
	{field: 'PERSON.SEX', rules: {opers:[], required: false}, type: 'dict', table: 'genders'},
	// {field: 'PERSON.SPHERE', rules: {opers:[], required: false}, type: 'dict', table: 'spheres'},
	{field: 'PERSON.SPHERE', rules: {opers:[], required: false}},
	{field: 'PERSON.TYPE', rules: {opers:[], required: false}, type: 'dict', table: 'personTypes'},
	{field: 'PERSON.IDENTITY_DOCUMENT.TYPE', rules: {opers:[], required: false}, type: 'dict', table: 'docTypes'},
	{field: 'PERSON.IDENTITY_DOCUMENT.DATE', rules: {opers:['yota'], required: false, patterns: ['^(\\d{2}).(\\d{2}).(\\d{4})$']}},
	{field: 'PERSON.IDENTITY_DOCUMENT.ORGANIZATION', rules: {opers:['yota'], required: true, patterns: ['^([- а-яА-ЯёЁ.]+)$']}},
	{field: 'PERSON.IDENTITY_DOCUMENT.ORGANIZATION_CODE', rules: {opers:['yota'], required: true, patterns: ['^\\d{3}-\\d{3}$']}},
	{field: 'PERSON.IDENTITY_DOCUMENT.SERIES', rules: {opers:[], required: false}},
	{field: 'PERSON.IDENTITY_DOCUMENT.NUMBER', rules: {opers:[], required: false}},
	{field: 'PERSON.IDENTITY_DOCUMENT.EXPIRES', rules: {opers:['yota', 'mts', 'megafon', 'beeline'], required: false, patterns: ['^(\\d{2}).(\\d{2}).(\\d{4})$']}},
	{field: 'PERSON.IDENTITY_DOCUMENT.SCAN', rules: {opers:[], required: false}},
	{field: 'PERSON.CITIZENSHIP', rules: {opers:[], required: false}},
	{field: 'PERSON.CITIZENSHIP_OTHER', rules: {opers:[], required: false}},
	{field: 'PERSON.FIZDOCCITIZEN', rules: {opers:['yota'], required: false}},
	{field: 'PERSON.FIZDOCCITIZEN_OTHER', rules: {opers:['yota'], required: false}},
	{field: 'PERSON.ADDRESS.ZIP', rules: {opers:['yota'], required: true, patterns: ['^\\d{6}$']}},
	{field: 'PERSON.ADDRESS.COUNTRY', rules: {opers:[], required: false}},
	{field: 'PERSON.ADDRESS.STATE', rules: {opers:[], required: false}},
	{field: 'PERSON.ADDRESS.REGION', rules: {opers:[], required: false}},
	{field: 'PERSON.ADDRESS.CITY', rules: {opers:[], required: false}},
	{field: 'PERSON.ADDRESS.STREET', rules: {opers:[], required: false}},
	{field: 'PERSON.ADDRESS.HOUSE', rules: {opers:[], required: false}},
	{field: 'PERSON.ADDRESS.BUILDING', rules: {opers:[], required: false}},
	{field: 'PERSON.ADDRESS.APARTMENT', rules: {opers:[], required: false}},

	{field: 'PERSON.RESIDENCE_ADDRESS.ZIP', rules: {opers:[], required: false, patterns: ['^\\d{6}$']}},
	{field: 'PERSON.RESIDENCE_ADDRESS.COUNTRY', rules: {opers:[], required: false}},
	{field: 'PERSON.RESIDENCE_ADDRESS.STATE', rules: {opers:[], required: false}},
	{field: 'PERSON.RESIDENCE_ADDRESS.REGION', rules: {opers:[], required: false}},
	{field: 'PERSON.RESIDENCE_ADDRESS.CITY', rules: {opers:[], required: false}},
	{field: 'PERSON.RESIDENCE_ADDRESS.STREET', rules: {opers:[], required: false}},
	{field: 'PERSON.RESIDENCE_ADDRESS.HOUSE', rules: {opers:[], required: false}},
	{field: 'PERSON.RESIDENCE_ADDRESS.BUILDING', rules: {opers:[], required: false}},
	{field: 'PERSON.RESIDENCE_ADDRESS.APARTMENT', rules: {opers:[], required: false}},
	{field: 'PERSON.CONTACTS.MAIL', rules: {opers:['yota'], required: false, patterns: ["^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"]}},
	{field: 'PERSON.CONTACTS.PHONE', rules: {opers:[], required: false}},
	{field: 'PERSON.CONTACTS.FAX', rules: {opers:[], required: false}},
	{field: 'PERSON.INN', rules: {opers:[], required: false}},

	{field: 'DELIVERY.TYPE', rules: {opers:[], required: false}},
	{field: 'DELIVERY.COMMENT', rules: {opers:[], required: false}},
	{field: 'DELIVERY.ADDRESS.ZIP', rules: {opers:[], required: false, patterns: ['^\\d{6}$']}},
	{field: 'DELIVERY.ADDRESS.COUNTRY', rules: {opers:[], required: false}},
	{field: 'DELIVERY.ADDRESS.STATE', rules: {opers:[], required: false}},
	{field: 'DELIVERY.ADDRESS.REGION', rules: {opers:[], required: false}},
	{field: 'DELIVERY.ADDRESS.CITY', rules: {opers:[], required: false}},
	{field: 'DELIVERY.ADDRESS.STREET', rules: {opers:[], required: false}},
	{field: 'DELIVERY.ADDRESS.HOUSE', rules: {opers:[], required: false}},
	{field: 'DELIVERY.ADDRESS.BUILDING', rules: {opers:[], required: false}},
	{field: 'DELIVERY.ADDRESS.APARTMENT', rules: {opers:[], required: false}},
	{field: 'DELIVERY.PERSON.LAST_NAME', rules: {opers:[], required: false}},
	{field: 'DELIVERY.PERSON.FIRST_NAME', rules: {opers:[], required: false}},
	{field: 'DELIVERY.PERSON.SECOND_NAME', rules: {opers:[], required: false}},
	{field: 'DELIVERY.PERSON.CONTACTS.MAIL', rules: {opers:['yota'], required: false, patterns: ["^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"]}},
	{field: 'DELIVERY.PERSON.CONTACTS.PHONE', rules: {opers:[], required: false}},
	{field: 'DELIVERY.PERSON.CONTACTS.FAX', rules: {opers:[], required: false}}
]
// правила преобразования полей документа к общему представлению контракта
const OPERATOR_TO_CONTRACT = {
	YOTA: {
		FizDocType: { // dex_dict_doctypes
			passport_rf: 1,
			passport_inostr: 2,
			other: 16
		},
		DocReg: { // dex_kladr_regions
			'0100000000000': '79',
			'0500000000000': '82',
			'0600000000000': '26',
			'0700000000000': '83',
			'0800000000000': '85',
			'0900000000000': '91',
			'2300000000000': '03',
			'6100000000000': '60',
			'1500000000000': '90',
			'2600000000000': '07',
			'2000000000000': '96',
		},
		// AddrCountry: { //  dex_dict_countries
		// 	'293': '147'
		// },
	},
	MEGAFON: {
		FizDocType: { // dex_dict_doctypes
			1: 1,
			22: 2,
		},
		Sex: {
			0: 0,
			1: 1,
			2: 2
		},
		// AddrCountry: {
		// 	1: '147'
		// }

	},
	MTS: {},
	BEELINE: {}
}
// правила преобразования полей контракта к виду, который можно использовать для того, чтобы отправить данные оператору
const CONTRACT_TO_OPERATOR = {
	YOTA: {
		'DOCUMENT.REGION': {
			'79': '0100000000000',
			'82': '0500000000000',
			'26': '0600000000000',
			'83': '0700000000000',
			'85': '0800000000000',
			'91': '0900000000000',
			'03': '2300000000000',
			'60': '6100000000000',
			'90': '1500000000000',
			'07': '2600000000000',
			'96': '2000000000000',
		},
		'PERSON.IDENTITY_DOCUMENT.TYPE': {
			'1': 'passport_rf',
			'2': 'passport_inostr',
			'16': 'other'
		}
	},
	MEGAFON: {
		'PERSON.IDENTITY_DOCUMENT.TYPE': {
			1: 1,
			2: 22
		},
		'PERSON.SEX': {
			0: 0,
			1: 1,
			2: 2
		},
		'PERSON.ADDRESS.COUNTRY': {
			147: 1
		}
	},
	MTS: {},
	BEELINE: {}
}
const CONTRACTS_ID = [
	{	vendor: 'YOTA', 
		id: 'DEXPlugin.Document.Yota.Contract'
	},
	{	vendor: 'BEELINE', 
		id: 'DEXPlugin.Document.Beeline.DOL2.Contract'
	},
	{	vendor: 'MEGAFON',
		id: 'DEXPlugin.Document.Mega.EFD.Fiz'
	},
	{	vendor: 'MTS', 
		id: 'DEXPlugin.Document.MTS.Jeans'
	}
]
// const CONTRACTS_ID = [
// 	{	operator: 'yota', 
// 		id: 'DEXPlugin.Document.Yota.Contract'
// 	},
// 	{	operator: 'beeline', 
// 		id: 'DEXPlugin.Document.Beeline.DOL2.Contract'
// 	},
// 	{	operator: 'megafon',
// 		id: 'DEXPlugin.Document.Mega.EFD.Fiz'
// 	},
// 	{	operator: 'mts', 
// 		id: 'DEXPlugin.Document.MTS.Jeans'
// 	}
// ]
const registrationErrors = {
	YOTA: {
		contract_number: {
            value: "ICC",
            errsEn: ["Contract exists same client", "Contract exists"],
            errsRu: ["контракт на этот ICC уже существует", "контракт существует"]
        },
        first_name: {
            value: "Имя",
            errsEn: ["Required field"],
            errsRu: ["обязательно для заполнения"]
        },
        last_name: {
            value: "Фамилия",
            errsEn: ["Required field"],
            errsRu: ["обязательно для заполнения"]
        },
        middle_name: {
            value: "Отчество",
            errsEn: ["Required field"],
            errsRu: ["обязательно для заполнения"]
        },
        contact_phone: {
            value: "Контактный телефон",
            errsEn: ["The phone must be in the form +7(xxx) xxx-xxxx"],
            errsRu: ["должен быть в формате +7(xxx) xxx-xxxx"]
        },
        document_type: {
            value: "Тип документа удостоверяющего личность",
            errsEn: ["Required field", "Unknown document type"],
            errsRu: ["обязательно для заполнения", "неизвестный тип документа"]
        },
        document_range: {
            value: "Документ удостоверяющй личность(серия документа)",
            errsEn: ["Required field"],
            errsRu: ["обязательно для заполнения"]
        },
        document_number: {
            value: "Документ удостоверяющй личность(номер документа)",
            errsEn: ["Required field"],
            errsRu: ["обязательно для заполнения"]
        }, 
        document_issue_date: {
            value: "Дата выдачи документа удостоверяющего личность",
            errsEn: ["Required field"],
            errsRu: ["обязательно для заполнения"]
        },
        birth_date: {
            value: "Дата рождения",
            errsEn: ["Required field"],
            errsRu: ["обязательно для заполнения"]
        },
        birth_place: {
            value: "Место рождения",
            errsEn: ["Required field"],
            errsRu: ["обязательно для заполнения"]
        },
        address: {
            value: "Адрес регистрации",
            errsEn: ["Required field"],
            errsRu: ["обязательно для заполнения"]
        },
        sign_date: {
            value: "Дата заключения договора",
            errsEn: ["Required field"],
            errsRu: ["обязательно для заполнения"]
        },
        yotateam_user_id: {
            value: "Код продавца",
            errsEn: ["Required field"],
            errsRu: ["обязательно для заполнения"]
        },
        document_issued_by: {
            value: "Код подразделения",
            errsEn: ["Required field"],
            errsRu: ["обязательно для заполнения"]
        },
        registration_region: {
            value: "Регион подключения",
            errsEn: ["Required field"],
            errsRu: ["обязательно для заполнения"]
        }
	}
}
module.exports = Contract;