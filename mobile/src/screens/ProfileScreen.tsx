import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Alert, Image, StatusBar,
} from 'react-native';
import { useUserStore } from '../stores/userStore';
import { useChatStore } from '../stores/chatStore';
import api from '../services/api';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme';

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
      login(user.id, user.phone, user.nickname, '');
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
        <StatusBar barStyle="dark-content" backgroundColor={Colors.paper} />
        <View style={styles.loginCard}>
          <View style={styles.loginIconRing}>
            <Text style={styles.loginIcon}>🏔</Text>
          </View>
          <Text style={styles.loginTitle}>手机号登录</Text>
          <Text style={styles.loginSubtitle}>登录后享受个性化导览服务</Text>
          <TextInput
            style={styles.phoneInput}
            value={loginPhone}
            onChangeText={setLoginPhone}
            placeholder="请输入手机号"
            placeholderTextColor={Colors.textMuted}
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.paper} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarCircle}>
              {avatar?.startsWith('http') ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{avatar || '👤'}</Text>
              )}
            </View>
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
              <Text style={styles.phone}>登录解锁更多功能</Text>
              <TouchableOpacity style={styles.loginPromptBtn} onPress={() => setShowLogin(true)}>
                <Text style={styles.loginPromptText}>点击登录</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          {[
            { value: '0', label: '打卡景点' },
            { value: '0', label: 'AI对话' },
            { value: '0', label: '收藏' },
          ].map((s, i) => (
            <View key={s.label} style={[styles.statItem, i < 2 && styles.statItemBorder]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>服务</Text>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuIconWrap}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
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

        <Text style={styles.version}>灵山胜境 AI 导览 v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  scroll: { flex: 1 },

  // Login
  loginContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.paper, padding: Spacing.xxl,
  },
  loginCard: {
    width: '100%', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl, ...Shadows.lg,
  },
  loginIconRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
    borderWidth: 2, borderColor: Colors.goldLight,
  },
  loginIcon: { fontSize: 32 },
  loginTitle: { fontSize: 22, fontWeight: '800', color: Colors.ink, marginBottom: 8 },
  loginSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 28 },
  phoneInput: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.lg, fontSize: 16, color: Colors.text,
    borderWidth: 1, borderColor: Colors.divider, marginBottom: Spacing.lg,
  },
  loginBtn: {
    width: '100%', backgroundColor: Colors.goldDark, borderRadius: BorderRadius.md,
    padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg,
  },
  loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  backText: { color: Colors.textSecondary, fontSize: 14 },

  // Profile header
  profileHeader: {
    alignItems: 'center', paddingTop: 60, paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    ...Shadows.md,
  },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
    borderWidth: 3, borderColor: Colors.goldLight,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 36 },
  nickname: { fontSize: 20, fontWeight: '700', color: Colors.ink },
  phone: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  editBtn: {
    marginTop: Spacing.md, paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: BorderRadius.full, backgroundColor: Colors.goldSurface,
  },
  editBtnText: { color: Colors.goldDark, fontSize: 13, fontWeight: '600' },
  loginPromptBtn: {
    marginTop: Spacing.md, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: BorderRadius.full, backgroundColor: Colors.goldDark,
  },
  loginPromptText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Stats
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg, marginTop: -16,
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, ...Shadows.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statItemBorder: { borderRightWidth: 1, borderRightColor: Colors.divider },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.goldDark },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

  // Menu
  menuSection: {
    marginTop: Spacing.xl, marginHorizontal: Spacing.lg,
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    ...Shadows.sm, overflow: 'hidden',
  },
  menuSectionTitle: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.goldSurface,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  menuIcon: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },
  menuArrow: { fontSize: 22, color: Colors.textMuted },

  // Logout
  logoutBtn: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.xl,
    padding: Spacing.lg, borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1, borderColor: Colors.vermilionLight,
    ...Shadows.sm,
  },
  logoutText: { color: Colors.vermilion, fontSize: 15, fontWeight: '600' },

  version: {
    textAlign: 'center', color: Colors.textMuted, fontSize: 12,
    paddingVertical: Spacing.xxl,
  },
});
