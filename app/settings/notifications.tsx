// app/settings/notifications.tsx
// Notification preferences — each type individually toggleable
// Grouped by purpose, all on by default

import { useState } from 'react';
import { ScrollView, View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';

interface NotifItem {
  key: string;
  icon: string;
  title: string;
  sub: string;
  defaultOn: boolean;
}

const SECTIONS: { label: string; note?: string; items: NotifItem[] }[] = [
  {
    label: 'Morning',
    items: [
      { key: 'morning_prompt', icon: '🌅', title: 'Morning prompt', sub: 'Nudge to set energy + build your day · 8:00 AM', defaultOn: true },
    ],
  },
  {
    label: 'Body basics',
    note: 'Your assistant checks in on the basics so you don\'t have to remember.',
    items: [
      { key: 'water',    icon: '💧', title: 'Water reminders',       sub: 'Every 90 min during active hours · adjusts to energy', defaultOn: true },
      { key: 'food',     icon: '🥗', title: 'Food & hunger check-ins', sub: 'Breakfast, lunch, dinner windows · gentle, not nagging', defaultOn: true },
      { key: 'movement', icon: '🚶', title: 'Movement nudge',          sub: 'When you\'ve been still for too long', defaultOn: true },
    ],
  },
  {
    label: 'Plan & transitions',
    items: [
      { key: 'departure',   icon: '📍', title: 'Pre-departure alerts',  sub: 'Kit checklist + leave-time warning before appointments', defaultOn: true },
      { key: 'transitions', icon: '→',  title: 'Transition nudges',     sub: '5-min heads up between plan blocks', defaultOn: true },
      { key: 'breaks',      icon: '⏸',  title: 'Break reminders',       sub: 'When a scheduled break block is due', defaultOn: true },
    ],
  },
  {
    label: 'Focus & regulation',
    items: [
      { key: 'hyperfocus',  icon: '🔥', title: 'Hyperfocus warnings',  sub: 'When a session is running significantly over time', defaultOn: true },
      { key: 'regulation',  icon: '🌬', title: 'Regulation check-in',  sub: 'Quiet nudge if no activity for a while — no pressure', defaultOn: true },
    ],
  },
  {
    label: 'Evening',
    items: [
      { key: 'winddown',   icon: '🌙', title: 'Wind-down reminder', sub: 'Gentle close-of-day prompt · 9:30 PM', defaultOn: true },
      { key: 'sleep_prep', icon: '💤', title: 'Sleep prep nudge',   sub: 'Screen-down signal 30 min before your sleep window', defaultOn: false },
    ],
  },
  {
    label: 'Quiet hours',
    items: [
      { key: 'quiet_hours', icon: '🔕', title: 'Quiet hours',       sub: 'No pings between 10:00 PM – 8:00 AM', defaultOn: true },
      { key: 'snooze_all',  icon: '🔇', title: 'Snooze all for today', sub: 'Pause everything until tomorrow morning', defaultOn: false },
    ],
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const defaults: Record<string, boolean> = {};
  SECTIONS.forEach(sec => sec.items.forEach(item => { defaults[item.key] = item.defaultOn; }));
  const [prefs, setPrefs] = useState<Record<string, boolean>>(defaults);

  const toggle = (key: string) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.hdrTitle}>Notifications</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageSub}>
          These are how your assistant stays with you through the day — not just pings, but actual support. All on by default.
        </Text>

        {SECTIONS.map(sec => (
          <View key={sec.label}>
            <Text style={s.secLbl}>{sec.label}</Text>
            {sec.note && <Text style={s.secNote}>{sec.note}</Text>}
            {sec.items.map(item => (
              <View key={item.key} style={s.row}>
                <View style={s.rowIcon}>
                  <Text style={s.rowIconText}>{item.icon}</Text>
                </View>
                <View style={s.rowContent}>
                  <Text style={s.rowTitle}>{item.title}</Text>
                  <Text style={s.rowSub}>{item.sub}</Text>
                </View>
                <Switch
                  value={prefs[item.key]}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{ false: colors.border, true: colors.gold }}
                  thumbColor={prefs[item.key] ? colors.bg : colors.muted}
                  ios_backgroundColor={colors.border}
                />
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  hdr:          { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.screenPad, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:      { width: 28, height: 28, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.s1, alignItems: 'center', justifyContent: 'center' },
  backArrow:    { fontSize: 18, color: colors.muted, lineHeight: 22 },
  hdrTitle:     { fontFamily: 'Syne-Bold', fontSize: 15, color: colors.gold },
  scroll:       { paddingHorizontal: spacing.screenPad, paddingTop: 8 },
  pageSub:      { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: 8 },
  secLbl:       { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.muted2, marginTop: 20, marginBottom: 6, paddingLeft: 2 },
  secNote:      { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 11, color: colors.muted, backgroundColor: colors.s1, borderRadius: radius.md, padding: 10, marginBottom: 8, lineHeight: 16 },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12, marginBottom: 6 },
  rowIcon:      { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  rowIconText:  { fontSize: 15 },
  rowContent:   { flex: 1 },
  rowTitle:     { fontFamily: 'Syne-Medium', fontSize: 13, color: colors.cream },
  rowSub:       { fontFamily: 'Literata-Light', fontSize: 11, color: colors.muted, marginTop: 1, lineHeight: 15 },
});
