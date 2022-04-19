'use strict'
// КЛАССЫ
let Adapter = require('./Adapter');
// let Sim = require('./Sim');
let Api = new (require('./AdapterYotaApi'))();
let Contract = require('./Contract');

const moment = require("moment");

class AdapterYota extends Adapter {
    #core;
	constructor(obj, core) {
		super(obj);
        that = this;
        // setTimeout(()=> {
        //     that.chkPassport();
        // }, 3000);
        this.dicts = [];
        this.docid = 'DEXPlugin.Document.Yota.Contract';
        this.#core = core;
        setTimeout(()=> this.Init(), 2000);
	}
    get Dicts() {return this.dicts;};
    get DocId() {return this.docid;};
    Init() {
        this.InitDicts();
    }
    async InitDicts() {
        let globalBase = 'skyline';
        let d = {
            fs: `${ globalBase }.dict_fs`,
            genders: `${ globalBase }.dict_genders`,
            countries: `${ globalBase }.dict_countries`,
            regions: `${ globalBase }.dict_regions`,
            profiles: `${ this.base }.yota_profiles`,
            units: `${ globalBase }.dict_units`,
            dul_dicts: `${ globalBase }.dex_dict_doctypes`,
            statuses: `${ globalBase }.dict_doc_statuses`,
        }
        let onlyValues = {
            dul_dicts: ['0', '1', '2', '17', '16']
        }
        for ( let key in d ) {
            let arr = d[key].split('.');
            let base = arr[0];
            let table = arr[1];
            let rows = await this.toolbox.sqlRequest(base, `SELECT uid, title FROM ${ table } ORDER BY title`);
            if ( typeof onlyValues[key] !== 'undefined') {
                let newRows = [];
                for ( let i = 0; i < rows.length; i++ ) {
                    if ( onlyValues[key].indexOf( rows[i].uid ) != -1) newRows.push( rows[i] );
                }
                this.dicts.push( {name: key, data: newRows} );
            } else {
                if ( typeof rows !== 'undefined' && rows.length > 0 ) this.dicts.push( {name: key, data: rows} );
                else this.dicts.push( {name: key, data: []} );
            }
        }
    }

