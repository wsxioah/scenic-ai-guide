import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { useUserStore } from '../stores/userStore';

export default function ScenicDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { spotId } = route.params;
  const { userId, isLoggedIn } = useUserStore();

  const [spot, setSpot] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [spotId]);

  const loadData = async () => {
    try {
      const [spotData, commentsData] = await Promise.all([
        api.getSpotDetail(spotId),
        api.getComments(spotId),
      ]);
      setSpot(spotData);
      setComments(commentsData);
    } catch {}
  };

  const navigateToSpot = () => {
    if (spot) {
      Linking.openURL(`https://uri.amap.com/navigation?to=${spot.lng},${spot.lat},${spot.name}&mode=walk&callnative=1`);
    }
  };

  const askAI = () => {
    navigation.navigate('Chat');
  };

  if (!spot) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.name}>{spot.name}</Text>
        <Text style={styles.category}>
          {spot.category} · {spot.level || '景区'} · {spot.open_time || '全天'}
        </Text>
        <Text style={styles.price}>¥{spot.price || 0}</Text>
        <Text style={styles.address}>📍 {spot.address}</Text>
        <Text style={styles.description}>{spot.description}</Text>

        <View style={styles.stats}>
          <Text style={styles.stat}>👁 {spot.pv} 浏览</Text>
          <Text style={styles.stat}>⭐ {spot.score} 评分</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={navigateToSpot}>
          <Text style={styles.actionIcon}>🧭</Text>
          <Text style={styles.actionLabel}>导航</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={askAI}>
          <Text style={styles.actionIcon}>🤖</Text>
          <Text style={[styles.actionLabel, { color: '#FFFFFF' }]}>AI讲解</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Community', { spotId })}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>评论</Text>
        </TouchableOpacity>
      </View>

      {/* Comments */}
      <View style={styles.commentSection}>
        <Text style={styles.sectionTitle}>游客评论 ({comments.length})</Text>
        {comments.length === 0 ? (
          <Text style={styles.noComments}>暂无评论，快来第一个评论吧</Text>
        ) : (
          comments.map((c: any) => (
            <View key={c.id} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentUser}>游客</Text>
                <Text style={styles.commentRate}>{'⭐'.repeat(c.rating || 5)}</Text>
              </View>
              <Text style={styles.commentContent}>{c.content}</Text>
              <View style={styles.commentFooter}>
                <Text style={styles.commentLikes}>👍 {c.likes || 0}</Text>
                <Text style={styles.commentDate}>{c.created_at?.slice(0, 10)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: '#9CA3AF' },
  infoCard: { margin: 16, padding: 20, backgroundColor: '#FFFFFF', borderRadius: 16 },
  name: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  category: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  price: { fontSize: 22, fontWeight: '800', color: '#2563EB', marginTop: 12 },
  address: { fontSize: 13, color: '#6B7280', marginTop: 8 },
  description: { fontSize: 15, color: '#374151', marginTop: 12, lineHeight: 24 },
  stats: { flexDirection: 'row', marginTop: 16, gap: 16 },
  stat: { fontSize: 13, color: '#9CA3AF' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 16, marginBottom: 16, gap: 8 },
  actionBtn: {
    flex: 1, alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  actionBtnPrimary: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  actionIcon: { fontSize: 28 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginTop: 4 },
  commentSection: { margin: 16, marginTop: 0 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  noComments: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, paddingVertical: 20 },
  commentItem: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, marginBottom: 8 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentUser: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  commentRate: { fontSize: 12 },
  commentContent: { fontSize: 14, color: '#374151', lineHeight: 22 },
  commentFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  commentLikes: { fontSize: 12, color: '#9CA3AF' },
  commentDate: { fontSize: 12, color: '#9CA3AF' },
});
