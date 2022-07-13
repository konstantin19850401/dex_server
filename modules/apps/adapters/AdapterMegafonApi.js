const fs = require('fs');
const PDFDocument = require('pdfkit');
const pdf2base64 = require('pdf-to-base64');
// const codes = require('rescode');
// const bwipjs = require('bwip-js');

class AdapterMegafonApi {
    #appid = "adapters";
    #operator = "MEGAFON";
	constructor() {
        this.docid = 'DEXPlugin.Document.Mega.EFD.Fiz';
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
    async list(packet, toolbox, base, user, adapter, schemas, dicts, core) {
        // console.log("list ", base);
        console.log('запрос');
        let obj = {};
        let err = [];
        obj.list = [];
        obj.operator = 'MEGAFON';
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
        }
        console.log('отдали ответ');
        if (err.length > 0) obj.err = err;
        else obj.status = 1;
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
                    //     if (typeof packet.data.filter.search !== "undefined" && packet.data.filter.search != "")  search = packet.data.filter.search;
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
                                        sc.foreignKey = `${tle.dict}.id`;
                                        sc.type = "number";
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
    async dicts(packet, toolbox, base, user) {
        let dicts = {
            'units': `${base}.units`, 
            'users': `${base}.users`, 
            'sim': `${base}.um_data`, 
            'statuses': 'dex_bases.dex_dict_doc_statuses',
            'doctypes': 'dex_bases.dex_dict_doc_types',
            'docfields': 'dex_bases.dex_dict_doc_fields',
            'journalhooks': 'dex_bases.dex_dict_journalhooks'
        };
        let obj = {};
        let err = [];
        obj.list = {};
        let appConfigufation = user.appsConfig('adapters');
        if (packet.data.subaction === 'show') {
            // console.log('отдаем справочник ', packet.data.dict);

            for (let dict of packet.data.dicts) {
                if (typeof dict !== 'undefined') {
                    // obj.dicts = {dict: dict, list: []};
                    // obj.list[dict] = [];
                    obj.list[dict] = {dictName: dict, elements: []};
                    if (typeof appConfigufation.configuration.accesses.list.dicts[dict] !== 'undefined') {
                        if (appConfigufation.configuration.accesses.list.dicts[dict].actions.indexOf('show') != -1) {
                            let arr = dicts[dict].split('.');
                            let cbase = arr[0];
                            let ctable = arr[1];
                            let where = '';
                            let orderby = '';
                            if (typeof packet.data.onlyActual !== 'undefined' && (packet.data.onlyActual === 1 || packet.data.onlyActual === 0)) {
                                where = `WHERE status = '${packet.data.onlyActual}'`;
                            }
                            if (dict === 'units') {
                                orderby = 'ORDER BY title';
                            }
                            let sqlString = `
                                SELECT * FROM ${ctable}
                                ${where} ${orderby}
                            `;
                            let result = await toolbox.sqlRequest(cbase, sqlString);
                            console.log("отдали справочник");
                            for (let i=0; i<result.length; i++) obj.list[dict].elements.push(result[i]);
                        } else {
                            err.push('Настройками программы вам запрещено просмативать данный справочник');
                        }
                    } else {
                        err.push('Указанный справочник не существует');
                    }
                } else {
                    err.push('Вам необходимо указать справочник, данные которого вы хотите получить');
                }
            }
            // let dict = packet.data.dict;
            // if (typeof dict !== 'undefined') {
            //  obj.dict = dict;
            //  if (typeof appConfigufation.configuration.accesses.list.dicts[dict] !== 'undefined') {
            //      if (appConfigufation.configuration.accesses.list.dicts[dict].actions.indexOf('show') != -1) {
            //          let arr = dicts[dict].split('.');
            //          let cbase = arr[0];
            //          let ctable = arr[1];
            //          let where = '';
            //          let orderby = '';
            //          if (typeof packet.data.onlyActual !== 'undefined' && (packet.data.onlyActual === 1 || packet.data.onlyActual === 0)) {
            //              where = `WHERE status = '${packet.data.onlyActual}'`;
            //          }
            //          if (dict === 'units') {
            //              orderby = 'ORDER BY title';
            //          }
            //          let sqlString = `
            //              SELECT * FROM ${ctable}
            //              ${where} ${orderby}
            //          `;
            //          let result = await toolbox.sqlRequest(cbase, sqlString);
            //          console.log("отдали справочник");
            //          for (let i=0; i<result.length; i++) obj.list.push(result[i]);
            //      } else {
            //          err.push('Настройками программы вам запрещено просмативать данный справочник');
            //      }
            //  } else {
            //      err.push('Указанный справочник не существует');
            //  }
            // } else {
            //  err.push('Вам необходимо указать справочник, данные которого вы хотите получить');
            // }
        } else if (packet.data.subaction === 'users') {
 
        } else if (packet.data.subaction === 'sim') {

        } else {
            err.push('Данный справочник не существует или запрещен для вас');
        }
        if (err.length > 0) obj.err = err;
        return obj;
    }
	async printForm(packet, toolbox, base, user) {
		let obj = {};
		let err = [];
		// obj.data = [];
		// let ids = packet.data.list.join(',');
		obj.base = packet.data.base;
        // let rows = await toolbox.sqlRequest(base, `SELECT data FROM journal WHERE id IN (${ids})`);
        let ids = packet.data.list;
        let rows = [];
        for (let id of ids) {
            let rw = await toolbox.sqlRequest(base, `SELECT data FROM journal WHERE id = ${id}`);
            if (rw.length > 0) rows.push(rw[0]);
        }
        try {
            if (rows.length > 0) {
                let schema = JSON.parse(fs.readFileSync(`${__dirname}/printing_forms/documents/megafon/schema.json`, 'utf8'));

                let doc = new PDFDocument({
    	            autoFirstPage: false,
    	            bufferPages: true
    	        });

                let hash = toolbox.getHash();
                obj.link = `megafon_${hash}.pdf`;
                doc.pipe(fs.createWriteStream(`${__dirname}/printing_forms/temp/megafon_${hash}.pdf`));

                for (let row of rows) {
                	// console.log(row);
                	let dataContract = await toolbox.xmlToJs(row.data);
                	
                	doc.addPage({
    				    // size: 'LEGAL',
    				    // layout: 'portrait'
    				});
                    doc.page.margins.bottom = 0;
                	// doc.page.margins.top = 0;

                	doc.image(`${__dirname}/printing_forms/documents/megafon/documentForm.jpg`, 10, 10, {width: 590, height: 770, align: 'center'})
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
                	// теперь добавить штрих код
        			if (typeof schema.BARCODE !== 'undefined') {
        				let left = schema.BARCODE.variants.left;
        				let top = schema.BARCODE.variants.top;
        				let width = schema.BARCODE.css.width;
        				let height = schema.BARCODE.css.height;

    	    			let arr = [];
        				for (let field of schema.BARCODE.variants.fields) {
        					arr.push(dataContract.Document[field][0]);
        				}
        				let text = arr.join('');
        				if (schema.BARCODE.variants.text) text = schema.BARCODE.variants.text;
                        if (schema.BARCODE.variants.preText) text = `${schema.BARCODE.variants.preText}${text}`;
    	    			let png = await toolbox.generateBarCode('code128', text);
    	    			doc.image(png, left, top, {width: width, height: height})

                        if (typeof schema.BARCODE.variants.includetext !== 'undefined') {
                            let characterSpacing = typeof schema.BARCODE.variants.includetext.characterSpacing !== 'undefined' ? schema.BARCODE.variants.includetext.characterSpacing : 0;
                            let size = typeof schema.BARCODE.variants.includetext.size !== 'undefined' ? doc.fontSize(schema.BARCODE.variants.includetext.size) : doc.fontSize(10);
                            let width = schema.BARCODE.variants.includetext.width;
                            doc.font(`${__dirname}/fonts/arial.ttf`)
                            .text(text, (left + schema.BARCODE.variants.includetext.left), (top + schema.BARCODE.variants.includetext.top), {
                                width: width,
                                characterSpacing: characterSpacing,
                                size: size
                            })
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

                    // вариации
                    if (typeof schema.VARIATION !== 'undefined') {
                        for (let variant of schema.VARIATION) {
                            // console.log(dataContract.Document);
                            if (typeof dataContract.Document[variant.field] !== 'undefined') {
                                // console.log("vvv");
                                for (let varn of variant.variants) {

                                    console.log("varn=>", varn, " variant.field=>", variant.field);
                                    // console.log("typeof=>", typeof varn.if, ' ====>', dataContract.Document[variant.field][0], varn.if.indexOf(1));
                                    let value = parseInt(dataContract.Document[variant.field][0]);
                                    if (varn.if.indexOf(value) != -1) {
                                        // console.log("а вот да");
                                        let left = varn.left;
                                        let top = varn.top;
                                        let width = varn.width;
                                        let characterSpacing = typeof varn.characterSpacing !== 'undefined' ? varn.characterSpacing : 0;
                                        let size = typeof varn.size !== 'undefined' ? doc.fontSize(varn.size) : doc.fontSize(10);
                                        let text = '';
                                        if (varn.action === 'fix') text = varn.text;
                                        else if (varn.action === 'docField') text = dataContract.Document[varn.text][0];
                                        else if (varn.action === 'frombase') {
                                            let row = await toolbox.sqlRequest(base, `SELECT ${varn.search_col_name} FROM ${varn.table} WHERE ${varn.where_col_name} = '${value}'`);
                                            console.log("row=> ", row);
                                            if (row.length > 0) text = row[0][varn.search_col_name];
                                        }
                                        doc.font(`${__dirname}/fonts/arial.ttf`)
                                        .text(text, left, top, {
                                            width: width, 
                                            characterSpacing: characterSpacing,
                                            size: size
                                        })
                                        // break;
                                    }    
                                }
                            } else {
                                console.log("А вот нет");
                            }
                        }
                    }
                    // Прочие поля
                    if (typeof schema.FIELDS !== 'undefined') {
                    	for (let field of schema.FIELDS) {
                    		if (field.action === 'frombase') {
                    			let row = await toolbox.sqlRequest(base, `SELECT ${field.search_col_name} FROM ${field.table} WHERE ${field.where_col_name} = '${field.text}'`);
                    			if (row.length > 0) {
                    				let left = field.left;
                                    let top = field.top;
                                    let width = field.width;
                                    let characterSpacing = typeof field.characterSpacing !== 'undefined' ? field.characterSpacing : 0;
                                    let size = typeof field.size !== 'undefined' ? doc.fontSize(field.size) : doc.fontSize(10);
                                    let text = row[0][field.search_col_name];
                                    doc.font(`${__dirname}/fonts/arial.ttf`)
                                    .text(text, left, top, {
                                        width: width, 
                                        characterSpacing: characterSpacing,
                                        size: size
                                    })
                    			} else {
                    				console.log("нет полей");
                    			}
                    		}
                    	}
                    }
                }
    			doc.end();
            }
        } catch(e) {
            console.log(e);
            obj.status = -1;
            obj.err = err;
            obj.err.push(toolbox.formatingExc(e));
        }
        if (err.length > 0) obj.err = err;
        else obj.status = 1;
        console.log("obj=> ", obj);
		return obj;
	}
    async hooks(packet, toolbox, base, user, adapter) {
        // console.log("выбрали зацепку");
        let obj = {};
        let err = [];
        // obj.list = [];       
        obj.hash = packet.data.hash;
        obj.action = 'hooks';
        obj.subaction = packet.data.subaction;
        obj.base = packet.data.base;
        obj.vendor = 'MEGAFON';
        if (packet.data.subaction === 'document.print.doc') {
            if (typeof packet.data.list !== 'undefined') {
                obj.subaction = packet.data.subaction;
                if (packet.data.list.length > 0) {
                    let prt = await this.printForm(packet, toolbox, base, user);
                    obj.link = prt.link;
                    obj.base = packet.data.base;
                    obj.status = prt.status;
                    // console.log("prt=> ", prt);
                } else {
                    err.push('Вы не указали документы, которые следует распечатать');
                }
            } else {
                err.push('Параметр list не может отсутствовать');
            }
        } else {
            err.push('Выбранная зацепка не обрабатывается');
        }
        // console.log("obj==> ", obj);
        if (err.length > 0) obj.err = err;
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
                        let showPartyNum = false, showBalance = false, showUserData = false, journalParams = "journal"; 
                        let jparams = ["journal", "archive", "journalAndArchive"];
                        if (typeof packet.data.filter === "undefined") obj.errs.push("Вы не указали фильтр");
                        else {
                            if (typeof packet.data.filter.showPartyNum === "boolean" ) showPartyNum = packet.data.filter.showPartyNum;
                            if (typeof packet.data.filter.showBalance === "boolean" ) showBalance = packet.data.filter.showBalance;
                            if (typeof packet.data.filter.showUserData === "boolean" ) showUserData = packet.data.filter.showUserData;
                            if (typeof packet.data.filter.journalParams !== "undefined" && jparams.indexOf(packet.data.filter.journalParams) != -1) journalParams = packet.data.filter.journalParams;
                            else obj.errs.push("Вы указали не верные параметры журнала");
                            if (typeof packet.data.filter.sims !== "undefined" && Array.isArray(packet.data.filter.sims)) journalParams = packet.data.filter.journalParams;
                            else obj.errs.push("Вы не указали данные для сверки");

                            if (obj.errs.length == 0) {
                                
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

    async getBaseName( packet, toolbox, base, user, adapter ) {
        console.log('getBaseName');
        let obj = {};
        let err = [];
        obj.hash = packet.data.hash;    
        obj.status = -1;
        obj.action = 'getBaseName';
        obj.subaction = packet.data.subaction;
        obj.vendor = 'MEGAGFON';
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
}	
module.exports = AdapterMegafonApi;