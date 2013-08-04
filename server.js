//declare and load dependancies
var express = require('express')
, app = express()
, MemStore = express.session.MemoryStore
, Parse = require('node-parse-api').Parse
, fs = require('fs')
, hbs = require('hbs');

//load Parse application, master, and rest api keys
var APP_ID = "<YOUR APP ID>"
, MASTER_KEY = "<YOUR MASTER KEY>"
, parse = new Parse(APP_ID, MASTER_KEY);

//configure the Express web framework for all environments
app.configure(function () {
  app.use(express.static(__dirname + '/static'));
  app.use(express.logger('dev')); /* 'default', 'short', 'tiny', 'dev' */
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ secret:'secret_key', store: MemStore({
      reapInterval: 6000 * 10
   })}));
});

//We'll use a 'views' directory for hbs files
app.set('views', __dirname + '/views');
app.set("view engine", "hbs");

//helper function to reduce boilerplate
function requiresLogin(req, res, next){
  if(req.session.user){
    next();
  }else{
    res.redirect('/signin');
 }
};

//get requests
app.get('/', requiresLogin, function(req, res){
  var username = req.session.user.username;
  res.render("index", {name: username} );
});

app.get('/signin', function(req, res){
  res.render('signin', {redir: req.query.redir});
});

app.get('/sessions/destroy', function(req, res){
  delete req.session.user;
  res.redirect('/sessions')
});

//post requests
app.post('/sessions', function(req, res){
  parse.getUser(req.body.username, req.body.password, function(err, user){
    if (user){
      req.session.user = user;
      res.render('index');
  } else {
    res.render('signin', {redir:req.body.redir})
   }  
  })
});

app.post('/users', function(req, res){
  username = req.body.username;
  password = req.body.password;
  password_confirm = req.body.password_confirm;
  email = req.body.email;
  if (password === password_confirm){
    parse.insert('_User', {"username": username, "password": password, "email": email}, function (err, resp) {
      if (resp){
        parse.getUser(username, password, function(errr, user){
          if (user){
            req.session.user = user;
            res.render("index");
           } else {
            console.log('errr' + " " + errr)
            res.render('signin');
          }  
        })
      } else {
        console.log('err' + " " + err);
        res.render('signin');
      }
  });
 } else {
  res.render("signin");
 }
});

app.post('/terms', function(req, res){
  data = req.body.specialRequest;
  if (data.length <= 405831){
    var time = new Date().getTime();
    filename = req.session.user.objectId + '_' + time;
    user_id = req.session.user.objectId;
    user_name = req.session.user.username;
    parse.getFileByUser(user_id, 'Terms', function (err, respo){
      if (respo.results.length === 0){
        parse.insertFile(filename, data, 'txt', function(errr, resp){
          fileLink = resp.url;
          parse_name = resp.name;
            parse.insert('Terms', {"user": req.session.user.objectId, "link": fileLink, "orig_name": filename, "parse_name": parse_name}, function (errrr, respon) {
                  res.render("index", {name: user_name} );
        });
      });
      } else {
        object_id = respo.results[0].objectId
        parse.delete('Terms', object_id, function(err, resp){
        parse.insertFile(filename, data, 'txt', function(errr, respo){
          fileLink = respo.url;
          parse_name = respo.name;
            parse.insert('Terms', {"user": req.session.user.objectId, "link": fileLink, "orig_name": filename, "parse_name": parse_name}, function (errrr, respon){
                  res.render("index", {name: user_name} );
           });
        });
      })
      }
   });
  }else{
    res.render('index', {redir:req.body.redir});
  }
}); 

//declare a port and ask Node.js to listen on that port.  The 'process.env.PORT' variable is necessary if you are deploying to a BAAS like Heroku 
var port = process.env.PORT || 4000;
app.listen(port);