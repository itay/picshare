(function() {
    var redis;
    var redisClient;
    redis = require('redis');
    redisClient = redis.createClient();

    redisClient.on("pmessage", function(pattern, channel, message) {
        var stream = fs.createWriteStream(channel+".json");
        stream.once('open', function(fd) {
            stream.write(message);
        });
        console.log(channel);
    });

    redisClient.psubscribe('save*');
})();
