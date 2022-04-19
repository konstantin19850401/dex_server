'use_strict'
// МОДУЛИ
const soap = require('strong-soap').soap;
const request = require('request');
const dateFormat = require('dateformat');
const xml2js = require('xml2js');


// КЛАССЫ
//let toolbox = require('./Toolbox');
let logging = require('./Logging');

class Adapter {
	constructor(obj, core) {
		for (let key in obj) this[key] = obj[key];
		// переменные класса
		this.cntDocuments = 50;
		this.ifAdapterGetPortion = false;
		this.ifAdapterSendDocument = false;
		this.arrSendingRows = [];
        //this.toolbox = null;
        
	}
    // поиск в базе документов на отправку и маркировка их статусом 'отправляется'
    async checkDocumentForExport() {
    	if (this.ifAdapterGetPortion == false) {
            this.ifAdapterGetPortion = true;
            let rows = await this.toolbox.sqlRequest(this.base, `SELECT id FROM journal WHERE status='${this.DOCUMENT_TOEXPORT}' AND docid = '${this.docid}' LIMIT ${this.cntDocuments}`);
            if (rows.length > 0) {
                await this.printMessage(`Оператор ${this.operator}. База данных ${this.base}. Для отправки найдено ${rows.length} договоров. Список id=> ${JSON.stringify(rows)}`);
                let arr = rows.map((row)=> {return `'${row.id}'`;});
                await this.toolbox.sqlRequest(this.base, `UPDATE journal SET status='${this.DOCUMENT_EXPORTING}' WHERE id IN (${arr.join(',')})`);
                this.arrSendingRows = this.arrSendingRows.concat(arr);
                this.ifAdapterGetPortion = false;
            } else {
                this.ifAdapterGetPortion = false;
            }
        }
    }
    // получение документа со статусом "отправляется" и передача в метод по экспорту на сервер оператора
    async sendDocument() {
        if (this.ifAdapterSendDocument == false) {
            if (this.arrSendingRows.length > 0) {
                this.ifAdapterSendDocument = true;
                let idRow = this.arrSendingRows.shift();
                let row = await this.toolbox.sqlRequest(this.base, `SELECT * FROM journal WHERE status='${this.DOCUMENT_EXPORTING}' AND docid = '${this.docid}' AND id = ${idRow}`);
                if (row.length == 0 ) this.ifAdapterSendDocument = false;
                else {
                	this.printMessage(`Отправляем документ. Дайджест=> ${row[0].digest}`);
                    let result = await this.exportContractToOperator(row[0]);
                    if (result == false) this.printMessage(`Ошибка при экспорте документа ${row[0].digest}`);
                    else this.printMessage(`Документ был экспортирован удачно! ${row[0].digest}`);
                    this.ifAdapterSendDocument = false;
                }
            }
        }
    }
    // проверка при запуске есть ли документы со статусом "отправляется"
    async pickUpOldSending() {
        let rows = await this.toolbox.sqlRequest(this.base, `SELECT id FROM journal WHERE status='${this.DOCUMENT_EXPORTING}' AND docid = '${this.docid}'`);
        if (rows.length > 0) {
        	let arr = rows.map((row)=> {return `'${row.id}'`;});
            this.arrSendingRows = this.arrSendingRows.concat(arr);
            this.printMessage(`Есть старые на отправку. Список id=> ${JSON.stringify(this.arrSendingRows)}`);
        }
    }
    // передача документа на сервер оператору
    async exportContractToOperator(row) {
        
    }
    // вставка новой записи в журнал
    async insertNewRecord(message, rowid, contractStatus) {
        try {
            let row = await this.toolbox.sqlRequest(this.base, `SELECT journal FROM journal WHERE id = '${rowid}'`);
            let contract = await this.toolbox.xmlToJs(row[0].journal);
            let newRecord = {$:{time:dateFormat(new Date(), "HH:MM:ss dd:mm:yyyy")}, text: [message]};
            if (contract != undefined && contract != null && contract.root != undefined) {
                let s = contract;
                contract = {};
                contract.journal = {};
                contract.journal.record = [];
                contract.journal.record = s.root.record;
            } else if (contract == undefined || contract == null) contract = {};
            else if (contract.journal == undefined || contract.journal == null) contract.journal == {};
            if (contract.journal.record == undefined || contract.journal.record == null) contract.journal.record = {};
            contract.journal.record.push(newRecord);
            let builder = new xml2js.Builder();
            contract = JSON.stringify(contract);
            contract = contract.replace(/'/g, '');
            contract = JSON.parse(contract);
            let xml = builder.buildObject(contract);
            let query = `UPDATE journal SET journal = '${xml}'`;
            query += contractStatus != undefined ? `, status = '${contractStatus}'` : '';
            query += ` WHERE id = '${rowid}'`;
            await this.toolbox.sqlRequest(this.base, query);
        } catch (e) {
            console.log(e);
        }
        return true;
    }
    

    

    // прочие общие методы
    //удаление из базы отделений по их id
    async deleteUnitId() {
        console.log(`удаление абонентов из базы автодока для ${this.base} начато`);
        await this.toolbox.sqlRequest(`DELETE FROM autodoc_people WHERE unitid IN (354,500,599,640,678,843,935,1219,1554,1597,2000,2066,2117,2167,2239,2332,2353,2379,2481)`);
        let sbs = [
            {
                lastname: "Рева",
                firstname: "Ольга",
                secondname: "Борисовна",
                birth: "20.07.1961"
            },
            {
                lastname: "Лесняк",
                firstname: "Ольга",
                secondname: "Витальевна",
                birth: "09.05.1956"
            }
        ]
        for (let i=0; i<sbs.length; i++) {
            console.log(`Удаляем ${sbs[i].lastname} ${sbs[i].firstname} ${sbs[i].secondname}`);
            await this.toolbox.sqlRequest(`DELETE FROM autodoc_people WHERE firstname = '${sbs[i].firstname}' AND lastname='${sbs[i].lastname}' AND secondname='${sbs[i].secondname}' AND birth='${sbs[i].birth}'`);
        }
        console.log(`удаление абонентов из базы автодока для ${this.base} окончено`);
    }
    // инициализация логирования
    logging() {

    	this.log = new adapterLog(this.pseudoRoute, this.base);
	}
	// вывод сообщений (в консоль, в файл логов, в журнал документа)
	// если один аргумент, то просто в лог и в консоль, если два и более, сделает еще и запись в журнал документа
    async printMessage(message, rowid, contractStatus) {
    	let statusLog = await this.log.h(message);
	    if (statusLog != 1) console.log("ОШИБКА ЛОГИРОВАНИЯ!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! " , statusLog);
        if (arguments.length > 1) {
            await this.insertNewRecord(message, rowid, contractStatus);
        }
        return true;
    }
    // получение всех отделений, на которые созданы документы за период
    async getUnitsByPeriod(start, end) {
        let result = await this.toolbox.sqlRequest(this.base, `
            SELECT unitid FROM journal 
            WHERE jdocdate > '${start}000000000' AND jdocdate < '${end}235959999'
        `);
        let units = [];
        for (let i=0; i<result.length; i++) {
            if (units.indexOf(result[i].unitid) == -1) units.push(result[i].unitid);
        }
        return units;
    }


	// константы
    get DOCUMENT_NONE() { return DOCUMENT_NONE;}
    get DOCUMENT_DRAFT() { return DOCUMENT_DRAFT;}
    get DOCUMENT_UNAPPROVED() { return DOCUMENT_UNAPPROVED;}
    get DOCUMENT_APPROVED() { return DOCUMENT_APPROVED;}
    get DOCUMENT_TOEXPORT() { return DOCUMENT_TOEXPORT;}
    get DOCUMENT_EXPORTED() { return DOCUMENT_EXPORTED;}
    get DOCUMENT_RETURNED() { return DOCUMENT_RETURNED;}
    get DOCUMENT_EXPORTING() { return DOCUMENT_EXPORTING;}
    get DOCUMENT_TODELETE() { return DOCUMENT_TODELETE;}
    set CONNECTOR(connector) {this.connector = connector;}
    set TOOLBOX(toolbox) {this.toolbox = toolbox;}
    set DICTIONARIES(dictionaries) {this.dictionaries = dictionaries;}
    get routes() { return this.ROUTES}
    

}

// константы
const DOCUMENT_NONE = -1;
const DOCUMENT_DRAFT = 0; // черновик
const DOCUMENT_UNAPPROVED = 1; //на подтверждение
const DOCUMENT_APPROVED = 2; // подтвержден
const DOCUMENT_TOEXPORT = 3; // на отправку
const DOCUMENT_EXPORTED = 4; // экспортирован
const DOCUMENT_RETURNED = 5; // возвращен
const DOCUMENT_EXPORTING = 6; // отправляется
const DOCUMENT_TODELETE = 100; // на удаление

class adapterLog extends logging {
    constructor(value1, value2) {
        super(value1, value2);
    }
}

module.exports = Adapter;