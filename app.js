'use strict'

var Koa = require('koa');
var path = require('path');
var wechat = require('./wechat/g');
var config = require('./config');
var util = require('./libs/util');
var weixin = require('./weixin');
var wechat_file = path.join(__dirname,'./config/wechat.txt');


var app = new Koa();

var ejs = require('ejs')
var heredoc = require('heredoc')
var tpl = heredoc(function(){/*
	<!DOCTYPE html>
	<html lang="zh-CN">
	<head>
		<title>猜电影</title>
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">        
		<meta name="viewport" content="initial-scale=1,maximum=1,minimum-scale=1">
		<script type="text/javascript" src="//cdn.bootcss.com/zepto/1.2.0/zepto.js"></script>
		<script type="text/javascript" src="http://res.wx.qq.com/open/js/jweixin-1.0.0.js"></script>
	</head>
	<body>
		<h1>点击标题开始翻译</h1>	
		<p id="title"></p>
		<div id="poster"></p>
	</body>
	</html>	
	
*/})

app.use(function *(next) {
	if (this.url.indexOf('/movie') > -1){
		this.body = ejs.render(tpl,{})
		return next
	}

	yield next

})

app.use(wechat(config.wechat,weixin.reply));

app.listen(1234);

console.log('sever running on 1234');
