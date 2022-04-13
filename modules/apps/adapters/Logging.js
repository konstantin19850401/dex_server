// МОДУЛИ
const dateFormat = require('dateformat');
const fs = require('fs'); 
const path = require('path');
const mkdirp = require('mkdirp');

class Logging {
	constructor(operator, base) {
		this.operator = operator;
		this.base = base;
		this.fileName = dateFormat(new Date(), 'yyyymmdd');
		this.errorPath = `${__dirname}/logs/${operator}/${base}/ERRORS/`;
		this.historyPath = `${__dirname}/logs/${operator}/${base}/HISTORY/`;
		this.init();
	}
	init() {
		let that = this;
        let oldmask = process.umask(0);
        new Promise((resolve, reject)=> {
            mkdirp(that.errorPath, "0777", function (err) {
                if (err) console.error(err);    
                new Promise((resolve1, reject1)=> {
                    fs.exists(that.errorPath+that.fileName+".log", function (exists) {
                        if (!exists) fs.writeFileSync(that.errorPath+that.fileName+".log", "", {mode: "0777"});
                        resolve1();
                    })
                }).then(()=> {
                    resolve();
                })                
            });
        }).then(()=> {
            new Promise((resolve, reject)=> {
                mkdirp(that.historyPath, "0777", function (err) {    
                    if (err) console.error(err);
                    new Promise((resolve1, reject1)=> {
                        fs.exists(that.historyPath+that.fileName+".log", function (exists) {
                            if (!exists) fs.writeFileSync(that.historyPath+that.fileName+".log", "", {mode: "0777"});
                            resolve1()
                        })
                    }).then(()=> {
                        resolve();
                        process.umask(oldmask);
                    }) 
                });
            })
        })
	}
    async h(data) {
        let that = this;
        let status = 1;
        return new Promise((resolve, reject)=> {
            let newDate = dateFormat(new Date(), "yyyymmdd");
            if (that.fileName != newDate) that.fileName = newDate;
            let o;
            if (typeof data == "string") o = data;
            else if (typeof data == "object") o = JSON.stringify(data);
            else o = data;
            let currentTime = "\n"+dateFormat(new Date(), "HH:MM:ss");
            fs.open(that.historyPath+that.fileName+".log", "a+", "0777", function(err, file_handle) {
                if (!err) {
                    fs.write(file_handle, currentTime+" "+o, null, 'utf8', function(err, written) {
                        if (err) {
                            status = -2
                            console.log(err);
                        }
                        resolve(status);
                    });
                } else {
                    status = -1;
                    // Обработка ошибок
                    console.log("Ошибка логирования "+err);
                    resolve(status);
                }
            });
        })
    }
}

module.exports = Logging;