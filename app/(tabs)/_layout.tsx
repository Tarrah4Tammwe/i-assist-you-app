// app/(tabs)/_layout.tsx
// Bottom tab bar: Morning · Plan · Do · Dump · Check-in · Rest
// Uses useSafeAreaInsets to correctly clear the phone's home indicator on all devices.

import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';

const TAB_CONFIG = [
  { name: 'morning',  title: 'Morning',  icon: '🌅' },
  { name: 'plan',     title: 'Plan',     icon: '📋' },
  { name: 'do',       title: 'Do',       icon: '⚡' },
  { name: 'dump',     title: 'Dump',     icon: '🗒' },
  { name: 'checkin',  title: 'Check-in', icon: '💬' },
  { name: 'winddown', title: 'Rest',     icon: '🌙' },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Enough room for icon + label + safe area gap above phone home indicator
  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          height: tabBarHeight,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontFamily: 'Syne-Regular',
          fontSize: 9,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        tabBarIcon: ({ focused }) => {
          const tab = TAB_CONFIG.find(t => t.name === route.name);
          return (
            <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.55 }}>
              {tab?.icon ?? '●'}
            </Text>
          );
        },
      })}
    >
      {TAB_CONFIG.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: tab.title }}
        />
      ))}
    </Tabs>
  );
}
