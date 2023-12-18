const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const songs = require('./data/songs.json');

const mongoDBUri = 'mongodb+srv://subscriptions:bassandg@moodytunesdays.yawrta5.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(mongoDBUri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error(`Error connecting to MongoDB: ${err}`);
});

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/song/:mood', (req, res) => {
    const mood = req.params.mood;
    const song = songs[mood];
    if (song) {
        res.json(song);
    } else {
        res.status(404).send('Song not found for this mood');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
