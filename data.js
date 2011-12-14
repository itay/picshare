(function() {
    var _ = require('underscore');
    var fs = require('fs');
    var Class = require('./class').Class;
    var redis;
    var redisClient;
    var usingRedis = true;
    var receivingClient;
    var callbackMap = {};
    if (usingRedis) {
      redis = require('redis');
      redisClient = redis.createClient();
      receivingClient = redis.createClient();
      receivingClient.on('pmessage', function(pattern, channel, message) {
        var completed = channel.split(':').slice(1).join(':');
        if (completed in callbackMap) {
          callbackMap[completed](JSON.parse(message));
          delete callbackMap[completed];
        }
      });
      receivingClient.psubscribe('done*');
    }

    var generateNextHash = (function() {
      var currentId = 100000;
      var idStep = 100000;
      var codeset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      var base = 62;
        
      return function() {
        var hash = [];
        var id = currentId;
        
        while (id > 0) {
          hash.push(codeset[id % base]);
          id = Math.floor(id / base);
        }
        
        currentId += Math.ceil((Math.random() * idStep));
        return hash.join("");
      };
    })();
    
    var currentDate = function() {
      return (new Date()).valueOf();
    };
    
    exports.Data = Class.extend({
      init: function() {
        this.albums = {};
        this.pictures = {};
        this.comments = {};
      },
      
      remap: function(albums, pictures, comments, newUserId) {
        albums = albums || [];
        pictures = pictures || [];
        comments = comments || [];
        
        var that = this;
        _.each(albums, function(info) {
          that.albums[info.album].createdBy = newUserId;
        });
        _.each(pictures, function(info) {
          that.pictures[info.album][info.picture].createdBy = newUserId;
        });
        _.each(comments, function(info) {
          that.comments[info.album][info.picture][info.comment].createdBy = newUserId;
        });
      },
      
      createAlbum: function(albumInfo, user) {
        albumInfo.created = currentDate();
        albumInfo.id = generateNextHash();
        albumInfo.createdBy = user.id;
        
        this.albums[albumInfo.id] = albumInfo;
        this.pictures[albumInfo.id] = {};
        this.comments[albumInfo.id] = {};
        
        return albumInfo;
      },
      
      updateAlbum: function(albumId, albumInfo) {
        var currentInfo = this.albums[albumId];
        _.each(albumInfo, function(value, key) {
            currentInfo[key] = value; 
        });
        currentInfo.modified = currentDate();
        
        this.albums[albumId] = currentInfo;
        return currentInfo;
      },
      
      deleteAlbum: function(albumId) {
        if (!this.albums.hasOwnProperty(albumId)) {
          throw new Error("No such album!");
        }
        
        delete this.albums[albumId];
        delete this.pictures[albumId];
      },
      
      getAlbums: function() {
        return _.toArray(this.albums);
      },
      
      getAlbum: function(albumId) {
        if (!this.albums.hasOwnProperty(albumId)) {
          throw new Error("No such album!");
        }
        
        return this.albums[albumId];
      },
      
      // callback gets three parameters, in order:
      // url, thumburl, normal size url
      createPicture: function(albumId, pictureInfo, user, callback) {
        var albumInfo = this.albums[albumId];
        albumInfo.modified = currentDate();
        
        pictureInfo.id = generateNextHash();
        pictureInfo.created = currentDate();
        pictureInfo.createdBy = user.id;
        
        this.pictures[albumId][pictureInfo.id] = pictureInfo;
        this.comments[albumId][pictureInfo.id] = {};
        
        var that = this;
        var start = new Date();
        callback({id: pictureInfo.id});
      },
      
      updatePicture: function(albumId, pictureId, pictureInfo) {
        var currentInfo = this.pictures[albumId][pictureId];
        _.each(pictureInfo, function(value, key) {
            currentInfo[key] = value; 
        });
        currentInfo.modified = currentDate();
        
        this.pictures[albumId][pictureId] = currentInfo;
        
        return currentInfo;
      },
      
      // callback gets three parameters, in order:
      // url, thumburl, normal size url
      setPictureData: function(albumId, pictureId, pictureInfo, callback) {
        var that = this;
        var start = new Date();
        
        var whenResized = function(data) {
          var end = new Date();
          console.log("Resizing/storing took: " + (end-start));
          var info = that.pictures[albumId][pictureId];
          info.thumb = data.thumb;
          info.full = data.normal;
          info.original = data.original;
          info.bigThumb = data.bigThumb;
          info.sizes = {
            thumb: {
              width: data.sizes.thumb.width,
              height: data.sizes.thumb.height,
            },
            bigThumb: {
              width: data.sizes.bigThumb.width,
              height: data.sizes.bigThumb.height,
            },
            full: {
              width: data.sizes.normal.width,
              height: data.sizes.normal.height,
            },
            original: {
              width: data.sizes.original.width,
              height: data.sizes.original.height,
            }
          };
          
          that.pictures[albumId][pictureId] = info;
          callback({
            id: pictureId, 
            thumb: info.thumb, 
            bigThumb: info.bigThumb,
            full: info.full,
            original: info.original,
            sizes: info.sizes
          });
        }
        
        if (usingRedis) {
          var channel = "save:picture:"+albumId+":"+pictureId;
          if (callback) {
              callbackMap[channel] = whenResized;
          }
          
          fs.readFile(pictureInfo.path, "base64", function(err, data) {
            var info = {
              data: "data:" + pictureInfo.type + ";base64," + data,
              type: pictureInfo.type
            };
            
            redisClient.publish(channel, JSON.stringify(info));    
          });
        }
        else {
          throw new Error("Cannot set picture data without redis");
        }
      },
      
      deletePicture: function(albumId, pictureId) {
        if (!this.pictures.hasOwnProperty(albumId)) {
          throw new Error("No such album!");
        }
        if (!this.pictures[albumId].hasOwnProperty(pictureId)) {
          throw new Error("No such picture!");
        }
        
        delete this.pictures[albumId][pictureId];
      },
      
      getPictures: function(albumId, isShallow) {
        if (!this.pictures.hasOwnProperty(albumId)) {
          throw new Error("No such album!");
        }
        
        var modifiedPictures = {};
        _.each(this.pictures[albumId], function(picture, pictureId) {
          modifiedPictures[pictureId] = {};
          _.each(picture, function(value, key) {
            if (key !== "data" || !isShallow) {
              modifiedPictures[pictureId][key] = value;
            }
          });
        });
        
        return _.toArray(modifiedPictures);
      },
      
      getPicture: function(albumId, pictureId) {
        if (!this.pictures.hasOwnProperty(albumId)) {
          throw new Error("No such album!");
        }
        if (!this.pictures[albumId].hasOwnProperty(pictureId)) {
          throw new Error("No such picture!");
        }
        
        return this.pictures[albumId][pictureId];
      },
      
      createPictureComment: function(albumId, pictureId, commentInfo, user) {
        var commentId = generateNextHash();
        this.comments[albumId][pictureId][commentId] = {
          id: commentId
        };
        
        var currentInfo = this.comments[albumId][pictureId][commentId];
        _.each(commentInfo, function(value, key) {
            currentInfo[key] = value; 
        });
        currentInfo.created = currentDate();
        currentInfo.modified = currentDate();
        currentInfo.createdBy = user.id;
        
        this.comments[albumId][pictureId][commentId] = currentInfo;
        
        return currentInfo;
      },
      
      updatePictureComment: function(albumId, pictureId, commentId, commentInfo) {
        var currentInfo = this.comments[albumId][pictureId][commentId];
        _.each(commentInfo, function(value, key) {
            currentInfo[key] = value; 
        });
        currentInfo.modified = currentDate();
        
        this.comments[albumId][pictureId][commentId] = currentInfo;
        
        return currentInfo;
      },
      
      deletePictureComment: function(albumId, pictureId, commentId) {
        if (!this.comments.hasOwnProperty(albumId)) {
          throw new Error("No such album!");
        }
        if (!this.comments[albumId].hasOwnProperty(pictureId)) {
          throw new Error("No such picture!");
        }
        if (!this.comments[albumId][pictureId].hasOwnProperty(commentId)) {
          throw new Error("No such comment!");
        }
        
        delete this.comments[albumId][pictureId][commentId];
      },
      
      getPictureComment: function(albumId, pictureId) {
        if (!this.comments.hasOwnProperty(albumId)) {
          throw new Error("No such album!");
        }
        if (!this.comments[albumId].hasOwnProperty(pictureId)) {
          throw new Error("No such picture!");
        }
        if (!this.comments[albumId][pictureId].hasOwnProperty(commentId)) {
          throw new Error("No such comment!");
        }
        
        return this.comments[albumId][pictureId][commentId];
      },
      
      getPictureComments: function(albumId, pictureId) {
        if (!this.comments.hasOwnProperty(albumId)) {
          throw new Error("No such album!");
        }
        if (!this.comments[albumId].hasOwnProperty(pictureId)) {
          throw new Error("No such picture!");
        }
        
        return _.toArray(this.comments[albumId][pictureId]);
      },
      
      getDump: function() {  
        return {
            albums: this.albums,
            pictures: this.pictures,
            comments: this.comments
        }
      }
    });

})();
