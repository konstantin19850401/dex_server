const NAME = 'validate';
class Validate {
    constructor(toolbox) {
        this.toolbox = toolbox;
        this.AUTH_USERS;
    }
    checkPacket(packet) {
        let err = [];   
        if (typeof packet.com === 'undefined') err.push('Параметр com обязательный параметр');
        if (typeof packet.subcom === 'undefined') err.push('Параметр subcom обязательный параметр');

        // теперь проверим конкретно каждое поле пришедшего пакета
        let com = packet.com.split('.');
        let current = packets;
        for (let i=0; i<com.length; i++) {
            if (typeof current[com[i]] === 'undefined') {
                err.push('Проверьте параметр com');
                break;
            } else {
                current = current[com[i]];
            }
        }
        // проверить все поля
        if (typeof current[packet.subcom] === 'undefined') {
            err.push('Параметр subcom не соответствует правильному значению');
        } else {
            let fields = [{name: "datafields", f: current[packet.subcom].datafields, check: packet.data}, {name: "packetfields", f: current[packet.subcom].packetfields, check: packet}];
            for (let i=0; i<fields.length; i++) {
                let fds = fields[i].f;
                let check = fields[i].check;
                //console.log("fds=>", fds);
                for (let j=0; j<fds.length; j++) {
                    let name = fds[j].name;
                    // проверить наличие поля
                    if (typeof check[name] !== 'undefined') {
                        // проверить тип поля
                        if (fds[j].type.indexOf(typeof check[name]) == -1) err.push(`Поле ${name} для контейнера ${fields[i].name} не соответствует необходимому типу`);
                        // проверить длину поля
                        if (typeof fds[j].length !== 'undefined') { 
                            if (typeof fds[j].length !== 'object') {
                                let n = check[name].toString();
                                if (n.length !== fds[j].length) err.push(`Поле ${name} для контейнера ${fields[i].name} может быть длиной только ${fds[j].length} символов`);
                            } else {
                                if (check[name].length < fds[j].length.min) err.push(`Поле ${name} для контейнера ${fields[i].name} меньше минимальной длины`); 
                                if (check[name].length > fds[j].length.max) err.push(`Поле ${name} для контейнера ${fields[i].name} превышает максимальную длину`); 
                            }
                        }
                    } else {
                        err.push(`Поле ${name} для контейнера ${fields[i].name} является обязательным`); 
                    }
                }
            }
        }

        // если нет ошибок в пакете, проверим, авторизован ли пользователь
        if (err.length === 0) {
            // для пакета с заявкой на авторизацию не проверяем авторизованность. Для всех остальных проверяем
            if (packet.com === 'skyline.core.auth' && packet.subcom === 'initsession') {}
            else {
                if (this.AUTH_USERS.findIndex(element=> element.Uid === packet.uid) === -1) err.push(`Пользователь с uid ${packet.uid} не найден в системе. Необходима авторизация`)
            }
        }
        return err;
    }
    ifAuthorized(uid, AUTH_USERS) {
        let user = AUTH_USERS.find(element=> element.Uid === uid);
        if (typeof user === 'undefined') return false;
        else return true;
    }
    userStatus(uid, AUTH_USERS) {
        let status;
        if (this.ifAuthorized(uid, AUTH_USERS)) {
            console.log('аывторизован');
            let user =  AUTH_USERS.find(element=> element.Uid === uid);
            status  = user.UserStatus;
        } else {
            console.log('не авторизован');
            status = -1;
        }
        return status;
    }
    ifSibscribe(uid, SUBSCRIBERS) {
        if (typeof SUBSCRIBERS[uid] === 'undefined') return false
        else return true;
    }
    get name() {return Name;}
    set authUsers(AUTH_USERS) {this.AUTH_USERS = AUTH_USERS}
}


let packets = {
    skyline: {
        core: {
            auth: {
                initsession: {
                    datafields: [
                        {
                            name: 'login',
                            type: ['string'],
                            length: {
                                min: 5,
                                max: 10
                            }
                        },
                        {
                            name: 'password',
                            type: ['string', 'number'],
                            length: {
                                min: 6,
                                max: 12
                            }
                        }
                    ],
                    packetfields: []
                },
                killsession: {
                    datafields: [],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                },
                locksession: {
                    datafields: [],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                },
                unlocksession: {
                    datafields: [],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                }
            },
            apps: {
                list: {
                    datafields: [],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                },
                select: {
                    datafields: [
                        {
                            name: 'appid',
                            type: ['string'],
                        }
                    ],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                },
                kill: {
                    datafields: [
                        {
                            name: 'appid',
                            type: ['string'],
                        }
                    ],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                },
                killAll: {
                    datafields: [],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                },
                getAllUsers: {
                    datafields: [
                        {
                            name: 'appid',
                            type: ['string'],
                        }
                    ],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                },
                getUserSettings: {
                    datafields: [],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                },
                changeAppSettings: {
                    datafields: [
                        {
                            name: "appid",
                            type: ['string']
                        },
                        {
                            name: "configurationField",
                            type: ['string']
                        },
                        {
                            name: "listItem",
                            type: ['string']
                        },
                        {
                            name: "field",
                            type: ['string']
                        },
                        {
                            name: "method",
                            type: ['string']
                        },
                        {
                            name: "action",
                            type: ['string']
                        },
                    ],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                },
                getAppSettings: {
                    datafields: [
                        {
                            name: 'appid',
                            type: ['string']
                        }
                    ],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                }
            }
        },
        apps: {
            adapters: {
                start: {
                    datafields: [],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                },
                getAppDicts: {
                    datafields: [
                        {
                            name: 'dict',
                            type: ['string'],
                        },
                        {
                            name: 'subaction',
                            type: ['string']
                        },
                        {
                            name: 'action',
                            type: ['string']
                        },
                        {
                            name: 'base',
                            type: ['string']
                        },
                        {
                            name: 'onlyActual',
                            type: ['number'],
                            length: 1
                        }
                    ],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                },
                appApi: {
                    datafields: [],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                }
            },
            salesRepresentative: {
                appApi: {
                    datafields: [],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                }
            },
            storeHouse: {
                appApi: {
                    datafields: [],
                    packetfields: [
                        {
                            name: 'uid',
                            type: ['string'],
                            length: 32
                        }
                    ]
                }
            }
        }
    }
}



module.exports = Validate;