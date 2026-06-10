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

    async start(audioElement, onMouthUpdate) {
        this.stop();
        this.onMouthUpdate = onMouthUpdate;

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }

        this.source = this.audioContext.createMediaElementSource(audioElement);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        this.isRunning = true;
        this._loop();
    }

    _loop() {
        if (!this.isRunning) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
        }
        const rms = Math.sqrt(sum / bufferLength);

        const SILENCE = 0.02;
        const MAX = 0.35;
        const raw = Math.max(0, Math.min(1, (rms - SILENCE) / (MAX - SILENCE)));

        this.smoothedRMS = this.smoothedRMS * 0.3 + raw * 0.7;
        // Ensure mouth has some movement when speaking
        const mouthOpen = Math.max(raw, this.smoothedRMS * 0.6);

        if (this.onMouthUpdate) {
            this.onMouthUpdate(mouthOpen);
        }

        this.animFrameId = requestAnimationFrame(() => this._loop());
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
