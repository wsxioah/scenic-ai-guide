import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Alert, Image, StatusBar, FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useUserStore } from '../stores/userStore';
import { useChatStore } from '../stores/chatStore';
import api from '../services/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme';

interface Stats {
  favorites: number;
  conversations: number;
  messages: number;
  visited_spots: number;
}

export default function ProfileScreen({ navigation }: any) {
  const { userId, isLoggedIn, phone, nickname, avatar, login, logout } = useUserStore();
  const { clearMessages } = useChatStore();
  const [loginAccount, setLoginAccount] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginNickname, setLoginNickname] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [stats, setStats] = useState<Stats>({ favorites: 0, conversations: 0, messages: 0, visited_spots: 0 });
  const [favorites, setFavorites] = useState<any[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

  useFocusEffect(useCallback(() => {
    if (isLoggedIn) {
      loadStats();
    }
  }, [isLoggedIn]));

  const loadStats = async () => {
    try {
      const s = await api.getUserStats();
      setStats(s);
    } catch {}
  };

  const loadFavorites = async () => {
    try {
      const favs = await api.getUserFavorites();
      setFavorites(favs);
      setShowFavorites(true);
    } catch {
      Alert.alert('提示', '收藏加载失败，请检查网络');
    }
  };

  const handleLogin = async () => {
    if (!loginAccount || loginAccount.trim().length < 3) {
      Alert.alert('提示', '请输入账号（至少3位）');
      return;
    }
    if (!loginPassword || loginPassword.length < 6) {
      Alert.alert('提示', '请输入密码（至少6位）');
      return;
    }
    setLoginLoading(true);
    try {
      const user = await api.login(loginAccount.trim(), '0000', loginPassword);
      await login(user.id, user.token, user.phone, user.nickname, user.avatar || '');
      setShowLogin(false);
      setLoginAccount('');
      setLoginPassword('');
      loadStats();
    } catch (e: any) {
      Alert.alert('登录失败', e?.message || '账号或密码错误');
    }
    setLoginLoading(false);
  };

  const handleRegister = async () => {
    if (!loginAccount || loginAccount.trim().length < 3) {
      Alert.alert('提示', '请输入账号（至少3位）');
      return;
    }
    if (!loginPassword || loginPassword.length < 6) {
      Alert.alert('提示', '密码至少6位，需包含字母和数字');
      return;
    }
    if (!loginNickname.trim()) {
      Alert.alert('提示', '请输入昵称');
      return;
    }
    setLoginLoading(true);
    try {
      const user = await api.register(loginAccount.trim(), loginPassword, loginNickname.trim());
      await login(user.id, user.token, user.phone, user.nickname, user.avatar || '');
      setShowLogin(false);
      setLoginAccount('');
      setLoginPassword('');
      setLoginNickname('');
      loadStats();
    } catch (e: any) {
      Alert.alert('注册失败', e?.message || '请稍后重试');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    Alert.alert('确认退出', '退出后需重新登录', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出', style: 'destructive',
        onPress: () => {
          logout();
          clearMessages();
          setStats({ favorites: 0, conversations: 0, messages: 0, visited_spots: 0 });
        },
      },
    ]);
  };

  const goToSpot = (spot: any) => {
    const spotId = spot.spot_id || spot.scenic_spot_id || spot.id;
    if (spotId) {
      navigation.navigate('ScenicDetail', { spotId });
    }
  };

  const menuItems = [
    { icon: 'heart', label: '我的收藏', badge: stats.favorites, onPress: loadFavorites },
    { icon: 'chatbubble-ellipses', label: 'AI对话', badge: stats.conversations, onPress: () => navigation.navigate('Chat') },
    { icon: 'time', label: '浏览历史', badge: stats.visited_spots, onPress: () => navigation.navigate('Scenic') },
    { icon: 'settings', label: '设置', badge: 0, onPress: () => Alert.alert('设置', '功能开发中') },
  ];

  if (showLogin) {
    return (
      <View style={styles.loginContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.paper} />
        <View style={styles.loginCard}>
          <View style={styles.loginIconRing}>
            <Ionicons name="person" size={32} color={Colors.goldDark} />
          </View>
          <Text style={styles.loginTitle}>{loginMode === 'login' ? '账号登录' : '注册账号'}</Text>
          <Text style={styles.loginSubtitle}>
            {loginMode === 'login' ? '登录后享受个性化导览服务' : '创建账号以使用全部功能'}
          </Text>

          <TextInput
            style={styles.inputField}
            value={loginAccount}
            onChangeText={setLoginAccount}
            placeholder="请输入账号"
            placeholderTextColor={Colors.textMuted}
          />

          <TextInput
            style={styles.inputField}
            value={loginPassword}
            onChangeText={setLoginPassword}
            placeholder={loginMode === 'login' ? '请输入密码' : '请设置密码（6位以上，含字母和数字）'}
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />

          {loginMode === 'register' && (
            <TextInput
              style={styles.inputField}
              value={loginNickname}
              onChangeText={setLoginNickname}
              placeholder="请输入昵称"
              placeholderTextColor={Colors.textMuted}
              maxLength={20}
            />
          )}

          <TouchableOpacity
            style={[styles.loginBtn, loginLoading && styles.loginBtnDisabled]}
            onPress={loginMode === 'login' ? handleLogin : handleRegister}
            disabled={loginLoading}
          >
            <Text style={styles.loginBtnText}>
              {loginLoading ? '请稍后...' : loginMode === 'login' ? '登 录' : '注 册'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setLoginMode(loginMode === 'login' ? 'register' : 'login');
              setLoginPassword('');
              setLoginNickname('');
            }}
          >
            <Text style={styles.switchText}>
              {loginMode === 'login' ? '没有账号？立即注册' : '已有账号？返回登录'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setShowLogin(false); setLoginMode('login'); }}>
            <Text style={styles.backText}>返回</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showFavorites) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.paper} />
        <View style={styles.favHeader}>
          <TouchableOpacity onPress={() => setShowFavorites(false)} style={styles.favBackBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.goldDark} />
          </TouchableOpacity>
          <Text style={styles.favTitle}>我的收藏</Text>
          <View style={{ width: 36 }} />
        </View>
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>还没有收藏景点</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowFavorites(false)}>
              <Text style={styles.emptyBtnText}>去逛逛</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={(item: any) => String(item.id || item.scenic_spot_id)}
            renderItem={({ item }: any) => (
              <TouchableOpacity style={styles.favItem} onPress={() => goToSpot(item)}>
                <View style={styles.favIcon}>
                  <Ionicons name="heart" size={20} color={Colors.vermilion} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.favName}>{item.name || item.scenic_name || '景点'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.paper} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={36} color={Colors.goldDark} />
            </View>
          </View>
          {isLoggedIn ? (
            <>
              <Text style={styles.nickname}>{nickname}</Text>
              <Text style={styles.phone}>{phone}</Text>
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
            { value: stats.visited_spots, label: '打卡景点' },
            { value: stats.conversations, label: 'AI对话' },
            { value: stats.favorites, label: '收藏' },
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
                <Ionicons name={item.icon as any} size={18} color={Colors.goldDark} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
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
  loginTitle: { fontSize: 22, fontWeight: '800', color: Colors.ink, marginBottom: 8 },
  loginSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 28 },
  inputField: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.lg, fontSize: 16, color: Colors.text,
    borderWidth: 1, borderColor: Colors.divider, marginBottom: Spacing.md,
  },
  phoneInput: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.lg, fontSize: 16, color: Colors.text,
    borderWidth: 1, borderColor: Colors.divider, marginBottom: Spacing.lg,
  },
  loginBtn: {
    width: '100%', backgroundColor: Colors.goldDark, borderRadius: BorderRadius.md,
    padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  switchText: { color: Colors.gold, fontSize: 14, fontWeight: '500', marginBottom: Spacing.lg },
  backText: { color: Colors.textSecondary, fontSize: 14 },

  // Header
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
  nickname: { fontSize: 20, fontWeight: '700', color: Colors.ink },
  phone: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
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
  menuLabel: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },
  badge: {
    backgroundColor: Colors.vermilionLight,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
    marginRight: 8,
  },
  badgeText: { color: Colors.vermilion, fontSize: 11, fontWeight: '700' },

  // Favorites
  favHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 12, paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  favBackBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  favTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink },
  favItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.lg, marginHorizontal: Spacing.lg, marginTop: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  favIcon: { marginRight: Spacing.md },
  favName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80,
  },
  emptyText: { color: Colors.textSecondary, fontSize: 15, marginTop: Spacing.md, marginBottom: Spacing.lg },
  emptyBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: BorderRadius.md, backgroundColor: Colors.goldDark,
  },
  emptyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

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
