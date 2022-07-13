// const PDFDocument = require('pdfkit');
// const pdf2base64 = require('pdf-to-base64');
const fs = require('fs');
const Contract = require('./Contract');
const Sim = require('./Sim');
const Unit = require('./Unit');
// var fillPdf = require("fill-pdf");
// var pdfFiller   = require('pdffiller');
// const utf8 = require('utf8');
// const encoding = require('encoding');
// const autoenc = require('node-autodetect-utf8-cp1251-cp866');

// var pdfFillForm = require('pdf-fill-form');
// import pdfFiller from 'pdffiller-stream';
// const pdfFiller = require('pdffiller-stream');
const PDFDocument = require('pdfkit');
const pdf2base64 = require('pdf-to-base64');

class AdapterYotaApi {
	#appid = "adapters";
    #operator = "YOTA";
	constructor() {

		this.docid = 'DEXPlugin.Document.Yota.Contract';
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
	// async listV1( packet, toolbox, base, user, adapter, schemas, dicts, core ) {
	// 	console.log(`запрос listV1 для appid = adapters`);
	// 	let obj = {status: -1, errs: [], list: []};
	// 	let userConfiguration = this.#ValidateUser( user );
	// 	if ( userConfiguration.errs.length > 0 ) obj.errs = userConfiguration.errs;
	// 	else {
	// 		if (typeof packet.data.subaction !== "undefined") {
	// 			if (packet.data.subaction == "period") {
	// 				let start, end, base, search = "", units = [], statuses = [];
	// 				if (typeof packet.data.filter === "undefined") {
	// 					start = toolbox.moment().format('YYYYMMDD');
	// 					end = start;
	// 					packet.data.filter = {};
	// 				} else {
	// 					if (typeof packet.data.filter.start !== "undefined") start = toolbox.moment(packet.data.filter.start).format('YYYYMMDD');
	// 					if (!start.isValid())  start = toolbox.moment().format('YYYYMMDD');
	// 					if (typeof packet.data.filter.end !== "undefined") end =  toolbox.moment(packet.data.filter.end).format('YYYYMMDD');
	// 					if (!end.isValid()) end = start;
	// 					if (typeof packet.data.filter.units !== "undefined" && Array.isArray(packet.data.filter.units) && packet.data.filter.units.length > 0) units = packet.data.filter.units;
	// 					if (typeof packet.data.filter.status !== "undefined" && Array.isArray(packet.data.filter.status) && packet.data.filter.status.length > 0) statuses = packet.data.filter.statuses;
	// 					if (typeof packet.data.filter.search !== "undefined" && packet.data.filter.search != "")  search = packet.data.filter.search;
	// 				}
	// 				obj.start = start; obj.end = end;
	// 				if (typeof packet.data.base !== "undefined") base = packet.data.base;
	// 				else obj.errs.push("Вы не указали базу");


	// 				if (obj.errs.length == 0) {
	// 					// схема по умолчанию
	// 					let schema = [
	// 						{name: "id", len: 10, title: "ID", type: "number", unique: true },
	// 						{name: "status", len: 5, title: "Статус", type: "number", unique: false },
	// 						{name: "unitid", len: 10, title: "Отделение", type: "number", unique: false },
	// 						{name: "digest", len: 100, title: "Описание", type: "string", unique: false },
	// 						{name: "docid", len: 100, title: "Тип документа", type: "string", unique: false },
	// 						{name: "jdocdate", len: 100, title: "Дата документа", type: "string", unique: false }
	// 					];
	// 					let sqlRequest = "SELECT ";
	// 					let arr = [];
	// 					schema.map(item=> arr.push(item.name));
	// 					sqlRequest += arr.join(",");

	// 					// проверить, есть ли для пользователя и этой базы запись в справочнике видимых полей
	// 					let flds = await toolbox.sqlRequest('skyline1', `
	// 						SELECT * FROM dict_dex_visible_fields 
	// 						WHERE author = '${user.UserId}' AND base = '${base}'
	// 					`);
						
	// 					if (flds.length != 0) sqlRequest = sqlRequest.concat(", data");
	// 					sqlRequest += ` WHERE jdocdate > '${start}000000000' AND jdocdate < '${end}235959999`;
	// 					if (units.length > 0) sqlString +=  ` AND unitid IN (${units.join(',')})`;
	// 					if (statuses.length > 0) sqlString +=  ` AND statuses IN (${statuses.join(',')})`;
	// 					let rows = await toolbox.sqlRequest(base, sqlRequest);

	// 					console.log("rows=> ", rows);



	// 					// теперь добавим в схему поля
	// 						// let rows = await toolbox.sqlRequest('skyline1', `
	// 						// 	SELECT uid, title 
	// 						// 	FROM dict_dex_data_fields
	// 						// 	WHERE uid IN (${flds.flds})
	// 						// `);
							
	// 				}
	// 			}

	// 		} else obj.errs.push("Параметр subaction обязателен!");
	// 	}
	// 	return obj;
	// }
	async list(packet, toolbox, base, user, adapter, schemas, dicts, core) {
		// console.log("list ", base);
		console.log('запрос ', packet);
		let obj = {};
		let err = [];
		obj.list = [];
		obj.operator = 'YOTA';
		obj.status = -1;
		let start, end, lowerCaseSearch;
		if (packet.data.subaction === 'period') {
			console.log('запрос периода');
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
				console.log('====> ', appConfigufation);
				if (appConfigufation.configuration.accesses.list.documents[this.docid].actions.indexOf("show") != -1) {
					// console.log("");
					obj.base = packet.data.base;
					let sqlString = `
						SELECT * FROM journal
						WHERE jdocdate > '${start}000000000' AND jdocdate < '${end}235959999'
					`;
					if (typeof packet.data.units !== 'undefined' && Array.isArray(packet.data.units) && packet.data.units.length > 0) {
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

					console.log('==>sqlString', sqlString);
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
			// 	err.push(`Для осуществления данной команды, необходимо указать период для документов`);
			// }
		} else {
			err.push( 'Неизвестная команда' );
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
                    obj.start = start; obj.end = end;obj.table = table;
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
	async dicts(packet, toolbox, base, user, adapter) {
		let dicts = {
			'units': `${base}.units`, 
			'users': `${base}.users`, 
			'sim': `${base}.um_data`, 
			// 'doctypes': `${base}.yota_document_type_skyline`,
			'doctypes': `skyline.dex_dict_doctypes`,
			'docresidence': `skyline.dex_dict_doctypes`,
			'otherdocumenttype': `skyline.dex_dict_doctypes`,
			'countries': `skyline.dict_countries`,
			'citizenship': `skyline.dict_countries`,
			'rf_states': `skyline.dict_regions`,
			'statuses': 'dex_bases.dex_dict_doc_statuses',
			'docfields': 'skyline.dex_dict_doc_fields',
			'genders': 'skyline.dict_genders',
			'journalhooks': 'dex_bases.dex_dict_journalhooks',
			'resident_types': 'dex_bases.dex_dict_resident_types',
			'um_regions': `${base}.um_regions`,
			'profile_codes': `${base}.yota_profiles`
		};
		let obj = {};
		let err = [];
		obj.list = {};
		let appConfigufation = user.GetAppConfiguration('adapters');
		if (packet.data.subaction === 'show') {
			// console.log("packet===> ", packet);
			// console.log('отдаем справочник ', packet.data.dict);

			for (let dict of packet.data.dicts) {
				if (typeof dict !== 'undefined') {
					// console.log("dict=> ", dict);
					// obj.dicts = {dict: dict, list: []};
					// obj.list[dict] = [];
					obj.list[dict] = {dictName: dict, elements: []};
					if (typeof appConfigufation.configuration.accesses.list.dicts[dict] !== 'undefined') {
						// console.log("Такой справочник есть!");
						if (appConfigufation.configuration.accesses.list.dicts[dict].actions.indexOf('show') != -1) {
							// console.log("Справочник разрешен к показу для пользователя!!");
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
							// console.log("cbase=> ", cbase, "  sqlString=> ", sqlString);
							let result = await toolbox.sqlRequest(cbase, sqlString);
							// console.log("отдали справочник");
							if (dict == 'doctypes') {
								// console.log("result=> ", result);
								let doctypes = await toolbox.sqlRequest(cbase, `SELECT * FROM dex_translations WHERE dict ='doctypes' AND operator = 'yota'`);
								// console.log("doctypes=> ", doctypes);
								let arr = [];
								doctypes.map((item)=> { arr.push(item.web) });
								// console.log("web=> ", arr);
								for (let i=0; i<result.length; i++) {
									if (arr.indexOf(result[i].uid) != -1) obj.list[dict].elements.push(result[i]);
								}
								// console.log("obj.list[dict].elements=> ", obj.list[dict].elements);
							} else if (dict == 'otherdocumenttype') {
								let doctypes = await toolbox.sqlRequest(cbase, `SELECT * FROM dex_translations WHERE dict ='doctypes_other' AND operator = 'yota'`);
								let arr = [];
								doctypes.map((item)=> { arr.push(item.web) });
								for (let i=0; i<result.length; i++) {
									if (arr.indexOf(result[i].uid) != -1) obj.list[dict].elements.push(result[i]);
								}
							} else if (dict == 'docresidence') {
								let doctypes = await toolbox.sqlRequest(cbase, `SELECT * FROM dex_translations WHERE dict ='docresidence' AND operator = 'yota'`);
								let arr = [];
								doctypes.map((item)=> { arr.push(item.web) });
								for (let i=0; i<result.length; i++) {
									if (arr.indexOf(result[i].uid) != -1) obj.list[dict].elements.push(result[i]);
								}
							} 
							else {
								for (let i=0; i<result.length; i++) { 
									obj.list[dict].elements.push(result[i]);
								}
							}
							
						} else {
							err.push('Настройками программы вам запрещено просмативать данный справочник');
						}
					} else {
						err.push(`Указанный справочник [${dict}] не существует`);
					}

					if (dict === 'vendorpseudo') {
						let result = await toolbox.sqlRequest('dex_bases', `SELECT id, pseudo, vendor FROM bases`);
						for (let i=0; i<result.length; i++) obj.list[dict].elements.push(result[i]);
							// console.log("отдали справочник");
					}
				} else {
					err.push('Вам необходимо указать справочник, данные которого вы хотите получить');
				}
			}
		} else if (packet.data.subaction === 'users') {
 
		} else if (packet.data.subaction === 'sim') {

		} else {
			err.push('Данный справочник не существует или запрещен для вас');
		}
		// console.log("запрос справочников ", obj);
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
                                            if (typeof data.Document.MSISDN !== "undefined") item.msisdn = data.Document.MSISDN[0];
                                            else item.msisdn = "";
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
                                                let rw = await toolbox.sqlRequest(base, `SELECT region_id FROM um_data WHERE icc = '${data.Document.ICC[0]}'`);
                                                if (rw.length == 0) rw = await toolbox.sqlRequest(base, `SELECT region_id FROM um_data_out WHERE icc = '${data.Document.ICC[0]}'`);
                                                if (rw.length == 0) region = "SIM-карта не найдена в справочнике";
                                                else region = rw[0].region_id;

                                                if (typeof elem[region] === "undefined") {
                                                    elem[region] = 1;
                                                    let regionSchema = obj.schema.find(item=> item.name == region);
                                                    if (typeof regionSchema === "undefined") obj.schema.push({name: region, type: "number", title: region});
                                                } else elem[region]++;
                                            } else if (reportType == "balances") {
                                                let balance;
                                                let rw = await toolbox.sqlRequest(base, `SELECT balance FROM um_data WHERE icc = '${data.Document.ICC[0]}'`);
                                                if (rw.length == 0) rw = await toolbox.sqlRequest(base, `SELECT balance FROM um_data_out WHERE icc = '${data.Document.ICC[0]}'`);
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



		// let obj = {};
		// let err = [];
		// obj.data = [];
		// let appConfigufation = user.GetAppConfiguration('adapters');
		// // console.log("appConfigufation=>", appConfigufation);

	
		// if (typeof appConfigufation.configuration.accesses.list.reports[packet.data.report] !== 'undefined') {
		// 	if (appConfigufation.configuration.accesses.list.reports[packet.data.report].indexOf('new') != -1) {
		// 		if (packet.data.report === 'dutyDocs') { // отчет по долгам
		// 			if (typeof packet.data.start != 'undefined' && typeof packet.data.end != 'undefined') {
		// 				if (typeof packet.data.unit != 'undefined') {
		// 					let unit = "";
		// 					let startArr = packet.data.start.split(".");
		// 					let start = `${startArr[2]}${startArr[1]}${startArr[0]}`;
		// 					let endArr = packet.data.end.split(".");
		// 					let end = `${endArr[2]}${endArr[1]}${endArr[0]}`;
		// 					if (packet.data.unit != "ANY") unit += ` AND unitid = ${packet.data.unit}`;
		// 					let sqlString = `
		// 						SELECT * FROM journal
		// 						WHERE jdocdate >= ${start}000000000 AND jdocdate <= ${end}235959999 ${unit}
		// 					`;
		// 					let result = await toolbox.sqlRequest(base, sqlString);
		// 					for (let i=0; i<result.length;i++) {
		// 						let row = result[i];
		// 						let data = await toolbox.xmlToJs(row.data);
		// 						if (typeof data.Document.DutyId !== 'undefined') {
		// 							let o = {};
		// 							o.date = `${result[i].jdocdate.substring(6,8)}.${result[i].jdocdate.substring(4,6)}.${result[i].jdocdate.substring(0,4)}`;
		// 							o.icc = data.Document.ICC[0];
		// 							o.fio = `${data.Document.LastName[0]} ${data.Document.FirstName[0]} ${data.Document.SecondName[0]}`;
		// 							o.currentUnit = result[i].unitid;
		// 							o.previousUnit = data.Document.DutyId[0];
		// 							obj.data.push(o);
		// 						}
		// 					}
		// 				} else {
		// 					err.push('Укажите отделение для которого создается отчет');
		// 				}
		// 			} else {
		// 				err.push('Отчет должен быть применен в временному периоду. Дата начала и окончания периода обязательны');
		// 			} // отчет по долгам 
		// 		} else if (packet.data.report === 'periodicRegister') { // периодичный реестр договоров
		// 			if (typeof packet.data.start != 'undefined' && typeof packet.data.end != 'undefined') {
		// 				if (typeof packet.data.unit != 'undefined') {
		// 					let status,region,onlyDebts,unit;
		// 					if (typeof packet.data.status !== 'undefined') {
		// 						if (packet.data.status !== "ANY") status = ` AND status = ${packet.data.status}`;
		// 						else status = '';
		// 					} else err.push("Вы не указали статус");
		// 					if (typeof packet.data.region !== 'undefined') {
		// 						if (packet.data.region !== 'ANY') region = packet.data.region;
		// 						else region = '';
		// 					} else err.push("Вы не указали регион");
		// 					if (typeof packet.data.onlyDebts !== 'undefined') {
		// 						if (packet.data.onlyDebts == '1') onlyDebts = true;
		// 						else onlyDebts = false;
		// 					} else err.push('Поле `По долгам` обязательное');
		// 					if (packet.data.unit !== "ANY") unit = ` AND unitid = ${packet.data.unit}`;
		// 					else unit = '';
		// 					if (err.length == 0) {
		// 						let startArr = packet.data.start.split(".");
		// 						let start = `${startArr[2]}${startArr[1]}${startArr[0]}`;
		// 						let endArr = packet.data.end.split(".");
		// 						let end = `${endArr[2]}${endArr[1]}${endArr[0]}`;

		// 						let sqlString = `
		// 							SELECT * FROM journal
		// 							WHERE jdocdate >= ${start}000000000 AND jdocdate <= ${end}235959999 ${unit}${status}
		// 						`;
		// 						let result = await toolbox.sqlRequest(base, sqlString);
		// 						for (let i=0; i<result.length;i++) {
		// 							let row = result[i];
		// 							let o = {};
		// 							let data = await toolbox.xmlToJs(row.data);
		// 							o.date = `${result[i].jdocdate.substring(6,8)}.${result[i].jdocdate.substring(4,6)}.${result[i].jdocdate.substring(0,4)}`;
		// 							o.icc = data.Document.ICC[0];
		// 							o.fio = `${data.Document.LastName[0]} ${data.Document.FirstName[0]} ${data.Document.SecondName[0]}`;
		// 							o.currentUnit = result[i].unitid;
		// 							if (onlyDebts) {
		// 								if (typeof data.Document.DutyId !== 'undefined') {
		// 									o.previousUnit = data.Document.DutyId[0];
		// 									obj.data.push(o);
		// 								}
		// 							} else {
		// 								obj.data.push(o);
		// 							}
		// 						}
		// 					}
		// 				} else {
		// 					err.push('Укажите отделение для которого создается отчет');
		// 				}
		// 			} else {
		// 				err.push('Отчет должен быть применен в временному периоду. Дата начала и окончания периода обязательны');
		// 			}
		// 		} else if (packet.data.report === 'reconciliation') { // сверка по ТП и документам
		// 			if (typeof packet.data.start != 'undefined' && typeof packet.data.end != 'undefined') {
		// 				let journal = [{table: 'journal', ru: 'Журнал'}, {table: 'archive', ru: 'Архив'}];
		// 				let months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
		// 				let start = toolbox.moment(new Date(packet.data.start)).format('YYYYMMDD');
		// 				let end = toolbox.moment(new Date(packet.data.end)).format('YYYYMMDD');
		// 				let newlist = {};
		// 				for (let jour of journal) {
		// 					let rows = await toolbox.sqlRequest(base, `SELECT j.jdocdate, j.unitid, j.data, u.title FROM ${jour.table} AS j
		// 							LEFT JOIN units AS u ON j.unitid = u.uid
		// 							WHERE j.jdocdate >= '${start}000000000'
		// 							AND j.jdocdate <= '${end}235959999'
		// 						`);
		// 					for (let row of rows) {
		// 						let uid = row.unitid;
		// 						let title = row.title;
		// 						let xml = await toolbox.xmlToJs(row.data);
		// 						let plan = 'неопределенный';
		// 						if (typeof xml.Document.Plan !== 'undefined') {
		// 							plan = xml.Document.Plan[0];
		// 						}
		// 						if (typeof newlist[uid] === 'undefined') {
		// 							newlist[uid] = {
		// 								uid: uid,
		// 								title: title,
		// 								docs: {},
		// 								cntDocs: 0
		// 							}										
		// 						}
		// 						newlist[uid].cntDocs++;
		// 						let month = toolbox.moment(row.jdocdate.substring(0, 8)).month();
		// 						let year = toolbox.moment(row.jdocdate.substring(0, 8)).year();
		// 						if (typeof newlist[uid].docs[year] === 'undefined') newlist[uid].docs[year] = {};
		// 						if (typeof newlist[uid].docs[year][month] === 'undefined') newlist[uid].docs[year][month] = 0;
		// 						newlist[uid].docs[year][month]++;
		// 					}
		// 				}
		// 				for (let key in newlist) obj.data.push(newlist[key]);
		// 			} else {
		// 				err.push('Отчет должен быть применен в временному периоду. Дата начала и окончания периода обязательны');
		// 			}
		// 		} else if (packet.data.report === 'activation') { // сверка по активации
		// 			if (typeof packet.data.list !== 'undefined') {
		// 				let newlist = {};
		// 				let num_data = [{table:'um_data', ru: 'Журнал'}, {table:'um_data_out',ru: 'Архив'}];
		// 				let journal = [{table: 'journal', ru: 'Журнал'}, {table: 'archive', ru: 'Архив'}]
		// 				let units = await toolbox.sqlRequest(base, `SELECT * FROM units`);
		// 				let dsim = {};
		// 				for (let data of num_data) {
		// 					let sqlString = `
		// 							SELECT icc, owner_id, status, date_in, date_own, date_sold FROM ${data.table}
		// 							ORDER BY date_sold
		// 						`;
		// 					let rows = await toolbox.sqlRequest(base, sqlString);
		// 					for (let row of rows) {
		// 						let icc = row.icc;
		// 						let date_sold;
		// 						if (typeof dsim[icc] === 'undefined') {
		// 							dsim[icc] = {
		// 								owner: typeof units.find((elem)=> elem.uid == row.owner_id) !== 'undefined' ?  row.owner_id : '-',
		// 								date_sold: row.status == 2 ? row.date_sold : '-',
		// 								icc: icc,
		// 								jtype: data.ru
		// 							}
		// 						} else {
		// 							let simItem = dsim[icc];
		// 							let date = toolbox.moment();
		// 							let datePlus1 = date.add(1, 'day').format('YYYYMMDD');
		// 							let op1 = simItem.date_sold == '-' ? datePlus1 : simItem.date_sold;
		// 							let op2 = row.date_sold;
		// 							if (row.status < 0) {
		// 								if (data.table == 'um_data') {
		// 									op2 = datePlus1;
		// 								} else {
		// 									op2 = row.date_own;
		// 								}
		// 							}
		// 							// если op1 < op2
		// 							if (!toolbox.momentIfD1MoreD2(op1, op2)) {
		// 								if (!units.find((elem)=> elem.uid == row.owner_id)) simItem.date_sold = '-';
		// 								if (row.status == 2) simItem.date_sold = row.date_sold;
		// 								else simItem.date_sold = '-';
		// 							}
		// 						}
		// 					}
		// 				}
		// 				// загрузка документов
		// 				let mda = {};
		// 				for (let data of journal) {
		// 					let cid = await toolbox.sqlRequest(base, `
		// 							SELECT count(id) as cid FROM ${data.table}
		// 						`);
		// 					let cntval = cid[0].cid;
		// 					//console.log("cntval=>", cntval);
		// 					let drd = await toolbox.sqlRequest(base, `
		// 							SELECT substr(jdocdate, 1, 8) as sdocdate, data FROM ${data.table}
		// 						`);
		// 					//console.log("drd.length =>", drd.length);
		// 					for (let drdr of drd) {
		// 						let xml = await toolbox.xmlToJs(drdr.data);
		// 						mda[xml.Document.ICC[0]] = {
		// 							icc: xml.Document.ICC[0],
		// 							sdocdate: drdr.sdocdate,
		// 							jtype: data.ru
		// 						};
		// 					}
		// 				}
		// 				// обработка информации
		// 				for (let list of packet.data.list) {
		// 					if (dsim[list.icc]) {	
		// 						newlist[list.icc] = {
		// 							icc: dsim[list.icc].icc,
		// 							owner: dsim[list.icc].owner,
		// 							date_sold: toolbox.moment(dsim[list.icc].date_sold).format('DD.MM.YYYY')
		// 						}
		// 					}
		// 					if (mda[list.icc]) {
		// 						newlist[list.icc].date = toolbox.moment(mda[list.icc].sdocdate).format('DD.MM.YYYY');
		// 					}
		// 				}
		// 				for (let key in newlist) obj.data.push(newlist[key]);
		// 			} else {
		// 				err.push('Вы не передали список для проверки');
		// 			}
		// 		} else {
		// 			err.push('Вам недоступен данный отчет');
		// 		}
		// 	} else {
		// 		err.push('Настройками программы вам запрещено создавать данный отчет');
		// 	}
		// } else {
		// 	err.push('Указанный отчет не существует');
		// }
		
		// if (err.length > 0) obj.err = err;
		// return obj;
	}
	async printForm(packet, toolbox, base, user, adapter) {
		console.log('yota!!!');
		let obj = {};
		let err = [];
		// obj.data = {};
		// console.log("packet.data.list=> ", packet.data.list);
		let ids = packet.data.list;
		console.log('ids=> ', ids);
		obj.base = packet.data.base;
		try {
			let rows = [];
			for (let id of ids) {
				let rw = await toolbox.sqlRequest(base, `SELECT data FROM journal WHERE id = ${id}`);
				if (rw.length > 0) rows.push(rw[0]);
			}
			// let rows = await toolbox.sqlRequest(base, `SELECT data FROM journal WHERE id IN (${ids}) `);
	        if (rows.length > 0) {
	            let schema = JSON.parse(fs.readFileSync(`${__dirname}/printing_forms/documents/yota/schema.json`, 'utf8'));

	            let doc = new PDFDocument({
		            autoFirstPage: false,
		            bufferPages: true
		        });

	            let hash = toolbox.getHash();
	            obj.link = `yota_${hash}.pdf`;
	            doc.pipe(fs.createWriteStream(`${__dirname}/printing_forms/temp/yota_${hash}.pdf`));

	            // console.log("список=> ", rows);
	            for (let row of rows) {
	            	// console.log(row);
	            	let dataContract = await toolbox.xmlToJs(row.data);
	            	
	            	doc.addPage({
					    // size: 'LEGAL',
					    // layout: 'landscape'
					});
	            	doc.page.margins.bottom = 0;

	            	doc.image(`${__dirname}/printing_forms/documents/yota/documentForm.jpg`, 10, 20, {width: 590, height: 780, align: 'center'})
	            	.font(`${__dirname}/fonts/arial.ttf`)
	              	.fontSize(10)
	              	.moveDown(0.5);
	            	
	            	for (let key in dataContract.Document) {
	            		// doc.switchToPage(range.start);
	            		// console.log("range=>", range);
	            		if (typeof schema[key] !== 'undefined') {
	            			// doc.font(`${__dirname}/fonts/arial.ttf`)
	            			let size = typeof schema[key].css.size !== 'undefined' ? doc.fontSize(schema[key].css.size) : doc.fontSize(10);
	            			if (typeof schema[key].variants === 'undefined') {
	            				let characterSpacing = typeof schema[key].css.characterSpacing !== 'undefined' ? schema[key].css.characterSpacing : 0;
	            				// let size = typeof schema[key].css.size !== 'undefined' ? doc.fontSize(schema[key].css.size) : doc.fontSize(10);
	            				// console.log("characterSpacing=>", characterSpacing);
	            				let text = dataContract.Document[key][0];
	            				if (typeof schema[key].ifkey !== 'undefined') {
	            					if (schema[key].ifkey.from === 'document') {
	            						if (dataContract.Document[schema[key].ifkey.key][0] === schema[key].ifkey.value) {
	            							if (typeof schema[key].ifkey.text !== 'undefined')  {
	            								if (schema[key].ifkey.action === "ifEquality") {
	            									text = schema[key].ifkey.text;
	            								} else {
	            									//text = schema[key].ifkey.text;
	            								}
	            							}
	            							else text = '';
	            						}
	            					}
	            				}
	            				doc.text(text, schema[key].left, schema[key].top, {
	                				width: schema[key].css.width, 
	                				characterSpacing: characterSpacing,
	                				size: size
	                			})
	                			// .moveDown();
	            			} else {
	            				for (let variant in schema[key].variants) {
	            					let text = '';
	            					if (schema[key].variants[variant].text.action === 'substring') {
	            						let from = schema[key].variants[variant].text.from;
	            						let to = schema[key].variants[variant].text.to;
	            						text = dataContract.Document[key][0].substring(from, to);
	            						doc.text(text, schema[key].variants[variant].left, schema[key].variants[variant].top, {
			                				width: schema[key].variants[variant].width, 
			                				characterSpacing: schema[key].css.characterSpacing
			                			})
	            					} else if (schema[key].variants[variant].text.action === 'list') {
	            						let text = schema[key].variants[variant].text.list[dataContract.Document[key][0]].title;
	            						let left =  schema[key].variants[variant].text.list[dataContract.Document[key][0]].left;
	            						let top =  schema[key].variants[variant].text.list[dataContract.Document[key][0]].top;
	            						let width = schema[key].variants[variant].text.list[dataContract.Document[key][0]].width;
	            						doc.text(text, left, top, {
			                				width: width, 
			                				characterSpacing: schema[key].css.characterSpacing
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
	            									t = `${schema[key].variants[variant].text.fieldsAdd[f]}${dataContract.Document[f][0]}`;
	            								} else t = dataContract.Document[f][0];
	            								arr.push(t);
	            							}
	            						}
	            						text = arr.join(schema[key].variants[variant].text.separator);
	            						doc.text(text, left, top, {
			                				width: width, 
			                				characterSpacing: characterSpacing,
			                				size: size
			                			})
	            					} else if (schema[key].variants[variant].text.action === 'dicts') {
	            						// console.log("dataContract.Document[key][0]=> ", dataContract.Document[key][0]);
	            						if (typeof schema[key] !== 'undefined') {
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

		            							//console.log(`SELECT title FROM ${dict} WHERE ${colName} = '${dataContract.Document[key][0]}'`);
		            							if (typeof schema[key].variants[variant].text.join !== 'undefined') {
		            								//console.log("===> 1");
		            								let search = typeof schema[key].variants[variant].text.search !== 'undefined' ? schema[key].variants[variant].text.search : dataContract.Document[key][0];
		            								let row = await toolbox.sqlRequest(base, `SELECT title FROM ${dict} WHERE ${colName} = '${search}'`);
		            								if (row.length > 0) text = `${row[0].title}${dataContract.Document[key][0]}`;
		            								doc.font(`${__dirname}/fonts/arial.ttf`)
			                						.text(text, left, top, {
						                				width: width, 
						                				characterSpacing: characterSpacing,
						                				size: size
						                			})
		            							} else {
		            								//console.log("===> 2");
		            								let search = typeof schema[key].variants[variant].text.search !== 'undefined' ? schema[key].variants[variant].text.search : dataContract.Document[key][0];
		            								let row = await toolbox.sqlRequest(base, `SELECT * FROM ${dict} WHERE ${colName} = '${search}'`);
		            								//console.log("row=> ", row);
		            								if (row.length > 0) text = `${row[0].title}`;
		            								//console.log("text==> ", text);
		            								if (typeof schema[key].ifkey !== 'undefined') {
		            									//console.log("!!!===> ", text, " row[0][colName]=> ", row[0][colName]);
		            									if (row[0][colName] === schema[key].ifkey.key) {
		            										if (schema[key].ifkey.from === 'document') text = dataContract.Document[schema[key].ifkey.value][0];
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
	            	}	

	            	// теперь добавить штрих код
	    			if (typeof schema.BARCODE !== 'undefined') {
	    				let left = schema.BARCODE.variants.left;
	    				let top = schema.BARCODE.variants.top;
	    				let width = schema.BARCODE.css.width;
	    				let height = schema.BARCODE.css.height;

	    				let formNum = 101;
		    			let arr = [formNum];
	    				for (let field of schema.BARCODE.variants.fields) {
	    					arr.push(dataContract.Document[field][0]);
	    				}
	    				let text = arr.join(';');
		    			let png = await toolbox.generateBarCode('qrcode', text);
		    			doc.image(png, left, top, {width: width, height: height})
	    			}
	    			// фио
	    			if (typeof schema.FIO !== 'undefined') {
	    				let characterSpacing = typeof schema.FIO.css.characterSpacing !== 'undefined' ? schema.FIO.css.characterSpacing : 0;
	    				let size = typeof schema.FIO.css.size !== 'undefined' ? doc.fontSize(schema.FIO.css.size) : doc.fontSize(10);
	    				let left = schema.FIO.variants.left;
	    				let top = schema.FIO.variants.top;
	    				let width = schema.FIO.css.width;
	    				if (typeof dataContract.Document[schema.FIO.variants.mainField] !== 'undefined') {
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
	    			}
	    			// вариации
                    if (typeof schema.VARIATION !== 'undefined') {
                        for (let variant of schema.VARIATION) {
                            // console.log(dataContract.Document);
                            if (typeof dataContract.Document[variant.field] !== 'undefined') {
                                // console.log("vvv");
                                for (let varn of variant.variants) {
                                	// console.log("dataContract.Document[variant.field][0]=> ", dataContract.Document[variant.field][0]);
                                    // console.log("dataContract.Document=>", dataContract.Document["FizDocType"][0]);
                                    // console.log("typeof=>", typeof varn.if, ' ====>', dataContract.Document[variant.field][0], varn.if.indexOf(1));
                                    if (varn.if.indexOf(dataContract.Document[variant.field][0]) != -1) {
                                        // console.log("а вот да varn.action=>", varn.action, " varn.if=> ", varn.if);
                                        let left = varn.left;
                                        let top = varn.top;
                                        let width = varn.width;
                                        let characterSpacing = typeof varn.characterSpacing !== 'undefined' ? varn.characterSpacing : 0;
                                        let size = typeof varn.size !== 'undefined' ? doc.fontSize(varn.size) : doc.fontSize(10);
                                        let text = '';
                                        if (varn.action === 'fix') text = varn.text;
                                        else if (varn.action === 'docField') text = dataContract.Document[varn.text][0];
                                        doc.font(`${__dirname}/fonts/arial.ttf`)
                                        .text(text, left, top, {
                                            width: width, 
                                            characterSpacing: characterSpacing,
                                            size: size
                                        })
                                        if (typeof varn.additionally !== 'undefined') {
                                        	if (varn.additionally.action === 'fromTable') {
                                        		left = varn.additionally.left;
	                                       		top = varn.additionally.top;
	                                        	width = varn.additionally.width;
	                                        	let size = typeof varn.additionally.size !== 'undefined' ? doc.fontSize(varn.additionally.size) : size;
                                        		let row = await toolbox.sqlRequest(base, `SELECT ${varn.additionally.search_col_name} FROM ${varn.additionally.table} WHERE ${varn.additionally.where_col_name} = '${dataContract.Document[variant.field][0]}'`);
	                                        	// console.log("row==> ", row);
	                                        	text = row[0][varn.additionally.search_col_name];
                                        	}
                                        	doc.font(`${__dirname}/fonts/arial.ttf`)
	                                        .text(text, left, top, {
	                                            width: width, 
	                                            characterSpacing: characterSpacing,
	                                            size: size
	                                        })
                                        }
                                        break;
                                    }    
                                }
                            } else {
                                console.log("А вот нет");
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
		obj.vendor = 'YOTA';
		if (packet.data.subaction === 'document.open.doc') {
			if (typeof packet.data.docid !== 'undefined') {
				let yotaSchemas = new YotaSchemas();
				await yotaSchemas.initSchemas(toolbox);

				let id = packet.data.docid;
				obj.docid = id;
				let rows = await toolbox.sqlRequest(base, `SELECT * FROM journal WHERE id = '${id}'`);
				// console.log("rows=> ", rows);
				let dataContract = await toolbox.xmlToJs(rows[0].data);
				


				console.log("dataContract=> ", dataContract);
				// создадим объект типа Contract
				let contract = new Contract(dataContract, yotaSchemas, user._userid);
				// переведем специфические поля к общему виду для web
				await contract.dexToWeb(yotaSchemas);
				let webContract = contract.getContract;
				// console.log("contract=> ", contract.getContract);




				obj.fields = {};
				for (let key in dataContract.Document) {
				// 	if (key === 'AddrCountry') {
				// 		// console.log('текущее значение => ', dataContract.Document[key][0]);
				// 		obj.fields[key] = await yotaSchemas.dexToWeb('countries', dataContract.Document[key][0]);
				// 		// console.log('значение после трансляции => ', obj.fields[key]);
				// 	} else if (key === 'Sex') {
				// 		// console.log('текущее значение => ', dataContract.Document[key][0]);
				// 		obj.fields[key] = await yotaSchemas.dexToWeb('genders', dataContract.Document[key][0]);
				// 		// console.log('значение после трансляции => ', obj.fields[key]);
				// 	} else if (key === 'FizDocCitizen') {
				// 		// console.log('текущее значение => ', dataContract.Document[key][0]);
				// 		obj.fields[key] = await yotaSchemas.dexToWeb('citizenship', dataContract.Document[key][0]);
				// 		// console.log('значение после трансляции => ', obj.fields[key]);
				// 	} else if (key === 'DocReg') {
				// 		// console.log('текущее значение => ', dataContract.Document[key][0]);
				// 		obj.fields[key] = await yotaSchemas.dexToWeb('umRegions', dataContract.Document[key][0]);
				// 		// console.log('значение после трансляции => ', obj.fields[key]);
				// 	} else if (key === 'FizDocType') {
				// 		// console.log('текущее значение => ', dataContract.Document[key][0]);
				// 		obj.fields[key] = await yotaSchemas.dexToWeb('doctypes', dataContract.Document[key][0]);
				// 		// console.log('значение после трансляции => ', obj.fields[key]);
				// 	} else if (key === 'FizDocOtherDocTypes') {
				// 		// console.log('текущее значение => ', dataContract.Document[key][0]);
				// 		obj.fields[key] = await yotaSchemas.dexToWeb('doctypesOther', dataContract.Document[key][0]);
				// 		// console.log('значение после трансляции => ', obj.fields[key]);
				// 	} else if (key === 'FizDocTypeResidence') {
				// 		// console.log('текущее значение => ', dataContract.Document[key][0]);
				// 		obj.fields[key] = await yotaSchemas.dexToWeb('docresidence', dataContract.Document[key][0]);
				// 		// console.log('значение после трансляции => ', obj.fields[key]);
				// 	}
				// 	else {
						obj.fields[key] = dataContract.Document[key][0];
				// 	}
				}
				obj.fields.status = rows[0].status;
				obj.fields.unitid = rows[0].unitid;
				webContract.CONTRACT_INFORMATION.UNIT = rows[0].unitid;
				webContract.CONTRACT_INFORMATION.STATUS = rows[0].status;
				obj.newdata = webContract;




				// console.log(obj);
			} else {
				err.push('Вы не указали документ, который следует открыть');
			}
		} else if (packet.data.subaction === 'document.create.new') {
			// obj.action = 'hooks',
			// obj.subaction = 'document.create.new';
			obj.decision = 'show';
			obj.reqFields = ["ICC"];
			obj.base = packet.data.base;
		} else if (packet.data.subaction === 'document.print.doc') {
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
	async configuration(packet, toolbox, base, user, adapter) {
		let obj = {};
		let err = [];
		obj.list = [];		
		obj.hash = packet.data.hash;
		if (packet.data.subaction === 'getHooks') {
			let rows = await toolbox.sqlRequest('dex_bases', `SELECT * FROM dex_dict_journalhooks WHERE operators LIKE '%YOTA%' AND status = '1'`);
			obj.subaction = 'getHooks';
			if (rows.length > 0) {
				obj.list = rows;
			} else {
				obj.list = [];
			}
		}
		return obj;
	}
	async getDocumentFields( packet, toolbox, base, user, adapter ) {
		let obj = {};
		let err = [];
		obj.tableFields = [];
		obj.action = packet.data.action;
		obj.tableFields = {};
		let row = await toolbox.sqlRequest('skyline', `SELECT uid, title FROM dex_dict_doc_fields WHERE vendor LIKE '%YOTA%' AND fieldType = 'docfield'`);
		if ( row.length > 0 ) obj.tableFields.list = row;
		// теперь выбранные для показа 
		let appConfigufation = user.GetAppConfiguration('adapters');
		let displayedHeaders = appConfigufation.configuration.documents.list.period.displayedfields.fields;
		obj.tableFields.shown = displayedHeaders
		return obj;
	}
	// отчет по остаткам sim
	async getReport(toolbox) {
		let bases = ['dex_beeline_sts', 'dex_beeline_sts_sr'];
		let tr = {'dex_beeline_sts': 'cnt_1', 'dex_beeline_sts_sr': 'cnt_2'};
		let report = {};
		let zeroParty = '';
		let doZeroParty = false; // брать 0 и 1 партии?
		if (!doZeroParty) zeroParty = ` and ud.party_id != '0' and ud.party_id != '1'`;
		let doDetailedNull = true; // если нужно показать нулевые остатки
		
		for (let i=0; i<bases.length; i++) {
			let str = `SELECT count(ud.id) as cnt, un.uid as uid, ud.plan_id as plan_id, un.title as title, un.region as region, ud.fs 
				FROM um_data as ud, units as un 
				WHERE ud.status = 1 and un.uid = ud.owner_id ${zeroParty} 
				group by ud.plan_id, un.title
			`;
			let rows = await toolbox.sqlRequest(bases[i], str);
			if (rows.length > 0)  {
				for (let j=0; j<rows.length; j++) {
					// if (rows[j].uid == '169') console.log('гадирова=> ', rows[j].cnt);
					if (typeof report[rows[j].uid] === 'undefined') {
						report[rows[j].uid] = {uid: rows[j].uid, title: rows[j].title};
						for (let k=0; k<bases.length; k++) {
							let trname = tr[bases[k]];
							report[rows[j].uid][trname] = bases[i] == bases[k] ? rows[j].cnt : 0;
						}
					} else {
						let trname = tr[bases[i]];
						report[rows[j].uid][trname] += rows[j].cnt;
					}
				}
			}
		}

		if (doDetailedNull) {
			for (let i=0; i<bases.length; i++) {
				let str = `SELECT * FROM units`;
				let rows = await toolbox.sqlRequest(bases[i], str);
				if (rows.length > 0) {
					for (let j = 0; j < rows.length; j++) {
						if (typeof report[rows[j].uid] === 'undefined') {
							report[rows[j].uid] = {uid: rows[j].uid, title: rows[j].title, cnt_1: 0, cnt_2: 0};
							// for (let k=0; k<bases.length; k++) {
							// 	let trname = tr[bases[k]];
							// 	report[rows[j].uid][trname] = bases[i] == bases[k] ? rows[j].cnt : 0;
							// }
						} 
					}
				}
			}
		}

		let filename = toolbox.getHash();
		let csvWriter = toolbox.getCSVWriter();
		let newCsvWriter = csvWriter({ 
		    path: `${__dirname}/temp/${filename}.csv`, 
		    encoding: 'utf8', //utf8
		    fieldDelimiter: ';', // доступны ',' или ';'
		    recordDelimiter: '\r\n', // доступны '\r\n' или '\n'\
		    alwaysQuote: true,
		    // header: null
		    header: [ 
		        {id: 'uid', title: 'id'}, 
		        {id: 'title', title: 'Отделение'}, 
		        {id: 'cnt_1', title: 'БИ СК'}, 
		        {id: 'cnt_2', title: 'БИ СК СР'}, 
		        {id: 'cnt', title: 'Всего'}, 
		    ] 
		}); 
		let data = [];
		for (let key in report) {
			// if (report[key].cnt_1 == '') report[key].cnt_1 = 0;
			// if (report[key].cnt_2 == '') report[key].cnt_2 = 0;
			report[key].cnt = report[key].cnt_1 + report[key].cnt_2;
			data.push(report[key]);
		}
		newCsvWriter.writeRecords(data) 
		.then(() => console.log('The CSV file was written successfully'));

		// console.log("report=> ", report);
	}
	async document(packet, toolbox, base, user, adapter, schemas) {
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		obj.subaction = packet.data.subaction;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = 'document';
		// obj.docid = this.docid;
		if (packet.data.subaction === 'document.edit') {
			console.log("запрос на редактирование документа", packet);
			let row = await toolbox.sqlRequest(base, `SELECT * FROM journal WHERE id = '${packet.data.docid}'`);
			if (row[0].status === 4) {
				err.push("Документ не может быть отредактирован. Статус документа 'Отправлен'");
				obj.editing = 0;
			} else {
				obj.editing = 1;
			}
		} else if (packet.data.subaction === 'document.create') {
			console.log("запрос на создание документа");
			let rows = await toolbox.sqlRequest('skyline', `SELECT * FROM dex_dict_doc_fields`);
			let fnames = {};
			for (let row of rows) fnames[row.uid] = row.title;
			// // немного обработаем данные
			let yotaSchemas = new YotaSchemas();
			await yotaSchemas.initSchemas(toolbox);

			let contract = new Contract(packet.data.fields, yotaSchemas, user._userid, 'YOTA', toolbox, base);
			let cerr = await contract.checkContract();
			err = err.concat(cerr);
			// console.log("contract==> ", contract.getContract);
			if (err.length == 0) { 
				let cs = await contract.save();
				if (cs.status == 1) { 
					obj.status = 1;
					obj.msg = cs.msg;
					obj.newid = cs.newid;
				} else obj.status = 2;
			}
		} else {
			err.push('Вы не указали действие, которое следует выполнить');
		}
		if (err.length > 0) obj.err = err;
		// console.log("obj==> ", obj);
		return obj;
	}
	async getSimInfo(packet, toolbox, base, user, adapter) {
		let obj = {};
		let err = [];
		obj.list = [];
		obj.hash = packet.data.hash;	
		obj.appHash = packet.data.appHash;
		if (typeof packet.data.fields !== 'undefined') {
			let ICC;
			for (let field of packet.data.fields) {
				if (field.name == "ICC") { 
					ICC = field.value;
					break;
				}
			}
			if (typeof ICC !== 'undefined') {
				if (ICC.length == 10) {
					console.log(`SELECT * FROM um_data WHERE icc='${ICC}' AND date_sold='' AND status != '2'`);
					let row = await toolbox.sqlRequest(base, `SELECT * FROM um_data WHERE icc = '${ICC}' AND date_sold = '' AND status != '2'`);
					if (row.length > 0) {
						let sim = {
							ICC: ICC,
							type: row[0].type_sim,
							fs: row[0].fs,
							owner: row[0].owner_id,
							balance: row[0].balance
						}
						if (row[0].region_id) sim.region_id = row[0].region_id;
						obj.list.push(sim);
					} else {
						err.push('Данные о SIM отсутствуют. Или она уже продана.');
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
	async getOrgByCode(packet, toolbox, base, user, adapter) {
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		// obj.subaction = packet.data.subaction;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = packet.data.action;
		obj.code = toolbox.htmlspecialchars(packet.data.code);
		obj.list = [];
		let row = await toolbox.sqlRequest('skyline', `SELECT uid, title FROM dict_org_codes WHERE uid LIKE '${obj.code}%' ORDER BY title LIMIT 10`);
		
		console.log('row==>', row);
		for (let i=0; i<row.length; i++) obj.list.push(row[i]);
		return obj;
	}
	async autocompleteState(packet, toolbox, base, user, adapter) {
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		// obj.subaction = packet.data.subaction;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = packet.data.action;
		obj.code = toolbox.htmlspecialchars(packet.data.code);
		obj.list = [];
		let row = await toolbox.sqlRequest(base, `SELECT id as uid, hintvalue as title FROM hints WHERE hinttype='state' AND hintvalue LIKE '${obj.code}%' ORDER BY hintvalue LIMIT 10`);
		
		// console.log('row==>', row);
		for (let i=0; i<row.length; i++) obj.list.push(row[i]);
		return obj;
	}
	async autocompleteRegion(packet, toolbox, base, user, adapter) {
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		// obj.subaction = packet.data.subaction;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = packet.data.action;
		obj.code = toolbox.htmlspecialchars(packet.data.code);
		obj.list = [];
		let row = await toolbox.sqlRequest(base, `SELECT id as uid, hintvalue as title FROM hints WHERE hinttype='region' AND hintvalue LIKE '${obj.code}%' ORDER BY hintvalue LIMIT 10`);
		
		// console.log('row==>', row);
		for (let i=0; i<row.length; i++) obj.list.push(row[i]);
		return obj;
	}
	async autocompleteCity(packet, toolbox, base, user, adapter) {
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		// obj.subaction = packet.data.subaction;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = packet.data.action;
		obj.code = toolbox.htmlspecialchars(packet.data.code);
		obj.list = [];
		let row = await toolbox.sqlRequest(base, `SELECT id as uid, hintvalue as title FROM hints WHERE hinttype='city' AND hintvalue LIKE '${obj.code}%' ORDER BY hintvalue LIMIT 10`);
		
		// console.log('row==>', row);
		for (let i=0; i<row.length; i++) obj.list.push(row[i]);
		return obj;
	}
	async autocompleteStreet(packet, toolbox, base, user, adapter) {
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		// obj.subaction = packet.data.subaction;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = packet.data.action;
		obj.code = toolbox.htmlspecialchars(packet.data.code);
		obj.list = [];
		let row = await toolbox.sqlRequest(base, `SELECT id as uid, hintvalue as title FROM hints WHERE hinttype='street' AND hintvalue LIKE '${obj.code}%' ORDER BY hintvalue LIMIT 10`);
		
		// console.log('row==>', row);
		for (let i=0; i<row.length; i++) obj.list.push(row[i]);
		return obj;
	}
	async doFNameSearch(packet, toolbox, base, user, adapter) {
		console.log("doFNameSearch==>");
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = packet.data.action;
		obj.list = [];
		try {
			let query = '';
			if (typeof packet.data.firstName !== 'undefined' && packet.data.firstName != '') query = `title LIKE '${toolbox.htmlspecialchars(packet.data.firstName)}%' `;
			let rows = await toolbox.sqlRequest('skyline', `SELECT title FROM dict_firstnames WHERE ${query} ORDER BY title LIMIT 10`); 
            for (let i=0; i<rows.length; i++) obj.list.push(toolbox.normName(rows[i].title));
		} catch (e) {	
			console.log("e=> ", e);
		}

		return obj;
	}
	async doLNameSearch(packet, toolbox, base, user, adapter) {
		console.log("doLNameSearch==>");
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = packet.data.action;
		obj.list = [];
		try {
			let query = '';
			if (typeof packet.data.lastName !== 'undefined' && packet.data.lastName != '') query = `title LIKE '${toolbox.htmlspecialchars(packet.data.lastName)}%' `;
			let rows = await toolbox.sqlRequest('skyline', `SELECT title FROM dict_lastnames WHERE ${query} ORDER BY title LIMIT 10`); 
            for (let i=0; i<rows.length; i++) obj.list.push(toolbox.normName(rows[i].title));
		} catch (e) {	
			console.log("e=> ", e);
		}

		return obj;
	}
	async doPeopleSearch(packet, toolbox, base, user, adapter) {
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = packet.data.action;
		obj.list = [];
		let dpsh = await adapter.doPeopleSearchHash(packet.data.fields.birth, packet.data.fields.lastName, packet.data.fields.firstName, packet.data.fields.secondName);
		if (dpsh.err.length !== 0) {
			err = err.concat(dpsh.err);
		} else {
			if (dpsh.list.length > 0) {
				for (let i=0; i<dpsh.list.length; i++) { 
					let row = await toolbox.sqlRequest(base, `SELECT data FROM people WHERE phash = '${dpsh.list[i].phash}'`);
					let userInfo = {};
					let arrPairs = row[0].data.split('\n');
					for (let item of arrPairs) {
						let elem = item.split('=');
						if (elem[0] === 'AddrCountry') {
							let schemas = new yotaCountrySchemas();
							userInfo[elem[0]] = schemas.getCountryForDogovor(elem[1]);
						} else {
							userInfo[elem[0]] = elem[1];
						}
					}
					obj.list.push(userInfo);
				}
			}
		}

		if (err.length > 0) obj.err = err;

		
		return obj;
	}
	async getAttachedFiles(packet, toolbox, base, user, adapter) {
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = packet.data.action;
		obj.list = [];
		if (typeof packet.data.search !== 'undefined' && packet.data.search != '') {
			let md5 = toolbox.criptoHashMD5(packet.data.search);
			try {
				let path = `${__dirname}/scans/yota/${base}/${md5}`;
				let dirStatus = await toolbox.ifIssetDirrectory(path);
				if (!dirStatus) dirStatus = await toolbox.createDirrectory(path);
				if (dirStatus) {
					// console.log("dirStatus==> ", dirStatus);
					let files = [];
					let list = fs.readdirSync(path);
					// console.log('list=> ', list);
					for (let i in list) {
						let stats = fs.statSync(`${path}/${list[i]}`);
						// console.log("размер для ", list[i] , " ==> ", stats);
						let arrFile = list[i].split('.');
				        let mediafile = {
				        	name: arrFile[0],
				        	mime: arrFile[1],
				        	path: `yota/${base}/${md5}/${list[i]}`,
				        	size: stats.size
				        }
				        // console.log('name==> ', name);
				        files.push(mediafile);
				    }
				    // console.log('files==> ', files);
				    obj.list = obj.list.concat(files);
				} else {
					arr.push('Ошибка создания дирректории');
				}
			} catch (e) {
				console.log("====> ", e);
			}
		} else {
			err.push('Параметр search не должен быть пустым. Вполне возможно, что не указали ICC или MSISDN');
		}

		// console.log('obj==> ', obj);
		if (err.length > 0) obj.err = err;	


		// справочники удалить
		let rows = await toolbox.sqlRequest('skyline', `SELECT * FROM dict_countries`);
		for (let row of rows) {
			await toolbox.sqlRequest('skyline', `INSERT INTO dex_translations (dict, dex, web, operator, title) VALUES ('citizenship', '', '${row.uid}', 'yota', '${row.title}')`);
			// break;
		}
			

		return obj;
	}
	async attachFile(packet, toolbox, base, user, adapter) {
		console.log("прикрепляем изображение");
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = packet.data.action;
		if (typeof packet.data.search !== 'undefined' && packet.data.search != '') {
			let md5 = toolbox.criptoHashMD5(packet.data.search);
			let path = `${__dirname}/scans/yota/${base}/${md5}`;
			let dirStatus = await toolbox.ifIssetDirrectory(path);
			if (!dirStatus) dirStatus = await toolbox.createDirrectory(path);
			if (dirStatus) {
				let matches = packet.data.base64Image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
				if (matches.length !== 3) err.push('Передаваемое вами изображение таковым не является');
				else {					
					let hash = toolbox.getHash();
					let cdate = toolbox.moment().format('YYYYMMDDhhmmss');
					let imageName = toolbox.criptoHashMD5(`${hash}${cdate}`);					
					let response = {};
					response.type = matches[1];
					response.data = new Buffer(matches[2], 'base64');
					let decodedImg = response;
					let imageBuffer = decodedImg.data;
					try {
						fs.writeFileSync(`${path}/${imageName}.${packet.data.mime}`, imageBuffer, 'utf8');
						try {
							let compression = await toolbox.compressionImage(`${path}/${imageName}.${packet.data.mime}`);
							console.log('compression==> ', compression);
						} catch(e) {
							err.push('Ошибка сжатия изображения');
						}
						obj.attachedFile = `yota/${base}/${md5}/${imageName}.${packet.data.mime}`;
						obj.name = imageName;
						obj.mime = packet.data.mime;
						let stats = fs.statSync(`${path}/${imageName}.${packet.data.mime}`);
						obj.size = stats.size;
					} catch (e) {
						console.log(e);
						err.push('Ошибка создания скана');
					}
				}
			}
		} else {
			err.push('Параметр search не должен быть пустым. Вполне возможно, что не указали ICC или MSISDN');
		}

		if (err.length > 0) obj.err = err;	
		console.log('отдали')
		return obj;
	}
	async deleteAttachedFile(packet, toolbox, base, user, adapter) {
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = packet.data.action;
		let md5 = toolbox.criptoHashMD5(packet.data.search);
		try {
			// проверим наличие директории
			let path = `${__dirname}/scans/yota/${base}/${md5}`;
			let dirStatus = await toolbox.ifIssetDirrectory(path);
			if (dirStatus) {
				let list = fs.readdirSync(path);
				let ifDel = 0;
				for (let i in list) {
					if (list[i] == packet.data.forDelete) {
						obj.file = packet.data.forDelete;
						let status = toolbox.deleteFile(`${path}/${packet.data.forDelete}`);
						if (status) ifDel = 1;
						break;
					}
				}
				obj.deleteStatus = ifDel;
			} else {
				err.push("Директории не существует");
			}
		} catch (e) {

		}
		console.log('obj==> ', obj);
		if (err.length > 0) obj.err = err;	
		return obj;
	}
	// async requestFields(packet, toolbox, base, user) {

	// }


	// версия 1
	async getStartFields(packet, toolbox, base, user, adapter) {
		console.log("getStartFields");
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		obj.subaction = packet.data.subaction;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = 'startFields';
		obj.list = [{title: 'ICC', value: 'ICC'}];	

		return obj;
	}
	async getInitialValues( packet, toolbox, base, user, adapter ) {
		let err = [];
		let obj = {};
		obj.hash = packet.data.hash;
		obj.subaction = packet.data.subaction;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		obj.action = 'InitialValues';
		obj.list = [];
		if ( packet.data.list.indexOf( 'startFields' ) != -1 ) { 
			obj.list.push( {name: 'startFields', fields: [{title: 'ICC', value: 'ICC'}]} );
			obj.status = 1;
		}
		if ( packet.data.list.indexOf( 'dexDocumentConfiguration' ) != -1 ) {
			let row = await toolbox.sqlRequest('skyline', `SELECT name, uid, type, data_type, dict_name, description, rank, parent 
					FROM dex_document WHERE operators LIKE '%ALL%' OR operators LIKE '%YOTA%'`);
			if (row.length > 0) obj.list.push( {name: 'dexDocumentConfiguration', fields: row} );
			else obj.list.push( {name: 'dexDocumentConfiguration', fields: []} );
			obj.status = 1;
		} 
		if ( packet.data.list.indexOf( 'groupRules') != -1 ) {
			let row = await toolbox.sqlRequest('skyline', `SELECT uid, group_name, list 
					FROM dex_document_groups WHERE operators LIKE '%ALL%' OR operators LIKE '%YOTA%'`);
			if (row.length > 0) obj.list.push( {name: 'groupRules', fields: row} );
			else obj.list.push( {name: 'groupRules', fields: []} );
			obj.status = 1;
		}
		return obj;
	}

	async getBaseDicts ( packet, toolbox, base, user, adapter, schemas, dicts ) {		
		let obj = {};
		let err = [];
		obj.list = {};
		dicts.map(item=> obj.list[item.name] = item.data);
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
						let sim = new Sim(row[0]);
						row = await toolbox.sqlRequest('skyline', `SELECT * FROM dict_units WHERE uid = '${ sim.Owner }'`);
						let unit = new Unit(row[0]);



						console.log("regionRow=> ", row);
						if ( row.length > 0 )  sim.Region = row[0].region;
						else sim.Region = 'ttt';

						maket.DOCUMENT.CONTRACT_INFORMATION.DOCID = adapter.DocId;
						maket.DOCUMENT.CONTRACT_INFORMATION.FS = sim.Fs;
						maket.DOCUMENT.CONTRACT_INFORMATION.UNIT = sim.Owner;
						maket.DOCUMENT.CONTRACT_INFORMATION.UNIT_UM_DATA = sim.Owner;
						maket.DOCUMENT.CONTRACT_INFORMATION.REGION = sim.Region;
						maket.DOCUMENT.CONTRACT_INFORMATION.CITY = unit.DocCity('YOTA');
						// maket.DOCUMENT.CONTRACT_INFORMATION.PROFILE_CODE = '';


						maket.DOCUMENT.CONTRACT_INFORMATION.SIM.ICC = sim.Icc;
						maket.DOCUMENT.CONTRACT_INFORMATION.SIM.TYPE = sim.Type;
						maket.DOCUMENT.CONTRACT_INFORMATION.SIM.BALANCE = sim.Balance;

						// maket.DOCUMENT.PERSON.BIRTH.DATE = '01.02.2021';
						
						

						console.log("maket.DOCUMENT=> ", maket.DOCUMENT);

						obj.fixed = [
							'DOCUMENT.CONTRACT_INFORMATION.DOCID',
							'DOCUMENT.CONTRACT_INFORMATION.PROFILE_CODE',
							'DOCUMENT.CONTRACT_INFORMATION.FS',
							'DOCUMENT.CONTRACT_INFORMATION.UNIT',
							'DOCUMENT.CONTRACT_INFORMATION.UNIT_UM_DATA',
							'DOCUMENT.CONTRACT_INFORMATION.REGION',
							'DOCUMENT.CONTRACT_INFORMATION.CITY',
							// 'CONTRACT_INFORMATION.TYPE_COMPLECT',
							// 'CONTRACT_INFORMATION.SELLER',
							// 'CONTRACT_INFORMATION.CREATION_TYPE',
							'DOCUMENT.CONTRACT_INFORMATION.SIM.ICC',
							// 'CONTRACT_INFORMATION.SIM.TYPE',
							// 'DOCUMENT.PERSON.BIRTH.DATE',
							// 'PERSON.SEX',
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
		console.log("отдали ", obj);
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
		obj.vendor = 'YOTA';
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

	// убрать потом
	async updateOrgCodes(packet, toolbox, base, user) {
		console.log("updateOrgCodes");
		let obj = {};
		obj.hash = packet.data.hash;
		obj.subaction = packet.data.subaction;
		obj.vendor = 'YOTA';
		obj.base = packet.data.base;
		let list = packet.data.list;
		try {
			let d = [];
			for (let item of list) {
				// let item = list[0];
				let o = `('${item.code}', '${item.text}', '${item.type}', '${item.region_code}')`;
				d.push(o);
				console.log("item==> ", item);
				
				// await toolbox.sqlRequest('sqyline', `INSERT INTO dict_org_codes SET (uid, title, type, region_code) VALUES ()`);
			}
			console.log("string->>", `INSERT INTO dict_org_codes SET (uid, title, type, region_code) VALUES ${d}`);
			await toolbox.sqlRequest('skyline', `INSERT INTO dict_org_codes (uid, title, type, region_code) VALUES ${d}`);
		} catch (e) {
			console.log(e);
		}
		
		return obj;
	}
}	
module.exports = AdapterYotaApi;


class YotaSchemas {
	constructor(toolbox) {
		this.umRegions = [];
		this.regions = [];
		this.genders = [];
		this.countries = [];
		this.citizenship = [];
		this.doctypes = [];
		this.doctypesOther = [];
		this.docresidence = [];
	}
	async initSchemas(toolbox) {
		// страны
		let rows = await toolbox.sqlRequest('skyline', `SELECT * FROM dex_translations WHERE operator='yota' AND dict='countries'`);
		this.countries = this.countries.concat(rows);
		// гражданство
		rows = await toolbox.sqlRequest('skyline', `SELECT * FROM dex_translations WHERE operator='yota' AND dict='citizenship'`);
		this.citizenship = this.citizenship.concat(rows);
		// регионы
		rows = await toolbox.sqlRequest('skyline', `SELECT * FROM dex_translations WHERE operator='yota' AND dict='regions'`);
		this.regions = this.regions.concat(rows);
		// регионы регистрации
		rows = await toolbox.sqlRequest('skyline', `SELECT * FROM dex_translations WHERE operator='yota' AND dict='um_regions'`);
		this.umRegions = this.umRegions.concat(rows);
		// полы
		rows = await toolbox.sqlRequest('skyline', `SELECT * FROM dex_translations WHERE operator='yota' AND dict='genders'`);
		this.genders = this.genders.concat(rows);
		// тип удостовения личности
		rows = await toolbox.sqlRequest('skyline', `SELECT * FROM dex_translations WHERE operator='yota' AND dict='doctypes'`);
		this.doctypes = this.doctypes.concat(rows);
		// тип удостовения личности - другой
		rows = await toolbox.sqlRequest('skyline', `SELECT * FROM dex_translations WHERE operator='yota' AND dict='doctypes_other'`);
		this.doctypesOther = this.doctypesOther.concat(rows);
		// для иностр. граждан док, подтверждающий право пребывания в РФ
		rows = await toolbox.sqlRequest('skyline', `SELECT * FROM dex_translations WHERE operator='yota' AND dict='docresidence'`);
		this.docresidence = this.docresidence.concat(rows);
	}
	async dexToWeb(dict, uid) {
		if (typeof this[dict] !== 'undefined') {
			// console.log('dict ', dict, ' справочник существует')
			let search = this[dict].find((item)=> item.dex == uid);
			// console.log('search => ', search);
			if (search && search.web) return search.web 
			else return null;
		} else return null
	}
	async webToDex(dict, uid) {
		if (typeof this[dict] !== 'undefined') {
			// console.log('dict ', dict, ' справочник существует')
			let search = this[dict].find((item)=> item.web == uid);
			// console.log('search => ', search);
			if (search && search.dex) return search.dex 
			else return null;
		} else return null
	}
}

class yotaCountrySchemas {
	constructor() {}

	// трансляция страны из договора базы в договор сервера
	getCountryForDogovor(id) {
		let cid = null;
		for (let item of countryList) {
			if (item.list.indexOf(id) != -1) cid = item.Id;
			break;
		}
		return cid;
	}
	// трансляция страны из договора сервера в договор базы
	getCountryForBase(id) {
		let cid = null;
		for (let item of countryList) {
			if (item.Id == id) cid = item.list[0];
			break;
		}
		return cid;
	}
}

let countryList = [
	{
		list: ['1', '293'], // список id как есть в базе dex для страны
        Name: "Россия",
        Id: '171'
	}
]
