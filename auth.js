const passport = require('passport');
const LocalStrategy = require('passport-local');
const ObjectID = require('mongodb').ObjectID;

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

}