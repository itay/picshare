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
    initialize: function(attrs, options) {
      this.comments = new PictureComments();
      this.comments.picture = this;
      this.album = options.album;
      
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
    
    url: function() {
      var base = (this.collection || this.album.pictures).url();
      if (this.isNew()) {
        return base;
      }
      else {
        return base + "/" + this.id;
      }
    },
    
    fetch: function() {      
      // Fetch the comments associated with this picture
      this.comments.fetch();
      
      // Fetch the picture itself
      Backbone.Model.prototype.fetch.apply(this, arguments);
    }
  });
  
  PictureComment = Backbone.Model.extend({
    initialize: function(attributes, options) {
      this.picture = options.picture;
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
    
    fetch: function(options) {
      options = options || {};
      options.success = options.success || function() {};
      options.error = options.error || function() {};
      
      var that = this;
      Backbone.Collection.prototype.fetch.call(this, {
        success: function() {
          // Once we fetch all the comments, we need to iterate
          // over them and assign each the picture it is associated
          // with
          that.each(function(comment) {
            comment.picture = that.picture;
          });
          
          // Once we've done assigning the comment to each 
          options.success.apply(that, arguments);
        },
        error: options.error
      });
    }
  });
  
  Album = Backbone.Model.extend({
    initialize: function(attrs, options) {
      _.bindAll(this, "url", "change", "reset", "remove", "add");
      
      options = options || {}
      this.pictures = options.pictures || new Pictures();
      this.pictures.album = this;
      
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
    
    fetch: function(options) {
      this.pictures.fetch();
      Backbone.Model.prototype.fetch.apply(this, arguments);
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
    },
    
    url: function() {
      var base = this.album.url();
      return base + "/pictures";
    }
  });
})();