(function() {
  var templates = {
    thumb: $("#thumbTemplate"),
    thumbs: $("#thumbsTemplate"),
    album: $("#albumTemplate"),
    deleteAlbumModal: $("#deleteAlbumModalTemplate"),
    deletePictureModal: $("#deletePictureModalTemplate"),
    newCommentForm: $("#newCommentFormTemplate"),
    comment: $("#commentTemplate"),
    comments: $("#commentsTemplate"),
    pictureImage: $("#pictureImageTemplate"),
    pictureInfo: $("#pictureInfoTemplate"),
    pictureView: $("#pictureViewTemplate"),
    actions: $("#actionsTemplate"),
    dropOverlay: $("#dropOverlayTemplate"),
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
    template: templates.pictureImage,
    
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
      
      $(this.el).html(this.template.tmpl({
        src: this.picture.get("full")
      }));
      
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
      
      _.bindAll(this, "destroy", "render", "descriptionChange", "updateDescription", "deletePicture");
      this.picture.bind("change", this.updateDescription);
    },
    
    destroy: function() {
      this.remove();
      this.picture.unbind("change", this.updateDescription);
    },
    
    events: {
      "blur #picture-description": "descriptionChange",
      "click a.delete": "deletePicture"
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
    
    deletePicture: function(e) {
      e.preventDefault();
      var view = new DeletePictureModalView({template: templates.deletePictureModal, picture: this.picture});
      view.show();
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
   
      return this;
    }
  });  
  
  ThumbView = Backbone.View.extend({
    tagName: "li",
    className: "rs-carousel-item",
    width: 75,
    height: 75,
    
    initialize: function() {
      _.bindAll(this, "destroy", "render", "deleteThumb", "updateCommentCount",
                      "uploadProgress", "uploadDone", "uploadFail", "thumbClicked", "pictureSelected");
      
      this.template = templates.thumb;
      this.picture = this.options.picture;
      this.isEdit = this.options.isEdit;
      this.thumbsView = this.options.thumbsView;
      
      this.picture.bind("change", this.render);
      this.picture.bind("upload:progress", this.uploadProgress);
      this.picture.bind("upload:done", this.uploadDone);
      this.picture.bind("upload:fail", this.uploadFail);
      this.picture.comments.bind("add", this.updateCommentCount);
      this.picture.comments.bind("remove", this.updateCommentCount);
      this.picture.comments.bind("reset", this.updateCommentCount);
      App.events.bind("picture:selected", this.pictureSelected);
      
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
      App.events.unbind("picture:selected", this.pictureSelected);
    },
    
    events: {
      "click div.thumb-container img": "thumbClicked",
      "click a.delete": "deleteThumb"
    },
    
    uploadProgress: function(data) {
      console.log("Picture " + this.picture.get("id") + ": " + (data.loaded / data.total));
      var percentage = (data.loaded / data.total) * 100;
      var percentageText = parseInt(percentage, 10) + "%";
      
      this.$(".pgbar").progressbar({value: percentage});
      this.$(".pgbar").removeClass("hidden");
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
      App.navigate(this.picture.url(), true);
    },
    
    pictureSelected: function(picture) {
      var that = this;
      if (this.picture.cid === picture.cid) {
        $(this.el).addClass("thumb-selected");
        
        _.defer(function() {
          $(that.thumbsView.el).carousel('goToItem', $(that.el), true);
        });
      }
      else {
        $(this.el).removeClass("thumb-selected");
      }
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
        that.$(".pgbar").progressbar({value: 10});
      }, 0);
      
      
      var setThumb = function(thumbElement) {
        that.$("div.thumb-container").empty();
        that.$("div.thumb-container").append(thumbElement);
        that.$("div.thumb-container").removeClass("hidden");
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
    tagName: "div",
    className: "rs-carousel module",
    id: "thumb-carousel",
    template: templates.thumbs,
    
    initialize: function() {
      this.album = this.options.album;
      
      _.bindAll(this, "destroy", "render", "add", "del", "resize");
      
      $(window).bind('resize', this.resize);
      
      this.album.bind("add", this.add);
      this.album.bind("remove", this.del);
      // You might think we need to bind to the reset event of the album,
      // but in reality, that is going to cause the entire album to re-render,
      // which will re-render us anyway.
      
      this.thumbViews = {};
    },
    
    destroy: function() {
      this.remove();
      
      $(window).unbind('resize', this.resize);
      this.album.unbind("add", this.add);
      this.album.unbind("remove", this.del);
    },
    
    resize: function() {
      if (this.carouselInitialized) {
        var that = this;
        _.defer(function() {
          $(that.el).carousel('refresh');
        });
      }
    },
    
    add: function(pictures) {
      var that = this;
      _.each(pictures, function(picture) {
        var view = new ThumbView({picture: picture, thumbsView: that});
        var index = that.album.pictures.indexOf(picture);
        
        if (index < 0) {
          alert("WTF?");
        }
        
        that.thumbViews[picture.cid] = view.render();
        
        _.defer(function() {
          $(that.el).carousel('add', $(view.el));
        });
      });
    },
    
    del: function(picture) {
      var view = this.thumbViews[picture.cid];
      delete this.thumbViews[picture.cid];
      
      var that = this;
      
      _.defer(function() {
        $(that.el).carousel('remove', $(view.el));
        view.destroy();
      });
    },
    
    render: function() {
      $(this.el).empty();
      $(this.el).html(this.template.tmpl());
      
      _.each(this.thumbViews, function(thumbView) {
        thumbView.destroy();
      });
      
      var that = this;
      var els = [];
      this.album.pictures.each(function(picture) {
        var view = new ThumbView({picture: picture, thumbsView: that});
        els.push(view.render().el);
        
        that.thumbViews[picture.cid] = view;
      });
      
      var that = this;
      _.defer(function() {
        $(that.el).carousel({
          pagination: false,
          create_: function() {
            _.each(that.thumbViews, function(thumbView) {
              $(that.el).carousel('add', $(thumbView.el));
            });
            that.carouselInitialized = true;
          }
        });
        
      });
      
      return this;
    },
    
    createCarousel: function() {
      
    },
  });
  
  AlbumView = Backbone.View.extend({    
    tagName: "div",
    
    initialize: function() {
      this.template = templates.album;
      
      _.bindAll(this, "destroy", "render", 
        "shareAlbum", "deleteAlbum", "stopEditAlbumTitle", "updateTitle", "updateActions", "pictureSelected",
        "renderCurrentPicture", "add", "reset", "del", "show", "hide", "pictureSelected", "updateActionButtons",
        "uploadPictures");
        
      this.album = this.options.album;
      this.thumbsView = new ThumbsView({album: this.album});
      this.previousPictureIndex = 0;
      this.album.bind("change", this.updateTitle);
      this.album.bind("change", this.updateActions);
      this.album.bind("add", this.add);
      this.album.bind("reset", this.reset);
      this.album.bind("remove", this.del);
      App.events.bind("picture:selected", this.pictureSelected);
    },
    
    destroy: function() {
      this.remove();
      this.thumbsView.destroy();
      this.album.unbind("change", this.updateTitle);
      this.album.unbind("change", this.updateActions);
      this.album.unbind("add", this.add);
      this.album.unbind("reset", this.reset);
      this.album.unbind("remove", this.del);
      App.events.unbind("picture:selected", this.pictureSelected);
    },
    
    events: {
      "click .album-actions a.add": "uploadPictures",
      "click .album-actions a.share": "shareAlbum",
      "click .album-actions a.delete": "deleteAlbum",
      "click .action-button-next": "nextPicture",
      "click .action-button-prev": "prevPicture",
      "blur .album-header input": "stopEditAlbumTitle",
    },
    
    uploadPictures: function(e) {
      e.preventDefault();
      App.uploadView.show();
    },
    
    nextPicture: function() {
      var index = this.album.pictures.indexOf(this.currentPicture) + 1;
      if (index < this.album.pictures.length) {
        var picture = this.album.pictures.at(index);
        App.events.trigger("picture:selected", picture, true);
      }
    },
    
    prevPicture: function() {
      var index = this.album.pictures.indexOf(this.currentPicture) - 1;
      if (index >= 0) {
        var picture = this.album.pictures.at(index);
        App.events.trigger("picture:selected", picture, true);
      }
    },
    
    pictureSelected: function(picture, shouldRender) {
      if (shouldRender) {
        this.renderCurrentPicture(picture);
      }
    },
    
    add: function() {
      this.updateActionButtons();
      
      this.show();
    },
    
    del: function(deletedPicture) {      
      if (this.currentPicture === deletedPicture) {
        var picture = this.currentPicture = this.album.pictures.at(this.previousPictureIndex);
        App.navigate(picture.url(), true);
      }
      
      this.updateActionButtons();
      
      if (this.album.pictures.length === 0) {
        this.hide();
      }
    },
    
    reset: function() {
      var picture = this.currentPicture = this.album.pictures.at(0);
      this.render();
      App.events.trigger("picture:selected", picture, false);
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
        return ["Add", "Share", "Delete"]  
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
      if (this.currentPicture === picture) {
        return;
      }
      
      if (picture) {
        this.currentPicture = picture;
      }
      
      if (this.currentPicture) {
        this.previousPictureIndex = Math.max(0, this.album.pictures.indexOf(this.currentPicture) - 1);
        
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
        
        this.updateActionButtons();
        
        if (oldPictureView) {
          $(oldPictureView.el).detach();
        }
      }
    },
    
    updateActionButtons: function() {
      if (!this.currentPicture) {
        return;
      }
      
      if (this.album.pictures.isFirst(this.currentPicture)) {
        this.$("#full-size").addClass("first-picture");
      }
      else {
        this.$("#full-size").removeClass("first-picture");
      }
      
      if (this.album.pictures.isLast(this.currentPicture)) {
        this.$("#full-size").addClass("last-picture");
      }
      else {
        this.$("#full-size").removeClass("last-picture");
      }
    },
    
    updateTitle: function() {
      this.$("#album-title-input").val(this.album.get("name"));
    },
    
    updateActions: function() {
      this.$(".album-actions").html(templates.actions.tmpl({
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
      $(this.el).modal({
        backdrop: true,
        keyboard: true
      })
      
      _.bindAll(this, "show", "hide", "primaryClicked", "secondaryClicked");
      
      this.delegateEvents();
    },
    
    events: {
      "click a.button1": "primaryClicked",
      "click a.button2": "secondaryClicked"
    },
    
    show: function() {
      $(this.el).modal('show');
    },
    
    hide: function(e) {
      if (e) {
        e.preventDefault();
      }
      
      $(this.el).modal('hide');
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
    dropOverlay: "#drop-overlay",
    el: "#file-upload",
    
    initialize: function() {
      
      $(this.el).modal({
        backdrop: true,
        keyboard: true
      })
      var that = this;
      $(this.el).bind('hide', function() {
        that.isShown = false;
        that.isDragging = false;
        $(that.dropOverlay).remove();
      });
      $(this.el).bind('show', function() {
        that.isShown = true;
      });
      
      this.template = templates.upload;
      _.bindAll(this, "render", "show", "hide");
    },
    
    show: function(isDragging) {
      var hideOnLeave = isDragging && !this.isShown;
      if (!this.isShown) {
        $(this.el).modal('show');
      }
      
      var that = this;
      console.log("SHOW: ", isDragging, this.isDragging);
      if (isDragging && !this.isDragging) {
        this.isDragging = true;
        $(templates.dropOverlay.tmpl()).appendTo($(document.body))
          .bind('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
          })
          .bind("dragleave", function(e) {
            e.preventDefault();
            e.stopPropagation();
            that.isDragging = false;
            if (hideOnLeave) {
              $(that.el).modal("hide"); 
            }
            else {
              console.log($(that.dropOverlay));
              $(that.dropOverlay).remove();
            }
          })
      }
    },
    
    hide: function() {
      $(this.el).modal("hide");
    },
    
    dragenter: function(e) {
      e.preventDefault();
      e.stopPropagation();
    },
    
    render: function() {
      this.isShown = false;
      $(this.el).modal('hide');
      
      return this;
    },
  });
  
  var savePicture = function(album, file, data) {
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
    
    var executeSave = function() {
      picture.save(null, {
        success: function() {
          // OK, we've saved the data, now we can upload
          // the actual file
          album.pictures.add(picture);
          data.picture = picture;
          data.url = picture.url() + "/data";
          data.submit()
            .success(function(result, textStatus, jqxhr) {
              console.log("success: " + picture.cid);
              picture.set(result);
              picture.trigger("upload:done");
            }).error(function(jqxhr, textStatus, errorThrown) {
              console.log("error: " + picture.cid);
              picture.trigger("upload:fail", textStatus);
            });
        },
        error: function() {
          console.log("Picture save fail...", picture, album);
        }
      });
    };
    
    if (album.isNew() && !album.isCreating) {
      album.save({}, {
        success: function() {
          _.each(album.queue, function(fn) {
            fn();
          });
          
          album.queue = [];
          App.navigate(album.url(), true);
        }
      });
      
      album.queue = [];
      album.queue.push(executeSave);
    }
    else if (album.isNew() && album.isCreating) {
      album.queue.push(executeSave);
    }
    else {
      executeSave();
    }
  };
  
  PicshareApp = Backbone.Router.extend({
    upload: "#file-upload",
    
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
        that.uploadView.show(true);
      });
      
      var that = this;
      $("#file-upload").fileupload({
        namespace: "upload",
        add: function(e, data) {
          that.uploadView.hide();
          savePicture(that.album, data.files[0], data);
        },
        drop: function(e, data) {
          that.uploadView.hide();
        },
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
      "/albums/:aid": "viewAlbum",
      "/albums/:aid/": "viewAlbum",
      "/albums/:aid/pictures/:pid": "viewAlbum",
      "/albums/:aid/pictures/:pid/": "viewAlbum"
    },
    
    index: function() {
      this.createAndRenderAlbum({name: "Untitled Album"});
      
      this.uploadView.render();
    },
    
    new: function() {
      this.createAndRenderAlbum({name: "Untitled Album"});
      this.uploadView.render();
    },
    
    viewAlbum: function(aid, pid) {
      var selectPictureIfNecessary = function() {
        if (pid) {
          var picture = App.album.pictures.get(pid);
          App.events.trigger("picture:selected", picture, true);
        }
      };
      
      // Don't re-render the page unless
      // we have to.
      if (App.album && App.album.get("id") === aid) {
        this.uploadView.render();
        selectPictureIfNecessary();
      }
      else {
        this.uploadView.render();
        this.createAndRenderAlbum({id: aid});
        this.album.fetch();
        this.album.pictures.fetch({
          success: function() {
            selectPictureIfNecessary();
          }
        });
      }
    },
    
    createAndRenderAlbum: function(options) {
      if (this.albumView) {
        this.albumView.destroy();
      }
      
      var that = this;
      this.album = new Album(options);
      this.albumView = new AlbumView({album: this.album});
      $("#album-container").append(that.albumView.render().el);
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