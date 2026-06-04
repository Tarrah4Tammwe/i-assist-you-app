// app/settings/subscription.tsx
// Subscription screen — shows current plan, all three tiers (Spark/Phlo/Dopamine)

import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';

interface TierFeature { text: string; included: boolean; note?: string; }

interface Tier {
  id: 'spark' | 'phlo' | 'dopamine';
  name: string;
  tagline: string;
  price: string;
  priceSub: string;
  nameColor: string;
  borderColor: string;
  bgColor: string;
  features: TierFeature[];
  isCurrent?: boolean;
  ctaLabel?: string;
}

const TIERS: Tier[] = [
  {
    id: 'spark', name: 'Spark', tagline: 'Get a feel for it.',
    price: 'Free', priceSub: 'Forever — no card required',
    nameColor: colors.muted, borderColor: colors.border, bgColor: colors.s1,
    isCurrent: true,
    features: [
      { text: 'Morning setup + day plan', included: true, note: 'Up to 5 blocks' },
      { text: 'Wind-down', included: true },
      { text: 'Do Now — Decide only', included: true },
      { text: 'Check-in companion', included: true, note: '3 conversations/day' },
      { text: 'Dump space', included: true, note: '50 entries max' },
      { text: 'Integrations', included: false },
      { text: 'Proactive notifications', included: false },
      { text: 'Pattern learning', included: false },
    ],
  },
  {
    id: 'phlo', name: 'Phlo', tagline: 'Your full daily assistant.',
    price: '$20 / month', priceSub: '$200 / year — 2 months free',
    nameColor: colors.gold, borderColor: colors.goldDim, bgColor: colors.goldBg,
    ctaLabel: 'Upgrade to Phlo →',
    features: [
      { text: 'Full day plan — up to 10 blocks', included: true },
      { text: 'Do Now — Research, Decide, Structure', included: true },
      { text: 'Unlimited check-in conversations', included: true },
      { text: 'Unlimited dump + AI sort', included: true },
      { text: 'Calendar + task list integrations', included: true },
      { text: 'All proactive notifications', included: true },
      { text: 'Water + food reminders', included: true },
      { text: 'Pre-departure alerts + kit lists', included: true },
      { text: 'Pattern learning — 60 day window', included: true },
      { text: 'Body doubling', included: false },
      { text: 'Predictive low-energy warnings', included: false },
      { text: 'Advanced analytics', included: false },
    ],
  },
  {
    id: 'dopamine', name: 'Dopamine', tagline: 'The app that knows you — and acts on it.',
    price: '$35 / month', priceSub: '$350 / year — 2 months free',
    nameColor: colors.purple, borderColor: colors.purpleBorder, bgColor: colors.purpleBg,
    ctaLabel: 'Upgrade to Dopamine →',
    features: [
      { text: 'Everything in Phlo', included: true },
      { text: 'Body doubling sessions', included: true },
      { text: 'Daily briefing — auto-generated', included: true },
      { text: 'Predicted low-energy days', included: true },
      { text: 'Smart rescheduling suggestions', included: true },
      { text: 'Cycle tracking for energy prediction', included: true },
      { text: 'Full advanced analytics', included: true },
      { text: 'Unlimited pattern history', included: true },
      { text: 'Weekly personalised insight', included: true },
      { text: 'Feature requests & roadmap voting', included: true },
      { text: 'Early access to new features', included: true },
    ],
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.hdrTitle}>Your plan</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>Your plan</Text>
        <Text style={s.pageSub}>Compare plans and upgrade any time.</Text>

        {TIERS.map(tier => (
          <View key={tier.id} style={[s.tierCard, { borderColor: tier.borderColor, backgroundColor: tier.bgColor }]}>
            <View style={s.tierTop}>
              <View style={{ flex: 1 }}>
                <Text style={[s.tierName, { color: tier.nameColor }]}>{tier.name}</Text>
                <Text style={[s.tierTagline, { color: tier.nameColor, opacity: 0.6 }]}>{tier.tagline}</Text>
                <Text style={[s.tierPrice, { color: tier.nameColor }]}>{tier.price}</Text>
                <Text style={s.tierPriceSub}>{tier.priceSub}</Text>
              </View>
              {tier.isCurrent && (
                <View style={[s.currentBadge, { borderColor: tier.borderColor }]}>
                  <Text style={[s.currentBadgeText, { color: tier.nameColor }]}>Current</Text>
                </View>
              )}
            </View>

            <View style={[s.divider, { backgroundColor: tier.borderColor }]} />

            <View style={s.featList}>
              {tier.features.map((f, i) => (
                <View key={i} style={s.feat}>
                  <Text style={[s.featIcon, { color: f.included ? colors.green : colors.muted2 }]}>
                    {f.included ? '✓' : '✗'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.featText, !f.included && { color: colors.muted2 }]}>{f.text}</Text>
                    {f.note && <Text style={s.featNote}>{f.note}</Text>}
                  </View>
                </View>
              ))}
            </View>

            {tier.ctaLabel && (
              <Pressable style={[s.ctaBtn, { backgroundColor: tier.nameColor }]}>
                <Text style={s.ctaBtnText}>{tier.ctaLabel}</Text>
              </Pressable>
            )}
          </View>
        ))}

        {/* Cancel */}
        <Pressable style={s.cancelRow}>
          <Text style={s.cancelText}>Cancel subscription</Text>
          <Text style={s.cancelSub}>Downgrades to Spark at end of billing period</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg },
  hdr:             { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.screenPad, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:         { width: 28, height: 28, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.s1, alignItems: 'center', justifyContent: 'center' },
  backArrow:       { fontSize: 18, color: colors.muted, lineHeight: 22 },
  hdrTitle:        { fontFamily: 'Syne-Bold', fontSize: 15, color: colors.gold },
  scroll:          { paddingHorizontal: spacing.screenPad, paddingTop: 16 },
  pageTitle:       { fontFamily: 'Syne-Bold', fontSize: 22, color: colors.cream, letterSpacing: -0.4, marginBottom: 4 },
  pageSub:         { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted, marginBottom: 20 },
  tierCard:        { borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 14 },
  tierTop:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  tierName:        { fontFamily: 'Syne-Bold', fontSize: 18, letterSpacing: -0.3 },
  tierTagline:     { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 11, marginTop: 2 },
  tierPrice:       { fontFamily: 'Syne-Bold', fontSize: 14, marginTop: 8 },
  tierPriceSub:    { fontFamily: 'Syne-Regular', fontSize: 10, color: colors.muted2, marginTop: 2 },
  currentBadge:    { borderWidth: 1, borderRadius: radius.full, paddingVertical: 3, paddingHorizontal: 10, alignSelf: 'flex-start' },
  currentBadgeText:{ fontFamily: 'Syne-Medium', fontSize: 10 },
  divider:         { height: 1, marginVertical: 12, opacity: 0.4 },
  featList:        { gap: 8 },
  feat:            { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featIcon:        { fontFamily: 'Syne-Regular', fontSize: 12, marginTop: 1, width: 14 },
  featText:        { fontFamily: 'Literata-Light', fontSize: 12, color: colors.cream, lineHeight: 18, flex: 1 },
  featNote:        { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 10, color: colors.muted, marginTop: 1 },
  ctaBtn:          { borderRadius: radius.md, padding: 12, alignItems: 'center', marginTop: 14 },
  ctaBtnText:      { fontFamily: 'Syne-Bold', fontSize: 13, color: colors.bg },
  cancelRow:       { backgroundColor: '#1e0a08', borderWidth: 1, borderColor: '#3e1a14', borderRadius: radius.lg, padding: 14, marginTop: 8, alignItems: 'center' },
  cancelText:      { fontFamily: 'Syne-Medium', fontSize: 13, color: colors.red },
  cancelSub:       { fontFamily: 'Literata-Light', fontSize: 11, color: colors.muted, marginTop: 3 },
});
