import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import api from '../services/api';
import { useUserStore } from '../stores/userStore';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme';

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
        <View style={styles.commentUserRow}>
          <View style={styles.commentAvatar}>
            <Text style={styles.commentAvatarText}>👤</Text>
          </View>
          <Text style={styles.commentUser}>游客</Text>
        </View>
        <Text style={styles.commentStars}>{'⭐'.repeat(item.rating || 5)}</Text>
      </View>
      <Text style={styles.commentContent}>{item.content}</Text>
      <View style={styles.commentFooter}>
        <View style={styles.likesRow}>
          <Text style={styles.likesText}>👍 {item.likes || 0}</Text>
        </View>
        <Text style={styles.commentDate}>{item.created_at?.slice(0, 10)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.paper} />
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={comments}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>游客评论</Text>
              <Text style={styles.listSubtitle}>
                {comments.length > 0
                  ? `共 ${comments.length} 条评论`
                  : '成为第一个评论的人吧！'}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconRing}>
                <Text style={styles.emptyIcon}>💬</Text>
              </View>
              <Text style={styles.emptyText}>暂无评论</Text>
              <Text style={styles.emptyHint}>分享您的游览体验</Text>
            </View>
          }
        />

        {/* Input area */}
        <View style={styles.inputArea}>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>评分</Text>
            {[1, 2, 3, 4, 5].map((r) => (
              <TouchableOpacity key={r} onPress={() => setRating(r)}>
                <Text style={[styles.ratingStar, r <= rating && styles.ratingStarActive]}>
                  {r <= rating ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={content}
              onChangeText={setContent}
              placeholder="写下你的评论..."
              placeholderTextColor={Colors.textMuted}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  inner: { flex: 1 },
  listContent: { padding: Spacing.lg },

  // List header
  listHeader: { marginBottom: Spacing.md },
  listTitle: { fontSize: 20, fontWeight: '800', color: Colors.ink },
  listSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIconRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
    borderWidth: 2, borderColor: Colors.goldLight,
  },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 17, fontWeight: '700', color: Colors.ink, marginBottom: 4 },
  emptyHint: { fontSize: 13, color: Colors.textSecondary },

  // Comment item
  commentItem: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  commentHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.sm,
  },
  commentUserRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarText: { fontSize: 14 },
  commentUser: { fontSize: 14, fontWeight: '600', color: Colors.ink },
  commentStars: { fontSize: 12, letterSpacing: 1 },
  commentContent: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  commentFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 0.5, borderTopColor: Colors.divider,
  },
  likesRow: { flexDirection: 'row', alignItems: 'center' },
  likesText: { fontSize: 12, color: Colors.textSecondary },
  commentDate: { fontSize: 12, color: Colors.textMuted },

  // Input
  inputArea: {
    padding: Spacing.md, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  ratingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: Spacing.sm,
  },
  ratingLabel: { fontSize: 13, color: Colors.textSecondary, marginRight: 4 },
  ratingStar: { fontSize: 26, color: Colors.divider },
  ratingStarActive: { color: Colors.gold },
  inputRow: { flexDirection: 'row', gap: 8 },
  textInput: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    fontSize: 14, color: Colors.text, maxHeight: 80,
  },
  submitBtn: {
    backgroundColor: Colors.goldDark, borderRadius: BorderRadius.md,
    paddingHorizontal: 22, justifyContent: 'center',
  },
  submitBtnDisabled: { backgroundColor: Colors.goldLight },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
