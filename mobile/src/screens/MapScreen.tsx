import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Linking,
  Platform, ScrollView,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SERVER_URL } from '../config';

// ====== 灵山胜境 · 真实数据 ======
const LINGSHAN_CENTER = { lat: 31.431031, lng: 120.106595 }; // 九龙灌浴（景区中心，实采）

const FACILITIES: { id: string; name: string; lat: number; lng: number; kind: 'entrance' | 'restroom' | 'parking' | 'service' | 'food' }[] = [
  { id: 'f-wc-1', name: '卫生间 1', lat: 31.435991, lng: 120.103035, kind: 'restroom' },
  { id: 'f-wc-2', name: '卫生间 2', lat: 31.434377, lng: 120.103193, kind: 'restroom' },
  { id: 'f-wc-3', name: '卫生间 3', lat: 31.432876, lng: 120.104082, kind: 'restroom' },
  { id: 'f-wc-4', name: '卫生间 4', lat: 31.434905, lng: 120.108548, kind: 'restroom' },
  { id: 'f-wc-5', name: '卫生间 5', lat: 31.434571, lng: 120.108588, kind: 'restroom' },
  { id: 'f-wc-6', name: '卫生间 6', lat: 31.434981, lng: 120.109033, kind: 'restroom' },
  { id: 'f-wc-7', name: '卫生间 7', lat: 31.432848, lng: 120.110765, kind: 'restroom' },
  { id: 'f-wc-8', name: '卫生间 8', lat: 31.432353, lng: 120.107907, kind: 'restroom' },
  { id: 'f-wc-9', name: '卫生间 9', lat: 31.431132, lng: 120.109588, kind: 'restroom' },
  { id: 'f-wc-10', name: '卫生间 10', lat: 31.430474, lng: 120.105212, kind: 'restroom' },
  { id: 'f-wc-11', name: '卫生间 11', lat: 31.430343, lng: 120.105022, kind: 'restroom' },
  { id: 'f-wc-12', name: '卫生间 12', lat: 31.428328, lng: 120.107565, kind: 'restroom' },
  { id: 'f-wc-13', name: '卫生间 13', lat: 31.428134, lng: 120.109572, kind: 'restroom' },
  // 停车场
  { id: 'f-park-1', name: '停车场 P1', lat: 31.429737, lng: 120.103105, kind: 'parking' },
  { id: 'f-park-2', name: '停车场 P2', lat: 31.429423, lng: 120.103024, kind: 'parking' },
  { id: 'f-park-3', name: '停车场 P3', lat: 31.426428, lng: 120.110571, kind: 'parking' },
  { id: 'f-park-4', name: '停车场 P4', lat: 31.428069, lng: 120.110951, kind: 'parking' },
  { id: 'f-park-5', name: '停车场 P5', lat: 31.428064, lng: 120.112118, kind: 'parking' },
  { id: 'f-park-6', name: '停车场 P6', lat: 31.429769, lng: 120.111480, kind: 'parking' },
];

const QUICK_CATS: { kind: string; label: string }[] = [
  { kind: 'entrance', label: '🚪 出入口' },
  { kind: 'restroom', label: '🚻 卫生间' },
  { kind: 'parking', label: '🅿️ 停车场' },
  { kind: 'food', label: '🍜 餐饮' },
  { kind: 'service', label: '🏠 服务中心' },
];

