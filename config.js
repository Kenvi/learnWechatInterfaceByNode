'use strict'

var path = require('path');
var util = require('./libs/util');
var wechat_file = path.join(__dirname,'./config/wechat.txt');

var config = {
	wechat:{
		appID:'wx0df8e5d751cf49ed',
		appSecret:'4cdd9a6a200bf20d5d503919d750984e',
		token:'vlintokentestbykenvi',
		getAccessToken:function(){
			return util.readFileAsync(wechat_file);
		},
		saveAccessToken:function(data){
			data = JSON.stringify(data);
			return util.writeFileAsync(wechat_file,data);

		}
	}
};

module.exports = config;