import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Linking,
  Platform, ScrollView,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import api from '../services/api';

interface Spot {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: string;
}

// ====== 灵山胜境 · 真实数据 ======
// 核心坐标: 灵山大佛 31.423°N, 120.090°E
const LINGSHAN_CENTER = { lat: 31.423, lng: 120.090 };

// 基础设施（出入口、卫生间、停车场、服务中心、餐饮）
const FACILITIES: { id: string; name: string; lat: number; lng: number; kind: 'entrance' | 'restroom' | 'parking' | 'service' | 'food' }[] = [
  { id: 'f-ent-s', name: '南门（主入口）', lat: 31.4180, lng: 120.0890, kind: 'entrance' },
  { id: 'f-ent-e', name: '东门', lat: 31.4214, lng: 120.0925, kind: 'entrance' },
  { id: 'f-wc-1', name: '南门卫生间', lat: 31.4185, lng: 120.0890, kind: 'restroom' },
  { id: 'f-wc-2', name: '九龙灌浴卫生间', lat: 31.4206, lng: 120.0898, kind: 'restroom' },
  { id: 'f-wc-3', name: '梵宫卫生间', lat: 31.4221, lng: 120.0878, kind: 'restroom' },
  { id: 'f-wc-4', name: '大佛脚下卫生间', lat: 31.4233, lng: 120.0895, kind: 'restroom' },
  { id: 'f-wc-5', name: '祥符禅寺卫生间', lat: 31.4218, lng: 120.0900, kind: 'restroom' },
  { id: 'f-park-1', name: '南门停车场', lat: 31.4172, lng: 120.0885, kind: 'parking' },
  { id: 'f-park-2', name: '东门停车场', lat: 31.4208, lng: 120.0930, kind: 'parking' },
  { id: 'f-svc', name: '游客服务中心', lat: 31.4182, lng: 120.0891, kind: 'service' },
  { id: 'f-food-1', name: '梵宫素斋（餐饮）', lat: 31.4220, lng: 120.0880, kind: 'food' },
  { id: 'f-food-2', name: '素面馆', lat: 31.4208, lng: 120.0900, kind: 'food' },
  { id: 'f-food-3', name: '灵山精舍（素斋/住宿）', lat: 31.4205, lng: 120.0870, kind: 'food' },
];

const FAC_KIND_LABEL: Record<string, string> = {
  entrance: '出入口', restroom: '卫生间', parking: '停车场', service: '游客中心', food: '餐饮',
};

// 灵山胜境核心景点（含坐标，用于地图展示）
const SCENIC_SPOTS: { id: string; name: string; lat: number; lng: number; category: string; desc: string }[] = [
  { id: 'LS-001', name: '灵山大照壁', lat: 31.4184, lng: 120.0892, category: '人文', desc: '长39.8m，赵朴初亲笔题词"灵山胜境"，景区首道打卡点' },
  { id: 'LS-002', name: '五明桥', lat: 31.4188, lng: 120.0894, category: '宗教', desc: '5座汉白玉石拱桥，代表佛教五种智慧：声明、因明、内明、医方明、工巧明' },
  { id: 'LS-003', name: '佛足坛', lat: 31.4191, lng: 120.0896, category: '宗教', desc: '巨型青铜佛足印一对，足心刻有32种吉祥瑞相，象征"佛足所至，佛光普照"' },
  { id: 'LS-004', name: '五智门', lat: 31.4195, lng: 120.0898, category: '宗教', desc: '高16.8m石牌坊，五门象征五方五佛，六柱代表六度波罗蜜' },
  { id: 'LS-005', name: '菩提大道', lat: 31.4200, lng: 120.0900, category: '自然', desc: '长约250m，两侧对称种植印度引种正宗菩提树，形成天然禅意拱廊' },
  { id: 'LS-006', name: '九龙灌浴', lat: 31.4206, lng: 120.0900, category: '宗教', desc: '总高27.2m大型音乐动态群雕，"花开见佛，九龙沐浴"，每日10:00起多场演出' },
  { id: 'LS-007', name: '降魔浮雕', lat: 31.4210, lng: 120.0900, category: '宗教', desc: '长26m花岗岩巨型浮雕，再现佛陀降魔成道场景' },
  { id: 'LS-008', name: '阿育王柱', lat: 31.4213, lng: 120.0902, category: '人文', desc: '通高16.9m，重180吨整块花岗岩柱，四狮柱头象征佛法向世界传播' },
  { id: 'LS-009', name: '百子戏弥勒', lat: 31.4215, lng: 120.0905, category: '人文', desc: '高3m青铜群雕，弥勒笑容可掬，百名孩童形态各异，亲子热门打卡点' },
  { id: 'LS-010', name: '祥符禅寺', lat: 31.4218, lng: 120.0902, category: '宗教', desc: '唐代古刹，玄奘弟子窥基大师开创，千年银杏与12.8吨祥符禅钟闻名' },
  { id: 'LS-011', name: '灵山大佛', lat: 31.4230, lng: 120.0900, category: '宗教', desc: '高88m，世界最高露天青铜释迦牟尼立像，耗铜725吨，五方五佛之东方佛' },
  { id: 'LS-012', name: '佛教文化博览馆', lat: 31.4228, lng: 120.0900, category: '人文', desc: '大佛座基内三层展馆，万佛殿9999尊小佛，免费参观，8:00-17:00开放' },
  { id: 'LS-013', name: '灵山梵宫', lat: 31.4220, lng: 120.0875, category: '人文', desc: '建筑面积72000㎡，汇东阳木雕/琉璃/油画非遗艺术，"东方卢浮宫"，鲁班奖' },
  { id: 'LS-014', name: '五印坛城', lat: 31.4225, lng: 120.0885, category: '宗教', desc: '藏传佛教风格，四面环水，108转经筒长廊，9:00-17:00开放' },
  { id: 'LS-015', name: '曼飞龙塔', lat: 31.4228, lng: 120.0880, category: '人文', desc: '南传佛教白塔，九塔组合，复刻西双版纳曼飞龙白塔形制，夜景绝美' },
  { id: 'LS-016', name: '无尽意斋', lat: 31.4210, lng: 120.0890, category: '人文', desc: '赵朴初先生纪念馆，复刻北京四合院故居，禅茶免费品鉴，9:00-17:00' },
];

