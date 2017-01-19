'use strict'

var path = require('path');
var config = require('./config');
var Wechat = require('./wechat/wechat');

var wechatApi = new Wechat(config.wechat);

exports.reply = function* (next){
	var message = this.weixin;

	if(message.MsgType === 'event'){
		if(message.Event === 'subscribe'){
			if(message.EventKey){
				console.log('Qcode: '+message.EventKey+' '+message.ticket);
			}
			this.body = 'Hi,you subscribe me \r\n';
		}else if(message.Event === 'unsubscribe'){
			console.log('unhappy!');
			this.body = 'You unsubscribe me !\r\n'
		}else if(message.Event === 'LOCATION'){
			this.body = 'your address is '+message.Latitude+' / '+message.Longitude+' - '+message.Precision;
		}else if(message.Event === 'CLICK'){
			this.body = 'your clicked the message key';
		}else if(message.Event === 'SCAN'){
			console.log('Qcode: '+message.EventKey+' '+message.ticket);
			this.body = 'you Qcode';
		}else if(message.Event === 'VIWE'){
			this.body = 'you click the href: '+message.EventKey;
		}
	}else if(message.MsgType === 'text'){
		var content = message.Content;
		var reply = 'You say '+message.Content+' is complicated!';

		if(content === '1'){
			reply = '说，你是猪';
		}

		if(content === '2'){
			reply = '你是猪';
		}

		if(content === '3'){
			reply = '傻逼';
		}

		if(content === '5'){
			var data = yield wechatApi.uploadMaterial('image',path.join(__dirname , '/upload/rose.jpg'));
			
			reply = {
				type:'image',
				mediaId:data.media_id
			};
			console.log(reply);
		}

		if(content === '6'){
			var data = yield wechatApi.uploadMaterial('video',path.join(__dirname , '/upload/6.mp4'));
			
			reply = {
				type:'video',
				title:'video test',
				description:'23333',
				mediaId:data.media_id
			};
		}

		if(content === '7'){
			var data = yield wechatApi.uploadMaterial('image',path.join(__dirname , '/upload/rose.jpg'));
			
			reply = {
				type:'music',
				title:'music test',
				description:'23333',
				musicUrl:'http://mepg.5nd.com/2015/2015-9-12/66325/1.mp3',
				thumbMediaId:data.media_id
			};
		}

		if(content === '8'){
			var data = yield wechatApi.uploadMaterial('image',path.join(__dirname , '/upload/rose.jpg'),{type:'image'});
			
			reply = {
				type:'image',
				mediaId:data.media_id
			};
		}

		if(content === '9'){
			var data = yield wechatApi.uploadMaterial('video',path.join(__dirname , '/upload/6.mp4'),
				{type:'video',description:'{"title":"nice video","introduction":"never say goobye"}'});

			
			reply = {
				type:'video',
				title:'video test',
				description:'23333',
				mediaId:data.media_id
			};
		}

		if(content === '171217'){
			reply = [{
				title:'看漫天黄叶远飞',
				description:'',
				picUrl:'http://mmbiz.qpic.cn/mmbiz/nYa9etKLM6FxFbUpaeiaK5cNp2icBkibopvqIqS9U6DFuYnpz0ZLN4z4ibI5fBSdyicFxGOFWDHafkw3qgLyPvicxqvQ/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1',
				url:'http://mp.weixin.qq.com/s?__biz=MzIzNTAxMjc3Mw==&mid=500892328&idx=1&sn=355cf549f911d0755691110173c6c3b4&scene=0#wechat_redirect'
			}];
		}

		// 2016-10-28   4-7 第四天 荡平永久素材接口-查询永久素材数量接口、获取永久素材列表接口 23:39		

		if(content === '10'){
			var picData = yield wechatApi.uploadMaterial('image',path.join(__dirname , '/upload/rose.jpg'),{});

			var media = {
				articles:[{
					title:'2333',
					thumb_media_id:picData.media_id,
					author:'chenxiaobin',
					digest: 'no digest',
					show_cover_pic:1,
					content:'no content',
					content_source_url:'http://www.baidu.com'
				},{
					title:'6666',
					thumb_media_id:picData.media_id,
					author:'chenxiaobin',
					digest: 'no digest',
					show_cover_pic:1,
					content:'no content',
					content_source_url:'http://www.baidu.com'
				}]
			};

			var data = yield wechatApi.uploadMaterial('news',media,{});
			data = yield wechatApi.fetchMaterial(data.media_id,'news',{});

			console.log(data);

			var items = data.news_item;
			var news = [];

			items.forEach(function(item){
				news.push({
					title:item.title,
					description:item.digest,
					picUrl:picData.url,
					url:item.url
				});
			});
			
			reply = news;
		}

		if(content === '11'){
			var counts = yield wechatApi.countMaterial();

			var results = yield [
				wechatApi.batchMaterial({type:'image',offset:0,count:10}),
				wechatApi.batchMaterial({type:'video',offset:0,count:10}),
				wechatApi.batchMaterial({type:'voice',offset:0,count:10}),
				wechatApi.batchMaterial({type:'news',offset:0,count:10})
			];

			console.log(JSON.stringify(results));
			var count = JSON.parse(counts);
			reply = 'voice: '+count.voice_count+'  video: '+count.video_count+'  image: '+count.image_count+'  news: '+count.news_count;
		}

		// 2016-10-28   4-9 第四天 用户分组爽歪歪（下）
		if(content === '12'){
			// var tag = yield wechatApi.batchTag(message.FromUserName,101);
			// console.log('new Tag ..... ' + JSON.stringify(tag));

			var name = yield wechatApi.checkTag(message.FromUserName);
			console.log('check user tag \n ' + message.FromUserName+' \n '+ JSON.stringify(name));

			// var rename = yield wechatApi.updateTag(101,'pretty');
			// console.log('update tag \n ' + JSON.stringify(rename));

			// var rename = yield wechatApi.deleteTag(100);
			// console.log('update tag \n ' + JSON.stringify(rename));

			var tags = yield wechatApi.fetchTags();
			console.log(' Tags ..... \n ' + JSON.stringify(tags));

			reply = '666';

		}

		// 2016-10-31 4-10 第四天 获取用户私密信息（设置备注名、获取用户基本信息）
		if(content === '13'){
			var user = yield wechatApi.fetchUsers(message.FromUserName);
			console.log(user);

			var openids = [{openid:message.FromUserName,lang:'en'}];
			var users = yield wechatApi.fetchUsers(openids);
			console.log(users);

			reply = JSON.stringify(user);

		}

		// 2016-10-31 4-11 第四天 获取用户私密信息（ 获取用户列表）
		if(content === '14'){
			var userList = yield wechatApi.listUsers();
			console.log(userList);

			reply = userList.total;

		}

		// 2016-10-31 5-2 第五天 对分组群发消息 
		if(content === '15'){
			var mpnews = {
				media_id:'0y6S2vsRiLbB6OznCjyHSiUmN--CVe8lQ5D5Z-tyPNI'
			};
			var sendByTag = yield wechatApi.sendByTag('mpnews',mpnews,101);			

			console.log(sendByTag); //(============================  出错 ========================)
			reply = 'Yeah';

		}

		if(content === '16'){
			var mpnews = {
				media_id:'0y6S2vsRiLbB6OznCjyHSiUmN--CVe8lQ5D5Z-tyPNI'
			};
			var preview = yield wechatApi.previewMsg('mpnews',mpnews,message.FromUserName);			

			console.log(preview); 
			reply = 'Yeah';

		}

		if(content === '17'){
			var checkMsg = yield wechatApi.checkMsg('');			

			console.log(checkMsg); 
			reply = 'Yeah';

		}

		this.body = reply;
	}

	yield next;
};