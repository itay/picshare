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
                       
    var resize = function(image, targetWidth, targetHeight, force) {
        var width = image.width; 
        var height = image.height; 
        
        var widthFactor = targetWidth / width;
        var heightFactor = targetHeight / height;
        
        if (widthFactor > heightFactor) {
            scaleFactor = widthFactor; // scale to fit height
        }
        else {
            scaleFactor = heightFactor; // scale to fit width
        }
        
        var targetAspect = targetWidth / targetHeight;
        
        var sx = 0;
        var sy = 0;
        var sWidth = 0;
        var sHeight = 0;
        
        if (widthFactor > heightFactor) {
            sHeight = height * (width / (targetAspect * height));
            sWidth = width;
            sy = height / 2 - sHeight / 2;
        }
        else {
            sWidth = width * (targetAspect * height / width);
            sHeight = height;
            sx = width / 2 - sWidth / 2;
        }
        
        if (force) {
            sx = 0;
            sWidth = width;
            sy = 0;
            sHeight = height;
            if (width > height) {
                targetHeight = targetHeight * (height / width) * targetAspect;
            }
            else { 
                targetWidth = targetWidth * (width / height) / targetAspect;
            }
        }
        else if (width <= targetWidth && height <= targetHeight ) {
            sx = 0;
            sy = 0;
            sWidth = targetWidth = width;
            sHeight = targetHeight = height;
        }
        else if (width <= targetWidth && height > targetHeight) {
            sx = 0;
            sWidth = targetWidth = width / scaleFactor;
            sy = height / 2 - targetHeight / 2;
            sHeight = targetHeight;
        }
        else if (width > targetWidth && height <= targetHeight) {
            sy = 0;
            sHeight = targetHeight = height / scaleFactor;
            sx = width / 2 - width / 2;
            sx = targetWidth;
        }
        
        var resized = new canvas(targetWidth, targetHeight);
        var context = resized.getContext('2d');
        try {
            context.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        catch(e) {
            // We do nothing on exceptions for now, except print em
            console.log(e);
        }
        
        return resized;
    }  
    
    var THUMB_WIDTH = 90;
    var THUMB_HEIGHT = 90;
    var FULL_WIDTH = 1000;
    var FULL_HEIGHT = 667;
                         
    function generateThumb(image) {
        return resize(image, THUMB_WIDTH, THUMB_HEIGHT);
    }

    function generateNormalSizedImage(image) {        
        return resize(image, FULL_WIDTH, FULL_HEIGHT, true);
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
