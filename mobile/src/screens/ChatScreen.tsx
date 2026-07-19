import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, StatusBar,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useChatStore } from '../stores/chatStore';
import { useUserStore } from '../stores/userStore';
import VoiceRecordButton from '../components/VoiceRecordButton';
import RecognizeModal from '../components/RecognizeModal';
import AvatarWebView, { avatarSendAction } from '../components/AvatarWebView';
import api from '../services/api';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme';
import { SERVER_URL, WS_URL, SHOW_PHOTO_RECOGNITION } from '../config';

type VoiceState = 'idle' | 'listening' | 'processing' | 'cancelling';

const API_BASE = SERVER_URL;

const VOICE_BY_GENDER = { female: 'zh-CN-XiaoxiaoNeural', male: 'zh-CN-YunxiNeural' } as const;

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [recognizeVisible, setRecognizeVisible] = useState(false);
  const [avatarGender, setAvatarGender] = useState<'female' | 'male'>('female');
  const [recommendChips, setRecommendChips] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const {
    messages, isStreaming, streamingContent,
    addMessage, setStreaming, appendStreamContent,
    flushStreamContent, clearMessages,
  } = useChatStore();

  const audioPlayer = useAudioPlayer();
  const audioQueueRef = useRef<string[]>([]);
  const audioPlayingRef = useRef(false);
  const readyToPlayCountRef = useRef(0);

  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0 || readyToPlayCountRef.current === 0) {
      audioPlayingRef.current = false;
      return;
    }
    readyToPlayCountRef.current--;
    const url = audioQueueRef.current.shift()!;
    audioPlayingRef.current = true;
    const fullUrl = url.startsWith('http') ? url : API_BASE + url;
    try {
      audioPlayer.replace({ uri: fullUrl });
      audioPlayer.play();
    } catch (e) {
      console.warn('[Audio] playback error:', e);
      playNextInQueue();
    }
  }, [audioPlayer]);

  useEffect(() => {
    const sub = audioPlayer.addListener('playbackStatusUpdate', (status: any) => {
      if (status.didJustFinish) playNextInQueue();
    });
    return () => sub?.remove();
  }, [audioPlayer, playNextInQueue]);

  const { userId, isLoggedIn, login } = useUserStore();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!isLoggedIn) {
      // Prompt user to log in before using AI guide
      Alert.alert('欢迎使用灵山AI导览', '请先在「我的」页面登录后使用智能导览功能', [
        { text: '去登录', onPress: () => navigation.navigate('Profile') },
        { text: '稍后再说', style: 'cancel' },
      ]);
    }
  }, []);

  const connectWSRef = useRef<() => void>(() => {});
  const connectWS = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'llm_token': appendStreamContent(data.token); break;
          case 'llm_done':
            flushStreamContent(); setStreaming(false);
            api.getRecommendForUser(3).then(setRecommendChips).catch(() => {});
            break;
          case 'tts_chunk':
            if (data.audio_url) {
              audioQueueRef.current.push(data.audio_url);
              avatarSendAction('lipSync', { audioUrl: data.audio_url });
            }
            break;
          case 'ready': setStreaming(false); break;
          case 'error':
            Alert.alert('错误', data.message);
            flushStreamContent(); setStreaming(false); break;
        }
      } catch (e) {
        console.warn('[WS] message parse error:', e);
      }
    };

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
    };
    ws.onclose = () => {
      wsRef.current = null;
      const delay = Math.min(2000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;
      setTimeout(connectWSRef.current, delay);
    };
    ws.onerror = (event) => {
      console.warn('[WS] connection error:', (event as any)?.message || 'unknown');
    };
  }, [appendStreamContent, flushStreamContent, setStreaming, audioPlayer]);
  connectWSRef.current = connectWS;

  useEffect(() => {
    connectWS();
    return () => { wsRef.current?.close(); wsRef.current = null; };
  }, [connectWS]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isStreaming) return;
    setInputText('');
    addMessage({ id: Date.now(), role: 'user', content: text });
    setStreaming(true);
    setRecommendChips([]);

    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'query', text, voice: VOICE_BY_GENDER[avatarGender] }));
    } else {
      Alert.alert('连接中', '正在连接服务器，请稍后重试');
      setStreaming(false);
      connectWSRef.current();
    }
  }, [inputText, isStreaming, avatarGender]);

  const handleVoiceResult = useCallback((text: string) => {
    setInputText(text);
    setVoiceState('idle');
  }, []);

  const handleStop = useCallback(() => {
    flushStreamContent();
    setStreaming(false);
    audioPlayer.pause();
    audioPlayer.replace({ uri: '' });
    audioQueueRef.current = [];
    audioPlayingRef.current = false;
    readyToPlayCountRef.current = 0;
    avatarSendAction('idle');
  }, [flushStreamContent, setStreaming, audioPlayer]);

  const handleLipSyncStarted = useCallback(() => {
    readyToPlayCountRef.current++;
    if (!audioPlayingRef.current) playNextInQueue();
  }, [playNextInQueue]);

  const handleSpotRecognized = useCallback((spot: { name: string; lat: number; lng: number; desc?: string; category?: string }) => {
    const content = `[拍照识景] 识别到: ${spot.name}${spot.category ? ` (${spot.category}类景点)` : ''}。请介绍一下这个景点。`;
    setInputText('');
    addMessage({ id: Date.now(), role: 'user', content });
    setStreaming(true);
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'query', text: content, voice: VOICE_BY_GENDER[avatarGender] }));
    } else {
      Alert.alert('连接中', '正在连接服务器...');
      setStreaming(false);
      connectWSRef.current();
    }
  }, [addMessage, setStreaming, avatarGender]);

  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }, [messages, streamingContent]);

  const renderMessage = ({ item }: { item: { id: number; role: string; content: string } }) => (
    <View style={[styles.msgBubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
      {item.role === 'ai' && <Text style={styles.aiLabel}>灵山导览</Text>}
      <Text style={[styles.msgText, item.role === 'user' ? styles.userText : styles.aiText]}>
        {item.content}
      </Text>
    </View>
  );

  const chatBody = (
    <>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <AvatarWebView style={styles.avatarWebView} modelId={avatarGender} onLipSyncStarted={handleLipSyncStarted} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => String(item.id)}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconRing}>
              <Ionicons name="sparkles" size={36} color={Colors.goldDark} />
            </View>
            <Text style={styles.emptyTitle}>灵山 AI 导览</Text>
            <Text style={styles.emptySubtitle}>我是您的智慧导游，可以语音或文字向我提问</Text>
            <View style={styles.quickPrompts}>
              {['景区介绍', '游览路线', ...(SHOW_PHOTO_RECOGNITION ? ['拍照识景'] : []), '门票价格', '开放时间'].map((q) => (
                <TouchableOpacity key={q} style={styles.quickPrompt} onPress={() => {
                  if (q === '拍照识景') { setRecognizeVisible(true); } else { setInputText(q); }
                }}>
                  <Text style={styles.quickPromptText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
      />

      {/* Streaming message — renders tokens in real-time */}
      {isStreaming && streamingContent !== '' && (
        <View style={[styles.msgBubble, styles.aiBubble, styles.streamingBubble]}>
          <Text style={styles.aiLabel}>灵山导览</Text>
          <Text style={[styles.msgText, styles.aiText]}>{streamingContent}</Text>
        </View>
      )}

      {/* Voice state indicator */}
      {voiceState === 'listening' && (
        <View style={styles.voiceListening}>
          <View style={styles.voicePulse} />
          <Text style={styles.voiceText}>正在聆听...</Text>
        </View>
      )}
      {voiceState === 'processing' && (
        <View style={styles.voiceProcessing}>
          <Text style={styles.voiceText}>⏳ 识别中...</Text>
        </View>
      )}

      {/* Streaming thinking */}
      {isStreaming && streamingContent === '' && (
        <View style={styles.thinking}>
          <Text style={styles.thinkingText}>思考中</Text>
          <View style={styles.thinkingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
      )}

      {/* Recommendation chips */}
      {recommendChips.length > 0 && (
        <View style={styles.recommendRow}>
          <Text style={styles.recommendLabel}>为你推荐</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendScroll}>
            {recommendChips.map((chip: any) => (
              <TouchableOpacity
                key={chip.id}
                style={styles.recommendChip}
                onPress={() => navigation.navigate('ScenicDetail', { spotId: chip.id })}
              >
                <Text style={styles.recommendChipText}>{chip.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input area */}
      <View style={styles.inputArea}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="向灵山AI导游提问..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
            editable={!isStreaming}
          />
          {isStreaming ? (
            <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
              <Ionicons name="stop" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        <VoiceRecordButton
          onResult={handleVoiceResult}
          onStateChange={setVoiceState}
          disabled={isStreaming}
        />
      </View>
    </>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.paper} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Ionicons name="sparkles" size={19} color={Colors.goldDark} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI 景区导览</Text>
            <Text style={styles.headerStatus}>在线 · 随时为您服务</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.genderToggle}>
            <TouchableOpacity
              style={[styles.genderBtn, avatarGender === 'female' && styles.genderBtnActive]}
              onPress={() => setAvatarGender('female')}
            >
              <Text style={[styles.genderBtnText, avatarGender === 'female' && styles.genderBtnTextActive]}>女</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderBtn, avatarGender === 'male' && styles.genderBtnActive]}
              onPress={() => setAvatarGender('male')}
            >
              <Text style={[styles.genderBtnText, avatarGender === 'male' && styles.genderBtnTextActive]}>男</Text>
            </TouchableOpacity>
          </View>
          {SHOW_PHOTO_RECOGNITION && (
            <TouchableOpacity onPress={() => setRecognizeVisible(true)} style={styles.headerBtn}>
              <Ionicons name="camera" size={17} color={Colors.goldDark} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearMessages} style={styles.newChatBtn}>
            <Text style={styles.newChatText}>新对话</Text>
          </TouchableOpacity>
        </View>
      </View>

      <RecognizeModal
        visible={recognizeVisible}
        onClose={() => setRecognizeVisible(false)}
        onSpotRecognized={(spot) => {
          setRecognizeVisible(false);
          handleSpotRecognized(spot);
        }}
      />

      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={styles.body} behavior="padding" keyboardVerticalOffset={90}>
          {chatBody}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.body}>{chatBody}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  body: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 50, paddingBottom: 12, paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink },
  headerStatus: { fontSize: 11, color: Colors.jade, fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center',
  },
  newChatBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: BorderRadius.full, backgroundColor: Colors.goldSurface,
  },
  newChatText: { fontSize: 12, color: Colors.goldDark, fontWeight: '600' },
  genderToggle: {
    flexDirection: 'row', backgroundColor: Colors.goldSurface,
    borderRadius: BorderRadius.full, padding: 2,
  },
  genderBtn: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: BorderRadius.full },
  genderBtnActive: { backgroundColor: Colors.goldDark },
  genderBtnText: { fontSize: 13, color: Colors.goldDark, fontWeight: '600' },
  genderBtnTextActive: { color: '#FFFFFF' },

  // Avatar
  avatarContainer: {
    alignItems: 'center', paddingVertical: 4,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  avatarWebView: { width: '100%' },

  // Messages
  messageList: { flex: 1 },
  messageContent: { padding: Spacing.lg, paddingBottom: Spacing.sm },
  msgBubble: { maxWidth: '80%', padding: 14, borderRadius: 18, marginBottom: 12 },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.goldDark,
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.divider,
    borderBottomLeftRadius: 6,
    ...Shadows.sm,
  },
  streamingBubble: {
    opacity: 0.9,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  aiLabel: { fontSize: 10, color: Colors.gold, fontWeight: '600', marginBottom: 4 },
  msgText: { fontSize: 15, lineHeight: 23 },
  userText: { color: '#FFFFFF' },
  aiText: { color: Colors.text },

  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: 50 },
  emptyIconRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 2, borderColor: Colors.goldLight,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.ink, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },
  quickPrompts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  quickPrompt: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.goldLight,
    ...Shadows.sm,
  },
  quickPromptText: { color: Colors.goldDark, fontSize: 13, fontWeight: '500' },

  // Voice states
  voiceListening: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, gap: 8,
  },
  voicePulse: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.vermilion,
  },
  voiceProcessing: {
    alignItems: 'center', paddingVertical: 8,
  },
  voiceText: { color: Colors.goldDark, fontSize: 13, fontWeight: '600' },

  // Thinking
  thinking: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingBottom: 8, gap: 8,
  },
  thinkingText: { color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic' },
  thinkingDots: { flexDirection: 'row', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.gold },
  dot1: { opacity: 0.4 }, dot2: { opacity: 0.7 }, dot3: { opacity: 1 },

  // Recommend chips
  recommendRow: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  recommendLabel: {
    fontSize: 11, color: Colors.textMuted, fontWeight: '600',
    marginBottom: 6,
  },
  recommendScroll: { gap: 8 },
  recommendChip: {
    backgroundColor: Colors.goldSurface,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.goldLight,
  },
  recommendChipText: { color: Colors.goldDark, fontSize: 13, fontWeight: '500' },

  // Input
  inputArea: {
    padding: Spacing.md, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  textInput: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: 22, paddingHorizontal: 18,
    paddingVertical: 10, fontSize: 15, maxHeight: 100,
    color: Colors.text,
  },
  sendBtn: {
    backgroundColor: Colors.goldDark,
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.goldLight },
  stopBtn: {
    backgroundColor: Colors.vermilion,
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
});
