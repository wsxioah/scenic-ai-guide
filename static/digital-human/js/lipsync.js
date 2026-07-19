class LipSync {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.animFrameId = null;
        this.onMouthUpdate = null;
        this.smoothedRMS = 0;
        this.isRunning = false;
    }

    async start(audioElement, onMouthUpdate, options) {
        this.stop();
        this.onMouthUpdate = onMouthUpdate;
        var muted = options && options.muted;

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Force resume — essential for Android WebView
        if (this.audioContext.state === "suspended") {
            try {
                await this.audioContext.resume();
                console.log("[LipSync] AudioContext resumed, state=" + this.audioContext.state);
            } catch(e) {
                console.warn("[LipSync] AudioContext resume failed:", e.message);
            }
        }

        this.source = this.audioContext.createMediaElementSource(audioElement);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 128;
        this.source.connect(this.analyser);

        // Only connect to destination if NOT muted (RN handles audio playback separately)
        if (!muted) {
            this.analyser.connect(this.audioContext.destination);
        }

        this.isRunning = true;
        this._loop();
    }

    _loop() {
        if (!this.isRunning) return;

        var bufferLength = this.analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);

        var sum = 0;
        for (var i = 0; i < bufferLength; i++) {
            var v = (dataArray[i] - 128) / 128;
            sum += v * v;
        }
        var rms = Math.sqrt(sum / bufferLength);

        var SILENCE = 0.02;
        var MAX = 0.35;
        var raw = Math.max(0, Math.min(1, (rms - SILENCE) / (MAX - SILENCE)));

        this.smoothedRMS = this.smoothedRMS * 0.1 + raw * 0.9;
        var mouthOpen = Math.max(raw, this.smoothedRMS * 0.6);

        if (this.onMouthUpdate) {
            this.onMouthUpdate(mouthOpen);
        }

        this.animFrameId = requestAnimationFrame(function() { this._loop(); }.bind(this));
    }

    stop() {
        this.isRunning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        this.smoothedRMS = 0;
        if (this.onMouthUpdate) {
            this.onMouthUpdate(0);
        }
    }
}
