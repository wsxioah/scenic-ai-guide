import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import MapScreen from './src/screens/MapScreen';
import ScenicListScreen from './src/screens/ScenicListScreen';
import ScenicDetailScreen from './src/screens/ScenicDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CommunityScreen from './src/screens/CommunityScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => (
  <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{label}</Text>
);

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: '首页', tabBarIcon: ({ focused }) => <TabIcon label="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarLabel: 'AI导览', tabBarIcon: ({ focused }) => <TabIcon label="🤖" focused={focused} /> }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarLabel: '地图', tabBarIcon: ({ focused }) => <TabIcon label="🗺️" focused={focused} /> }}
      />
      <Tab.Screen
        name="Scenic"
        component={ScenicListScreen}
        options={{ tabBarLabel: '景点', tabBarIcon: ({ focused }) => <TabIcon label="🏔️" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: '我的', tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="ScenicDetail"
          component={ScenicDetailScreen}
          options={{ headerTitle: '景点详情', headerTintColor: '#2563EB' }}
        />
        <Stack.Screen
          name="Community"
          component={CommunityScreen}
          options={{ headerTitle: '评论区', headerTintColor: '#2563EB' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
