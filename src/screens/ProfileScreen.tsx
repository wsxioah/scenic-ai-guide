import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Alert,
} from 'react-native';
import { useUserStore } from '../stores/userStore';
import { useChatStore } from '../stores/chatStore';
import api from '../services/api';

export default function ProfileScreen() {
  const { userId, isLoggedIn, phone, nickname, avatar, login, logout } = useUserStore();
  const { clearMessages } = useChatStore();
  const [loginPhone, setLoginPhone] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  const handleLogin = async () => {
    if (!loginPhone || loginPhone.length < 11) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }
    try {
      const user = await api.login(loginPhone, '0000');
      login(user.id, user.phone, user.nickname, user.avatar);
      api.setUserId(user.id);
      setShowLogin(false);
    } catch {
      Alert.alert('错误', '登录失败，请重试');
    }
  };

  const handleLogout = () => {
    Alert.alert('确认退出', '退出后对话历史将清空', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        onPress: () => {
          logout();
          clearMessages();
        },
      },
    ]);
  };

  const menuItems = [
    { icon: '📋', label: '我的订单', onPress: () => {} },
    { icon: '⭐', label: '我的收藏', onPress: () => {} },
    { icon: '🕐', label: '浏览历史', onPress: () => {} },
    { icon: '💬', label: '我的评论', onPress: () => {} },
    { icon: '📊', label: '游览报告', onPress: () => {} },
    { icon: '⚙️', label: '设置', onPress: () => {} },
  ];

  if (showLogin) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitle}>手机号登录</Text>
        <Text style={styles.loginSubtitle}>登录后享受个性化导览服务</Text>
        <TextInput
          style={styles.phoneInput}
          value={loginPhone}
          onChangeText={setLoginPhone}
          placeholder="请输入手机号"
          keyboardType="phone-pad"
          maxLength={11}
        />
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.loginBtnText}>登录 / 注册</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowLogin(false)}>
          <Text style={styles.backText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{avatar || '👤'}</Text>
        </View>
        {isLoggedIn ? (
          <>
            <Text style={styles.nickname}>{nickname}</Text>
            <Text style={styles.phone}>{phone}</Text>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>编辑资料</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.nickname}>未登录</Text>
            <TouchableOpacity style={styles.loginPromptBtn} onPress={() => setShowLogin(true)}>
              <Text style={styles.loginPromptText}>点击登录</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { value: '0', label: '打卡景点' },
          { value: '0', label: 'AI对话' },
          { value: '0', label: '收藏' },
        ].map((s) => (
          <View key={s.label} style={styles.statItem}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Menu */}
      <View style={styles.menuSection}>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      {isLoggedIn && (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.version}>v1.0.0 · 景区AI数字人导览</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loginContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#F8FAFC' },
  loginTitle: { fontSize: 24, fontWeight: '800', color: '#1F2937', marginBottom: 8 },
  loginSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 32 },
  phoneInput: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16,
  },
  loginBtn: {
    width: '100%', backgroundColor: '#2563EB', borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 16,
  },
  loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  backText: { color: '#6B7280', fontSize: 14 },
  profileHeader: { alignItems: 'center', padding: 32, paddingTop: 60, backgroundColor: '#FFFFFF' },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 36 },
  nickname: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  phone: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  editBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
  editBtnText: { color: '#4B5563', fontSize: 13 },
  loginPromptBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#2563EB' },
  loginPromptText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', marginTop: 8, padding: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  menuSection: { marginTop: 8, backgroundColor: '#FFFFFF' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6',
  },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: '#374151' },
  menuArrow: { fontSize: 20, color: '#D1D5DB' },
  logoutBtn: { margin: 16, padding: 14, backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', color: '#D1D5DB', fontSize: 12, paddingBottom: 40 },
});
