import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';

const CATEGORIES = ['全部', '自然', '人文', '历史', '宗教'];

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

  useEffect(() => {
    loadSpots();
  }, [category, sort]);

  const renderSpot = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ScenicDetail', { spotId: item.id })}
    >
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardCategory}>
          {item.category} · {item.level || '景区'}
        </Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>¥{item.price || 0}</Text>
          <Text style={styles.cardPv}>👁 {item.pv} · ⭐ {item.score}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索景点..."
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={loadSpots}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={loadSpots}>
          <Text style={styles.searchBtnText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <FlatList
        horizontal
        data={CATEGORIES}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catChip, category === item && styles.catChipActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.catText, category === item && styles.catTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
        style={styles.catList}
        showsHorizontalScrollIndicator={false}
      />

      {/* Sort */}
      <View style={styles.sortRow}>
        {[
          { key: 'default', label: '默认' },
          { key: 'hot', label: '最热' },
          { key: 'score', label: '评分' },
        ].map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sortBtn, sort === s.key && styles.sortBtnActive]}
            onPress={() => setSort(s.key)}
          >
            <Text style={[styles.sortBtnText, sort === s.key && styles.sortBtnTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={spots}
        renderItem={renderSpot}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSpots} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>暂无景点数据</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchBar: { flexDirection: 'row', padding: 12, gap: 8, paddingTop: 50 },
  searchInput: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchBtn: {
    backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchBtnText: { color: '#FFFFFF', fontWeight: '600' },
  catList: { maxHeight: 44, paddingHorizontal: 12 },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F3F4F6', marginRight: 8,
  },
  catChipActive: { backgroundColor: '#DBEAFE' },
  catText: { fontSize: 13, color: '#6B7280' },
  catTextActive: { color: '#2563EB', fontWeight: '600' },
  sortRow: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 8, marginBottom: 8, gap: 8 },
  sortBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6' },
  sortBtnActive: { backgroundColor: '#2563EB' },
  sortBtnText: { fontSize: 12, color: '#6B7280' },
  sortBtnTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: 12 },
  card: {
    backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#F3F4F6',
  },
  cardInfo: {},
  cardName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  cardCategory: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  cardDesc: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardPrice: { fontSize: 16, fontWeight: '700', color: '#2563EB' },
  cardPv: { fontSize: 12, color: '#9CA3AF' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: '#9CA3AF' },
});