// 推荐游览路线
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

// 景区简介
const SCENIC_INTRO = '灵山胜境位于无锡太湖西北岸马山镇，国家5A级旅游景区、世界佛教论坛永久会址，占地约30万m²。历史可追溯至唐贞观年间，玄奘法师见此地山形酷似印度灵鹫山，遂在此建寺弘法。以88m灵山大佛为核心地标，含祥符禅寺（千年古刹）、灵山梵宫（东方卢浮宫）、五印坛城（藏传佛教）、九龙灌浴等16处核心景点，融合汉传、藏传、南传三大佛教语系建筑。';

const CAT_COLORS: Record<string, string> = {
  '自然': '#22c55e', '人文': '#f59e0b', '宗教': '#a855f7',
};

const BAIDU_MAP_AK = '9b3nqAd0qh8TvwOl2ubfa3QWv9LJggRL';

function buildMapHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a2e; }
  #map { width: 100%; height: 100%; }
  .info-window { font-family: -apple-system, sans-serif; padding: 2px 0; }
  .info-window h4 { margin: 0 0 2px 0; font-size: 14px; color: #1F2937; }
  .info-window p { margin: 2px 0; font-size: 11px; color: #6B7280; }
  .info-window .nav-btn {
    display: inline-block; margin-top: 4px; padding: 5px 14px;
    background: #2563EB; color: #fff; border-radius: 4px;
    font-size: 12px; cursor: pointer; text-decoration: none;
    font-weight: 600;
  }
  .BMap_customCtrl { border-radius: 4px !important; overflow: hidden; }
</style>
</head>
<body>
<div id="map"></div>
<script>
var map = null;
var userMarker = null;
var spotMarkers = [];
var facMarkers = [];

function makeSpotIcon(color) {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42">'
    + '<filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter>'
    + '<path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 28 14 28s14-17.5 14-28C28 6.3 21.7 0 14 0z" fill="' + color + '" filter="url(#shadow)"/>'
    + '<circle cx="14" cy="14" r="6" fill="#fff"/></svg>';
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

function makeFacIcon(color) {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">'
    + '<circle cx="11" cy="11" r="10" fill="' + color + '" stroke="#fff" stroke-width="2"/>'
    + '<rect x="6" y="6" width="10" height="10" fill="#fff" opacity="0.35" rx="2"/></svg>';
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

function makeUserIcon() {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'
    + '<circle cx="12" cy="12" r="11" fill="#3B82F6" stroke="#fff" stroke-width="3"/>'
    + '<circle cx="12" cy="12" r="4" fill="#fff"/></svg>';
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

function initMap() {
  map = new BMapGL.Map('map');
  map.centerAndZoom(new BMapGL.Point(120.090, 31.423), 16);
  map.setTilt(45);
  map.enableScrollWheelZoom(true);
  map.enableContinuousZoom(true);
  map.enableDoubleClickZoom(true);
  map.enableDragging();
  map.enableInertialDragging();

  var navCtrl = new BMapGL.NavigationControl({
    type: BMAP_NAVIGATION_CONTROL_ZOOM_PAN,
    anchor: BMAP_ANCHOR_TOP_RIGHT,
    offset: new BMapGL.Size(10, 6)
  });
  map.addControl(navCtrl);

  map.setMapStyle({ style: 'dark' });

  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
}

function setSpots(spots) {
  spotMarkers.forEach(function(m) { map.removeOverlay(m); });
  spotMarkers = [];
  if (!spots) return;
  spots.forEach(function(s) {
    var pt = new BMapGL.Point(s.lng, s.lat);
    var color = (s.category === '自然') ? '#22c55e' : (s.category === '人文') ? '#f59e0b' : (s.category === '宗教') ? '#a855f7' : '#6b7280';
    var icon = new BMapGL.Icon(makeSpotIcon(color), new BMapGL.Size(28, 42), {
      anchor: new BMapGL.Size(14, 42), imageSize: new BMapGL.Size(28, 42)
    });
    var marker = new BMapGL.Marker(pt, { icon: icon });
    marker._spot = s;
    marker.addEventListener('click', function() { showSpotInfo(this); });
    map.addOverlay(marker);
    spotMarkers.push(marker);

    var label = new BMapGL.Label(s.name, {
      position: pt, offset: new BMapGL.Size(-16, -38)
    });
    label.setStyle({
      color: '#fff', background: 'rgba(0,0,0,0.75)', border: 'none',
      borderRadius: '3px', padding: '2px 6px', fontSize: '10px',
      fontFamily: 'sans-serif', whiteSpace: 'nowrap', pointerEvents: 'none'
    });
    map.addOverlay(label);
    spotMarkers.push(label);
  });
}

var FAC_COLORS = {
  entrance: '#3B82F6', restroom: '#EC4899', parking: '#F59E0B',
  service: '#10B981', food: '#F97316'
};

function setFacilities(facilities) {
  facMarkers.forEach(function(m) { map.removeOverlay(m); });
  facMarkers = [];
  if (!facilities) return;
  facilities.forEach(function(f) {
    var pt = new BMapGL.Point(f.lng, f.lat);
    var color = FAC_COLORS[f.kind] || '#6B7280';
    var icon = new BMapGL.Icon(makeFacIcon(color), new BMapGL.Size(22, 22), {
      anchor: new BMapGL.Size(11, 11), imageSize: new BMapGL.Size(22, 22)
    });
    var marker = new BMapGL.Marker(pt, { icon: icon });
    marker._fac = f;
    marker.addEventListener('click', function() {
      var w = new BMapGL.InfoWindow(
        '<div class="info-window"><h4>' + this._fac.name + '</h4></div>',
        { width: 140, height: 36 }
      );
      map.openInfoWindow(w, this.getPosition());
    });
    map.addOverlay(marker);
    facMarkers.push(marker);
  });
}

function setUserLocation(lat, lng) {
  if (userMarker) { map.removeOverlay(userMarker); }
  var pt = new BMapGL.Point(lng, lat);
  var icon = new BMapGL.Icon(makeUserIcon(), new BMapGL.Size(24, 24), {
    anchor: new BMapGL.Size(12, 12), imageSize: new BMapGL.Size(24, 24)
  });
  userMarker = new BMapGL.Marker(pt, { icon: icon });
  map.addOverlay(userMarker);
}

function centerOn(lat, lng) {
  map.centerAndZoom(new BMapGL.Point(lng, lat), 18);
}

function showSpotInfo(marker) {
  var s = marker._spot;
  var html = '<div class="info-window">'
    + '<h4>' + s.name + '</h4>'
    + '<p>' + (s.category || '') + '</p>'
    + '<span class="nav-btn" onclick="navTo(' + s.lat + ',' + s.lng + ',\\'' + (s.name || '').replace(/'/g, "\\\\'") + '\\')">导航到这里</span>'
    + '</div>';
  var w = new BMapGL.InfoWindow(html, { width: 160, height: 82 });
  map.openInfoWindow(w, marker.getPosition());
}

function navTo(lat, lng, name) {
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'navigate', lat: lat, lng: lng, name: name
  }));
}

