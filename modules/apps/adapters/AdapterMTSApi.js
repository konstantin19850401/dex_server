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
	constructor() {
		this.docid = 'DEXPlugin.Document.MTS.Jeans';
        // this.test();
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
                    page.registerFontkit(fontkit);
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
                                let item = form.getTextField(flds[key]);
                                item.setText(dataContract.Document[key][0]);
                                // console.log("dataContract.Document[key][0]=> ", dataContract.Document[key][0]);
                                if (schema[key].fontSize) item.setFontSize(schema[key].fontSize);
                                item.updateAppearances(customFont);
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
    async test() {
        let buffer = fs.readFileSync(`${__dirname}/printing_forms/documents/mts/test.pdf`);
        let pdfDoc = await pdfLib.PDFDocument.load(buffer);
        pdfDoc.registerFontkit(fontkit);

        const fontBytes = fs.readFileSync(`${__dirname}/fonts/arial.ttf`);
        const customFont = await pdfDoc.embedFont(fontBytes);

        const form = pdfDoc.getForm();
        let phone = form.getTextField('phone');
        phone.setText("9288281650");
        phone.updateAppearances(customFont);
        let icc = form.getTextField('iccid');
        icc.setText("8970101708754785885");
        icc.updateAppearances(customFont);
        form.flatten();
        fs.writeFileSync(`${__dirname}/printing_forms/documents/mts/output.pdf`, await pdfDoc.save());
    }
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