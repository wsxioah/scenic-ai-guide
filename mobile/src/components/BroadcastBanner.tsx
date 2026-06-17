import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { SERVER_URL } from '../config';
import { Colors } from '../theme';

interface BroadcastMessage {
  id: number;
  icon: string;
  text: string;
}

const MAX_SHOW = 3;
const FETCH_INTERVAL = 30000;
const DISPLAY_MS = 8000;
const GAP_MS = 3000;

const shownMap: Record<number, number> = {};

export default function BroadcastBanner() {
  const [current, setCurrent] = useState<BroadcastMessage | null>(null);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueRef = useRef<BroadcastMessage[]>([]);

  const clearTimers = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const showNext = () => {
    if (queueRef.current.length === 0) {
      Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }).start(() => setCurrent(null));
      return;
    }
    const msg = queueRef.current.shift()!;
    shownMap[msg.id] = (shownMap[msg.id] || 0) + 1;
    setCurrent(msg);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();

    clearTimers();
    timerRef.current = setTimeout(() => {
      Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }).start(() => {
        setCurrent(null);
        timerRef.current = setTimeout(showNext, GAP_MS);
      });
    }, DISPLAY_MS);
  };

  const dismiss = () => {
    clearTimers();
    Animated.timing(slideAnim, { toValue: -100, duration: 200, useNativeDriver: true }).start(() => {
      setCurrent(null);
      timerRef.current = setTimeout(showNext, 1000);
    });
  };

  const fetchAlerts = async () => {
    try {
      const resp = await fetch(`${SERVER_URL}/api/alerts/broadcast`);
      const data = await resp.json();
      const alerts = data.alerts || [];
      if (!alerts.length) return;

      const queue: BroadcastMessage[] = [];
      for (const a of alerts) {
        const shown = shownMap[a.id] || 0;
        const remaining = MAX_SHOW - shown;
        if (remaining <= 0) continue;
        const desc = a.description ? `：${a.description.slice(0, 30)}` : '';
        const msg: BroadcastMessage = {
          id: a.id,
          icon: a.type === 'lost_child' ? '🚨' : '📦',
          text: a.type === 'lost_child'
            ? `【走丢儿童】${a.name}${desc}，请留意身边，联系 ${a.contact_phone || '景区服务台'}`
            : `【失物招领】${a.name}${desc}，请失主前往服务台认领`,
        };
        for (let i = 0; i < remaining; i++) queue.push(msg);
      }
      if (queue.length > 0) {
        queueRef.current = queue;
        if (!current) showNext();
      }
    } catch {}
  };

  useEffect(() => {
    const t = setTimeout(fetchAlerts, 2000);
    fetchRef.current = setInterval(fetchAlerts, FETCH_INTERVAL);
    return () => {
      clearTimeout(t);
      clearTimers();
      if (fetchRef.current) clearInterval(fetchRef.current);
    };
  }, []);

  if (!current) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity style={styles.content} onPress={dismiss} activeOpacity={0.9}>
        <Text style={styles.icon}>{current.icon}</Text>
        <View style={styles.track}>
          <Text style={styles.text} numberOfLines={1}>{current.text}</Text>
        </View>
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', top: Platform.OS === 'ios' ? 124 : 108, left: 8, right: 8, zIndex: 999,
    backgroundColor: Colors.vermilionLight,
    borderRadius: 10,
    borderLeftWidth: 3, borderLeftColor: Colors.vermilion,
    elevation: 4, shadowColor: Colors.vermilion, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6,
  },
  content: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  icon: { fontSize: 15 },
  track: { flex: 1, overflow: 'hidden' },
  text: { fontSize: 12, color: Colors.vermilion, fontWeight: '600' },
  closeBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(181,69,58,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { fontSize: 10, color: Colors.vermilion, fontWeight: '700' },
});
