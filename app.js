var express = require('express');
var app = express();
var RSS = require('rss');
var yt = require('youtube-feeds');
var ytvideos = require('./ytvideos.js');

var generateFeed = function(err,data){
	console.log(data);
};

app.get("/playlist/:id",function(req,res){
	yt.feeds.playlist(req.params.id,{orderby:"published",'max-results':50},generateFeed);
});

app.get("/channel/:id",function(req,res){
	yt.user.uploads(req.params.id,generateFeed);
});

app.listen(3000);