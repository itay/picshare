
/**
 * Module dependencies.
 */

var express = require('express');
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

  res.json(data.createPicture(albumId, req.body));
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

app.get('/albums/:id/metadata', function(req, res) {
  var albumId = req.params.id;
  
  res.json(data.getPicturesMetadata(albumId));
});

app.del('/albums/:id/pictures/:pid/metadata', function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  
  res.json(data.deletePictureMetadata(albumId, pictureId));
});

app.get('/albums/:id/pictures/:pid/metadata', function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  
  res.json(data.getPictureMetadata(albumId, pictureId));
});

app.put('/albums/:id/pictures/:pid/metadata', function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  
  res.json(data.updatePictureMetadata(albumId, pictureId, req.body));
});

app.get('/dump', function(req, res) {
  res.json(data.getDump());
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
