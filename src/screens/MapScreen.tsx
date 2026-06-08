import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, ScrollView, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import api from '../services/api';

interface Spot {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: string;
  distance_km?: number;
}

const PLACEHOLDER_FACILITIES = [
  { id: 'entrance', name: '景区入口', lat: 31.502, lng: 120.098, icon: '🚪' },
  { id: 'restroom1', name: '卫生间', lat: 31.503, lng: 120.099, icon: '🚻' },
  { id: 'parking', name: '停车场', lat: 31.501, lng: 120.097, icon: '🅿️' },
];

export default function MapScreen() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } else {
          setLocationError('位置权限未开启');
        }
      } catch {
        setLocationError('无法获取位置');
      }
      setLoading(false);
    })();
    loadSpots();
  }, []);

  const loadSpots = async () => {
    try {
      const data = await api.getSpots({ page_size: '50' });
      setSpots(data.items || []);
    } catch {}
  };

  const openNavigation = (lat: number, lng: number, name: string) => {
    const url = `https://uri.amap.com/navigation?to=${lng},${lat},${name}&mode=walk&callnative=1`;
    Linking.openURL(url).catch(() => {
      Alert.alert('无法打开导航', '请确认已安装高德地图');
    });
  };

  const openWebMap = () => {
    if (userLocation) {
      const url = `https://uri.amap.com/marker?position=${userLocation.lng},${userLocation.lat}&name=我的位置`;
      Linking.openURL(url).catch(() => {});
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 100 }} />
        <Text style={styles.loadingText}>获取位置中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>景区地图</Text>
        {locationError ? (
          <Text style={styles.locationError}>{locationError}</Text>
        ) : userLocation ? (
          <Text style={styles.locationInfo}>
            当前位置: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
          </Text>
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={openWebMap}>
          <Text style={styles.actionBtnText}>🗺️ 打开地图</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContainer}>
        {/* User location card */}
        {userLocation && (
          <View style={styles.locationCard}>
            <Text style={styles.sectionTitle}>📍 我的位置</Text>
            <Text style={styles.coordText}>
              纬度: {userLocation.lat.toFixed(6)}  经度: {userLocation.lng.toFixed(6)}
            </Text>
          </View>
        )}

        {/* Scenic spots list */}
        <Text style={styles.sectionTitle}>🏔️ 附近景点 ({spots.length})</Text>
        {spots.map((spot) => (
          <TouchableOpacity
            key={`spot-${spot.id}`}
            style={styles.spotCard}
            onPress={() => openNavigation(spot.lat, spot.lng, spot.name)}
          >
            <View style={styles.spotInfo}>
              <Text style={styles.spotName}>{spot.name}</Text>
              <Text style={styles.spotCategory}>{spot.category}</Text>
              <Text style={styles.spotCoords}>
                经纬度: {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => openNavigation(spot.lat, spot.lng, spot.name)}
            >
              <Text style={styles.navBtnText}>🧭 导航</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {/* Facilities */}
        <Text style={styles.sectionTitle}>🏠 常用设施</Text>
        {PLACEHOLDER_FACILITIES.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={styles.facilityCard}
            onPress={() => openNavigation(f.lat, f.lng, f.name)}
          >
            <Text style={styles.facilityIcon}>{f.icon}</Text>
            <View style={styles.facilityInfo}>
              <Text style={styles.facilityName}>{f.name}</Text>
              <Text style={styles.spotCoords}>
                经纬度: {f.lat.toFixed(4)}, {f.lng.toFixed(4)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => openNavigation(f.lat, f.lng, f.name)}
            >
              <Text style={styles.navBtnText}>🧭 导航</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#FFFFFF', padding: 16, paddingTop: 50,
    borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  locationInfo: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  locationError: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  loadingText: { textAlign: 'center', color: '#6B7280', marginTop: 12 },
  actionRow: { padding: 12, flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  listContainer: { flex: 1, padding: 16 },
  locationCard: {
    backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12,
    marginBottom: 20, borderWidth: 1, borderColor: '#BFDBFE',
  },
  coordText: { fontSize: 12, color: '#4B5563', marginTop: 4, fontFamily: 'monospace' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12, marginTop: 8 },
  spotCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: 14, borderRadius: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  spotInfo: { flex: 1 },
  spotName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  spotCategory: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  spotCoords: { fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 2 },
  navBtn: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  navBtnText: { color: '#2563EB', fontSize: 13, fontWeight: '500' },
  facilityCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: 14, borderRadius: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  facilityIcon: { fontSize: 28, marginRight: 12 },
  facilityInfo: { flex: 1 },
  facilityName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
});