	async exportContractToYotaV1(row) {
        try {
            let docStatus = this.DOCUMENT_RETURNED;
        	let contract = new Contract(await this.toolbox.xmlToJs(row.data), this.toolbox, this.base, this.dictionaries);
        	let document = contract.yota;
        	console.log('document=> ', document);
            let icc = document.SIM.ICC;
            let errors = await contract.errors();
            if (errors.length > 0) {
                errors.unshift(`${icc} Во время валидации документа были обнаружены ошибки: `);
                await this.printMessage(errors.join('\n'), row.id, docStatus);
                return false;
            } else {
                let profileCode = document.DOCUMENT.PROFILE_CODE;
                if (!this.profiles[document.DOCUMENT.PROFILE_CODE]) {
                    await this.printMessage(`Данный профиль отправки отсутствует среди заведенных(профиль ${document.DOCUMENT.PROFILE_CODE}). Или он заблокирован.`, row.id, docStatus);
                    return false;
                } else {
                    let base64string = Buffer.from(this.profiles[profileCode].username+":"+this.profiles[profileCode].password).toString('base64');
                    let soapClient = await this.toolbox.soapRequest(this.api, {wsdl_headers: {"Authorization": `Basic ${base64string}`}});
                    if (soapClient.err != null) {
                        await this.printMessage(`${icc} ошибка soap-запроса ${soapClient.err}`, row.id, docStatus);
                        return false;
                    } else {
                        let method = soapClient.client["APIService"]["APIPort"]["registerContract"];
                        let client = soapClient.client;
                        client.addHttpHeader("Authorization", `Basic ${base64string}`);
                        let args = contract.toOperatorData();
                        console.log('=====>', args);
                        await this.printMessage(`${icc} данные документа ${JSON.stringify(args)}`);
                        let soapMethodResult = await this.toolbox.soapMethodRequest(method, args);
                        if (soapMethodResult.err != null) {
                            stringifyJsErrors = JSON.stringify(soapMethodResult.err);
                            await this.printMessage(`${icc} Критическая ошибка в процессе отправки договора. ${stringifyJsErrors}`, row.id, docStatus);
                            return false;
                        } else {
                            let soapToJs = soapMethodResult.result;
                            if (soapToJs.return.status["$value"] != "ok") {
                                let registrationErrors = contract.registrationErrors(soapToJs.return.fields_errors);
                                await this.printMessage(`${icc} Критическая ошибка в процессе отправки договора. ${JSON.stringify(registrationErrors)}`, row.id, docStatus);
                                return false;
                            } else {
                                docStatus = this.DOCUMENT_EXPORTED;
                                await this.printMessage(`Договор с ЛС ${icc} успешно помещен в Компанию`, row.id, docStatus);
                                let umDataRow = await this.toolbox.sqlRequest(this.base, `SELECT * FROM um_data WHERE icc = '${icc}'`);
                                if (umDataRow.length > 0) {
                                    await this.printMessage(`Запись обнаружена в справочнике сим-карт`);
                                    let comment = umDataRow[0].comment;
                                    if (umDataRow[0].owner_id != row.unitid) comment += `Предыдущий владелец: ${umDataRow[0].owner_id};\n`;
                                    if (comment != "") this.printMessage(`comment => ${comment}`);
                                    let jdocdate = row.jdocdate.substring(0,8);
                                    await this.toolbox.sqlRequest(this.base, `UPDATE um_data SET status='2', owner_id='${row.unitid}', date_sold='${jdocdate}', comment='${comment}' WHERE icc='${icc}'`);
                                    return true;
                                } else {
                                    let date = row.jdocdate.substring(0,8);
                                    await this.toolbox.sqlRequest(this.base, `INSERT INTO um_data SET status='2', icc='${icc}', date_in='${date}', owner_id='${row.unitid}', date_own='${date}', date_sold='${date}'`);
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.log('e=>', e);
        	this.printMessage(`Критическая ошибка в процессе регистрации договора ${this.toolbox.formatingExc(e).text}`)
        	return false;
        }
    }
	async exportContractToOperator(row) {

        return await this.exportContractToYotaV1(row);
    }
    async apiCommands(packet, user) {
        if (Api[packet.data.action] != undefined) return await Api[packet.data.action](packet, this.toolbox, this.base, user, this, this.getSchemas, this.dicts, this.#core);
        else return {err: 'Такого метода не существует'};
    }
    async doPeopleSearchHash(birth, lastName, firstName, secondName) {
        let obj = {err: [], list: []};
        let bth, ln = '', fn = '', sn= '';
        let moment = this.toolbox.getMoment();
        let date = moment(birth, "DD.MM.YYYY");
        if (!date.isValid()) obj.err.push('Вы не указали год рождения при поиске подходящих данных. Это обязательное поле');
        else {
            let arr = [];
            arr.push(`birth = '${this.toolbox.htmlspecialchars(birth)}'`);
            if (typeof lastName !== 'undefined' && lastName != '') arr.push(`lastname LIKE '${this.toolbox.htmlspecialchars(lastName)}'`);
            if (typeof firstName !== 'undefined' && firstName != '') arr.push(`firstname LIKE '${this.toolbox.htmlspecialchars(firstName)}'`);
            if (typeof secondName !== 'undefined' && secondName != '') arr.push(`secondname LIKE '${this.toolbox.htmlspecialchars(secondName)}'`);
            let query = arr.join(' AND ');
            let rows = await this.toolbox.sqlRequest(this.base, `SELECT phash FROM people WHERE ${query}`); 
            for (let i=0; i<rows.length; i++) obj.list.push(rows[i]);
        } 
        return obj;
    }
    // // получение всех отделений, на которые созданы документы за период
    // async getUnitsByPeriod(start, end) {
    //     let result = await this.toolbox.sqlRequest(this.base, `
    //         SELECT unitid FROM journal 
    //         WHERE jdocdate > '${start}000000000' AND jdocdate < '${end}235959999'
    //     `);
    //     let units = [];
    //     for (let i=0; i<result.length; i++) {
    //         if (units.indexOf(result[i].unitid) == -1) units.push(result[i].unitid);
    //     }
    //     return units;
    // }

    // проверка паспорта
    async chkPassport() {
        let err = [];
        // console.log("сделаем проверку паспорта");

        let birthdate = moment(new Date('03/02/1988'));
        let fizDocDate = moment(new Date('03/02/2005'));
        let currentDate = moment(new Date('05/15/2005'));
        let replacementYears = [20,45,200];
        
        let diffCurDoc = currentDate.year() - fizDocDate.year();

        // проверки
        if (currentDate.diff(birthdate, 'days') < 0) err.push(`Дата рождения не может быть больше текущей даты.`);
        if (fizDocDate.diff(birthdate, 'days') < 0) err.push(`Дата рождения не может быть больше даты выдачи документа.`);
        if (currentDate.diff(fizDocDate, 'days') < 0) err.push(`Дата выдачи документа не может быть больше текущей даты.`);
    
        // поверим, в каком периоде находится абонент
        let diffCurBth = currentDate.year() - birthdate.year();
        let periodMan = 0;
        for (let i=0; i<replacementYears.length; i++) {
            if (diffCurBth >= replacementYears[i]) {
                if (diffCurBth == replacementYears[i]) {
                    let n = moment(birthdate);
                    let ftr = n.add(diffCurBth, 'year');
                    if (currentDate.diff(ftr) > 0) {
                        periodMan++;
                    }
                } else periodMan++;
            }
        }
        // console.log("Период, к которому относится абонент ", periodMan);

        // теперь проверим, в каком периоде находится паспорт
        let diffDocBth = fizDocDate.year() - birthdate.year();
        let periodDoc = 0;
        for (let i=0; i<replacementYears.length; i++) {
            if (diffDocBth >= replacementYears[i]) {
                if (diffDocBth == replacementYears[i]) {
                    let n = moment(birthdate);
                    let ftr = n.add(diffDocBth, 'year');
                    if (fizDocDate.diff(ftr) > 0) {
                        periodDoc++;
                    }
                } else periodDoc++;
            } 
        }

        // console.log("Период, к которому относится паспорт ", periodDoc);

        // проверим, отличаются ли периоды
        if (periodDoc !== periodMan) {
            // так как есть отличие, то нужно проверить сколько дней разница
            let n = moment(birthdate);
            // console.log("birthdate.add(replacementYears[periodMan], 'year')=> ", n.add(replacementYears[periodMan-1], 'year'));
            let diff = currentDate.diff(n.add(replacementYears[periodMan-1], 'year'), 'days');
            if (diff > 27) {
                err.push(`Паспорт  просрочен на ${diff} дней`);
            } else {
                console.log(`Паспорт еще не просрочен. Прошло ${diff} дней`);
            }
        }


        
        if (replacementYears.indexOf(diffCurBth) != -1) {
            console.log('Год дата выдачи ДУЛ совпадает с годом, когда его нужно заменить');
            // тааааак, надо в этом году поменять паспорт
            if (birthdate.month() > birthdate.month()) {
                console.log("По идее рано еще паспорт менять");
            } else {
                if (currentDate.diff(fizDocDate, 'days') > 27) {
                    console.log("паспорт просрочен ", currentDate.diff(fizDocDate));
                } else {
                    console.log("не прошло еще 27 дней ", currentDate.diff(fizDocDate));
                }
            }
        }
        


        console.log("errrr=> ", err);
    }
    get getSchemas() {
        let newSchemas = schemas;
        let dicts = {
            'PROFILE_CODE': `${this.base}.yota_profiles`,
            'FS': `skyline.dict_fs`,
            'UNIT': `skyline.dict_units`,
            'UNIT_UM_DATA': `skyline.dict_units`,
            // REGION: `skyline.`
            'CONTROL': `skyline.dict_controls`,
            'CREATION_TYPE': `skyline.dict_creation_types`,
            'PERSON.SEX': `skyline.dict_genders`,
            'PERSON.IDENTITY_DOCUMENT.TYPE': `${this.base}.yota_document_type`,
            'PERSON.CITIZENSHIP': `skyline.dict_countries`,
            'PERSON.ADDRESS.COUNTRY': `skyline.dict_countries`
        }
        function parseObj(obj, k) {
            for (let key in obj) {
                if (typeof obj[key] === 'object') {
                    parseObj(obj[key], `${k}.${key}`);
                } else {
                    if (typeof obj.ftype !== 'undefined' && obj.ftype === 'dict') {
                        if (typeof dicts[k] !== 'undefined') { 
                            obj.dict = dicts[k];
                        }
                        break;
                    } 
                }
            }
        } 
        for (let key in newSchemas) {
            parseObj(newSchemas[key], key);
        }
        // console.log("newSchemas==> ", newSchemas);
        return newSchemas;
    }

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
/*
    параметры
    fname - название поля для документа
    ftype - тип поля (dict - справочник, text - строка, date - дата)
    ftitle - наименование поля для отображения
    frequire - обязательность поля (1 - да, 0 - нет, 2 - согласно правилам)
    fdocument - наименование поля в договоре,
    frules - правила, по которым работает поле
    flength - длина строки (min - минимальное значение, max - максимальное значение, fix - фиксированное значение)
    fdefValue - значение, которое будет установлено полю, если поле будет пустым
*/ 
let schemas = {
    DOCUMENT: {
        CONTRACT_INFORMATION: {
            PROFILE_CODE: {fname: "PROFILE_CODE", ftype: 'dict', ftitle: 'Профиль отправки', frequire: 0, fdocument: 'ProfileCode'},
            FS: {fname: "FS", ftype: 'dict', ftitle: 'Тип салона, которому отписана сим', frequire: 1, fdocument: 'fs'}, // сим для фирменного салона или нет
            // COMPANY_NUM: {ftype: 'text', ftitle: 'Номер договора в компании', frequire: 1}, // номер договора по компании н-телеком
            // OPERATOR_NUM: {ftype: 'text', ftitle: 'Номер договора по оператору', frequire: 1}, // номер договора у оператора
            UNIT: {fname: 'UNIT', ftype: 'dict', ftitle: 'Отделение, на которое заполнен договор', frequire: 1, fdocument: 'unitid'}, // отделение, на которое заполнен договор,
            // UNIT_UM_DATA: {ftype: 'dict', ftitle: 'Отделение, на которое заполнен договор', frequire: 1}, // отделение, на которое была отписана sim передж заполнением договора
            CITY: {fname: "CITY", ftype: 'text', ftitle: 'Город подписания договора', frequire: 1, fdocument: 'DocCity'}, // город подписания договора
            DATE: {fname: "DATE", ftype: 'date', ftitle: 'Дата документа', frequire: 1, fdocument: 'DocDate'}, // дата документа
            JOURNAL_DATE: {fname: "JOURNAL_DATE", ftype: 'date', ftitle: 'Дата документа в журнале', frequire: 1, fdocument: 'DocDateJournal'}, // дата документа в журнале
            // REGION: {ftype: 'dict', ftitle: 'Регион регистрации'}, // регион регистрации
            SELLER: {fname: "SELLER", ftype: 'text', ftitle: 'Код продавца', frequire: 0, fdocument: 'SellerId'}, //код продавца
            // CONTROL: {ftype: 'dict', ftitle: 'Контроль', frequire: 1, fdocument: 'Control'}, // контроль
            CREATION_TYPE: {fname: "CREATION_TYPE", ftype: 'dict', ftitle: 'Тип создания документа', frequire: 1, fdocument: 'CreationType'}, // тип создания документа (вручную или автоматически - автодок)
            // CUSTOMER_ID: {ftype: 'text', ftitle: 'Пользовательский ID', frequire: 1, fdocument: }, // пользовательский id 
            STATUS: {fname: "STATUS", ftype: 'dict', ftitle: 'Статус договора', frequire: 1, fdocument: 'status'},
            SIM: {
                ICC: {fname: "ICC", ftype: 'text', ftitle: 'ICC сим-карты', frequire: 1, fdocument: 'ICC', flength: {fix: 10}}
            },
        },
        PERSON: {
            FNAME: {
                LAST_NAME: {fname: "LAST_NAME", ftype: 'text', ftitle: 'Фамилия абонента', frequire: 1, fdocument: 'LastName', flength: {min: 1}},
                FIRST_NAME: {fname: "FIRST_NAME", ftype: 'text', ftitle: 'Имя абонента', frequire: 1, fdocument: 'FirstName', flength: {min: 1}},
                SECOND_NAME: {fname: "SECOND_NAME", ftype: 'text', ftitle: 'Отчество абонента', frequire: 0, fdocument: 'SecondName', fdefValue: 'Нет'}
            },
            BIRTH: { 
                DATE: {fname: "DATE", ftype: 'date', ftitle: 'Дата рождения абонента', frequire: 1, fdocument: 'Birth'},
                PLACE: {fname: "PLACE", ftype: 'text', ftitle: 'Место рождения абонента', frequire: 1, fdocument: 'FizBirthPlace'}
            },
            SEX: {fname: "SEX", ftype: 'dict', ftitle: 'Пол абонента', frequire: 1, fdocument: 'Sex'}, // пол
            IDENTITY_DOCUMENT: {
                TYPE: {fname: "TYPE", ftype: 'dict', ftitle: 'Тип документа', frequire: 1, fdocument: 'FizDocType'},
                TYPE_OTHER: {fname: "TYPE_OTHER", ftype: 'dict', ftitle: 'Тип документа - другой', frequire: 1, fdocument: 'FizDocOtherDocTypes'},
                DATE: {fname: "DATE", ftype: 'date', ftitle: 'Дата выдачи документа', frequire: 1, fdocument: 'FizDocDate'},
                ORGANIZATION: {fname: "ORGANIZATION", ftype: 'text', ftitle: 'Организация выдавшая удостоверение личности', frequire: 1, fdocument: 'FizDocOrg'},
                ORGANIZATION_CODE: {fname: "ORGANIZATION_CODE", ftype: 'text', ftitle: 'Код рганизации', frequire: 0, fdocument: 'FizDocOrgCode', frules: [
                    {fieldDependence: 'TYPE', valuesDependence: 'passport_rf', action: 'show', nonAction: 'hide'}
                ]},
                SERIES: {fname: "SERIES", ftype: 'text', ftitle: 'Серия удостоверения личности', frequire: 1, fdocument: 'FizDocSeries'},
                NUMBER: {fname: "NUMBER", ftype: 'text', ftitle: 'Номер удостоверения личности', frequire: 1, fdocument: 'FizDocNumber'},
                
                // SCAN: {ftype: 'text', ftitle: 'Скан-копия доукумента удостоверяющего личность', frequire: 0, fdocument: }
            },
            RESIDENCE_DOCUMENT: {
                TYPE: {fname: "TYPE", ftype: 'text', ftitle: 'Тип документа, подтверждающего право пребывания на территории РФ', frequire: 1, fdocument: 'FizDocTypeResidence'},
                TYPE_UNKNOWN_DOC: {fname: "TYPE_UNKNOWN_DOC", ftype: 'text', ftitle: 'Тип документа - неизвестный документ', frequire: 1, fdocument: 'FizDocUnknownDoc'},
                SERIES: {fname: "SERIES", ftype: 'text', ftitle: 'Серия документа, подтверждающего право пребывания на территории РФ', frequire: 1, fdocument: 'FizDocResidenceDocSeries'},
                NUMBER: {fname: "NUMBER", ftype: 'text', ftitle: 'Номер документа, подтверждающего право пребывания на территории РФ', frequire: 1, fdocument: 'FizDocResidenceDocNumber'},
                DATE_START: {fname: "DATE_START", ftype: 'date', ftitle: 'Дата действия документа с', frequire: 0, fdocument: 'FizDocResidenceStart'},
                DATE_END: {fname: "DATE_END", ftype: 'date', ftitle: 'Дата действия документа по', frequire: 0, fdocument: 'FizDocResidenceEnd'},
            },
            CITIZENSHIP: {fname: "CITIZENSHIP", ftype: 'dict', ftitle: 'Гражданство', frequire: 1, fdocument: 'FizDocCitizen'}, // гражданство
            CITIZENSHIP_OTHER: {fname: "CITIZENSHIP_OTHER", ftype: 'text', ftitle: 'Гражданство - другое', frequire: 0, fdocument: 'FizDocCitizenOther', frules: [
                {fieldDependence: 'CITIZENSHIP', valuesDependence: [253], action: 'show', nonAction: 'hide'}
            ]}, // гражданство другое
            ADDRESS: { // адрес проживания
                ZIP: {fname: "ZIP", ftype: 'text', ftitle: 'Индекс', frequire: 1, fdocument: 'AddrZip', flength: {fix: 5}},
                COUNTRY: {fname: "COUNTRY", ftype: 'dict', ftitle: 'Регистрация страна', frequire: 0, fdocument: 'AddrCountry'},
                STATE: {fname: "STATE", ftype: 'dict', ftitle: 'Регистрация область', frequire: 0, fdocument: 'AddrState'},
                REGION: {fname: "REGION", ftype: 'dict', ftitle: 'Регистрация район', frequire: 0, fdocument: 'AddrRegion'},
                CITY: {fname: "CITY", ftype: 'text', ftitle: 'Регистрация населенный пункт', frequire: 0, fdocument: 'AddrCity'},
                STREET: {fname: "STREET", ftype: 'text', ftitle: 'Регистрация улица', frequire: 0, fdocument: 'AddrStreet'},
                HOUSE: {fname: "HOUSE", ftype: 'text', ftitle: 'Регистрация дом', frequire: 1, fdocument: 'AddrHouse'},
                BUILDING: {fname: "BUILDING", ftype: 'text', ftitle: 'Регистрация строение', frequire: 0, fdocument: 'AddrBuilding'},
                APARTMENT: {fname: "APARTMENT", ftype: 'text', ftitle: 'Регистрация аппартаменты', frequire: 0, fdocument: 'AddrApartment'}
            },
            CONTACTS: { // контакты
                // MAIL: {ftype: 'text', ftitle: 'Электронная почта', frequire: 0, fdocument: },
                PHONE: {fname: "PHONE", ftype: 'text', ftitle: 'Контактный телефон', frequire: 0, fdocument: 'AddrPhone', flength: {fix: 10}},
            }
        }
    }
}
module.exports = AdapterYota;