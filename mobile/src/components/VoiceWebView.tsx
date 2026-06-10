import { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet } from 'react-native';
import { VOICE_HTML, handleVoiceMessage, registerVoiceWebView } from '../services/voice';

export default function VoiceWebView() {
  const ref = useRef<WebView>(null);

  useEffect(() => {
    registerVoiceWebView((msg: string) => {
      ref.current?.postMessage(msg);
    });
  }, []);

  return (
    <WebView
      ref={ref}
      source={{ html: VOICE_HTML }}
      onMessage={handleVoiceMessage}
      style={styles.hidden}
      pointerEvents="none"
      scrollEnabled={false}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      mediaPlaybackRequiresUserAction={false}
    />
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
});
