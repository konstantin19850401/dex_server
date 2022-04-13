// МОДУЛИ
const fs = require('fs');
const xml2js = require('xml2js');
const qs = require("querystring");
const url = require('url');
const request = require('request');
const soap = require('strong-soap').soap;
const dateFormat = require('dateformat');
const moment = require('moment');
const bwipjs = require('bwip-js');
const md5 = require('md5');

class Toolbox {
	constructor(connector) {
        this.connector = connector;
        this.DEXBASES = 'dex_bases';
    }
    set DICTIONARIES(dictionaries) {this.dictionaries = dictionaries;}
    // sql-запрос
    async sqlRequest(base, sql) {
        let that = this;
        // let cbase = that.base;
        // if (arguments.length == 2) cbase = base;
        return new Promise((resolve, reject)=> {
            that.connector.connect(base).getConnection((err, connection)=> {
                if (err) {
                    console.log(`Ошибка соединения с базой данных. База=> ${cbase}. Запрос ${sql}. Описание ошибки=> ${err}`);
                    resolve(null);
                } else {
                    //console.log(`успешно соединились с базой ${cbase}`);
                    connection.query(sql,  function(error, result, fields) {
                        if (error) {
                            console.log("ошибка запроса mysql ", error);
                        }
                        connection.release();
                        resolve(result);
                    })
                }
            })
        });
    }
    // soap запрос
    async soapRequest(url, data) {
        return new Promise((resolve, reject)=> {
            let obj = {err: null, client: null};
            soap.createClient(url, data, function(err, client) {
                if (err) {
                    console.log("ошибка soap запроса ", err);
                    obj.err = err;
                } else obj.client = client;
                resolve(obj);
            })
        })
    }
    // soap. Работа с методом
    async soapMethodRequest(method, args) {
        return new Promise((resolve, reject)=> {
            let obj = {err: null, envelope: null, result: null}
            method(args, function(err, result, envelope, soapHeader) {
                if (err) {
                    console.log("ошибка запроса метода soap ", err);
                    obj.err = err;
                } else {
                    obj.envelope = envelope;
                    obj.result = result;
                }
                resolve(obj);
            })
        })
    }
    // http - запрос
    async request(data) {
        return new Promise((resolve, reject)=> {
            let obj = {err: null, body: null};
            request(data, function (err, res, body) {
                if (err) { 
                    obj.err = err;
                    obj.body = body;
                    console.log("ошибка request запроса ", err);
                } else obj.body = body;
                resolve(obj);
            })
        })
    }

