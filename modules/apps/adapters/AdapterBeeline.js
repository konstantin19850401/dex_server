'use strict'
// КЛАССЫ
let Adapter = require('./Adapter');
let Api = new (require('./AdapterBeelineApi'))();
let Contract = require('./Contract');
var dateFormat = require('dateformat');

class AdapterBeeline extends Adapter {
	constructor(obj) {
		super(obj);
        that = this;
	}

	async exportContractToBeelineV1(row) {
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

        return await this.exportContractToBeelineV1(row);
    }
    async apiCommands(packet, user) {
        if (Api[packet.data.action] != undefined) return await Api[packet.data.action](packet, this.toolbox, this.base, user, this);
        else return {err: 'Такого метода не существует'};
    }
    // apiGetCommands(req, res) {
    //     let packet = that.toolbox.parsingGet(req);
    //     if (Api[packet.com] != undefined) Api[packet.com](req, res);
    //     else res.end('Такого метода не существует');
    // }
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
module.exports = AdapterBeeline;