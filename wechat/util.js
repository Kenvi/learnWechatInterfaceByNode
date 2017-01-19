'use strict'

var xml2js = require('xml2js');
var Promise = require('bluebird');
var tpl = require('./tpl');

exports.parseXMLAsync = function(xml){
	return new Promise(function(resolve,reject){
		xml2js.parseString(xml,{trim:true},function(err,content){
			if(err){
				reject(err);
			}else{
				resolve(content);
			}
		});
	});
};

var formatMessage = function(res)	{
	var message = {};

	if(typeof res === 'object'){
		var keys = Object.keys(res);

		for(var i=0;i<keys.length;i++){
			var item = res[keys[i]];
			var key = keys[i];

			if(!(item instanceof Array) || item.length === 0){
				continue;
			}

			if(item.length === 1){
				var val = item[0];

				if(typeof val === 'object'){
					message[key] = formatMessage(val);
				}else{
					message[key] = (val || '').trim();
				}
			}else{
				message[key] = [];

				for(var j=0,k=item.length;j<k;j++){
					message[key].push(formatMessage(item[j]));
				}
			}
		}
	}

	return message;
};

exports.formatMessage = formatMessage;

exports.tpl = function(content,message){
	var info = {};
	var type = 'text';
	var fromUserName = message.FromUserName;
	var toUserName = message.ToUserName;

	if (Array.isArray(content)){
		type = 'news';
	}

	type = content.type || type;
	info.content = content;
	info.createTime = new Date().getTime();
	info.msgType = type;
	info.toUserName = fromUserName;
	info.fromUserName = toUserName;

	return tpl.compiled(info);
};