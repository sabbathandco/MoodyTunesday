const express = require('express');
const mongoose = require('mongoose'); // Add this line
const path = require('path');
const app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Replace with your actual MongoDB URI
const mongoDBUri = 'mongodb+srv://subscriptions:bassandg@moodytunesdays.yawrta5.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(mongoDBUri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error(`Error connecting to MongoDB: ${err}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

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

