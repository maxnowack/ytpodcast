var express = require('express');
var app = express();
var Podcast = require('podcast');
var yt = require('youtube-feeds');
var ytvideos = require('./ytvideos.js');
var merge = require('object-mapper').merge;

var videoFormat = "video/mp4";
var videoQuality = "hd720";

var podcastOptionsMap = {
	"title":"title",
	"description":"description",
	"author":"itunesAuthor",
	"author":"author",
	"thumbnail.hqDefault":"itunesImage",
	"thumbnail.hqDefault":"image_url"

};
var podcastItemsMap = {
	"item.video.title":"title",
	"item.video.player.default":"link",
	"item.id":"guid",
	"item.video.description":"description",
	"video.url":"enclosure.url",
	"item.video.uploaded":"date",
	"item.author":"itunesAuthor",
	"item.video.duration":"itunesDuration"
};

var getLink = function(items,pos,links,cb)
{
	if(pos<items.length)
	{
		var id = typeof(items[pos].video)=="undefined" ? items[pos].id : items[pos].video.id;
		ytvideos.getVideoInfo(id,function(videoInfo){
			links.push({
				id: id,
				info: videoInfo
			});
			getLink(items,++pos,links,cb);
		});
	}
	else
	{
		cb(links);
	}
};
var getVideoLinks = function(items,cb)
{
	getLink(items,0,[],cb);
};
var getItems = function(data,cb)
{
	getVideoLinks(data.items,function(links)
	{
		var newItems = [];

		for(var i=0; i<data.items.length;i++)
		{
			var vInfo = links.filter(function(elm){
				return elm.id === (typeof(data.items[i].video)=="undefined" ? data.items[i].id : data.items[i].video.id);
			})[0];

			if(vInfo.info.status=="ok")
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
			var item = merge(newItems[i],{},podcastItemsMap);
			item.enclosure.mime = videoFormat;
			retVal.push(item);
		}

		cb(retVal);
	});
};

var generateFeed = function(type,data,id,res){
	var options = merge(data,{},podcastOptionsMap);

	switch(type)
	{
		case "channel":
			options.site_url = "http://youtube.com/user/" + id + "/videos";
			break;
		case "playlist":
			options.site_url = "http://youtube.com/playlist?list=" + id;
			break;
	}

	getItems(data,function(items)
	{
		console.log("loaded feed " + id + " with " + items.length + " items");
		res.send(new Podcast(options,items).xml());
	});
};

var bootstrap = function(req)
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
};

app.get("/playlist/:id",function(req,res){
	bootstrap(req);
	yt.feeds.playlist(req.params.id,{orderby:"published",'max-results':50},function(err,data){
		if(!err) generateFeed('playlist',data,req.params.id,res);
		else res.send('no playlist with id "' + req.params.id + '"');
	});
});

app.get("/channel/:id",function(req,res){
	bootstrap(req);
	yt.user(req.params.id).uploads({orderby:"published",'max-results':50},function(err,data){
		if(!err) generateFeed('channel',data,req.params.id,res);
		else res.send('no channel with id "' + req.params.id + '"');
	});
});

app.listen(3000);