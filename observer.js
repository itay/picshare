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
                       
    var resize = function(image, targetWidth, targetHeight, thumbnail) {
        var imageWidth = image.width;
        var imageHeight = image.height;
        
        var widthFactor = imageWidth / targetWidth;
        var heightFactor = imageHeight / targetHeight;

        var croppedWidth;
        var croppedHeight;
        var offsetRow;
        var offsetCol;

        if (widthFactor > heightFactor) {
            croppedWidth = targetWidth * heightFactor;
            croppedHeight = targetHeight * heightFactor;
            offsetRow = 0;
            offsetCol = Math.max((imageWidth - croppedWidth) / 2, 0);
        }
        else {
            croppedWidth = targetWidth * widthFactor;
            croppedHeight = targetHeight * widthFactor;
            offsetRow = Math.max((imageHeight - croppedHeight) / 2, 0);
            offsetCol = 0;
        }                
        
        if (!thumbnail && imageWidth <= targetWidth && imageHeight <= targetHeight) {
            // In this case, we want to do nothing
            offsetCol = 0;
            offsetRow = 0;
            croppedWidth = targetWidth = imageWidth;
            croppedHeight = targetHeight = imageHeight;
        }

        var resized = new canvas(targetWidth, targetHeight);
        var context = resized.getContext('2d');
        
        context.drawImage(
            image, 
            offsetCol, offsetRow, // source offset
            croppedWidth, croppedHeight,  // source size
            0, 0, // target offset
            (targetWidth < croppedWidth ? targetWidth : croppedWidth), // target width
            (targetHeight < croppedHeight ? targetHeight : croppedHeight)); // target height
        
        return resized;
    }  
    
    var THUMB_WIDTH = 90;
    var THUMB_HEIGHT = 90;
    var FULL_WIDTH = 1000;
    var FULL_HEIGHT = 667;
                         
    function generateThumb(image) {
        var canvas = resize(image, THUMB_WIDTH, THUMB_HEIGHT, true);
        return canvas;
    }

    function generateNormalSizedImage(image) {        
        var canvas =  resize(image, FULL_WIDTH, FULL_HEIGHT);
        return canvas;
    }
    
    function sendMessageIfNecessary(channel, url, thumburl, normalurl, thumb, normal) {
        if (url && thumburl && normalurl) {
            var result = url + '^' + thumburl + '^' + normalurl + "^" + thumb.width + "^" + thumb.height + "^" + normal.width + "^" + normal.height;
            sendingClient.publish('done:' + channel, result);
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
                   sendMessageIfNecessary(channel, url, thumburl, normalurl, thumb, normalSize);
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
                       sendMessageIfNecessary(channel, url, thumburl, normalurl, thumb, normalSize);
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
                       sendMessageIfNecessary(channel, url, thumburl, normalurl, thumb, normalSize);
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
