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
      
      _.bindAll(this, "destroy", "render", "renderForm", "renderComments", "hook", "unhook", "pictureSelected");
      this.hook();
    },
    
    destroy: function() {
      this.remove();
      if (this.newCommentForm) {
        this.newCommentFormView.destroy();
      }
      this.unhook();
    },
    
    hook: function() {
      if (this.picture) {
        this.picture.comments.bind("add", this.renderComments);
        this.picture.comments.bind("change", this.renderComments);
        this.picture.comments.bind("remove", this.renderComments);
        this.picture.comments.bind("reset", this.renderComments);
      }
      
      App.events.bind("picture:selected", this.pictureSelected);
    },
    
    unhook: function() {
      if (this.picture) {
        this.picture.comments.unbind("add", this.renderComments);
        this.picture.comments.unbind("change", this.renderComments);
        this.picture.comments.unbind("remove", this.renderComments);
        this.picture.comments.unbind("reset", this.renderComments);
      }
      
      App.events.unbind("picture:selected", this.pictureSelected);
    },
    
    render: function() {
      $(this.el).empty();
      
      $(this.el).html(this.template.tmpl());
      
      if (this.newCommentForm) {
        this.newCommentFormView.destroy();
      }
      this.newCommentFormView = new NewCommentFormView();
      this.newCommentFormView.picture = this.picture;
      
      if (this.picture) {
        this.renderForm();
        this.renderComments();
      }
      
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
    },
    
    pictureSelected: function(picture) {
      this.unhook();
      
      $(this.el).show();
      this.picture = picture;
      this.render();
      
      this.hook();
    },
    
    clear: function() {
      this.unhook();
      
      this.picture = null;
      this.render();
      $(this.el).hide();
      
      this.hook();
    }
  });
  
  PictureImageView = Backbone.View.extend({
    tagName: "div",
    className: "full-size-image",
    template: templates.pictureImage,
    
    initialize: function() {
      _.bindAll(this, "destroy", "render", "hook", "unhook", "pictureSelected");
      this.hook();
    },
    
    destroy: function() {
      this.remove();
      this.unhook();
    },
    
    hook: function() {
      if (this.picture) {
        this.picture.bind("change", this.pictureSelected);
      }
      
      App.events.bind("picture:selected", this.pictureSelected);
    },
    
    unhook: function() {
      if (this.picture) {
        this.picture.unbind("change", this.pictureSelected);
      }
      
      App.events.unbind("picture:selected", this.pictureSelected);
    },
    
    render: function() {
      $(this.el).empty();
      
      $(this.el).html(this.template.tmpl());
      
      return this;
    },
    
    pictureSelected: function(picture) {
      // If there is no picture or the new picture is different than the old picture
      if (!this.picture || (this.picture && picture.cid !== this.picture.cid)) {
        this.unhook();
        this.picture = picture;
        this.hook();
        
        var that = this;
        that.$("img").hide();
        that.$("img").attr("src", "");
        $(this.el).animate(
          {
            height: picture.get("sizes").full.height
          }, 
          150, // speed
          null, // easing function (default)
          function() { // on complete
            that.$("img").attr("src", that.picture.get("full"));
            that.$("img").bind('load', function() {
              that.$("img").fadeIn('fast');
            });
          }
        );
      }
    },
    
    clear: function() {
      this.unhook();
      this.picture = null;
      this.render();
      this.hook();
    }
  });
  
  PictureInfoView = Backbone.View.extend({
    tagName: "div",
    className: "form-stacked",
    id: "picture-info",
    template: templates.pictureInfo,
    
    initialize: function() {
      _.bindAll(this, "destroy", "render", "descriptionChange", "updateDescription", "deletePicture", "hook", "unhook", "pictureSelected");
      this.hook();
    },
    
    destroy: function() {
      this.remove();
      this.unhook();
    },
    
    hook: function() {
      if (this.picture) {
        this.picture.bind("change", this.updateDescription);
      }
      App.events.bind("picture:selected", this.pictureSelected);
    },
    
    unhook: function() {
      if (this.picture) {
        this.picture.unbind("change", this.updateDescription);
      }
      App.events.unbind("picture:selected", this.pictureSelected);
    },
    
    events: {
      "blur #picture-description": "descriptionChange",
      "click a.delete": "deletePicture"
    },
    
    descriptionChange: function(e) {
      e.preventDefault();
    
      var oldDescription = ((this.picture && this.picture.get("description")) || "").trim();
      var newDescription = ($(e.target).val() || "").trim();
      if (newDescription === oldDescription) {
        return;
      }
      
      this.picture.save({description: newDescription});
    },
    
    updateDescription: function() {
      this.$("#picture-description").val(this.picture ? this.picture.get("description") : "");
      this.$("#picture-description").change();
    },
    
    deletePicture: function(e) {
      e.preventDefault();
      var view = new DeletePictureModalView({template: templates.deletePictureModal, picture: this.picture});
      view.show();
    },
    
    render: function() {
      $(this.el).empty();
      
      $(this.el).html(this.template.tmpl());
      var that = this;
      _.defer(function() {
        that.$("#picture-description").autoResize({
          extraSpace: 0,
          minHeight: 36
        });
      });
      
      if (this.picture) {
        this.updateDescription();
      }
      
      return this;
    },
    
    pictureSelected: function(picture) {
      this.unhook();
      
      $(this.el).show();
      this.picture = picture;
      this.updateDescription();
      
      this.hook();
    },
    
    clear: function() {
      this.unhook();
      this.picture = null;
      this.updateDescription();
      $(this.el).hide();
      this.hook();
    }
  });
  
  PictureView = Backbone.View.extend({
    tagName: "div",
    className: "content",
    template: templates.pictureView,
    
    initialize: function() {
      this.pictureImageView = new PictureImageView();
      this.commentsView     = new CommentsView();
      this.pictureInfoView  = new PictureInfoView();
      
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
    },
    
    clear: function() {
      this.pictureImageView.clear();
      this.commentsView.clear();
      this.pictureInfoView.clear();
    }
  });  
  
  ThumbView = Backbone.View.extend({
    tagName: "li",
    className: "rs-carousel-item",
    
    initialize: function() {
      _.bindAll(this, "destroy", "render", "updateCommentCount",
                      "uploadProgress", "uploadDone", "uploadFail", "thumbClicked");
      
      this.template = templates.thumb;
      this.thumbType = this.options.thumbType || "thumb";
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
    },
    
    uploadProgress: function(data) {
      console.log("Picture " + this.picture.get("id") + ": " + (data.loaded / data.total));
      var percentage = (data.loaded / data.total) * 100;
      
      this.$(".pgbar").progressbar({value: percentage});
      this.$(".pgbar").removeClass("hidden");
    },
    
    uploadDone: function(data) {
      this.$(".progress").addClass("hidden");
    },
    
    uploadFail: function(data) {
      this.$(".progress").addClass("hidden");
    },
    
    thumbClicked: function(e) {
      // TODO: should we remove this?
    },
    
    updateCommentCount: function() {
      var numComments = this.picture.comments.length;
      this.$(".thumb-actions .comment-count").text(numComments);
    },
    
    render: function(inChangeEvent) {
      // If we're re-rendering as part of the picture model changing,
      // but the thumb URL hasn't actually changed, then we can just
      // ignore this event, because there's nothing for us to do.
      if (inChangeEvent && !this.picture.hasChanged(this.thumbType)) {
        return;
      }
      
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
        that.$(".pgbar").progressbar({value: 0});
      }, 0);      
      
      var setThumb = function(thumbElement) {
        that.$("div.thumb-container a").empty();
        that.$("div.thumb-container a").attr("href", "#" + that.picture.url());
        that.$("div.thumb-container a").append(thumbElement);
        that.$("div.thumb-container").removeClass("hidden");
        
        $(thumbElement).hide();
        $(thumbElement).bind('load', function() {
            $(thumbElement).fadeIn('fast');
        });
      }
      
      if (that.picture.get(that.thumbType)) {
        var img = $("<img>");
        img.prop('src', that.picture.get(that.thumbType));
        img.prop('id', that.picture.cid)
        setThumb(img);
      }
      
      return this;
    }
  });
  
  GridView = Backbone.View.extend({
    tagName: "ul",
    className: "media-bigthumb-grid",
    
    initialize: function() {
      this.album = this.options.album;
      
      _.bindAll(this, "destroy", "render", "add", "del", "reset");
      
      this.album.bind("add", this.add);
      this.album.bind("remove", this.del);
      this.album.bind("reset", this.reset);
      
      this.thumbViews = {};
    },
    
    destroy: function() {
      this.remove();
      
      this.album.unbind("add", this.add);
      this.album.unbind("remove", this.del);
      this.album.unbind("reset", this.reset);
      
      _.each(_.values(this.thumbViews), function(thumbView) {
        thumbView.destroy();
      });
    },
    
    render: function() {
      $(this.el).empty();
      
      _.each(_.values(this.thumbViews), function(thumbView) {
        thumbView.destroy();
      });
      this.thumbViews = {};
      
      var that = this;
      var views = [];
      this.album.pictures.each(function(picture) {
        var view = new ThumbView({picture: picture, thumbType: "bigThumb"});
        that.thumbViews[picture.cid] = view.render();
        views.push(view.el);
      });
      
      $(this.el).append(views);
      
      return this;
    },
    
    add: function(pictures) {
      var that = this;
      var views = [];
      _.each(pictures, function(picture) {
        var view = new ThumbView({picture: picture, thumbType: "bigThumb"});
        that.thumbViews[picture.cid] = view.render();
        views.push(view.el);
      });
      
      $(this.el).append(views);
    },
    
    del: function(picture) {
      var view = this.thumbViews[picture.cid];
      delete this.thumbViews[picture.cid];
      view.destroy();
    },
    
    reset: function() {
      this.render(); 
    }
  });
  
  ThumbsView = Backbone.View.extend({
    tagName: "div",
    className: "rs-carousel module",
    id: "thumb-carousel",
    template: templates.thumbs,
    
    initialize: function() {
      this.album = this.options.album;
      
      _.bindAll(this, "destroy", "render", "add", "del", "reset", "resize", "addToCarousel", "removeFromCarousel", "pictureSelected");
      
      $(window).bind('resize', this.resize);
      App.events.bind("picture:selected", this.pictureSelected);
      this.album.bind("add", this.add);
      this.album.bind("remove", this.del);
      this.album.bind("reset", this.reset);
      
      this.thumbViews = {};
    },
    
    destroy: function() {
      this.remove();
      
      $(window).unbind('resize', this.resize);
      App.events.unbind("picture:selected", this.pictureSelected);
      this.album.unbind("add", this.add);
      this.album.unbind("remove", this.del);
      this.album.unbind("reset", this.reset);
      
      _.each(_.values(this.thumbViews), function(thumbView) {
        thumbView.destroy();
      });
    },
    
    resize: function() {
      if (this.carouselInitialized) {
        var that = this;
        _.defer(function() {
          $(that.el).carousel('refresh');
        });
      }
    },
    
    pictureSelected: function(picture) {
      var that = this;
      
      // Remove the selection from the old thumbs
      _.each(this.thumbViews, function(thumbView) {
        $(thumbView.el).removeClass("thumb-selected");
      });
      
      // Add it to the new one
      var thumbView = this.thumbViews[picture.cid];
      $(thumbView.el).addClass("thumb-selected");
      
      // Scroll to it
      $(that.el).carousel('goToItem', $(thumbView.el), true);
    },
    
    add: function(pictures) {
      var views = [];
      var that = this;
      _.each(pictures, function(picture) {
        var view = new ThumbView({picture: picture, thumbsView: that});
        var index = that.album.pictures.indexOf(picture);
        
        if (index < 0) {
          alert("WTF?");
        }
        
        that.thumbViews[picture.cid] = view.render();
        views.push(view);
      });
      
      this.addToCarousel(views);
    },
    
    del: function(picture) {
      var view = this.thumbViews[picture.cid];
      delete this.thumbViews[picture.cid];
      
      var that = this;
      this.removeFromCarousel([view], true);
    },
    
    reset: function(pictures) {
      this.removeFromCarousel(this.thumbViews, true);
      this.thumbViews = {};
      
      var that = this;
      this.album.pictures.each(function(picture) {
        var view = new ThumbView({picture: picture, thumbsView: that});
        that.thumbViews[picture.cid] = view.render();
      });
      
      this.addToCarousel(this.thumbViews);
    },
    
    addToCarousel: function(thumbViews) {
      var that = this;
      _.defer(function() {
        $(that.el).carousel('add', _.pluck(thumbViews, 'el'));
      });
    },
    
    removeFromCarousel: function(thumbViews, remove) {
      var that = this;
      _.defer(function() {
        $(that.el).carousel('remove', _.pluck(thumbViews, 'el'));
        
        if (remove) {
          _.each(thumbViews, function(view) {
            view.destroy();
          });
        }
      });
    },
    
    render: function() {
      $(this.el).empty();
      $(this.el).html(this.template.tmpl());
      
      var that = this;
      _.defer(function() {
        $(that.el).carousel({
          pagination: false,
          create_: function() {
            that.carouselInitialized = true;
          }
        });
      });
      
      return this;
    },
  });
  
  AlbumView = Backbone.View.extend({    
    tagName: "div",
    
    initialize: function() {
      this.template = templates.album;
      
      _.bindAll(this, "destroy", "render", 
        "shareAlbum", "deleteAlbum", "stopEditAlbumTitle", "updateTitle", "updateActions", "pictureSelected",
        "renderCurrentPicture", "add", "reset", "del", "show", "hide", "pictureSelected", "updateActionButtons",
        "uploadPictures", "goToGrid");
        
      this.album = this.options.album;
      this.thumbsView = new ThumbsView({album: this.album});
      this.gridView = new GridView({album: this.album});
      this.pictureView = new PictureView();
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
      "click #empty-album a.upload": "uploadPictures",
      "click .album-actions a.add": "uploadPictures",
      "click .album-actions a.grid": "goToGrid",
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
      if (!this.currentPicture) {
        return;
      }
      
      var index = this.album.pictures.indexOf(this.currentPicture) + 1;
      if (index < this.album.pictures.length) {
        var picture = this.album.pictures.at(index);
        App.navigate(picture.url(), true);
      }
    },
    
    prevPicture: function() {
      if (!this.currentPicture) {
        return;
      }
      
      var index = this.album.pictures.indexOf(this.currentPicture) - 1;
      if (index >= 0) {
        var picture = this.album.pictures.at(index);
        App.navigate(picture.url(), true);
      }
    },
    
    pictureSelected: function(picture, shouldRender) {
      if (shouldRender) {
        this.updateRender(picture);
      }
    },
    
    add: function() {
      this.updateRender();
    },
    
    del: function(deletedPicture) {
      if (this.currentPicture === deletedPicture) {
        var picture = (this.album.pictures.at(this.previousPictureIndex) || this.album.pictures.at(0));
        App.navigate(picture ? picture.url() : this.album.url(), true);
      }
      
      this.updateRender();
    },
    
    reset: function() {
      this.updateRender();
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
        return ["Add", "Grid"];
      }
      else {
        return ["Add", "Grid", "Share", "Delete"]  
      }
    },
    
    render: function() {
      $(this.el).empty();
      
      $(this.el).html(this.template.tmpl());
      this.$("#thumbs-container").html(this.thumbsView.render().el);
      this.$("#full-size").html(this.pictureView.render().el);
      this.$("#grid-container").html(this.gridView.render().el);
      
      return this.updateRender();
    },
    
    updateRender: function(picture) {
      this.updateTitle();
      this.updateActions();
      this.renderCurrentPicture(picture);
      this.updateActionButtons();
      
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
      else {
        return;
      }
      
      // Show the full size
      if (this.currentPicture) {
        this.showStrip();
      }
      
      // Store the picture before us in the index
      this.previousPictureIndex = Math.max(0, this.album.pictures.indexOf(this.currentPicture) - 1);
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
      this.$(".hero-unit").removeClass("hidden");
      
      this.hideStrip();
      this.hideGrid();
      this.pictureView.clear();
    },
    
    show: function() {
      this.$(".hero-unit").addClass("hidden");
    },
    
    goToGrid: function(e) {
      e.preventDefault();
      App.navigate(this.album.url(), true);
    },
    
    showGrid: function() {
      this.hideStrip();
      
      this.$("#grid-container").show();
    },
    
    hideGrid: function() {
      this.$("#grid-container").hide();
    },
    
    showStrip: function() {
      this.hideGrid();
      
      var that = this;
      var thumbContainer = this.$("#thumbs-container:hidden");
      if (thumbContainer.length) {
        var thumbBarHeight = thumbContainer.css("height");
        thumbContainer.show();
        thumbContainer.css("bottom", "-"+thumbBarHeight);
        thumbContainer.animate({
          bottom: 0
        }, 150);
      }
      this.$("#full-size").show();
      _.defer(function() {
        that.thumbsView.resize();
      });
    },
    
    hideStrip: function() {
      this.currentPicture = null;;
      this.$("#thumbs-container").hide();
      this.$("#full-size").hide();
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
              $(that.dropOverlay).remove();
            }
          });
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
    
    var executeSave = function(notify) {
      picture.save(null, {
        success: function() {
          // OK, we've saved the data, now we can upload
          // the actual file
          album.pictures.add(picture);
          
          // Re-render the album
          if (notify) {
            App.events.trigger("album:hasPictures", album.id);
          }
          
          data.picture = picture;
          data.url = picture.url() + "/data";
          data.submit()
            .success(function(result, textStatus, jqxhr) {
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
      album.queue.push(function() { executeSave(true); });
    }
    else if (album.isNew() && album.isCreating) {
      album.queue.push(executeSave);
    }
    else {
      executeSave(album.pictures.length === 0);
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
          if (!that.album) {
            App.navigate("/new", true);
          }
          
          that.uploadView.hide();
          savePicture(that.album, data.files[0], data);
        },
        send: function(e, data) {
          var picture = data.picture;
          picture.trigger("upload:progress", {
            loaded: 0,
            total: 1
          });
        },
        drop: function(e, data) {
          that.uploadView.hide();
        },
        progress: function(e, data) {
          var picture = data.picture;
          picture.trigger("upload:progress", data);
        }
      });
      
      key('left', function() {
        that.albumView.prevPicture();
      });
      key('right', function() {
        that.albumView.nextPicture();
      });
      
      App.events.bind("album:hasPictures", this.viewAlbum)
    },
    
    routes: {
      "": "index",
      "/": "index",
      "/new": "new",
      "/new/": "new",
      "/albums/:aid": "viewAlbum",
      "/albums/:aid/": "viewAlbum",
      "/albums/:aid/pictures/:pid": "viewAlbum",
      "/albums/:aid/pictures/:pid/": "viewAlbum"
    },
    
    index: function() {
      this.album = null;
      this.hideAlbum();
      this.showHero();
    },
    
    new: function() {
      this.hideHero();
      this.showAlbum();
      this.createAndRenderAlbum({name: "Untitled Album"});
      this.uploadView.render();
    },
    
    viewAlbum: function(aid, pid) {
      this.hideHero();
      this.showAlbum();
      var selectPictureIfNecessary = function() {
        var picture = App.album.pictures.get(pid);
        
        if (picture) {
          App.events.trigger("picture:selected", picture, true);
        }
        else {
          App.albumView.showGrid();
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
    },
    
    showHero: function() {
      $(".hero-unit").parent().removeClass("hidden");
    },
    
    hideHero: function() {
      $("#main-hero.hero-unit").parent().addClass("hidden");
    }
  });
})();