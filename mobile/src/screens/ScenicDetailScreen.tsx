import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import { useUserStore } from '../stores/userStore';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme';

const CATEGORY_ICONS: Record<string, string> = {
  '自然': 'pine-tree', '人文': 'bank', '历史': 'castle', '宗教': 'hands-pray',
};

export default function ScenicDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { spotId } = route.params;
  const { userId, isLoggedIn } = useUserStore();

  const [spot, setSpot] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    loadData();
  }, [spotId]);

  const loadData = async () => {
    try {
      const [spotData, commentsData] = await Promise.allSettled([
        api.getSpotDetail(spotId),
        api.getComments(spotId),
      ]);
      if (spotData.status === 'fulfilled') setSpot(spotData.value);
      if (commentsData.status === 'fulfilled') setComments(commentsData.value || []);
    } catch {}
  };

  useEffect(() => {
    if (spot && isLoggedIn) {
      api.trackView(spot.id, spot.name).catch(() => {});
      api.getFavorites().then((favs: any[]) => {
        const faved = favs.some((f: any) => f.spot_id === spot.id);
        setIsFavorited(faved);
      }).catch(() => {});
    }
  }, [spot, isLoggedIn]);

  const toggleFavorite = async () => {
    if (!isLoggedIn) return;
    try {
      const res: any = await api.toggleFavorite(spot.id);
      setIsFavorited(res.favorited);
    } catch {}
  };

  const askAI = () => {
    navigation.navigate('Chat');
  };

  if (!spot) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.paper} />
        <View style={styles.loadingRing}>
          <MaterialCommunityIcons name="image-filter-hdr" size={36} color={Colors.goldDark} />
        </View>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.paper} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero image placeholder */}
        <View style={styles.heroPlaceholder}>
          <View style={styles.heroPattern}>
            <Text style={styles.heroDecoration}>卍</Text>
          </View>
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />
          <View style={styles.heroIconRing}>
            <View style={styles.heroIconInner}>
              <MaterialCommunityIcons
                name={(CATEGORY_ICONS[spot.category] || 'bank') as any}
                size={38}
                color={Colors.goldLight}
              />
            </View>
          </View>
          <Text style={styles.heroName}>{spot.name}</Text>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{spot.name}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{spot.level || '景区'}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {spot.category && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{spot.category}</Text>
              </View>
            )}
            <Text style={styles.metaText}>{spot.open_time || '全天开放'}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>门票</Text>
            <Text style={styles.price}>¥{spot.price || 0}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.addressRow}>
            <Ionicons name="location" size={14} color={Colors.vermilion} style={{ marginRight: 6 }} />
            <Text style={styles.address}>{spot.address || '灵山胜境景区内'}</Text>
          </View>

          <Text style={styles.sectionLabel}>景点介绍</Text>
          <Text style={styles.description}>{spot.description}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statValueRow}>
                <Ionicons name="eye" size={14} color={Colors.text} />
                <Text style={styles.statValue}> {spot.pv || 0}</Text>
              </View>
              <Text style={styles.statLabel}>浏览</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statValueRow}>
                <Ionicons name="star" size={14} color={Colors.warning} />
                <Text style={styles.statValue}> {spot.score ?? '--'}</Text>
              </View>
              <Text style={styles.statLabel}>评分</Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={askAI}>
            <View style={[styles.actionIconWrap, styles.actionIconWrapPrimary]}>
              <MaterialCommunityIcons name="robot-excited" size={22} color="#FFFFFF" />
            </View>
            <Text style={[styles.actionLabel, styles.actionLabelPrimary]}>AI 讲解</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Community', { spotId })}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="chatbubbles" size={22} color={Colors.goldDark} />
            </View>
            <Text style={styles.actionLabel}>游客评论</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={toggleFavorite}>
            <View style={styles.actionIconWrap}>
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorited ? Colors.vermilion : Colors.goldDark}
              />
            </View>
            <Text style={styles.actionLabel}>{isFavorited ? '已收藏' : '收藏'}</Text>
          </TouchableOpacity>
        </View>

        {/* Comments */}
        <View style={styles.commentSection}>
          <View style={styles.commentSectionHeader}>
            <Text style={styles.commentSectionTitle}>游客评论</Text>
            <Text style={styles.commentCount}>{comments.length} 条</Text>
          </View>
          {comments.length === 0 ? (
            <View style={styles.noComments}>
              <Ionicons name="chatbubbles-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.noCommentsText}>暂无评论，快来第一个评论吧</Text>
            </View>
          ) : (
            comments.map((c: any) => (
              <View key={c.id} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentUserRow}>
                    <View style={styles.commentAvatar}>
                      <Ionicons name="person" size={14} color={Colors.goldDark} />
                    </View>
                    <Text style={styles.commentUser}>游客</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 1 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Ionicons key={s} name="star" size={11} color={s <= (c.rating || 5) ? Colors.warning : Colors.divider} />
                    ))}
                  </View>
                </View>
                <Text style={styles.commentContent}>{c.content}</Text>
                <View style={styles.commentFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="thumbs-up-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.commentLikes}>{c.likes || 0}</Text>
                  </View>
                  <Text style={styles.commentDate}>{c.created_at?.slice(0, 10)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  scroll: { flex: 1 },

  // Loading
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.paper,
  },
  loadingRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
    borderWidth: 2, borderColor: Colors.goldLight,
  },
  loadingText: { fontSize: 15, color: Colors.textMuted },

  // Hero placeholder
  heroPlaceholder: {
    height: 220, backgroundColor: Colors.goldDark,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  heroPattern: { position: 'absolute', top: -20, right: -20, opacity: 0.1 },
  heroDecoration: { fontSize: 140, color: Colors.goldLight },
  heroCircle1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    borderWidth: 1, borderColor: 'rgba(245,236,215,0.18)',
    top: -70, left: -70,
  },
  heroCircle2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    borderWidth: 1, borderColor: 'rgba(245,236,215,0.12)',
    bottom: -50, right: 30,
  },
  heroIconRing: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(245,236,215,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(245,236,215,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroIconInner: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: {marginTop: Spacing.md, fontSize: 15, fontWeight: '600',
    color: Colors.goldLight, letterSpacing: 3,
  },

  // Info card
  infoCard: {
    marginHorizontal: Spacing.lg, marginTop: -20,
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, ...Shadows.lg,
  },
  nameRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.sm,
  },
  name: { fontSize: 22, fontWeight: '800', color: Colors.ink, flex: 1 },
  levelBadge: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: BorderRadius.sm, backgroundColor: Colors.vermilionLight,
  },
  levelText: { fontSize: 11, fontWeight: '700', color: Colors.vermilion },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  metaChip: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: BorderRadius.sm, backgroundColor: Colors.lapisLight,
  },
  metaChipText: { fontSize: 11, fontWeight: '600', color: Colors.lapis },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.md,
  },
  priceLabel: { fontSize: 13, color: Colors.textSecondary },
  price: { fontSize: 28, fontWeight: '800', color: Colors.vermilion },
  divider: { height: 1, backgroundColor: Colors.divider, marginBottom: Spacing.md },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  address: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: Colors.goldDark,
    marginBottom: Spacing.sm, letterSpacing: 1,
  },
  description: { fontSize: 15, color: Colors.text, lineHeight: 26, marginBottom: Spacing.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 24, backgroundColor: Colors.divider },
  statValueRow: { flexDirection: 'row', alignItems: 'center' },
  statValue: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Actions
  actions: {
    flexDirection: 'row', marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg, gap: 10,
  },
  actionBtn: {
    flex: 1, alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg, ...Shadows.sm,
  },
  actionBtnPrimary: { backgroundColor: Colors.goldDark },
  actionIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  actionIconWrapPrimary: { backgroundColor: 'rgba(255,255,255,0.2)' },
  actionLabel: { fontSize: 12, fontWeight: '600', color: Colors.text },
  actionLabelPrimary: { color: '#FFFFFF' },

  // Comments
  commentSection: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.xl,
  },
  commentSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', marginBottom: Spacing.md,
  },
  commentSectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink },
  commentCount: { fontSize: 13, color: Colors.textMuted },
  noComments: {
    alignItems: 'center', paddingVertical: Spacing.xxxl, gap: 8,
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  noCommentsText: { fontSize: 14, color: Colors.textMuted },
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
  commentUser: { fontSize: 14, fontWeight: '600', color: Colors.ink },
  commentContent: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  commentFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 0.5, borderTopColor: Colors.divider,
  },
  commentLikes: { fontSize: 12, color: Colors.textSecondary },
  commentDate: { fontSize: 12, color: Colors.textMuted },
});
