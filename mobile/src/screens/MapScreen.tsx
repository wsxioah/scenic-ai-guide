import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Image,
} from 'react-native';
import {
  Map, Camera, Marker, ShapeSource, LineLayer,
  type MapRef, type CameraRef,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import BroadcastBanner from '../components/BroadcastBanner';

// OpenStreetMap raster tile style (free, no API key)
const OSM_STYLE = 'https://demotiles.maplibre.org/style.json';

// 灵山 scenic center in WGS84
const LINGSHAN_CENTER = { lat: 31.421, lng: 120.090 };

// Scenic spots with WGS84 coordinates
const SCENIC_SPOTS: { name: string; lat: number; lng: number }[] = [
  { name: '灵山大佛', lat: 31.4190, lng: 120.0960 },
  { name: '九龙灌浴', lat: 31.4200, lng: 120.0940 },
  { name: '祥符禅寺', lat: 31.4215, lng: 120.0920 },
  { name: '灵山梵宫', lat: 31.4225, lng: 120.0950 },
  { name: '五印坛城', lat: 31.4235, lng: 120.0970 },
  { name: '灵山大照壁', lat: 31.4185, lng: 120.0910 },
  { name: '五明桥', lat: 31.4180, lng: 120.0900 },
  { name: '佛足坛', lat: 31.4195, lng: 120.0905 },
  { name: '五智门', lat: 31.4205, lng: 120.0910 },
  { name: '菩提大道', lat: 31.4210, lng: 120.0915 },
  { name: '降魔浮雕', lat: 31.4215, lng: 120.0930 },
  { name: '阿育王柱', lat: 31.4220, lng: 120.0940 },
  { name: '百子戏弥勒', lat: 31.4230, lng: 120.0960 },
  { name: '曼飞龙塔', lat: 31.4240, lng: 120.0950 },
  { name: '无尽意斋', lat: 31.4245, lng: 120.0940 },
  { name: '佛教文化博览馆', lat: 31.4250, lng: 120.0930 },
];

interface RouteCoords { coordinates: [number, number][]; };

async function fetchWalkingRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<RouteCoords | null> {
  const url = `https://router.project-osrm.org/route/v1/foot/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.code === 'Ok' && data.routes?.length > 0) {
      const r = data.routes[0];
      return {
        coordinates: r.geometry.coordinates as [number, number][],
        distance: r.distance / 1000,
        duration: r.duration / 60,
      } as any;
    }
  } catch (e) { console.log('[OSRM] Error:', e); }
  return null;
}

export default function MapScreen() {
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<{name:string;lat:number;lng:number}|null>(null);
  const [routeInfo, setRouteInfo] = useState<{name:string;distance:string;duration:string}|null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const locWatchRef = useRef<Location.LocationSubscription | null>(null);
  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const hasCentered = useRef(false);

  useEffect(() => { userLocRef.current = userLoc; }, [userLoc]);

  // GPS setup
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setError('位置权限未开启'); return; }

        let loc = await Location.getLastKnownPositionAsync();
        if (loc) {
          setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }

        const timeout = new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000));
        try {
          const fresh = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000 }),
            timeout,
          ]);
          if (fresh) {
            setUserLoc({ lat: fresh.coords.latitude, lng: fresh.coords.longitude });
          }
        } catch {
          if (!loc) setError('定位超时，请检查GPS是否开启');
        }

        locWatchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 3000 },
          (newLoc) => { setUserLoc({ lat: newLoc.coords.latitude, lng: newLoc.coords.longitude }); },
        );
      } catch (e: any) { setError('定位失败: ' + (e?.message || '')); }
    })();
    return () => { locWatchRef.current?.remove(); };
  }, []);

  // First GPS fix: center on user
  useEffect(() => {
    if (mapLoaded && userLoc && !hasCentered.current && cameraRef.current) {
      hasCentered.current = true;
      cameraRef.current.setCamera({ centerCoordinate: [userLoc.lng, userLoc.lat], zoomLevel: 17, animationDuration: 1000 });
    }
  }, [userLoc, mapLoaded]);

  const goToMyLocation = () => {
    if (!userLocRef.current) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [userLocRef.current.lng, userLocRef.current.lat],
      zoomLevel: 18,
      animationDuration: 500,
    });
  };

  const navigateToSpot = async (name: string, lat: number, lng: number) => {
    setSelectedSpot({ name, lat, lng });
    setRouteInfo(null);
    setRouteGeoJSON(null);
    setLoadingRoute(true);

    // Center on target
    cameraRef.current?.setCamera({ centerCoordinate: [lng, lat], zoomLevel: 18, animationDuration: 500 });

    if (!userLocRef.current) { setLoadingRoute(false); return; }

    const route = await fetchWalkingRoute(userLocRef.current.lat, userLocRef.current.lng, lat, lng);
    if (route) {
      setRouteInfo({
        name,
        distance: ((route as any).distance as number).toFixed(2),
        duration: ((route as any).duration as number).toFixed(0),
      });
      setRouteGeoJSON({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: route.coordinates },
      });
    }
    setLoadingRoute(false);
  };

  const clearSelection = () => {
    setSelectedSpot(null);
    setRouteInfo(null);
    setRouteGeoJSON(null);
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
      <Map
        ref={mapRef}
        mapStyle={OSM_STYLE}
        style={styles.map}
        onDidFinishLoadingMap={() => setMapLoaded(true)}
        onPress={() => { setSelectedSpot(null); setRouteInfo(null); setRouteGeoJSON(null); }}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: [LINGSHAN_CENTER.lng, LINGSHAN_CENTER.lat], zoomLevel: 15 }}
          minZoomLevel={14}
          maxZoomLevel={19}
        />

        {/* User location marker */}
        {userLoc && (
          <Marker
            key="user-loc"
            coordinate={[userLoc.lng, userLoc.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarker}>
              <View style={styles.userMarkerDot} />
            </View>
          </Marker>
        )}

        {/* Scenic spot markers */}
        {SCENIC_SPOTS.map((spot, i) => (
          <Marker
            key={`spot-${i}`}
            coordinate={[spot.lng, spot.lat]}
            anchor={{ x: 0.5, y: 1 }}
            onPress={() => {
              setSelectedSpot({ name: spot.name, lat: spot.lat, lng: spot.lng });
              setRouteInfo(null);
              setRouteGeoJSON(null);
            }}
          >
            <View style={styles.spotMarker}>
              <Text style={styles.spotMarkerIcon}>📍</Text>
            </View>
          </Marker>
        ))}

        {/* Route polyline */}
        {routeGeoJSON && (
          <ShapeSource id="route" shape={routeGeoJSON}>
            <LineLayer
              id="route-line"
              style={{ lineColor: '#2563EB', lineWidth: 4, lineOpacity: 0.85 }}
            />
          </ShapeSource>
        )}
      </Map>

      {!mapLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#C8963E" />
          <Text style={styles.loadingText}>地图加载中...</Text>
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
      <TouchableOpacity style={styles.scenicBtn} onPress={() => {
        clearSelection();
        cameraRef.current?.setCamera({ centerCoordinate: [LINGSHAN_CENTER.lng, LINGSHAN_CENTER.lat], zoomLevel: 15, animationDuration: 500 });
      }}>
        <Text style={styles.btnLabel}>🏛</Text>
      </TouchableOpacity>

      {selectedSpot && (
        <View style={styles.spotPanel}>
          <View style={styles.spotPanelHeader}>
            <Text style={styles.spotPanelTitle}>{selectedSpot.name}</Text>
            <TouchableOpacity onPress={clearSelection}>
              <Text style={styles.spotPanelClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {loadingRoute ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 10 }} />
          ) : routeInfo ? (
            <View>
              <Text style={styles.routeInfoText}>距离: {routeInfo.distance}km</Text>
              <Text style={styles.routeInfoText}>预计: {routeInfo.duration}分钟</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => navigateToSpot(selectedSpot.name, selectedSpot.lat, selectedSpot.lng)}
            >
              <Text style={styles.navBtnText}>🧭 导航到这里</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  map: { flex: 1 },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  loadingText: { color: '#9CA3AF', marginTop: 12, fontSize: 14 },
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
  // User location marker
  userMarker: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  userMarkerDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  // Scenic spot marker
  spotMarker: {
    alignItems: 'center',
  },
  spotMarkerIcon: {
    fontSize: 24,
  },
  // Spot panel
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
    alignItems: 'center', marginTop: 6,
  },
  navBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
