var express = require('express');
var app = express();
var Podcast = require('podcast');
var yt = require('youtube-feeds');
var ytvideos = require('./ytvideos.js');
var merge = require('object-mapper').merge;

var videoFormat = "video/mp4";
var videoQuality = "medium";

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
		ytvideos.getVideoInfo(items[pos].video.id,function(videoInfo){
			links.push({
				id: items[pos].video.id,
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
				return elm.id === data.items[i].video.id;
			})[0];
			//console.log(vInfo);

			newItems.push({
				item: data.items[i],
				video: vInfo.info.getSource(videoFormat,videoQuality)
			});
		}
		
		var retVal = new Array();
		for(var i=0; i<newItems.length;i++)
		{
			retVal.push(merge(newItems[i],{},podcastItemsMap));
		}

		cb(retVal);
	});
};

var generateFeed = function(type,data,res){
	var options = merge(data,{},podcastOptionsMap);
	options.site_url = "http://youtube.com/playlist?list=" + data.id;

	getItems(data,function(items)
	{
		console.log("loaded feed " + data.id + " with " + items.length + " items");
		res.send(new Podcast(options,items).xml());
	});
};

app.get("/playlist/:id",function(req,res){
	yt.feeds.playlist(req.params.id,{orderby:"published",'max-results':50},function(err,data){
		if(!err) generateFeed('playlist',data,res);
		else req.send('nope...');
	});
});

app.get("/channel/:id",function(req,res){
	yt.user.uploads(req.params.id,function(err,data){
		if(!err) generateFeed('channel',data,res);
		else req.send('nope...');
	});
});

app.listen(3000);