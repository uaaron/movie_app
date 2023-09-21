// --- import dependencies ---
const express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    uuid = require('uuid'),
    mongoose = require('mongoose'),
    Models = require('./models.js'),
    bcrypt = require('bcrypt');

const { check, validationResult } = require('express-validator');


// --- Models ---
const Movies = Models.Movie;
const Users = Models.User;

mongoose.connect('mongodb://127.0.0.1:27017/myflix', {useNewUrlParser: true, useUnifiedTopology: true });


// --- CORS funcitonality ---
const cors = require('cors');
let allowedOrigins = ['http://localhost:8080', 'http://testsite.com'];

app.use(cors({
    origin: (origin, callback) => {
        if(!origin) return callback(null, true);
        if(allowedOrigins.indexOf(origin) === -1) {
            let message = 'The CORS policy for this application doesn\'t allow access from origin ' + origin;
            return callback(new Error(message ), false);
        }
        return callback(null, true);
    }
}));



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let auth = require('./auth')(app);

const passport = require('passport');
require('./passport');



// ----------------- ROUTES  --------------------=

// Create User
app.post('/users', 

// Validation logic for request
    [
        check('UserName', 'Username is required').isLength({min:5}),
        check('UserName', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
        check('Password', 'Password is required').not().isEmpty(),
        check('Email', 'Email does not appear to be valid').isEmail()
    ], (req, res) => {

// Check validation for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({ UserName: req.body.UserName })
    .then((user) => {
        if (user) {
            return res.status(400).send(req.body.UserName + ' already exists');
        } else {
            Users
                .create({
                    UserName: req.body.UserName,
                    Password: hashedPassword,
                    Email: req.body.Email,
                    Birthday: req.body.Birthday
                })
                .then((user) =>{res.status(201).json(user) })
            .catch((error) => {
                console.error(error);
                res.status(500).send('Error: ' + error);
            })
        }
    })
    .catch((error) => {
        console.error(error);
        res.status(500).send('Error: ' + error);
    });
});

/*
// Get all users
app.get('/users', (req, res) => {
    Users.find()
        .then((users) => {
            res.status(201).json(users);
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send('Error: ' + err);
        });
});
*/


// Get Specific User
app.get('/users/:UserName', passport.authenticate('jwt', { session: false } ), (req, res) => {
    if (req.user.UserName !== req.params.UserName) {
        return res.status(400).send('Permission denied');
    }

    Users.findOne({ UserName: req.params.UserName })
        .then((user) => {
            if (user) {
                res.status(200).json(user)
            } else {
                res.status(400).send(req.params.UserName + ' not found.')
            }
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send('Error: ' + err);
        });
});



//Update User Name

app.put('/users/:UserName', passport.authenticate('jwt', { session: false }), (req, res) => {
    if (req.user.UserName !== req.params.UserName) {
        return res.status(400).send('Permission denied');
    }

    Users.findOneAndUpdate({ UserName: req.params.UserName }, {
        $set: 
            {
                UserName: req.body.UserName,
                Password: req.body.Password,
                Email: req.body.Email,
                Birthday: req.body.Birthday
            }
    },
    { new: true })
    .then((updatedUser) => {
        res.json(updatedUser);
    })
    .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
    })
});


//Add to fav movies
app.post('/users/:UserName/movies/:MovieID', passport.authenticate('jwt', { session: false }), (req, res) => {
    if (req.user.UserName !== req.params.UserName) {
        return res.status(400).send('Permission denied')
    }

    Users.findOneAndUpdate({ UserName: req.params.UserName }, 
        { $push: { FavoriteMovies: req.params.MovieID }
    },
    { new: true})
    .then((updatedUser) => {
        res.json(updatedUser);
    })
    .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});


//DELETE from fav movies
app.delete('/users/:UserName/movies/:MovieID', passport.authenticate('jwt', { session: false }), (req, res) => {
    if (req.user.UserName !== req.params.UserName) {
        return res.status(400).send('Permission denied')
    }

    Users.findOneAndUpdate( {UserName: req.params.UserName} ,{
        $pull: { FavoriteMovies: req.params.MovieID }
    },
    {new: true})
    .then((updatedUser) => {
        res.json(updatedUser);
    })
    .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});


//DELETE user
app.delete('/users/:UserName', passport.authenticate('jwt', { session: false} ), (req, res) => {
    if (req.user.UserName !== req.params.UserName) {
        return res.status(400).send('Permission denied');
    }

    Users.findOneAndRemove( { UserName: req.params.UserName })
        .then((user) => {
            if (!user) {
                res.status(400).send(req.params.UserName + ' was not found');
            } else {
                res.status(200).send(req.params.UserName + ' was deleted.');
            }
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send('Error: ' + err);
        });
});


//READ list of movies
app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
    Movies.find()
    .then( (movies) => {
        res.status(200).json(movies)
    })
    .catch((err) => {
        console.error(err);
        res.status(500).send('Err: ' + err);
    })
})

//READ specific movie
app.get('/movies/:Title', passport.authenticate('jwt', { session: false }), (req, res) => {
    Movies.findOne( { Title: req.params.Title } )
        .then((movie) => {
            if (movie) {
                res.status(200).json(movie)
            } else {
                res.status(400).send(req.params.Title + ' not found.')
            }
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send('Err: ' + err);
        })
}) 

// READ genre description
app.get('/movies/genre/:genreName', passport.authenticate('jwt', { session: false }), (req, res) => {
    Movies.findOne( { "Genre.Name": req.params.genreName } )
        .then((genre) => {
            if (genre) {
                res.status(200).json(genre)
            } else {
                res.status(400).send(req.params.genreName + ' not found.')
            }
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send('Err: ' + err);
        })
})

// READ director info
app.get('/movies/director/:directorName', (req, res) => {
    Movies.findOne( { "Director.Name": req.params.directorName } )
        .then((director) => {
            if (director) {
                res.status(200).json(director)
            } else {
                res.status(400).send(req.params.directorName + ' not found.')
            }
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send('Err: ' + err);
        })
})

app.use(express.static('public'));


app.listen(8080, () => console.log("listening on 8080"))