
/**
 * Module dependencies.
 */

var express = require('express');
var form = require('connect-form');
var _ = require('underscore');
var Data = require('./data').Data;
var passport = require('passport');
var util = require('util');
var LocalStrategy = require('passport-local').Strategy;

var app = module.exports = express.createServer();

var userId = 0;
var genUserId = function() {
  return ++userId;
}

var users = [
    { id: genUserId(), username: 'bob', password: 'secret', email: 'bob@example.com' }
  , { id: genUserId(), username: 'joe', password: 'birthday', email: 'joe@example.com' }
  , { id: genUserId(), username: 'itay', password: 'changeme', email: 'itay@neeman.net' }
];

function findById(id, fn) {
  var idx = id - 1;
  if (users[idx]) {
    fn(null, users[idx]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

function findByUsername(username, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});


// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
  function(username, password, done) {  
    // Find the user by username.  If there is no user with the given
    // username, or the password is not correct, set the user to `false` to
    // indicate failure.  Otherwise, return the authenticated `user`.
    findByUsername(username, function(err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (user.password != password) { return done(null, false); }
      return done(null, user);
    })
  }
));

var ensureUser = function(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  var user = {
    id: genUserId(),
    isAnonymous: true
  };
  users.push(user);
  
  return req.login(user, next);
};

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
  //app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(form({keepExtensions: true}));
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(passport.initialize());
  app.use(passport.session());
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

app.get('/', ensureUser, function(req, res){
  res.render('index.html');
});

app.post('/register', function(req, res) {
  req.body = req.body || {};
  var username = req.body.username;
  var password = req.body.password;
  var email = req.body.email;
  var isAnonymous = req.body.isAnonymous || true;
  var name = req.body.name;
    
  if (req.user && !req.user.isAnonymous && isAnonymous) {
    throw new Error("Can't convert registered account to anonymous account");
  }
  
  var user = req.user || {};
  
  // Generate a new ID if we need one
  user.id          = user.id || genUserId();
  
  // Overwrite any data in case this is an update
  user.username    = username || user.username;
  user.password    = password || user.password;
  user.email       = email || user.email;
  
  // Mark whether or not we are anonymous
  user.isAnonymous = isAnonymous;
  
  // Set an appropriate name
  user.name = user.name || name || (user.isAnonymous ? ("User " + user.id) : user.username);
  
  users.push(user);
  req.login(user, function(err) {
    data.remap(req.session.albums, req.session.pictures, req.session.comments, user.id);
    
    if (err) {
      next(err);
    }
    else {
      res.json(user);
    }
  });
});

app.get('/account', ensureUser, function(req, res) {
  res.json(req.user);
});

app.post('/account', ensureUser, function(req, res) {
  User.findById(req.user.id, function(err, user) {
    user.name = req.body.name;
    user.password = req.body.password;
    user.email = req.body.email;
    res.json(req.user);  
  });
  
});

app.put('/account', ensureUser, function(req, res) {
  console.log("Account", req.body);
  res.json(req.user);
});

app.post('/login', 
  passport.authenticate('local'), 
  function(req, res) {
    data.remap(req.session.albums, req.session.pictures, req.session.comments, user.id);
    res.json(req.user);
  }
);

app.get('/albums', ensureUser, function(req, res) {
  res.json(data.getAlbums());
});

app.post('/albums', ensureUser, function(req, res) {
  var album = data.createAlbum(req.body, req.user);
  if (req.user.isAnonymous) {
    req.session.albums = req.session.albums || [];
    req.session.albums.push({album: album.id});
  }
  
  res.json(album);
});

app.get('/albums/:id', ensureUser, function(req, res) {
  var albumId = req.params.id;
  
  res.json(data.getAlbum(albumId));
});

app.put('/albums/:id', ensureUser, function(req, res) {
  var albumId = req.params.id;
  
  res.json(data.updateAlbum(albumId, req.body));
});

app.del('/albums/:id', ensureUser, function(req, res) {
  var albumId = req.params.id;
  
  res.json(data.deleteAlbum(albumId));
});

app.get('/albums/:id/pictures', ensureUser, function(req, res) {
  var albumId = req.params.id;
  var isShallow = req.query.isShallow;
  
  res.json(data.getPictures(albumId, isShallow));
});

app.post('/albums/:id/pictures', ensureUser, function(req, res) {
  var albumId = req.params.id;

  data.createPicture(albumId, req.body, req.user, function(picture) {
    if (req.user.isAnonymous) {
      req.session.pictures = req.session.pictures || [];
      req.session.pictures.push({album: albumId, picture: picture.id});
    }
    res.json(picture);
  });
});

app.put('/albums/:id/pictures/:pid', ensureUser, function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  
  res.json(data.updatePicture(albumId, pictureId, req.body));
});

app.post('/albums/:id/pictures/:pid/data', ensureUser, function(req, res) {
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

app.del('/albums/:id/pictures/:pid', ensureUser, function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  
  res.json(data.deletePicture(albumId, pictureId));
});

app.get('/albums/:id/pictures/:pid', ensureUser, function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  
  res.json(data.getPicture(albumId, pictureId));
});

app.del('/albums/:id/pictures/:pid/comments/:cid', ensureUser, function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  var commentId = req.params.cid;
  
  res.json(data.deletePictureComment(albumId, pictureId, commentId));
});

app.get('/albums/:id/pictures/:pid/comments/:cid', ensureUser, function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  var commentId = req.params.cid;
  
  res.json(data.getPictureComment(albumId, pictureId, commentId));
});

app.get('/albums/:id/pictures/:pid/comments', ensureUser, function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  
  res.json(data.getPictureComments(albumId, pictureId));
});

app.post('/albums/:id/pictures/:pid/comments', ensureUser, function(req, res) {
  var albumId = req.params.id;
  var pictureId = req.params.pid;
  
  var comment = data.createPictureComment(albumId, pictureId, req.body);
  if (req.user.isAnonymous) {
    req.session.comments = req.session.comments || [];
    req.session.comments.push({album: albumId, picture: pictureId, comment: comment.id});
  }
  
  res.json(comment);
});

app.put('/albums/:id/pictures/:pid/comments/:cid', ensureUser, function(req, res) {
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
