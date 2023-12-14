const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Correct the path to the songs.json file
const songs = require('./data/songs.json'); // Assuming songs.json is in the data directory

// MongoDB URI - replace with your actual MongoDB URI
const mongoDBUri = 'mongodb+srv://subscriptions:bassandg@moodytunesdays.yawrta5.mongodb.net/?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(mongoDBUri);

mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error(`Error connecting to MongoDB: ${err}`);
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to get song data based on mood
app.get('/song/:mood', (req, res) => {
    const mood = req.params.mood;
    const song = songs[mood];
    if (song) {
        res.json(song);
    } else {
        res.status(404).send('Song not found for this mood');
    }
});

// Endpoint for testing MongoDB database connection
const MoodEntry = require('./models/moodentry');
app.get('/test-db', async (req, res) => {
    try {
        const newEntry = new MoodEntry({
            userId: '12345',
            mood: 'happy',
            timestamp: new Date(),
            songId: 'song123'
        });
        await newEntry.save();
        res.send('Mood entry created');
    } catch (error) {
        console.error('Error with MongoDB operation', error);
        res.status(500).send('Error with MongoDB operation');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
