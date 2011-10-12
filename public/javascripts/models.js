(function() {  
  var saveAlbum = function(cb) {
    cb();
  }
  
  var originalSync = Backbone.sync;
  
  Backbone.sync = function(method, model, options) {
    //console.log("method: " + method);
    //console.log("model: ", model);
    //console.log(method + " URL: ", model.url());
    //console.log("options: ", options);
    
    //options.success.call(model);
    return originalSync(method, model, options);
  }
  
  Picture = Backbone.Model.extend({    
    initialize: function() {
      this.metadata = new PictureMetadata({id: this.get("id")});
      this.metadata.picture = this;
      
      this.comments = new PictureComments();
      this.comments.picture = this;
      
      _.bindAll(this, "setData");
    },
    
    setData: function(file) {
      var that = this;
      if (this.isNew()) {
        throw new Error("Cannot set picture data on an unsaved image");
      }
      
      $('#file-upload').fileupload('send', {
        files: [file], 
        url: this.url() + "/data",
        picture: this,
      }).success(function(result, textStatus, jqxhr) {
        console.log("success: " + that.cid);
        that.set(result);
        that.trigger("upload:done");
      }).error(function(jqxhr, textStatus, errorThrown) {
        console.log("error: " + that.cid);
        that.trigger("upload:fail", textStatus);
      });
    },
    
    save: function(attr, options) {
      // We only save images if they are new
      var that = this;
      options = options || {};
      var success = options.success || function() {};
      var error = options.success || function() {};
      
      var newOptions = {
        success: function() {
          that.setData(that.file, that.data);
          
          that.comments.save();
          that.metadata.save({"id": that.get("id")}, options);
        },
        error: function() {
          error.apply(that, arguments);
        }
      };
      
      
      if (this.isNew()) {
        Backbone.Model.prototype.save.call(this, attr, newOptions);
      }
      else {
        this.comments.save();
        this.metadata.save({"id": this.get("id")}, options);
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
    },
    
    fetch: function() {      
      // Fetch the image and metadata
      this.metadata.fetch();
      this.comments.fetch();
      Backbone.Model.prototype.fetch.apply(this, arguments);
    }
  });
  
  PictureMetadata = Backbone.Model.extend({  
    initialize: function() {
    },
    
    url: function() { 
      var base = this.picture.url();
      return base + "/metadata";
    },
  });
  
  PictureComment = Backbone.Model.extend({
    initialize: function() {
      
    },
    
    url: function() { 
      var base = this.picture.url() + "/comments";
      if (this.isNew()) {
        return base;
      }
      else {
        return base + "/" + this.id;
      }
    }
  });
  
  PictureComments = Backbone.Collection.extend({
    model: PictureComment,
    
    initialize: function() {
      
    },
    
    url: function() {
      var base = this.picture.url();
      return base + "/comments";
    },
    
    save: function() {
      this.each(function(comment) {
        comment.save();
      });
    },
    
    fetch: function(options) {
      options = options || {};
      options.success = options.success || function() {};
      options.error = options.error || function() {};
      
      var that = this;
      Backbone.Collection.prototype.fetch.call(this, {
        success: function() {
          that.each(function(comment) {
            comment.picture = that.picture;
            options.success.apply(that, arguments);
          });
        },
        error: options.error
      });
    }
  });
  
  Album = Backbone.Model.extend({
    initialize: function(attrs, options) {
      _.bindAll(this, "url", "save", "addPictures", "change", "reset", "remove", "add");
      
      options = options || {}
      this.pictures = options.pictures || new Pictures();
      
      this.pictures.bind("add", this.add);
      this.pictures.bind("change", this.change);
      this.pictures.bind("reset", this.reset);
      this.pictures.bind("remove", this.remove);
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
          
          that.pictures.each(function(picture) {
            picture.save({}, {
              success: function() {
                done();
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
          
          that.pictures.fetch();
          
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
    
    addPictures: function(pictures) {
      this.pictures.add(pictures, {silent: true});
      
      this.trigger("add", pictures);
      
      // Always save the album after we add new pictures
      this.save();
    },
    
    add: function(picture) {
      this.trigger("add", [picture]);
    },
    
    change: function() {
      this.trigger("change");
    },
    
    remove: function(picture) {
      this.trigger("remove", picture);
    },
    
    reset: function() {
      this.trigger("reset");
    },
    
    each: function(fn) {
      return this.pictures.each.call(this, fn);
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
  });
})();