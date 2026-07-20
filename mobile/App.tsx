import { Text, View, ActivityIndicator, LogBox } from 'react-native';
LogBox.ignoreAllLogs();
import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import MapScreen from './src/screens/MapScreen';
import ScenicListScreen from './src/screens/ScenicListScreen';
import ScenicDetailScreen from './src/screens/ScenicDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import SearchScreen from './src/screens/SearchScreen';
import { useUserStore } from './src/stores/userStore';
import { Colors } from './src/theme';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: 44, height: 30, borderRadius: 15,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: focused ? Colors.goldLight : 'transparent',
    }}>
      <Ionicons
        name={(focused ? name : `${name}-outline`) as any}
        size={20}
        color={focused ? Colors.goldDark : Colors.textMuted}
      />
    </View>
  </View>
);

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.goldDark,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.divider,
          paddingBottom: 8,
          paddingTop: 6,
          height: 64,
          elevation: 8,
          shadowColor: '#8B7355',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: '首页', tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarLabel: 'AI导览', tabBarIcon: ({ focused }) => <TabIcon name="sparkles" focused={focused} /> }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarLabel: '地图', tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} /> }}
      />
      <Tab.Screen
        name="Scenic"
        component={ScenicListScreen}
        options={{ tabBarLabel: '景点', tabBarIcon: ({ focused }) => <TabIcon name="images" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: '我的', tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const { isRestoring, restoreAuth } = useUserStore();

  useEffect(() => {
    restoreAuth();
  }, []);

  if (isRestoring) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paper }}>
        <ActivityIndicator size="large" color={Colors.goldDark} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="ScenicDetail"
          component={ScenicDetailScreen}
          options={{ headerTitle: '景点详情', headerTintColor: Colors.goldDark }}
        />
        <Stack.Screen
          name="Community"
          component={CommunityScreen}
          options={{ headerTitle: '评论区', headerTintColor: Colors.goldDark }}
        />
        <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
