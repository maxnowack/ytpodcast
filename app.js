var express = require('express');
var app = express();
var RSS = require('rss');
var yt = require('youtube-feeds');
var ytvideos = require('./ytvideos.js');

var generateFeed = function(err,data){
	console.log(data);
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