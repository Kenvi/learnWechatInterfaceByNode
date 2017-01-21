'use strict'

var Promise = require('bluebird');
var _ = require('lodash');
var request = Promise.promisify(require('request'));
var util = require('./util');
var fs = require('fs');

var prefix = 'https://api.weixin.qq.com/cgi-bin/';
var api = {
	accessToken: prefix + 'token?grant_type=client_credential',
	temporary:{
		upload:prefix + 'media/upload?',		
		fetch:prefix + 'media/get?',		
	},
	permanent:{
		upload:prefix + 'material/add_material?',	
		fetch:prefix + 'material/get_material?',	
		uploadNews:prefix + 'material/add_news?',	
		uploadNewsPic:prefix + 'media/uploadimg?',
		del:prefix + 'material/del_material?',	
		update:prefix + 'material/update_news?',	
		count:prefix + 'material/get_materialcount?',	
		batch:prefix + 'material/batchget_material?'
	},
	// 2016-10-28 4-8 第四天 用户分组爽歪歪（上）
	group:{
		create:prefix + 'tags/create?',
		fetch:prefix + 'tags/get?',
		check:prefix + 'tags/getidlist?',
		update:prefix + 'tags/update?',
		del:prefix + 'tags/delete?',
		batch:prefix + 'tags/members/batchtagging?', // 批量打标签
		unbatch:prefix + 'tags/members/batchuntagging?', // 批量取消标签
		
	},
	// 2016-10-31 4-10 第四天 获取用户私密信息（设置备注名、获取用户基本信息）
	user:{
		remark:prefix + 'user/info/updateremark?', // x修改备注
		fetch:prefix + 'user/info?',
		batchFetch:prefix + 'user/info/batchget?',
		list:prefix + 'user/get?'
	},
	// 2016-10-31 5-2 第五天 对分组群发消息
	mess:{
		tag:prefix + 'message/mass/sendall?',
		openId:prefix + 'message/mass/send?',
		del:prefix + 'message/mass/delete?',
		preview:prefix + 'message/mass/preview?',
		check:prefix + 'message/mass/get?'
	},
	// 2016-10-31 5-3 第五天 微信菜单-增加菜单配制项
	menu:{
		
	},

	// 2017-01-21
	ticket:{
		get:prefix + 'ticket/getticket?'
	}
}

var Wechat = function(opts){
	var that = this;
	this.appID = opts.appID;
	this.appSecret = opts.appSecret;
	this.getAccessToken = opts.getAccessToken;
	this.saveAccessToken = opts.saveAccessToken;
	this.getTicket = opts.getTicket;
	this.saveTicket = opts.saveTicket;
	this.fetchAccessToken()	;	
};

Wechat.prototype.fetchAccessToken = function(data){
	var that = this;

	return this.getAccessToken()
		.then(function(data){
			try{
				data = JSON.parse(data);
			}
			catch(e){
				return that.updateAccessToken();
			}

			if(that.isVaildAccessToken(data)){
				return Promise.resolve(data);
			}else{
				return that.updateAccessToken();				
			}
		})
		.then(function(data){

			that.saveAccessToken(data);

			return Promise.resolve(data);
		})
};

Wechat.prototype.fetchTicket = function(access_token){
	var that = this;


	return this.getTicket()
		.then(function(data){
			try{
				data = JSON.parse(data);
			}
			catch(e){
				return that.updateTicket(access_token);
			}

			if(that.isVaildTicket(data)){
				return Promise.resolve(data);
			}else{
				return that.updateTicket(access_token);				
			}
		})
		.then(function(data){

			that.saveTicket(data);

			return Promise.resolve(data);
		})
};


Wechat.prototype.isVaildAccessToken = function(data){
	if(!data || !data.access_token || !data.expires_in){
		return false;
	}

	var access_token = data.access_token;
	var expires_in = data.expires_in;

	var now = (new Date().getTime());
	if(now < expires_in){
		return true;
	}else{
		return false;
	}
};

Wechat.prototype.isVaildTicket = function(data){
	if(!data || !data.ticket || !data.expires_in){
		return false;
	}

	var ticket = data.ticket;
	var expires_in = data.expires_in;

	var now = (new Date().getTime());
	if(ticket && now < expires_in){
		return true;
	}else{
		return false;
	}
};

Wechat.prototype.updateAccessToken = function(){
	var appID = this.appID;
	var appSecret = this.appSecret;
	var url = api.accessToken + '&appid=' + appID + '&secret=' + appSecret;

	return new Promise(function(resolve,reject){
		request({url:url, json:true}).then(function(res){
			var data = res.body;
			var now = (new Date().getTime());
			var expires_in = now + (data.expires_in - 20) * 1000;

			data.expires_in = expires_in;

			resolve(data);
		})
	})
	
};

