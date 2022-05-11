'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const passport = require('passport');
const myDB = require('./connection');
const routes = require('./routes');
const auth = require('./auth');
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
  store: store
}));

app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'pug');

myDB(async client => {
  const myDataBase = await client.db('advNodeExpress').collection('users');

  let currentUsers = 0;

  io.on('connection', socket => {
    console.log('A user has connected');
    currentUsers++;
    io.emit('user count', currentUsers);
  });

  auth(app, myDataBase);
  routes(app,myDataBase);

}).catch(err => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: err, message: 'Unable to login' });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
