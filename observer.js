(function() {
    var redis;
    var redisClient;
    var fs = require('fs');
    redis = require('redis');
    redisClient = redis.createClient();

    redisClient.on("pmessage", function(pattern, channel, message) {
        var obj = JSON.parse(message);
        var str = obj["data"];
        var data = str.split(',', 2)[1];
        var buffer = new Buffer(data, 'base64');
        var stream = fs.createWriteStream(channel+".jpg");
        stream.once('open', function(fd) {
            stream.write(buffer);
        });
        console.log(channel);
    });

    redisClient.psubscribe('save*');
})();