const SCENIC_SPOTS: { id: string; name: string; lat: number; lng: number; category: string; desc: string }[] = [
  { id: 'LS-001', name: '灵山大照壁', lat: 31.427588, lng: 120.108884, category: '人文', desc: '长39.8m，赵朴初亲笔题词"灵山胜境"，景区首道打卡点' },
  { id: 'LS-002', name: '五明桥', lat: 31.428266, lng: 120.108441, category: '宗教', desc: '5座汉白玉石拱桥，代表佛教五种智慧：声明、因明、内明、医方明、工巧明' },
  { id: 'LS-003', name: '佛足坛', lat: 31.428944, lng: 120.107998, category: '宗教', desc: '巨型青铜佛足印一对，足心刻有32种吉祥瑞相，象征"佛足所至，佛光普照"' },
  { id: 'LS-004', name: '五智门', lat: 31.429252, lng: 120.107724, category: '宗教', desc: '高16.8m石牌坊，五门象征五方五佛，六柱代表六度波罗蜜' },
  { id: 'LS-005', name: '菩提大道', lat: 31.430483, lng: 120.106939, category: '自然', desc: '长约250m，两侧对称种植印度引种正宗菩提树，形成天然禅意拱廊' },
  { id: 'LS-006', name: '九龙灌浴', lat: 31.431031, lng: 120.106595, category: '宗教', desc: '总高27.2m大型音乐动态群雕，"花开见佛，九龙沐浴"，每日10:00起多场演出' },
  { id: 'LS-007', name: '降魔浮雕', lat: 31.431973, lng: 120.105964, category: '宗教', desc: '长26m花岗岩巨型浮雕，再现佛陀降魔成道场景' },
  { id: 'LS-008', name: '阿育王柱', lat: 31.432392, lng: 120.105676, category: '人文', desc: '通高16.9m，重180吨整块花岗岩柱，四狮柱头象征佛法向世界传播' },
  { id: 'LS-009', name: '百子戏弥勒', lat: 31.433418, lng: 120.105214, category: '人文', desc: '高3m青铜群雕，弥勒笑容可掬，百名孩童形态各异，亲子热门打卡点' },
  { id: 'LS-010', name: '祥符禅寺', lat: 31.434278, lng: 120.104392, category: '宗教', desc: '唐代古刹，玄奘弟子窥基大师开创，千年银杏与12.8吨祥符禅钟闻名' },
  { id: 'LS-011', name: '灵山大佛', lat: 31.436400, lng: 120.102894, category: '宗教', desc: '高88m，世界最高露天青铜释迦牟尼立像，耗铜725吨，五方五佛之东方佛' },
  { id: 'LS-012', name: '佛教文化博览馆', lat: 31.436030, lng: 120.103147, category: '人文', desc: '大佛座基内三层展馆，万佛殿9999尊小佛，免费参观，8:00-17:00开放' },
  { id: 'LS-013', name: '灵山梵宫', lat: 31.434417, lng: 120.108853, category: '人文', desc: '建筑面积72000㎡，汇东阳木雕/琉璃/油画非遗艺术，"东方卢浮宫"，鲁班奖' },
  { id: 'LS-014', name: '五印坛城', lat: 31.430967, lng: 120.109462, category: '宗教', desc: '藏传佛教风格，四面环水，108转经筒长廊，9:00-17:00开放' },
  { id: 'LS-015', name: '曼飞龙塔', lat: 31.432372, lng: 120.111097, category: '人文', desc: '南传佛教白塔，九塔组合，复刻西双版纳曼飞龙白塔形制，夜景绝美' },
  { id: 'LS-016', name: '无尽意斋', lat: 31.434893, lng: 120.103241, category: '人文', desc: '赵朴初先生纪念馆，复刻北京四合院故居，禅茶免费品鉴，9:00-17:00' },
];

const RECOMMENDED_ROUTES = [
  {
    id: 'r1', title: '历史文化深度游', duration: '约6小时',
    desc: '南门→大照壁→五明桥→佛足坛→五智门→菩提大道→九龙灌浴→降魔浮雕→阿育王柱→百子戏弥勒→祥符禅寺→灵山大佛→梵宫→五印坛城→出口',
    spots: ['LS-001', 'LS-002', 'LS-003', 'LS-004', 'LS-005', 'LS-006', 'LS-007', 'LS-008', 'LS-009', 'LS-010', 'LS-011', 'LS-013', 'LS-014'],
  },
  {
    id: 'r2', title: '自然风光全景游', duration: '约5小时',
    desc: '南门→佛足坛→九龙灌浴（看表演）→菩提大道→灵山大佛（登顶俯瞰太湖）→曼飞龙塔→灵山精舍→梵宫广场→出口',
    spots: ['LS-003', 'LS-006', 'LS-005', 'LS-011', 'LS-015', 'LS-013'],
  },
  {
    id: 'r3', title: '亲子家庭轻松游', duration: '约4小时',
    desc: '南门→九龙灌浴→佛手广场(摸天下第一掌)→百子戏弥勒→梵宫→五印坛城→出口',
    spots: ['LS-006', 'LS-009', 'LS-013', 'LS-014'],
  },
];

