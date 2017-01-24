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
		<title>搜电影</title>
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">        
		<meta name="viewport" content="initial-scale=1,maximum-scale=1,minimum-scale=1">
		<script type="text/javascript" src="//cdn.bootcss.com/zepto/1.2.0/zepto.js"></script>
		<script type="text/javascript" src="http://res.wx.qq.com/open/js/jweixin-1.0.0.js"></script>
		<script type="text/javascript">
			wx.config({
			    debug: false, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
			    appId: 'wx0df8e5d751cf49ed', // 必填，公众号的唯一标识
			    timestamp: '<%= timestamp %>', // 必填，生成签名的时间戳
			    nonceStr: '<%= noncestr %>', // 必填，生成签名的随机串
			    signature: '<%= signature %>',// 必填，签名，见附录1
			    jsApiList: [
						'startRecord',
						'stopRecord',
						'onVoiceRecordEnd',
						'translateVoice',
						'onMenuShareAppMessage',
						'previewImage'
			    ] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
			})
			wx.ready(function(){
				var isRecord = false
				var imgs = {}
				var shareContent = {
			    title: 'heiheihei', // 分享标题
			    desc: '我搜出来了 ' , // 分享描述
			    link: 'https://github.com', // 分享链接
			    imgUrl: 'subject.images.large', // 分享图标
			    type: 'link', // 分享类型,music、video或link，不填默认为link
			    dataUrl: '', // 如果type是music或video，则要提供数据链接，默认为空
			    success: function () { 
			        alert('success')
			    },
			    cancel: function () { 
			        alert('fail')
			    }
				}
				wx.onMenuShareAppMessage(shareContent);

				$('#poster').on('click',function(){
					wx.previewImage(imgs)
				})
				
				$('h1').on('click',function(){
					if(!isRecord){
						isRecord = true
						wx.startRecord({
							cancel:function(){
								alert('can not search !')
							}
						})
						return
					}else{
						isRecord = false
						wx.stopRecord({
						    success: function (res) {
					        var localId = res.localId;
						      wx.translateVoice({
						          localId: localId, // 需要识别的音频的本地Id，由录音相关接口获得
						          isShowProgressTips: 1, // 默认为1，显示进度提示
						          success: function (res) {
					              var result = res.translateResult; // 语音识别的结果

					              $.ajax({
													type:'get',
													url:'https://api.douban.com/v2/movie/search?q=' + result,
													dataType:'jsonp',
													jsonp:'callback',
													success:function(data){
														var subject = data.subjects[0]
														$('#title').html(subject.title)
														$('#director').html(subject.directors[0].name)
														$('#year').html(subject.year)
														$('#poster').html('<img src="' + subject.images.large + '" />')

														imgs = {
															current:subject.images.large,
															urls:[subject.images.large]
														}
														data.subjects.forEach(function(item){
															imgs.urls.push(item.images.large)
														})

														shareContent = {
													    title: subject.title || '', // 分享标题
													    desc: '我搜出来了 ' + subject.title, // 分享描述
													    link: 'https://github.com', // 分享链接
													    imgUrl: subject.images.large, // 分享图标
													    type: 'link', // 分享类型,music、video或link，不填默认为link
													    dataUrl: '', // 如果type是music或video，则要提供数据链接，默认为空
													    success: function () { 
													        alert('success')
													    },
													    cancel: function () { 
													        alert('fail')
													    }
														}

														wx.onMenuShareAppMessage(shareContent);
													}
					              })
						          }
						      })
						    }
						})
					}
				})
				
			})
		</script>
	</head>
	<body>
		<h1>点击标题开始翻译</h1>	
		<p id="title"></p>
		<div id="director"></div>
		<div id="year"></div>
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
