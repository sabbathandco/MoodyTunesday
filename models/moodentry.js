const mongoose = require('mongoose');

const moodEntrySchema = new mongoose.Schema({
    userId: String, // Changed from ObjectId to String
    mood: String,
    timestamp: { type: Date, default: Date.now },
    songId: String,
});

const MoodEntry = mongoose.model('MoodEntry', moodEntrySchema);
module.exports = MoodEntry;
