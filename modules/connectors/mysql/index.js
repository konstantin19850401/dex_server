'use strict'
// МОДУЛИ
let mysql = require("mysql");

const NAME = "mysql";

class Mysql {
    constructor(obj) {
        this.BASES = {}; 
        this.POOL = {};
        this.MODE = {};
        if (obj) {
            for (let key in obj) {
                this.MODE[obj[key].pseudoName] = obj[key].database;
                this.BASES[obj[key].pseudoName] = {connectionLimit: obj[key].connectionLimit, host: obj[key].host, user: obj[key].user, password: obj[key].password, database: obj[key].database};
            }
        }
    }
    get name() { return NAME };
    connect(mode) {
        let p = null;
        try {
            for (let key in this.MODE) {
                if (mode === this.MODE[key]) {
                    if (this.POOL[key] === undefined) {
                        //console.log("создание пула для key =", key);
                        this.POOL[key] = mysql.createPool(this.BASES[key])
                    } else {
                        //console.log("Пул для key = ", key , " существует. Новый не создаем");
                    }
                    p = this.POOL[key];
                    break;
                }
            }
            return p;
        } catch(e) {
            console.log("Ошибка создания пула", e);
            return p;
        }
    }
    async sqlRequest(sql, base) {
        let that = this;
        return new Promise((resolve, reject)=> {
            that.connect(base).getConnection((err, connection)=> {
                if (err) {
                    console.log(`Ошибка соединения с базой данных. База=> ${cbase}. Запрос ${sql}. Описание ошибки=> ${err}`);
                    resolve(null);
                } else {
                    //console.log(`успешно соединились с базой ${cbase}`);
                    connection.query(sql,  function(error, result, fields) {
                        if (error) {
                            console.log("ошибка запроса mysql ", error);
                        }
                        connection.release();
                        resolve(result);
                    })
                }
            })
        });
    }
    newBase(data) {
        if (this.BASES[data.base] == undefined) {
            // console.log("добавляем новую базу data=", data)
            this.MODE[data.pseudoName] = data.base;
            this.BASES[data.pseudoName] = {connectionLimit: data.connectionLimit ? data.connectionLimit : 60, host: data.host, user: data.user, password: data.password, database: data.base};
        }
    }
}

module.exports = Mysql;