import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [hotSpots, setHotSpots] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [annRes, spotRes] = await Promise.all([
        api.getAnnouncements(),
        api.getSpots({ sort: 'hot', page_size: '5' }),
      ]);
      setAnnouncements(annRes);
      setHotSpots(spotRes.items || []);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>景区导览</Text>
        <Text style={styles.headerSubtitle}>AI数字人带您探索美景</Text>
      </View>

      {/* Emergency Banner */}
      {announcements.filter((a: any) => a.type === 'emergency').map((a: any) => (
        <View key={a.id} style={styles.emergencyBanner}>
          <Text style={styles.emergencyText}>⚠️ {a.title}: {a.content}</Text>
        </View>
      ))}

      {/* AI Chat CTA */}
      <TouchableOpacity
        style={styles.aiChatCard}
        onPress={() => navigation.navigate('Chat')}
      >
        <Text style={styles.aiChatEmoji}>🤖</Text>
        <View style={styles.aiChatContent}>
          <Text style={styles.aiChatTitle}>AI 智能导览</Text>
          <Text style={styles.aiChatSubtitle}>语音或文字提问，数字人实时解答</Text>
        </View>
        <Text style={styles.aiChatArrow}>→</Text>
      </TouchableOpacity>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        {[
          { label: '景区地图', icon: '🗺️', screen: 'Map' },
          { label: '景点列表', icon: '🏔️', screen: 'Scenic' },
          { label: '拍照识景', icon: '📷', screen: 'Chat' },
          { label: '游览路线', icon: '🧭', screen: 'Scenic' },
        ].map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.quickAction}
            onPress={() => navigation.navigate(action.screen)}
          >
            <Text style={styles.quickActionIcon}>{action.icon}</Text>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Announcements */}
      {announcements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📢 景区公告</Text>
          {announcements.slice(0, 3).map((a: any) => (
            <View key={a.id} style={styles.announcementItem}>
              <Text style={styles.announcementTitle}>{a.title}</Text>
              <Text style={styles.announcementContent} numberOfLines={2}>{a.content}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Hot spots */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔥 热门景点</Text>
        {hotSpots.map((spot: any) => (
          <TouchableOpacity
            key={spot.id}
            style={styles.spotCard}
            onPress={() => navigation.navigate('ScenicDetail', { spotId: spot.id })}
          >
            <View style={styles.spotInfo}>
              <Text style={styles.spotName}>{spot.name}</Text>
              <Text style={styles.spotCategory}>{spot.category} · {spot.level || '景区'}</Text>
              <Text style={styles.spotPrice}>¥{spot.price || 0}</Text>
            </View>
            <Text style={styles.spotPv}>👁 {spot.pv}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#2563EB' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#BFDBFE', marginTop: 4 },
  emergencyBanner: { margin: 16, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  emergencyText: { color: '#991B1B', fontSize: 13 },
  aiChatCard: {
    flexDirection: 'row', alignItems: 'center', margin: 16, padding: 20,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  aiChatEmoji: { fontSize: 48, marginRight: 16 },
  aiChatContent: { flex: 1 },
  aiChatTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  aiChatSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  aiChatArrow: { fontSize: 24, color: '#2563EB' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginBottom: 8 },
  quickAction: { alignItems: 'center', padding: 12 },
  quickActionIcon: { fontSize: 32, marginBottom: 4 },
  quickActionLabel: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  section: { margin: 16, marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  announcementItem: {
    backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#F59E0B',
  },
  announcementTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  announcementContent: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  spotCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: 14, borderRadius: 12, marginBottom: 8,
  },
  spotInfo: { flex: 1 },
  spotName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  spotCategory: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  spotPrice: { fontSize: 15, fontWeight: '700', color: '#2563EB', marginTop: 4 },
  spotPv: { fontSize: 12, color: '#9CA3AF' },
});
