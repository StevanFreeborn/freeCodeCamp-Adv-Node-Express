'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const passport = require('passport');
const myDB = require('./connection');
const routes = require('./routes');
const auth = require('./auth');
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');

const fccTesting = require('./freeCodeCamp/fcctesting.js');

const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);

fccTesting(app); 

app.use('/public', express.static(process.cwd() + '/public'));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

const store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  databaseName: 'advNodeExpress',
  collection: 'sessions'
}, err => {
  if (err) console.log(err)
});

store.on('error', err => console.log(err));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  key: 'express.sid',
  store: store
}));

app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'pug');

myDB(async client => {
  const myDataBase = await client.db('advNodeExpress').collection('users');

  auth(app, myDataBase);
  routes(app,myDataBase);

  let currentUsers = 0;

  const onAuthorizeSuccess = (data, accept) => {
    console.log('successful connection to socket.io');
    accept(null, true);
  }

  const onAuthorizeFail = (data, message, error, accept) => {
    if (err) throw new Error(message);
    console.log('failed connection to socket.io:', message);
    accept(null, false);
  }

  io.use(
    passportSocketIo.authorize({
      cookieParser: cookieParser,
      key: 'express.sid',
      secret: process.env.SESSION_SECRET,
      store: store,
      success: onAuthorizeSuccess,
      fail: onAuthorizeFail
    })
  );

  io.on('connection', socket => {
    console.log(`user ${socket.request.user.name} connected`);
    ++currentUsers;
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: true
    });

    socket.on('disconnect', () => {

      console.log(`user ${socket.request.user.name} disconnected`);
      --currentUsers;
      io.emit('user', {
        name: socket.request.user.name,
        currentUsers,
        connected: false
      });

    });

    socket.on('chat message', (message) => {

      io.emit('chat message', {
        name: socket.request.user.name,
        message
      });

    });

  });

}).catch(err => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: err, message: 'Unable to login' });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
