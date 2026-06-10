class App {
    constructor() {
        this.pixiApp = null;
        this.model = null;
        this.ws = null;
        this.lipSync = null;
        this.isProcessing = false;
        this.currentAiMsg = null;
    }

    async init() {
        this._bindUI();

        // Init PixiJS with premultipliedAlpha=false for correct Live2D rendering
        const canvas = document.getElementById("live2dCanvas");
        const stage = document.getElementById("live2dStage");
        const width = stage.clientWidth;
        const height = stage.clientHeight;

        // Force premultipliedAlpha: false on WebGL context creation
        const origGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, attrs) {
            if (type === "webgl" || type === "webgl2") {
                attrs = Object.assign({}, attrs || {}, { premultipliedAlpha: false });
            }
            return origGetContext.call(this, type, attrs);
        };

        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.LINEAR;

        this.pixiApp = new PIXI.Application({
            view: canvas,
            width: width,
            height: height,
            transparent: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        HTMLCanvasElement.prototype.getContext = origGetContext;

        // Load Live2D model
        try {
            this.setStatus("loading", "加载模型...");
            this.model = await PIXI.live2d.Live2DModel.from(
                "/live2d/models/haru_greeter_t03.model3.json"
            );
            this.model.scale.set(0.22);
            this.model.x = width / 2;
            this.model.y = height * 0.55;
            this.model.anchor.set(0.5, 0.5);
            this.pixiApp.stage.addChild(this.model);

            this.setStatus("idle", "在线");
        } catch (e) {
            console.error("Live2D load failed:", e);
            this.setStatus("error", "模型加载失败");
            return;
        }

        // Lip sync
        this.lipSync = new LipSync();

        // WebSocket
        this.ws = new WSClient("ws://" + window.location.host + "/ws");
        this.ws.callbacks.onToken = (t) => this._onToken(t);
        this.ws.callbacks.onDone = (text) => this._onDone(text);
        this.ws.callbacks.onTtsReady = (data) => this._onTtsReady(data);
        this.ws.callbacks.onStatus = (s) => this._onStatus(s);
        this.ws.callbacks.onError = (msg) => this._onError(msg);
        this.ws.callbacks.onReady = () => this._onReady();
        this.ws.callbacks.onOpen = () => this.setStatus("idle", "在线");
        this.ws.callbacks.onClose = () => this.setStatus("error", "连接断开");
        this.ws.connect();

        // Resize handler
        window.addEventListener("resize", () => this._resize());

        // Keyboard shortcut
        document.addEventListener("keydown", (e) => {
            if (e.key === "Enter") this._sendMessage();
        });
    }

    _bindUI() {
        document.getElementById("btnSend").addEventListener("click", () => this._sendMessage());
        document.getElementById("btnMic").addEventListener("click", () => this._toggleMic());
    }

    _sendMessage() {
        if (this.isProcessing) return;
        const input = document.getElementById("inputText");
        const text = input.value.trim();
        if (!text) return;

        input.value = "";
        this._addMessage(text, "user");
        this.isProcessing = true;
        this.currentAiMsg = this._addMessage("", "ai", true);

        const btn = document.getElementById("btnSend");
        btn.disabled = true;

        this.ws.sendQuery(text);
    }

    _onToken(token) {
        if (this.currentAiMsg) {
            this.currentAiMsg.textContent += token;
            this._scrollChat();
        }
    }

    _onDone(fullText) {
        if (this.currentAiMsg) {
            this.currentAiMsg.classList.remove("streaming");
            this.currentAiMsg.textContent = fullText;
        }
    }

    _onTtsReady(data) {
        this.setStatus("speaking", "说话中...");
        const audio = new Audio(data.audio_url);
        audio.addEventListener("canplaythrough", () => {
            audio.play().catch((e) => console.warn("Audio play:", e));
        });
        this.lipSync.start(audio, (mouth) => {
            if (this.model) {
                const core = this.model.internalModel.coreModel;
                core.setParameterValueById("ParamMouthOpenY", mouth);
            }
        });
        audio.addEventListener("ended", () => {
            this.lipSync.stop();
            this.setStatus("idle", "在线");
        });
    }

    _onStatus(state) {
        const map = {
            thinking: ["thinking", "思考中..."],
            speaking: ["speaking", "生成语音..."],
        };
        const [dotClass, text] = map[state] || ["idle", "在线"];
        this.setStatus(dotClass, text);
    }

    _onError(msg) {
        this.setStatus("idle", "在线");
        if (this.currentAiMsg) {
            this.currentAiMsg.textContent = "抱歉，出了点问题：" + msg;
            this.currentAiMsg.classList.remove("streaming");
        }
        this._onReady();
    }

    _onReady() {
        this.isProcessing = false;
        const btn = document.getElementById("btnSend");
        btn.disabled = false;
        document.getElementById("inputText").focus();
    }

    setStatus(dotClass, text) {
        const dot = document.getElementById("statusDot");
        const txt = document.getElementById("statusText");
        dot.className = "dot " + dotClass;
        txt.textContent = text;
    }

    _addMessage(text, role, streaming = false) {
        const container = document.getElementById("chatMessages");
        const div = document.createElement("div");
        div.className = "message " + role;
        if (streaming) div.classList.add("streaming");
        div.textContent = text;
        container.appendChild(div);
        this._scrollChat();
        return div;
    }

    _scrollChat() {
        const container = document.getElementById("chatMessages");
        container.scrollTop = container.scrollHeight;
    }

    _resize() {
        const stage = document.getElementById("live2dStage");
        const w = stage.clientWidth;
        const h = stage.clientHeight;
        if (this.pixiApp) {
            this.pixiApp.renderer.resize(w, h);
            if (this.model) {
                this.model.x = w / 2;
                this.model.y = h * 0.55;
            }
        }
    }

    _toggleMic() {
        const btn = document.getElementById("btnMic");
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("您的浏览器不支持语音识别，请使用最新版Chrome浏览器");
            return;
        }

        if (this._recognition) {
            this._recognition.stop();
            this._recognition = null;
            btn.classList.remove("listening");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "zh-CN";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        btn.classList.add("listening");
        recognition.start();
        this._recognition = recognition;

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            document.getElementById("inputText").value = text;
            this._sendMessage();
        };

        recognition.onerror = () => {
            btn.classList.remove("listening");
            this._recognition = null;
        };

        recognition.onend = () => {
            btn.classList.remove("listening");
            this._recognition = null;
        };
    }
}

// Bootstrap
window.addEventListener("DOMContentLoaded", () => {
    const app = new App();
    app.init();
});
