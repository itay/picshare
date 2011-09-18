(function() {
    var redis;
    var redisClient;
    var fs = require('fs');
    redis = require('redis');
    var knox = require('knox');
    var canvas = require('canvas');
    redisClient = redis.createClient();
    var sendingClient = redis.createClient();
    var knoxClient = knox.createClient({key:'AKIAIOPRNXFE5YO3VOWQ', 
                       secret:'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',
                       bucket:'apanda'});
    function generateThumb(image) {
        var width = image.width;
        var height = image.height;
        var wratio = 90/width;
        var hratio = 90/height;
        var nheight, nwidth;
        if (wratio > hratio) {
            nheight = Math.round(wratio * height);
            nwidth = Math.round(wratio * width);
        }
        else {
            nheight = Math.round(hratio * height);
            nwidth = Math.round(hratio * width);
        }
        var thumb = new canvas(75, 75);
        thumb.getContext('2d').drawImage(image, 0, 0, 75, 75);
        return thumb;
    }

    function generateNormalSizedImage(image) {
        var width = image.width;
        var height = image.height;
        var wratio = 800/width;
        var hratio = 600/height;
        var nheight, nwidth;
        if (wratio > hratio) {
            nheight = Math.round(hratio * height);
            nwidth = Math.round(hratio * width);
        }
        else {
            nheight = Math.round(wratio * height);
            nwidth = Math.round(wratio * width);
        }
        var img = new canvas(nwidth, nheight);
        img.getContext('2d').drawImage(image, 0, 0, nwidth, nheight);
        return img;
    }
    function sendMessageIfNecessary(channel, url, thumburl, normalurl) {
        if (url && thumburl && normalurl) {
            sendingClient.publish('done:' + channel, url + '^' + thumburl + '^' + normalurl);
        }
    }

    redisClient.on("pmessage", function(pattern, channel, message) {
        var obj = JSON.parse(message);
        var str = obj["data"];
        var data = str.split(',', 2)[1];
        var buffer = new Buffer(data, 'base64');
        var image = new canvas.Image();
        image.src = buffer;
        var thumb = generateThumb(image);
        var normalSize = generateNormalSizedImage(image);
        var extension;
        if(obj["type"] === "image/jpeg") {
            extension = ".jpg";
        }
        else {
            extension = ".png";
        }
        var stream = fs.createWriteStream(channel+extension);
        var contentLength = buffer.length;
        var url=undefined,
            thumburl = undefined,
            normalurl = undefined;
        var req = knoxClient.put('/images/'+channel+'.jpg', {
                 'Content-Length': buffer.length,
                 'Content-Type':obj["type"]
        });
        req.on('response', function(res){
                   if (200 == res.statusCode) {
                        url = req.url;
                        console.log('saved to %s', req.url);
                   }
                   else {
                       url = '';
                       console.log('error %d', req.statusCode);
                   }
                   sendMessageIfNecessary(channel, url, thumburl, normalurl);
              });
        req.end(buffer);
        var stream2 = fs.createWriteStream('thumb:'+channel+extension);
        thumb.toBuffer(function(err, buf) {
            var req = knoxClient.put('/images/thumb:'+channel+extension, {
                     'Content-Length': buf.length,
                     'Content-Type':obj["type"]
            });
            req.on('response', function(res){
                       if (200 == res.statusCode) {
                            thumburl = req.url;
                            console.log('saved to %s', req.url);
                       }
                       else {
                           thumburl = '';
                           console.log('error %d', req.statusCode);
                       }
                       sendMessageIfNecessary(channel, url, thumburl, normalurl);
                  });
            req.end(buf);
            stream2.once('open', function(fd) {stream2.write(buf);});
        });
        var stream3 = fs.createWriteStream('normal:'+channel+extension);
        normalSize.toBuffer(function(err, buf) {
            var req = knoxClient.put('/images/normal:'+channel+extension, {
                     'Content-Length': buf.length,
                     'Content-Type':obj["type"]
            });
            req.on('response', function(res){
                       if (200 == res.statusCode) {
                            console.log('saved to %s', req.url);
                            normalurl = req.url;
                       }
                       else {
                           console.log('error %d', req.statusCode);
                           normalurl = '';
                       }
                       sendMessageIfNecessary(channel, url, thumburl, normalurl);
                  });
            req.end(buf);
            stream3.once('open', function(fd) {stream3.write(buf);});
        });

        stream.once('open', function(fd) {
            stream.write(buffer);
        });
        console.log(channel);
    });

    redisClient.psubscribe('save*');
})();
