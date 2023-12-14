let currentMood = null;
let moodDetectionTimestamp = null;
let songPlaybackTimestamp = null;
let isSongPlaying = false;
let audio = new Audio();

const emotionDetectionPeriod = 3000; // 3 seconds
const songPlaybackDuration = 30000; // 30 seconds
const countdownStart = 10000; // Start countdown 10 seconds before the song ends

const video = document.getElementById('video');
const sensingMessage = document.getElementById('sensingMessage');
const countdownMessage = document.getElementById('countdownMessage');
const songInfo = {
    title: document.getElementById('songTitle'),
    artist: document.getElementById('songArtist'),
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
        .then(stream => video.srcObject = stream)
        .catch(err => console.error(err));
    moodDetectionTimestamp = Date.now();
    if (sensingMessage) {
        sensingMessage.style.display = 'block';
    }
}

video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

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

            if (!currentMood) {
                currentMood = determineDominantMood(resizedDetections);
                songInfo.mood.textContent = `Detected Mood: ${currentMood}`;
                updateSongInfo(currentMood);
                songPlaybackTimestamp = Date.now();
            }
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

function updateSongInfo(mood) {
    if (audio && !audio.paused) {
        return;
    }
    fetch(`/song/${mood}`)
        .then(response => response.json())
        .then(song => {
            audio.src = song.url;
            audio.play();
            songPlaybackTimestamp = Date.now();
            isSongPlaying = true;

            songInfo.title.textContent = `${song.artist} - ${song.title}`;
            songInfo.artist.textContent = song.artist;
            songInfo.artwork.src = song.artwork;

            setTimeout(stopSong, songPlaybackDuration);
        })
        .catch(error => console.error('Error fetching song info:', error));
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