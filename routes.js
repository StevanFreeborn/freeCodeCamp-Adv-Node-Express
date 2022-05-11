const passport = require('passport');
const bcrypt = require('bcrypt');

const ensureAuthenticated = (req, res, next) => {

    if (req.isAuthenticated()) {
        return next();
    }

    res.redirect('/');

}

module.exports = function (app, myDataBase) {

    app.route('/').get((req, res) => {
        res.render('pug/index', {
            title: 'Connected to Database',
            message: 'Please login',
            showLogin: true,
            showRegistration: true,
            showSocialAuth: true
        });
    });

    app.route('/login').post(
        passport.authenticate('local', { failureRedirect: '/' }),
        (req, res) => {
            res.redirect('/profile')
        }
    );

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

                // hash user's entered password before storing in database.
                const hashedPassword = bcrypt.hashSync(req.body.password, 12);

                myDataBase.insertOne({
                    name: req.body.name,
                    username: req.body.username,
                    password: hashedPassword
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
        }
    );

    app.route('/auth/github').get(passport.authenticate('github'));

    app.route('/auth/github/callback').get(passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
        req.session.user_id = req.user.id;
        res.redirect('/chat');
    });

    app.route('/chat').get(ensureAuthenticated, (req, res) => {
        res.render('pug/chat', { user: req.user });
    });
    
    app.use((req, res, next) => {
        res.status(404)
            .type('text')
            .send('Not Found');
    });
}