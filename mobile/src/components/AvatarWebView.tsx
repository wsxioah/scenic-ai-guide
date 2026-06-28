import { useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { SERVER_URL } from '../config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AvatarWebViewProps {
  style?: any;
  modelId?: 'female' | 'male';
}

let _webViewRef: WebView | null = null;

export function avatarSendAction(action: string, extra: Record<string, any> = {}) {
  const message = JSON.stringify({ action, ...extra });
  console.log('[Avatar] sendAction:', action, 'ref:', !!_webViewRef);
  if (_webViewRef) {
    // Escape backslashes and quotes for safe JS string literal
    const escaped = message.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    _webViewRef.injectJavaScript("window.dhHandleCommand('" + escaped + "');true;");
  }
}

export default function AvatarWebView({ style, modelId = 'female' }: AvatarWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const uri = useMemo(
    () => `${SERVER_URL}/digital-human/model-lite.html?model=${modelId}&t=${Date.now()}`,
    [modelId]
  );

  const onMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.ready) {
        _webViewRef = webViewRef.current;
        console.log('[Avatar] WebView ready, ref set');
      }
      // Forward WebView status changes (informational only)
      if (data.audioEnded) {
        console.log('[Avatar] Audio playback ended');
      }
    } catch {}
  }, []);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ uri }}
        style={styles.webview}
        onMessage={onMessage}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled={false}
        cacheMode="LOAD_NO_CACHE"
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onLoad={() => {
          _webViewRef = webViewRef.current;
          console.log('[Avatar] WebView onLoad, ref set');
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