window.addEventListener('message', function(e) {
  try {
    var d = JSON.parse(e.data);
    if (d.type === 'setSpots') setSpots(d.spots);
    else if (d.type === 'setFacilities') setFacilities(d.facilities);
    else if (d.type === 'setUserLocation') setUserLocation(d.lat, d.lng);
    else if (d.type === 'centerOn') centerOn(d.lat, d.lng);
  } catch(ex) {}
});

// Loading indicator
document.getElementById('map').innerHTML = '<div style="color:#9ca3af;text-align:center;padding-top:60%;font-family:sans-serif;font-size:14px">地图加载中...</div>';

var _poll = setInterval(function() {
  if (typeof BMapGL !== 'undefined') { clearInterval(_poll); initMap(); }
}, 80);

// Timeout: 15s后仍未加载则显示错误
setTimeout(function() {
  if (typeof BMapGL === 'undefined') {
    clearInterval(_poll);
    document.getElementById('map').innerHTML = '<div style="color:#f87171;text-align:center;padding-top:60%;font-family:sans-serif;font-size:14px">地图加载失败<br/><span style="font-size:11px;color:#9ca3af">请检查网络连接</span></div>';
  }
}, 15000);
</script>
<script src="https://api.map.baidu.com/api?type=webgl&v=1.0&ak=${BAIDU_MAP_AK}"></script>
</body>
</html>`;
}

export default function MapScreen() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [facilityFilter, setFacilityFilter] = useState<string | null>(null); // null = show all
  const [showInfo, setShowInfo] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const locWatchRef = useRef<Location.LocationSubscription | null>(null);
  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);

  // Keep a ref updated for the navigation callback
  useEffect(() => { userLocRef.current = userLoc; }, [userLoc]);

  // Request location in background (doesn't block map)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });

        locWatchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 3000 },
          (newLoc) => {
            const pos = { lat: newLoc.coords.latitude, lng: newLoc.coords.longitude };
            setUserLoc(pos);
          },
        );
      } catch {}
    })();

    return () => {
      locWatchRef.current?.remove();
    };
  }, []);

  // Fetch spots — merge API data with hardcoded 灵山胜境 spots
  useEffect(() => {
    (async () => {
      // Always load hardcoded scenic spots as base data
      const baseSpots: Spot[] = SCENIC_SPOTS.map(s => ({
        id: parseInt(s.id.replace('LS-', '')), name: s.name,
        lat: s.lat, lng: s.lng, category: s.category,
      }));
      try {
        const data = await api.getSpots({ page_size: '50' });
        const apiSpots: Spot[] = (data.items || []).map((s: any) => ({
          id: s.id, name: s.name,
          lat: s.lat || 0, lng: s.lng || 0,
          category: s.category || '其他',
        }));
        // Merge: API data takes priority, hardcoded fills in missing
        const apiIds = new Set(apiSpots.map(a => a.id));
        const merged = [...apiSpots, ...baseSpots.filter(b => !apiIds.has(b.id))];
        setSpots(merged);
      } catch {
        setSpots(baseSpots);
      }
    })();
  }, []);

  // Send data to WebView when map is ready or data changes
  const postToMap = useCallback((data: object) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    postToMap({ type: 'setSpots', spots });
  }, [mapReady, spots, postToMap]);

  // Send filtered facilities to map
  useEffect(() => {
    if (!mapReady) return;
    const filtered = facilityFilter
      ? FACILITIES.filter(f => f.kind === facilityFilter)
      : FACILITIES;
    postToMap({ type: 'setFacilities', facilities: filtered });
  }, [mapReady, facilityFilter, postToMap]);

  // Follow a route: center on each spot in sequence
  const followRoute = useCallback((routeId: string) => {
    setSelectedRoute(routeId);
    const route = RECOMMENDED_ROUTES.find(r => r.id === routeId);
    if (route && route.spots.length > 0) {
      const firstSpot = SCENIC_SPOTS.find(s => s.id === route.spots[0]);
      if (firstSpot) {
        postToMap({ type: 'centerOn', lat: firstSpot.lat, lng: firstSpot.lng });
      }
    }
  }, [postToMap]);

  useEffect(() => {
    if (!mapReady || !userLoc) return;
    postToMap({ type: 'setUserLocation', lat: userLoc.lat, lng: userLoc.lng });
  }, [mapReady, userLoc, postToMap]);

  // Handle messages from WebView
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapReady') {
        setMapReady(true);
      } else if (data.type === 'navigate') {
        openNavigation(data.lat, data.lng, data.name);
      }
    } catch {}
  }, []);

  const goToMyLocation = useCallback(() => {
    const u = userLocRef.current;
    if (u) {
      postToMap({ type: 'centerOn', lat: u.lat, lng: u.lng });
    }
  }, [postToMap]);

  const openNavigation = (lat: number, lng: number, name: string) => {
    const encodedName = encodeURIComponent(name);
    const origin = userLocRef.current
      ? `&origin=latlng:${userLocRef.current.lat},${userLocRef.current.lng}|name:我的位置`
      : '';
    const url = `https://api.map.baidu.com/direction?destination=latlng:${lat},${lng}|name:${encodedName}${origin}&mode=walking&region=无锡&output=html&src=scenicAiGuide`;
    Linking.openURL(url).catch(() => {
      const fallback = `baidumap://map/direction?destination=${lat},${lng}&coord_type=gcj02&mode=walking&src=scenic.ai.guide`;
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

  const toggleFacilityFilter = (kind: string) => {
    setFacilityFilter(prev => prev === kind ? null : kind);
  };

  return (
    <View style={styles.container}>
      {/* WebView map */}
      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ html: buildMapHtml(), baseUrl: 'https://api.map.baidu.com' }}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        allowFileAccess
        mixedContentMode="always"
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        cacheEnabled
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>灵山胜境</Text>
        <Text style={styles.topBarSub}>{spots.length} 个景点</Text>
      </View>

      {/* Info & Routes toggle button */}
      <TouchableOpacity style={styles.infoToggle} onPress={() => setShowInfo(!showInfo)}>
        <Text style={{ fontSize: 16 }}>{showInfo ? '✕' : 'ℹ'}</Text>
      </TouchableOpacity>

      {/* Bottom info / routes panel */}
      {showInfo && (
        <View style={styles.infoPanel}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Scenic area intro */}
            <Text style={styles.infoTitle}>景区介绍</Text>
            <Text style={styles.infoText}>{SCENIC_INTRO}</Text>

            {/* Recommended routes */}
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

            {/* Close button */}
            <TouchableOpacity style={styles.panelClose} onPress={() => setShowInfo(false)}>
              <Text style={styles.panelCloseText}>收起</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Facility filter bar */}
      <View style={styles.facFilterBar}>
        <ScrollableFacilityFilters
          selected={facilityFilter}
          onToggle={toggleFacilityFilter}
        />
      </View>

      {/* Error banner (non-blocking) */}
      {error && !userLoc && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={retryLocation}>
            <Text style={styles.errorBannerBtn}>重试</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Locate button */}
      <TouchableOpacity style={styles.locateBtn} onPress={goToMyLocation}>
        <Text style={{ fontSize: 18, color: '#2563EB' }}>◎</Text>
      </TouchableOpacity>
    </View>
  );
}

