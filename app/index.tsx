import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSupabaseUser } from '../hooks/useSupabaseUser';
import { useEnergyLog } from '../hooks/useEnergyLog';
import { colors, type as typography, spacing } from '../constants/theme';

const { width } = Dimensions.get('window');

// ─── ENERGY OPTIONS ────────────────────────────────────────────────────────────

const ENERGY_OPTS = [
  { v: 1, emoji: '🪫', label: 'empty' },
  { v: 2, emoji: '😶', label: 'low' },
  { v: 3, emoji: '🌤', label: 'okay' },
  { v: 4, emoji: '⚡', label: 'good' },
  { v: 5, emoji: '🔥', label: 'fired' },
];

// ─── QUICK NAV LINKS ───────────────────────────────────────────────────────────

const QUICK_LINKS: { label: string; route: '/(tabs)/dump' | '/(tabs)/do' | '/(tabs)/checkin' }[] = [
  { label: 'Dump', route: '/(tabs)/dump' },
  { label: 'Do it Now', route: '/(tabs)/do' },
  { label: 'Check-in', route: '/(tabs)/checkin' },
];

// ─── GREETING LOGIC ────────────────────────────────────────────────────────────

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function getFormattedTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getDayOfWeek(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long' });
}

// ─── NEW USER SCREEN ───────────────────────────────────────────────────────────

function NewUserScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.newScreen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Ambient glow behind brand */}
      <LinearGradient
        colors={['#162040', colors.bg]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      {/* Brand centre */}
      <Animated.View
        style={[
          styles.brandArea,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Logo mark */}
        <View style={styles.brandMark}>
          <View style={styles.bmRing} />
          <View style={styles.bmDot} />
        </View>

        <Text style={styles.brandName}>i assist you</Text>
        <View style={styles.brandDivider} />
        <Text style={styles.brandWelcome}>
          A day companion built for the way your brain actually works.
        </Text>
        <Text style={styles.brandSub}>
          For AuDHD people who are done being failed by planners, apps, and
          systems that weren't made for them.
        </Text>
      </Animated.View>

      {/* Auth CTAs */}
      <Animated.View
        style={[
          styles.authArea,
          {
            paddingBottom: insets.bottom + spacing.lg,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
          onPress={() => router.push('/auth/signup')}
        >
          <Text style={styles.btnPrimaryText}>Welcome — let's get started →</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.btnOutlineText}>I already have an account</Text>
        </Pressable>

        <Text style={styles.authNote}>Built with you in mind. Genuinely.</Text>
      </Animated.View>
    </View>
  );
}

// ─── RETURNING USER SCREEN ─────────────────────────────────────────────────────

function ReturningUserScreen({ userName, yesterdayEnergy }: {
  userName: string;
  yesterdayEnergy: number | null;
}) {
  const insets = useSafeAreaInsets();
  const [energy, setEnergy] = useState<number | null>(null);
  const [time, setTime] = useState(getFormattedTime());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(getFormattedTime()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleBuildDay = () => {
    // Pass selected energy to morning screen via router params
    router.push({
      pathname: '/(tabs)/morning',
      params: energy ? { presetEnergy: energy } : {},
    });
  };

  const yesterdayLine = yesterdayEnergy
    ? `Yesterday you came in at a ${yesterdayEnergy} and still got through it. No pressure on today — let's just see where you are.`
    : `No pressure on what today looks like. Let's just start with where you are.`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" />

      {/* Clock hero */}
      <View style={styles.clockHero}>
        <LinearGradient
          colors={['#162040', colors.bg]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        {/* Subtle gold corner accent */}
        <LinearGradient
          colors={['#1a160a', 'transparent']}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.6 }]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
        />
        {/* Horizontal rule lines */}
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.ambientLine,
              { bottom: 20 + i * 18, opacity: 1 - i * 0.3 },
            ]}
          />
        ))}
        <View style={[styles.clockCenter, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.clockDayLabel}>
            {getDayOfWeek()} {getTimeOfDay()}
          </Text>
          <Text style={styles.clockTime}>{time}</Text>
          <Text style={styles.clockDate}>{getFormattedDate()}</Text>
        </View>
      </View>

      {/* Greeting + energy */}
      <Animated.View
        style={[
          styles.returningContent,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Greeting */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingHey}>Hey, {userName}</Text>
          <Text style={styles.greetingMain}>How's your brain today?</Text>
          <Text style={styles.greetingSub}>{yesterdayLine}</Text>
        </View>

        {/* Energy picker */}
        <View style={styles.energyCard}>
          <Text style={styles.energyLabel}>Energy right now</Text>
          <View style={styles.energyRow}>
            {ENERGY_OPTS.map((opt) => (
              <Pressable
                key={opt.v}
                style={[
                  styles.eBtn,
                  energy === opt.v && styles.eBtnSelected,
                ]}
                onPress={() => setEnergy(opt.v)}
                accessibilityRole="button"
                accessibilityLabel={`Energy level ${opt.label}`}
                accessibilityState={{ selected: energy === opt.v }}
              >
                <Text style={styles.eEmoji}>{opt.emoji}</Text>
                <Text style={[styles.eLabel, energy === opt.v && styles.eLabelSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Build day CTA */}
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
          onPress={handleBuildDay}
          accessibilityRole="button"
          accessibilityLabel="Build my day"
        >
          <Text style={styles.btnPrimaryText}>Build my day →</Text>
        </Pressable>

        {/* Quick nav links */}
        <View style={styles.quickNav}>
          <Text style={styles.quickNavPrefix}>or jump to →</Text>
          {QUICK_LINKS.map((link, i) => (
            <View key={link.route} style={{ flexDirection: 'row', alignItems: 'center' }}>
              {i > 0 && <Text style={styles.quickNavDot}> · </Text>}
              <Pressable
                onPress={() => router.push(link.route)}
                accessibilityRole="link"
                accessibilityLabel={`Go to ${link.label}`}
              >
                {({ pressed }) => (
                  <Text style={[styles.quickNavLink, pressed && styles.quickNavLinkPressed]}>
                    {link.label}
                  </Text>
                )}
              </Pressable>
            </View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// ─── ROOT SCREEN ───────────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const { user, loading } = useSupabaseUser();
  const { yesterdayEnergy } = useEnergyLog(user?.id ?? null);

  // While auth state loads, show nothing (splash screen handles this)
  if (loading) return null;

  // Logged-in returning user
  if (user) {
    const userName = user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'there';
    return (
      <ReturningUserScreen
        userName={userName}
        yesterdayEnergy={yesterdayEnergy}
      />
    );
  }

  // New / signed-out user
  return <NewUserScreen />;
}

// ─── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Shared ──
  btnPrimary: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnPrimaryText: {
    fontFamily: 'Syne-Bold',
    fontSize: 15,
    color: colors.bg,
    letterSpacing: 0.2,
  },

  // ── New user ──
  newScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  brandArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.goldBg,
    borderWidth: 1,
    borderColor: colors.goldDim,
    marginBottom: 20,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bmRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.gold,
    position: 'absolute',
    top: 10,
    left: 10,
  },
  bmDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.gold,
    position: 'absolute',
    bottom: 11,
    right: 11,
  },
  brandName: {
    fontFamily: 'Syne-Bold',
    fontSize: 26,
    color: colors.cream,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  brandDivider: {
    width: 24,
    height: 1,
    backgroundColor: colors.goldDim,
    marginBottom: 14,
  },
  brandWelcome: {
    fontFamily: 'Literata-Light',
    fontStyle: 'italic',
    fontSize: 17,
    color: colors.text,
    lineHeight: 26,
    textAlign: 'center',
    maxWidth: 240,
  },
  brandSub: {
    fontFamily: 'Literata-Light',
    fontSize: 13,
    color: colors.muted,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 260,
    marginTop: 10,
  },
  authArea: {
    paddingHorizontal: spacing.screenPad,
    gap: spacing.sm,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border2,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  btnOutlinePressed: {
    borderColor: colors.goldDim,
  },
  btnOutlineText: {
    fontFamily: 'Syne-Medium',
    fontSize: 14,
    color: colors.text,
  },
  authNote: {
    fontFamily: 'Literata-Light',
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.muted2,
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Returning user ──
  clockHero: {
    height: 190,
    overflow: 'hidden',
    position: 'relative',
  },
  ambientLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border2,
  },
  clockCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  clockDayLabel: {
    fontFamily: 'Syne-Regular',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.goldDim,
  },
  clockTime: {
    fontFamily: 'Syne-Bold',
    fontSize: 44,
    color: colors.cream,
    letterSpacing: -1.5,
    lineHeight: 50,
  },
  clockDate: {
    fontFamily: 'Literata-Light',
    fontSize: 13,
    color: colors.muted,
    marginTop: 1,
  },
  returningContent: {
    paddingHorizontal: spacing.screenPad,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  greetingBlock: {
    paddingBottom: spacing.sm,
  },
  greetingHey: {
    fontFamily: 'Syne-Regular',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.goldDim,
    marginBottom: 6,
  },
  greetingMain: {
    fontFamily: 'Literata-Light',
    fontStyle: 'italic',
    fontSize: 22,
    color: colors.cream,
    lineHeight: 30,
  },
  greetingSub: {
    fontFamily: 'Literata-Light',
    fontSize: 13,
    color: colors.muted,
    lineHeight: 21,
    marginTop: 7,
  },
  energyCard: {
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.cardPad,
  },
  energyLabel: {
    fontFamily: 'Syne-Regular',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 10,
  },
  energyRow: {
    flexDirection: 'row',
    gap: 6,
  },
  eBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    gap: 2,
  },
  eBtnSelected: {
    borderColor: colors.gold,
    backgroundColor: colors.goldBg,
  },
  eEmoji: {
    fontSize: 16,
  },
  eLabel: {
    fontFamily: 'Syne-Regular',
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  eLabelSelected: {
    color: colors.gold,
  },
  quickNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 2,
    paddingTop: spacing.xs,
  },
  quickNavPrefix: {
    fontFamily: 'Syne-Regular',
    fontSize: 11,
    color: colors.muted2,
    letterSpacing: 0.5,
  },
  quickNavDot: {
    fontFamily: 'Syne-Regular',
    fontSize: 11,
    color: colors.muted2,
  },
  quickNavLink: {
    fontFamily: 'Syne-Medium',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
    textDecorationColor: colors.muted2,
  },
  quickNavLinkPressed: {
    color: colors.gold,
    textDecorationColor: colors.goldDim,
  },
});
