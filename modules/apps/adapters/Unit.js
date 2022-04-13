'use strict'
class Unit {
	// msisdn;icc;owner;status;type;fs;region;balance;
	constructor( data ) {
		this.data = {};
		this.Init(data);
	}
	get DocCity() { return typeof this.data.docCity !== 'undefined' ? this.data.docCity : '' };
	get LastName() { return typeof this.data.lastName !== 'undefined' ? this.data.lastName : '' };
	get FirstName() { return typeof this.data.firstName !== 'undefined' ? this.data.firstName : '' };
	get SecondName() { return typeof this.data.secondName !== 'undefined' ? this.data.secondName : '' };
	get Title() { return typeof this.data.title !== 'undefined' ? this.data.title : '' };
	get Region() { return typeof this.data.region !== 'undefined' ? this.data.region : '' };
	get Status() { return typeof this.data.status !== 'undefined' ? this.data.status : '' };

	DocCity( operator ) { return this.data[operator] && this.data[operator].docCity ? this.data[operator].docCity : '' };
	
	Init( row ) {
		if ( typeof row.uid !== 'undefined' ) this.uid = row.uid;
		if ( typeof row.lastname !== 'undefined' ) this.lastName = row.lastname;
		if ( typeof row.firstname !== 'undefined' ) this.firstName = row.firstname;
		if ( typeof row.secondname !== 'undefined' ) this.secondName = row.secondname;
		if ( typeof row.title !== 'undefined' ) this.title = row.title;
		if ( typeof row.region !== 'undefined' ) this.region = row.region;
		if ( typeof row.status !== 'undefined' ) this.status = row.status;

		// теперь разберемся с data
		this.data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
	}
}	
module.exports = Unit;