Wechat.prototype.updateTicket = function(access_token){
	var url = api.ticket.get + '&access_token=' + access_token + '&type=jsapi' ;

	return new Promise(function(resolve,reject){
		request({url:url, json:true}).then(function(res){
			var data = res.body;
			var now = (new Date().getTime());
			var expires_in = now + (data.expires_in - 20) * 1000;

			data.expires_in = expires_in;

			resolve(data);
		})
	})
	
};

Wechat.prototype.reply = function(){
	var content = this.body;
	var message = this.weixin;

	var xml = util.tpl(content,message);

	this.status = 200;
	this.type = 'application/xml';
	this.body = xml;
	// console.log(xml);
};

Wechat.prototype.uploadMaterial = function(type,matreial,permanent){
	var that = this;

	var form = {};
	var uploadUrl = api.temporary.upload;

	if(permanent){
		uploadUrl = api.permanent.upload;
		_.extend(form,permanent);
	}

	if(type === 'pic'){
		uploadUrl = api.permanent.uploadNewsPic;		
	}

	if(type === 'news'){
		uploadUrl = api.permanent.uploadNews;		
		form = matreial;
	}else{
		form.media = fs.createReadStream(matreial);
	}

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = uploadUrl + 'access_token=' + data.access_token;

				if(!permanent){
					url += '&type=' + type;
				}else{
					form.access_token = data.access_token;
				}

				var options = {
					method:'POST',
					url:url,
					json:true
				};

				if(type === 'news'){
					options.body = form;
				}else{
					options.formData = form;
				}

				request(options).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Upload matreial error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};
// 2016-10-28  4-6 第四天 荡平永久素材接口-下载、删除、更新 08:50						
										
Wechat.prototype.fetchMaterial = function(mediaId,type,permanent){
	var that = this;

	var fetchUrl = api.temporary.fetch;

	if(permanent){
		fetchUrl = api.permanent.fetch;
	}

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = fetchUrl + 'access_token=' + data.access_token ;

				var form = {};
				var options = {method:'POST',url:url,json:true};
				if(permanent){
					form.media_id = mediaId;
					form.access_token = data.access_token;
					options.body = form;
				}else{
					if(type==='video'){
						url.replace('https://','http://');
					}
					url += '&media_id=' + mediaId;
				}

				if(type==='news' || type==='video'){					
					request(options).then(function(res){
						var _data = res.body;
						if(_data){						
							resolve(_data);

						}else{
							throw new Error('Delete matreial error!');
						}

					})
					.catch(function(err){
						reject(err);
					});
				}else{
					resolve(url);
				}


			});
		
	})
	
};

