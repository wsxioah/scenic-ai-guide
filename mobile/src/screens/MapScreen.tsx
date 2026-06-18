import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
const LINGSHAN_CENTER = { lat: 31.424900, lng: 120.101375 };

const FACILITIES: { id: string; name: string; lat: number; lng: number; kind: 'entrance' | 'restroom' | 'parking' | 'service' | 'food' }[] = [
  { id: 'f-ent-s', name: '南门（主入口）', lat: 31.422280, lng: 120.100379, kind: 'entrance' },
  { id: 'f-ent-e', name: '东门', lat: 31.425746, lng: 120.103862, kind: 'entrance' },
  { id: 'f-wc-1', name: '南门卫生间', lat: 31.422780, lng: 120.100379, kind: 'restroom' },
  { id: 'f-wc-2', name: '九龙灌浴卫生间', lat: 31.424896, lng: 120.101176, kind: 'restroom' },
  { id: 'f-wc-3', name: '梵宫卫生间', lat: 31.426359, lng: 120.099187, kind: 'restroom' },
  { id: 'f-wc-4', name: '大佛脚下卫生间', lat: 31.427592, lng: 120.100879, kind: 'restroom' },
  { id: 'f-wc-5', name: '祥符禅寺卫生间', lat: 31.426100, lng: 120.101376, kind: 'restroom' },
  { id: 'f-park-1', name: '南门停车场', lat: 31.421470, lng: 120.099881, kind: 'parking' },
  { id: 'f-park-2', name: '东门停车场', lat: 31.425154, lng: 120.104360, kind: 'parking' },
  { id: 'f-svc', name: '游客服务中心', lat: 31.422482, lng: 120.100479, kind: 'service' },
  { id: 'f-food-1', name: '梵宫素斋（餐饮）', lat: 31.426263, lng: 120.099386, kind: 'food' },
  { id: 'f-food-2', name: '素面馆', lat: 31.425100, lng: 120.101375, kind: 'food' },
  { id: 'f-food-3', name: '灵山精舍（素斋/住宿）', lat: 31.424743, lng: 120.098391, kind: 'food' },
];

