const fs = require('fs');
const PDFDocument = require('pdfkit');
const pdf2base64 = require('pdf-to-base64');
// const codes = require('rescode');
// const bwipjs = require('bwip-js');

class AdapterBeelineApi {
	constructor() {
		this.docid = 'DEXPlugin.Document.Beeline.DOL2.Contract';
	}
	async printForm(packet, toolbox, base, user) {
		let obj = {};
		let err = [];
		obj.data = [];
		let ids = packet.data.list.join(',');
		obj.base = packet.data.base;
        let rows = await toolbox.sqlRequest(base, `SELECT data FROM journal WHERE id IN (${ids})`);
        if (rows.length > 0) {
            let schema = JSON.parse(fs.readFileSync(`${__dirname}/printing_forms/documents/beeline/schema.json`, 'utf8'));

            let doc = new PDFDocument({
	            autoFirstPage: false,
	            bufferPages: true
	        });

            doc.pipe(fs.createWriteStream(`${__dirname}/printing_forms/temp/beeline_1212121212.pdf`));

            for (let row of rows) {
            	// console.log(row);
            	let dataContract = await toolbox.xmlToJs(row.data);
            	
            	doc.addPage({
				    // size: 'LEGAL',
				    // layout: 'portrait'
				});
                doc.page.margins.bottom = 0;
            	// doc.page.margins.top = 0;

            	doc.image(`${__dirname}/printing_forms/documents/beeline/documentForm.jpg`, 10, 30, {width: 590, height: 780, align: 'center'})
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
                                // console.log("varn=>", varn, " variant.field=>", variant.field);
                                // console.log("typeof=>", typeof varn.if, ' ====>', dataContract.Document[variant.field][0], varn.if.indexOf(1));
                                if (varn.if.indexOf(parseInt(dataContract.Document[variant.field][0])) != -1) {
                                    // console.log("а вот да");
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
		return obj;
	}
}	
module.exports = AdapterBeelineApi;