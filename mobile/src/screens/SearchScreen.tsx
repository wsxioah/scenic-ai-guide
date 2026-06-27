import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, StatusBar, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { REGIONS, ALL_PLACES, Place } from '../data/lingshanRegions';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme';

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const [selectedRegionId, setSelectedRegionId] = useState(REGIONS[0]?.id ?? '');
  const [keyword, setKeyword] = useState('');

  const searching = keyword.trim().length > 0;

  const rightPlaces: Place[] = useMemo(() => {
    if (searching) {
      const kw = keyword.trim();
      return ALL_PLACES.filter(p => p.name.includes(kw));
    }
    return REGIONS.find(r => r.id === selectedRegionId)?.places ?? [];
  }, [searching, keyword, selectedRegionId]);

  const goToPlace = (place: Place) => {
    navigation.navigate('Main', {
      screen: 'Map',
      params: { focus: { lat: place.lat, lng: place.lng, name: place.name, ts: Date.now() } },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header: back + search input */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.searchInputWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="请输入搜索地点"
            placeholderTextColor={Colors.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            autoFocus
            returnKeyType="search"
          />
          {searching && (
            <TouchableOpacity onPress={() => setKeyword('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Two-pane body */}
      <View style={styles.body}>
        {/* Left: 大区域 */}
        <View style={styles.leftPane}>
          <FlatList
            data={REGIONS}
            keyExtractor={(r) => r.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = !searching && item.id === selectedRegionId;
              return (
                <TouchableOpacity
                  style={[styles.regionItem, active && styles.regionItemActive]}
                  onPress={() => { setKeyword(''); setSelectedRegionId(item.id); }}
                >
                  {active && <View style={styles.regionBar} />}
                  <Text style={[styles.regionText, active && styles.regionTextActive]} numberOfLines={2}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Right: 具体区域 */}
        <View style={styles.rightPane}>
          <Text style={styles.rightHeader}>
            {searching ? `搜索结果 (${rightPlaces.length})` : REGIONS.find(r => r.id === selectedRegionId)?.name}
          </Text>
          <FlatList
            data={rightPlaces}
            keyExtractor={(p) => p.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.placeItem} onPress={() => goToPlace(item)}>
                <Text style={styles.placePin}>📍</Text>
                <Text style={styles.placeName}>{item.name}</Text>
                <Text style={styles.placeGo}>导航 ›</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>未找到相关地点</Text>
              </View>
            }
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: Spacing.md, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  backBtn: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 30, color: Colors.ink, lineHeight: 32 },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full,
    paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.divider,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 15, color: Colors.text },
  clearIcon: { fontSize: 13, color: Colors.textMuted, paddingLeft: 6 },

  body: { flex: 1, flexDirection: 'row' },

  leftPane: { width: 110, backgroundColor: Colors.surface },
  regionItem: {
    paddingVertical: 16, paddingHorizontal: 12, justifyContent: 'center',
  },
  regionItemActive: { backgroundColor: Colors.white },
  regionBar: {
    position: 'absolute', left: 0, top: 12, bottom: 12, width: 3,
    backgroundColor: Colors.gold, borderTopRightRadius: 2, borderBottomRightRadius: 2,
  },
  regionText: { fontSize: 14, color: Colors.textSecondary },
  regionTextActive: { color: Colors.goldDark, fontWeight: '700' },

  rightPane: { flex: 1, backgroundColor: Colors.white, paddingHorizontal: Spacing.lg },
  rightHeader: {
    fontSize: 13, fontWeight: '700', color: Colors.ink,
    paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  placeItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  placePin: { fontSize: 15, marginRight: 10 },
  placeName: { flex: 1, fontSize: 15, color: Colors.text },
  placeGo: { fontSize: 13, color: Colors.gold, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});
