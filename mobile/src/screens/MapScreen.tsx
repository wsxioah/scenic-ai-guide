import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking,
  Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import BroadcastBanner from '../components/BroadcastBanner';

const BAIDU_AK = '9b3nqAd0qh8TvwOl2ubfa3QWv9LJggRL';

// Scenic spots with approximate WGS84 coordinates for 灵山
const SCENIC_SPOTS: { name: string; wgsLat: number; wgsLng: number }[] = [
  { name: '灵山大佛', wgsLat: 31.4190, wgsLng: 120.0960 },
  { name: '九龙灌浴', wgsLat: 31.4200, wgsLng: 120.0940 },
  { name: '祥符禅寺', wgsLat: 31.4215, wgsLng: 120.0920 },
  { name: '灵山梵宫', wgsLat: 31.4225, wgsLng: 120.0950 },
  { name: '五印坛城', wgsLat: 31.4235, wgsLng: 120.0970 },
  { name: '灵山大照壁', wgsLat: 31.4185, wgsLng: 120.0910 },
  { name: '五明桥', wgsLat: 31.4180, wgsLng: 120.0900 },
  { name: '佛足坛', wgsLat: 31.4195, wgsLng: 120.0905 },
  { name: '五智门', wgsLat: 31.4205, wgsLng: 120.0910 },
  { name: '菩提大道', wgsLat: 31.4210, wgsLng: 120.0915 },
  { name: '降魔浮雕', wgsLat: 31.4215, wgsLng: 120.0930 },
  { name: '阿育王柱', wgsLat: 31.4220, wgsLng: 120.0940 },
  { name: '百子戏弥勒', wgsLat: 31.4230, wgsLng: 120.0960 },
  { name: '曼飞龙塔', wgsLat: 31.4240, wgsLng: 120.0950 },
  { name: '无尽意斋', wgsLat: 31.4245, wgsLng: 120.0940 },
  { name: '佛教文化博览馆', wgsLat: 31.4250, wgsLng: 120.0930 },
];

