const express = require('express'),
    morgan = require('morgan'),
    fs = require('fs'),
    path = require('path');

const app = express();

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'})

let topMovies = [
    {
        title: 'Lord of the Rings: The Fellowship of the Ring'
    },
    {
        title: 'Lord of the Rings: The Two Towers'
    },
    {
        title: 'Lord of the Rings: The Return of the King'
    },
    {
        title: 'Harry Potter and the Sorcerer\'s Stone',
    },
    {
        title: 'Troy'
    },
    {
        title: 'How the Grinch Stole Christmas'
    },
    {
        title: 'Inglorious Bastards'
    },
    {
        title: 'Snatch'
    },
    {
        title: 'Men in Black'
    },
    {
        title: 'Wild Wild West'
    }
];

app.use(morgan('combined', {stream: accessLogStream}));

// GET requests
app.get('/movies', (req, res) => {
    res.json(topMovies);
})

app.get('/', (req, res) => {
    res.send('These are the best movies  .');
})

app.use(express.static('public'));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
})

app.listen(8080, () => {
    console.log('Your app is listening on port 8080.');
});