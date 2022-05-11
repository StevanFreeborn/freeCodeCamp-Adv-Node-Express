require('dotenv').config();
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const ObjectID = require('mongodb').ObjectID;
const GitHubStrategy = require('passport-github');


module.exports = function (app, myDataBase) {

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
            myDataBase.findOne({ username: username }, (err, user) => {
                console.log(`User ${username} attempted to log in.`);

                if (err) return done(err);
                if (!user) return done(null, false);

                // passwords are stored after being hashed
                // so when checking if entered password is
                // the same as the stored password
                // need hash the entered password and then compare
                // to the alreaday hashed and stored password.
                if (!bcrypt.compareSync(password, user.password)) return done(null, false);

                return done(null, user);
            });
        }
    ));

    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: 'https://freecodecampadvnodeexpress.herokuapp.com/auth/github/callback'
    },
    (accessToken, refreshToken, profile, cb) => {
        
        myDataBase.findOneAndUpdate(
            // filter to locate user based on id value
            {id: profile.id},
            {
                // if operation results in document being created
                // set these fields in the new document
                $setOnInsert: {
                    id: profile.id,
                    name: profile.displayName || 'John Doe',
                    photo: profile.photos[0].value || '',
                    email: Array.isArray(profile.emails) ?
                    profile.emails[0].value :
                    'No public email',
                    created_on: new Date(),
                    provider: profile.provider || ''
                },
                // document created or updated will
                // have last_login set to current date
                $set: {
                    last_login: new Date()
                },
                // document created or updated will
                // have login_count incremented
                $inc: {
                    login_count: 1
                }
            },
            // create a new document if no document matches the filter
            // or update a single document that matches filter.
            // if update of a single document occurs will will
            // return the updated version of that document not the
            // original version
            { upsert: true, new: true},
            (err, doc) => {
                return cb(null, doc.value);
            }
        );
    }
    ));

}