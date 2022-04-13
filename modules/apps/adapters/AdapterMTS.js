'use strict'
// КЛАССЫ
let Adapter = require('./Adapter');
let Api = new (require('./AdapterMTSApi'))();
let Contract = require('./Contract');

class AdapterMTS extends Adapter {
	constructor(obj) {
		super(obj);
        that = this;
        this.dicts = [];
        this.docid = 'DEXPlugin.Document.MTS.Jeans';
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
            // profiles: `${ this.base }.yota_profiles`,
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
	async exportContractToMTSV1(row) {
        try {
            let docStatus = this.DOCUMENT_RETURNED;
        	let contract = new Contract(await this.toolbox.xmlToJs(row.data), this.toolbox, this.base, this.dictionaries);
        	let document = contract.mts;
        	console.log('document=> ', document);
            let icc = document.SIM.ICC;
            let msisdn = document.SIM.MSISDN;;
            let errors = await contract.errors();
            if (errors.length > 0) {
                errors.unshift(`${icc} Во время валидации документа были обнаружены ошибки: `);
                await this.printMessage(errors.join('\n'), row.id, docStatus);
                return false;
            } else {
                
            }
        } catch (e) {
            console.log('e=>', e);
        	this.printMessage(`Критическая ошибка в процессе регистрации договора ${this.toolbox.formatingExc(e).text}`)
        	return false;
        }
    }
	async exportContractToOperator(row) {

        return await this.exportContractToMTSV1(row);
    }
    async apiCommands(packet, user) {
        // if (Api[packet.data.action] != undefined) return await Api[packet.data.action](packet, this.toolbox, this.base, user, this);
        if (Api[packet.data.action] != undefined) return await Api[packet.data.action](packet, this.toolbox, this.base, user, this, this.getSchemas, this.dicts);
        else return {err: 'Такого метода не существует'};
    }
    // apiGetCommands(req, res) {
    //     let packet = that.toolbox.parsingGet(req);
    //     if (Api[packet.com] != undefined) Api[packet.com](req, res);
    //     else res.end('Такого метода не существует');
    // }
    get getSchemas() {
        let newSchemas = schemas;
        let dicts = {
            // 'PROFILE_CODE': `${this.base}.yota_profiles`,
            'FS': `skyline.dict_fs`,
            'UNIT': `skyline.dict_units`,
            'UNIT_UM_DATA': `skyline.dict_units`,
            // REGION: `skyline.`
            'CONTROL': `skyline.dict_controls`,
            'CREATION_TYPE': `skyline.dict_creation_types`,
            'PERSON.SEX': `skyline.dict_genders`,
            'PERSON.IDENTITY_DOCUMENT.TYPE': `${this.base}.mts_doctype`,
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
let schemas = {
    DOCUMENT: {
        CONTRACT_INFORMATION: {
            // PROFILE_CODE: {fname: "PROFILE_CODE", ftype: 'dict', ftitle: 'Профиль отправки', frequire: 0, fdocument: 'ProfileCode'},
            FS: {fname: "FS", ftype: 'dict', ftitle: 'Тип салона, которому отписана сим', frequire: 1, fdocument: 'fs'}, // сим для фирменного салона или нет
            // COMPANY_NUM: {ftype: 'text', ftitle: 'Номер договора в компании', frequire: 1}, // номер договора по компании н-телеком
            // OPERATOR_NUM: {ftype: 'text', ftitle: 'Номер договора по оператору', frequire: 1}, // номер договора у оператора
            UNIT: {fname: 'UNIT', ftype: 'dict', ftitle: 'Отделение, на которое заполнен договор', frequire: 1, fdocument: 'unitid'}, // отделение, на которое заполнен договор,
            // UNIT_UM_DATA: {ftype: 'dict', ftitle: 'Отделение, на которое заполнен договор', frequire: 1}, // отделение, на которое была отписана sim передж заполнением договора
            CITY: {fname: "CITY", ftype: 'text', ftitle: 'Город подписания договора', frequire: 1, fdocument: 'DocCity'}, // город подписания договора
            DATE: {fname: "DATE", ftype: 'date', ftitle: 'Дата документа', frequire: 1, fdocument: 'DocDate'}, // дата документа
            JOURNAL_DATE: {fname: "JOURNAL_DATE", ftype: 'date', ftitle: 'Дата документа в журнале', frequire: 1, fdocument: 'DocDateJournal'}, // дата документа в журнале
            // REGION: {ftype: 'dict', ftitle: 'Регион регистрации'}, // регион регистрации
            // SELLER: {fname: "SELLER", ftype: 'text', ftitle: 'Код продавца', frequire: 0, fdocument: 'SellerId'}, //код продавца
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
module.exports = AdapterMTS;