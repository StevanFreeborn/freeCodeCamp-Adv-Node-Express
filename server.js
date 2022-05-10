'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const ObjectID = require('mongodb').ObjectID;
const myDB = require('./connection');
const LocalStrategy = require('passport-local');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const app = express();

fccTesting(app); 

app.use('/public', express.static(process.cwd() + '/public'));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'pug');

const ensureAuthenticated = (req, res, next) => {

  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect('/');

}

myDB(async client => {
  const myDataBase = await client.db('advNodeExpress').collection('users');

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    });
  });

  passport.use(new LocalStrategy(
    (username, password, done) => {
      myDataBase.findOne({ username: username}, (err, user) => {
        console.log(`User ${username} attempted to log in.`);
        
        if (err) return done(err);
        if (!user) return done(null, false);
        if (password != user.password) return done(null, false);
        return done(null, user);
      });
    }
  ));
  
  app.route('/').get((req, res) => {
    res.render('pug/index', {
      title: 'Connected to Database', 
      message: 'Please login',
      showLogin: true,
      showRegistration: true
    });
  });

  app.route('/login').post(
    passport.authenticate('local', { failureRedirect: '/' }), 
    (req, res) => {
      res.redirect('/profile')
  });

  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render('pug/profile', { username: req.user.username });
  });

  app.route('/logout').get((req, res) => {
    req.logout();
    res.redirect('/');
  });

  app.route('/register').post((req, res, next) => {

    // see if user already exists
    myDataBase.findOne({ username: req.body.username }, (err, user) => {
      if (err) {
        next(err);
      }
      // if user already exists redirect to index
      else if (user) {
        res.redirect('/');
      }
      // if user does not exist create the user
      else {
        myDataBase.insertOne({
          username: req.body.username,
          password: req.body.password
        }, (err, doc) => {

          if (err) {
            res.redirect('/');
          }
          // if user created successfully get
          // user from the ops array on the
          // result object. See http://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#%7EinsertOneWriteOpResult.
          else {
            next(null, doc.ops[0]);
          }

        });

      }

    });

  },
  // attempt to authenticate user
  // if authentication fails redirect to index
  // if authentication succeds redirect to profile
  passport.authenticate('local', { failureRedirect: '/' }),
  (req, res, next) => {
    res.redirect('/profile');
  });
  
  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not Found');
  });

}).catch(err => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: err, message: 'Unable to login' });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
