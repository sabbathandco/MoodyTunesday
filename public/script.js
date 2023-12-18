let currentMood = null;
let moodDetectionTimestamp = null;
let songPlaybackTimestamp = null;
let isSongPlaying = false;
let audio = new Audio();
let canvas;
let displaySize;

const emotionDetectionPeriod = 3000; // 3 seconds
const songPlaybackDuration = 30000; // 30 seconds
const countdownStart = 10000; // 10 seconds before the song ends

const video = document.getElementById('video');
const sensingMessage = document.getElementById('sensingMessage');
const promptMessage = document.getElementById('promptMessage');
const countdownMessage = document.getElementById('countdownMessage');
const songInfo = {
    title: document.getElementById('songTitle'),
    artwork: document.getElementById('songArtwork'),
    mood: document.getElementById('detectedMood')
};

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo);

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

function updateDisplaySize() {
    displaySize = { width: video.offsetWidth, height: video.offsetHeight };
    if (canvas) {
        faceapi.matchDimensions(canvas, displaySize);
    }
}

video.addEventListener('play', () => {
    const videoContainer = document.getElementById('videoContainer');
    if (!canvas) {
        canvas = faceapi.createCanvasFromMedia(video);
        videoContainer.appendChild(canvas);
    }
    updateDisplaySize();

    setInterval(async () => {
        if (isSongPlaying && (Date.now() - songPlaybackTimestamp) >= songPlaybackDuration) {
            stopSong();
            resetMoodDetection();
        }

        if (!isSongPlaying && (Date.now() - moodDetectionTimestamp) >= emotionDetectionPeriod) {
            if (sensingMessage) {
                sensingMessage.style.display = 'none';
            }
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

            currentMood = determineDominantMood(resizedDetections);
            songInfo.mood.textContent = `Detected Mood: ${currentMood || 'None'}`; // Update the mood display
            handleEmotionDetection(currentMood);
        }

        if (isSongPlaying && (Date.now() - songPlaybackTimestamp) >= (songPlaybackDuration - countdownStart)) {
            let remainingTime = Math.ceil((songPlaybackDuration - (Date.now() - songPlaybackTimestamp)) / 1000);
            countdownMessage.textContent = `Will capture feels again in ${remainingTime}...`;
        }
    }, 100);
});

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

function handleEmotionDetection(mood) {
    if (mood === 'neutral') {
        promptUserForEmotion();
    } else {
        updateSongInfo(mood);
    }
}

function promptUserForEmotion() {
    promptMessage.textContent = "Music can only play if you express emotion. Please express an emotion!";
    promptMessage.style.display = 'block';
    setTimeout(() => {
        promptMessage.style.display = 'none';
        resetMoodDetection();
    }, 5000);
}

function updateSongInfo(mood) {
    if (!mood) {
        // Handle no mood or 'neutral' mood
        return;
    }
    if (audio && !audio.paused) {
        return;
    }
    fetch(`/song/${mood}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Song not found for this mood');
            }
            return response.json();
        })
        .then(song => {
            audio.src = song.url;
            audio.play();
            songPlaybackTimestamp = Date.now();
            isSongPlaying = true;

            songInfo.title.textContent = `${song.artist} - ${song.title}`;
            songInfo.artwork.src = song.artwork;

            const background = document.getElementById('animatedBackground');
            background.className = `animated-background ${mood}`;
        })
        .catch(error => {
            console.error('Error fetching song info:', error);
            // Handle the case when a song is not found for the detected mood
            promptMessage.textContent = "No song found for this mood, try expressing a different emotion!";
            promptMessage.style.display = 'block';
            setTimeout(() => {
                promptMessage.style.display = 'none';
                resetMoodDetection();
            }, 5000);
        });
}

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

function resetMoodDetection() {
    moodDetectionTimestamp = Date.now();
    currentMood = null;
    if (sensingMessage) {
        sensingMessage.style.display = 'block';
    }
}
