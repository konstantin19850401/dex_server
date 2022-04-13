'use strict'
class Sim {
	// msisdn;icc;owner;status;type;fs;region;balance;
	constructor(data) {
		this.msisdn = '';
		this.icc = '';
		this.owner = '';
		this.status = '';
		this.type = '';
		this.fs = '';
		this.region = '';
		this.balance = '';
		this.InitSim(data);
	}
	get Icc() { return this.icc; };
	get Msisdn() { return this.msisdn; };
	get Owner() { return this.owner; };
	get Status() { return this.status; };
	get Type() { return this.type; };
	get Fs() { return this.fs; };
	get Region() { return this.region; };
	get Balance() { return this.balance; };

	set Region(value) {this.region = value;};
	InitSim(data) {
		if ( typeof data.msisdn !== 'undefind' && data.msisdn != '') this.msisdn = data.msisdn; 
		if ( typeof data.icc !== 'undefind' && data.icc != '') this.icc = data.icc; 
		if ( typeof data.msisdn !== 'undefind' && data.msisdn != '') this.msisdn = data.msisdn;
		if ( typeof data.owner_id !== 'undefind' && data.owner_id != '') this.owner = data.owner_id; 
		if ( typeof data.status !== 'undefind' && data.status != '') this.status = data.status; 
		if ( typeof data.fs !== 'undefind' && data.fs != '') this.fs = data.fs; 
		if ( typeof data.region_id !== 'undefind' && data.region_id != '') this.region = data.region_id; 
		if ( typeof data.balance !== 'undefind' && data.balance != '') this.balance = data.balance; 
	}
}	
module.exports = Sim;
