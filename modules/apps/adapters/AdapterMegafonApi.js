const fs = require('fs');
const PDFDocument = require('pdfkit');
const pdf2base64 = require('pdf-to-base64');
// const codes = require('rescode');
// const bwipjs = require('bwip-js');

class AdapterMegafonApi {
	constructor() {
        this.docid = 'DEXPlugin.Document.Mega.EFD.Fiz';
    }
    async list(packet, toolbox, base, user, adapter) {
        // console.log("list ", base);
        console.log('запрос');
        let obj = {};
        let err = [];
        obj.list = [];
        obj.operator = 'MEGAFON';
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

                    for (let i=0; i<result.length;i++) {
                        let row = result[i];
                        let fields = {};
                        fields.id = row.id;
                        fields.status = row.status;
                        fields.unitid = row.unitid;
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
		let ids = packet.data.list.join(',');
		obj.base = packet.data.base;
        let rows = await toolbox.sqlRequest(base, `SELECT data FROM journal WHERE id IN (${ids})`);
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