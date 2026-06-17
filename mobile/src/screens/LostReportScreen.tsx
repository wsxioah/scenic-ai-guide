import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Platform, KeyboardAvoidingView, StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { SERVER_URL } from '../config';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme';

export default function LostReportScreen() {
  const navigation = useNavigation<any>();
  const [reportType, setReportType] = useState<'lost_child' | 'lost_item'>('lost_child');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const getLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要位置权限', '请授予位置权限以自动填写当前位置');
        setLocating(false);
        return;
      }
      let pos: { lat: number; lng: number } | null = null;
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        pos = { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };
      }
      if (!pos) {
        try {
          const fresh = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Lowest,
          } as any);
          pos = { lat: fresh.coords.latitude, lng: fresh.coords.longitude };
        } catch {}
      }
      if (pos) {
        setLat(pos.lat);
        setLng(pos.lng);
      } else {
        Alert.alert('定位失败', '无法获取位置，请手动输入');
      }
    } catch {
      Alert.alert('定位失败', '请检查定位服务是否开启');
    }
    setLocating(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { Alert.alert('请填写姓名'); return; }
    if (!phone.trim()) { Alert.alert('请填写联系电话'); return; }
    setSubmitting(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        name: name.trim(),
        contact_phone: phone.trim(),
      });
      if (description.trim()) params.set('description', description.trim());
      if (lat != null) params.set('lat', String(lat));
      if (lng != null) params.set('lng', String(lng));

      const resp = await fetch(`${SERVER_URL}/api/alerts?${params}`, { method: 'POST' });
      if (resp.ok) {
        setDone(true);
      } else {
        const err = await resp.json();
        Alert.alert('提交失败', err.detail || '请稍后重试');
      }
    } catch {
      Alert.alert('网络错误', '请检查网络连接');
    }
    setSubmitting(false);
  }, [reportType, name, description, phone, lat, lng]);

  const reset = () => {
    setName(''); setDescription(''); setPhone('');
    setLat(null); setLng(null); setDone(false);
  };

  const isChild = reportType === 'lost_child';

  if (done) {
    return (
      <View style={styles.doneContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.paper} />
        <View style={styles.doneRing}>
          <Text style={styles.doneIcon}>🙏</Text>
        </View>
        <Text style={styles.doneTitle}>已提交</Text>
        <Text style={styles.doneSub}>工作人员会尽快处理{'\n'}请保持电话畅通</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={reset}>
          <Text style={styles.doneBtnText}>继续提交</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.paper} />
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconRing}>
              <Text style={styles.headerIcon}>{isChild ? '🚨' : '📦'}</Text>
            </View>
            <Text style={styles.headerTitle}>
              {isChild ? '紧急寻人' : '失物招领'}
            </Text>
            <Text style={styles.headerSub}>
              {isChild ? '请保持冷静，立即联系附近工作人员' : '工作人员找到后会通过电话联系您'}
            </Text>
          </View>

          {/* Tab switch */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, isChild && styles.tabChildActive]}
              onPress={() => setReportType('lost_child')}
            >
              <Text style={[styles.tabIcon, isChild && styles.tabIconActive]}>🚨</Text>
              <Text style={[styles.tabText, isChild && styles.tabTextChildActive]}>走丢儿童</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isChild && styles.tabItemActive]}
              onPress={() => setReportType('lost_item')}
            >
              <Text style={[styles.tabIcon, !isChild && styles.tabIconActive]}>📦</Text>
              <Text style={[styles.tabText, !isChild && styles.tabTextItemActive]}>失物招领</Text>
            </TouchableOpacity>
          </View>

          {/* Notice */}
          <View style={[styles.notice, isChild ? styles.noticeUrgent : styles.noticeInfo]}>
            <Text style={styles.noticeText}>
              {isChild
                ? '请保持冷静，立即联系附近工作人员。提供准确信息有助于快速寻回孩子。'
                : '请描述遗失物品的特征，工作人员找到后会通过电话联系您。'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.label}>{isChild ? '孩子姓名' : '物品名称'} <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={isChild ? '请输入孩子姓名' : '如：黑色背包'}
              placeholderTextColor={Colors.textMuted}
              maxLength={50}
            />

            <Text style={styles.label}>详细描述</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={isChild
                ? '体貌特征、衣着颜色、身高、年龄等'
                : '品牌、颜色、内含物品等特征'}
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={500}
            />

            <Text style={styles.label}>联系电话 <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="方便工作人员联系您"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              maxLength={20}
            />

            <Text style={styles.label}>当前位置</Text>
            <View style={styles.locRow}>
              <TouchableOpacity style={styles.locBtn} onPress={getLocation} disabled={locating}>
                <Text style={styles.locBtnText}>
                  {locating ? '⏳ 定位中...' : lat != null ? '📍 已定位' : '📍 获取位置'}
                </Text>
              </TouchableOpacity>
              {lat != null && (
                <Text style={styles.locInfo}>{lat.toFixed(6)}, {lng?.toFixed(6)}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, isChild ? styles.submitBtnUrgent : styles.submitBtnNormal, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? '提交中...' : isChild ? '🚨 紧急提交求助' : '提交失物信息'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  inner: { flex: 1 },
  scroll: { flex: 1 },

  // Header
  header: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  headerIconRing: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
    ...Shadows.md,
  },
  headerIcon: { fontSize: 28 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.ink, marginBottom: 4 },
  headerSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },

  // Tabs
  tabs: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg, overflow: 'hidden',
    backgroundColor: Colors.white, ...Shadows.sm,
  },
  tab: {
    flex: 1, paddingVertical: Spacing.md, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  tabChildActive: { backgroundColor: Colors.vermilionLight },
  tabItemActive: { backgroundColor: Colors.goldSurface },
  tabIcon: { fontSize: 16, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextChildActive: { color: Colors.vermilion },
  tabTextItemActive: { color: Colors.goldDark },

  // Notice
  notice: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    padding: Spacing.md, borderRadius: BorderRadius.md,
  },
  noticeUrgent: { backgroundColor: Colors.vermilionLight, borderLeftWidth: 3, borderLeftColor: Colors.vermilion },
  noticeInfo: { backgroundColor: Colors.goldSurface, borderLeftWidth: 3, borderLeftColor: Colors.gold },
  noticeText: { fontSize: 13, color: Colors.text, lineHeight: 20 },

  // Form
  formCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, ...Shadows.sm,
  },
  label: { fontSize: 14, fontWeight: '600', color: Colors.ink, marginBottom: Spacing.sm, marginTop: Spacing.md },
  required: { color: Colors.vermilion },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: Colors.divider,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  locBtn: {
    backgroundColor: Colors.goldSurface, paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.goldLight,
  },
  locBtnText: { color: Colors.goldDark, fontSize: 13, fontWeight: '500' },
  locInfo: { color: Colors.textSecondary, fontSize: 11, fontFamily: 'monospace' },

  // Submit
  submitBtn: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.xxl,
    paddingVertical: 16, borderRadius: BorderRadius.lg,
    alignItems: 'center', ...Shadows.md,
  },
  submitBtnUrgent: { backgroundColor: Colors.vermilion },
  submitBtnNormal: { backgroundColor: Colors.goldDark },
  submitBtnDisabled: { backgroundColor: Colors.textMuted },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Done
  doneContainer: {
    flex: 1, backgroundColor: Colors.paper,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl,
  },
  doneRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.jadeLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl,
    borderWidth: 2, borderColor: Colors.jade,
  },
  doneIcon: { fontSize: 40 },
  doneTitle: { fontSize: 20, fontWeight: '700', color: Colors.jade, marginBottom: Spacing.sm },
  doneSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xxl, lineHeight: 22 },
  doneBtn: {
    backgroundColor: Colors.goldDark, paddingHorizontal: 40, paddingVertical: 14,
    borderRadius: BorderRadius.md, marginBottom: Spacing.md,
  },
  doneBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  backBtn: { paddingVertical: Spacing.sm },
  backBtnText: { color: Colors.textSecondary, fontSize: 14 },
});
