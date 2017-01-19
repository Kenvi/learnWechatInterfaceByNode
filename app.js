'use strict'

var Koa = require('koa');
var path = require('path');
var wechat = require('./wechat/g');
var config = require('./config');
var util = require('./libs/util');
var weixin = require('./weixin');
var wechat_file = path.join(__dirname,'./config/wechat.txt');


var app = new Koa();

app.use(wechat(config.wechat,weixin.reply));

app.listen(1234);

console.log('sever running on 1234');