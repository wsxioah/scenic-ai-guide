import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, StatusBar, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { REGIONS, ALL_PLACES, Place } from '../data/lingshanRegions';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme';

type RouteStep = 'start' | 'end';

const PLACE_ICON_RULES: [RegExp, string][] = [
  [/大佛|佛足|观音|弥勒/, 'hands-pray'],
  [/寺|庙|殿|堂|阁|宫|塔|庵/, 'bank'],
  [/桥/, 'bridge'],
  [/池|泉|湖|井/, 'water'],
  [/树|柏|银杏|林/, 'pine-tree'],
  [/车|站/, 'bus'],
  [/售货/, 'cart'],
  [/客栈|酒店|精舍/, 'bed'],
  [/门|入口/, 'door'],
  [/卫生|厕/, 'toilet'],
  [/停车/, 'parking'],
  [/餐|美食/, 'silverware-fork-knife'],
];

function placeIcon(name: string): string {
  for (const [re, icon] of PLACE_ICON_RULES) {
    if (re.test(name)) return icon;
  }
  return 'map-marker';
}

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const [selectedRegionId, setSelectedRegionId] = useState(REGIONS[0]?.id ?? '');
  const [keyword, setKeyword] = useState('');
  const [isRouteMode, setIsRouteMode] = useState(false);
  const [routeStep, setRouteStep] = useState<RouteStep>('start');
  const [routeStart, setRouteStart] = useState<Place | null>(null);
  const [routeEnd, setRouteEnd] = useState<Place | null>(null);

  const searching = keyword.trim().length > 0;

  const rightPlaces: Place[] = useMemo(() => {
    if (searching) {
      const kw = keyword.trim();
      return ALL_PLACES.filter(p => p.name.includes(kw));
    }
    return REGIONS.find(r => r.id === selectedRegionId)?.places ?? [];
  }, [searching, keyword, selectedRegionId]);

  const goToPlace = (place: Place) => {
    if (isRouteMode) {
      if (routeStep === 'start') {
        setRouteStart(place);
        setRouteStep('end');
      } else {
        setRouteEnd(place);
      }
    } else {
      navigation.navigate('Main', {
        screen: 'Map',
        params: { focus: { lat: place.lat, lng: place.lng, name: place.name, ts: Date.now() } },
      });
    }
  };

  const goNavigate = () => {
    if (!routeStart || !routeEnd) return;
    navigation.navigate('Main', {
      screen: 'Map',
      params: {
        routeNav: {
          start: { lat: routeStart.lat, lng: routeStart.lng, name: routeStart.name },
          end: { lat: routeEnd.lat, lng: routeEnd.lng, name: routeEnd.name },
        },
        ts: Date.now(),
      },
    });
    setIsRouteMode(false);
    setRouteStep('start');
    setRouteStart(null);
    setRouteEnd(null);
  };

  const SCENIC_CENTER = { lat: 31.431031, lng: 120.106595 };

  const useMyLocation = () => {
    setRouteStart({ id: '__myloc__', name: '我的位置（景区中心）', lat: SCENIC_CENTER.lat, lng: SCENIC_CENTER.lng });
    setRouteStep('end');
  };

  const resetRoute = () => {
    setRouteStep('start');
    setRouteStart(null);
    setRouteEnd(null);
    setIsRouteMode(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header: back + search input */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={Colors.ink} />
        </TouchableOpacity>
        <View style={styles.searchInputWrap}>
          <Ionicons name={isRouteMode ? 'navigate' : 'search'} size={17} color={Colors.goldDark} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={isRouteMode ? `搜索${routeStep === 'start' ? '起点' : '终点'}...` : '请输入搜索地点'}
            placeholderTextColor={Colors.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            autoFocus
            returnKeyType="search"
          />
          {searching && (
            <TouchableOpacity onPress={() => setKeyword('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Route mode segmented tabs */}
      <View style={styles.routeBar}>
        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segmentTab, !isRouteMode && styles.segmentTabActive]}
            onPress={resetRoute}
          >
            <Ionicons name="search" size={14} color={!isRouteMode ? '#FFFFFF' : Colors.textSecondary} />
            <Text style={[styles.segmentTabText, !isRouteMode && styles.segmentTabTextActive]}>搜索</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentTab, isRouteMode && styles.segmentTabActive]}
            onPress={() => setIsRouteMode(true)}
          >
            <Ionicons name="navigate" size={14} color={isRouteMode ? '#FFFFFF' : Colors.textSecondary} />
            <Text style={[styles.segmentTabText, isRouteMode && styles.segmentTabTextActive]}>路线导航</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Route selection status */}
      {isRouteMode && (
        <View style={styles.routeStatus}>
          <View style={styles.routeTimeline}>
            <View style={styles.routeStepRow}>
              <View style={[styles.routeDotRing, { borderColor: Colors.jade }]}>
                <View style={[styles.routeDotCore, { backgroundColor: Colors.jade }]} />
              </View>
              <View style={styles.routeStepBody}>
                <Text style={styles.routeStepLabel}>起点</Text>
                <Text style={styles.routeStepName} numberOfLines={1}>
                  {routeStart ? routeStart.name : '点击下方地点选择起点'}
                </Text>
              </View>
              {!routeStart && (
                <TouchableOpacity style={styles.myLocBtn} onPress={useMyLocation}>
                  <Ionicons name="locate" size={13} color="#FFFFFF" />
                  <Text style={styles.myLocBtnText}>我的位置</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.routeConnector} />
            <View style={styles.routeStepRow}>
              <View style={[styles.routeDotRing, { borderColor: Colors.vermilion }]}>
                <View style={[styles.routeDotCore, { backgroundColor: Colors.vermilion }]} />
              </View>
              <View style={styles.routeStepBody}>
                <Text style={styles.routeStepLabel}>终点</Text>
                <Text style={styles.routeStepName} numberOfLines={1}>
                  {routeEnd ? routeEnd.name : routeStep === 'end' ? '点击下方地点选择终点' : '请先选择起点'}
                </Text>
              </View>
            </View>
          </View>
          {routeStart && routeEnd && (
            <TouchableOpacity style={styles.navBtn} onPress={goNavigate} activeOpacity={0.85}>
              <Ionicons name="navigate" size={17} color="#FFFFFF" />
              <Text style={styles.navBtnText}>开始导航</Text>
              <Text style={styles.navBtnSub}>{routeStart.name} → {routeEnd.name}</Text>
            </TouchableOpacity>
          )}
          {(routeStart || routeEnd) && (
            <TouchableOpacity style={styles.routeResetBtn} onPress={() => { setRouteStep('start'); setRouteStart(null); setRouteEnd(null); }}>
              <Text style={styles.routeResetText}>重置路线</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
          <View style={styles.rightHeaderRow}>
            <Text style={styles.rightHeader}>
              {searching ? '搜索结果' : REGIONS.find(r => r.id === selectedRegionId)?.name}
            </Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{rightPlaces.length}</Text>
            </View>
          </View>
          <FlatList
            data={rightPlaces}
            keyExtractor={(p) => p.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => {
              const isStart = routeStart?.id === item.id;
              const isEnd = routeEnd?.id === item.id;
              const isSelected = isStart || isEnd;
              return (
                <TouchableOpacity
                  style={[styles.placeItem, isSelected && styles.placeItemSelected]}
                  onPress={() => goToPlace(item)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.placeIconTile,
                    isStart && { backgroundColor: Colors.jadeLight },
                    isEnd && { backgroundColor: Colors.vermilionLight },
                  ]}>
                    <MaterialCommunityIcons
                      name={placeIcon(item.name) as any}
                      size={18}
                      color={isStart ? Colors.jade : isEnd ? Colors.vermilion : Colors.goldDark}
                    />
                  </View>
                  <Text style={styles.placeName}>{item.name}</Text>
                  {isRouteMode ? (
                    <View style={[
                      styles.placeActionPill,
                      { borderColor: routeStep === 'start' ? Colors.jade : Colors.vermilion },
                    ]}>
                      <Text style={[styles.placeActionText, { color: routeStep === 'start' ? Colors.jade : Colors.vermilion }]}>
                        {isStart ? '已选起点' : isEnd ? '已选终点' : routeStep === 'start' ? '设为起点' : '设为终点'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.placeGoPill}>
                      <Text style={styles.placeGoText}>导航</Text>
                      <Ionicons name="chevron-forward" size={12} color={Colors.goldDark} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="search" size={40} color={Colors.textMuted} />
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
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full,
    paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.divider,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 15, color: Colors.text },

  // Segmented tabs
  routeBar: {
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  segmented: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full, padding: 3,
  },
  segmentTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: BorderRadius.full,
  },
  segmentTabActive: { backgroundColor: Colors.goldDark, ...Shadows.sm },
  segmentTabText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  segmentTabTextActive: { color: '#FFFFFF', fontWeight: '700' },

  // Route status
  routeStatus: {
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  routeTimeline: { paddingLeft: 2 },
  routeStepRow: { flexDirection: 'row', alignItems: 'center' },
  routeDotRing: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, marginRight: 10,
  },
  routeDotCore: { width: 8, height: 8, borderRadius: 4 },
  routeConnector: {
    width: 1.5, height: 14, backgroundColor: Colors.divider,
    marginLeft: 10, marginVertical: 2,
  },
  routeStepBody: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  routeStepLabel: { fontSize: 12, fontWeight: '700', color: Colors.ink, width: 28 },
  routeStepName: { flex: 1, fontSize: 13, color: Colors.text },
  myLocBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full,
    backgroundColor: Colors.jade, marginLeft: 6,
  },
  myLocBtnText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
  navBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: BorderRadius.md,
    backgroundColor: Colors.goldDark, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6, ...Shadows.md,
  },
  navBtnText: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },
  navBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  routeResetBtn: { alignItems: 'center', paddingVertical: 8, marginTop: 2 },
  routeResetText: { fontSize: 12, color: Colors.textMuted },

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
  rightHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  rightHeader: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  countPill: {
    backgroundColor: Colors.goldSurface, borderRadius: BorderRadius.full,
    paddingHorizontal: 8, paddingVertical: 1,
    borderWidth: 1, borderColor: Colors.goldLight,
  },
  countPillText: { fontSize: 11, fontWeight: '700', color: Colors.goldDark },
  placeItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  placeItemSelected: {
    backgroundColor: Colors.goldSurface,
    marginHorizontal: -8, paddingHorizontal: 8,
    borderRadius: 10,
  },
  placeIconTile: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  placeName: { flex: 1, fontSize: 15, color: Colors.text },
  placeGoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 1,
    paddingLeft: 8, paddingRight: 6, paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.goldSurface,
    borderWidth: 1, borderColor: Colors.goldLight,
  },
  placeGoText: { fontSize: 12, color: Colors.goldDark, fontWeight: '600' },
  placeActionPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  placeActionText: { fontSize: 11, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});