    // хеширование строки
    getStringHash(string) {
        let hash = md5(string);
        return hash;
    }
    // проверка по списку террористов
    async checkTerroristsList(lastname, firstname, birthdate) {
        lastname = lastname.toUpperCase();
        firstname = firstname.toUpperCase();
        let lastFirstname = `${lastname} ${firstname}`;
        // явное совпадение фамилии, имени, даты рождения
        let row1 = await this.sqlRequest(this.DEXBASES, `SELECT * FROM terrorists WHERE firstname = '${firstname}' AND lastname = '${lastname}' AND birth = '${birthdate}'`);
        // примерное совпадение фамилии, имени, даты рождения
        let row2 = await this.sqlRequest(this.DEXBASES, `SELECT * FROM terrorists WHERE other_names LIKE '%${lastFirstname}%' AND birth = '${birthdate}'`);

        if (row1.length == 0 && row2.length == 0) {
            return false;
        } else {
            return true;
        }
    }
    // проверка по списку паспортных данных запрещенных для заполнения на уровне офиса
    async checkForbiddenPassports(series, number) {
        let row = await this.sqlRequest(this.DEXBASES, `SELECT * FROM forbiddenPassp WHERE passport = '${series}${number}' LIMIT 1`);
        if (row.length > 0) return true;
        else return false;
    }
    // проверка по списку подтвержденных ПД
    async checkByListOfConfirmed(person) {
        let err = [];
        let ser = person.IDENTITY_DOCUMENT.SERIES.replace(" ", "");
        let num = person.IDENTITY_DOCUMENT.NUMBER.replace(" ", "");
        let row = await this.sqlRequest(this.DEXBASES, `SELECT * FROM passp_autodoc WHERE dul = '${ser}${num}'`);
        if (row.length > 0) {
            let confirmedData = await this.xmlToJs(row[0].data);
            confirmedData.root['LastName'][0] = 'dsadd';
            let checkField = {'LastName':'LAST_NAME', 'FirstName':'FIRST_NAME', 'SecondName':'SECOND_NAME'};
            for (let key in checkField) {
                if (confirmedData.root[key][0] != person.FNAME[checkField[key]]) err.push(`Поле ${key} В договоре указано ${person.FNAME[checkField[key]]}, подтвержденных данных ${confirmedData.root[key][0]}`);
            }
            if (confirmedData.root.Birth[0] != person.BIRTH.DATE) err.push(`Поле Birth В договоре указано ${person.BIRTH.DATE}, подтвержденных данных ${confirmedData.root.Birth[0]}`)
            if (err.length > 0) err.unshift(`В процессе проверки по списку подтвержденных ПД для ПД с серией ${ser} и номером ${num} обнаружено несоответствие для полей: `);
        }
        return err;
    }
    // проверка по списку недействительных
    async ifExpiredPassport(identityDocument) {
        let err = false;
        // if (identityDocument.TYPE == 1) {
            let value = `${identityDocument.SERIES}${identityDocument.NUMBER}`;
            let row = await this.sqlRequest(this.DEXBASES, `SELECT COUNT(*) as total FROM expired_passports WHERE value='${value}'`);
            if (row[0].total > 0) err = true
            else err = false;
        // }
        return err;
    }   
    // проверка корректности заполнения полей договора
    async checkDocumentFields(contract, operator, requiredFields, contractToDocument) {
        console.log("fnames===> ", contractToDocument);
        let err = [];
        function parseObj(obj, arr) {
            let o = obj;
            for (let i=0; i<arr.length; i++) {
                if (o[arr[i]] != undefined) o = o[arr[i]];
                else { 
                    o = undefined;
                    break;
                };
            }
            return o;
        }
        for (let i=0; i<requiredFields.length; i++) {
            let current = requiredFields[i];
            let value = parseObj(contract, current.field.split('.'));
            if (current.rules.required == true && current.rules.opers.indexOf(operator) != -1) {
                let text = current.field;
                if (typeof contractToDocument !== 'undefined') {
                    if (typeof contractToDocument.ctd[text] !== 'undefined') text = typeof contractToDocument !== 'undefined' ? contractToDocument.enToRu[contractToDocument.ctd[text]] : contractToDocument.ctd[text];
                }
                if (value == undefined || value == '') err.push(`Поле ${text} обязательно для заполнения`);
            }
            if (value != undefined) {
                // проверим паттернами поля
                //console.log('current=>', current);
                if (current.rules.patterns) {
                    current.rules.patterns.forEach((pattern)=> {
                        let regexp = new RegExp(pattern);
                        if (!regexp.test(value)) { 
                            let text = current.field;
                            if (typeof contractToDocument !== 'undefined') {
                                if (typeof contractToDocument.ctd[text] !== 'undefined') text = typeof contractToDocument !== 'undefined' ? contractToDocument.enToRu[contractToDocument.ctd[text]] : contractToDocument.ctd[text];
                            }
                            err.push(`Поле ${text} заполнено с ошибками`);
                            return false;
                        }
                    })
                }
                if (current.rules.individualPatterns && current.rules.individualPatterns[operator]) {
                    current.rules.individualPatterns[operator].forEach((pattern)=> {
                        let regexp = new RegExp(pattern);
                        if (!regexp.test(value)) { 
                            let text = current.field;
                            if (typeof contractToDocument !== 'undefined') {
                                if (typeof contractToDocument.ctd[text] !== 'undefined') text = text = typeof contractToDocument !== 'undefined' ? contractToDocument.enToRu[contractToDocument.ctd[text]] : contractToDocument.ctd[text];
                            }
                            err.push(`Поле ${text} заполнено с ошибками`);
                            return false;
                        }
                    })
                }             
            }
        }
        return err;
    }
    // проверка на расхождение между серией и датой выдачи дул
    async checkSeriesByDate(person) { 
        let err = [];
        if (person.IDENTITY_DOCUMENT.TYPE == 1 || person.IDENTITY_DOCUMENT.TYPE == 'passport_rf') {
            let permissiblePeriod = 4;
            // console.log("====>" , this.moment(person.IDENTITY_DOCUMENT.DATE));
            let moment = this.getMoment();
            if (typeof moment(person.IDENTITY_DOCUMENT.DATE, "DD.MM.YYYY") !== 'undefined') {
                console.log("по идее");
                let date = this.stringToFormDate(person.IDENTITY_DOCUMENT.DATE, 'dd.mm.yyyy');
                let chDate = parseInt(date.year.substring(2,4));
                let chFds = parseInt(person.IDENTITY_DOCUMENT.SERIES.substring(2,4));
                if (chDate != chFds) {
                    if (chDate <= permissiblePeriod && 100 - chFds <= permissiblePeriod) chDate += 100;
                    else if (chFds <= permissiblePeriod && 100 - chDate <= permissiblePeriod) chFds += 100;
                }
                let langPeriod = "года";
                let l1 = [1];
                let l2 = [2,3,4,5,6,7,8,9];
                if (l2.indexOf(permissiblePeriod) != -1) langPeriod = "лет";
                if (Math.abs(chDate - chFds) > permissiblePeriod) {
                    err.push(`Вы ввели неверные данные для паспорта РФ. Разница между серией и годом выдачи более ${permissiblePeriod} ${langPeriod}`);
                }
            } else {
                err.push(`Дата выдачи документа имеет неверный формат.`);
            }
            
        }
        return err;
    }
    // комплексная проверка ДУЛ
    async checkIdentityDocumentFields(identityDocument) {
        let err = [];
        if (identityDocument.TYPE == 1) { // если паспорт РФ, то проверяем, если нет, то нафига
            let regexp = new RegExp('^\\d{4}$');
            if (!regexp.test(identityDocument.SERIES)) err.push('Серия паспорта РФ должна иметь вид xxxx и содержать только цифры');
            regexp = new RegExp('^\\d{6}$');
            if (!regexp.test(identityDocument.NUMBER)) err.push('Номер паспорта РФ должен иметь вид xxxxxx и содержать только цифры');
            regexp = new RegExp('^\\d{3}-\\d{3}$');
            if (!regexp.test(identityDocument.ORGANIZATION_CODE)) err.push('Код подразделения должен иметь вид xxx-xxx');
        }
        return err;
    }
    // проверка дат ДУЛ и документа
    async checkIdentityDocumentDates(contract, person) {
        let err = [];
        let identityDocDate = this.stringToFormDate(person.IDENTITY_DOCUMENT.DATE);
        let docDate = this.stringToFormDate(contract.DATE);
        let birthDate = this.stringToFormDate(person.BIRTH.DATE);
        if (parseInt(birthDate.year) > parseInt(identityDocDate.year)) err.push('Год рождения абонента не может быть больше года выдачи ДУЛ');
        if (parseInt(birthDate.year) > parseInt(docDate.year)) err.push('Год рождения абонента не может быть больше года заключения договора');
        if (parseInt(identityDocDate.year) > parseInt(docDate.year)) err.push('Год выдачи ДУЛ не может быть больше года заключения договора');
        return err; 
    }
    // проверка ДУЛ на устаревание
    async checkOutdatedIdentityDocument(contract, person) {
        let err = [];
        if (person.IDENTITY_DOCUMENT.TYPE == 1 || person.IDENTITY_DOCUMENT.TYPE === 'passport_rf') {
             try {
                // console.log("сделаем проверку паспорта");
                let arrBirth = person.BIRTH.DATE.split(".");
                let Birth = `${arrBirth[1]}/${arrBirth[0]}/${arrBirth[2]}`;
                let arrDocDate = person.IDENTITY_DOCUMENT.DATE.split(".");
                let DocDate = `${arrDocDate[1]}/${arrDocDate[0]}/${arrDocDate[2]}`;
                let arrCurrentDate = contract.DATE.split(".");
                let CurrentDate = `${arrCurrentDate[1]}/${arrCurrentDate[0]}/${arrCurrentDate[2]}`;

                let birthdate = moment(new Date(Birth));
                let fizDocDate = moment(new Date(DocDate));
                let currentDate = moment(new Date(CurrentDate));
                let replacementYears = [20,45,200];
                
                let diffCurDoc = currentDate.year() - fizDocDate.year();

                // проверки
                // if (currentDate.diff(birthdate, 'days') < 0) err.push(`Дата рождения не может быть больше текущей даты.`);
                // if (fizDocDate.diff(birthdate, 'days') < 0) err.push(`Дата рождения не может быть больше даты выдачи документа.`);
                // if (currentDate.diff(fizDocDate, 'days') < 0) err.push(`Дата выдачи документа не может быть больше текущей даты.`);
            
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
                        if (isNaN(diff)) {
                            err.push(`Что-то не так с разницей по периодам. Паспорт еще не просрочен. Прошло ${diff} дней`);
                            console.log(`Что-то не так с разницей по периодам. Паспорт еще не просрочен. Прошло ${diff} дней`);
                        } else console.log(`Паспорт еще не просрочен. Прошло ${diff} дней`);
                    }
                } else {
                    // console.log("ТЕСТ. С ПАСПОРТОМ ВСЕ НОРМ");
                }
            } catch (e) {
                console.log("Ошибка тестовой проверки ПД ", e);
                err.push(this.formatingExc(e))
            }
        }
        return err;
    }
    // проверка полей на соответствие их значений значениям справочников
    async checkDocumentFieldsByDictionaries(contract, requiredFields) {
        let err = [];
        function parseObj(obj, arr) {
            let o = obj;
            for (let i=0; i<arr.length; i++) {
                if (o[arr[i]] != undefined) o = o[arr[i]];
                else { 
                    o = undefined;
                    break;
                };
            }
            return o;
        }
        requiredFields.map((elem)=> {
            if (elem.type == 'dict') {
                if (this.dictionaries[elem.table][parseObj(contract, elem.field.split('.'))] == undefined) err.push(`Значение ключа для поля ${elem.field} отсутствует в справочнике`);
            }
        })
        return err;
    }
    // проверка на конфликтного абонента(делается только если метод создания - автоматически) // таблица forbiddenPassp
    async checkOnConflictingSubscriber(creationType, identityDocument) {
        let err = false;
        creationType = 0;
        if (creationType == 0) { // автоматически
            let row = await this.sqlRequest(this.DEXBASES, `SELECT * FROM forbiddenPassp WHERE passport='${identityDocument.SERIES}${identityDocument.NUMBER}'`);
            if (row.length > 0) err = true;
        }
        return err;
    }
    // проверка наличия скана ДУЛ если иностранец, так же проверит наличие ошибок с приложенными картинками
    async checkAttachedPictures(identityDocument, operator, base) {
        let err = [];
        // если не резидент РФ, то обязательно проверим приложен ли скан
        if (identityDocument.TYPE != 1) {
            let er = 'Для документов отличных от паспорта гражданина РФ, приложенная скан-капия ДУЛ обязательна.';
            if (identityDocument.SCAN == undefined || identityDocument.SCAN == '') err.push(er);
            else {
                let scans = identityDocument.SCAN.split(';');
                if (scans.length == 1 && scans[0] == '') err.push(er);
            }
        }
        // проверим все приложенные скан-копии документов на их физическое наличие
        let scansErr = [];
        if (identityDocument.SCAN != undefined && identityDocument.SCAN != '') {
            let scans = identityDocument.SCAN.split(';');
            scans.map((scan)=> {if (!fs.existsSync(`${__dirname}/scans/${operator}/${base}/${scan}`)) scansErr.push(scan);})
        }
        if (scansErr.length > 0) {
            let f = 'ия';
            let s = 'ет';
            if (scansErr.length > 1) {
                f = 'ии';
                s = 'ют'
            }
            err.push(`Скан-коп${f} ${scansErr.join(',')} отсутству${s} в хранилище`);
        } 
        return err;
    }
    async getDocumentStatuses() {
        let documentStatuses = {};
        let statuses = this.sqlRequest('skyline', `SELECT * FROM dict_doc_statuses WHERE status = '1'`);
        statuses.map((item)=> documentStatuses[item.eng] = item.uid);
        return documentStatuses;
    }

    // создание картинки штрих-кода
    async generateBarCode(code, text, includetext) {
        return new Promise((resolve, reject)=> {
            let obj = {
                bcid:        code,       // Barcode type
                text:        text,    // Text to encode
                scale:       3,               // 3x scaling factor
                height:      10,              // Bar height, in millimeters
                // includetext: true,            // Show human-readable text
                textxalign:  'center',        // Always good to set this
            }
            if (includetext) obj.includetext = true
            bwipjs.toBuffer(obj, function (err, png) {
                if (err) {
                    // `err` may be a string or Error object
                    console.log('err=>', err);
                } else {
                    resolve(png);
                }
            });
        })
    }
	// получение целого случайного числа с диапазоне от min до max
	random(min, max) {
		min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
	}
    // нормализация имени
    normName(name) {
        let str = name.toLowerCase();
        let newStr = str = str.substring(0, 1).toUpperCase() + str.substring(1, str.length);
        newStr = newStr.replace(/\s+/g, ' ').trim();
        // console.log("str=> ", str);
        //if (arr.indexOf($(this).attr('id')) != -1) {
            let splits = ['-', ' '];
            for (let j=0; j<splits.length; j++) {
                let strArr = newStr.split(splits[j]);
                let newS = [];
                for (let i=0; i<strArr.length; i++) {
                    let s = strArr[i].substring(0, 1).toUpperCase() + strArr[i].substring(1, strArr[i].length);
                    newS.push(s);
                }
                newStr = newS.join(splits[j]);
            }
        //}
        if (newStr != name) name = newStr;
        return name;
    }
    // получение хэш-значения
    getHash() {
        let lng = 10;
        var idstr=String.fromCharCode(Math.floor((Math.random()*25)+65));
        do {                
            var ascicode=Math.floor((Math.random()*42)+48);
            if (ascicode<58 || ascicode>64) idstr+=String.fromCharCode(ascicode);        
        } while (idstr.length<lng);
        return  idstr.toLowerCase();
    }
	// определение на каком языке написано слово. Возвращает результат в форме объекта типа {ru: 100, en: 0}, где ключ - язык, а значение процент языка в слове
    langByWord(word) {
        let langEn = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let langRu = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
        let countChars = word.length;
        let lang = {ru: 0, en: 0, word: word, errLang: 0};
        let charsArr = word.toUpperCase().split("");
        for (let i=0; i<charsArr.length; i++) {
            if (langEn.indexOf(charsArr[i]) != -1) lang.en++;
            else if (langRu.indexOf(charsArr[i]) != -1) lang.ru++;
            else lang.errLang++;
        }
        return lang;
    }
    // удалить все символы кроме букв русского и английского алфавита
    tgtrimm(str) {
        var ars = str.replace(/[^a-zA-ZА-Яа-яЁё]/gi,'').replace(/\s+/gi,', '); 
        return ars;
    }
    // получение base64 картинки. В качестве аргумента путь до картинки
    getBase64String(file) {
        // console.log("Получение BASE 64 путь =>", file);
        let that = this;
        return new Promise((resolve, reject)=> {
            try {
                if (!fs.existsSync(file)) {
                    // console.log("файл не существует!!!!");
                } else {
                    // console.log("файл для экспорта существует!!!");
                }
                // read binary data
                var bitmap = fs.readFileSync(file);
                // console.log("bitmap==>", bitmap);
                // convert binary data to base64 encoded string
                let str = new Buffer(bitmap).toString('base64');
                // console.log("str===>", str);
                // return str;
                resolve(str);
            } catch (e) {
                that.log.h("Критическая ошибка в процессе получения base64=>"+e);
                console.log("e==>"+ e);
                // return "";
                resolve("");
            }
        }) 
    }
    // парсинг xml в json
    async xmlToJs(str) {
        return new Promise((resolve, reject)=> {
            xml2js.parseString(str, function(err, obj) {
                if (err) console.log("ошибка парсинга xml==> ", err);
                resolve(obj);
            })
        })
    }
    getXml2js() {
        return xml2js;
    }
    // htmlspecialchars
    htmlspecialchars(str) {
        if (typeof(str) == "string") {
            str = str.replace(/&/g, "&amp;");
            str = str.replace(/"/g, "&#34;");
            str = str.replace(/'/g, "&#39;");
            str = str.replace(/</g, "<");
            str = str.replace(/>/g, ">");
        }
        return str;
    }
    // преобразование первого символа в строчный
    toUpperCaseFirst(value) {
        if (value.length > 0) return value.charAt(0).toUpperCase() + value.slice(1);
        else return value;
    }
    // форматирование передаваемого исключения
    formatingExc(e) {

        return {json: {type: e.name, description: e.message, stack: e.stack}, text: `Тип ошибки=> ${e.name}, Описание=> ${e.message}, Stack=> ${e.stack}`};
    }
    // парсинг get http запроса для api
    parsingGet(request) {
        let o = {};
        let r = qs.parse(url.parse(request.url).query);
        let packet = JSON.parse(r.packet);
        return packet;
    }
    // сравнение дат на разность
    momentIfD1MoreD2(date1, date2) {
        return moment(date1).isAfter(date2);
    }
    // получение текущей даты
    moment(date) {
        try {
            // console.log("date=>>> ", Date(date))
            if (Date(date)) return moment(date);
            else return moment();
        } catch (e) {
            return undefined;
        }     
    }
    getMoment() {
        return moment;
    }
    // применение к дате методов moment js
    momentMethodsAddDay(date, countDay) {
        return moment(date).add(countDay, 'day');
    }
    // 
    //парсинг ответа при запросе через метод requst
    parseBody(data) {
        let obj = {};
        obj.status = true;
        obj.message = "";
        obj.developerMessage = "";
        try {
            let ans = JSON.parse(data);
            if (ans.errorCode) {
                console.log("internalErrors =====>",ans.internalErrors);
                obj.status = false;
                obj.message = ans.userMessage;
                obj.developerMessage = ans.internalErrors[0].developerMessage;
            }
        } catch (e) {
            console.log("e==============>", e);
            obj.status = false;
            obj.data = data;
        }
        return obj;
    }
    stringToFormDate(string, format) {
        let date = {day: '', month: '', year: ''};
        if (format == 'dd.mm.yyyy' || typeof format === 'undefined') { 
            let arr = string.split('.');
            date.day = arr[0];
            date.month = arr[1];
            date.year = arr[2];
        }   
        return date;
    }
    //чо за ппц????
    // dateFormat(date, format) {
    //     return dateFormat(date, format);
    // }
    phoneFormating(phone) {

        return `+7(${phone.substring(0,3)}) ${phone.substring(3,6)}-${phone.substring(6,10)}`;
    }
    addressFormating(address) {
        let fullAddress = [];
        if (address.STATE != undefined && address.STATE != "") fullAddress.push(address.STATE);
        if (address.CITY != undefined && address.CITY != "") fullAddress.push(address.CITY);
        if (address.REGION != undefined && address.REGION != "") fullAddress.push(address.REGION);
        if (address.STREET != undefined && address.STREET != "") fullAddress.push(address.STREET);
        if (address.HOUSE != undefined && address.HOUSE != "") fullAddress.push("д. " + address.HOUSE);
        if (address.BUILDING != undefined && address.BUILDING != "") fullAddress.push("к. "+ address.BUILDING);
        if (address.APARTMENT != undefined && address.APARTMENT != "") fullAddress.push("кв. " + address.APARTMENT);
        fullAddress = fullAddress.join(",");
        return fullAddress;
    }
    fsReadFileSync(path) {
        return fs.readFileSync(path);
    }
    ifIssetString(str) {
        if (typeof str === 'undefined' || str === '') return false;
        else return true;
    }
}

module.exports = Toolbox;