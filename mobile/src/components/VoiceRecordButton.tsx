import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useAudioRecorder, requestRecordingPermissionsAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

const API_BASE = 'http://localhost:8000';

const RECORDING_OPTIONS = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  android: {
    outputFormat: 'mpeg4' as const,
    audioEncoder: 'aac' as const,
  },
  ios: {},
  web: {},
};

type Props = {
  onResult: (text: string) => void;
  onStateChange: (state: string) => void;
  disabled: boolean;
};

export default function VoiceRecordButton({ onResult, onStateChange, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [swiped, setSwiped] = useState(false);
  const startY = useRef(0);
  const cancelled = useRef(false);
  const onResultRef = useRef(onResult);
  const onStateChangeRef = useRef(onStateChange);
  onResultRef.current = onResult;
  onStateChangeRef.current = onStateChange;

  const sendToBackend = useCallback(async (url: string) => {
    onStateChangeRef.current('processing');
    try {
      console.log('[Voice] Reading file:', url);
      const base64 = await FileSystem.readAsStringAsync(url, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('[Voice] File read, size:', base64.length);
      FileSystem.deleteAsync(url, { idempotent: true }).catch(() => {});
      const resp = await fetch(`${API_BASE}/api/voice/stt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, format: 'audio/mp4' }),
      });
      console.log('[Voice] Response status:', resp.status);
      const data = await resp.json();
      console.log('[Voice] Response data:', JSON.stringify(data));
      if (data.text) {
        onResultRef.current(data.text);
      } else if (data.error) {
        Alert.alert('识别失败', data.error);
      } else {
        Alert.alert('识别失败', '未检测到语音，请重试');
      }
    } catch (e: any) {
      console.log('[Voice] Error:', e?.message, e?.stack);
      Alert.alert('识别失败', e?.message || '未知错误，请重试');
    }
    onStateChangeRef.current('idle');
  }, []);

  const recorder = useAudioRecorder(RECORDING_OPTIONS, (status) => {
    if (status.isFinished && status.url && !status.hasError && !cancelled.current) {
      sendToBackend(status.url);
    } else if (status.hasError && !cancelled.current) {
      Alert.alert('录音失败', status.error || '录音出错，请重试');
      onStateChangeRef.current('idle');
    }
  });

  const handlePressIn = useCallback(async () => {
    cancelled.current = false;
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('需要权限', '请在设置中允许麦克风权限');
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setListening(true);
      onStateChangeRef.current('listening');
    } catch (e: any) {
      Alert.alert('启动失败', e.message || '无法启动录音');
    }
  }, [recorder]);

  const handlePressOut = useCallback(() => {
    if (!listening) return;
    if (swiped) {
      cancelled.current = true;
      recorder.stop();
      setListening(false);
      setSwiped(false);
      onStateChangeRef.current('idle');
      return;
    }
    setListening(false);
    recorder.stop();
  }, [listening, swiped, recorder]);

  const handleTouchMove = useCallback((e: any) => {
    if (!listening) return;
    const dy = startY.current - e.nativeEvent.pageY;
    setSwiped(dy > 50);
  }, [listening]);

  const handleTouchStart = useCallback((e: any) => {
    startY.current = e.nativeEvent.pageY;
    setSwiped(false);
  }, []);

  if (disabled) return null;

  const btnStyle = listening
    ? (swiped ? styles.cancelBtn : styles.listeningBtn)
    : styles.idleBtn;
  const label = listening
    ? (swiped ? '⚠ 松手取消' : '🔴 正在录音')
    : '🎤 按住说话';

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={[styles.btn, btnStyle]}
    >
      <Text style={[styles.btnText, listening && styles.listeningText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginTop: 8,
    height: 52,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  idleBtn: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  listeningBtn: { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' },
  cancelBtn: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  btnText: { fontSize: 15, fontWeight: '600', color: '#2563EB' },
  listeningText: { color: '#1D4ED8' },
});
