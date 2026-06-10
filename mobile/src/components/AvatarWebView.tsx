import { useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AvatarWebViewProps {
  onLoaded?: () => void;
  style?: any;
}

const DIGITAL_HUMAN_URL = 'http://localhost:8000/digital-human/model-lite.html';

// Module-level ref for external components to control the avatar
let _webViewRef: WebView | null = null;

export function avatarSendAction(action: string, extra: Record<string, any> = {}) {
  const message = JSON.stringify({ action, ...extra });
  _webViewRef?.postMessage(message);
}

export default function AvatarWebView({ onLoaded, style }: AvatarWebViewProps) {
  const webViewRef = useRef<WebView>(null);

  const onMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.ready) {
        _webViewRef = webViewRef.current;
        onLoaded?.();
      }
    } catch {}
  }, [onLoaded]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ uri: DIGITAL_HUMAN_URL }}
        style={styles.webview}
        onMessage={onMessage}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onLoad={() => {
          _webViewRef = webViewRef.current;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: Math.min(SCREEN_HEIGHT * 0.45, 400),
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
