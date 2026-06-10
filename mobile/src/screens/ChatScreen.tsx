import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useChatStore } from '../stores/chatStore';
import { useUserStore } from '../stores/userStore';
import { createSSEConnection } from '../services/chat';
import VoiceRecordButton from '../components/VoiceRecordButton';
import RecognizeModal from '../components/RecognizeModal';
import AvatarWebView, { avatarSendAction } from '../components/AvatarWebView';
import api from '../services/api';

type VoiceState = 'idle' | 'listening' | 'processing' | 'cancelling';

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [recognizeVisible, setRecognizeVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  const {
    conversationId, messages, isStreaming, streamingContent,
    addMessage, setConversationId, setStreaming, appendStreamContent,
    flushStreamContent, clearMessages,
  } = useChatStore();

  const { userId, isLoggedIn, login } = useUserStore();

  useEffect(() => {
    if (!isLoggedIn) {
      api.login('13800000000', '0000').then((user) => {
        login(user.id, user.phone, user.nickname, user.avatar);
        api.setUserId(user.id);
      }).catch(() => {});
    }
  }, []);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    setInputText('');
    addMessage({ id: Date.now(), role: 'user', content: text });
    setStreaming(true);

    avatarSendAction('thinking');
    let fullResponse = '';

    const controller = createSSEConnection(
      text,
      {
        onMetadata: (data) => {
          if (data.conversation_id) {
            setConversationId(data.conversation_id);
          }
        },
        onFragment: (content) => {
          fullResponse += content;
          appendStreamContent(content);
        },
        onDone: () => {
          flushStreamContent();
          // Trigger TTS + lip sync
          if (fullResponse) {
            fetch(`${api.getBaseUrl()}/api/voice/tts?text=${encodeURIComponent(fullResponse)}`, { method: 'POST' })
              .then(r => r.json())
              .then(data => {
                if (data.audio) {
                  avatarSendAction('speak', { base64Audio: data.audio });
                }
              })
              .catch(() => {});
          }
          avatarSendAction('idle');
        },
        onError: (error) => {
          Alert.alert('错误', error);
          flushStreamContent();
          avatarSendAction('idle');
        },
      },
      conversationId,
      userId,
    );

    abortRef.current = controller;
  }, [inputText, isStreaming, conversationId, userId]);

  const handleVoiceResult = useCallback((text: string) => {
    setInputText(text);
    setVoiceState('idle');
  }, []);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    flushStreamContent();
  }, []);

  const handleSpotRecognized = useCallback((spot: { name: string; lat: number; lng: number; desc?: string; category?: string }) => {
    const content = `[拍照识景] 识别到: ${spot.name}${spot.category ? ` (${spot.category}类景点)` : ''}。请介绍一下这个景点。`;
    setInputText('');
    addMessage({ id: Date.now(), role: 'user', content });
    setStreaming(true);

    avatarSendAction('thinking');
    let fullResponse2 = '';

    const controller = createSSEConnection(
      content,
      {
        onMetadata: (data) => {
          if (data.conversation_id) setConversationId(data.conversation_id);
        },
        onFragment: (content) => {
          fullResponse2 += content;
          appendStreamContent(content);
        },
        onDone: () => {
          flushStreamContent();
          if (fullResponse2) {
            fetch(`${api.getBaseUrl()}/api/voice/tts?text=${encodeURIComponent(fullResponse2)}`, { method: 'POST' })
              .then(r => r.json())
              .then(data => {
                if (data.audio) avatarSendAction('speak', { base64Audio: data.audio });
              })
              .catch(() => {});
          }
          avatarSendAction('idle');
        },
        onError: (error) => {
          Alert.alert('错误', error);
          flushStreamContent();
          avatarSendAction('idle');
        },
      },
      conversationId,
      userId,
    );
    abortRef.current = controller;
  }, [conversationId, userId, addMessage, setStreaming, appendStreamContent, flushStreamContent, setConversationId]);

  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }, [messages, streamingContent]);

  const renderMessage = ({ item }: { item: { id: number; role: string; content: string } }) => (
    <View style={[styles.msgBubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
      <Text style={[styles.msgText, item.role === 'user' ? styles.userText : styles.aiText]}>
        {item.content}
      </Text>
    </View>
  );

  const chatBody = (
    <>
      {/* Live2D Digital Human Avatar */}
      <View style={styles.avatarContainer}>
        <AvatarWebView style={styles.avatarWebView} />
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
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyTitle}>景区AI数字人导览</Text>
            <Text style={styles.emptySubtitle}>语音或文字向我提问</Text>
            <View style={styles.quickPrompts}>
              {['景区介绍', '游览路线', '拍照识景', '门票价格', '开放时间'].map((q) => (
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

      {voiceState !== 'idle' && (
        <View style={styles.voiceIndicator}>
          <Text style={styles.voiceIndicatorText}>
            {voiceState === 'listening' ? '🔴 正在聆听...' :
             voiceState === 'processing' ? '⏳ 识别中...' :
             voiceState === 'cancelling' ? '⚠ 已取消' : ''}
          </Text>
        </View>
      )}

      {isStreaming && streamingContent === '' && (
        <View style={styles.streamingIndicator}>
          <Text style={styles.streamingText}>思考中...</Text>
        </View>
      )}

      <View style={styles.inputArea}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="输入您的问题..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            editable={!isStreaming}
          />
          {isStreaming ? (
            <TouchableOpacity style={[styles.sendBtn, styles.stopBtn]} onPress={handleStop}>
              <Text style={styles.sendBtnText}>⏹</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendBtnText}>发送</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI 景区导览</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setRecognizeVisible(true)} style={styles.cameraHeaderBtn}>
            <Text style={{ fontSize: 18 }}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearMessages}>
            <Text style={styles.clearBtn}>新建对话</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Photo recognition modal */}
      <RecognizeModal
        visible={recognizeVisible}
        onClose={() => setRecognizeVisible(false)}
        onSpotRecognized={(spot) => {
          setRecognizeVisible(false);
          handleSpotRecognized(spot);
        }}
      />

      {/* Body: KAV only on iOS, plain View on Android (uses native adjustResize) */}
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          style={styles.body}
          behavior="padding"
          keyboardVerticalOffset={90}
        >
          {chatBody}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.body}>{chatBody}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  body: { flex: 1 },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  avatarWebView: {
    width: '100%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 50, backgroundColor: '#FFFFFF', borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cameraHeaderBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  clearBtn: { color: '#2563EB', fontSize: 14, fontWeight: '500' },
  messageList: { flex: 1 },
  messageContent: { padding: 16, paddingBottom: 8 },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#2563EB' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  msgText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#FFFFFF' },
  aiText: { color: '#1F2937' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  quickPrompts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  quickPrompt: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE',
  },
  quickPromptText: { color: '#2563EB', fontSize: 13, fontWeight: '500' },
  voiceIndicator: {
    paddingHorizontal: 16, paddingBottom: 4,
    alignItems: 'center',
  },
  voiceIndicatorText: {
    color: '#2563EB', fontSize: 13, fontWeight: '600',
    backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 12, overflow: 'hidden',
  },
  streamingIndicator: { paddingHorizontal: 16, paddingBottom: 8 },
  streamingText: { color: '#6B7280', fontSize: 13, fontStyle: 'italic' },
  inputArea: { padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 0.5, borderTopColor: '#E5E7EB' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  textInput: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 15, maxHeight: 100, color: '#1F2937',
  },
  sendBtn: {
    backgroundColor: '#2563EB', width: 56, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#BFDBFE' },
  stopBtn: { backgroundColor: '#EF4444' },
  sendBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
