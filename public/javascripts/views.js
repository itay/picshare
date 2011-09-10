(function() {
  var templates = {
    picture: $("#imageTemplate"),
    thumb: $("#thumbTemplate"),
    fullImage: $("#fullImageTemplate"),
    album: $("#albumTemplate"),
    deleteAlbumModal: $("#deleteAlbumModalTemplate"),
    deletePictureModal: $("#deletePictureModalTemplate"),
    upload: $("#uploadTemplate")
  };
  
  PictureView = Backbone.View.extend({
    tagName: "img",
    className: "full-size",
    
    initialize: function() {
      _.bindAll(this, "render");
      
      this.picture = this.options.picture;
    },
    
    render: function() {
      $(this.el).empty();
      
      if (this.picture) {
        $(this.el).attr("src", this.picture.get("data"));
      }
      
      return this;
    }
  });
  
  ThumbView = Backbone.View.extend({
    tagName: "li",
    
    initialize: function() {
      _.bindAll(this, "render", "deleteThumb");
      
      this.template = templates.thumb;
      this.picture = this.options.picture;
      this.isEdit = this.options.isEdit;
    },
    
    events: {
      "click a.delete": "deleteThumb"
    },
    
    deleteThumb: function(e) {
      e.preventDefault();
      var view = new DeletePictureModalView({template: templates.deletePictureModal, picture: this.picture});
      view.show();
    },
    
    render: function() {
      $(this.el).empty();
      
      var content = this.template.tmpl({
        src: this.picture.get("data"),
        id: this.picture.get("id") || this.picture.cid
      });
      
      $(this.el).html(content);
      
      return this;
    }
  });
  
  PictureMetadataView = Backbone.View.extend({
    initialize: function() {
      _.bindAll(this, "render");
      
      this.metadata = this.options.metadata;
      this.metadata.bind("change", this.render);
    },
    
    render: function() {
      $(this.el).empty();
      
      $(this.el).text(this.metadata.get("name") + " @ " + this.metadata.get("modified"));
      
      return this;
    }
  });
  
  PictureWithMetadataView = Backbone.View.extend({
    className: "image",
    
    initialize: function() {
      _.bindAll(this, "render");
      
      this.pictureView = new PictureView({picture: this.options.picture});
      this.metadataView = new PictureMetadataView({metadata: this.options.metadata});
    },
    
    render: function() {
      $(this.el).empty();
      
      $(this.el).append(this.pictureView.render().el);
      $(this.el).append(this.metadataView.render().el);
      
      return this;
    }
  });
  
  AlbumView = Backbone.View.extend({    
    initialize: function() {
      this.template = templates.album;
      
      _.bindAll(this, "render", "thumbClicked", "saveAlbum", "shareAlbum", "deleteAlbum", "setAlbum");
    },
    
    events: {
      "click a.thumb": "thumbClicked",
      "click .album-actions a.save": "saveAlbum",
      "click .album-actions a.share": "shareAlbum",
      "click .album-actions a.delete": "deleteAlbum"
    },
    
    setAlbum: function(album) {
      if (this.album) {
        this.album.unbind("add", this.render);
        this.album.unbind("remove", this.render);
        this.album.unbind("change", this.render);
        this.album.unbind("reset", this.render);
      }
      
      this.album = album;
      this.album.bind("add", this.render);
      this.album.bind("remove", this.render);
      this.album.bind("change", this.render);
      this.album.bind("reset", this.render);
    },
    
    thumbClicked: function(e) {
      e.preventDefault();
      
      var pid = $(e.target).attr("id");
      var picture = this.album.pictures.get(pid) || this.album.pictures.getByCid(pid);
      
      if (this.currentPicture !== picture) {
        this.currentPicture = picture;
        this.render();
      }
    },
    
    saveAlbum: function(e) {
      var that = this;
      
      e.preventDefault();
      this.album.save({}, {
        success: function() {
          var url = "album/" + that.album.get("id");
          App.navigate(url, true);
        },
        error: function() {
          console.log("errr");
        }
      });
    },
    
    shareAlbum: function(e) {
      e.preventDefault();
      console.log("share");
    },
    
    deleteAlbum: function(e) {
      e.preventDefault();
      var view = new DeleteAlbumModalView({template: templates.deleteAlbumModal});
      view.show();
    },
    
    render: function() {
      $(this.el).empty();
      
      if (this.album) {
        $(this.el).html(this.template.tmpl({
          title: this.album.get("name"),
          actions: ["Save", "Share", "Delete"]
        }));
        
        var thumbs = [];
        this.album.pictures.each(function(picture) {
          var view = new ThumbView({picture: picture});
          thumbs.push(view.render().el);
        });
        
        this.$("#thumbs").append(thumbs);
        
        if (!this.currentPicture || !this.album.pictures.get(this.currentPicture.id)) {
          this.currentPicture = this.album.pictures.at(0);
        }
        
        var pictureView = new PictureView({picture: this.currentPicture});
        this.$("#full-size").append(pictureView.render().el);
        
        if (this.album.pictures.length) {
          $(this.el).removeClass("hidden");
        }
        else {
          $(this.el).addClass("hidden");
        }
      }
      
      return this;
    }
  });
  
  BootstrapModalView = Backbone.View.extend({
    initialize: function() {
      this.template = this.options.template;
      this.el = $(this.template.tmpl(this.options.templateContext));
      this.modal = this.el.modal({
        backdrop: true,
        modal: true,
        closeOnEscape: true
      });
      
      _.bindAll(this, "show", "hide", "primaryClicked", "secondaryClicked");
      
      this.delegateEvents();
    },
    
    events: {
      "click a.button1": "primaryClicked",
      "click a.button2": "secondaryClicked"
    },
    
    show: function() {
      this.modal.open();
    },
    
    hide: function(e) {
      if (e) {
        e.preventDefault();
      }
      
      this.modal.close();
    },
    
    primaryClicked: function(e) {
      e.preventDefault();
      console.log("primary");
    },
    
    secondaryClicked: function(e) {
      e.preventDefault();
      console.log("secondary");
    }
  });
  
  DeleteAlbumModalView = BootstrapModalView.extend({
    initialize: function() {
      BootstrapModalView.prototype.initialize.call(this);
    },
    
    primaryClicked: function(e) {
      e.preventDefault();
      this.hide();
    },
    
    secondaryClicked: function(e) {
      e.preventDefault();
      this.hide();
    }
  });
  
  DeletePictureModalView = BootstrapModalView.extend({
    initialize: function() {
      this.options.templateContext = this.options.picture.toJSON();
      BootstrapModalView.prototype.initialize.call(this);
    },
    
    primaryClicked: function(e) {
      e.preventDefault();
      
      this.options.picture.destroy();
      this.hide();
    },
    
    secondaryClicked: function(e) {
      e.preventDefault();
      this.hide();
    }
  });
  
  UploadView = Backbone.View.extend({
    tagName: "div",
    className: "upload-container",
    
    initialize: function() {
      this.template = templates.upload;
      _.bindAll(this, "render", "dragenter", "dragover", "drop", "dragexit", "show", "hide");
    },
    
    events: {
      "dragenter": "dragenter",
      "dragleave": "dragexit",
      "dragover": "dragover",
      "drop": "drop",
    },
    
    show: function() {
      $(this.el).appendTo($("body"));
    },
    
    hide: function() {
      $(this.el).detach();
    },
    
    dragenter: function(e) {
      e.preventDefault();
      e.stopPropagation();
      
    },
    
    dragexit: function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      this.hide();
    },
    
    dragover: function(e) {
      e.preventDefault();
      e.stopPropagation();
    },
    
    drop: function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      this.hide();
      
      // A tentative album
      var album = App.album;
      
      // OK, we got some drop - time to do some work
      var readFile = function(file) {
        var fileReader = new FileReader();
        fileReader.onloadend = function(e) {
          var imageData = e.target.result;
          var picture = new Picture({data: imageData, type: file.type});
          var pictureMetadata = new PictureMetadata({
            name: file.name,
            type: file.type,
            size: file.size,
            filename: file.fileName
          });
          
          album.addPicture(picture, pictureMetadata);
        };
        
        fileReader.onerror = function() {
          console.log("err: ", arguments);
        };
        
        fileReader.readAsDataURL(file); 
      };

      var numReading = 0;
      var files = e.originalEvent.dataTransfer.files;
      for(var i = 0; i < files.length; i++) {
        var file = e.originalEvent.dataTransfer.files[i];
        
        if (!_.startsWith(file.type, "image")) {
          alert(_.sprintf("File %s is not an image: %s", file.name, file.type));
          continue;
        }
        else {
          numReading++;
          readFile(file);
        }
      }
      
      if (numReading > 0 && App.album.isNew()) {
        App.navigate("new", true);
      }
    },
    
    render: function() {
      $(this.el).empty();
      $(this.el).append(this.template.tmpl());
      
      $("drop-target").bind('dragenter dragover dragleave drop', false);
      
      return this;
    },
  });
  
  PicshareApp = Backbone.Router.extend({
    initialize: function() {
      window.App = this;  
      
      // Create global event registry
      this.events = _.extend({}, Backbone.Events);
      
      _.bindAll(this, "index", "viewAlbum", "new", "hideHero", "showHero", "hideAlbum", "showAlbum");
      
      // Create views
      this.uploadView = new UploadView();
      this.albumView = new AlbumView({el: "#album-container"});
      
      var that = this;
      $(document).bind("dragenter", function(e) {
        console.log("a");
        e.preventDefault();
        that.uploadView.show();
      });
      $(document.body).bind("dragenter", function(e) {
        console.log("b");
        e.preventDefault();
        that.uploadView.show();
      });
    },
    
    routes: {
      "": "index",
      "new": "new",
      "album/:aid": "viewAlbum"
    },
    
    new: function() {
      this.hideHero();
      
      if (!App.album) {
        this.navigate("", true);
      }
      
      this.uploadView.render();
      this.albumView.render();
    },
    
    index: function() {
      this.hideAlbum();
      
      App.album = new Album({name: "Album @ " + (new Date())});
      this.albumView.setAlbum(App.album);
      
      this.uploadView.render();
      this.showHero();
    },
    
    viewAlbum: function(aid) {
      this.hideHero();
      
      var that = this;
      var go = function() {
        that.albumView.setAlbum(App.album);
        that.uploadView.render();
        that.albumView.render();
      };
      
      // Don't re-render the page unless
      // we have to.
      if (App.album && App.album.get("id") === aid) {
        go(); 
      }
      else {
        App.album = new Album({id: aid});
        App.album.fetch({
          success: go
        });
      }
    },
    
    showHero: function() {
      $("#hero").removeClass("hidden");
    },
    
    hideHero: function() {
      $("#hero").addClass("hidden");
    },
    
    showAlbum: function() {
      $(this.albumView.el).removeClass("hidden");
    },
    
    hideAlbum: function() {
      $(this.albumView.el).addClass("hidden");
    }
  });
})();