Wechat.prototype.deleteMaterial = function(mediaId){
	var that = this;

	var form = {media_id:mediaId};

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.permanent.del + 'access_token=' + data.access_token + '&media_id=' + mediaId;

				request({method:'POST',url:url,body:form,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Delete matreial error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

Wechat.prototype.updateMaterial = function(mediaId,news){
	var that = this;

	var form = {media_id:mediaId};
	_.extend(form,news);

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.permanent.update + 'access_token=' + data.access_token + '&media_id=' + mediaId;

				request({method:'POST',url:url,body:form,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Update matreial error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

// 2016-10-28   4-7 第四天 荡平永久素材接口-查询永久素材数量接口、获取永久素材列表接口 23:39					

Wechat.prototype.countMaterial = function(){
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.permanent.count + 'access_token=' + data.access_token;

				request({method:'GET',url:url}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Count matreial error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

Wechat.prototype.batchMaterial = function(options){
	var that = this;

	options.type = options.type || 'image';
	options.offset = options.offset || 0;
	options.count = options.count || 1;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.permanent.batch + 'access_token=' + data.access_token;

				request({method:'POST',url:url,body:options,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Batch matreial error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

// 2016-10-28   4-8 第四天 用户分组爽歪歪（上）

Wechat.prototype.createTag = function(name){
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.create + 'access_token=' + data.access_token;
				var form = {
					tag:{
						name:name
					}
				}

				request({method:'POST',url:url,body:form,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Create Tag error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

Wechat.prototype.fetchTags = function(){
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.fetch + 'access_token=' + data.access_token;				

				request({method:'GET',url:url,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Get Tag error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

Wechat.prototype.checkTag = function(openId){
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.check + 'access_token=' + data.access_token;
				var form = {
					openid:openId
				}
				request({method:'POST',url:url,body:form,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Check Tag error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

Wechat.prototype.updateTag = function(id,name){
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.update + 'access_token=' + data.access_token;
				var form = {
					tag:{
						id:id,
						name:name
					}
				}

				request({method:'POST',url:url,body:form,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Update Tag error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

Wechat.prototype.batchTag = function(openIds,tagId){//openIds为数组，不能多于50
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.batch + 'access_token=' + data.access_token;
				var form = {
					openid_list:openIds,
					tagid:tagId
				}

				request({method:'POST',url:url,body:form,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Batch Tag error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

// 2016-10-28   4-9 第四天 用户分组爽歪歪（下）

Wechat.prototype.deleteTag = function(id){//openIds为数组，不能多于50
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.group.del + 'access_token=' + data.access_token;
				var form = {
					tag:{
						id:id
					}
				}

				request({method:'POST',url:url,body:form,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Delete Tag error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

// 2016-10-31 4-10 第四天 获取用户私密信息（设置备注名、获取用户基本信息）

Wechat.prototype.remarkUser = function(openId,remark){//openIds为数组，不能多于50
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.user.remark + 'access_token=' + data.access_token;
				var form = {
					openid:openId,
					remark:remark
				}

				request({method:'POST',url:url,body:form,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Update User remark error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};


Wechat.prototype.fetchUsers = function(openIds,lang){//openIds为数组，不能多于50
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url ;

				if(_.isArray(openIds)){
					url = api.user.batchFetch + 'access_token=' + data.access_token;
					var form = {
						user_list:openIds,
					}

					request({method:'POST',url:url,body:form,json:true}).then(function(res){
						var _data = res.body;
						if(_data){						
							resolve(_data);

						}else{
							throw new Error('Betch Fetch User error!');
						}

					})
					.catch(function(err){
						reject(err);
					});					
				}else{
					if(!lang){var lang = 'zh_CN';}
					url = api.user.fetch + 'access_token=' + data.access_token + '&openid=' +openIds+ '&lang=' + lang;

					request({method:'GET',url:url,json:true}).then(function(res){
						var _data = res.body;
						if(_data){						
							resolve(_data);

						}else{
							throw new Error('Betch Fetch User error!');
						}

					})
					.catch(function(err){
						reject(err);
					});
				}
			});
		
	})
	
};

// 2016-10-31 4-11 第四天 获取用户私密信息（ 获取用户列表）

Wechat.prototype.listUsers = function(openid){
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.user.list + 'access_token=' + data.access_token;				
				if(openid){url += '&next_openid=' + openid;}

				request({method:'GET',url:url,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Get Users list error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

// 2016-10-31 5-2 第五天 对分组群发消息

Wechat.prototype.sendByTag = function(type,message,tagId){
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.mess.tag + 'access_token=' + data.access_token;
				var msg = {
					filter:{},
					msgtype:type
				};
				msg[type] = message;
				if(!tagId){
					msg.filter.is_to_all = true;
				}else{
					msg.filter = {
						is_to_all:false,
						tag_id:tagId
					};
				}

				request({method:'POST',url:url,body:msg,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Send To Tag error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

Wechat.prototype.sendByOpenId = function(type,message,openIds){
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.mess.openId + 'access_token=' + data.access_token;
				var msg = {
					msgtype:type,
					touser:openIds
				};
				msg[type] = message;

				request({method:'POST',url:url,body:msg,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Send To OpenIds error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

Wechat.prototype.delMsg = function(msgId){
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.mess.del + 'access_token=' + data.access_token;
				var msg = {
					msg_id:msgId
				};

				request({method:'POST',url:url,body:msg,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Delete Msg error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

Wechat.prototype.previewMsg = function(type,message,openId){
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.mess.preview + 'access_token=' + data.access_token;
				var msg = {
					msgtype:type,
					touser:openId
				};
				msg[type] = message;

				request({method:'POST',url:url,body:msg,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Preview Msg error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

Wechat.prototype.checkMsg = function(msgId){
	var that = this;

	return new Promise(function(resolve,reject){
		that
			.fetchAccessToken()
			.then(function(data){
				var url = api.mess.check + 'access_token=' + data.access_token;
				var msg = {
					msg_id:msgId
				};

				request({method:'POST',url:url,body:msg,json:true}).then(function(res){
					var _data = res.body;
					if(_data){						
						resolve(_data);

					}else{
						throw new Error('Check Msg error!');
					}

				})
				.catch(function(err){
					reject(err);
				});
			});
		
	})
	
};

module.exports = Wechat;