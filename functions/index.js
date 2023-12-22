
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: true }));

const songs = require('./songs.json');
app.get('/song/:mood', (req, res) => {
    const mood = req.params.mood;
    const song = songs[mood];
    if (song) {
        res.json(song);
    } else {
        res.status(404).send('Song not found for this mood');
    }
});

exports.app = functions.https.onRequest(app);
