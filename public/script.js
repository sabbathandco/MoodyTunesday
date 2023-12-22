// Define variables for managing mood, timestamps, song playback state, and media elements
let currentMood = null;
let moodDetectionTimestamp = null;
let songPlaybackTimestamp = null;
let isSongPlaying = false;
let audio = new Audio();
let canvas;
let displaySize;

// Constants for time durations and countdown
const emotionDetectionPeriod = 3000; // 3 seconds
const songPlaybackDuration = 10000; // 10 seconds
const countdownStart = 5000; // 5 seconds before the song ends

// Get HTML elements for video and messages
const video = document.getElementById('video');
const sensingMessage = document.getElementById('sensingMessage');
const promptMessage = document.getElementById('promptMessage');
const countdownMessage = document.getElementById('countdownMessage');
const songInfo = {
    title: document.getElementById('songTitle'),
    artwork: document.getElementById('songArtwork'),
    mood: document.getElementById('detectedMood')
};

// Add Firebase configuration
const firebaseConfig = {
    // Your Firebase configuration
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
// Load face detection models and start the video once loaded
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo);

// Function to start the video stream and update the display size
function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                updateDisplaySize();
            };
        })
        .catch(err => console.error(err));
}

// Update the display size for face detection
function updateDisplaySize() {
    displaySize = { width: video.offsetWidth, height: video.offsetHeight };
    if (canvas) {
        faceapi.matchDimensions(canvas, displaySize);
    }
}

// Add an event listener to the video for face detection and mood analysis
video.addEventListener('play', () => {
    const videoContainer = document.getElementById('videoContainer');
    if (!canvas) {
        canvas = faceapi.createCanvasFromMedia(video);
        videoContainer.appendChild(canvas);
    }
    updateDisplaySize();

    setInterval(async () => {
        // Stop song if it's playing longer than its duration
        if (isSongPlaying && (Date.now() - songPlaybackTimestamp) >= songPlaybackDuration) {
            stopSong();
            resetMoodDetection();
        }

        // Detect mood every emotionDetectionPeriod if no song is playing
        if (!isSongPlaying && (Date.now() - moodDetectionTimestamp) >= emotionDetectionPeriod) {
            if (sensingMessage) {
                sensingMessage.style.display = 'none';
            }
            // Detect faces and expressions
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            // Clear the canvas and draw detections
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

            // Determine and handle the dominant mood
            currentMood = determineDominantMood(resizedDetections);
            songInfo.mood.textContent = `Detected Mood: ${currentMood || 'None'}`; // Update the mood display
            handleEmotionDetection(currentMood);
        }

        // Update countdown message when song nears its end
        if (isSongPlaying && (Date.now() - songPlaybackTimestamp) >= (songPlaybackDuration - countdownStart)) {
            let remainingTime = Math.ceil((songPlaybackDuration - (Date.now() - songPlaybackTimestamp)) / 1000);
            countdownMessage.textContent = `Will capture feels again in ${remainingTime}...`;
        }
    }, 100);
});

// Function to determine the dominant mood from face detections
function determineDominantMood(detections) {
    if (!detections.length || !detections[0].expressions) {
        return null;
    }
    let maxEmotion = '';
    let maxScore = 0;
    for (const [emotion, score] of Object.entries(detections[0].expressions)) {
        if (score > maxScore) {
            maxEmotion = emotion;
            maxScore = score;
        }
    }
    return maxEmotion;
}

// Handle the detected mood and prompt user if mood is neutral
function handleEmotionDetection(mood) {
    if (mood === 'neutral') {
        promptUserForEmotion();
    } else {
        updateSongInfo(mood);
    }
}

// Prompt the user to express an emotion if mood is neutral
function promptUserForEmotion() {
    promptMessage.textContent = "Music can only play if you express emotion for 3 secs. Please express an emotion!";
    promptMessage.style.display = 'block';
    setTimeout(() => {
        promptMessage.style.display = 'none';
        resetMoodDetection();
    }, 5000);
}

// Update song information based on mood and start playback
function updateSongInfo(mood) {
    if (!mood || (audio && !audio.paused)) {
        return;
    }

    fetch(`https://us-central1-moody-tunesdays.cloudfunctions.net/app/song/${mood}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Song not found for this mood');
            }
            return response.json();
        })
        .then(song => {
            audio.src = song.url; // URL from Firebase Storage
            audio.play();
            songPlaybackTimestamp = Date.now();
            isSongPlaying = true;

            songInfo.title.textContent = `${song.artist} - ${song.title}`;
            songInfo.artwork.src = song.artwork; // URL from Firebase Storage

            const background = document.getElementById('animatedBackground');
            background.className = `animated-background ${mood}`;
        })
        .catch(error => {
            console.error('Error fetching song info:', error);
            promptUserForNoSongFound();
        });
}

function promptUserForNoSongFound() {
    promptMessage.textContent = "No song found for this mood, try expressing a different emotion!";
    promptMessage.style.display = 'block';
    setTimeout(() => {
        promptMessage.style.display = 'none';
        resetMoodDetection();
    }, 5000);
}

// Function to stop song playback
function stopSong() {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        isSongPlaying = false;
        currentMood = null;
        if (countdownMessage) {
            countdownMessage.textContent = '';
        }
    }
}

// Reset mood detection state
function resetMoodDetection() {
    moodDetectionTimestamp = Date.now();
    currentMood = null;
    if (sensingMessage) {
        sensingMessage.style.display = 'block';
    }
}
