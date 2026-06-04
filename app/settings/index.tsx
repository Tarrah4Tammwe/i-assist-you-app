// app/settings/index.tsx
// Settings home screen — accessed via gear icon in AppHeader
// Modal stack: Settings → sub-screens

import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type as t } from '../../constants/theme';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';

interface RowProps {
  icon: string;
  title: string;
  sub?: string;
  badge?: { label: string; variant: 'gold' | 'green' | 'muted' | 'purple' };
  onPress: () => void;
  variant?: 'default' | 'gold' | 'danger';
}

function Row({ icon, title, sub, badge, onPress, variant = 'default' }: RowProps) {
  const isGold   = variant === 'gold';
  const isDanger = variant === 'danger';
  return (
    <Pressable
      style={[s.row, isGold && s.rowGold, isDanger && s.rowDanger]}
      onPress={onPress}
    >
      <View style={[s.rowIcon, isGold && s.rowIconGold, isDanger && s.rowIconRed]}>
        <Text style={[s.rowIconText, isGold && { color: colors.gold }, isDanger && { color: colors.red }]}>
          {icon}
        </Text>
      </View>
      <View style={s.rowContent}>
        <Text style={[s.rowTitle, isGold && { color: colors.gold }, isDanger && { color: colors.red }]}>
          {title}
        </Text>
        {sub && <Text style={s.rowSub}>{sub}</Text>}
      </View>
      {badge && <Badge label={badge.label} variant={badge.variant} />}
      {!isDanger && <Text style={s.chevron}>›</Text>}
    </Pressable>
  );
}

function Badge({ label, variant }: { label: string; variant: 'gold' | 'green' | 'muted' | 'purple' }) {
  const styleMap: Record<string, { bg: string; text: string; border: string }> = {
    gold:   { bg: colors.goldBg,   text: colors.gold,   border: colors.goldDim },
    green:  { bg: colors.greenBg,  text: colors.green,  border: '#1a3a28' },
    muted:  { bg: colors.s2,       text: colors.muted,  border: colors.border },
    purple: { bg: colors.purpleBg, text: colors.purple, border: colors.purpleBorder },
  };
  const v = styleMap[variant];
  return (
    <View style={[s.badge, { backgroundColor: v.bg, borderColor: v.border }]}>
      <Text style={[s.badgeText, { color: v.text }]}>{label}</Text>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={s.secLbl}>{label}</Text>;
}

export default function SettingsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user } = useSupabaseUser();

  const go = (path: string) => router.push(path as any);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.hdrTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <SectionLabel label="Account" />
        <Row icon="👤" title="Profile"           sub="Name, avatar, pronouns"    onPress={() => go('/settings/profile')} />
        <Row icon="✉️" title="Email & password"  sub={user?.email ? `${user.email.slice(0,2)}***@${user.email.split('@')[1]}` : '—'} onPress={() => go('/settings/email')} />
        <Row icon="📱" title="Linked devices"    sub="Manage active sessions"    onPress={() => go('/settings/devices')} />

        {/* Subscription */}
        <SectionLabel label="Subscription" />
        <Row icon="✦" title="Your plan" sub="Spark · Free" onPress={() => go('/settings/subscription')} variant="gold" badge={{ label: 'Spark', variant: 'muted' }} />
        <Row icon="🧾" title="Billing & invoices" sub="Payment method, history"  onPress={() => go('/settings/billing')} />
        <Row icon="🎁" title="Refer a friend"     sub="Get 1 month free per referral" onPress={() => go('/settings/refer')} />

        {/* Personalisation */}
        <SectionLabel label="Personalisation" />
        <Row icon="✦" title="Assistant name"      sub="Currently: Nova"                       onPress={() => go('/settings/assistant-name')} variant="gold" />
        <Row icon="🧠" title="Brain profile"       sub="Traits, sensory needs, working style" onPress={() => go('/settings/brain-profile')} />
        <Row icon="🕐" title="Routines & defaults" sub="Wake time, buffers, plan length"      onPress={() => go('/settings/routines')} />
        <Row icon="📍" title="Saved locations"     sub="Home, work, frequent places"          onPress={() => go('/settings/locations')} />
        <Row icon="🎒" title="Kit lists"           sub="What to bring by activity type"       onPress={() => go('/settings/kit-lists')} />

        {/* Integrations */}
        <SectionLabel label="Integrations" />
        <Row icon="🔗" title="Calendars & task lists" sub="2 connected" badge={{ label: '2 live', variant: 'green' }} onPress={() => go('/settings/integrations')} />

        {/* Notifications */}
        <SectionLabel label="Notifications" />
        <Row icon="🔔" title="Notification preferences" sub="Daily support, body basics, transitions" onPress={() => go('/settings/notifications')} />

        {/* Privacy */}
        <SectionLabel label="Privacy & data" />
        <Row icon="🛡" title="Privacy & data" sub="Pattern learning, export, policy" onPress={() => go('/settings/privacy')} />

        {/* Support */}
        <SectionLabel label="Support" />
        <Row icon="❓" title="Help & support" sub="FAQ, feedback, bug reports" onPress={() => go('/settings/support')} />

        {/* Danger zone */}
        <SectionLabel label="Danger zone" />
        <Row icon="→" title="Sign out"        onPress={() => {}} variant="danger" />
        <Row icon="🗑" title="Delete account" sub="Permanently removes all your data" onPress={() => {}} variant="danger" />

        <Text style={s.footer}>i assist you · v1.0.0{'\n'}Made for neurodivergent brains</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  hdr:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.screenPad, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg },
  backBtn:     { width: 28, height: 28, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.s1, alignItems: 'center', justifyContent: 'center' },
  backArrow:   { fontSize: 18, color: colors.muted, lineHeight: 22 },
  hdrTitle:    { fontFamily: 'Syne-Bold', fontSize: 15, color: colors.gold, letterSpacing: -0.3 },
  scroll:      { paddingHorizontal: spacing.screenPad, paddingTop: 8 },
  secLbl:      { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.muted2, marginTop: 20, marginBottom: 7, paddingLeft: 2 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12, marginBottom: 6 },
  rowGold:     { backgroundColor: colors.goldBg, borderColor: colors.goldDim },
  rowDanger:   { backgroundColor: '#1e0a08', borderColor: '#3e1a14' },
  rowIcon:     { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  rowIconGold: { backgroundColor: '#221c0a', borderColor: colors.goldDim },
  rowIconRed:  { backgroundColor: '#1e0a08', borderColor: '#3e1a14' },
  rowIconText: { fontSize: 15, color: colors.muted },
  rowContent:  { flex: 1 },
  rowTitle:    { fontFamily: 'Syne-Medium', fontSize: 13, color: colors.cream },
  rowSub:      { fontFamily: 'Literata-Light', fontSize: 11, color: colors.muted, marginTop: 1 },
  chevron:     { fontSize: 18, color: colors.muted2 },
  badge:       { borderWidth: 1, borderRadius: radius.full, paddingVertical: 2, paddingHorizontal: 8, marginRight: 4 },
  badgeText:   { fontFamily: 'Syne-Medium', fontSize: 9 },
  footer:      { textAlign: 'center', fontFamily: 'Syne-Regular', fontSize: 10, color: colors.muted2, marginTop: 24, lineHeight: 18 },
});
