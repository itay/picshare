(function() {
  var templates = {
    thumb: $("#thumbTemplate"),
    album: $("#albumTemplate"),
    deleteAlbumModal: $("#deleteAlbumModalTemplate"),
    deletePictureModal: $("#deletePictureModalTemplate"),
    upload: $("#uploadTemplate"),
    newCommentForm: $("#newCommentFormTemplate"),
    comment: $("#commentTemplate"),
    comments: $("#commentsTemplate"),
    pictureImage: $("#pictureImageTemplate"),
    pictureInfo: $("#pictureInfoTemplate"),
    pictureView: $("#pictureViewTemplate"),
  };
  var createObjectURL = function (file) {
      var undef = 'undefined',
          urlAPI = (typeof window.createObjectURL !== undef && window) ||
              (typeof URL !== undef && URL) ||
              (typeof webkitURL !== undef && webkitURL);
      return urlAPI ? urlAPI.createObjectURL(file) : false;
  };
  
  var revokeObjectURL = function (url) {
      var undef = 'undefined',
          urlAPI = (typeof window.revokeObjectURL !== undef && window) ||
              (typeof URL !== undef && URL) ||
              (typeof webkitURL !== undef && webkitURL);
      return urlAPI ? urlAPI.revokeObjectURL(url) : false;
  };
      
  var scaleImage = function (img, options) {
    options = options || {};
    
    var canvas = document.createElement('canvas'),
        scale = Math.min(
            (options.maxWidth || img.width) / img.width,
            (options.maxHeight || img.height) / img.height
        );
    if (scale >= 1) {
        scale = Math.max(
            (options.minWidth || img.width) / img.width,
            (options.minHeight || img.height) / img.height
        );
    }
    img.width = parseInt(img.width * scale, 10);
    img.height = parseInt(img.height * scale, 10);
    
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
    return canvas;
  };
  
  CommentView = Backbone.View.extend({
    tagName: "div",
    className: "picture-comment",
    
    initialize: function() {
      this.template = templates.comment;
      this.comment = this.options.comment;
      _.bindAll(this, "render");
    },
    
    render: function() {
      $(this.el).empty();
      
      var context = this.comment.toJSON();
      context.timeago = $.timeago(new Date(context.created));
      $(this.el).append(this.template.tmpl(context));
      
      return this;
    }
  });
  
  NewCommentFormView = Backbone.View.extend({
    tagName: "form",
    className: "form-stacked",
    id: "picture-comments-form",
    template: templates.newCommentForm,
    
    initialize: function() {
      this.picture = this.options.picture;
      _.bindAll(this, "render", "getFormData", "newComment");
    },
    
    destroy: function() {
      this.remove();
    },
    
    events: {
      "submit": "newComment"
    },
    
    render: function() {
      $(this.el).empty();
      
      $(this.el).html(this.template.tmpl());
      
      return this;
    },
    
    newComment: function(e) {
      e.preventDefault();
      
      var formData = this.getFormData();
      
      if (formData.text !== "") {
        var comment = new PictureComment({
          name: formData.name,
          text: formData.text,
          created: (new Date()).valueOf()
        });
        comment.picture = this.picture;
        this.picture.comments.add(comment);
        
        if (!this.picture.isNew()) {
          comment.save();
        }
      }
    },
    
    getFormData: function() {
      var name = this.$("#picture-comment-name").val() || "Anonymous";
      var text = this.$("#picture-comment-text").val() || "";
      
      return {
        name: name.trim(),
        text: text.trim()
      }
    }
  });
  
  var getStack = function() {
    try {
      throw new Error();
    }
    catch (err) {
      console.log(err.stack);
    }
  };
  
  CommentsView = Backbone.View.extend({
    tagName: "div",
    id: "picture-comments-container",
    template: templates.comments,
    
    initialize: function() {
      this.picture = this.options.picture;
      this.newCommentFormView = new NewCommentFormView({picture: this.picture});
      
      _.bindAll(this, "destroy", "render", "renderForm", "renderComments");
      
      this.picture.comments.bind("add", this.renderComments);
      this.picture.comments.bind("change", this.renderComments);
      this.picture.comments.bind("remove", this.renderComments);
      this.picture.comments.bind("reset", this.renderComments);
    },
    
    destroy: function() {
      this.remove();
      this.newCommentFormView.destroy();
      this.picture.comments.unbind("add", this.renderComments);
      this.picture.comments.unbind("change", this.renderComments);
      this.picture.comments.unbind("remove", this.renderComments);
      this.picture.comments.unbind("reset", this.renderComments);
    },
    
    render: function() {
      $(this.el).empty();
      
      $(this.el).html(this.template.tmpl());
      
      this.renderForm();
      this.renderComments();
      
      return this;
    },
    
    renderForm: function() {
      this.$("#picture-comments-form").append(this.newCommentFormView.render().el);
    },
    
    renderComments: function() {
      var container = this.$("#picture-comments");
      container.empty();
      
      var that = this;
      var els = [];
      this.picture.comments.each(function(comment) {
        var view = new CommentView({comment: comment});
        els.push(view.render().el);
      });
      
      container.append(els);
    }
  });
  
  PictureImageView = Backbone.View.extend({
    tagName: "div",
    className: "full-size-image",
    width: 520,
    height: 520,
    
    initialize: function() {
      this.picture = this.options.picture;
      _.bindAll(this, "destroy", "render");
      
      // TODO: need to bind it to the picture proper,
      // and see if the URL has been set yet.
    },
    
    destroy: function() {
      this.remove();
    },
    
    render: function() {
      $(this.el).empty();
      
      if (this.canvas) {
        $(this.el).empty();
        $(this.el).append(canvas);
      }
      else {
        var that = this;
        var url = (this.picture.file ? createObjectURL(this.picture.file) : this.picture.get("data"));
        var img = $('<img>').bind('load', function () {
          $(this).unbind('load');
          revokeObjectURL(url);
          
          var canvas = scaleImage(img[0], {
            maxWidth: that.width,
            maxHeight: that.height
          });
          
          that.canvas = canvas;
          
          $(that.el).empty();
          $(that.el).append(canvas);
        });
        img.prop('src', url);
      }
      
      return this;
    }
  });
  
  PictureInfoView = Backbone.View.extend({
    tagName: "div",
    className: "form-stacked",
    id: "picture-info",
    template: templates.pictureInfo,
    
    initialize: function() {
      this.picture = this.options.picture;
      
      _.bindAll(this, "destroy", "render", "descriptionChange", "updateDescription");
      this.picture.metadata.bind("change", this.updateDescription);
    },
    
    destroy: function() {
      this.remove();
      this.picture.metadata.unbind("change", this.updateDescription);
    },
    
    events: {
      "blur #picture-description": "descriptionChange",
    },
    
    descriptionChange: function(e) {
      e.preventDefault();
    
      var oldDescription = (this.picture.metadata.get("description") || "").trim();
      var newDescription = ($(e.target).val() || "").trim();
      if (newDescription === oldDescription) {
        return;
      }
      
      this.picture.metadata.set({description: newDescription});
      if (!this.picture.metadata.isNew()) {
        this.picture.metadata.save({description: newDescription});
      }
    },
    
    updateDescription: function() {
      this.$("#picture-description").val(this.picture.metadata.get("description"));
    },
    
    render: function() {
      $(this.el).empty();
      
      $(this.el).html(this.template.tmpl(this.picture.metadata.toJSON()));
      var that = this;
      setTimeout(function() {
        that.$("#picture-description").autoResize({
          extraSpace: 0
        });
      }, 0);
      
      return this;
    },
  })
  
  PictureView = Backbone.View.extend({
    tagName: "div",
    className: "content",
    
    initialize: function() {
      this.picture = this.options.picture;
      this.pictureImageView = new PictureImageView({picture: this.picture});
      this.commentsView = new CommentsView({picture: this.picture});
      this.pictureInfoView = new PictureInfoView({picture: this.picture});
      
      _.bindAll(this, "destroy", "render");
      
    },
    
    destroy: function() {
      this.remove();
      this.pictureImageView.destroy();
      this.commentsView.destroy();
      this.pictureInfoView.destroy();
    },
    
    render: function() {
      $(this.el).empty();
      
      $(this.el).append([
         this.pictureImageView.render().el,
         this.pictureInfoView.render().el,
         this.commentsView.render().el,
      ]);
   
      return this;
    }
  });
  
  ThumbView = Backbone.View.extend({
    tagName: "li",
    width: 75,
    height: 75,
    
    initialize: function() {
      _.bindAll(this, "destroy", "render", "deleteThumb");
      
      this.template = templates.thumb;
      this.picture = this.options.picture;
      this.isEdit = this.options.isEdit;
    },
    
    destroy: function() {
      this.remove();
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
        numComments: this.picture.comments.length,
        id: this.picture.get("id") || this.picture.cid
      });
      
      var data = this.picture.get("data");
      
      $(this.el).html(content);
      
      var that = this;
      var url = (this.picture.file ? createObjectURL(this.picture.file) : this.picture.get("data"));
      var img = $('<img>').bind('load', function () {
          $(this).unbind('load');
          revokeObjectURL(url);
          var canvas = scaleImage(img[0], {
            maxWidth: that.width,
            maxHeight: that.height
          });
          $(canvas).attr('id', that.picture.get("id") || that.picture.cid);
          that.$("div.thumb-container").append(canvas);
      });
      img.prop('src', url);
      
      return this;
    }
  });
  
  AlbumView = Backbone.View.extend({    
    tagName: "div",
    className: "row",
    
    initialize: function() {
      this.template = templates.album;
      
      _.bindAll(this, "destroy", "render", "thumbClicked", "saveAlbum", 
        "shareAlbum", "deleteAlbum", "stopEditAlbumTitle");
        
      this.album = this.options.album;
      this.album.bind("add", this.render);
      this.album.bind("remove", this.render);
      this.album.bind("change", this.render);
      this.album.bind("reset", this.render);
    },
    
    destroy: function() {
      this.remove();
      this.album.unbind("add", this.render);
      this.album.unbind("remove", this.render);
      this.album.unbind("change", this.render);
      this.album.unbind("reset", this.render);
    },
    
    events: {
      "click a.thumb": "thumbClicked",
      "click .album-actions a.save": "saveAlbum",
      "click .album-actions a.share": "shareAlbum",
      "click .album-actions a.delete": "deleteAlbum",
      "blur #album-header input": "stopEditAlbumTitle",
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
    
    stopEditAlbumTitle: function(e) {
      e.preventDefault();
      this.$("#album-header").removeClass("editing");
    
      var newTitle = this.$("#album-title-input").val();
      this.album.set({name: newTitle});
      
      if (!this.album.isNew()) {
        this.album.save({name: newTitle});
      }
    },
    
    saveAlbum: function(e) {
      var that = this;
      
      e.preventDefault();
      this.album.save(null, {
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
    },
    
    deleteAlbum: function(e) {
      e.preventDefault();
      var view = new DeleteAlbumModalView({template: templates.deleteAlbumModal});
      view.show();
    },
    
    getActions: function() {
      if (this.album.isNew()) {
        return ["Save"];
      }
      else {
        return ["Save", "Share", "Delete"]  
      }
    },
    
    render: function() {
      $(this.el).empty();
            
      if (this.album) {
        $(this.el).html(this.template.tmpl({
          actions: this.getActions(),
          title: this.album.get("name")
        }));
        
        var thumbs = [];
        this.album.pictures.each(function(picture) {
          var view = new ThumbView({picture: picture});
          thumbs.push(view.render().el);
        });
        
        this.$("#thumbs").append(thumbs);
        
        if (!this.currentPicture 
            || (!this.album.pictures.get(this.currentPicture.id) &&
                !this.album.pictures.getByCid(this.currentPicture.cid))) {
          this.currentPicture = this.album.pictures.at(0);
        }
        
        if (this.currentPicture) {
          if (this.pictureView) {
            this.pictureView.destroy();
          }
          
          this.pictureView = new PictureView({picture: this.currentPicture});
          this.$("#full-size").append(this.pictureView.render().el);
        }
        
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
      var numReading = 0;
      var pictures = [];
      
      // OK, we got some drop - time to do some work
      var readFile = function(file) {
        var fileReader = new FileReader();
        fileReader.onloadend = function(e) {
          var imageData = e.target.result;
          var picture = new Picture({data: imageData, type: file.type});
          picture.metadata.set({
            name: file.name,
            type: file.type,
            size: file.size,
            filename: file.fileName,
            description: ""
          });
          picture.file = file;
          
          pictures.push(picture);
                    
          if (pictures.length === numReading) {
            album.addPictures(pictures);
          }
        };
        
        fileReader.onerror = function() {
          console.log("err: ", arguments);
        };
        
        fileReader.readAsDataURL(file); 
      };

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
      
      _.bindAll(this, "index", "viewAlbum", "new", "hideHero", "showHero", 
                "hideAlbum", "showAlbum", "createAlbumView", "renderAlbum");
      
      // Create views
      this.uploadView = new UploadView();
      
      var that = this;
      $(document).bind("dragenter", function(e) {
        e.preventDefault();
        that.uploadView.show();
      });
      $(document.body).bind("dragenter", function(e) {
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
      
      this.albumView = this.createAlbumView();
      
      this.uploadView.render();
      this.renderAlbum();
    },
    
    index: function() {
      this.hideAlbum();
      
      App.album = new Album({name: "Untitled Album"});
      
      this.uploadView.render();
      this.showHero();
    },
    
    viewAlbum: function(aid) {
      this.hideHero();
      
      var that = this;
      var go = function() {
        that.albumView = that.createAlbumView();
        that.uploadView.render();
        
        that.renderAlbum();
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
    
    createAlbumView: function() {
      if (this.albumView) {
        this.albumView.destroy();
      }
      
      return new AlbumView({album: App.album});
    },
    
    renderAlbum: function() {
      //this.albumView = this.createAlbumView();
      
      $("#album-container").append(this.albumView.render().el);
    },
    
    showHero: function() {
      $("#hero").removeClass("hidden");
    },
    
    hideHero: function() {
      $("#hero").addClass("hidden");
    },
    
    showAlbum: function() {
      if (this.albumView) {
        $(this.albumView.el).removeClass("hidden");
      }
    },
    
    hideAlbum: function() {
      if (this.albumView) {
        $(this.albumView.el).addClass("hidden");
      }
    }
  });
})();