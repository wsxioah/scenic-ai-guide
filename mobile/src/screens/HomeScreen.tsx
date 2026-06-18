import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [hotSpots, setHotSpots] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const results = await Promise.allSettled([
        api.getAnnouncements(),
        api.getSpots({ sort: 'hot', page_size: '5' }),
      ]);
      if (results[0].status === 'fulfilled') setAnnouncements(results[0].value);
      if (results[1].status === 'fulfilled') setHotSpots(results[1].value.items || []);
    } catch {}
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.goldDark} />

      {/* ── Hero Header ── */}
      <View style={styles.hero}>
        <View style={styles.heroPattern}>
          <Text style={styles.heroDecoration}>卍</Text>
        </View>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>灵山胜境</Text>
          <Text style={styles.heroSubtitle}>AI数字人 · 智慧导览</Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>🏔 国家5A级旅游景区</Text>
          </View>
        </View>
      </View>

      {/* ── Emergency Banner ── */}
      {announcements.filter((a: any) => a.type === 'emergency').map((a: any) => (
        <View key={a.id} style={styles.emergencyBanner}>
          <Text style={styles.emergencyTitle}>⚠️ 紧急通知</Text>
          <Text style={styles.emergencyText}>{a.title}: {a.content}</Text>
        </View>
      ))}

      {/* ── AI Guide CTA ── */}
      <TouchableOpacity
        style={styles.aiCard}
        onPress={() => navigation.navigate('Chat')}
        activeOpacity={0.9}
      >
        <View style={styles.aiCardInner}>
          <View style={styles.aiAvatarRing}>
            <Text style={styles.aiAvatar}>🤖</Text>
          </View>
          <View style={styles.aiCardContent}>
            <Text style={styles.aiCardTitle}>AI 智能导览</Text>
            <Text style={styles.aiCardSubtitle}>语音对话 · 数字人讲解 · 实时问答</Text>
          </View>
          <View style={styles.aiArrow}>
            <Text style={styles.aiArrowText}>▸</Text>
          </View>
        </View>
        <View style={styles.aiCardGlow} />
      </TouchableOpacity>

      {/* ── Quick Actions ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>快捷服务</Text>
        <View style={styles.quickGrid}>
          {[
            { label: '景点列表', icon: '🏛', screen: 'Scenic', desc: '浏览名胜' },
            { label: '景区地图', icon: '🗺️', screen: 'Map', desc: '导览导航' },
            { label: '拍照识景', icon: '📷', screen: 'Chat', desc: '一键识别' },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickItem}
              onPress={() => navigation.navigate(action.screen)}
            >
              <View style={styles.quickIconWrap}>
                <Text style={styles.quickIcon}>{action.icon}</Text>
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
              <Text style={styles.quickDesc}>{action.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Announcements ── */}
      {announcements.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>📢 景区公告</Text>
            <TouchableOpacity>
              <Text style={styles.sectionMore}>更多 ›</Text>
            </TouchableOpacity>
          </View>
          {announcements.slice(0, 3).map((a: any, i: number) => (
            <View key={a.id} style={[styles.announceCard, i === 0 && styles.announceCardFirst]}>
              <View style={styles.announceDot} />
              <View style={styles.announceContent}>
                <Text style={styles.announceTitle}>{a.title}</Text>
                <Text style={styles.announceText} numberOfLines={2}>{a.content}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Hot Spots ── */}
      <View style={[styles.section, styles.sectionLast]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>🔥 热门景点</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Scenic')}>
            <Text style={styles.sectionMore}>全部 ›</Text>
          </TouchableOpacity>
        </View>
        {hotSpots.map((spot: any, i: number) => (
          <TouchableOpacity
            key={spot.id}
            style={styles.spotCard}
            onPress={() => navigation.navigate('ScenicDetail', { spotId: spot.id })}
          >
            <View style={styles.spotRank}>
              <Text style={styles.spotRankNum}>{i + 1}</Text>
            </View>
            <View style={styles.spotInfo}>
              <View style={styles.spotNameRow}>
                <Text style={styles.spotName}>{spot.name}</Text>
                {spot.level && <Text style={styles.spotLevel}>{spot.level}</Text>}
              </View>
              <Text style={styles.spotCategory}>{spot.category} · 开放时间 {spot.open_time || '全天'}</Text>
              <View style={styles.spotFooter}>
                <Text style={styles.spotPrice}>¥{spot.price || 0}</Text>
                <Text style={styles.spotStats}>👁 {spot.pv} · ⭐ {spot.score ?? '--'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },

  // Hero
  hero: {
    paddingTop: 60, paddingBottom: 36, paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.goldDark,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroPattern: {
    position: 'absolute', top: -20, right: -20,
    opacity: 0.08,
  },
  heroDecoration: { fontSize: 180, color: Colors.goldLight },
  heroContent: { alignItems: 'center' },
  heroTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: 4 },
  heroSubtitle: { fontSize: 14, color: Colors.goldLight, marginTop: Spacing.sm, letterSpacing: 2 },
  heroBadge: {
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: BorderRadius.full,
  },
  heroBadgeText: { fontSize: 12, color: Colors.goldLight, fontWeight: '500' },

  // Emergency
  emergencyBanner: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.lg,
    padding: Spacing.lg, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.vermilionLight,
    borderLeftWidth: 4, borderLeftColor: Colors.vermilion,
  },
  emergencyTitle: { fontSize: 14, fontWeight: '700', color: Colors.vermilion, marginBottom: 4 },
  emergencyText: { fontSize: 13, color: Colors.vermilion, lineHeight: 20 },

  // AI Card
  aiCard: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.xl,
    borderRadius: BorderRadius.xl, backgroundColor: Colors.white,
    ...Shadows.lg, overflow: 'hidden',
  },
  aiCardInner: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.xl,
  },
  aiCardGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: Colors.gold,
  },
  aiAvatarRing: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.goldLight,
  },
  aiAvatar: { fontSize: 32 },
  aiCardContent: { flex: 1, marginLeft: Spacing.lg },
  aiCardTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink, marginBottom: 4 },
  aiCardSubtitle: { fontSize: 13, color: Colors.textSecondary },
  aiArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center',
  },
  aiArrowText: { fontSize: 18, color: Colors.gold, fontWeight: '600' },

  // Section
  section: { marginTop: Spacing.xxl, paddingHorizontal: Spacing.lg },
  sectionLast: { paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.md,
  },
  sectionLabel: { fontSize: 18, fontWeight: '700', color: Colors.ink },
  sectionMore: { fontSize: 13, color: Colors.gold, fontWeight: '500' },

  // Quick Grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickItem: {
    width: '47%' as any, alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl, paddingHorizontal: Spacing.md,
    ...Shadows.sm,
  },
  quickIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  quickIcon: { fontSize: 24 },
  quickLabel: { fontSize: 14, fontWeight: '600', color: Colors.ink, marginBottom: 2 },
  quickDesc: { fontSize: 11, color: Colors.textMuted },

  // Announcements
  announceCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  announceCardFirst: {
    borderLeftWidth: 3, borderLeftColor: Colors.gold,
  },
  announceDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.goldLight, marginTop: 6, marginRight: Spacing.md,
  },
  announceContent: { flex: 1 },
  announceTitle: { fontSize: 14, fontWeight: '600', color: Colors.ink, marginBottom: 2 },
  announceText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  // Spot cards
  spotCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  spotRank: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  spotRankNum: { fontSize: 16, fontWeight: '700', color: Colors.gold },
  spotInfo: { flex: 1 },
  spotNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  spotName: { fontSize: 16, fontWeight: '600', color: Colors.ink },
  spotLevel: {
    fontSize: 10, fontWeight: '700', color: Colors.vermilion,
    backgroundColor: Colors.vermilionLight,
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4,
  },
  spotCategory: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  spotFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spotPrice: { fontSize: 17, fontWeight: '700', color: Colors.vermilion },
  spotStats: { fontSize: 11, color: Colors.textMuted },
});