async function fetchWalkingRoute(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const url = `https://router.project-osrm.org/route/v1/foot/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.code === 'Ok' && data.routes?.length > 0) {
      const r = data.routes[0];
      return {
        points: r.geometry.coordinates as [number, number][],
        distance: (r.distance / 1000),
        duration: (r.duration / 60),
      };
    }
  } catch (e) { console.log('[OSRM] Fetch error:', e); }
  return null;
}

function buildBMapHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
  *{margin:0;padding:0;}
  html,body{width:100%;height:100%;overflow:hidden;background:#1a1a2e;}
  #map{width:100%;height:100%;position:absolute;top:0;left:0;}
  #log{position:fixed;top:10px;left:10px;color:#0f0;font-size:10px;z-index:9999;pointer-events:none;background:rgba(0,0,0,0.7);padding:5px;max-width:90%;}
</style>
<script src="https://api.map.baidu.com/api?type=webgl&v=1.0&ak=${BAIDU_AK}"></script>
</head>
<body>
<div id="map"></div>
<div id="log">Starting...</div>
<script>
function log(s) {
  var el=document.getElementById('log');
  el.innerText=(el.innerText+'\\n'+s).slice(-1500);
  try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'log',msg:s}));}catch(e){}
}
log('HTML script started');

window.onerror = function(m,u,l){ log('ERR:'+m+' L:'+l); };

var _pollCount=0;
var _pollTimer=setInterval(function(){
  _pollCount++;
  if(typeof BMapGL !== 'undefined'){
    clearInterval(_pollTimer);
    log('BMapGL detected after '+(_pollCount*200)+'ms');
    initMap();
  } else if(_pollCount > 150){
    clearInterval(_pollTimer);
    log('TIMEOUT');
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',msg:'API load failed'}));
  }
},200);

// WGS84->BD09 coordinate conversion (Lite has no BMap.Convertor)
(function(){
  var PI=Math.PI, A=6378245, EE=0.00669342162296594323;
  function _tLat(x,y){
    var r=-100+2*x+3*y+0.2*y*y+0.1*x*y+0.2*Math.sqrt(Math.abs(x));
    r+=(20*Math.sin(6*x*PI)+20*Math.sin(2*x*PI))*2/3;
    r+=(20*Math.sin(y*PI)+40*Math.sin(y/3*PI))*2/3;
    r+=(160*Math.sin(y/12*PI)+320*Math.sin(y*PI/30))*2/3;
    return r;
  }
  function _tLng(x,y){
    var r=300+x+2*y+0.1*x*x+0.1*x*y+0.1*Math.sqrt(Math.abs(x));
    r+=(20*Math.sin(6*x*PI)+20*Math.sin(2*x*PI))*2/3;
    r+=(20*Math.sin(x*PI)+40*Math.sin(x/3*PI))*2/3;
    r+=(150*Math.sin(x/12*PI)+300*Math.sin(x/30*PI))*2/3;
    return r;
  }
  window._wgsToGcj=function(lat,lng){
    var dLat=_tLat(lng-105,lat-35), dLng=_tLng(lng-105,lat-35);
    var rad=lat/180*PI, m=Math.sin(rad), mgc=1-EE*m*m, sm=Math.sqrt(mgc);
    dLat=(dLat*180)/((A*(1-EE))/(mgc*sm)*PI);
    dLng=(dLng*180)/(A/sm*Math.cos(rad)*PI);
    return {lat:lat+dLat, lng:lng+dLng};
  };
  window._gcjToBd=function(lat,lng){
    var z=Math.sqrt(lng*lng+lat*lat)+0.00002*Math.sin(lat*PI*3000/180);
    var t=Math.atan2(lat,lng)+0.000003*Math.cos(lng*PI*3000/180);
    return {lat:z*Math.sin(t)+0.006, lng:z*Math.cos(t)+0.0065};
  };
})();

function initMap() {
  log('Init BMapGL');
  try {
    var map = new BMapGL.Map('map', {minZoom:15, maxZoom:18, heading:0, tilt:60});
    map.centerAndZoom(new BMapGL.Point(120.107,31.431), 17);
    map.enableScrollWheelZoom(true);
    map.addControl(new BMapGL.NavigationControl({anchor:BMAP_ANCHOR_TOP_RIGHT, type:BMAP_NAVIGATION_CONTROL_LARGE}));
    window._map = map;
    window._routeLine = null;

    // Map click: send coordinates
    map.addEventListener('click',function(e){
      var pt=e.latlng||e.point;
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'tap_coord', lat:pt.lat, lng:pt.lng}));
    });

    log('READY');
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'map_ready'}));
  } catch(e) { log('INIT ERR: '+e.message); }
}

// Draw route from OSRM data (points in WGS84, converted to BD09 for display)
window.drawRouteOnMap = function(points){
  var map=window._map; if(!map||!points||!points.length)return;
  window.clearRoute();
  var bdPts=[];
  for(var i=0;i<points.length;i++){
    // OSRM returns [lng,lat], _wgsToGcj expects (lat,lng)
    var gcj=window._wgsToGcj(points[i][1],points[i][0]);
    var bd=window._gcjToBd(gcj.lat,gcj.lng);
    bdPts.push(new BMapGL.Point(bd.lng,bd.lat));
  }
  window._routeLine=new BMapGL.Polyline(bdPts,{
    strokeColor:'#2563EB',strokeWeight:5,strokeOpacity:0.85
  });
  map.addOverlay(window._routeLine);
  // Fit map to show entire route
  try{
    var view=map.getViewport(bdPts,{margins:[60,60,60,60]});
    map.centerAndZoom(view.center, view.zoom);
  }catch(e){}
};

window.clearRoute = function(){
  if(window._routeLine){window._map.removeOverlay(window._routeLine);window._routeLine=null;}
};

// Add scenic spot markers from RN-injected data
// spots: [{name,wgsLat,wgsLng},...]
window._spotMarkers=[];
window.addSpotMarkers = function(spots){
  var map=window._map; if(!map)return;
  window.clearSpotMarkers();
  for(var i=0;i<spots.length;i++){
    var s=spots[i];
    var gcj=window._wgsToGcj(s.wgsLat,s.wgsLng);
    var bd=window._gcjToBd(gcj.lat,gcj.lng);
    var pt=new BMapGL.Point(bd.lng,bd.lat);
    try{
      var mk=new BMapGL.Marker(pt,{
        icon:new BMapGL.Icon(
          'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="#C8963E" stroke="#fff" stroke-width="1.5"/><circle cx="14" cy="13" r="5" fill="#fff"/></svg>'),
          new BMapGL.Size(28,36),{anchor:new BMapGL.Size(14,36)}
        )
      });
    }catch(e){mk=new BMapGL.Marker(pt);}
    mk.setTitle(s.name);
    (function(name,wgsLat,wgsLng,bdLat,bdLng){
      mk.addEventListener('click',function(){
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type:'spot_click',name:name,wgsLat:wgsLat,wgsLng:wgsLng,bdLat:bdLat,bdLng:bdLng
        }));
      });
    })(s.name,s.wgsLat,s.wgsLng,bd.lat,bd.lng);
    map.addOverlay(mk);
    window._spotMarkers.push(mk);
  }
};

window.clearSpotMarkers = function(){
  for(var i=0;i<window._spotMarkers.length;i++){window._map.removeOverlay(window._spotMarkers[i]);}
  window._spotMarkers=[];
};

window.updateUserLoc = function(wgsLat,wgsLng){
  var map=window._map; if(!map){log('updateUserLoc: no map');return;}
  log('updateUserLoc: WGS('+wgsLat.toFixed(6)+','+wgsLng.toFixed(6)+')');
  var gcj=window._wgsToGcj(wgsLat,wgsLng);
  var bd=window._gcjToBd(gcj.lat,gcj.lng);
  log('updateUserLoc: BD09('+bd.lat.toFixed(6)+','+bd.lng.toFixed(6)+')');
  var pt=new BMapGL.Point(bd.lng,bd.lat);
  window._userLoc=bd;
  if(window._um)map.removeOverlay(window._um);
  try {
    window._um=new BMapGL.Marker(pt,{
      icon:new BMapGL.Icon(
        'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#2563EB" stroke="#fff" stroke-width="2"/><circle cx="10" cy="10" r="4" fill="#fff" opacity="0.5"/></svg>'),
        new BMapGL.Size(20,20),{anchor:new BMapGL.Size(10,10)}
      )
    });
    map.addOverlay(window._um);
    log('updateUserLoc: marker added');
  } catch(e) {
    // BMapGL.Marker might not work — try bare marker
    window._um=new BMapGL.Marker(pt);
    map.addOverlay(window._um);
    log('updateUserLoc: bare marker added');
  }
};

window.centerOnUser = function(wgsLat,wgsLng){
  var map=window._map; if(!map){log('centerOnUser: no map');return;}
  log('centerOnUser: WGS('+wgsLat.toFixed(6)+','+wgsLng.toFixed(6)+')');
  var gcj=window._wgsToGcj(wgsLat,wgsLng);
  var bd=window._gcjToBd(gcj.lat,gcj.lng);
  map.centerAndZoom(new BMapGL.Point(bd.lng,bd.lat), 18);
  log('centerOnUser: done');
};
</script>
</body>
</html>`;
}

