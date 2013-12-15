var express = require('express');
var app = express();
var Podcast = require('podcast');
var yt = require('youtube-feeds');
var ytvideos = require('./ytvideos.js');
var merge = require('object-mapper').merge;

var videoFormat = "video/mp4";
var videoQuality = "hd720";

var podcastOptionsMap = [];
var podcastItemsMap = [];

podcastOptionsMap["playlist"] = {
	"title":"title",
	"description":"description",
	"author":"itunesAuthor",
	"author":"author",
	"thumbnail.hqDefault":"itunesImage",
	"thumbnail.hqDefault":"image_url"

};
podcastItemsMap["playlist"] = {
	"item.video.title":"title",
	"item.video.player.default":"link",
	"item.id":"guid",
	"item.video.description":"description",
	"video.url":"enclosure.url",
	"item.video.uploaded":"date",
	"item.author":"itunesAuthor",
	"item.video.duration":"itunesDuration"
};

podcastOptionsMap["channel"] = {
	"title":"title",
	"description":"description",
	"author":"itunesAuthor",
	"author":"author",
	"thumbnail.hqDefault":"itunesImage",
	"thumbnail.hqDefault":"image_url"

};
podcastItemsMap["channel"] = {
	"item.title":"title",
	"item.player.default":"link",
	"item.id":"guid",
	"item.description":"description",
	"video.url":"enclosure.url",
	"item.uploaded":"date",
	"item.uploader":"itunesAuthor",
	"item.duration":"itunesDuration"
};

var getVideoLinks = function(items,cb)
{
	var queue = items.slice();
	var links = [];
	var complete = false;
	var getLink = function()
	{
		if(queue.length>0)
		{
			var current = queue.shift();
			var id = typeof(current.video)=="undefined" ? current.id : current.video.id;
			ytvideos.getVideoInfo(id,function(videoInfo){
				links.push({
					id: id,
					info: videoInfo
				});
				getLink();
			});
		}
		else
		{
			if(!complete)
			{
				complete = true;
				cb(links);
			}
		}
	};

	for(var i=0; i<100; i++)
	{
		getLink();
	}
	getLink(items,0,[],cb);
};
var getItems = function(data,cb,type)
{
	getVideoLinks(data.items,function(links)
	{
		var newItems = [];

		for(var i=0; i<data.items.length;i++)
		{
			var vInfo = links.filter(function(elm){
				return elm.id === (typeof(data.items[i].video)=="undefined" ? data.items[i].id : data.items[i].video.id);
			})[0];

			if(typeof(vInfo)!="undefined" && vInfo.info.status=="ok")
			{
				newItems.push({
					item: data.items[i],
					video: vInfo.info.getSource(videoFormat,videoQuality)
				});
			}
		}
		
		var retVal = new Array();
		for(var i=0; i<newItems.length;i++)
		{
			var item = merge(newItems[i],{},podcastItemsMap[type]);
			item.enclosure.mime = videoFormat;
			retVal.push(item);
		}

		cb(retVal);
	});
};

var generateFeed = function(type,data,id,res){
	var options = merge(data,{},podcastOptionsMap[type]);

	switch(type)
	{
		case "channel":
			options.site_url = "http://youtube.com/user/" + id + "/videos";
			break;
		case "playlist":
			options.site_url = "http://youtube.com/playlist?list=" + id;
			break;
	}
	var start = new Date();
	getItems(data,function(items)
	{
		res.send(new Podcast(options,items.sort(sortItems)).xml());
		console.log("loaded feed " + id + " with " + items.length + " items in " + ((new Date()-start)/1000));
	},type);
};

var sortItems = function(a,b)
{
	var aDate = new Date(a.date);
    var bDate = new Date(b.date);

    return aDate>bDate ? -1 : aDate<bDate ? 1 : 0;
};

var bootstrap = function(req,res)
{
	if(typeof(req.query.quality)!="undefined")
	{
		switch(req.query.quality)
		{
			case "hd720":
			case "medium":
			case "small":
				videoQuality = req.query.quality;
				break;
		}
	}
	res.set("Content-Type", "application/rss+xml");
};

var getAllItems = function(type,id,cb)
{
	var total = 0;
	var requested = 50;
	var fetched = 0;
	var items = [];
	var profile;
	var options = {
		//'orderby':'published',
		'max-results':50,
		'start-index': 1
	};
	switch(type)
	{
		case "channel":
			yt.user(id).profile(function(err,data){
				if(!err) 
				{
					profile = data;
					yt.user(id).uploads(options,saveData);
				}
				else
				{
					console.log(err);
				}
			})
			break;
		case "playlist":
			yt.feeds.playlist(id,options,saveData);
			break;
	}

	function loop() 
	{
		do
		{
			switch(type)
			{
				case "channel":
					yt.user(id).uploads(options,saveData);
					break;
				case "playlist":
					yt.feeds.playlist(id,options,saveData);
					break;
			}
			requested += requested>0 ? (total-requested>=50 ? 50 : total-requested) : 50;
		}while(requested<total);
	}

	function saveData(err,data)
	{
		if(!err)
		{
			items.push(data);
			var oldTotal = total;
			total = data.totalItems;
			fetched += (total-(data.startIndex-1) >= 50 ? 50 : total-(data.startIndex-1));
			if(oldTotal==0) loop();
			complete();
		}
		else
		{
			console.log(err);
		}
	}

	function complete()
	{
		if(total<=fetched) 
		{
			if(profile)
			{
				items[0].title = profile.title.$t;
				items[0].description = profile.summary.$t;
				items[0].author = profile.author[0].name.$t;
				items[0].thumbnail = {};
				items[0].thumbnail.hqDefault = profile.media$thumbnail.url;
			}
			cb(mergeItems(items));
		}
	}
};

var mergeItems = function(items)
{
	var retVal = items[0];
	for(var i=1;i<items.length;i++)
	{
		for(var j=0;j<items[i].items.length;j++)
		{
			retVal.items.push(items[i].items[j]);
		}
	}
	return retVal;
};

app.get("/playlist/:id",function(req,res){
	bootstrap(req,res);
	getAllItems("playlist",req.params.id,function(data){
		generateFeed('playlist',data,req.params.id,res);
	});
});

app.get("/channel/:id",function(req,res){
	bootstrap(req,res);
	getAllItems("channel",req.params.id,function(data){
		generateFeed('channel',data,req.params.id,res);
	});
});

app.use(express.static(__dirname + '/public'));

app.listen(3000);