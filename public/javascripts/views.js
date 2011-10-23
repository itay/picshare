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
    actions: $("#actionsTemplate")
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
      _.bindAll(this, "render", "getFormData", "newComment", "clearForm");
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
      
      var that = this;
      var formData = this.getFormData();
      
      if (formData.text !== "") {
        // Create the comment
        var picture = this.picture;
        var comment = new PictureComment(
          {
            name: formData.name,
            text: formData.text,
            created: (new Date()).valueOf()
          },
          {
            picture: picture
          }
        );
        
        // Save it, and if the save is successful,
        // add it to the comments collection
        comment.save(null, {
          success: function() {
            picture.comments.add(comment);
            that.clearForm();
          },
          error: function() {
            console.log("Error saving comment...", comment, picture);
          }
        });
      }
    },
    
    getFormData: function() {
      var name = this.$("#picture-comment-name").val() || "Anonymous";
      var text = this.$("#picture-comment-text").val() || "";
      
      return {
        name: name.trim(),
        text: text.trim()
      }
    },
    
    clearForm: function() {
      this.$("#picture-comment-name").val("")
      this.$("#picture-comment-text").val("")
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
      
      this.picture.bind("change", this.render);
    },
    
    destroy: function() {
      this.remove();
      this.picture.unbind("change", this.render);
    },
    
    render: function() {
      $(this.el).empty();
      
      var that = this;
      var setImage = function(imageElement) {
        $(that.el).empty();
        $(that.el).append(imageElement);
      };
      
      if (this.picture.get("full")) {
        var img = $("<img>");
        img.prop("src", this.picture.get("full"));
        setImage(img);
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
      this.picture.bind("change", this.updateDescription);
    },
    
    destroy: function() {
      this.remove();
      this.picture.unbind("change", this.updateDescription);
    },
    
    events: {
      "blur #picture-description": "descriptionChange",
    },
    
    descriptionChange: function(e) {
      e.preventDefault();
    
      var oldDescription = (this.picture.get("description") || "").trim();
      var newDescription = ($(e.target).val() || "").trim();
      if (newDescription === oldDescription) {
        return;
      }
       
      this.picture.save({description: newDescription});
    },
    
    updateDescription: function() {
      this.$("#picture-description").val(this.picture.get("description"));
    },
    
    render: function() {
      $(this.el).empty();
      
      $(this.el).html(this.template.tmpl(this.picture.toJSON()));
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
    template: templates.pictureView,
    
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
      $(this.el).html(this.template.tmpl());
      
      this.$("#picture-image-container").append(this.pictureImageView.render().el);
      this.$("#picture-comments-container").append(this.commentsView.render().el);
      this.$("#picture-info-container").append(this.pictureInfoView.render().el);
      
      /*$(this.el).append([
         this.pictureImageView.render().el,
         this.pictureInfoView.render().el,
         this.commentsView.render().el,
      ]);*/
   
      return this;
    }
  });  
  
  ThumbView = Backbone.View.extend({
    tagName: "li",
    width: 75,
    height: 75,
    
    initialize: function() {
      _.bindAll(this, "destroy", "render", "deleteThumb", "updateCommentCount",
                      "uploadProgress", "uploadDone", "uploadFail", "thumbClicked");
      
      this.template = templates.thumb;
      this.picture = this.options.picture;
      this.isEdit = this.options.isEdit;
      
      this.picture.bind("change", this.render);
      this.picture.bind("upload:progress", this.uploadProgress);
      this.picture.bind("upload:done", this.uploadDone);
      this.picture.bind("upload:fail", this.uploadFail);
      this.picture.comments.bind("add", this.updateCommentCount);
      this.picture.comments.bind("remove", this.updateCommentCount);
      this.picture.comments.bind("reset", this.updateCommentCount);
      
    },
    
    destroy: function() {
      this.remove();
      
      this.picture.unbind("change", this.render);
      this.picture.unbind("upload:progress", this.uploadProgress);
      this.picture.unbind("upload:done", this.uploadDone);
      this.picture.unbind("upload:fail", this.uploadFail);
      this.picture.comments.unbind("add", this.updateCommentCount);
      this.picture.comments.unbind("remove", this.updateCommentCount);
      this.picture.comments.unbind("reset", this.updateCommentCount);
    },
    
    events: {
      "click div.thumb-container img": "thumbClicked",
      "click a.delete": "deleteThumb"
    },
    
    uploadProgress: function(data) {
      console.log("Picture " + this.picture.get("id") + ": " + (data.loaded / data.total));
      var percentage = (data.loaded / data.total) * 100;
      var percentageText = parseInt(percentage, 10) + "%";
      
      this.$(".progress-bar").polartimer('drawTimer', percentage);
      this.$(".progress-text").text(percentageText);
      this.$(".progress").removeClass("hidden");
    },
    
    uploadDone: function(data) {
      this.$(".progress").addClass("hidden");
    },
    
    uploadFail: function(data) {
      this.$(".progress").addClass("hidden");
    },
    
    deleteThumb: function(e) {
      e.preventDefault();
      var view = new DeletePictureModalView({template: templates.deletePictureModal, picture: this.picture});
      view.show();
    },
    
    thumbClicked: function(e) {
      e.preventDefault();
      App.events.trigger("thumb:clicked", this.picture);
    },
    
    updateCommentCount: function() {
      var numComments = this.picture.comments.length;
      this.$(".thumb-actions .comment-count").text(numComments);
    },
    
    render: function() {
      $(this.el).empty();
      
      var content = this.template.tmpl({
        src: this.picture.get("data"),
        numComments: this.picture.comments.length,
        id: this.picture.cid
      });
      
      $(this.el).html(content);
      
      // Need to make this happen on the next tick, unfortunately.
      var that = this;
      setTimeout(function() { 
        that.$(".progress-bar").polartimer({
          color: "#F00",
          opacity: 1.0,
        }); 
      }, 0);
      
      
      var setThumb = function(thumbElement) {
        that.$("div.thumb-container").empty();
        that.$("div.thumb-container").append(thumbElement);
      }
      
      if (that.picture.get("thumb")) {
        var img = $("<img>");
        img.prop('src', that.picture.get("thumb"));
        img.prop('id', that.picture.cid)
        setThumb(img);
      }
      
      return this;
    }
  });
  
  ThumbsView = Backbone.View.extend({
    tagName: "ul",
    className: "",
    id: "thumbs",
    
    
    initialize: function() {
      this.album = this.options.album;
      
      _.bindAll(this, "destroy", "render", "add", "del", "refreshWidth");
      
      this.album.bind("add", this.add);
      this.album.bind("remove", this.del);
      // You might think we need to bind to the reset event of the album,
      // but in reality, that is going to cause the entire album to re-render,
      // which will re-render us anyway.
      
      this.thumbViews = {};
    },
    
    destroy: function() {
      this.remove();
      
      this.album.unbind("add", this.add);
      this.album.unbind("remove", this.del);
    },
    
    add: function(pictures) {
      var that = this;
      _.each(pictures, function(picture) {
        var view = new ThumbView({picture: picture});
        var index = that.album.pictures.indexOf(picture);
        
        if (index < 0) {
          alert("WTF?");
        }
    
        if (index > 0) {
          var viewBefore = that.thumbViews[that.album.pictures.at(index - 1).cid];
          $(viewBefore.el).after(view.render().el);
        }
        else {
          $(that.el).prepend(view.render().el);
        }
        
        that.thumbViews[picture.cid] = view;
        that.refreshWidth();
      });
    },
    
    del: function(picture) {
      var view = this.thumbViews[picture.cid];
      view.destroy();
      
      delete this.thumbViews[picture.cid];
      this.refreshWidth();
    },
    
    render: function() {
      $(this.el).empty();
      
      _.each(this.thumbViews, function(thumbView) {
        thumbView.destroy();
      });
      
      var that = this;
      var els = [];
      this.album.pictures.each(function(picture) {
        var view = new ThumbView({picture: picture});
        els.push(view.render().el);
        
        that.thumbViews[picture.cid] = view;
      });
      
      $(this.el).append(els);
      this.refreshWidth();
      
      return this;
    },
    
    refreshWidth: function() {
      var that = this;
      setTimeout(function() {
        var totalWidth = 0;
        for(var pid in that.thumbViews) {
          if (that.thumbViews.hasOwnProperty(pid)) {
            totalWidth += $(that.thumbViews[pid].el).outerWidth(true);
          }
        }
        $(that.el).css("width", totalWidth)
      }, 0);
    }
  });
  
  AlbumView = Backbone.View.extend({    
    tagName: "div",
    
    initialize: function() {
      this.template = templates.album;
      
      _.bindAll(this, "destroy", "render", 
        "shareAlbum", "deleteAlbum", "stopEditAlbumTitle", "updateTitle", "updateActions",
        "renderCurrentPicture", "add", "reset", "del", "show", "hide");
        
      this.album = this.options.album;
      this.thumbsView = new ThumbsView({album: this.album});
      this.album.bind("change", this.updateTitle);
      this.album.bind("change", this.updateActions);
      this.album.bind("add", this.add);
      this.album.bind("reset", this.reset);
      this.album.bind("remove", this.del);
      App.events.bind("thumb:clicked", this.renderCurrentPicture);
    },
    
    destroy: function() {
      this.remove();
      this.thumbsView.destroy();
      this.album.unbind("change", this.updateTitle);
      this.album.unbind("change", this.updateActions);
      this.album.unbind("add", this.add);
      this.album.unbind("reset", this.reset);
      this.album.unbind("remove", this.del);
      App.events.unbind("thumb:clicked", this.renderCurrentPicture);
    },
    
    events: {
      "click .album-actions a.share": "shareAlbum",
      "click .album-actions a.delete": "deleteAlbum",
      "blur .album-header input": "stopEditAlbumTitle",
    },
    
    add: function() {
      this.show();
    },
    
    del: function(deletedPicture) {      
      if (this.currentPicture === deletedPicture) {
        this.currentPicture = this.album.pictures.at(0);
        this.renderCurrentPicture();
      }
      
      if (this.album.pictures.length === 0) {
        this.hide();
      }
    },
    
    reset: function() {
      this.currentPicture = this.album.pictures.at(0);
      this.render();
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
        return [];
      }
      else {
        return ["Share", "Delete"]  
      }
    },
    
    render: function() {
      $(this.el).empty();
      
      $(this.el).html(this.template.tmpl());
      
      this.updateTitle();
      this.updateActions();
      this.$("#thumbs-container").append(this.thumbsView.render().el);
      this.renderCurrentPicture();
      
      if (this.album.pictures.length === 0) {
        this.hide();
      }
      else {
        this.show();
      }
      
      return this;
    },
    
    renderCurrentPicture: function(picture) {
      if (picture) {
        this.currentPicture = picture;
      }
      
      if (this.currentPicture) {
        // TODO: this caching is probably unnecessary, but we'll leave it in
        // for now.
        var oldPictureView = this.pictureView;
        var pictureView = null;
        if (this.currentPicture.fullView) {
          pictureView = this.currentPicture.fullView;
        }
        else {
          pictureView = new PictureView({picture: this.currentPicture});
          pictureView.render();
        }
        
        this.pictureView = this.currentPicture.fullView = pictureView;
        this.$("#full-size").append(this.pictureView.el);
        
        if (oldPictureView) {
          $(oldPictureView.el).detach();
        }
      }
    },
    
    updateTitle: function() {
      this.$("#album-title-input").val(this.album.get("name"));
    },
    
    updateActions: function() {
      this.$(".actions-wrapper").html(templates.actions.tmpl({
        actions: this.getActions()
      }));
    },
    
    hide: function() {
      $(this.el).addClass("hidden");
    },
    
    show: function() {
      $(this.el).removeClass("hidden");
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
      var handleFile = function(file) {
        var picture = new Picture(
          {
            name: file.name,
            type: file.type,
            size: file.size,
            filename: file.fileName,
            description: ""
          },
          {
            album: album    
          }
        );
        
        picture.save(null, {
          success: function() {
            // OK, we've saved the data, now we can upload
            // the actual file
            album.pictures.add(picture);
            picture.setData(file);
          },
          error: function() {
            console.log("Picture save fail...", picture, album);
          }
        });
      };

      var files = e.originalEvent.dataTransfer.files;
      var imageFiles = [];
      for(var i = 0; i < files.length; i++) {
        var file = e.originalEvent.dataTransfer.files[i];
        
        if (!_.startsWith(file.type, "image")) {
          alert(_.sprintf("File %s is not an image: %s", file.name, file.type));
          continue;
        }
        else {
          numReading++;
          imageFiles.push(file);
        }
      }
      
      if (imageFiles.length > 0 && album.isNew()) {
        album.save({}, {
          success: function() {
            _.each(imageFiles, function(imageFile) { handleFile(imageFile); });
            
            App.navigate(album.url(), true);
          }
        })
      }
      else {
        _.each(imageFiles, function(imageFile) { handleFile(imageFile); });
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
      
      _.bindAll(this, "index", "viewAlbum", "new", 
                "hideAlbum", "showAlbum", "createAndRenderAlbum");
      
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
      
      $("#file-upload").fileupload({
        progress: function(e, data) {
          var picture = data.picture;
          picture.trigger("upload:progress", data);
        }
      });
    },
    
    routes: {
      "": "index",
      "/": "index",
      "/new": "new",
      "/albums/:aid": "viewAlbum"
    },
    
    index: function() {
      this.createAndRenderAlbum({name: "Untitled Album"});
      
      this.uploadView.render();
    },
    
    new: function() {
      this.createAndRenderAlbum({name: "Untitled Album"});
      this.uploadView.render();
    },
    
    viewAlbum: function(aid) {
      // Don't re-render the page unless
      // we have to.
      if (App.album && App.album.get("id") === aid) {
        this.uploadView.render();
      }
      else {
        this.uploadView.render();
        this.createAndRenderAlbum({id: aid});
        this.album.fetch();
      }
    },
    
    createAndRenderAlbum: function(options) {
      if (this.albumView) {
        this.albumView.destroy();
      }
      
      this.album = new Album(options);
      this.albumView = new AlbumView({album: this.album});
      $("#album-container").append(this.albumView.render().el);
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