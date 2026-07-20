import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Linking,
  Platform, ScrollView,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { SERVER_URL } from '../config';
import { Colors, Shadows } from '../theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { setLiveUserLoc, setLiveMockLoc, consumePendingRouteNav, consumeFocusPlace } from '../services/locationSync';

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

const QUICK_CATS: { kind: string; label: string; icon: string }[] = [
  { kind: 'entrance', label: '出入口', icon: 'door-open' },
  { kind: 'restroom', label: '卫生间', icon: 'human-male-female' },
  { kind: 'parking', label: '停车场', icon: 'parking' },
  { kind: 'food', label: '餐饮', icon: 'silverware-fork-knife' },
  { kind: 'service', label: '服务中心', icon: 'home-city' },
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
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [mockLoc, setMockLoc] = useState(false);

  // Sync live location to shared service for SearchScreen
  // Also force-sync on mount to clean up stale module vars from Fast Refresh
  useEffect(() => { setLiveUserLoc(null); setLiveMockLoc(false); }, []);
  useEffect(() => { setLiveUserLoc(userLoc); }, [userLoc]);
  useEffect(() => { setLiveMockLoc(mockLoc); }, [mockLoc]);
  const [error, setError] = useState('');
  const [locStatus, setLocStatus] = useState<'idle'|'searching'|'acquired'|'failed'>('idle');
  const [manualLocMode, setManualLocMode] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [navStart, setNavStart] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const webViewRef = useRef<WebView>(null);
  const locWatchRef = useRef<Location.LocationSubscription | null>(null);
  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const userLocIsBd09Ref = useRef(false);

  useEffect(() => { userLocRef.current = userLoc; }, [userLoc]);

  // Timeout wrapper for getCurrentPositionAsync (uses Promise.race since RN doesn't support AbortController)
  const getPositionWithTimeout = useCallback(async (options: Location.LocationOptions, timeoutMs = 10000) => {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GPS_TIMEOUT')), timeoutMs)
    );
    return Promise.race([
      Location.getCurrentPositionAsync(options),
      timeoutPromise,
    ]);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLocStatus('searching');

        // 0. Check system GPS is enabled
        try {
          const enabled = await Location.hasServicesEnabledAsync();
          if (!enabled) {
            setLocStatus('failed');
            setError('请打开手机定位服务(GPS)后再试');
            return;
          }
        } catch (svcErr) {
          // hasServicesEnabledAsync may not be available on all devices
          console.warn('[GPS] hasServicesEnabledAsync error:', String(svcErr));
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('[GPS] permission:', status);
        if (status !== 'granted') {
          setLocStatus('failed');
          setError('定位权限被拒绝，请在设置中允许位置权限');
          return;
        }

        // 1. Use cached position immediately for speed
        try {
          const last = await Location.getLastKnownPositionAsync();
          if (last) {
            console.log('[GPS] last known:', last.coords.latitude, last.coords.longitude);
            setUserLoc({ lat: last.coords.latitude, lng: last.coords.longitude });
            setLocStatus('acquired');
          }
        } catch {}

        // 2. Start continuous RN watch (Balanced — uses WiFi+Cell+GPS, faster)
        locWatchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 3000 },
          (newLoc) => {
            console.log('[GPS] RN update:', newLoc.coords.latitude, newLoc.coords.longitude);
            setUserLoc({ lat: newLoc.coords.latitude, lng: newLoc.coords.longitude });
            setLocStatus('acquired');
          },
        );
        console.log('[GPS] RN watch started (Balanced)');

        // 3. Try fresh GPS fix with timeout (Balanced first for speed)
        try {
          const loc = await getPositionWithTimeout(
            { accuracy: Location.Accuracy.Balanced },
            12000,
          );
          console.log('[GPS] RN fresh fix:', loc.coords.latitude, loc.coords.longitude);
          setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          setLocStatus('acquired');
        } catch (posErr) {
          console.warn('[GPS] RN fresh fix failed, relying on watch + Baidu:', String(posErr));
          // Don't set failed yet — Baidu geo may still work
        }
      } catch (e) {
        console.warn('[GPS] error:', JSON.stringify(e));
        setLocStatus('failed');
        setError('定位服务不可用，可尝试手动点击地图设置位置');
      }
    })();

    return () => {
      locWatchRef.current?.remove();
    };
  }, [getPositionWithTimeout]);

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

  // Route navigation from SearchScreen — consume shared state (avoids pushing new Main screen)
  const applyRouteNav = useCallback((rn: { start: { lat: number; lng: number; name: string }; end: { lat: number; lng: number; name: string } }) => {
    const { start, end } = rn;
    console.log('[MapScreen] applyRouteNav start:', JSON.stringify(start), 'end:', JSON.stringify(end));
    postToMap({ type: 'centerOn', lat: end.lat, lng: end.lng });
    setTimeout(() => {
      postToMap({
        type: 'findWalkingRoute',
        lat: end.lat, lng: end.lng,
        fromLat: start.lat || undefined,
        fromLng: start.lng || undefined,
      });
    }, 500);
  }, [postToMap]);

  useEffect(() => {
    if (!mapReady) return;
    const rn = consumePendingRouteNav();
    if (rn) applyRouteNav(rn);
  }, [mapReady, applyRouteNav]);

  // Also check pending route nav / focus place when MapScreen regains focus (goBack from SearchScreen)
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (!mapReady) return;
      const rn = consumePendingRouteNav();
      if (rn) { applyRouteNav(rn); return; }
      const fp = consumeFocusPlace();
      if (fp) postToMap({ type: 'centerOn', lat: fp.lat, lng: fp.lng });
    });
    return unsub;
  }, [navigation, mapReady, applyRouteNav, postToMap]);

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

  // Send real GPS to map (suppressed while mock is active)
  useEffect(() => {
    if (!mapReady || !userLoc || mockLoc) return;
    console.log('[GPS] sending to map:', userLoc.lat, userLoc.lng);
    postToMap({
      type: 'setUserLocation',
      lat: userLoc.lat,
      lng: userLoc.lng,
      source: userLocIsBd09Ref.current ? 'baidu' : 'rn',
    });
  }, [mapReady, userLoc, mockLoc, postToMap]);

  // Mock location toggle — click to set scenic center, click again to cancel
  useEffect(() => {
    if (!mapReady) return;
    if (mockLoc) {
      postToMap({ type: 'setUserLocation', lat: LINGSHAN_CENTER.lat, lng: LINGSHAN_CENTER.lng, source: 'baidu' });
    } else if (userLocRef.current) {
      postToMap({
        type: 'setUserLocation',
        lat: userLocRef.current.lat,
        lng: userLocRef.current.lng,
        source: userLocIsBd09Ref.current ? 'baidu' : 'rn',
      });
    }
  }, [mapReady, mockLoc, postToMap]);

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
      } else if (data.type === 'userLocation') {
        console.log('[GPS] Baidu map geo:', data.lat, data.lng, 'source:', data.source);
        if (data.source === 'baidu') {
          // Baidu geolocation returns BD09 — store directly
          setUserLoc({ lat: data.lat, lng: data.lng });
          userLocIsBd09Ref.current = true;
        } else {
          setUserLoc({ lat: data.lat, lng: data.lng });
          userLocIsBd09Ref.current = false;
        }
        setLocStatus('acquired');
        setError('');
        setManualLocMode(false);
      }
    } catch {}
  }, []);

  const goToMyLocation = useCallback(() => {
    setLocStatus('searching');
    // Try centering immediately (works if already have a position)
    postToMap({ type: 'centerOnUser' });

    // Parallel: trigger RN GPS + Baidu geolocation in WebView
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setLocStatus('failed'); return; }
        const loc = await getPositionWithTimeout(
          { accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: true },
          10000,
        );
        console.log('[GPS] manual fix:', loc.coords.latitude, loc.coords.longitude);
        setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setLocStatus('acquired');
        setError('');
        setTimeout(() => postToMap({ type: 'centerOnUser' }), 400);
      } catch (e) {
        console.warn('[GPS] RN manual fix failed, trying Baidu geo:', String(e));
        // RN GPS failed — try Baidu Maps geolocation
        postToMap({ type: 'retryBaiduGeo' });
        setTimeout(() => {
          if (!userLocRef.current) {
            setLocStatus('failed');
            setError('自动定位失败，请点击"手动定位"在地图上长按设置您的位置');
          }
        }, 10000);
      }
    })();
  }, [postToMap, getPositionWithTimeout]);

  const toggleManualLoc = useCallback(() => {
    if (manualLocMode) {
      setManualLocMode(false);
      postToMap({ type: 'stopManualLoc' });
    } else {
      setManualLocMode(true);
      setError('请点击地图标记你的实际位置');
      postToMap({ type: 'startManualLoc' });
    }
  }, [manualLocMode, postToMap]);

  const goToScenicCenter = useCallback(() => {
    postToMap({ type: 'centerOn', lat: LINGSHAN_CENTER.lat, lng: LINGSHAN_CENTER.lng, zoom: 16 });
  }, [postToMap]);

  const openNavigation = (lat: number, lng: number, name: string) => {
    const encodedName = encodeURIComponent(name);
    const originLoc = mockLoc ? LINGSHAN_CENTER : (userLocRef.current || LINGSHAN_CENTER);
    const origin = `&origin=latlng:${originLoc.lat},${originLoc.lng}|name=我的位置`;
    const url = `https://api.map.baidu.com/direction?destination=latlng:${lat},${lng}|name:${encodedName}${origin}&mode=walking&region=无锡&output=html&src=scenicAiGuide`;
    Linking.openURL(url).catch(() => {
      const fallback = `baidumap://map/direction?destination=${lat},${lng}&coord_type=bd09ll&mode=walking&src=scenic.ai.guide`;
      Linking.openURL(fallback).catch(() => {
        Alert.alert('无法打开导航', '请安装百度地图');
      });
    });
  };

  const retryLocation = () => {
    setError('');
    setLocStatus('searching');
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocStatus('failed');
          setError('定位权限被拒绝');
          return;
        }
        const loc = await getPositionWithTimeout(
          { accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: true },
          10000,
        );
        setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setLocStatus('acquired');
        setError('');
      } catch {
        // RN failed, try Baidu geo
        postToMap({ type: 'retryBaiduGeo' });
        setTimeout(() => {
          if (!userLocRef.current) {
            setLocStatus('failed');
            setError('自动定位失败，请尝试手动定位');
          }
        }, 10000);
      }
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
        <View>
          <Text style={styles.topBarTitle}>灵山胜境</Text>
          <Text style={styles.topBarSub}>{SCENIC_SPOTS.length} 个景点</Text>
        </View>
        {/* GPS status indicator */}
        <View style={styles.gpsStatus}>
          <View style={[styles.gpsDot,
            locStatus === 'acquired' && styles.gpsDotOk,
            locStatus === 'searching' && styles.gpsDotSearching,
            locStatus === 'failed' && styles.gpsDotFail,
          ]} />
          <Text style={styles.gpsLabel}>
            {locStatus === 'acquired' ? '已定位' : locStatus === 'searching' ? '定位中' : locStatus === 'failed' ? '未定位' : '待定位'}
          </Text>
        </View>
      </View>

      {/* Info & Routes toggle button */}
      <TouchableOpacity style={styles.infoToggle} onPress={() => setShowInfo(!showInfo)}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.ink }}>{showInfo ? '✕' : '路线'}</Text>
      </TouchableOpacity>

      {/* Map control buttons */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.mapCtrlBtn} onPress={goToMyLocation}>
          <Ionicons name="locate" size={20} color={Colors.goldDark} />
          <Text style={styles.mapCtrlLabel}>定位</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapCtrlBtn} onPress={goToScenicCenter}>
          <MaterialCommunityIcons name="bank" size={20} color={Colors.goldDark} />
          <Text style={styles.mapCtrlLabel}>景区</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mapCtrlBtn, mockLoc && { backgroundColor: Colors.jade }]}
          onPress={() => setMockLoc(!mockLoc)}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color={mockLoc ? Colors.white : Colors.goldDark} />
          <Text style={[styles.mapCtrlLabel, mockLoc && { color: Colors.white }]}>模拟</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom info / routes panel */}
      {showInfo && (
        <View style={styles.infoPanel}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
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

            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>景区介绍</Text>
            <Text style={styles.infoText}>{SCENIC_INTRO}</Text>

            <TouchableOpacity style={styles.panelClose} onPress={() => setShowInfo(false)}>
              <Text style={styles.panelCloseText}>收起</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Enhanced error / status banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
          <Text style={styles.errorBannerText} numberOfLines={3}>{error}</Text>
          <View style={styles.errorBannerBtns}>
            <TouchableOpacity onPress={retryLocation}>
              <Text style={styles.errorBannerBtn}>重试</Text>
            </TouchableOpacity>
            {!userLoc && locStatus === 'failed' && (
              <TouchableOpacity onPress={toggleManualLoc}>
                <Text style={[styles.errorBannerBtn, { color: Colors.goldDark, marginLeft: 12 }]}>{manualLocMode ? '取消' : '手动定位'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : null}

      {/* Active category place list popup */}
      {activeCategory && (
        <View style={styles.catListPopup}>
          <View style={styles.catListHeader}>
            <Text style={styles.catListTitle}>{QUICK_CATS.find(c => c.kind === activeCategory)?.label}</Text>
            <TouchableOpacity onPress={() => { setActiveCategory(null); setNavStart(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.catListClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {navStart && (
            <View style={styles.navStartBar}>
              <Text style={styles.navStartText}>起点: {navStart.name}</Text>
              <TouchableOpacity onPress={() => setNavStart(null)}>
                <Text style={styles.navStartClear}>清除</Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
            {FACILITIES.filter(f => f.kind === activeCategory).map(f => (
              <View key={f.id} style={styles.catListItem}>
                <TouchableOpacity style={styles.catListItemLeft} onPress={() => postToMap({ type: 'centerOn', lat: f.lat, lng: f.lng })}>
                  <Ionicons name="location" size={14} color={Colors.goldDark} />
                  <Text style={styles.catListItemName}>{f.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.catListItemBtn} onPress={() => setNavStart({ lat: f.lat, lng: f.lng, name: f.name })}>
                  <Ionicons name="flag" size={13} color={Colors.jade} />
                  <Text style={[styles.catListItemGo, { color: Colors.jade }]}>起点</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.catListItemBtn}
                  onPress={() => postToMap({
                    type: 'findWalkingRoute',
                    lat: f.lat, lng: f.lng,
                    fromLat: navStart?.lat, fromLng: navStart?.lng,
                  })}
                >
                  <Ionicons name="navigate" size={13} color={Colors.goldDark} />
                  <Text style={styles.catListItemGo}>导航</Text>
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
            <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
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
                  <MaterialCommunityIcons
                    name={c.icon as any}
                    size={13}
                    color={active ? Colors.white : Colors.goldDark}
                  />
                  <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1, backgroundColor: Colors.ink },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 10, paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  topBarTitle: { color: Colors.ink, fontSize: 17, fontWeight: '700' },
  topBarSub: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  gpsStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9CA3AF' },
  gpsDotOk: { backgroundColor: '#22C55E' },
  gpsDotSearching: { backgroundColor: '#F59E0B' },
  gpsDotFail: { backgroundColor: '#EF4444' },
  gpsLabel: { fontSize: 11, color: Colors.textSecondary },
  mapControls: {
    position: 'absolute', right: 12, top: 112,
    alignItems: 'center', gap: 8,
  },
  mapCtrlBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    ...Shadows.sm,
  },
  mapCtrlLabel: { fontSize: 9, color: Colors.textSecondary, marginTop: 1 },
  infoToggle: {
    position: 'absolute', right: 12, top: Platform.OS === 'ios' ? 100 : 86,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    ...Shadows.sm,
  },
  infoPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: '50%',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24,
    elevation: 10, shadowColor: '#8B7355', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, shadowRadius: 8,
  },
  infoText: { color: Colors.text, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  sectionTitle: { color: Colors.ink, fontSize: 15, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  routeCard: {
    backgroundColor: Colors.goldSurface, borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.divider,
  },
  routeCardActive: { borderColor: Colors.goldDark, backgroundColor: Colors.goldLight },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  routeTitle: { color: Colors.ink, fontSize: 13, fontWeight: '600' },
  routeDuration: { color: Colors.goldDark, fontSize: 11 },
  routeDesc: { color: Colors.textSecondary, fontSize: 11, lineHeight: 16 },
  panelClose: { alignItems: 'center', marginTop: 8, paddingVertical: 8 },
  panelCloseText: { color: Colors.textSecondary, fontSize: 13 },
  errorBanner: {
    position: 'absolute', left: 12, right: 12, top: 132,
    backgroundColor: 'rgba(30,30,30,0.92)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 0.5, borderColor: '#F59E0B',
    flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4,
  },
  errorBannerText: { color: '#FDE68A', fontSize: 12, flex: 1, minWidth: 120, lineHeight: 16 },
  errorBannerBtns: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  errorBannerBtn: { color: '#F59E0B', fontSize: 12, fontWeight: '600', paddingHorizontal: 4 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 12, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 0.5, borderTopColor: Colors.divider,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 22,
    paddingHorizontal: 16, height: 44,
    borderWidth: 1, borderColor: Colors.divider,
  },
  searchBarPlaceholder: { fontSize: 14, color: Colors.textMuted },
  quickRow: { paddingTop: 10, paddingRight: 12 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.white, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 16, borderWidth: 0.5, borderColor: Colors.divider, marginRight: 8,
  },
  quickChipActive: { backgroundColor: Colors.goldDark, borderColor: Colors.goldDark },
  quickChipText: { fontSize: 12, color: Colors.text },
  quickChipTextActive: { color: Colors.white, fontWeight: '600' },
  catListPopup: {
    position: 'absolute', left: 8, right: 8, bottom: 110,
    backgroundColor: Colors.white, borderRadius: 12, padding: 12,
    ...Shadows.md,
  },
  catListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catListTitle: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  catListClose: { fontSize: 14, color: Colors.textMuted },
  navStartBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.goldSurface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: 4, borderWidth: 1, borderColor: Colors.goldLight,
  },
  navStartText: { fontSize: 12, color: Colors.goldDark, fontWeight: '600' },
  navStartClear: { fontSize: 12, color: Colors.vermilion, fontWeight: '600' },
  catListItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: Colors.surface,
  },
  catListItemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  catListItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6 },
  catListItemName: { fontSize: 13, color: Colors.text },
  catListItemGo: { fontSize: 12, color: Colors.goldDark, fontWeight: '600', paddingHorizontal: 6 },
  catListEmpty: { fontSize: 12, color: Colors.textMuted, paddingVertical: 12, textAlign: 'center' },
});
