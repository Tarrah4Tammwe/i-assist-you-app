// app/(tabs)/_layout.tsx
// Bottom tab bar: Morning · Plan · Do · Dump · Check-in · Rest
// AppHeader renders above all tabs via the parent layout.
// Navy styled, gold active state, no background highlight on active tab.

import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { colors } from '../../constants/theme';
import { AppHeader } from '../../components/AppHeader';

const TAB_CONFIG = [
  { name: 'morning',  title: 'Morning',  icon: '🌅' },
  { name: 'plan',     title: 'Plan',     icon: '📋' },
  { name: 'do',       title: 'Do',       icon: '⚡' },
  { name: 'dump',     title: 'Dump',     icon: '🗒' },
  { name: 'checkin',  title: 'Check-in', icon: '💬' },
  { name: 'winddown', title: 'Rest',     icon: '🌙' },
];

function TabLayoutInner() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 6,
          height: Platform.OS === 'ios' ? 80 : 64,
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
            <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.6 }}>
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

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <TabLayoutInner />
    </View>
  );
}
