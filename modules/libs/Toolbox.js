// МОДУЛИ
const fs = require('fs');
const xml2js = require('xml2js');
const qs = require("querystring");
const url = require('url');
const request = require('request');
const soap = require('strong-soap').soap;
const moment = require("moment");
const crypto = require('crypto-js');


class Toolbox {
    constructor() {
        this.Name = 'toolbox';
    }   
    get name() {return this.Name;}
    //sql-запрос
    async sqlRequest(connector, base, sql) {
        let that = this;
        // let cbase = that.base;
        // if (arguments.length == 2) cbase = base;
        return new Promise((resolve, reject)=> {
            connector.connect(base).getConnection((err, connection)=> {
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
     // получение уникального от времени хэш-значения
    generateUniqueHash() {
        return crypto.MD5((+new Date).toString()).toString();
    }
    // получение целого случайного числа с диапазоне от min до max
    random(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
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
    // получение хэш-значения
    getHash(leng) {
        let lng = typeof leng !== 'undefined' && typeof leng === 'number' ? leng : 10;
        var idstr=String.fromCharCode(Math.floor((Math.random()*25)+65));
        do {                
            var ascicode=Math.floor((Math.random()*42)+48);
            if (ascicode<58 || ascicode>64) idstr+=String.fromCharCode(ascicode);        
        } while (idstr.length<lng);
        return  idstr.toLowerCase();
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
        // console.log("request.url=> ", request.body);
        let o = {};
        let r = qs.parse(url.parse(request.url).query);
        let packet = JSON.parse(r.packet);
        return packet;
    }
    // парсинг put http запроса для api
    async parsingPut(request) {
        let packet = JSON.parse(request.body.packet);
        
        return packet;
    }
    
    // проверка пакета на соответствие значениям
    checkPacket(packet) {

    }
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
    // получение текущего времени
    getTime() {
        return new Date().getTime();
    }
    getMoment() {
        return moment;
    }
}

module.exports = Toolbox;