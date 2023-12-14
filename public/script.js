let currentMood = null;
let moodDetectionTimestamp = null;

const video = document.getElementById('video');
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
    navigator.getUserMedia(
        { video: {} },
        stream => video.srcObject = stream,
        err => console.error(err)
    );
}

video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        const detectedMood = determineDominantMood(resizedDetections);
        if (detectedMood && detectedMood !== currentMood) {
            moodDetectionTimestamp = Date.now();
            currentMood = detectedMood;
            songInfo.mood.textContent = `Detected Mood: ${detectedMood}`;
            updateSongInfo(detectedMood);
        }

        if (currentMood && Date.now() - moodDetectionTimestamp > 30000) {
            currentMood = null;
            songInfo.mood.textContent = 'Detecting mood...';
            // Restart mood detection process
        }
    }, 100);
});

function determineDominantMood(detections) {
    if (!detections.length) return null;
    const emotions = detections[0].expressions;
    let maxEmotion = '';
    let maxScore = 0;
    for (const [emotion, score] of Object.entries(emotions)) {
        if (score > maxScore) {
            maxEmotion = emotion;
            maxScore = score;
        }
    }
    return maxEmotion;
}

function updateSongInfo(mood) {
    fetch(`/song/${mood}`)
        .then(response => response.json())
        .then(song => {
            const audio = new Audio(song.url);
            audio.play();
            songInfo.title.textContent = `${song.artist} - ${song.title}`;
            songInfo.artist.textContent = song.artist;
            songInfo.artwork.src = song.artwork;
        })
        .catch(error => console.error('Error fetching song info:', error));
}
