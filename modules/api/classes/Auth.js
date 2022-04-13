'use_strict'
const NAME = 'auth';
const CLIENT = require('./Client');
class Auth {
    constructor(connector, toolbox) {
        this.connector = connector;
        this.toolbox = toolbox;
        this.base = 'skyline';
    }
    async initsession(packet, AUTH_USERS) {
        let err = [];
        let obj = {};
        let client;
        if (typeof packet.data.login === 'null' || typeof packet.data.login === 'undefined' || 
            typeof packet.data.password === 'null' || typeof packet.data.password === 'undefined') err.push('Проверьте корректность введенных данных');
        else {
            let result = await this.toolbox.sqlRequest(this.connector, this.base, `
                SELECT u.username, u.uid, u.firstname, u.lastname, u.secondname, u.apps_configuration, u.user_group_id, u.userpic, u.status, ug.name, ug.apps
                FROM user AS u
                LEFT JOIN user_groups AS ug ON u.user_group_id = ug.user_group_id
                WHERE u.username = '${packet.data.login}' AND u.password = '${packet.data.password}'`);

            if (result.length == 0) err.push('Неверный логин и/или пароль');
            else {
                client = new CLIENT(result[0], this.toolbox, this.connector);
                await client.Inits();

                console.log( 'доступные приложения=> ', client.AllowedApps );
                // await client.initAppConfigurations(this.toolbox, this.connector);
                // let settings = client.AllAppsConfigs;

                console.log('AllAppsConfigs=> ', client.AllAppsConfigs);

                AUTH_USERS.push(client);
                obj.uid = client.Uid;
                obj.firstname = client.FirstName;
                obj.secondname = client.SecondName;
                obj.lastname = client.LastName;
                obj.userpic = client.Userpic;
                obj.availableApps = client.AllAppsConfigs;
                obj.welcomeMessage = `Добро пожаловать в систему, ${client.FirstName} ${client.SecondName}!`;

                // console.log("client.appsConfig('adapters')=> ", client.AllAppsConfigs);

                
                      
            }
        }
        if (err.length > 0) obj.err = err;
        return obj;
    }
    async killsession(packet, AUTH_USERS) {
        let err = [];
        let obj = {status: -1};
        let uid = packet.uid;
        let issetClient = AUTH_USERS.findIndex(element=> element.Uid === uid);
        if (issetClient == -1) {
            err.push(`Пользователь с uid ${uid} не найден`);
        } else {
            obj.status = 1;
            AUTH_USERS.splice(issetClient, 1);
            obj.msg = `Пользователь с uid ${uid} успешно удален из системы`;
        }
        if (err.length > 0) obj.err = err;
        return obj;
    }
    async locksession(packet, AUTH_USERS) {
        let err = [];
        let obj = {status: -1};
        let uid = packet.uid;
        let issetClient = AUTH_USERS.findIndex(element=> element.Uid === uid);
        if (issetClient == -1) {
            err.push(`Пользователь с uid ${uid} не найден`);
        } else {
            let user = AUTH_USERS.find(element=> element.Uid === uid);
            user.BlockUser();
            obj.status = 1;
            obj.msg = 'Сессия пользователя заблокирована';
        }
        if (err.length > 0) obj.err = err;
        return obj;
    }
    async unlocksession(packet, AUTH_USERS) {
        let err = [];
        let obj = {status: -1};
        let uid = packet.uid;
        let issetClient = AUTH_USERS.findIndex(element=> element.Uid === uid);
        if (issetClient == -1) {
            err.push(`Пользователь с uid ${uid} не найден`);
        } else {
            let user = AUTH_USERS.find(element=> element.Uid === uid);
            let username = user.UserName;
            let result = await this.toolbox.sqlRequest(this.connector, this.base, `
                SELECT * FROM user WHERE username = '${username}' AND password = '${packet.data.password}'
            `);
            if (result.length == 0) err.push('Ошибка разблокировки сессии. Ошибка пароля.');
            else {
                user.UnBlockUser();
                obj.status = 1;
                obj.msg = 'Сессия пользователя разблокирована';
            }
        }
        if (err.length > 0) obj.err = err;
        return obj;
    }
    get name() {return NAME;}
}

module.exports = Auth;