class WSClient {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectDelay = 1000;
        this.maxDelay = 30000;
        this.currentDelay = this.reconnectDelay;

        this.callbacks = {
            onToken: null,
            onDone: null,
            onTtsReady: null,
            onStatus: null,
            onError: null,
            onReady: null,
            onOpen: null,
            onClose: null,
        };
    }

    connect() {
        try {
            this.ws = new WebSocket(this.url);
        } catch (e) {
            this._scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            this.currentDelay = this.reconnectDelay;
            if (this.callbacks.onOpen) this.callbacks.onOpen();
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                switch (msg.type) {
                    case "llm_token":
                        if (this.callbacks.onToken) this.callbacks.onToken(msg.token);
                        break;
                    case "llm_done":
                        if (this.callbacks.onDone) this.callbacks.onDone(msg.full_text);
                        break;
                    case "tts_ready":
                        if (this.callbacks.onTtsReady) this.callbacks.onTtsReady(msg);
                        break;
                    case "status":
                        if (this.callbacks.onStatus) this.callbacks.onStatus(msg.state);
                        break;
                    case "error":
                        if (this.callbacks.onError) this.callbacks.onError(msg.message);
                        break;
                    case "ready":
                        if (this.callbacks.onReady) this.callbacks.onReady();
                        break;
                }
            } catch (e) {
                console.error("WS parse error:", e);
            }
        };

        this.ws.onclose = () => {
            if (this.callbacks.onClose) this.callbacks.onClose();
            this._scheduleReconnect();
        };

        this.ws.onerror = () => {
            this.ws.close();
        };
    }

    _scheduleReconnect() {
        setTimeout(() => {
            this.connect();
            this.currentDelay = Math.min(this.currentDelay * 2, this.maxDelay);
        }, this.currentDelay);
    }

    sendQuery(text, voice = "xiaoxiao") {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: "query",
                text: text,
                voice: voice,
            }));
        }
    }
}
