/**
 * Voice recording via WebView MediaRecorder + backend ASR.
 * Universal — works on all Android phones without Google services.
 */

type VoiceCallback = (text: string) => void;
type StateCallback = (state: 'idle' | 'listening' | 'processing') => void;

let onResultCb: VoiceCallback | null = null;
let onStateCb: StateCallback | null = null;
let webViewPostMessage: ((msg: string) => void) | null = null;

export function registerVoiceWebView(postMessage: (msg: string) => void) {
  webViewPostMessage = postMessage;
}

export function setVoiceCallbacks(onResult: VoiceCallback, onState: StateCallback) {
  onResultCb = onResult;
  onStateCb = onState;
}

export function startListening() {
  webViewPostMessage?.(JSON.stringify({ action: 'start' }));
}

export function stopListening() {
  webViewPostMessage?.(JSON.stringify({ action: 'stop' }));
}

export function cancelListening() {
  webViewPostMessage?.(JSON.stringify({ action: 'cancel' }));
}

export function handleVoiceMessage(event: { nativeEvent: { data: string } }) {
  try {
    const msg = JSON.parse(event.nativeEvent.data);
    switch (msg.type) {
      case 'audio':
        // Send audio to backend for ASR
        sendToBackend(msg.audio, msg.format || 'audio/webm');
        break;
      case 'error':
        console.warn('Voice error:', msg.error);
        onStateCb?.('idle');
        break;
      case 'state':
        onStateCb?.(msg.state);
        break;
    }
  } catch { /* ignore */ }
}

async function sendToBackend(audioBase64: string, format: string) {
  try {
    onStateCb?.('processing');
    const response = await fetch('http://10.223.11.225:8000/api/voice/stt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: audioBase64, format }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (data.text) {
      onResultCb?.(data.text);
    } else {
      onStateCb?.('idle');
    }
  } catch (e: any) {
    console.warn('ASR request failed:', e.message);
    onStateCb?.('idle');
  }
}

export const VOICE_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"></head>
<body style="margin:0;background:transparent;">
<script>
  var mediaRecorder = null;
  var audioChunks = [];
  var isRecording = false;

  function post(msg) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }

  document.addEventListener('message', function(event) {
    try {
      var data = JSON.parse(event.data);
      if (data.action === 'start') startRecording();
      else if (data.action === 'stop') stopRecording();
      else if (data.action === 'cancel') cancelRecording();
    } catch(e) {}
  });

  async function startRecording() {
    if (isRecording) return;
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioChunks = [];
      var mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg;codecs=opus';
      }
      mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });

      mediaRecorder.ondataavailable = function(e) {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstart = function() {
        isRecording = true;
        post({ type: 'state', state: 'listening' });
      };

      mediaRecorder.onstop = function() {
        isRecording = false;
        stream.getTracks().forEach(function(t) { t.stop(); });
        var blob = new Blob(audioChunks, { type: mimeType });
        var reader = new FileReader();
        reader.onloadend = function() {
          var base64 = reader.result.split(',')[1];
          post({ type: 'audio', audio: base64, format: mimeType });
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
    } catch(e) {
      post({ type: 'error', error: '话筒不可用: ' + e.message });
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
    }
  }

  function cancelRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      post({ type: 'state', state: 'idle' });
    }
  }
</script>
</body>
</html>`;
