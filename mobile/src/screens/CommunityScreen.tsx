import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import api from '../services/api';
import { useUserStore } from '../stores/userStore';

export default function CommunityScreen() {
  const route = useRoute<any>();
  const { spotId } = route.params || {};
  const { userId } = useUserStore();

  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (spotId) {
      api.getComments(spotId).then(setComments).catch(() => {});
    }
  }, [spotId]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请输入评论内容');
      return;
    }
    try {
      await api.createComment(userId || 1, spotId, content, rating);
      setContent('');
      Alert.alert('成功', '评论已发布');
      const updated = await api.getComments(spotId);
      setComments(updated);
    } catch {
      Alert.alert('错误', '评论发布失败');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentUser}>游客</Text>
        <Text style={styles.commentStars}>{'⭐'.repeat(item.rating || 5)}</Text>
      </View>
      <Text style={styles.commentContent}>{item.content}</Text>
      <View style={styles.commentFooter}>
        <Text style={styles.commentDate}>{item.created_at?.slice(0, 10)}</Text>
        <View style={styles.likesRow}>
          <Text style={styles.likesText}>👍 {item.likes || 0}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={comments}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>暂无评论，成为第一个评论的人吧！</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputArea}>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((r) => (
            <TouchableOpacity key={r} onPress={() => setRating(r)}>
              <Text style={styles.ratingStar}>{r <= rating ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={content}
            onChangeText={setContent}
            placeholder="写下你的评论..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.submitBtn, !content.trim() && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!content.trim()}
          >
            <Text style={styles.submitText}>发布</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  listContent: { padding: 16 },
  commentItem: {
    backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#F3F4F6',
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  commentUser: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  commentStars: { fontSize: 12 },
  commentContent: { fontSize: 14, color: '#374151', lineHeight: 22 },
  commentFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  commentDate: { fontSize: 12, color: '#9CA3AF' },
  likesRow: {},
  likesText: { fontSize: 12, color: '#9CA3AF' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
  inputArea: {
    padding: 12, backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5, borderTopColor: '#E5E7EB',
  },
  ratingRow: { flexDirection: 'row', marginBottom: 8, gap: 4 },
  ratingStar: { fontSize: 24 },
  inputRow: { flexDirection: 'row', gap: 8 },
  textInput: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
    maxHeight: 80, color: '#1F2937',
  },
  submitBtn: {
    backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 20,
    justifyContent: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#BFDBFE' },
  submitText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