export default function MapScreen() {
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [debugLog, setDebugLog] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<{name:string;wgsLat:number;wgsLng:number;bdLat:number;bdLng:number}|null>(null);
  const [routeInfo, setRouteInfo] = useState<{name:string;distance:string;duration:string}|null>(null);
  const [tapCoord, setTapCoord] = useState<{lat:number;lng:number}|null>(null);

  const webViewRef = useRef<WebView>(null);
  const locWatchRef = useRef<Location.LocationSubscription | null>(null);
  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const hasCentered = useRef(false);

  useEffect(() => { userLocRef.current = userLoc; }, [userLoc]);

  useEffect(() => {
    (async () => {
      try {
        console.log('[GPS] Requesting permission...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('[GPS] Permission:', status);
        if (status !== 'granted') { setError('位置权限未开启'); return; }

        // Try low accuracy first (fast), then upgrade
        let loc = await Location.getLastKnownPositionAsync();
        if (loc) {
          console.log('[GPS] LastKnown:', loc.coords.latitude, loc.coords.longitude);
          setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }

        // Get fresh position with timeout
        const timeout = new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000));
        try {
          const fresh = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000 }),
            timeout,
          ]);
          if (fresh) {
            console.log('[GPS] Got position:', fresh.coords.latitude, fresh.coords.longitude);
            setUserLoc({ lat: fresh.coords.latitude, lng: fresh.coords.longitude });
          }
        } catch {
          // If fresh position times out, use last known position if available
          if (!loc) setError('定位超时，请检查GPS是否开启');
          console.log('[GPS] Timeout waiting for fresh position');
        }

        locWatchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 3000 },
          (newLoc) => { console.log('[GPS] Update:', newLoc.coords.latitude, newLoc.coords.longitude); setUserLoc({ lat: newLoc.coords.latitude, lng: newLoc.coords.longitude }); },
        );
      } catch (e: any) { console.log('[GPS] Error:', e?.message); setError('定位失败: ' + (e?.message || '')); }
    })();
    return () => { locWatchRef.current?.remove(); };
  }, []);

  // On first GPS fix: update marker + center map on user
  useEffect(() => {
    console.log('[GPS-EFFECT] mapReady:', mapReady, 'userLoc:', !!userLoc, 'hasCentered:', hasCentered.current);
    if (mapReady && userLoc && webViewRef.current) {
      console.log('[GPS-EFFECT] Injecting updateUserLoc + centerOnUser');
      webViewRef.current.injectJavaScript(`updateUserLoc(${userLoc.lat},${userLoc.lng});true;`);
      if (!hasCentered.current) {
        hasCentered.current = true;
        webViewRef.current.injectJavaScript(`centerOnUser(${userLoc.lat},${userLoc.lng});true;`);
      }
    }
  }, [userLoc, mapReady]);

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      console.log('WV:', e.nativeEvent.data);
      switch (msg.type) {
        case 'log': setDebugLog(prev => (prev + '\n' + msg.msg).slice(-400)); break;
        case 'error': setDebugLog(prev => (prev + '\nERR:' + msg.msg).slice(-400)); break;
        case 'map_ready':
          console.log('MAP READY!');
          setMapReady(true);
          // Inject scenic spot markers
          webViewRef.current?.injectJavaScript(
            'addSpotMarkers(' + JSON.stringify(SCENIC_SPOTS) + ');true;'
          );
          break;
        case 'tap_coord':
          console.log('TAP COORD:', `BD09(${msg.lat?.toFixed(6)},${msg.lng?.toFixed(6)})`);
          setTapCoord({ lat: msg.lat, lng: msg.lng });
          setSelectedSpot(null); setRouteInfo(null);
          break;
        case 'spot_click':
          console.log('SPOT CLICK:', msg.name);
          setSelectedSpot({ name: msg.name, wgsLat: msg.wgsLat, wgsLng: msg.wgsLng, bdLat: msg.bdLat, bdLng: msg.bdLng });
          setRouteInfo(null);
          break;
      }
    } catch {}
  };

  const goToMyLocation = () => {
    if (!mapReady || !userLocRef.current) return;
    const { lat, lng } = userLocRef.current;
    webViewRef.current?.injectJavaScript(`centerOnUser(${lat},${lng});true;`);
  };

  const navigateToSpot = async (name: string, wgsLat: number, wgsLng: number, bdLat: number, bdLng: number) => {
    setSelectedSpot({ name, wgsLat, wgsLng, bdLat, bdLng });
    setRouteInfo(null);
    // Center map on the spot
    webViewRef.current?.injectJavaScript(`window._map.centerAndZoom(new BMapGL.Point(${bdLng},${bdLat}),18);true;`);
    if (!userLocRef.current) {
      setRouteInfo(null);
      return;
    }
    // Fetch walking route from free OSRM API
    const route = await fetchWalkingRoute(userLocRef.current.lat, userLocRef.current.lng, wgsLat, wgsLng);
    if (route) {
      setRouteInfo({ name, distance: route.distance.toFixed(2), duration: route.duration.toFixed(0) });
      // Draw route on map
      webViewRef.current?.injectJavaScript(
        'drawRouteOnMap(' + JSON.stringify(route.points) + ');true;'
      );
    } else {
      setRouteInfo(null);
    }
  };

  const clearSelection = () => {
    setSelectedSpot(null);
    setRouteInfo(null);
    webViewRef.current?.injectJavaScript('clearRoute();true;');
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

  const mapHtml = buildBMapHtml();

  return (
    <View style={styles.container}>
      <WebView
        key="bmapgl-v10"
        ref={webViewRef}
        source={{ html: mapHtml, baseUrl: 'https://api.map.baidu.com/' }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        onMessage={handleMessage}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        androidLayerType="hardware"
        originWhitelist={['*']}
        mixedContentMode="always"
        allowFileAccess
      />

      {!mapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#C8963E" />
          <Text style={styles.loadingText}>地图加载中...</Text>
          <ScrollView style={{ maxHeight: 250, marginTop: 12, width: '90%' }}>
            <Text style={styles.debugText}>{debugLog}</Text>
          </ScrollView>
        </View>
      )}

      <BroadcastBanner />

      {error && !userLoc && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={retryLocation}>
            <Text style={styles.errorBannerBtn}>重试</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.locateBtn} onPress={goToMyLocation}>
        <Text style={styles.btnLabel}>📍</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.scenicBtn} onPress={() => { setSelectedSpot(null); setTapCoord(null); webViewRef.current?.injectJavaScript('window._map.centerAndZoom(new BMapGL.Point(120.107,31.431),17);true;'); }}>
        <Text style={styles.btnLabel}>🏛</Text>
      </TouchableOpacity>

      {tapCoord && (
        <View style={styles.coordTip}>
          <Text style={styles.coordTipText}>
            BD09: {tapCoord.lat.toFixed(6)}, {tapCoord.lng.toFixed(6)}
          </Text>
          <TouchableOpacity onPress={() => setTapCoord(null)}>
            <Text style={styles.coordTipClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedSpot && (
        <View style={styles.spotPanel}>
          <View style={styles.spotPanelHeader}>
            <Text style={styles.spotPanelTitle}>{selectedSpot.name}</Text>
            <TouchableOpacity onPress={clearSelection}>
              <Text style={styles.spotPanelClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {routeInfo ? (
            <View>
              <Text style={styles.routeInfoText}>距离: {routeInfo.distance}km</Text>
              <Text style={styles.routeInfoText}>预计: {routeInfo.duration}分钟</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.navBtn} onPress={() => navigateToSpot(selectedSpot.name, selectedSpot.wgsLat, selectedSpot.wgsLng, selectedSpot.bdLat, selectedSpot.bdLng)}>
              <Text style={styles.navBtnText}>🧭 导航到这里</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  loadingText: { color: '#9CA3AF', marginTop: 12, fontSize: 14 },
  debugText: { color: '#0f0', fontSize: 9, fontFamily: 'monospace' },
  errorBanner: {
    position: 'absolute', right: 12, top: 54, zIndex: 5,
    backgroundColor: 'rgba(254,242,242,0.95)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 6, borderWidth: 0.5, borderColor: '#FECACA',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  errorBannerText: { color: '#991B1B', fontSize: 12 },
  errorBannerBtn: { color: '#2563EB', fontSize: 12, fontWeight: '600' },
  locateBtn: {
    position: 'absolute', right: 12, bottom: 40, zIndex: 5,
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  btnLabel: { fontSize: 18 },
  scenicBtn: {
    position: 'absolute', right: 12, bottom: 92, zIndex: 5,
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  spotPanel: {
    position: 'absolute', bottom: 36, left: 16, right: 16, zIndex: 5,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8,
  },
  spotPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spotPanelTitle: { color: '#1F2937', fontSize: 18, fontWeight: '700' },
  spotPanelClose: { color: '#9CA3AF', fontSize: 16, padding: 4 },
  routeInfoText: { color: '#6B7280', fontSize: 14, marginTop: 4 },
  navBtn: {
    backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 10,
    alignItems: 'center',
  },
  navBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  coordTip: {
    position: 'absolute', left: 12, bottom: 100, zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  coordTipText: { color: '#0f0', fontSize: 11, fontFamily: 'monospace' },
  coordTipClose: { color: '#fff', fontSize: 14, padding: 2 },
});