const SCENIC_SPOTS: { id: string; name: string; lat: number; lng: number; category: string; desc: string }[] = [
  { id: 'LS-001', name: '灵山大照壁', lat: 31.422684, lng: 120.100578, category: '人文', desc: '长39.8m，赵朴初亲笔题词"灵山胜境"，景区首道打卡点' },
  { id: 'LS-002', name: '五明桥', lat: 31.423088, lng: 120.100777, category: '宗教', desc: '5座汉白玉石拱桥，代表佛教五种智慧：声明、因明、内明、医方明、工巧明' },
  { id: 'LS-003', name: '佛足坛', lat: 31.423392, lng: 120.100976, category: '宗教', desc: '巨型青铜佛足印一对，足心刻有32种吉祥瑞相，象征"佛足所至，佛光普照"' },
  { id: 'LS-004', name: '五智门', lat: 31.423796, lng: 120.101176, category: '宗教', desc: '高16.8m石牌坊，五门象征五方五佛，六柱代表六度波罗蜜' },
  { id: 'LS-005', name: '菩提大道', lat: 31.424300, lng: 120.101375, category: '自然', desc: '长约250m，两侧对称种植印度引种正宗菩提树，形成天然禅意拱廊' },
  { id: 'LS-006', name: '九龙灌浴', lat: 31.424900, lng: 120.101375, category: '宗教', desc: '总高27.2m大型音乐动态群雕，"花开见佛，九龙沐浴"，每日10:00起多场演出' },
  { id: 'LS-007', name: '降魔浮雕', lat: 31.425300, lng: 120.101375, category: '宗教', desc: '长26m花岗岩巨型浮雕，再现佛陀降魔成道场景' },
  { id: 'LS-008', name: '阿育王柱', lat: 31.425604, lng: 120.101574, category: '人文', desc: '通高16.9m，重180吨整块花岗岩柱，四狮柱头象征佛法向世界传播' },
  { id: 'LS-009', name: '百子戏弥勒', lat: 31.425809, lng: 120.101873, category: '人文', desc: '高3m青铜群雕，弥勒笑容可掬，百名孩童形态各异，亲子热门打卡点' },
  { id: 'LS-010', name: '祥符禅寺', lat: 31.426104, lng: 120.101575, category: '宗教', desc: '唐代古刹，玄奘弟子窥基大师开创，千年银杏与12.8吨祥符禅钟闻名' },
  { id: 'LS-011', name: '灵山大佛', lat: 31.427301, lng: 120.101376, category: '宗教', desc: '高88m，世界最高露天青铜释迦牟尼立像，耗铜725吨，五方五佛之东方佛' },
  { id: 'LS-012', name: '佛教文化博览馆', lat: 31.427101, lng: 120.101376, category: '人文', desc: '大佛座基内三层展馆，万佛殿9999尊小佛，免费参观，8:00-17:00开放' },
  { id: 'LS-013', name: '灵山梵宫', lat: 31.426253, lng: 120.098889, category: '人文', desc: '建筑面积72000㎡，汇东阳木雕/琉璃/油画非遗艺术，"东方卢浮宫"，鲁班奖' },
  { id: 'LS-014', name: '五印坛城', lat: 31.426772, lng: 120.099884, category: '宗教', desc: '藏传佛教风格，四面环水，108转经筒长廊，9:00-17:00开放' },
  { id: 'LS-015', name: '曼飞龙塔', lat: 31.427063, lng: 120.099387, category: '人文', desc: '南传佛教白塔，九塔组合，复刻西双版纳曼飞龙白塔形制，夜景绝美' },
  { id: 'LS-016', name: '无尽意斋', lat: 31.425281, lng: 120.100380, category: '人文', desc: '赵朴初先生纪念馆，复刻北京四合院故居，禅茶免费品鉴，9:00-17:00' },
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

const BAIDU_MAP_AK = '9b3nqAd0qh8TvwOl2ubfa3QWv9LJggRL';

function buildMapHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#1a1a2e}
#map{width:100%;height:100%}
.info-window{font-family:sans-serif;padding:4px 0}
.info-window h4{margin:0 0 2px;font-size:14px;color:#1F2937}
.info-window p{margin:2px 0;font-size:11px;color:#6B7280}
.info-window .nav-btn{display:inline-block;margin-top:4px;padding:5px 14px;background:#2563EB;color:#fff;border-radius:4px;font-size:12px;cursor:pointer;text-decoration:none;font-weight:600}
</style>
</head>
<body>
<div id="map" style="color:#9ca3af;text-align:center;padding-top:60%;font-family:sans-serif;font-size:14px">地图加载中...</div>
<script>
window.onerror=function(m,s,l,c,e){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:"error",message:String(m),line:l}))}catch(e2){}};
var _map=null,_userMarker=null,_spotMarkers=[],_facMarkers=[],_navTarget=null;
function makeIcon(color,shape){var svg=shape==="pin"?'<svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42"><filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 28 14 28s14-17.5 14-28C28 6.3 21.7 0 14 0z" fill="'+color+'" filter="url(#s)"/><circle cx="14" cy="14" r="6" fill="#fff"/></svg>':'<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="'+color+'" stroke="#fff" stroke-width="2"/><rect x="6" y="6" width="10" height="10" fill="#fff" opacity="0.35" rx="2"/></svg>';return "data:image/svg+xml;base64,"+btoa(svg)}
function makeUserIcon(){var svg='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#3B82F6" stroke="#fff" stroke-width="3"/><circle cx="12" cy="12" r="4" fill="#fff"/></svg>';return "data:image/svg+xml;base64,"+btoa(svg)}
var FAC_COLORS={entrance:"#3B82F6",restroom:"#EC4899",parking:"#F59E0B",service:"#10B981",food:"#F97316"};
function initMap(){try{_map=new BMapGL.Map("map");_map.centerAndZoom(new BMapGL.Point(120.101375,31.424900),16);_map.setTilt(45);_map.enableScrollWheelZoom(true);try{_map.setMapStyle({style:"dark"})}catch(e){};window.ReactNativeWebView.postMessage(JSON.stringify({type:"mapReady"}))}catch(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:"error",message:"initMap:"+String(e)}));document.getElementById("map").innerHTML='<div style="color:#f87171;text-align:center;padding-top:60%;font-family:sans-serif">初始化失败:'+String(e)+"</div>"}}
function setSpots(spots){_spotMarkers.forEach(function(m){try{_map.removeOverlay(m)}catch(e){}});_spotMarkers=[];if(!spots||!spots.length)return;spots.forEach(function(s){var pt=new BMapGL.Point(s.lng,s.lat);var color=s.category==="自然"?"#22c55e":s.category==="人文"?"#f59e0b":s.category==="宗教"?"#a855f7":"#6b7280";try{var icon=new BMapGL.Icon(makeIcon(color,"pin"),new BMapGL.Size(28,42),{anchor:new BMapGL.Size(14,42),imageSize:new BMapGL.Size(28,42)});var marker=new BMapGL.Marker(pt,{icon:icon});marker._spot=s;marker.addEventListener("click",function(){showSpotInfo(this)});_map.addOverlay(marker);_spotMarkers.push(marker)}catch(e){};try{var label=new BMapGL.Label(s.name,{position:pt,offset:new BMapGL.Size(-16,-38)});label.setStyle({color:"#fff",background:"rgba(0,0,0,0.75)",border:"none",borderRadius:"3px",padding:"2px 6px",fontSize:"10px",fontFamily:"sans-serif",whiteSpace:"nowrap",pointerEvents:"none"});_map.addOverlay(label);_spotMarkers.push(label)}catch(e){}})}
function setFacilities(facilities){_facMarkers.forEach(function(m){try{_map.removeOverlay(m)}catch(e){}});_facMarkers=[];if(!facilities||!facilities.length)return;facilities.forEach(function(f){var pt=new BMapGL.Point(f.lng,f.lat);var color=FAC_COLORS[f.kind]||"#6B7280";try{var icon=new BMapGL.Icon(makeIcon(color,"dot"),new BMapGL.Size(22,22),{anchor:new BMapGL.Size(11,11),imageSize:new BMapGL.Size(22,22)});var marker=new BMapGL.Marker(pt,{icon:icon});marker._fac=f;marker.addEventListener("click",function(){try{var w=new BMapGL.InfoWindow('<div class="info-window"><h4>'+this._fac.name+"</h4></div>",{width:140,height:36});_map.openInfoWindow(w,this.getPosition())}catch(e){}});_map.addOverlay(marker);_facMarkers.push(marker)}catch(e){}})}
function setUserLocation(lat,lng){if(_userMarker){try{_map.removeOverlay(_userMarker)}catch(e){}}try{var pt=new BMapGL.Point(lng,lat);var icon=new BMapGL.Icon(makeUserIcon(),new BMapGL.Size(24,24),{anchor:new BMapGL.Size(12,12),imageSize:new BMapGL.Size(24,24)});_userMarker=new BMapGL.Marker(pt,{icon:icon});_map.addOverlay(_userMarker)}catch(e){}}
function centerOn(lat,lng){try{_map.centerAndZoom(new BMapGL.Point(lng,lat),18)}catch(e){}}
function showSpotInfo(marker){try{var s=marker._spot;_navTarget=s;var html='<div class="info-window"><h4>'+s.name+'</h4><p>'+(s.category||"")+'</p><span class="nav-btn" onclick="if(window._navTarget)navTo(window._navTarget.lat,window._navTarget.lng,window._navTarget.name)">导航到这里</span></div>';var w=new BMapGL.InfoWindow(html,{width:160,height:82});_map.openInfoWindow(w,marker.getPosition())}catch(e){}}
function navTo(lat,lng,name){window.ReactNativeWebView.postMessage(JSON.stringify({type:"navigate",lat:lat,lng:lng,name:name}))}
document.addEventListener("message",function(e){try{var d=JSON.parse(e.data);if(d.type==="setSpots")setSpots(d.spots);else if(d.type==="setFacilities")setFacilities(d.facilities);else if(d.type==="setUserLocation")setUserLocation(d.lat,d.lng);else if(d.type==="centerOn")centerOn(d.lat,d.lng);else if(d.type==="centerOnUser")centerOnUser()}catch(ex){}});
var _el=document.getElementById("map");
_el.innerHTML='<div style="color:#f59e0b;text-align:center;padding-top:60%;font-family:sans-serif;font-size:14px">JS已启动<br/><span style="font-size:11px;color:#9ca3af">加载百度地图SDK...</span></div>';
var _t0=Date.now(),_n=0,_done=false;
var _poll=setInterval(function(){_n++;if(typeof BMapGL!=="undefined"){if(_done)return;_done=true;clearInterval(_poll);_el.innerHTML='<div style="color:#22c55e;text-align:center;padding-top:60%;font-family:sans-serif;font-size:14px">SDK就绪<br/><span style="font-size:11px;color:#9ca3af">初始化地图...</span></div>';setTimeout(initMap,10)}else if(_n%20===0){_el.innerHTML='<div style="color:#f59e0b;text-align:center;padding-top:60%;font-family:sans-serif;font-size:14px">等待SDK '+Math.round((Date.now()-_t0)/1000)+'s<br/><span style="font-size:11px;color:#9ca3af">BMapGL:'+(typeof BMapGL)+'</span></div>'}},80);
setTimeout(function(){if(!_done&&typeof BMapGL==="undefined"){_done=true;clearInterval(_poll);_el.innerHTML='<div style="color:#f87171;text-align:center;padding-top:60%;font-family:sans-serif;font-size:14px">地图加载失败<br/><span style="font-size:11px;color:#9ca3af">BMapGL未加载('+Math.round((Date.now()-_t0)/1000)+'s)</span></div>'}},15000);
</script>
<script src="https://api.map.baidu.com/api?type=webgl&v=1.0&ak=${BAIDU_MAP_AK}" onerror="_el.innerHTML='<div style=&quot;color:#f87171;text-align:center;padding-top:60%;font-family:sans-serif;font-size:14px&quot;>SDK脚本加载失败<br/><span style=&quot;font-size:11px;color:#9ca3af&quot;>网络错误或脚本被拦截</span></div>'"></script>
</body>
</html>`;
}

export default function MapScreen() {
  const mapHtml = useMemo(() => buildMapHtml(), []);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [facilityFilter, setFacilityFilter] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
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

        // Start watch first — it survives even if getCurrentPosition fails
        locWatchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 2000 },
          (newLoc) => {
            console.log('[GPS] update:', newLoc.coords.latitude, newLoc.coords.longitude);
            setUserLoc({ lat: newLoc.coords.latitude, lng: newLoc.coords.longitude });
          },
        );
        console.log('[GPS] watch started');

        // Try to get immediate position
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          console.log('[GPS] got position:', loc.coords.latitude, loc.coords.longitude);
          setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch (posErr) {
          console.warn('[GPS] getCurrentPosition failed, waiting for watch:', String(posErr));
          // Try last known as fallback
          try {
            const last = await Location.getLastKnownPositionAsync();
            if (last) {
              console.log('[GPS] last known:', last.coords.latitude, last.coords.longitude);
              setUserLoc({ lat: last.coords.latitude, lng: last.coords.longitude });
            }
          } catch {}
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

  // Spot/facility markers removed per user request — map shows only GPS position

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
        console.warn('[MapView Error] line=' + data.line + ' col=' + data.col + ': ' + data.message);
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
    postToMap({ type: 'centerOn', lat: LINGSHAN_CENTER.lat, lng: LINGSHAN_CENTER.lng });
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
      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ uri: 'http://localhost:8000/map' }}
        onMessage={handleMessage}
        geolocationEnabled={true}
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
        cacheEnabled={false}
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

      {/* Facility filter bar */}
      <View style={styles.facFilterBar}>
        <ScrollableFacilityFilters
          selected={facilityFilter}
          onToggle={toggleFacilityFilter}
        />
      </View>

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
});
