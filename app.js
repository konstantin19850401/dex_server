'use strict'
let express = require('express');
let core = require('./modules/Core');
let bodyParser = require('body-parser');
let app = express();
const port = 3020;

// Конфигурация
// Запросы с удаленных ресурсов
let allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Length');
    // res.header("Content-Type", "application/json; charset=utf-8");
    next();
 };

app.use(bodyParser.urlencoded({
  parameterLimit: 500000,
  extended: true,
  limit: 10 * 1024 * 1024,
}));

app.use(allowCrossDomain);
app.use('/static', express.static(__dirname + '/mediafiles'));
app.use('/adapters/mediafiles', express.static(__dirname + '/modules/apps/adapters/scans'));
app.use('/adapters/printing', express.static(__dirname + '/modules/apps/adapters/printing_forms/temp'));


core.EXPRESS = app;

app.listen(port, ()=> console.log(`ЗАПУСК СЕРВЕРА БУДЕТ ОСУЩЕСТВЛЕН НА ПОРТУ ${port}`));
