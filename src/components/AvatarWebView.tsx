import { useRef, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface AvatarWebViewProps {
  onLoaded?: () => void;
  style?: any;
}

const DIGITAL_HUMAN_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000/static/digital-human/index.html'
  : 'http://localhost:8000/static/digital-human/index.html';

const avatarHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; }
  #avatar-container { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .avatar-circle {
    width: 200px; height: 200px; border-radius: 100px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
    transition: transform 0.3s ease;
  }
  .avatar-circle.speaking { animation: pulse 0.6s ease-in-out infinite; }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  .avatar-face { font-size: 80px; }
  .status-text { color: white; font-size: 14px; margin-top: 16px; font-family: sans-serif; opacity: 0.9; }
  .listening-indicator {
    margin-top: 12px; width: 60px; height: 4px;
    background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;
  }
  .listening-bar {
    height: 100%; width: 0%;
    background: #4ADE80; border-radius: 2px;
    transition: width 0.1s linear;
  }
  .listening-indicator.active .listening-bar { animation: listenAnim 1.5s ease-in-out infinite; }
  @keyframes listenAnim {
    0% { width: 0%; }
    50% { width: 100%; }
    100% { width: 0%; }
  }
</style>
</head>
<body>
  <div id="avatar-container">
    <div class="avatar-circle" id="avatar">
      <span class="avatar-face">🤖</span>
    </div>
    <div class="listening-indicator" id="listeningBar">
      <div class="listening-bar"></div>
    </div>
    <p class="status-text" id="statusText">您好！我是景区AI导览助手</p>
  </div>
  <script>
    const avatar = document.getElementById('avatar');
    const statusText = document.getElementById('statusText');
    const listeningBar = document.getElementById('listeningBar');

    window.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      switch(data.action) {
        case 'speaking':
          avatar.classList.add('speaking');
          statusText.textContent = '正在讲解...';
          listeningBar.classList.remove('active');
          break;
        case 'listening':
          avatar.classList.remove('speaking');
          statusText.textContent = '正在聆听...';
          listeningBar.classList.add('active');
          break;
        case 'idle':
          avatar.classList.remove('speaking');
          statusText.textContent = data.text || '您好！我是景区AI导览助手';
          listeningBar.classList.remove('active');
          break;
        case 'thinking':
          avatar.classList.remove('speaking');
          statusText.textContent = '思考中...';
          listeningBar.classList.remove('active');
          break;
      }
    });

    // Notify RN that avatar is ready
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ready: true}));
  </script>
</body>
</html>`;

export default function AvatarWebView({ onLoaded, style }: AvatarWebViewProps) {
  const webViewRef = useRef<WebView>(null);

  const sendAction = useCallback((action: string, extra: Record<string, any> = {}) => {
    const message = JSON.stringify({ action, ...extra });
    webViewRef.current?.postMessage(message);
  }, []);

  const onMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.ready) {
        onLoaded?.();
        sendAction('idle', { text: '您好！我是景区AI导览助手' });
      }
    } catch {}
  }, [onLoaded, sendAction]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: avatarHTML }}
        style={styles.webview}
        onMessage={onMessage}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
}

// Expose sendAction for external use
export let avatarSendAction: ((action: string, extra?: Record<string, any>) => void) | null = null;

export function setAvatarSendAction(fn: typeof avatarSendAction) {
  avatarSendAction = fn;
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