const SCENIC_INTRO = '灵山胜境位于无锡太湖西北岸马山镇，国家5A级旅游景区、世界佛教论坛永久会址，占地约30万m²。历史可追溯至唐贞观年间，玄奘法师见此地山形酷似印度灵鹫山，遂在此建寺弘法。以88m灵山大佛为核心地标，含祥符禅寺（千年古刹）、灵山梵宫（东方卢浮宫）、五印坛城（藏传佛教）、九龙灌浴等16处核心景点，融合汉传、藏传、南传三大佛教语系建筑。';

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const locWatchRef = useRef<Location.LocationSubscription | null>(null);
  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => { userLocRef.current = userLoc; }, [userLoc]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('[GPS] permission:', status);
        if (status !== 'granted') {
          console.warn('[GPS] 定位权限未授予');
          return;
        }

        // 1. Use cached position immediately for speed
        try {
          const last = await Location.getLastKnownPositionAsync();
          if (last) {
            console.log('[GPS] last known:', last.coords.latitude, last.coords.longitude);
            setUserLoc({ lat: last.coords.latitude, lng: last.coords.longitude });
          }
        } catch {}

        // 2. Start continuous watch
        locWatchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 2000 },
          (newLoc) => {
            console.log('[GPS] update:', newLoc.coords.latitude, newLoc.coords.longitude);
            setUserLoc({ lat: newLoc.coords.latitude, lng: newLoc.coords.longitude });
          },
        );
        console.log('[GPS] watch started');

        // 3. Try fresh GPS fix (may be slow but watch already running)
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          console.log('[GPS] fresh fix:', loc.coords.latitude, loc.coords.longitude);
          setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch (posErr) {
          console.warn('[GPS] fresh fix failed, using last known or waiting for watch:', String(posErr));
        }
      } catch (e) {
        console.warn('[GPS] error:', JSON.stringify(e));
      }
    })();

    return () => {
      locWatchRef.current?.remove();
    };
  }, []);

  const postToMap = useCallback((data: object) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(data));
    }
  }, []);

  const toggleCategory = useCallback((kind: string) => {
    setActiveCategory(prev => prev === kind ? null : kind);
  }, []);

  // Show / clear facility markers on the map for the active quick category
  useEffect(() => {
    if (!mapReady) return;
    const facs = activeCategory ? FACILITIES.filter(f => f.kind === activeCategory) : [];
    postToMap({ type: 'setFacilities', facilities: facs });
  }, [mapReady, activeCategory, postToMap]);

  // Center the map when a place is picked from the search page
  useEffect(() => {
    const focus = route.params?.focus;
    if (!focus || !mapReady) return;
    postToMap({ type: 'centerOn', lat: focus.lat, lng: focus.lng });
  }, [route.params, mapReady, postToMap]);

  const followRoute = useCallback((routeId: string) => {
    setSelectedRoute(routeId);
    const rt = RECOMMENDED_ROUTES.find(r => r.id === routeId);
    if (rt && rt.spots.length > 0) {
      const path = rt.spots
        .map(id => SCENIC_SPOTS.find(s => s.id === id))
        .filter(Boolean)
        .map(s => ({ lat: s!.lat, lng: s!.lng }));
      postToMap({ type: 'setRoutePath', path });
    }
  }, [postToMap]);

  useEffect(() => {
    if (!mapReady || !userLoc) return;
    console.log('[GPS] sending to map:', userLoc.lat, userLoc.lng);
    postToMap({ type: 'setUserLocation', lat: userLoc.lat, lng: userLoc.lng });
  }, [mapReady, userLoc, postToMap]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapReady') {
        setMapReady(true);
      } else if (data.type === 'navigate') {
        openNavigation(data.lat, data.lng, data.name);
      } else if (data.type === 'error') {
        console.warn('[MapView Error] line=' + data.line + ': ' + data.message);
        setError('地图错误: ' + data.message);
      } else if (data.type === 'log') {
        console.log('[MapView Log] ' + data.message);
      }
    } catch {}
  }, []);

  const goToMyLocation = useCallback(() => {
    postToMap({ type: 'centerOnUser' });
  }, [postToMap]);

  const goToScenicCenter = useCallback(() => {
    postToMap({ type: 'centerOn', lat: LINGSHAN_CENTER.lat, lng: LINGSHAN_CENTER.lng, zoom: 16 });
  }, [postToMap]);

  const openNavigation = (lat: number, lng: number, name: string) => {
    const encodedName = encodeURIComponent(name);
    const origin = userLocRef.current
      ? `&origin=latlng:${userLocRef.current.lat},${userLocRef.current.lng}|name:我的位置`
      : '';
    const url = `https://api.map.baidu.com/direction?destination=latlng:${lat},${lng}|name:${encodedName}${origin}&mode=walking&region=无锡&output=html&src=scenicAiGuide`;
    Linking.openURL(url).catch(() => {
      const fallback = `baidumap://map/direction?destination=${lat},${lng}&coord_type=bd09ll&mode=walking&src=scenic.ai.guide`;
      Linking.openURL(fallback).catch(() => {
        Alert.alert('无法打开导航', '请安装百度地图');
      });
    });
  };

  const retryLocation = () => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          setError('');
        }
      } catch {}
    })();
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ uri: `${SERVER_URL}/map?v=2` }}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        mixedContentMode="always"
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        cacheEnabled={false}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>灵山胜境</Text>
        <Text style={styles.topBarSub}>{SCENIC_SPOTS.length} 个景点</Text>
      </View>

      {/* Info & Routes toggle button */}
      <TouchableOpacity style={styles.infoToggle} onPress={() => setShowInfo(!showInfo)}>
        <Text style={{ fontSize: 16 }}>{showInfo ? '✕' : 'ℹ'}</Text>
      </TouchableOpacity>

      {/* Bottom info / routes panel */}
      {showInfo && (
        <View style={styles.infoPanel}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>景区介绍</Text>
            <Text style={styles.infoText}>{SCENIC_INTRO}</Text>

            <Text style={styles.sectionTitle}>推荐游览路线</Text>
            {RECOMMENDED_ROUTES.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[styles.routeCard, selectedRoute === r.id && styles.routeCardActive]}
                onPress={() => followRoute(r.id)}
              >
                <View style={styles.routeHeader}>
                  <Text style={styles.routeTitle}>{r.title}</Text>
                  <Text style={styles.routeDuration}>{r.duration}</Text>
                </View>
                <Text style={styles.routeDesc} numberOfLines={2}>{r.desc}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.panelClose} onPress={() => setShowInfo(false)}>
              <Text style={styles.panelCloseText}>收起</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Error banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          {!userLoc && (
            <TouchableOpacity onPress={retryLocation}>
              <Text style={styles.errorBannerBtn}>重试</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* Active category place list popup */}
      {activeCategory && (
        <View style={styles.catListPopup}>
          <View style={styles.catListHeader}>
            <Text style={styles.catListTitle}>{QUICK_CATS.find(c => c.kind === activeCategory)?.label}</Text>
            <TouchableOpacity onPress={() => setActiveCategory(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.catListClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
            {FACILITIES.filter(f => f.kind === activeCategory).map(f => (
              <View key={f.id} style={styles.catListItem}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => postToMap({ type: 'centerOn', lat: f.lat, lng: f.lng })}>
                  <Text style={styles.catListItemName}>📍 {f.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => postToMap({ type: 'findWalkingRoute', lat: f.lat, lng: f.lng })}>
                  <Text style={styles.catListItemGo}>🧭 导航</Text>
                </TouchableOpacity>
              </View>
            ))}
            {FACILITIES.filter(f => f.kind === activeCategory).length === 0 && (
              <Text style={styles.catListEmpty}>该分类暂无数据</Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Bottom search bar + quick categories — hidden when info panel is open */}
      {!showInfo && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.searchBar} activeOpacity={0.85} onPress={() => navigation.navigate('Search')}>
            <Text style={styles.searchBarIcon}>🔍</Text>
            <Text style={styles.searchBarPlaceholder}>请输入搜索地点</Text>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            {QUICK_CATS.map(c => {
              const active = activeCategory === c.kind;
              return (
                <TouchableOpacity
                  key={c.kind}
                  style={[styles.quickChip, active && styles.quickChipActive]}
                  onPress={() => toggleCategory(c.kind)}
                >
                  <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Map control buttons */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.mapCtrlBtn} onPress={goToMyLocation}>
          <Text style={styles.mapCtrlIcon}>◎</Text>
          <Text style={styles.mapCtrlLabel}>定位</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapCtrlBtn} onPress={goToScenicCenter}>
          <Text style={styles.mapCtrlIcon}>🏯</Text>
          <Text style={styles.mapCtrlLabel}>景区</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1, backgroundColor: '#1a1a2e' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 10, paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB',
  },
  topBarTitle: { color: '#1F2937', fontSize: 17, fontWeight: '700' },
  topBarSub: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  infoToggle: {
    position: 'absolute', right: 12, top: Platform.OS === 'ios' ? 100 : 86,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3,
  },
  infoPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: '50%',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24,
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, shadowRadius: 8,
  },
  infoTitle: { color: '#1F2937', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  infoText: { color: '#4B5563', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  sectionTitle: { color: '#1F2937', fontSize: 15, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  routeCard: {
    backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  routeCardActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  routeTitle: { color: '#1F2937', fontSize: 13, fontWeight: '600' },
  routeDuration: { color: '#2563EB', fontSize: 11 },
  routeDesc: { color: '#6B7280', fontSize: 11, lineHeight: 16 },
  panelClose: { alignItems: 'center', marginTop: 8, paddingVertical: 8 },
  panelCloseText: { color: '#6B7280', fontSize: 13 },
  errorBanner: {
    position: 'absolute', right: 12, top: 132,
    backgroundColor: 'rgba(254,242,242,0.95)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 6, borderWidth: 0.5, borderColor: '#FECACA',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  errorBannerText: { color: '#991B1B', fontSize: 12 },
  errorBannerBtn: { color: '#2563EB', fontSize: 12, fontWeight: '600' },
  mapControls: {
    position: 'absolute', right: 12, top: 112,
    alignItems: 'center', gap: 8,
  },
  mapCtrlBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3,
  },
  mapCtrlIcon: { fontSize: 20 },
  mapCtrlLabel: { fontSize: 9, color: '#6B7280', marginTop: 1 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 12, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 0.5, borderTopColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 22,
    paddingHorizontal: 16, height: 44,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchBarIcon: { fontSize: 15, marginRight: 8 },
  searchBarPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  quickRow: { paddingTop: 10, paddingRight: 12 },
  quickChip: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 16, borderWidth: 0.5, borderColor: '#D1D5DB', marginRight: 8,
  },
  quickChipActive: { backgroundColor: '#8B5E2B', borderColor: '#8B5E2B' },
  quickChipText: { fontSize: 12, color: '#374151' },
  quickChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  catListPopup: {
    position: 'absolute', left: 8, right: 8, bottom: 110,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8,
  },
  catListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catListTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  catListClose: { fontSize: 14, color: '#9CA3AF' },
  catListItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: '#F3F4F6',
  },
  catListItemName: { fontSize: 13, color: '#374151' },
  catListItemGo: { fontSize: 12, color: '#8B5E2B', fontWeight: '600', paddingHorizontal: 6 },
  catListEmpty: { fontSize: 12, color: '#9CA3AF', paddingVertical: 12, textAlign: 'center' },
});
