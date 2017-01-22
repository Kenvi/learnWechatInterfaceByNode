'use strict'

var Koa = require('koa');
var path = require('path');
var wechat = require('./wechat/g');
var config = require('./config');
var util = require('./libs/util');
var weixin = require('./weixin');
var wechat_file = path.join(__dirname,'./config/wechat.txt');


var app = new Koa();

var Wechat = require('./wechat/wechat')
var ejs = require('ejs')
var crypto = require('crypto')
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
		<script type="text/javascript">
			wx.config({
			    debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
			    appId: 'wx0df8e5d751cf49ed', // 必填，公众号的唯一标识
			    timestamp: '<%= timestamp %>', // 必填，生成签名的时间戳
			    nonceStr: '<%= noncestr %>', // 必填，生成签名的随机串
			    signature: '<%= signature %>',// 必填，签名，见附录1
			    jsApiList: [
						'startRecord',
						'stopRecord',
						'onVoiceRecordEnd',
						'translateVoice'
			    ] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
			});
		</script>
	</head>
	<body>
		<h1>点击标题开始翻译</h1>	
		<p id="title"></p>
		<div id="poster"></div>
	</body>
	</html>	
	
*/})

var createNonce = function(){
	return Math.random().toString(36).substr(2,15)
}

var createTimeStamp = function(){
	return parseInt(new Date().getTime()/1000,10) + ''
}

var _sign = function(noncestr,ticket,timestamp,url){
	var parms = [
		'noncestr=' + noncestr,
		'jsapi_ticket=' + ticket,
		'timestamp=' + timestamp,
		'url=' + url
	]
	console.log(parms)
	var str = parms.sort().join('&')
	var shasum = crypto.createHash('sha1')
	shasum.update(str)

	return shasum.digest('hex')
}

function sign(ticket,url){
	var noncestr = createNonce()
	var timestamp = createTimeStamp()
	var signature = _sign(noncestr,ticket,timestamp,url)

	return {
		noncestr:noncestr,
		timestamp:timestamp,
		signature:signature
	}
}


app.use(function *(next) {
	if (this.url.indexOf('/movie') > -1){
		var wechatApi = new Wechat(config.wechat)
		var data = yield wechatApi.fetchAccessToken()
		var access_token = data.access_token
		var dataTicket = yield wechatApi.fetchTicket(access_token)
		var ticket = dataTicket.ticket
		var url = this.href
		var parms = sign(ticket,url)


		this.body = ejs.render(tpl,parms)
		return next
	}

	yield next

})

app.use(wechat(config.wechat,weixin.reply));

app.listen(1234);

console.log('sever running on 1234');
