import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, ScrollView,
  StyleSheet, RefreshControl, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme';

const CATEGORIES = ['全部', '自然', '人文', '历史', '宗教'];

const CATEGORY_ICONS: Record<string, string> = {
  '全部': 'apps', '自然': 'pine-tree', '人文': 'bank', '历史': 'castle', '宗教': 'hands-pray',
};

const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  '自然': { bg: Colors.jadeLight, fg: Colors.jade },
  '人文': { bg: Colors.goldLight, fg: Colors.goldDark },
  '历史': { bg: Colors.vermilionLight, fg: Colors.vermilion },
  '宗教': { bg: Colors.lapisLight, fg: Colors.lapis },
};
const DEFAULT_CAT_COLOR = { bg: Colors.goldSurface, fg: Colors.goldDark };

export default function ScenicListScreen() {
  const navigation = useNavigation<any>();
  const [spots, setSpots] = useState<any[]>([]);
  const [category, setCategory] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSpots = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page_size: '20', sort };
      if (category !== '全部') params.category = category;
      if (keyword.trim()) params.keyword = keyword;
      const data = await api.getSpots(params);
      setSpots(data.items || []);
    } catch {
      setError('加载失败，请检查网络后重试');
    }
    setLoading(false);
  };

  useEffect(() => { loadSpots(); }, [category, sort]);

  const renderSkeleton = () => (
    <View>
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.cardThumb, styles.skeletonBlock]} />
            <View style={styles.cardBody}>
              <View style={[styles.skeletonLine, { width: '55%' }]} />
              <View style={[styles.skeletonLine, { width: '92%' }]} />
              <View style={[styles.skeletonLine, { width: '78%' }]} />
              <View style={[styles.skeletonLine, { width: '40%', marginBottom: 0 }]} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderSpot = ({ item, index }: { item: any; index: number }) => {
    const catColor = CATEGORY_COLORS[item.category] || DEFAULT_CAT_COLOR;
    const catIcon = CATEGORY_ICONS[item.category] || 'bank';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ScenicDetail', { spotId: item.id })}
        activeOpacity={0.9}
      >
        <View style={styles.cardRow}>
          {/* 左侧分类色块 */}
          <View style={[styles.cardThumb, { backgroundColor: catColor.bg }]}>
            <MaterialCommunityIcons name={catIcon as any} size={30} color={catColor.fg} />
            <View style={[styles.cardThumbRank, index < 3 && styles.cardThumbRankTop]}>
              <Text style={[styles.cardThumbRankText, index < 3 && styles.cardThumbRankTextTop]}>
                {index + 1}
              </Text>
            </View>
          </View>
          {/* 右侧内容 */}
          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{item.level || '景区'}</Text>
              </View>
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardPrice}>¥{item.price || 0}</Text>
              <View style={styles.cardStatsRow}>
                <Ionicons name="eye" size={11} color={Colors.textMuted} />
                <Text style={styles.cardStats}> {item.pv}   </Text>
                <Ionicons name="star" size={11} color={Colors.warning} />
                <Text style={styles.cardStats}> {item.score ?? '--'}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.paper} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSeal}>
          <Text style={styles.headerSealText}>禅</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>景点列表</Text>
          <Text style={styles.headerSub}>探索灵山胜境</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索景点..."
            placeholderTextColor={Colors.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={loadSpots}
          />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={loadSpots}>
          <Text style={styles.searchBtnText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.catRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: 8 }}
        >
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.catChip, category === item && styles.catChipActive]}
              onPress={() => setCategory(item)}
            >
              <MaterialCommunityIcons
                name={(CATEGORY_ICONS[item] || 'bank') as any}
                size={14}
                color={category === item ? '#FFFFFF' : Colors.textSecondary}
              />
              <Text style={[styles.catText, category === item && styles.catTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort */}
      <View style={styles.sortRow}>
        {[
          { key: 'default', label: '综合排序', icon: null },
          { key: 'hot', label: '最热', icon: 'fire' },
          { key: 'score', label: '评分', icon: 'star' },
        ].map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sortBtn, sort === s.key && styles.sortBtnActive]}
            onPress={() => setSort(s.key)}
          >
            {s.icon && (
              <MaterialCommunityIcons
                name={s.icon as any}
                size={12}
                color={sort === s.key ? '#FFFFFF' : Colors.textSecondary}
              />
            )}
            <Text style={[styles.sortBtnText, sort === s.key && styles.sortBtnTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.sortCount}>共 {spots.length} 个景点</Text>
      </View>

      {/* List */}
      {loading && spots.length === 0 ? (
        <ScrollView contentContainerStyle={styles.listContent}>{renderSkeleton()}</ScrollView>
      ) : error ? (
        <View style={styles.empty}>
          <Ionicons name="cloud-offline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadSpots}>
            <Text style={styles.retryBtnText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={spots}
          renderItem={renderSpot}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSpots} tintColor={Colors.gold} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="image-filter-hdr" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>暂无景点数据</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 50, paddingBottom: 16, paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  headerSeal: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.goldDark,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.sm,
  },
  headerSealText: { fontSize: 22, fontWeight: '700', color: Colors.goldLight },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.ink },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  // Search
  searchBar: {
    flexDirection: 'row', padding: Spacing.md, gap: 8,
    backgroundColor: Colors.white,
  },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.divider,
  },
  searchInput: {
    flex: 1, paddingVertical: 10, fontSize: 15, color: Colors.text,
  },
  searchBtn: {
    backgroundColor: Colors.goldDark, borderRadius: BorderRadius.md,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  searchBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  // Categories
  catRow: { height: 48, backgroundColor: Colors.white, justifyContent: 'center' },
  catChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface, marginRight: 8, gap: 6,
  },
  catChipActive: { backgroundColor: Colors.goldDark },
  catText: { fontSize: 13, color: Colors.textSecondary },
  catTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // Sort
  sortRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    gap: 8,
  },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadius.full,
    backgroundColor: Colors.white, ...Shadows.sm,
  },
  sortBtnActive: { backgroundColor: Colors.goldDark },
  sortBtnText: { fontSize: 12, color: Colors.textSecondary },
  sortBtnTextActive: { color: '#FFFFFF', fontWeight: '600' },
  sortCount: { marginLeft: 'auto', fontSize: 12, color: Colors.textMuted },

  // List
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  cardRow: { flexDirection: 'row', gap: 12 },
  cardThumb: {
    width: 76, height: 76, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  cardThumbRank: {
    position: 'absolute', top: -6, left: -6,
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.goldSurface,
    borderWidth: 1, borderColor: Colors.goldLight,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cardThumbRankTop: { backgroundColor: Colors.goldDark, borderColor: Colors.goldDark },
  cardThumbRankText: { fontSize: 11, fontWeight: '700', color: Colors.goldDark },
  cardThumbRankTextTop: { color: '#FFFFFF' },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  levelBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4, backgroundColor: Colors.vermilionLight,
  },
  levelText: { fontSize: 10, fontWeight: '700', color: Colors.vermilion },

  cardName: { fontSize: 16, fontWeight: '700', color: Colors.ink, flex: 1, marginRight: 8 },
  cardDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 17, fontWeight: '700', color: Colors.vermilion },
  cardStatsRow: { flexDirection: 'row', alignItems: 'center' },
  cardStats: { fontSize: 12, color: Colors.textMuted },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted },
  retryBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: BorderRadius.full, backgroundColor: Colors.goldDark,
  },
  retryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Skeleton
  skeletonBlock: { backgroundColor: Colors.surface },
  skeletonLine: {
    height: 12, borderRadius: 6, backgroundColor: Colors.surface,
    marginBottom: 10,
  },
});
