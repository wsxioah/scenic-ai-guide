import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, ScrollView,
  StyleSheet, RefreshControl, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme';

const CATEGORIES = ['全部', '自然', '人文', '历史', '宗教'];

const CATEGORY_ICONS: Record<string, string> = {
  '全部': '🏛', '自然': '🌿', '人文': '📜', '历史': '🏺', '宗教': '☸',
};

export default function ScenicListScreen() {
  const navigation = useNavigation<any>();
  const [spots, setSpots] = useState<any[]>([]);
  const [category, setCategory] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState('default');
  const [loading, setLoading] = useState(false);

  const loadSpots = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page_size: '20', sort };
      if (category !== '全部') params.category = category;
      if (keyword.trim()) params.keyword = keyword;
      const data = await api.getSpots(params);
      setSpots(data.items || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadSpots(); }, [category, sort]);

  const renderSpot = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ScenicDetail', { spotId: item.id })}
      activeOpacity={0.9}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardIndex}>
          <Text style={styles.cardIndexText}>{index + 1}</Text>
        </View>
        <View style={styles.cardBadges}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{item.level || '景区'}</Text>
          </View>
          {item.category && (
            <View style={styles.catBadge}>
              <Text style={styles.catBadgeText}>{item.category}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.cardName}>{item.name}</Text>
      <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardPrice}>¥{item.price || 0}</Text>
        <Text style={styles.cardStats}>👁 {item.pv} · ⭐ {item.score ?? '--'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.paper} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>景点列表</Text>
        <Text style={styles.headerSub}>探索灵山胜境</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
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
              <Text style={styles.catIcon}>{CATEGORY_ICONS[item]}</Text>
              <Text style={[styles.catText, category === item && styles.catTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort */}
      <View style={styles.sortRow}>
        {[
          { key: 'default', label: '综合排序' },
          { key: 'hot', label: '🔥 最热' },
          { key: 'score', label: '⭐ 评分' },
        ].map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sortBtn, sort === s.key && styles.sortBtnActive]}
            onPress={() => setSort(s.key)}
          >
            <Text style={[styles.sortBtnText, sort === s.key && styles.sortBtnTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.sortCount}>共 {spots.length} 个景点</Text>
      </View>

      {/* List */}
      <FlatList
        data={spots}
        renderItem={renderSpot}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSpots} tintColor={Colors.gold} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏔</Text>
            <Text style={styles.emptyText}>暂无景点数据</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },

  // Header
  header: {
    paddingTop: 50, paddingBottom: 16, paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
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
  searchIcon: { fontSize: 16, marginRight: 8 },
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
  catIcon: { fontSize: 14 },
  catText: { fontSize: 13, color: Colors.textSecondary },
  catTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // Sort
  sortRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    gap: 8,
  },
  sortBtn: {
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
    padding: Spacing.lg, marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardIndex: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center',
  },
  cardIndexText: { fontSize: 13, fontWeight: '700', color: Colors.goldDark },
  cardBadges: { flexDirection: 'row', gap: 6 },
  levelBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4, backgroundColor: Colors.vermilionLight,
  },
  levelText: { fontSize: 10, fontWeight: '700', color: Colors.vermilion },
  catBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4, backgroundColor: Colors.lapisLight,
  },
  catBadgeText: { fontSize: 10, fontWeight: '600', color: Colors.lapis },

  cardName: { fontSize: 17, fontWeight: '700', color: Colors.ink, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 18, fontWeight: '700', color: Colors.vermilion },
  cardStats: { fontSize: 12, color: Colors.textMuted },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted },
});
