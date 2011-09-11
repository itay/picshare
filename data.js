(function() {
    var _ = require('underscore');
    var Class = require('./class').Class;
    var redis;
    var redisClient;
    var usingRedis = false;

    if (usingRedis) {
        redis = require('redis');
        redisClient = redis.createClient();
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
        this.metadata = {}; 
        this.comments = {};
      },
      
      createAlbum: function(albumInfo) {
        albumInfo.created = currentDate();
        albumInfo.id = generateNextHash();
        
        this.albums[albumInfo.id] = albumInfo;
        this.pictures[albumInfo.id] = {};
        this.metadata[albumInfo.id] = {};
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
        delete this.metadata[albumId];
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
      
      createPicture: function(albumId, pictureInfo) {
        var albumInfo = this.albums[albumId];
        albumInfo.modified = currentDate();
        
        pictureInfo.id = generateNextHash();
        pictureInfo.created = currentDate();
        
        this.pictures[albumId][pictureInfo.id] = pictureInfo;
        this.metadata[albumId][pictureInfo.id] = {
            id: pictureInfo.id,
            created: currentDate()  
        };
        this.comments[albumId][pictureInfo.id] = {};
        
        if (usingRedis) {
            var channel = "save:picture:"+albumId+":"+pictureInfo.id;
            redisClient.publish(channel, JSON.stringify(pictureInfo));
        }

        return {id: pictureInfo.id};
      },
      
      deletePicture: function(albumId, pictureId) {
        if (!this.pictures.hasOwnProperty(albumId)) {
          throw new Error("No such album!");
        }
        if (!this.pictures[albumId].hasOwnProperty(pictureId)) {
          throw new Error("No such picture!");
        }
        
        delete this.pictures[albumId][pictureId];
        delete this.metadata[albumId][pictureId];
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
      
      updatePictureMetadata: function(albumId, pictureId, metadataInfo) {
        var currentInfo = this.metadata[albumId][pictureId];
        _.each(metadataInfo, function(value, key) {
            currentInfo[key] = value; 
        });
        currentInfo.modified = currentDate();
        
        this.metadata[albumId][pictureId] = currentInfo;
        
        return currentInfo;
      },
      
      deletePictureMetadata: function(albumId, pictureId) {
        if (!this.metadata.hasOwnProperty(albumId)) {
          throw new Error("No such album!");
        }
        if (!this.metadata[albumId].hasOwnProperty(pictureId)) {
          throw new Error("No such picture!");
        }
        
        delete this.metadata[albumId][pictureId];
      },
      
      getPictureMetadata: function(albumId, pictureId) {
        if (!this.metadata.hasOwnProperty(albumId)) {
          throw new Error("No such album!");
        }
        if (!this.metadata[albumId].hasOwnProperty(pictureId)) {
          throw new Error("No such picture!");
        }
        
        return this.metadata[albumId][pictureId];
      },
      
      createPictureComment: function(albumId, pictureId, commentInfo) {
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
        if (!this.metadata.hasOwnProperty(albumId)) {
          throw new Error("No such album!");
        }
        if (!this.metadata[albumId].hasOwnProperty(pictureId)) {
          throw new Error("No such picture!");
        }
        
        return _.toArray(this.comments[albumId][pictureId]);
      },
      
      getDump: function() {  
        var modifiedPictures = {};
        _.each(this.pictures, function(album, albumId) {
          modifiedPictures[albumId] = {};
          _.each(album, function(picture, pictureId) {
            modifiedPictures[albumId][pictureId] = {};
            _.each(picture, function(value, key) {
              if (key !== "data") {
                modifiedPictures[albumId][pictureId][key] = value;
              }
            });
          });
        });
        
        return {
            albums: this.albums,
            pictures: modifiedPictures,
            metadata: this.metadata,
            comments: this.comments
        }
      }
    });

})();
