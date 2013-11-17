var express = require('express');
var app = express();
var RSS = require('rss');
var yt = require('youtube-feeds');
var ytvideos = require('./ytvideos.js');
var merge = require('object-mapper').merge;

var generateFeed = function(err,data){
	console.log(data);
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