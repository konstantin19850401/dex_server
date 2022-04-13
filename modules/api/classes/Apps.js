// МОДУЛИ
class Apps {
    constructor(connector, toolbox) {
        this.Name = 'apps';
        this.apps = [];
        this.toolbox = toolbox;
        this._connector = connector;
        this._base = 'skyline';
    }   
    async select(packet, AUTH_USERS, SUBSCRIBERS) {
            console.log("select пакет ", packet);
            let obj = {status: -1, err: []};
            obj.appid = packet.data.appid;
            
            let chk = this.checkUser(packet.uid, packet.data.appid, AUTH_USERS);
            if (chk.length > 0) {
                console.log('есть ошибки ', chk);
                obj.err = chk;
            } else {
                console.log('Ошибок нет');
                for (let user of AUTH_USERS) {
                    if (user.Uid === packet.uid) {
                        let status = user.RunApp(packet.data.appid);
                        if (status == -1) obj.err.push(`Приложение ${packet.data.appid} недоступно пользователю с uid ${packet.uid}`);
                        else obj.status  = 1;
                        break;
                    }
                }
            }
            return obj;
    }
    async kill(packet, AUTH_USERS, SUBSCRIBERS) {
            let err = [];
            let dp = JSON.parse(JSON.stringify(defPacket));
            let userIndex = AUTH_USERS.findIndex(user=> user.uid === packet.uid);
            if (userIndex == -1) err.push(`Приложение ${packet.data.appid} не доступно пользователю с uid ${packet.uid}`);
            else {
                let killStatus = AUTH_USERS[userIndex].killApp(packet.data.appid);
                if (killStatus == 1) dp.data.msg = `Приложение ${packet.data.appid} успешно закрыто для пользователя с uid ${packet.uid}`;
                else if (killStatus == 0) dp.data.msg = `Приложение ${packet.data.appid} не было запущено для пользователя с uid ${packet.uid}`;
                else if (killStatus == -1) err.push(`Приложение ${packet.data.appid} не доступно пользователю с uid ${packet.uid}`);
            }
            if (err.length > 0) dp.data.err = err;
            let subscriber =  SUBSCRIBERS[packet.uid];
            delete SUBSCRIBERS[packet.uid];
            subscriber.res.end(JSON.stringify(dp));
    }
    async killAll(packet, AUTH_USERS, SUBSCRIBERS) {
    	let err = [];
    	let dp = JSON.parse(JSON.stringify(defPacket));
    	let userIndex = AUTH_USERS.findIndex(element=> element.uid === packet.uid);
        if (userIndex == -1) err.push(`Приложения не доступны пользователю с uid ${packet.uid}`);
        else {
            let killStatus = AUTH_USERS[userIndex].killAllApps();
            if (killStatus == 1) dp.data.msg = `Все запущенные приложения успешно закрыты для пользователя с uid ${packet.uid}`; 
        }
    	if (err.length > 0) dp.data.err = err;
        let subscriber =  SUBSCRIBERS[packet.uid];
        delete SUBSCRIBERS[packet.uid];
        subscriber.res.end(JSON.stringify(dp));
    }
    async getAllUsers(packet, AUTH_USERS, SUBSCRIBERS) {
    	let err = [];
    	let dp = JSON.parse(JSON.stringify(defPacket));
    	if (this.apps.findIndex(element=> element.name === packet.data.appid) !== -1) {
    		let userIndex = AUTH_USERS.findIndex(element=> element.Uid === packet.uid);
    		if (AUTH_USERS[userIndex].ifAllowedApp(packet.data.appid)) {
    			let users = AUTH_USERS.filter((user)=> user.RunningApps.indexOf(packet.data.appid) !== -1);
		    	let uids = users.map((user)=> {return user.Uid});
		    	dp.data.msg = `Список пользователей, запустивших приложение ${packet.data.appid} [${uids.join(',')}]`;
    		} else err.push(`Приложение ${packet.data.appid} не доступно пользователю с uid ${packet.uid}`);
    	} else err.push(`Для приложения ${packet.data.appid} невозможно найти авторизованных пользователей`);
    	if (err.length > 0) dp.data.err = err;
        let subscriber =  SUBSCRIBERS[packet.uid];
        delete SUBSCRIBERS[packet.uid];
        subscriber.res.end(JSON.stringify(dp));
    }
    checkUser(uid, appid, AUTH_USERS) {
        let err = [];
        if (this.apps.findIndex(element=> element.name === appid) !== -1) {
            console.log('приложение есть в списке');
            if (AUTH_USERS.findIndex(element=> element.Uid === uid) == -1) err.push(`Приложение ${appid} недоступно пользователю с uid ${uid}`);
        } else err.push('Данное приложение не может быть запущено в виду его отсутствия');
        return err;
    }
    
