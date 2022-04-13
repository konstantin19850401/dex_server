'use strict'
class Api {
	#bases;#toolbox;
	constructor(bases, toolbox) {
		this.#bases = bases;
		this.#toolbox = toolbox;
	}
	get Bases() { return this.#bases; }
	get Toolbox() { return this.#toolbox; }
}
module.exports = Api;