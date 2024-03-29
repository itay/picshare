
/**
 * Module dependencies.
 */

var express = require('express');
var form = require('connect-form');
var _ = require('underscore');
var Data = require('./data').Data;

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', {
    layout: false
  });
  // make a custom html template
  app.register('.html', {
    compile: function(str, options){
      return function(locals){
        return str;
      };
    }
  });
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(form({keepExtensions: true}));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

var data = new Data();

// Routes

app.get('/', function(req, res){
  res.render('index.html');
});

app.get('/albums', function(req, res) {
  res.json(data.getAlbums());
});

app.post('/albums', function(req, res) {
  res.json(data.createAlbum(req.body));
});

app.get('/albums/:id', function(req, res) {
  var albumId = req.params.id;
  
  res.json(data.getAlbum(albumId));
});

app.put('/albums/:id', function(req, res) {
  var albumId = req.params.id;
  
  res.json(data.updateAlbum(albumId, req.body));
});

app.del('/albums/:id', function(req, res) {
  var albumId = req.params.id;
  
  res.json(data.deleteAlbum(albumId));
});

app.get('/albums/:id/pictures', function(req, res) {
  var albumId = req.params.id;
  var isShallow = req.query.isShallow;
  
  res.json(data.getPictures(albumId, isShallow));
});

app.post('/albums/:id/pictures', function(req, res) {
  var albumId = req.params.id;

  data.createPicture(albumId, req.body, function(picture) {
    res.json(picture);
  });
});

app.put('/albums/:id/pictures/:pid', function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  
  res.json(data.updatePicture(albumId, pictureId, req.body));
});

app.post('/albums/:id/pictures/:pid/data', function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;

  req.form.complete(function(err, fields, files) {
    if (err) {
      next(err);
    }
    else {
      data.setPictureData(albumId, pictureId, files["files[]"], function(picture) {
        res.json(picture);
      });
    }
  });
});

app.del('/albums/:id/pictures/:pid', function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  
  res.json(data.deletePicture(albumId, pictureId));
});

app.get('/albums/:id/pictures/:pid', function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  
  res.json(data.getPicture(albumId, pictureId));
});

app.del('/albums/:id/pictures/:pid/comments/:cid', function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  var commentId = req.params.cid;
  
  res.json(data.deletePictureComment(albumId, pictureId, commentId));
});

app.get('/albums/:id/pictures/:pid/comments/:cid', function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  var commentId = req.params.cid;
  
  res.json(data.getPictureComment(albumId, pictureId, commentId));
});

app.get('/albums/:id/pictures/:pid/comments', function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  
  res.json(data.getPictureComments(albumId, pictureId));
});

app.post('/albums/:id/pictures/:pid/comments', function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  
  res.json(data.createPictureComment(albumId, pictureId, req.body));
});

app.put('/albums/:id/pictures/:pid/comments/:cid', function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  var commentId = req.params.cid;
  
  res.json(data.updatePictureComment(albumId, pictureId, commentId, req.body));
});

app.get('/dump', function(req, res) {
  res.json(data.getDump());
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