    async getUserSettings(packet, AUTH_USERS, SUBSCRIBERS) {
        let obj = {status: -1};
        let err = []
        let user = AUTH_USERS.find(element=>element.uid === packet.uid);
        if (typeof user !== 'undefined') {
            let row = await this.toolbox.sqlRequest(this._connector, this._base, `
                SELECT * 
                FROM user 
                WHERE username = '${user.username}'
            `);
            if (row.length > 0) {
                obj.status = 1;
                obj.firstName = row[0].firstname;
                obj.lastName = row[0].lastname;
                obj.secondName = row[0].secondname;
                obj.userpic = row[0].userpic;
                obj.userGroup = row[0].user_group_id;
                // почта
                obj.email = [];
                let emails = JSON.parse(row[0].email);
                for (let em of emails) {
                    let o = {
                        email: em.email,
                        type: em.type
                    }
                    obj.email.push(o);
                }
                // телефоны
                obj.phones = [];
                let phones = JSON.parse(row[0].phones);
                for (let ph of phones) {
                    let o = {
                        phone: ph.phone,
                        type: ph.type
                    }
                    obj.phones.push(o);
                }
                // адрес
                obj.address = [];
                let addrs = JSON.parse(row[0].address);
                for (let addr of addrs) {
                    let o = {};
                    for (let elem of addr) {
                        o[elem.type] = { name: elem.name, type: elem.type}
                    }
                    // let o = {
                    //     region: addr.region.name,
                    //     district: addr.district.name,
                    //     city: addr.city.name,
                    //     street: addr.street.name,
                    //     building: addr.building.name,
                    //     appartament: addr.appartament.name,
                    // }
                    obj.address.push(o);
                }
                // сформируем данные для конфига приложений
                let appsConf = JSON.parse(row[0].apps_configuration);
                let skylineApps = await this.toolbox.sqlRequest(this._connector, this._base, `
                    SELECT * FROM skyline_apps
                `);
                let cf = {};
                for (let appcf in appsConf) {
                    for (let a of skylineApps) {
                        if (appsConf[appcf].name === a.uid) {
                            cf[a.uid] = {
                                uid: a.uid,
                                name: a.name,
                                description: a.description,
                                pic: a.pic,
                                configuration: appsConf[appcf].configuration
                            }
                        }
                    }
                }
                obj.appsConfiguration = cf;
                // персональная информация
                
            } else {
                err.push('Пользователь не найден');
            }
        } else {
            err.push('Пользователь не авторизован');
        }

        if (err.length > 0) obj.err = err;
        return obj;
    }
    async getAppSettings(packet, AUTH_USERS, SUBSCRIBERS) {
        let obj = {status: -1};
        let err = []
        let user = AUTH_USERS.find(element=>element.Uid === packet.uid);
        if (typeof user !== 'undefined') {
            obj.appid = packet.data.appid;
            if (user.ifAllowedApp(packet.data.appid)) {
                let app = user.appsConfig(packet.data.appid);
                obj.configuration = app.configuration;
                obj.status = 1;
            } else {
                err.push('Приложение не доступно пользователю');
            }
        } else {
            err.push('Пользователь не авторизован');
        }
        if (err.length > 0) obj.err = err;
        return obj;
    }
    async changeAppSettings(packet, AUTH_USERS, SUBSCRIBERS) {
        let obj = {status: -1};
        let err = []
        let user = AUTH_USERS.find(element=>element.Uid === packet.uid);
        if (typeof user !== 'undefined') {
            obj.appid = packet.data.appid;
            if (user.ifAllowedApp(packet.data.appid)) {
                let row = await this.toolbox.sqlRequest(this._connector, this._base, `
                    SELECT * 
                    FROM user 
                    WHERE username = '${user.username}'
                `);
                if (row.length > 0) {
                    let appsConf = JSON.parse(row[0].apps_configuration);
                    for (let app of appsConf) {
                        if (app.name === packet.data.appid) {
                            obj.status = 1;
                            obj.configurationField = packet.data.configurationField;
                            obj.listItem = packet.data.listItem;
                            obj.field = packet.data.field;
                            obj.method = packet.data.method;
                            obj.action = packet.data.action;

                            // теперь найдем необходимое
                            let sought;
                            if (obj.configurationField === 'accesses') {
                                sought = app.configuration[obj.configurationField].list[obj.listItem][obj.field].actions;
                            } else if (obj.configurationField === 'documents') {
                                sought = app.configuration[obj.configurationField].list[obj.listItem][obj.field].fields;
                            }
                            if (packet.data.action == 'forbid') sought.splice(sought.indexOf(obj.method), 1);
                            else if (packet.data.action == 'allow') {
                                if (sought.indexOf(obj.method) == -1) sought.push(obj.method);
                            }
                            console.log("sought=>", sought);
                            if (obj.configurationField === 'accesses') app.configuration[obj.configurationField].list[obj.listItem][obj.field].actions = sought;
                            else if (obj.configurationField === 'documents') app.configuration[obj.configurationField].list[obj.listItem][obj.field].fields = sought;
                            let newConf = JSON.stringify(appsConf);
                            await this.toolbox.sqlRequest(this._connector, this._base, `
                                UPDATE user 
                                SET apps_configuration = '${newConf}'
                                WHERE username = '${user.username}'
                            `);



                            // if (obj.configurationField === 'accesses') {
                            //     let actions = app.configuration[obj.configurationField].list[obj.listItem][obj.field].actions;
                            //     if (packet.data.action == 'forbid') actions.splice(actions.indexOf(obj.method), 1);
                            //     else if (packet.data.action == 'allow') {
                            //         if (actions.indexOf(obj.method) == -1) actions.push(obj.method);
                            //     }
                            //     app.configuration[obj.configurationField].list[obj.listItem][obj.field].actions = actions;
                            //     let newConf = JSON.stringify(appsConf);
                            //     await this.toolbox.sqlRequest(this._connector, this._base, `
                            //         UPDATE user 
                            //         SET apps_configuration = '${newConf}'
                            //         WHERE username = '${user.username}'
                            //     `);
                            // } else if (obj.configurationField === 'documents') {
                            //     let displayFields = app.configuration[obj.configurationField].list[obj.listItem][obj.field].fields;
                            //     if (packet.data.action == 'forbid') displayFields.splice(displayFields.indexOf(obj.method), 1);
                            //     else if (packet.data.action == 'allow') {
                            //         if (displayFields.indexOf(obj.method) == -1) displayFields.push(obj.method);
                            //     }
                            //     app.configuration[obj.configurationField].list[obj.listItem][obj.field].fields = displayFields;
                            //     let newConf = JSON.stringify(appsConf);
                            //     await this.toolbox.sqlRequest(this._connector, this._base, `
                            //         UPDATE user 
                            //         SET apps_configuration = '${newConf}'
                            //         WHERE username = '${user.username}'
                            //     `);
                            // }
                            

                            let allSessionsForUser = [];
                            for (let usr of AUTH_USERS) {
                                if (usr.username === user.username) { 
                                    if (usr.uid !== user.uid) allSessionsForUser.push(usr);
                                    usr.updateSettings = appsConf;
                                }
                            }

                            for (let usr of allSessionsForUser) {
                                if (typeof SUBSCRIBERS[usr.uid] !== 'undefined') {
                                    let subscriber =  SUBSCRIBERS[usr.uid];
                                    delete SUBSCRIBERS[usr.uid];
                                    subscriber.res.end(JSON.stringify({com: 'skyline.core.apps', subcom: 'changeAppSettings', data: obj}));
                                }
                            }   
                            break;
                        }
                    }
                } else {
                    err.push('Пользователь не найден');
                }
                // for (let app of row)
            } else {
                err.push('Приложение не доступно пользователю');
            }
        } else {
            err.push('Пользователь не авторизован');
        }
        if (err.length > 0) obj.err = err;
        return obj;
    }
    
    get name() {return this.Name;}
    // get list() {return {data: { list: this.apps.map((app)=> {return app.name})}}}
    list( packet, AUTH_USERS, SUBSCRIBERS ) {
        console.log('запрос списка приложений ');
        let o = {};
        let user = AUTH_USERS.find(element=> element.Uid === packet.uid);
        let allowedApps = user.AllowedApps;
        let apps = [];
        for (let i =0; i < allowedApps.length; i++ ) {
            console.log('allowedApps=> ', allowedApps[i].name);
            for (let j = 0; j < this.apps.length; j++) {
                if ( allowedApps[i] == this.apps[j].name ) {
                    console.log('совпадение => ', allowedApps[i]);
                    apps.push( {id: this.apps[j].name, description: this.apps[j].appDescription, title: this.apps[j].title, pic: this.apps[j].picture} );
                    break;
                }
            }
        }
        o.list = apps;
        // return this.apps.map((app)=> {return {id: app.name, description: app.appDescription, title: app.title, pic: app.picture}})
        console.log('apps=> ', apps);
        return o;
    }
    set newapp(app) {this.apps.push(app);}
}

let defPacket = {
    com: "skyline.core.apps",
    data: {}
}

module.exports = Apps;