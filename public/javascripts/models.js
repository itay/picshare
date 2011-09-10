(function() {  
  var saveAlbum = function(cb) {
    cb();
  }
  
  var originalSync = Backbone.sync;
  
  Backbone.sync = function(method, model, options) {
    //console.log("method: " + method);
    //console.log("model: ", model);
    console.log(method + " URL: ", model.url());
    //console.log("options: ", options);
    
    //options.success.call(model);
    return originalSync(method, model, options);
  }
  
  Picture = Backbone.Model.extend({    
    save: function() {
      // We only save images if they are new
      if (this.isNew()) {
        Backbone.Model.prototype.save.apply(this, arguments);
      }
    },
    
    url: function() {
      var base = this.collection.url();
      if (this.isNew()) {
        return base;
      }
      else {
        return base + "/" + this.id;
      }
    }
  });
  
  PictureMetadata = Backbone.Model.extend({  
    initialize: function() {
    },
    
    url: function() { 
      var base = "/albums/" + this.collection.albumId + "/pictures";
      return base + "/" + this.id + "/metadata";
    },
  });
  
  Album = Backbone.Model.extend({
    initialize: function(attrs, options) {
      _.bindAll(this, "url", "save", "addPicture", "change", "reset", "remove");
      
      options = options || {}
      this.pictures = options.pictures || new Pictures();
      this.picturesMetadata = options.metadata || new PicturesMetadata();
      
      this.pictures.bind("change", this.change);
      this.pictures.bind("reset", this.reset);
      this.pictures.bind("remove", this.remove);
      this.picturesMetadata.bind("change", this.change);
      this.picturesMetadata.bind("reset", this.reset);
      this.picturesMetadata.bind("remove", this.remove);
    },
    
    url: function() {
      var base = "/albums";
      if (this.isNew()) {
        return base;
      }
      else {
        return base + "/" + this.id;
      }
    },
    
    save: function(attrs, options) {
      // In the case that we're saving just parts of the album,
      // we short circuit
      if (attrs) {
        Backbone.Model.prototype.save.call(this, attrs, options);
        return;
      }
      
      var that = this;
      options = options || {
        success: function() {},
        error: function() {}
      }
      
      var count = this.pictures.length;
      var done = function() {
        count--;
        
        if (count === 0) {
          options.success.call(that, that);
        }
      }
      
      Backbone.Model.prototype.save.call(this, attrs, {
        success: function() {
          that.pictures.albumId = that.get("id");
          that.picturesMetadata.albumId = that.get("id");
          
          that.each(function(picture, metadata) {
            picture.save({}, {
              success: function() {
                metadata.save({"id": picture.get("id")}, {
                  success: function() {
                    done();
                  },
                  error: function() {
                    console.log("ERROR1: ", arguments);
                    options.error.apply(that, arguments);
                  }
                });
              },
              error: function() {
                console.log("ERROR2: ", arguments);
                options.error.apply(that, arguments);
              }
            });
          });
        },
        error: function() {
          console.log("ERROR3: ", arguments);
          options.error.apply(that, arguments);
        }
      });
    },
    
    fetch: function(options) {
      var that = this;
      Backbone.Model.prototype.fetch.call(this, {
        success: function() {
          that.pictures.albumId = that.get("id");
          that.picturesMetadata.albumId = that.get("id");
          
          that.pictures.fetch();
          that.picturesMetadata.fetch();
          
          if (options && options.success) {
            options.success.apply(that, arguments);
          }
        },
        error: function() {
          if (options && options.error) {
            options.error.apply(that, arguments);
          }
        }
      });
    },
    
    addPicture: function(picture, metadata) {
      this.pictures.add(picture);
      this.picturesMetadata.add(metadata);
      
      this.trigger("add");
    },
    
    change: function() {
      this.trigger("change");
    },
    
    remove: function() {
      this.trigger("remove");
    },
    
    reset: function() {
      this.trigger("reset");
    },
    
    each: function(fn) {
      _.each(_.zip(this.pictures.toArray(), this.picturesMetadata.toArray()), function(arr) {
        fn(arr[0], arr[1]);
      });
    }
  });
  
  Pictures = Backbone.Collection.extend({
    model: Picture,
    
    initialize: function(models, options) {
      options = options || {};
      this.albumId = options.albumId;
    },
    
    url: function() {
      return "/albums/" + this.albumId + "/pictures";
    },
    
    save: function() {
      // The album is already created, so we can just save each picture
      this.each(function(picture) {
        picture.save();
      });
    },
    
    fetch: function(options) {
      var that = this;
      Backbone.Collection.prototype.fetch.call(this, {
        data: {
          isShallow: true,
        },
        success: function() {
          that.each(function(picture) {
            picture.fetch();
          });
          
          if (options && options.success) {
            options.success.apply(that, arguments);
          }
        },
        error: function() {
          if (options && options.error) {
            options.error.apply(that, arguments);
          }
        }
      });
    }
  }),
  
  PicturesMetadata = Backbone.Collection.extend({
    model: PictureMetadata,
    
    initialize: function(models, options) {
      options = options || {};
      this.albumId = options.albumId;
    },
    
    url: function() {
      return "/albums/" + this.albumId + "/metadata";
    },
    
    save: function() {
      // The album should already be created, and there is no "album
      // metadata" concept, as the metadata is saved for each individual
      // image.
      this.each(function(metadata) {
        metadata.save();
      });
    }
  });
})();