const Auth = require('./classes/Auth');
const Validate = require('./classes/Validate');
const Apps = require('./classes/Apps');

class Core {
	constructor(toolbox) {
		this._connector = null;
		this.toolbox = toolbox;
		this.conname = 'mysql';
	}
	initModules() {
		this.Auth = new Auth(this._connector, this.toolbox);
		this.Validate = new Validate(this.toolbox);
		this.Apps = new Apps(this._connector, this.toolbox);
	}
	set connector(connector) {this._connector = connector;}

	get auth() {return this.Auth;}
	get validate() {return this.Validate;}
	get apps() {return this.Apps;}
}


module.exports = Core;