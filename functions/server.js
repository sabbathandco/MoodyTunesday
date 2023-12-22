const express = require('express'); // Import express module for server functionality
const mongoose = require('mongoose'); // Import mongoose for MongoDB interactions
const path = require('path'); // Import path module for handling file paths
const app = express(); // Create an Express application

const songs = require('./data/songs.json'); // Import songs data from a JSON file

// MongoDB URI for connecting to the database
const mongoDBUri = 'mongodb+srv://subscriptions:bassandg@moodytunesdays.yawrta5.mongodb.net/?retryWrites=true&w=majority';

// Event listener for successful MongoDB connection
mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});

// Event listener for MongoDB connection errors
mongoose.connection.on('error', (err) => {
    console.error(`Error connecting to MongoDB: ${err}`);
});

app.use(express.static('public')); // Serve static files from the 'public' directory

// Route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html')); // Send index.html as a response
});

// Route for getting a song based on mood
app.get('/song/:mood', (req, res) => {
    const mood = req.params.mood; // Get mood parameter from the URL
    const song = songs[mood]; // Find the song that matches the mood
    if (song) {
        res.json(song); // Send song data as JSON
    } else {
        res.status(404).send('Song not found for this mood'); // Send 404 error if no song found
    }
});

const PORT = process.env.PORT || 3000; // Set the port number
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`); // Start the server and log the port number
});