function ScrollableFacilityFilters({ selected, onToggle }: { selected: string | null; onToggle: (k: string) => void }) {
  const kinds = [
    { key: 'entrance', label: '🚪 出入口' },
    { key: 'restroom', label: '🚻 卫生间' },
    { key: 'parking', label: '🅿️ 停车场' },
    { key: 'service', label: '🏠 服务中心' },
    { key: 'food', label: '🍜 餐饮' },
  ];
  return (
    <>
      {kinds.map(k => (
        <TouchableOpacity
          key={k.key}
          style={[styles.facChip, selected === k.key && styles.facChipActive]}
          onPress={() => onToggle(k.key)}
        >
          <Text style={[styles.facChipText, selected === k.key && styles.facChipTextActive]}>
            {k.label}
          </Text>
        </TouchableOpacity>
      ))}
    </>
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
  // Bottom info panel
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
  // Facility filter bar
  facFilterBar: {
    position: 'absolute', top: Platform.OS === 'ios' ? 92 : 78,
    left: 8, right: 56, flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  facChip: {
    backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 16, borderWidth: 0.5, borderColor: '#D1D5DB', marginRight: 6, marginBottom: 4,
  },
  facChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  facChipText: { color: '#374151', fontSize: 11 },
  facChipTextActive: { color: '#FFFFFF' },
  // Error / retry banner
  errorBanner: {
    position: 'absolute', right: 12, top: 132,
    backgroundColor: 'rgba(254,242,242,0.95)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 6, borderWidth: 0.5, borderColor: '#FECACA',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  errorBannerText: { color: '#991B1B', fontSize: 12 },
  errorBannerBtn: { color: '#2563EB', fontSize: 12, fontWeight: '600' },
  // Locate button
  locateBtn: {
    position: 'absolute', right: 12, top: 126,
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3,
  },
});
