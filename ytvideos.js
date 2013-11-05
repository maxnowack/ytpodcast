var decodeQueryString = function(queryString) {
    var key, keyValPair, keyValPairs, r, val, _i, _len;
    r = {};
    keyValPairs = queryString.split("&");
    for (_i = 0, _len = keyValPairs.length; _i < _len; _i++) {
      keyValPair = keyValPairs[_i];
      key = decodeURIComponent(keyValPair.split("=")[0]);
      val = decodeURIComponent(keyValPair.split("=")[1] || "");
      r[key] = val;
    }
    return r;
};

var decodeStreamMap = function(url_encoded_fmt_stream_map) {
    var quality, sources, stream, type, urlEncodedStream, _i, _len, _ref;
    sources = {};
    _ref = url_encoded_fmt_stream_map.split(",");
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      urlEncodedStream = _ref[_i];
      stream = YoutubeVideo.decodeQueryString(urlEncodedStream);
      type = stream.type.split(";")[0];
      quality = stream.quality.split(",")[0];
      stream.original_url = stream.url;
      stream.url = "" + stream.url + "&signature=" + stream.sig;
      sources["" + type + " " + quality] = stream;
    }
    return sources;
};

exports.getVideoInfo = function(videoId,callback)
{
	http.get("http://www.youtube.com/get_video_info?video_id=" + videoId,function(res)
	{
		var video = decodeQueryString(res);
		if(video==="fail") callback(video);

		video.sources = decodeStreamMap(video.url_encoded_fmt_stream_map);

		video.getSource = function(type, quality) {
	        var exact, key, lowest, source, _ref;
	        lowest = null;
	        exact = null;
	        _ref = this.sources;
	        for (key in _ref) {
	          source = _ref[key];
	          if (source.type.match(type)) {
	            if (source.quality.match(quality)) {
	              exact = source;
	            } else {
	              lowest = source;
	            }
	          }
	        }
	        return exact || lowest;
	      };
      	return callback(video);
	});
};