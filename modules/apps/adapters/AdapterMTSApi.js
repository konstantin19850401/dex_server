const fs = require('fs');
const PDFDocument = require('pdfkit');
const pdf2base64 = require('pdf-to-base64');

const pdfLib = require("pdf-lib");
const fontkit = require("fontkit");
// const codes = require('rescode');
// const bwipjs = require('bwip-js');
// const fetchUtils = require("fetch-utils");
// const fetch = require("node-fetch");

class AdapterMTSApi {
    #appid = "adapters";
    #operator = "MTS";
	constructor() {
		this.docid = 'DEXPlugin.Document.MTS.Jeans';
        // this.test();
	}
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

    async listV1( packet, toolbox, base, user, adapter, schemas, dicts, core ) {
        console.log(`запрос listV1 для appid = adapters `, packet);
        let obj = {status: -1, errs: [], list: []};
        let userConfiguration = this.#ValidateUser( user );
        if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
        else {
            if (typeof packet.data.subaction !== "undefined") {
                if (packet.data.subaction == "period") {
                    let start, end, search = "", units = [], statuses = [], table = "journal";
                    let tables = ["journal", "archive"];

                    if (typeof packet.data.filter === "undefined") {
                        start = toolbox.moment().format('YYYYMMDD');
                        end = start;
                        packet.data.filter = {};
                    } else {
                        if (typeof packet.data.filter.start !== "undefined") start = toolbox.moment(packet.data.filter.start, "YYYYMMDD");
                        else {
                            start = toolbox.moment();
                        }
                        console.log("start===> ", start);
                        if (!start.isValid())  start = toolbox.moment();
                        if (typeof packet.data.filter.end !== "undefined") end =  toolbox.moment(packet.data.filter.end, "YYYYMMDD");
                        else {
                            end = start;
                        }
                        if (!end.isValid()) end = start;
                        start = start.format("YYYYMMDD");
                        end = end.format("YYYYMMDD");
                        if (typeof packet.data.filter.units !== "undefined" && Array.isArray(packet.data.filter.units) && packet.data.filter.units.length > 0) units = packet.data.filter.units;
                        if (typeof packet.data.filter.status !== "undefined" && Array.isArray(packet.data.filter.status) && packet.data.filter.status.length > 0) statuses = packet.data.filter.statuses;
                        if (typeof packet.data.filter.search !== "undefined" && packet.data.filter.search != "")  search = packet.data.filter.search.toLowerCase();
                        if (typeof packet.data.filter.table !== "undefined") {
                            if (tables.indexOf(packet.data.filter.table) != -1) table = packet.data.filter.table;
                        }
                    }


                    // if (typeof packet.data.filter === "undefined" || typeof packet.data.filter.start === "undefined") {
                    //     start = toolbox.moment().format('YYYYMMDD');
                    //     end = start;
                    //     packet.data.filter = {};
                    // } else {
                    //     if (typeof packet.data.filter.start !== "undefined") start = toolbox.moment(packet.data.filter.start, "YYYYMMDD");
                    //     console.log("start===> ", start);
                    //     if (!start.isValid())  start = toolbox.moment().format('YYYYMMDD');
                    //     if (typeof packet.data.filter.end !== "undefined") end =  toolbox.moment(packet.data.filter.end, "YYYYMMDD");
                    //     if (!end.isValid()) end = start;
                    //     start = start.format("YYYYMMDD");
                    //     end = end.format("YYYYMMDD");
                    //     if (typeof packet.data.filter.units !== "undefined" && Array.isArray(packet.data.filter.units) && packet.data.filter.units.length > 0) units = packet.data.filter.units;
                    //     if (typeof packet.data.filter.status !== "undefined" && Array.isArray(packet.data.filter.status) && packet.data.filter.status.length > 0) statuses = packet.data.filter.statuses;
                        
                    // }
                   
                    obj.start = start; obj.end = end;
                    if (typeof packet.data.base !== "undefined") obj.base = packet.data.base;
                    else obj.errs.push("Вы не указали базу");


                    if (obj.errs.length == 0) {
                        // схема по умолчанию
                        let schema = [
                            {name: "id", len: 10, title: "ID", type: "number", unique: true },
                            {name: "status", len: 5, title: "Статус", type: "number", foreignKey: 'dex_document_statuses.uid', unique: false },
                            {name: "unitid", len: 10, title: "Отделение", type: "number", foreignKey: 'stores.dex_uid', unique: false },
                            {name: "digest", len: 100, title: "Описание", type: "string", unique: false },
                            // {name: "docid", len: 100, title: "Тип документа", type: "string", unique: false },
                            {name: "jdocdate", len: 100, title: "Дата документа", type: "date", unique: false }
                        ];
                        let schemaData = [];
                        let sqlRequest = "SELECT ";
                        let arr = [];
                        schema.map(item=> arr.push(item.name));
                        sqlRequest += arr.join(",");

                        let dicts = core.DictsByNamesV1(["dex_visible_fields", "dex_data_fields"]);
                        let dvf = dicts.find(item=> item.name == "dex_visible_fields");
                        let dex_fields = dicts.find(item=> item.name == "dex_data_fields");
                        let record = dvf.list.find(item=> item.author == user.UserId && item.operator == this.#operator);
                        // console.log("record=======> ", record);
                        if (typeof record !== "undefined") {
                            // console.log("record=> ", record);

                            sqlRequest += ",data";
                            arr = record.flds.split(",");
                            for (let i = 0; i < arr.length; i++) {
                                let sc = {name: arr[i], len: 100, title: arr[i], type: "string", unique: true};
                                let tle = dex_fields.list.find(item=> item.uid == arr[i]);
                                if (typeof tle !== "undefined") { 
                                    sc.title = tle.title;
                                    if (tle.dict != "") { 
                                        if (tle.dict == "el_signs") {
                                            sc.foreignKey = `${tle.dict}.uid`;
                                            sc.type = "string";
                                        } else {
                                            sc.foreignKey = `${tle.dict}.id`;
                                            sc.type = "number";
                                        }
                                    }
                                }
                                schemaData.push(sc);
                            }
                        }
                        sqlRequest += ` FROM ${table}`;
                        sqlRequest += ` WHERE jdocdate >= '${start}000000000' AND jdocdate <= '${end}235959999'`;
                        if (units.length > 0) sqlString +=  ` AND unitid IN (${units.join(',')})`;
                        if (statuses.length > 0) sqlString +=  ` AND statuses IN (${statuses.join(',')})`;
                        if (search != "") sqlRequest += ` AND data LIKE '%${search}%'`;
                        // console.log("sql=> ", sqlRequest);
                        let rows = await toolbox.sqlRequest(base, sqlRequest);
                        if (schemaData.length > 0) {
                            let newRow = [];
                            for (let i = 0; i < rows.length; i++) {
                                let row = {};
                                for (let j = 0; j < schema.length; j++) row[schema[j].name] = rows[i][schema[j].name];

                                let data =  await toolbox.xmlToJs(rows[i].data);
                                // console.log("data=> ", data)
                                for (let j = 0; j < schemaData.length; j++) { 
                                    if (typeof data.Document[schemaData[j].name] !== "undefined") { 
                                        // console.log("data.Document[schemaData[j].name]=> ", data.Document[schemaData[j].name]);
                                        if (typeof data.Document[schemaData[j].name] !== "undefined" && typeof data.Document[schemaData[j].name][0] !== "undefined" && typeof data.Document[schemaData[j].name][0] === "string") {
                                            // console.log("schemaData[j]==> ", schemaData[j]);
                                            if (schemaData[j].type == "string") row[schemaData[j].name] =  data.Document[schemaData[j].name][0];
                                            else if (schemaData[j].type == "number") { 
                                                // console.log("преобразуем в число");
                                                row[schemaData[j].name] =  parseInt(data.Document[schemaData[j].name][0]);
                                            }
                                        } else if (typeof data.Document[schemaData[j].name] !== "undefined" && typeof data.Document[schemaData[j].name][0] !== "undefined" && typeof data.Document[schemaData[j].name][0] === "object") {
                                            if (typeof data.Document[schemaData[j].name][0]._ !== "undefined")  row[schemaData[j].name] = data.Document[schemaData[j].name][0]._;
                                            
                                        } 
                                    } else {
                                        if (schemaData[j].name == "ElSign") {
                                            row[schemaData[j].name] = "0";
                                        } else {
                                            if (schemaData[j].type == "string") row[schemaData[j].name] = "";
                                            else if (schemaData[j].type == "number") row[schemaData[j].name] = 0;
                                        }
                                    }
                                }

                                newRow.push(row);
                            }
                            obj.list = newRow;
                            schema = schema.concat(schemaData);
                        } else {
                            obj.list = rows;
                        }
                        obj.schema = schema;







                        // sqlRequest = "SELECT ";
                        // arr = [];
                        // schema.map(item=> arr.push(item.name));
                        // sqlRequest += arr.join(",");

                        // // проверить, есть ли для пользователя и этой базы запись в справочнике видимых полей
                        // let flds = await toolbox.sqlRequest('skyline1', `
                        //     SELECT * FROM dict_dex_visible_fields 
                        //     WHERE author = '${user.UserId}' AND operator = '${this.#operator}'
                        // `);
                            
                        // console.log("Есть запись! ", flds);

                        // if (flds.length > 0) sqlRequest = sqlRequest.concat(", data");
                        // sqlRequest += " FROM journal";
                        // sqlRequest += ` WHERE jdocdate > '${start}000000000' AND jdocdate < '${end}235959999'`;
                        // if (units.length > 0) sqlString +=  ` AND unitid IN (${units.join(',')})`;
                        // if (statuses.length > 0) sqlString +=  ` AND statuses IN (${statuses.join(',')})`;
                        // rows = await toolbox.sqlRequest(base, sqlRequest);

                        // if (flds.length > 0) {
                        //     let data =  await toolbox.xmlToJs(row.data);
                        //     let arr = flds[0].flds.aplit(",");
                        //     let dicts = core.DictsByNamesV1("dex_visible_fields");
                        //     let dict = dicts.find(item=> item.name == 'dex_visible_fields');
                        //     for (let i = 0; arr.length; i++) {
                        //         schema.push({name: arr[i]});
                        //     }
                        // } else {
                        //     obj.list = rows;
                        //     obj.schema = schema;
                        // }
                        obj.status = 1;


                        // теперь добавим в схему поля
                            // let rows = await toolbox.sqlRequest('skyline1', `
                            //  SELECT uid, title 
                            //  FROM dict_dex_data_fields
                            //  WHERE uid IN (${flds.flds})
                            // `);
                            
                    }
                }

            } else obj.errs.push("Параметр subaction обязателен!");
        }
        return obj;
    }
    async list(packet, toolbox, base, user, adapter, schemas, dicts, core) {
        // console.log("list ", base);
        console.log('запрос');
        let obj = {};
        let err = [];
        obj.list = [];
        obj.operator = 'MTS';
        obj.status = -1;
        let start, end, lowerCaseSearch;
        if (packet.data.subaction === 'period') {
            start = packet.data.start;
            if (typeof packet.data.start === 'undefined') start = toolbox.moment().format('YYYYMMDD');
            else {
                start = toolbox.moment(start).format('YYYYMMDD');
            }
            if (typeof packet.data.end === 'undefined') end = start;
            else end = toolbox.moment(packet.data.end).format('YYYYMMDD');
                obj.start = start;
                obj.end = end;

            // let end = typeof packet.data.end === 'undefined' ? start : packet.data.end;
            // if (typeof start !== 'undefined' && typeof end !== 'undefined') {
                // console.log(`start = ${start} и end = ${end}`);

                let appConfigufation = user.GetAppConfiguration('adapters');
                // let docidLowLine = this.docid.replace(/\./g,'_');
                if (appConfigufation.configuration.accesses.list.documents[this.docid].actions.indexOf("show") != -1) {
                    // console.log("");
                    obj.base = packet.data.base;
                    let sqlString = `
                        SELECT * FROM journal
                        WHERE jdocdate > '${start}000000000' AND jdocdate < '${end}235959999'
                    `;
                    if (typeof packet.data.units !== 'undefined' && packet.data.units.length > 0) {
                        if (packet.data.units.indexOf('all') == -1) {
                            sqlString += ` AND unitid IN (${packet.data.units.join(',')})`;
                        }
                        obj.units = packet.data.units;
                    }
                    if (typeof packet.data.statuses !== 'undefined' && Array.isArray(packet.data.statuses) && packet.data.statuses.length > 0) {
                        sqlString += ` AND status IN (${packet.data.statuses.join(',')})`;
                        obj.statuses = packet.data.statuses;
                    }
                    if (typeof packet.data.search !== 'undefined' && packet.data.search !== '') { 
                        obj.search = packet.data.search;
                        lowerCaseSearch = packet.data.search.toLowerCase();
                    }
                    // console.log('==>sqlString', sqlString);
                    let result = await toolbox.sqlRequest(base, sqlString);
                    // console.log("result=>", result.length);
                    let fields = {};
                    let headers = [ 
                        { id: 'id', name: 'Идентификатор'},
                        { id: 'status', name: 'Статус'},
                        { id: 'unitid', name: 'Отделение'},
                        { id: 'digest', name: 'Дайджест'},
                        { id: 'docid',  name: 'Тип документа'},
                        { id: 'jdocdate', name: 'Дата документа'},
                    ];
                    // покажем разрешенные пользователем заголовки
                    let displayedHeaders = appConfigufation.configuration.documents.list.period.displayedfields.fields;
                    for (let field of displayedHeaders) {
                        if (typeof toolbox.dictionaries.docfields[field] !== 'undefined') {
                            let elem = toolbox.dictionaries.docfields[field];
                            headers.push({
                                id: elem.uid, 
                                name: elem.title,
                                status: elem.status
                            });
                        }
                    }

                    let dicts = core.DictsByNames(["docStatuses","stores"]);
                    let docStatuses = dicts.find(item=> item.name == "docStatuses");
                    let stores = dicts.find(item=> item.name == "stores");
                        
                    for (let i=0; i<result.length;i++) {
                        let row = result[i];
                        let fields = {};
                        fields.id = row.id;
                        fields.status = row.status;
                        for (let j = 0; j <docStatuses.list.length; j++) {
                            if (row.status == docStatuses.list[j].uid) { 
                                fields.status = docStatuses.list[j].title;
                                break;
                            }
                        }
                        fields.unitid = row.unitid;
                        for (let j = 0; j <stores.list.length; j++) {
                            if (row.unitid == stores.list[j].dex_uid) { 
                                fields.unitid = stores.list[j].title;
                                break;
                            }
                        }
                        fields.digest = row.digest;
                        fields.docid = row.docid;
                        fields.jdocdate = row.jdocdate;
                        let data = await toolbox.xmlToJs(row.data);
                        let datafields = {};

                        if (typeof packet.data.search !== 'undefined' && packet.data.search !== '') {
                            // console.log('да');
                            let ifIsset = false;
                            // let ppp = '';
                            for (let field in data.Document) {
                                let elem = data.Document[field];
                                // console.log("field=>", elem);
                                if (typeof elem[0] === 'string') {
                                    // console.log("вот да");
                                    // if (elem[0].indexOf(packet.data.search) !== -1) {
                                    let lowerCaseField = elem[0].toLowerCase();
                                    if (lowerCaseField.includes(lowerCaseSearch)) {
                                        ifIsset = true;
                                        // ppp = elem[0];
                                    }
                                }
                                if (displayedHeaders.indexOf(field) !== -1) {
                                    datafields[field] = elem[0];
                                }
                            }
                            if (ifIsset) {
                                // console.log("обнаружено совпадение ", ppp);

                                obj.list.push({fields: fields, datafields: datafields});
                            }
                        } else {
                            for (let field in data.Document) {
                                let elem = data.Document[field];
                                if (displayedHeaders.indexOf(field) !== -1) {
                                    datafields[field] = elem[0];
                                }   
                            }
                            obj.list.push({fields: fields, datafields: datafields});
                        }
                        
                    }
                    obj.headers = headers;

                    // отдадим список доступных отделений за выбранный период
                    obj.availableUnits = await adapter.getUnitsByPeriod(start, end);

                    // дадим информацию какие зацепки актуальны
                    
                } else {
                    err.push('Настройками программы вам запрещено просмативать журнал договоров');
                }
            // } else {
            //  err.push(`Для осуществления данной команды, необходимо указать период для документов`);
            // }
        } else {
            err.push( 'Неизвестная команда' );
        }
        console.log('отдали ответ');
        if (err.length > 0) obj.err = err;
        else obj.status = 1;
        return obj;
    }
    async hooks(packet, toolbox, base, user, adapter) {
        let obj = {};
        let err = [];
        // obj.list = [];       
        obj.hash = packet.data.hash;
        obj.action = 'hooks';
        obj.subaction = packet.data.subaction;
        obj.base = packet.data.base;
        obj.vendor = 'MTS';
        if (packet.data.subaction === 'document.replacement') {
            if (typeof packet.data.list !== 'undefined') {
                obj.subaction = packet.data.subaction;
                if (packet.data.list.length > 0) {
                    let prt = await this.printReplacement(packet, toolbox, base, user);
                    obj.link = prt.link;
                    obj.base = packet.data.base;
                    obj.status = 1;
                    // console.log("prt=> ", prt);
                } else {
                    err.push('Вы не указали документы, которые следует распечатать');
                }
            } else {
                err.push('Параметр list не может отсутствовать');
            }
        } else if (packet.data.subaction === 'document.print.doc') {
            if (typeof packet.data.list !== 'undefined') {
                obj.subaction = packet.data.subaction;
                if (packet.data.list.length > 0) {
                    let prt = await this.printForm(packet, toolbox, base, user);
                    if (prt.status == -1) err = err.concat(prt.err);
                    obj.status = prt.status;
                    obj.link = prt.link;
                    obj.base = packet.data.base;
                    // console.log("prt=> ", prt);
                } else {
                    err.push('Вы не указали документы, которые следует распечатать');
                }
            } else {
                err.push('Параметр list не может отсутствовать');
            }
        } else if (packet.data.subaction === 'document.change.fio') {
            if (typeof packet.data.list !== "undefined" && Array.isArray(packet.data.list)) {
                toolbox.asyncLoop({
                    length: packet.data.list.length, 
                    functionToLoop: async (loop, i)=> {
                        let row = await toolbox.sqlRequest(base, `SELECT data FROM journal WHERE id = ${packet.data.list[i]}`);
                        if (typeof row !== "undefined" && row.length > 0) {

                        }
                        loop();
                    },
                    callback: ()=> {
                        console.log("цикл исполнен");
                    }
                });
            }
        } else {
            err.push('Выбранная зацепка не обрабатывается');
        }

        if (err.length > 0) obj.err = err;
        return obj;
    }
	async printForm(packet, toolbox, base, user) {
        console.log('запрос на создание печатной формы');
		let obj = {};
		let err = [];
		obj.data = [];
        obj.base = packet.data.base;
        obj.status = -1;
        let cntDocs = 1000;
        if (packet.data.list.length > cntDocs) {
            err.push(`Количество документов на печать не должно превышать ${cntDocs}`);
        } else {
            let ids = packet.data.list;
            let rows = [];
            for (let id of ids) {
                let rw = await toolbox.sqlRequest(base, `SELECT data FROM journal WHERE id = ${id}`);
                if (rw.length > 0) rows.push(rw[0]);
            }
            // let rows = await toolbox.sqlRequest(base, `SELECT data FROM journal WHERE id IN (${ids})`);
            if (rows.length > 0) {
                let schema = JSON.parse(fs.readFileSync(`${__dirname}/printing_forms/documents/mts/schema.json`, 'utf8'));
                let hash = toolbox.getHash();
                obj.link = `mts_${hash}.pdf`;
                const pdfDoc = await pdfLib.PDFDocument.create();
                let flds = {
                    CodeWord: "01",
                    Plan: '02',
                    LastName: '03',
                    FirstName: '04',
                    SecondName: '05',
                    FizDocCitizen: '13',
                    FizBirthPlace: '11',
                    FizDocSeries: '14',
                    FizDocNumber: '15',
                    FizDocOrg: '16',
                    AddrZip: '21',
                    AddrState: '23',
                    AddrRegion: '24',
                    AddrCity: '25',
                    MSISDN: 'phone',
                    FizDocOrgCode: ['20','22'],
                    FizDocDate: ['17','18','19'],
                    Birth: ['06','07','08'],
                    DocDate: ['60','61','62'],
                    Sex: ['09','10'],
                    AddrStreet: '26',
                    ICC: 'iccid',
                    FIO: 'fio',
                    FizDocCitizen: '13',
                    FizDocType: '12',
                    AssignedDPCode: '49',
                    DEALER_NAME: '50',
                    BARCODE: 'barcode',
                    DocCity: '63',
                    DealerName: '51'
                }
                const fontBytes = fs.readFileSync(`${__dirname}/fonts/arial.ttf`);
                
                for (let row of rows) {
                    let ifAdd = true;
                    let buffer = fs.readFileSync(`${__dirname}/printing_forms/documents/mts/mts.pdf`);
                    let page = await pdfLib.PDFDocument.load(buffer);
                    await page.registerFontkit(fontkit);
                    const customFont = await page.embedFont(fontBytes);
                    const form = page.getForm();

                    let errItemIcc = form.getTextField('erriccid');
                    errItemIcc.setText('');
                    let errItemMsisdn = form.getTextField('errphone');
                    errItemMsisdn.setText('');

                    let dataContract = await toolbox.xmlToJs(row.data);
                    for (let key in dataContract.Document) {
                        if (typeof schema[key] !== 'undefined' && typeof flds[key] !== 'undefined') {
                            if (typeof schema[key].variants === 'undefined') {
                                // let ff = ;
                                if (key == "AddrZip") {
                                    dataContract.Document[key][0] = dataContract.Document[key][0].replace(/[^0-9]/g,"");
                                }
                                let item = form.getTextField(flds[key]);

                                // console.log("dataContract.Document[key][0]> ", dataContract.Document[key][0]);

                                item.setText(dataContract.Document[key][0]);
                                // console.log("dataContract.Document[key][0]=> ", dataContract.Document[key][0]);
                                if (schema[key].fontSize) item.setFontSize(schema[key].fontSize);
                                item.updateAppearances(customFont);
                                // console.log("сделано");
                            } else {
                                for (let i = 0; i < schema[key].variants.length; i++) {
                                    let text = '';
                                    if (schema[key].variants[i].text.action === 'substring') {
                                        let from = schema[key].variants[i].text.from;
                                        let to = schema[key].variants[i].text.to;
                                        text = dataContract.Document[key][0].substring(from, to);
                                        let item = form.getTextField(flds[key][i]);
                                        item.setText(text);
                                        if (schema[key].variants[i].fontSize) item.setFontSize(schema[key].variants[i].fontSize);
                                        item.updateAppearances(customFont);
                                    } else if (schema[key].variants[i].text.action === 'list') {
                                        let item = form.getCheckBox(flds[key][dataContract.Document[key][0]]);
                                        item.check();
                                    } else if (schema[key].variants[i].text.action === 'join') {
                                        let arr = [];
                                        for (let f of schema[key].variants[i].text.fields) {
                                            if (typeof dataContract.Document[f] !== 'undefined' && typeof dataContract.Document[f][0] !== 'undefined' && dataContract.Document[f][0] !== '') {
                                                let t = '';
                                                if (typeof schema[key].variants[i].text.fieldsAdd[f] !== 'undefined') {
                                                    t = `${schema[key].variants[i].text.fieldsAdd[f]}${schema[key].variants[i].text.symbolSpace}${dataContract.Document[f][0]}`;
                                                } else t = dataContract.Document[f][0];
                                                arr.push(t);
                                            }
                                        }
                                        text = arr.join(schema[key].variants[i].text.separator);
                                        let item = form.getTextField(flds[key]);
                                        item.setText(text);
                                        item.updateAppearances(customFont);
                                    } else if (schema[key].variants[i].text.action === 'dicts') {
                                        let text = '';
                                        let dict = schema[key].variants[i].text.dict;
                                        let value = '';
                                        if (schema[key].variants[i].text.tag === '_') {
                                            let value = dataContract.Document[key][0]._;
                                            let colName = schema[key].variants[i].text.col_name;
                                            let row = await toolbox.sqlRequest(base, `SELECT title FROM ${dict} WHERE ${colName} = '${value}'`);
                                            if (row.length > 0) text = row[0].title;
                                        } else if (schema[key].variants[i].text.tag === '$') {
                                            let value = dataContract.Document[key][0]._;
                                            text = value;
                                        } else {
                                            let dict = schema[key].variants[i].text.dict;
                                            let colName = schema[key].variants[i].text.col_name;
                                            if (typeof schema[key].variants[i].text.join !== 'undefined') {
                                                let search = schema[key].variants[i].text.search;
                                                let row = await toolbox.sqlRequest(base, `SELECT rvalue FROM ${dict} WHERE ${colName} = '${search}'`);
                                                if (row.length > 0) text = `${row[0].rvalue}${dataContract.Document[key][0]}`;
                                            } else {
                                                let search = schema[key].variants[i].text.search;
                                                let row = await toolbox.sqlRequest(base, `SELECT rvalue FROM ${dict} WHERE ${colName} = '${search}'`);
                                                if (row.length > 0) text = `${row[0].rvalue}`;
                                            }
                                        }
                                        let item = form.getTextField(flds[key]);
                                        item.setText(text);
                                        if (schema[key].variants[i].text.fontSize) item.setFontSize(schema[key].variants[i].text.fontSize);
                                        item.updateAppearances(customFont);
                                    }
                                }
                            }
                        }
                    }
                    if (typeof schema.FIO !== 'undefined') {
                        try {
                            if (typeof dataContract.Document[schema.FIO.variants.mainField] !== 'undefined' && typeof dataContract.Document[schema.FIO.variants.mainField][0] !== 'undefined') {
                                let text = dataContract.Document[schema.FIO.variants.mainField][0];
                                for (let field of schema.FIO.variants.fields) {
                                    text += ` ${dataContract.Document[field][0].substring(0, 1)}.`;
                                }
                                let item = form.getTextField(flds.FIO);
                                item.setText(text);
                                item.updateAppearances(customFont);
                            }
                        } catch(e) {
                            console.log("e=> ", e);
                            console.log("ошибка возникла на ", dataContract.Document);
                        }
                        
                    }
                    if (typeof schema.DEALER_NAME !== 'undefined') {
                        for (let i = 0; i < schema.DEALER_NAME.variants.length; i++) {
                            let text = '';
                            let dict = schema["DEALER_NAME"].variants[i].text.dict;
                            let colName = schema["DEALER_NAME"].variants[i].text.col_name;
                            let search = schema["DEALER_NAME"].variants[i].text.search;
                            let row = await toolbox.sqlRequest(base, `SELECT rvalue FROM ${dict} WHERE ${colName} = '${search}'`);
                            if (row.length > 0) text = row[0].rvalue;
                            let item = form.getTextField(flds.DEALER_NAME);
                            item.setText(text);
                            if (schema["DEALER_NAME"].variants[i].text.fontSize) item.setFontSize(schema["DEALER_NAME"].variants[i].text.fontSize);
                            item.updateAppearances(customFont);
                        }       
                    }
                   
                    form.flatten();

                    const [coverPage] = await pdfDoc.copyPages(page, [0]);
                    pdfDoc.addPage(coverPage);


                     // теперь добавить штрих код
                    if (typeof schema.BARCODE !== 'undefined') {
                        try {
                            let arr = [];
                            for (let field of schema.BARCODE.variants.fields) {
                                if (typeof dataContract.Document[field] !== 'undefined' && typeof dataContract.Document[field][0] !== 'undefined') arr.push(dataContract.Document[field][0]);
                            }
                            if (arr.length == 3) {
                                let text = arr.join('');
                                const pages = pdfDoc.getPages();
                                const cpage = pages[pages.length - 1];
                                let png = await toolbox.generateBarCode('code128', text);
                                
                                const pngImage = await pdfDoc.embedPng(png);
                                const pngDims = pngImage.scale(0.5);

                                console.log(text);

                                cpage.drawImage(pngImage, {
                                    x: schema.BARCODE.variants.left,
                                    y: schema.BARCODE.variants.top,
                                    width: pngDims.width/1.75,
                                    height: pngDims.height/1.8,
                                })
                            }
                        } catch (e) {
                            ifAdd = false;
                            console.log("e=> ", e);
                        }
                    }
                    // if (ifAdd) fs.writeFileSync(`${__dirname}/printing_forms/temp/mts_${hash}.pdf`, await pdfDoc.save());
                }
                fs.writeFileSync(`${__dirname}/printing_forms/temp/mts_${hash}.pdf`, await pdfDoc.save());
            }
        }
		
        if (err.length > 0) obj.err = err;
        else obj.status = 1;
        console.log("obj=> ", obj);
		return obj;
	}
    async reports(packet, toolbox, base, user, adapter, schemas, dicts, core) {
        let obj = {status: -1, errs: [], list: [], schema: []};
        let userConfiguration = this.#ValidateUser( user );
        if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
        else {
            if (typeof packet.data.subaction !== "undefined") {
                // отчет по долгам
                if (typeof packet.data.base !== "undefined") {
                    obj.base = packet.data.base;
                    let dicts = core.DictsByNamesV1(["stores"]);
                    let dictUnits = dicts.find(item=> item.name == "stores");

                    if (packet.data.subaction == "dutyDocs") {
                        let start, end, units = "";
                        if (typeof packet.data.filter === "undefined") obj.errs.push("Вы не указали фильтр");
                        else {
                            let moment = toolbox.getMoment();
                            if (typeof packet.data.filter.start === "undefined") obj.errs.push("Вы не указали дату начала периода");
                            else {
                                start = toolbox.moment(packet.data.filter.start, "YYYYMMDD");
                            }
                            if (typeof packet.data.filter.end === "undefined") obj.errs.push("Вы не указали дату окончания периода");
                            else {
                                end = toolbox.moment(packet.data.filter.end, "YYYYMMDD");
                            }
                            if (start.isValid() && end.isValid()) {
                               
                                let sql = `SELECT * FROM journal WHERE jdocdate >= '${start.format("YYYYMMDD")}000000000' AND jdocdate <= '${end.format("YYYYMMDD")}235959999'`;
                                if (typeof packet.data.filter.unit !== "undefined") {
                                    sql = `${sql} AND unitid = '${packet.data.filter.unit}'`;
                                }
                                console.log("sql=> ", sql);
                                let rows = await toolbox.sqlRequest(base, sql);
                                // console.log("rows=> ", rows);
                                // схема
                                obj.schema = [
                                    {name: 'date', type: 'date', title: 'Дата'},
                                    {name: 'fio', type: 'string', title: 'ФИО'},
                                    {name: 'msisdn', type: 'string', title: 'MSISDN'},
                                    {name: 'icc', type: 'string', title: 'ICC'},
                                    {name: 'unit_new', type: 'string', title: 'Действующее отделение'},
                                    {name: 'unit_old', type: 'string', title: 'Предыдущее отделение'}
                                ];
                                if (rows.length > 0) {
                                    // let moment = toolbox.getMoment();
                                    
                                    for (let i = 0; i < rows.length; i++) {
                                        let data =  await toolbox.xmlToJs(rows[i].data);
                                        if (typeof data.Document.DutyId !== "undefined") {
                                            let item = {};
                                            let date = moment(rows[i].jdocdate, "YYYYMMDD");
                                            item.date = date.format("DD.MM.YYYY");
                                            item.fio = `${data.Document.LastName[0]} ${data.Document.FirstName} ${data.Document.SecondName}`;
                                            item.msisdn = data.Document.MSISDN[0];
                                            item.icc = data.Document.ICC[0];
                                            let unit_new = dictUnits.list.find(itm=> itm.dex_uid == rows[i].unitid);
                                            if (typeof unit_new !== "undefined") item.unit_new = unit_new.title;
                                            else if ( typeof rows[i].unitid !== "undefined") item.unit_new = rows[i].unitid;
                                            else item.unit_new = "";
                                            let unitOld = dictUnits.list.find(itm=> itm.dex_uid == data.Document.DutyId[0]);
                                            if (typeof unitOld !== "undefined") item.unit_old = unitOld.title;
                                            else if (typeof data.Document.DutyId[0] !== "undefined") item.unit_old = data.Document.DutyId[0];
                                            else item.unit_old = "";
                                            obj.list.push(item);
                                        }
                                    }

                                    

                                } 
                                
                            }
                        }
                    } else if (packet.data.subaction == "sverka") {
                        let jparams = ["journal", "archive", "journalAndArchive"];
                        let jtypes = ["cnts", "tp", "regs", "balances"];
                        let start, end, reportType = "cnt", journalParams = "journal", splitMonthly = false, zeroBalances = false;
                        if (typeof packet.data.filter === "undefined") obj.errs.push("Вы не указали фильтр");
                        else {
                            let moment = toolbox.getMoment();
                            if (typeof packet.data.filter.start === "undefined") obj.errs.push("Вы не указали дату начала периода");
                            else {
                                start = toolbox.moment(packet.data.filter.start, "YYYYMMDD");
                            }
                            if (typeof packet.data.filter.end === "undefined") obj.errs.push("Вы не указали дату окончания периода");
                            else {
                                end = toolbox.moment(packet.data.filter.end, "YYYYMMDD");
                            }
                            if (start.isValid() && end.isValid()) {
                                
                                if (typeof packet.data.filter.reportType !== "undefined" && jtypes.indexOf(packet.data.filter.reportType) != -1) reportType = packet.data.filter.reportType
                                if (typeof packet.data.filter.journalParams !== "undefined" && jparams.indexOf(packet.data.filter.journalParams) != -1) journalParams = packet.data.filter.journalParams;
                                if (typeof packet.data.filter.splitMonthly === "boolean") splitMonthly = packet.data.filter.splitMonthly;
                                if (typeof packet.data.filter.zeroBalances === "boolean") zeroBalances = packet.data.filter.zeroBalances;

                                obj.schema.push({name: 'unit', type: 'string', title: 'Отделение'});
                                // obj.schema.push({name: 'region', type: 'string', title: 'Адрес точки'});
                                // if (!splitMonthly) schema.push({name: 'month', type: 'string', title: 'Отделение'});
                                obj.schema.push({name: 'cnt', type: 'number', title: 'Всего'});
                                obj.reportType = reportType;
                                obj.journalParams = journalParams;
                                obj.start = start.format("YYYYMMDD");
                                obj.end = end.format("YYYYMMDD");
                                obj.splitMonthly = splitMonthly;
                                obj.total = 0;
                                let jp = {
                                    journal: ["journal"],
                                    archive: ["archive"],
                                    journalAndArchive: ["journal", "archive"]
                                };
                                let newrows = [];
                                let months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
                                for (let i = 0; i < jp[journalParams].length; i++) {
                                    let sql = `SELECT ${jp[journalParams][i]}.*, units.region FROM ${jp[journalParams][i]} 
                                                LEFT JOIN units ON ${jp[journalParams][i]}.unitid = units.uid
                                                WHERE ${jp[journalParams][i]}.jdocdate >= '${start.format("YYYYMMDD")}000000000'
                                                AND ${jp[journalParams][i]}.jdocdate <= '${end.format("YYYYMMDD")}235959999'`;
                                    let rows = await toolbox.sqlRequest(base, sql);
                                    obj.total += rows.length;
                                    for (let j = 0; j < rows.length; j++) {
                                        let data =  await toolbox.xmlToJs(rows[j].data);
                                        let elem = newrows.find(item=> item.unit == rows[j].unitid);

                                        // всего
                                        if (typeof elem !== "undefined") elem.cnt++;    
                                        else { 
                                            elem = {unit: rows[j].unitid, region: rows[j].region, cnt: 1};
                                            newrows.push(elem);
                                        }

                                        if (splitMonthly) {
                                            let jd = toolbox.moment(rows[j].jdocdate, "YYYYMMDD");
                                            let year = jd.format("YYYY");
                                            let month = jd.format("MM");
                                            let name = `${months[parseInt(month - 1)]} ${year}`;
                                            let m = obj.schema.find(item=> item.name == name);
                                            if (typeof m === "undefined") obj.schema.push({name: name, type: "number", title: name});
                                            if (typeof elem[name] === "undefined") elem[name] = 1;
                                            else elem[name]++;
                                        } else {
                                            //теперь проверим параметры
                                            if (reportType == "tp") {
                                                let docTp;
                                                if (typeof data.Document.Plan === "undefined") docTp = "ТП не указан";
                                                else docTp = data.Document.Plan[0];                                                
                                                if (typeof elem[docTp] === "undefined") { 
                                                    elem[docTp] = 1;
                                                    let tpInSchema = obj.schema.find(item=> item.name == docTp);
                                                    if (typeof tpInSchema === "undefined") obj.schema.push({name: docTp, type: "number", title: docTp});
                                                } else elem[docTp]++;
                                            } else if (reportType == "regs") {
                                                let region;
                                                let rw = await toolbox.sqlRequest(base, `SELECT region_id FROM um_data WHERE msisdn = '${data.Document.MSISDN[0]}'`);
                                                if (rw.length == 0) rw = await toolbox.sqlRequest(base, `SELECT region_id FROM um_data_out WHERE msisdn = '${data.Document.MSISDN[0]}'`);
                                                if (rw.length == 0) region = "SIM-карта не найдена в справочнике";
                                                else region = rw[0].region_id;

                                                if (typeof elem[region] === "undefined") {
                                                    elem[region] = 1;
                                                    let regionSchema = obj.schema.find(item=> item.name == region);
                                                    if (typeof regionSchema === "undefined") obj.schema.push({name: region, type: "number", title: region});
                                                } else elem[region]++;
                                            } else if (reportType == "balances") {
                                                let balance;
                                                let rw = await toolbox.sqlRequest(base, `SELECT balance FROM um_data WHERE msisdn = '${data.Document.MSISDN[0]}'`);
                                                if (rw.length == 0) rw = await toolbox.sqlRequest(base, `SELECT balance FROM um_data_out WHERE msisdn = '${data.Document.MSISDN[0]}'`);
                                                if (rw.length == 0) balance = "SIM-карта не найдена в справочнике";
                                                else balance = rw[0].balance;

                                                if (typeof elem[balance] === "undefined") {
                                                    elem[balance] = 1;
                                                    let balanceSchema = obj.schema.find(item=> item.name == balance);
                                                    if (typeof balanceSchema === "undefined") obj.schema.push({name: balance, type: "number", title: balance});
                                                } else elem[balance]++;
                                            }
                                        }
                                    }
                                }
                                obj.list = newrows;
                            }
                        }
                    } else if (packet.data.subaction == "leftovers") {
                        let onlyActive = false, onlyMinimum = false, showAddress = false, minimum = 5, unit = -1;
                         if (typeof packet.data.filter === "undefined") obj.errs.push("Вы не указали фильтр");
                        else {
                            if (typeof packet.data.filter.onlyActive === "boolean") onlyActive = packet.data.filter.onlyActive;
                            if (typeof packet.data.filter.onlyMinimum === "boolean") { 
                                onlyMinimum = packet.data.filter.onlyMinimum;
                                if (onlyMinimum && typeof packet.data.filter.minimum !== "undefined") minimum = packet.data.filter.minimum;
                            }
                            if (typeof packet.data.filter.showAddress === "boolean") showAddress = packet.data.filter.showAddress;
                            if (typeof packet.data.filter.unit !== "undefined") unit = packet.data.filter.unit;

                            obj.schema = [
                                {name: 'unit', type: 'string', title: 'Отделение'},
                                {name: 'status', type: 'string', title: 'Активность'}
                            ]

                            let sqlUnits = `SELECT uid, title, status`;
                            if (showAddress) { 
                                obj.schema.push({name: 'region', type: 'string', title: 'Адрес точки'});
                                sqlUnits += ", region";
                            }
                            obj.schema.push({name: 'cnt', type: 'number', title: 'Остаток SIM-карт'});
                            sqlUnits += " FROM units";

                            let where = [];
                            if (onlyActive) where.push("status = '1'");
                            if (unit != -1) where.push(`uid = '${unit}'`);
                            if (where.length > 0) sqlUnits += ` WHERE ${where.join(" AND ")}`;

                            // получим отделения
                            let unitsRows = await toolbox.sqlRequest(base, sqlUnits);
                            // console.log("unitsRows=> ", unitsRows);
                            // получим симки
                            let umDataRows = await toolbox.sqlRequest(base, `SELECT owner_id FROM um_data WHERE status = '1' AND date_sold = ''`);
                            // console.log("umDataRows=> ", umDataRows);

                            let newrows = [];
                            for (let i = 0; i < unitsRows.length; i++) {
                                let arr = [];
                                for (let j = 0; j < umDataRows.length; j++) {
                                    if (unitsRows[i].uid == umDataRows[j].owner_id) arr.push(umDataRows[j]);
                                }
                                if (!onlyMinimum || onlyMinimum && arr.length < minimum) {
                                    let elem = {unit: unitsRows[i].uid, status: unitsRows[i].status, cnt: arr.length};
                                    if (showAddress) elem.region = unitsRows[i].region;
                                    newrows.push(elem);
                                }
                            }


                            for (let i = 0; i < newrows.length; i++) {
                                let tUnit = dictUnits.list.find(item=> item.dex_uid == newrows[i].unit);
                                if (typeof tUnit !== "undefined") newrows[i].unit = tUnit.title;
                                if (newrows[i].status == 1) newrows[i].status = "Отделение активно";
                                else newrows[i].status = "Отделение заблокировано";
                            }

                            obj.list = newrows;
                        }
                    } else if (packet.data.subaction == "subdealerSales") {
                        let start, end, units = "";
                        if (typeof packet.data.filter === "undefined") obj.errs.push("Вы не указали фильтр");
                        else {
                            let moment = toolbox.getMoment();
                            if (typeof packet.data.filter.start === "undefined") obj.errs.push("Вы не указали дату начала периода");
                            else {
                                start = toolbox.moment(packet.data.filter.start, "YYYYMMDD");
                            }
                            if (typeof packet.data.filter.end === "undefined") obj.errs.push("Вы не указали дату окончания периода");
                            else {
                                end = toolbox.moment(packet.data.filter.end, "YYYYMMDD");
                            }
                            if (start.isValid() && end.isValid()) {
                                obj.schema = [];
                                obj.total = 0;
                                let newrows = {};
                                let months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
                                let journals = ['journal', 'archive'];

                                for (let j = 0; j < journals.length; j++) {
                                    let rows = await toolbox.sqlRequest(base, `
                                        SELECT * 
                                        FROM ${journals[j]} 
                                        WHERE jdocdate >= '${start.format("YYYYMMDD")}000000000' AND jdocdate <= '${end.format("YYYYMMDD")}235959999' AND status = '4'
                                    `);   
                                    for (let i = 0; i < rows.length; i++) {
                                        let jd = toolbox.moment(rows[i].jdocdate, "YYYYMMDD");
                                        let year = jd.format("YYYY");
                                        let month = jd.format("MM");
                                        let name = `${months[parseInt(month - 1)]} ${year}`;
                                        let m = obj.schema.find(item=> item.name == name);
                                        if (typeof m === "undefined") obj.schema.push({name: name, type: "number", title: name});
                                        if (typeof newrows[name] !== "undefined") newrows[name]++;    
                                        else  newrows[name] = 1;
                                        obj.total++;

                                    }
                                }
                                
                                obj.list = newrows;
                            }
                        }
                    } else if (packet.data.subaction == "activation") {
                        console.log("сверка по активации");
                        let showPartyNum = false, showBalance = false, showUserData = false, journalParams = "journal", sims = []; 
                        let jparams = ["journal", "archive", "journalAndArchive"];
                        if (typeof packet.data.filter === "undefined") obj.errs.push("Вы не указали фильтр");
                        else {
                            if (typeof packet.data.filter.showPartyNum === "boolean" ) showPartyNum = packet.data.filter.showPartyNum;
                            if (typeof packet.data.filter.showBalance === "boolean" ) showBalance = packet.data.filter.showBalance;
                            if (typeof packet.data.filter.showUserData === "boolean" ) showUserData = packet.data.filter.showUserData;
                            if (typeof packet.data.filter.journalParams !== "undefined" && jparams.indexOf(packet.data.filter.journalParams) != -1) journalParams = packet.data.filter.journalParams;
                            else obj.errs.push("Вы указали не верные параметры журнала");
                            if (typeof packet.data.filter.sims !== "undefined" && Array.isArray(packet.data.filter.sims)) sims = packet.data.filter.sims;
                            else obj.errs.push("Вы не указали данные для сверки");

                            if (obj.errs.length == 0) {
                                console.log("ошибок нет, работаем");
                                let tplans = await toolbox.sqlRequest(base, `SELECT plan_id, title FROM um_plans`);
                                let units = await toolbox.sqlRequest(base, `SELECT uid, title FROM units`);
                                let jp = {
                                    journal: ["journal"],
                                    archive: ["archive"],
                                    journalAndArchive: ["journal", "archive"]
                                };
                                let up = {
                                    journal: ["um_data"],
                                    archive: ["um_data_out"],
                                    journalAndArchive: ["um_data", "um_data_out"]
                                };
                                let jru = {
                                    journal: ["Журнал"],
                                    archive: ["Архив"],
                                    journalAndArchive: ["Журнал", "Архив"]
                                }
                                let balance = "";
                                if (showBalance) balance = ", balance";
                                let list = []; let msisdns = [];
                                let moment = toolbox.getMoment();
                                sims.map(item=> msisdns.push(item.MSISDN));
                                // for (let i = 0; i < up[journalParams].length; i++) {
                                //     console.log("рассматриваем справочник ", up[journalParams][i]);
                                //     // console.log(`Запрос на справочник SELECT  msisdn, icc, fs, owner_id, plan_id, status, date_in, date_own, date_sold, party_id ${balance}
                                //     //     FROM ${up[journalParams][i]} 
                                //     //     WHERE msisdn IN (${msisdns.join(",")})
                                //     //     ORDER BY date_sold`);
                                //     let rows = await toolbox.sqlRequest(base, `
                                //         SELECT msisdn, icc, fs, owner_id, plan_id, status, date_in, date_own, date_sold, party_id ${balance}
                                //         FROM ${up[journalParams][i]} 
                                //         WHERE msisdn IN (${msisdns.join(",")})
                                //         ORDER BY date_sold
                                //     `);
                                //     console.log("Количество записей в справочнике => ", rows.length);
                                //     for (let j = 0; j < rows.length; j++) {
                                //         let listItem = list.find(item=> item.msisdn == rows[j].msisdn);
                                //         if (typeof listItem !== "undefined") {
                                //             let op1 = listItem.d_sold == "-" ? toolbox.moment().add(1, "days") : listItem.d_sold;
                                //             let op2 = rows[j].date_sold;
                                //             if (jp[journalParams][i] == "journal") {
                                //                 if (parseInt(rows[j].status) < 2) op2 = toolbox.moment().add(1, "days");
                                //             } else {
                                //                 if (parseInt(rows[j].status) < 2) {
                                //                     if (rows[j].date_own.length != 8 || !toolbox.isNumber(parseInt(rows[j].date_own))) {
                                //                         if (rows[j].date_in.length != 8 || !toolbox.isNumber(parseInt(rows[j].date_in))) {
                                //                             let op2 = toolbox.moment("00010101", "YYYYMMDD");
                                //                         } else {
                                //                             op2 = toolbox.moment(rows[j].date_in, "YYYYMMDD");
                                //                         }
                                //                     } else { 
                                //                         op2 = toolbox.moment(rows[j].date_own, "YYYYMMDD");
                                //                     }
                                //                 }
                                //             }
                                //             try {
                                //                 if (op1.isBefore(op2)) {
                                //                     let owner = "-", d_sold = "-", simBalance = "";;
                                //                     let cunits = units.find(item=> item.uid == rows[j].owner_id);
                                //                     if (typeof cunits !== "undefined") owner = cunits.title;
                                //                     if (parseInt(rows[j].status) == 2) d_sold = toolbox.moment(rows[j].date_sold, "YYYYMMDD");
                                //                     if (showBalance) simBalance = rows[j].balance;

                                //                     listItem.icc = rows[j].icc;
                                //                     listItem.fs = rows[j].fs;
                                //                     listItem.owner = owner;
                                //                     listItem.d_sold = d_sold;
                                //                     listItem.plan = rows[j].plan_id;
                                //                     listItem.jtype = jru[journalParams][i];
                                //                     listItem.balance = simBalance;
                                //                     listItem.party = rows[j].party_id;
                                //                 }
                                //             } catch (e) {
                                //                 console.log("Ошибка => ", e);
                                //                 console.log("ошибка op1 ", op1);
                                //                 console.log("ошибка op2 ", op2);
                                //             }
                                            
                                //         } else {
                                //             let owner = "-", d_sold = "-", simBalance = "";
                                //             let cunits = units.find(item=> item.uid == rows[j].owner_id);
                                //             if (typeof cunits !== "undefined") owner = cunits.title;
                                //             if (parseInt(rows[j].status) == 2) d_sold = toolbox.moment(rows[j].date_sold, "YYYYMMDD");
                                //             if (showBalance) simBalance = rows[j].balance;
                                //             list.push({
                                //                 msisdn: rows[j].msisdn, 
                                //                 icc: rows[j].icc,
                                //                 fs: parseInt(rows[j].fs) == 0 ? "МБ" : "ФС",
                                //                 owner: owner,
                                //                 d_sold: d_sold,
                                //                 plan: rows[j].plan_id,
                                //                 jtype: jru[journalParams][i],
                                //                 balance: simBalance,
                                //                 party: rows[j].party_id
                                //             });
                                //         }
                                //     }
                                // }

                                // // console.log("list => ", list);

                                // console.log("Загрузка документов");
                                // let mda = [];
                                // for (let i = 0; i < jp[journalParams].length; i++) {
                                //     console.log("рассматриваем журнал ", jp[journalParams][i]);
                                //     // let rows = await toolbox.sqlRequest(base, `
                                //     //     SELECT * FROM ${jp[journalParams][i]} 
                                //     //     ORDER BY jdocdate
                                //     // `);



                                //     // let rows = [];
                                //     let likeArr = [];
                                //     for (let j = 0; j < sims.length; j++) {
                                //         likeArr.push(`digest LIKE '%${sims[j].MSISDN}%'`);
                                //     }
                                //     let rows = await toolbox.sqlRequest(base, `
                                //         SELECT * FROM ${jp[journalParams][i]} 
                                //         WHERE ${likeArr.join(" OR ")}
                                //     `);

                                //     // for (let j = 0; j < sims.length; j++) {
                                //     //     let rw = await toolbox.sqlRequest(base, `
                                //     //         SELECT * FROM ${jp[journalParams][i]} 
                                //     //         WHERE digest LIKE '%${sims[j].MSISDN}%'
                                //     //     `);
                                //     //     rw.map(item=> rows.push(item));
                                //     // }
                                //     console.log("количество записей ", rows.length);
                                //     for (let j = 0; j < rows.length; j++) {
                                //         let fio, dul, birth;
                                //         let dpCode = "", assignedDpCode = "";
                                //         let sdocdate = toolbox.moment(rows[j].jdocdate, "YYYYMMDD");
                                //         let xml = await toolbox.xmlToJs(rows[j].data);
                                //         if (showUserData) {
                                //             fio = toolbox.fullNameToFio(xml.Document.LastName[0], xml.Document.FirstName[0], xml.Document.SecondName[0]);
                                //             dul = `${xml.Document.FizDocSeries[0].replace(" ", "")} ${xml.Document.FizDocNumber[0]}`;
                                //             birth = xml.Document.Birth[0];
                                //         }
                                //         if (typeof xml.Document.DPCodeKind !== "undefined" && typeof xml.Document.DPCodeKind[0] !== "undefined") dpCode = xml.Document.DPCodeKind[0];
                                //         if (typeof xml.Document.AssignedDPCode !== "undefined" && typeof xml.Document.AssignedDPCode[0] !== "undefined") assignedDpCode = xml.Document.AssignedDPCode[0];
                                //         let msisdn = xml.Document.MSISDN[0];
                                //         mda.push({
                                //             msisdn: msisdn, 
                                //             icc: xml.Document.ICC[0],
                                //             dpCode: dpCode,
                                //             assignedDpCode: assignedDpCode,
                                //             date: sdocdate.format("DD.MM.YYYY"),
                                //             jtype: jru[journalParams][i],
                                //             fio: fio,
                                //             dul: dul,
                                //             birth: birth
                                //         });
                                //     }
                                // }

                                // console.log("Длина mda => ", mda.length);
                                // console.log("Длина mda => ", mda);
                                // console.log("Обработка информации");
                                // for (let i = 0; i < sims.length; i++) {
                                //     let itm = list.find(item=> item.msisdn == sims[i].MSISDN);
                                //     if (typeof itm !== "undefined") {
                                //         try {
                                //             sims[i].owner = itm.owner;
                                //             sims[i].d_sold = itm.d_sold == "-" ? itm.d_sold : itm.d_sold.format("DD.MM.YYYY");
                                //             sims[i].plan = itm.plan;
                                //             sims[i].jtype = itm.jtype;
                                //             sims[i].fs = itm.fs;
                                //             if (showBalance) sims[i].balance = itm.balance; 
                                //             if (showPartyNum) sims[i].partyNum = itm.party; 
                                //         } catch (e) {
                                //             console.log("ошибка ", e);
                                //             console.log("docitem.date=> ", itm.d_sold);
                                //         }
                                //     }
                                //     let docitem = mda.find(item=> item.msisdn == sims[i].MSISDN);
                                //     if (typeof docitem !== "undefined") {
                                //         if (docitem.icc == itm.icc) {
                                //             try {
                                //                 sims[i].date = docitem.date;
                                //                 sims[i].jtype = docitem.jtype;
                                //                 sims[i].dpCode = docitem.dpCode;
                                //                 sims[i].assignedDpCode = docitem.assignedDpCode;
                                //                 if (showUserData) {
                                //                     sims[i].fio = docitem.fio;
                                //                     sims[i].dul = docitem.dul;
                                //                     sims[i].birth = docitem.birth;
                                //                 }
                                //             } catch (e) {
                                //                 console.log("ошибка ", e);
                                //                 console.log("docitem.date=> ", docitem.date);
                                //             }
                                //         }
                                //     }
                                // }
                                // console.log("sims===> ", sims);


                                let allUmDataRows = [];
                                // соберем все данные из справочника sim и положим их в общий массив
                                for (let i = 0; i < up[journalParams].length; i++) {
                                    let rows = await toolbox.sqlRequest(base, `
                                        SELECT msisdn, icc, fs, owner_id, plan_id, status, date_in, date_own, date_sold, party_id ${balance}
                                        FROM ${up[journalParams][i]} 
                                        WHERE msisdn IN (${msisdns.join(",")})
                                        ORDER BY date_sold
                                    `);
                                    for (let j = 0; j < rows.length; j++) { 
                                        rows[j].jtype_sim = jru[journalParams][i];
                                        allUmDataRows.push(rows[j]);
                                    }
                                }

                                console.log("allUmDataRows => ", allUmDataRows);
                                console.log("allUmDataRows length=> ", allUmDataRows.length);

                                // обработаем общий массив
                                let finalUmDataRows = [];
                                for (let i = 0; i < allUmDataRows.length; i++) {
                                    let umDataItem = finalUmDataRows.find(item=> item.msisdn == allUmDataRows[i].msisdn);
                                    if (typeof umDataItem !== "undefined") {
                                        let op1 = umDataItem.d_sold == "-" ? toolbox.moment().add(1, "days") : umDataItem.d_sold;
                                        let op2 = allUmDataRows[i].date_sold;
                                        if (allUmDataRows[i].jtype_sim == "Журнал") {
                                            console.log("Это журнал");
                                            if (parseInt(allUmDataRows[i].status) < 2) op2 = toolbox.moment().add(1, "days");
                                        } else {
                                            console.log("Это не журнал");
                                            if (parseInt(allUmDataRows[i].status) < 2) {
                                                if (allUmDataRows[i].date_own.length != 8 || !toolbox.isNumber(parseInt(allUmDataRows[i].date_own))) {
                                                    if (allUmDataRows[i].date_in.length != 8 || !toolbox.isNumber(parseInt(allUmDataRows[i].date_in))) {
                                                        let op2 = toolbox.moment("00010101", "YYYYMMDD");
                                                    } else {
                                                        op2 = toolbox.moment(allUmDataRows[i].date_in, "YYYYMMDD");
                                                    }
                                                } else { 
                                                    op2 = toolbox.moment(allUmDataRows[i].date_own, "YYYYMMDD");
                                                }
                                            }
                                        }

                                        if (op1.isBefore(op2)) {
                                            console.log("меняем");
                                            let owner = "-", d_sold = "-", simBalance = "";;
                                            let cunits = units.find(item=> item.uid == allUmDataRows[i].owner_id);
                                            if (typeof cunits !== "undefined") owner = cunits.title;
                                            if (parseInt(allUmDataRows[i].status) == 2) d_sold = toolbox.moment(allUmDataRows[i].date_sold, "YYYYMMDD");
                                            if (showBalance) simBalance = allUmDataRows[i].balance;

                                            umDataItem.icc = allUmDataRows[i].icc;
                                            umDataItem.fs = allUmDataRows[i].fs;
                                            umDataItem.owner = owner;
                                            umDataItem.d_sold = d_sold;
                                            umDataItem.plan = allUmDataRows[i].plan_id;
                                            umDataItem.jtype_sim = allUmDataRows[i].jtype_sim;
                                            umDataItem.balance = simBalance;
                                            umDataItem.partyNum = allUmDataRows[i].party_id;
                                        }
                                    } else {
                                        let owner = "-", d_sold = "-", simBalance = "";
                                        let cunits = units.find(item=> item.uid == allUmDataRows[i].owner_id);
                                        if (typeof cunits !== "undefined") owner = cunits.title;
                                        if (parseInt(allUmDataRows[i].status) == 2) d_sold = toolbox.moment(allUmDataRows[i].date_sold, "YYYYMMDD");
                                        if (showBalance) simBalance = allUmDataRows[i].balance;
                                        finalUmDataRows.push({
                                            msisdn: allUmDataRows[i].msisdn, 
                                            icc: allUmDataRows[i].icc,
                                            fs: parseInt(allUmDataRows[i].fs) == 0 ? "МБ" : "ФС",
                                            owner: owner,
                                            d_sold: d_sold,
                                            plan: allUmDataRows[i].plan_id,
                                            jtype_sim: allUmDataRows[i].jtype_sim,
                                            balance: simBalance,
                                            partyNum: allUmDataRows[i].party_id
                                        });
                                    }
                                }

                                // console.log("finalUmDataRows=> ", finalUmDataRows);
                                sims = finalUmDataRows;

                                // преобразуем даты продаж в вид xx.xx.xxxx
                                for (let i = 0; i < sims.length; i++) sims[i].d_sold = sims[i].d_sold == "-" ? sims[i].d_sold : sims[i].d_sold.format("DD.MM.YYYY");

                                // загрузка документов
                                let docs = [];

                                for (let i = 0; i < jp[journalParams].length; i++) {
                                    let likeArr = [];
                                    for (let j = 0; j < sims.length; j++) {
                                        likeArr.push(`digest LIKE '%${sims[j].msisdn}%'`);
                                    }
                                    let rows = await toolbox.sqlRequest(base, `
                                        SELECT * FROM ${jp[journalParams][i]} 
                                        WHERE ${likeArr.join(" OR ")}
                                    `);


                                    for (let j = 0; j < sims.length; j++) {
                                        // console.log("sims[j].d_sold=> ", sims[j].d_sold, " msisdn=> ", sims[j].msisdn);
                                        for (let k = 0; k < rows.length; k++) {
                                            let xml = await toolbox.xmlToJs(rows[k].data);
                                            if (xml.Document.MSISDN[0] == sims[j].msisdn && xml.Document.ICC[0] == sims[j].icc) {
                                                let sdocdate = toolbox.moment(rows[k].jdocdate, "YYYYMMDD");
                                                let dpCode = "", assignedDpCode = "";
                                                let fio = "", dul = "", birth = "";
                                                if (typeof xml.Document.DPCodeKind !== "undefined" && typeof xml.Document.DPCodeKind[0] !== "undefined") dpCode = xml.Document.DPCodeKind[0];
                                                if (typeof xml.Document.AssignedDPCode !== "undefined" && typeof xml.Document.AssignedDPCode[0] !== "undefined") assignedDpCode = xml.Document.AssignedDPCode[0];
                                                if (showUserData) {
                                                    fio = `${xml.Document.LastName[0]} ${xml.Document.FirstName[0]} ${xml.Document.SecondName[0]}`;
                                                    dul = `${xml.Document.FizDocSeries[0].replace(" ", "")} ${xml.Document.FizDocNumber[0]}`;
                                                    birth = xml.Document.Birth[0];
                                                }
                                                sims[j].dpCode = dpCode;
                                                sims[j].assignedDpCode = assignedDpCode;
                                                sims[j].fio = fio;
                                                sims[j].dul = dul;
                                                sims[j].birth = birth;
                                                sims[j].jtype = jru[journalParams][i];
                                                sims[j].date = sdocdate.format("DD.MM.YYYY");
                                                break;
                                            }
                                        }
                                    }


                                }
                              



                                obj.schema.push({name: 'msisdn', type: 'string', title: 'MSISDN'});
                                obj.schema.push({name: 'icc', type: 'string', title: 'ICC'});
                                obj.schema.push({name: 'date', type: 'date', title: 'Дата продажи в журнале'});
                                obj.schema.push({name: 'd_sold', type: 'date', title: 'Дата продажи в справочнике'});
                                obj.schema.push({name: 'jtype', type: 'string', title: 'Журнал-источник'});
                                obj.schema.push({name: 'jtype_sim', type: 'string', title: 'Справочник-источник'});
                                obj.schema.push({name: 'owner', type: 'string', title: 'Владелец'});
                                obj.schema.push({name: 'plan', type: 'string', title: 'ТП'});
                                obj.schema.push({name: 'fs', type: 'string', title: 'ФС'});
                                obj.schema.push({name: 'dpCode', type: 'string', title: 'Тип точки'});
                                obj.schema.push({name: 'assignedDpCode', type: 'string', title: 'Код точки'});
                                if (showBalance) obj.schema.push({name: 'balance', type: 'string', title: 'Баланс'});
                                if (showPartyNum) obj.schema.push({name: 'partyNum', type: 'string', title: 'Номер партии'});
                                if (showUserData) {
                                    obj.schema.push({name: 'fio', type: 'string', title: 'ФИО'});
                                    obj.schema.push({name: 'dul', type: 'string', title: 'ДУЛ'});
                                    obj.schema.push({name: 'birth', type: 'date', title: 'Дата рождения'});
                                }
                               

                                // добавим в схему доп поля, которые пришли от пользователя
                                for (let i = 0; i < sims.length; i++) {
                                    for (let key in sims[i]) {
                                        let s = obj.schema.find(item=> item.name == key);
                                        if (typeof s === "undefined") obj.schema.push({name: key, type: 'string', title: key});
                                    }
                                }

                                obj.list = sims;
                            }   
                        }
                    }
                   
                    if (obj.errs.length == 0) {
                        // сформируем excel файл
                        obj.status  = 1;
                        let excel = toolbox.getExcel;
                        var workbook = new excel.Workbook();
                        var worksheet = workbook.addWorksheet('Sheet 1');
                        var style = workbook.createStyle({
                          font: {
                            // color: '#FF0800',
                            size: 12
                          },
                          // numberFormat: '$#,##0.00; ($#,##0.00); -'
                        });

                        for (let i = 0; i < obj.schema.length; i++) {
                            worksheet.cell(1, i + 1).string(obj.schema[i].title);
                        }

                        for (let i = 0; i < obj.list.length; i++) {
                            for (let j = 0; j < obj.schema.length; j++) {
                                // console.log("obj.list[i][schema[j].name]=> ", obj.list[i][schema[j].name]);
                                try {
                                    if (typeof obj.list[i][obj.schema[j].name] !== "undefined" && obj.list[i][obj.schema[j].name] !== null) worksheet.cell(i + 2, j + 1).string(obj.list[i][obj.schema[j].name].toString());  
                                    else worksheet.cell(i + 2, j + 1).string(""); 
                                } catch(e) {
                                    console.log("ошибка ", e);
                                }
                                                                         
                            }
                        }

                        let hash = toolbox.getHash();
                        let link = `report_${base}_${hash}.xlsx`;
                        obj.link = link;
                        workbook.write(`${__dirname}/temp/${link}`);
                    } else obj.errs.push("Данная команда subaction не обслуживается");
                   
                } else obj.errs.push("Вы не указали базу");
            } else obj.errs.push("Параметр subaction обязателен!");
        }
        return obj;
    }
    // async test() {
    //     let buffer = fs.readFileSync(`${__dirname}/printing_forms/documents/mts/test.pdf`);
    //     let pdfDoc = await pdfLib.PDFDocument.load(buffer);
    //     pdfDoc.registerFontkit(fontkit);

    //     const fontBytes = fs.readFileSync(`${__dirname}/fonts/arial.ttf`);
    //     const customFont = await pdfDoc.embedFont(fontBytes);

    //     const form = pdfDoc.getForm();
    //     let phone = form.getTextField('phone');
    //     phone.setText("9288281650");
    //     phone.updateAppearances(customFont);
    //     let icc = form.getTextField('iccid');
    //     icc.setText("8970101708754785885");
    //     icc.updateAppearances(customFont);
    //     form.flatten();
    //     fs.writeFileSync(`${__dirname}/printing_forms/documents/mts/output.pdf`, await pdfDoc.save());
    // }
    async printReplacement(packet, toolbox, base, user) {
        console.log('запрос на создание печатной формы Замена SIM');
        let obj = {};
        let err = [];
        obj.data = [];
        let ids = packet.data.list;
        obj.base = packet.data.base;
        let rows = [];
        for (let id of ids) {
            let rw = await toolbox.sqlRequest(base, `SELECT data FROM journal WHERE id = ${id}`);
            if (rw.length > 0) rows.push(rw[0]);
        }
        if (rows.length > 0) {
            let schema = JSON.parse(fs.readFileSync(`${__dirname}/printing_forms/replacement/mts/schema.json`, 'utf8'));

            let doc = new PDFDocument({
                autoFirstPage: false,
                bufferPages: true
            });

            let hash = toolbox.getHash();
            obj.link = `mts_${hash}.pdf`;
            doc.pipe(fs.createWriteStream(`${__dirname}/printing_forms/temp/mts_${hash}.pdf`));

            for (let row of rows) {
                // console.log(row);
                let dataContract = await toolbox.xmlToJs(row.data);
                
                doc.addPage({
                    // size: 'LEGAL',
                    // layout: 'portrait'
                });
                doc.page.margins.bottom = 0;

                doc.image(`${__dirname}/printing_forms/replacement/mts/replacementForm.jpg`, 15, -15, {width: doc.page.width-15, height: doc.page.height+15})
                .font(`${__dirname}/fonts/arial.ttf`)
                .fontSize(10)
                .moveDown(0.5);
                
                for (let key in dataContract.Document) {
                    // doc.switchToPage(range.start);
                    // console.log("range=>", range);
                    if (typeof schema[key] !== 'undefined') {
                        // doc.font(`${__dirname}/fonts/arial.ttf`)
                        if (typeof schema[key].variants === 'undefined') {
                            let characterSpacing = typeof schema[key].css.characterSpacing !== 'undefined' ? schema[key].css.characterSpacing : 0;
                            let size = typeof schema[key].css.size !== 'undefined' ? doc.fontSize(schema[key].css.size) : doc.fontSize(10);
                            // console.log("characterSpacing=>", characterSpacing);
                            doc.font(`${__dirname}/fonts/arial.ttf`)
                            .text(dataContract.Document[key][0], schema[key].left, schema[key].top, {
                                width: schema[key].css.width, 
                                characterSpacing: characterSpacing,
                                size: size
                            })
                            // .moveDown();
                        } else {
                            for (let variant in schema[key].variants) {
                                let text = '';
                                let size = typeof schema[key].css.size !== 'undefined' ? doc.fontSize(schema[key].css.size) : doc.fontSize(10);
                                if (schema[key].variants[variant].text.action === 'substring') {
                                    let from = schema[key].variants[variant].text.from;
                                    let to = schema[key].variants[variant].text.to;
                                    text = dataContract.Document[key][0].substring(from, to);
                                    doc.font(`${__dirname}/fonts/arial.ttf`)
                                    .text(text, schema[key].variants[variant].left, schema[key].variants[variant].top, {
                                        width: schema[key].variants[variant].width, 
                                        characterSpacing: schema[key].css.characterSpacing,
                                        size: size
                                    })
                                } else if (schema[key].variants[variant].text.action === 'list') {
                                    let text = schema[key].variants[variant].text.list[dataContract.Document[key][0]].title;
                                    let left =  schema[key].variants[variant].text.list[dataContract.Document[key][0]].left;
                                    let top =  schema[key].variants[variant].text.list[dataContract.Document[key][0]].top;
                                    let width = schema[key].variants[variant].text.list[dataContract.Document[key][0]].width;
                                    doc.font(`${__dirname}/fonts/arial.ttf`)
                                    .text(text, left, top, {
                                        width: width, 
                                        characterSpacing: schema[key].css.characterSpacing,
                                        size: size
                                    })
                                } else if (schema[key].variants[variant].text.action === 'join') {
                                    let text = '';
                                    let characterSpacing = typeof schema[key].css.characterSpacing !== 'undefined' ? schema[key].css.characterSpacing : 0;
                                    let left =  schema[key].variants[variant].text.left;
                                    let top =  schema[key].variants[variant].text.top;
                                    let width = schema[key].variants[variant].text.width;
                                    let arr = [];
                                    for (let f of schema[key].variants[variant].text.fields) {
                                        if (dataContract.Document[f][0] !== '') {
                                            let t = '';
                                            if (typeof schema[key].variants[variant].text.fieldsAdd[f] !== 'undefined') {
                                                t = `${schema[key].variants[variant].text.fieldsAdd[f]}${schema[key].variants[variant].text.symbolSpace}${dataContract.Document[f][0]}`;
                                            } else t = dataContract.Document[f][0];
                                            arr.push(t);
                                        }
                                    }
                                    text = arr.join(schema[key].variants[variant].text.separator);
                                    doc.font(`${__dirname}/fonts/arial.ttf`)
                                    .text(text, left, top, {
                                        width: width, 
                                        characterSpacing: characterSpacing,
                                        size: size
                                    })
                                } else if (schema[key].variants[variant].text.action === 'dicts') {
                                    // console.log("dataContract.Document[key][0]=> ", dataContract.Document[key][0]);
                                    let characterSpacing = typeof schema[key].css.characterSpacing !== 'undefined' ? schema[key].css.characterSpacing : 0;
                                    let dict = schema[key].variants[variant].text.dict;
                                    let text = '';
                                    let left = schema[key].variants[variant].text.left;
                                    let top = schema[key].variants[variant].text.top;
                                    let width = schema[key].variants[variant].text.width;
                                    let value = '';
                                    if (schema[key].variants[variant].text.tag === '_') {
                                        let value = dataContract.Document[key][0]._;
                                        let colName = schema[key].variants[variant].text.col_name;
                                        let row = await toolbox.sqlRequest(base, `SELECT title FROM ${dict} WHERE ${colName} = '${value}'`);
                                        if (row.length > 0) text = row[0].title;
                                    } else if (schema[key].variants[variant].text.tag === '$') {
                                        let value = dataContract.Document[key][0]._;
                                        text = value;
                                    } else {
                                        let characterSpacing;
                                        if (typeof schema[key].variants[variant].text.characterSpacing !== 'undefined') {
                                            characterSpacing = schema[key].variants[variant].text.characterSpacing;
                                        } else {
                                            characterSpacing = typeof schema[key].css.characterSpacing !== 'undefined' ? schema[key].css.characterSpacing : 0;
                                        }
                                        let text = '';
                                        let dict = schema[key].variants[variant].text.dict;
                                        let colName = schema[key].variants[variant].text.col_name;
                                        let left = schema[key].variants[variant].text.left;
                                        let top = schema[key].variants[variant].text.top;
                                        let width = schema[key].variants[variant].text.width;
                                        if (typeof schema[key].variants[variant].text.join !== 'undefined') {
                                            let search = schema[key].variants[variant].text.search;
                                            let row = await toolbox.sqlRequest(base, `SELECT rvalue FROM ${dict} WHERE ${colName} = '${search}'`);
                                            if (row.length > 0) text = `${row[0].rvalue}${dataContract.Document[key][0]}`;
                                            doc.font(`${__dirname}/fonts/arial.ttf`)
                                            .text(text, left, top, {
                                                width: width, 
                                                characterSpacing: characterSpacing,
                                                size: size
                                            })
                                        } else {
                                            let search = schema[key].variants[variant].text.search;
                                            let row = await toolbox.sqlRequest(base, `SELECT rvalue FROM ${dict} WHERE ${colName} = '${search}'`);
                                            if (row.length > 0) text = `${row[0].rvalue}`;
                                            doc.font(`${__dirname}/fonts/arial.ttf`)
                                            .text(text, left, top, {
                                                width: width, 
                                                characterSpacing: characterSpacing,
                                                size: size
                                            })
                                        }
                                        
                                    }
                                    doc.font(`${__dirname}/fonts/arial.ttf`)
                                    .text(text, left, top, {
                                        width: width, 
                                        characterSpacing: characterSpacing,
                                        size: size
                                    })
                                } 
                            }
                        }
                    }
                }

                // фио
                if (typeof schema.FIO !== 'undefined') {
                    let characterSpacing = typeof schema.FIO.css.characterSpacing !== 'undefined' ? schema.FIO.css.characterSpacing : 0;
                    let size = typeof schema.FIO.css.size !== 'undefined' ? doc.fontSize(schema.FIO.css.size) : doc.fontSize(10);
                    let left = schema.FIO.variants.left;
                    let top = schema.FIO.variants.top;
                    let width = schema.FIO.css.width;
                    let text = dataContract.Document[schema.FIO.variants.mainField][0];
                    for (let field of schema.FIO.variants.fields) {
                        text += ` ${dataContract.Document[field][0].substring(0, 1)}.`;
                    }
                    doc.font(`${__dirname}/fonts/arial.ttf`)
                    .text(text, left, top, {
                        width: width, 
                        characterSpacing: characterSpacing,
                        size: size
                    })
                }

                 // фиксированные поля
                if (typeof schema.FIXED_FIELDS !== 'undefined') {
                    for (let field of schema.FIXED_FIELDS.FIELDS) {
                        let characterSpacing = typeof field.characterSpacing !== 'undefined' ? field.characterSpacing : 0;
                        let size = typeof field.size !== 'undefined' ? doc.fontSize(field.size) : doc.fontSize(10);
                        let left = field.left;
                        let top = field.top;
                        let width = field.width;
                        let text = field.text;
                        doc.font(`${__dirname}/fonts/arial.ttf`)
                        .text(text, left, top, {
                            width: width, 
                            characterSpacing: characterSpacing,
                            size: size
                        })
                    }
                }

                if (typeof schema.DEALER_NAME !== 'undefined') {
                    let characterSpacing = typeof schema.DEALER_NAME.css.characterSpacing !== 'undefined' ? schema.DEALER_NAME.css.characterSpacing : 0;
                    let size = typeof schema.DEALER_NAME.css.size !== 'undefined' ? doc.fontSize(schema.DEALER_NAME.css.size) : doc.fontSize(10);
                    let left = schema.DEALER_NAME.variants.left;
                    let top = schema.DEALER_NAME.variants.top;
                    let width = schema.DEALER_NAME.css.width;
                    let text = dataContract.Document[schema.DEALER_NAME.variants.mainField][0];
                    for (let field of schema.DEALER_NAME.variants.fields) {
                        text += ` ${dataContract.Document[field][0].substring(0, 1)}.`;
                    }
                    doc.font(`${__dirname}/fonts/arial.ttf`)
                    .text(text, left, top, {
                        width: width, 
                        characterSpacing: characterSpacing,
                        size: size
                    })
                }
            }
            doc.end();
        }
        return obj;
    }
    // версия 1
    async getStartFields(packet, toolbox, base, user, adapter) {
        console.log("getStartFields");
        let err = [];
        let obj = {};
        obj.hash = packet.data.hash;
        obj.subaction = packet.data.subaction;
        obj.vendor = 'MTS';
        obj.base = packet.data.base;
        obj.action = 'startFields';
        obj.list = [{title: 'ICC', value: 'ICC'}];  

        return obj;
    }
    async checkStartFields( packet, toolbox, base, user, adapter ) {
        console.log('checkStartFields');
        let obj = {};
        let err = [];
        // obj.list = {fixed: {}, dynamic: []};
        obj.hash = packet.data.hash;    
        obj.status = -1;
        
        let contract = new Contract( );
        let maket = contract.maket();
        if (typeof packet.data.ICC !== 'undefined') {
            let ICC = packet.data.ICC;
            if (typeof ICC !== 'undefined') {
                if (ICC.length == 10) {
                    // console.log(`SELECT * FROM um_data WHERE icc='${ICC}' AND date_sold='' AND status != '2'`);
                    let row = await toolbox.sqlRequest(base, `SELECT * FROM um_data WHERE icc = '${ICC}' AND date_sold = '' AND status = '1'`);
                    if (row.length > 0) {
                        obj.status = 1;
                        let sim = {
                            ICC: ICC,
                            TypeSim: row[0].type_sim,
                            FS: row[0].fs,
                            Owner: row[0].owner_id,
                            Balance: row[0].balance
                        }
                        if (row[0].region_id) sim.RegionId = row[0].region_id;

                        maket.CONTRACT_INFORMATION.SIM.ICC = ICC;
                        maket.CONTRACT_INFORMATION.SIM.TYPE = row[0].type_sim;
                        maket.CONTRACT_INFORMATION.SIM.BALANCE = row[0].balance;
                        maket.CONTRACT_INFORMATION.UNIT = row[0].owner_id;
                        maket.CONTRACT_INFORMATION.FS = row[0].fs;
                        maket.CONTRACT_INFORMATION.REGION = row[0].region_id;

                        obj.fixed = [
                            'CONTRACT_INFORMATION.SIM.ICC',
                            'CONTRACT_INFORMATION.SIM.TYPE',

                        ]
                        obj.contract = maket;
                    } else {    
                        err.push('Данные о SIM отсутствуют. Или она уже продана. Или она не распределена');
                    }
                } else {
                    err.push('Длина ICC должна быть 10 символов');
                }
            } else {
                err.push('Вы не указали ICC');
            }
        } else {
            err.push('Вы не указали данных для проверки');
        }       
        if (err.length > 0) obj.err = err;

        return obj;
    }
    async getBaseName( packet, toolbox, base, user, adapter ) {
        console.log('getBaseName');
        let obj = {};
        let err = [];
        obj.hash = packet.data.hash;    
        obj.status = -1;
        obj.action = 'getBaseName';
        obj.subaction = packet.data.subaction;
        obj.vendor = 'MTS';
        obj.base = packet.data.base;

        let row = await toolbox.sqlRequest(base, `SELECT rvalue FROM registers WHERE rname = 'config_name'`);
        // console.log( 'row=> ', row );
        if ( row.length > 0) {
            obj.title = row[0].rvalue;
            obj.status = 1;
        }

        if (err.length > 0) obj.err = err;
        return obj;
    }
    async getBaseDicts ( packet, toolbox, base, user, adapter, schemas, dicts ) {       
        let obj = {};
        let err = [];
        obj.list = {};
        dicts.map(item=> obj.list[item.name] = item.data);
        return obj;
    }
}	


module.exports = AdapterMTSApi;