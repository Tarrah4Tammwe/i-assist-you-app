// ─── Morning Screen ─────────────────────────────────────────────────────────
// Energy picker + voice brain-dump → POST to /api/build-plan → save to Supabase
// Receives optional presetEnergy param from WelcomeScreen (returning users)

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';
import { colors, spacing, radius } from '../../constants/theme';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const API_BASE = 'https://i-assist-mjeowt735-shebLackfounded-1828s-projects.vercel.app';

const ENERGY_OPTS = [
  { v: 1, emoji: '🪫', label: 'empty' },
  { v: 2, emoji: '😶', label: 'low'   },
  { v: 3, emoji: '🌤', label: 'okay'  },
  { v: 4, emoji: '⚡', label: 'good'  },
  { v: 5, emoji: '🔥', label: 'fired' },
];

// Contextual sub-titles that shift based on energy level
const ENERGY_CONTEXT: Record<number, string> = {
  1: "That's okay. We'll make today very small.",
  2: "We'll keep it light. You just need one thing to count.",
  3: "A moderate day. One main win = success.",
  4: "Good energy. We can fit in some real work.",
  5: "Let's use it while you have it.",
};

// ─── VOICE HOOK ──────────────────────────────────────────────────────────────
// Web Speech API — will be swapped for @react-native-voice/voice when native
// For now this gives us working voice on Expo Web + keeps logic isolated

function useSpeech(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) setSupported(true);
  }, []);

  const toggle = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SR();
    rec.lang = 'en-GB';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      onResult(e.results[0][0].transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return { listening, supported, toggle };
}

// ─── DOT PULSE ───────────────────────────────────────────────────────────────

function DotPulse() {
  const anims = [useRef(new Animated.Value(0.2)).current, useRef(new Animated.Value(0.2)).current, useRef(new Animated.Value(0.2)).current];

  useEffect(() => {
    const makeLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.2, duration: 400, useNativeDriver: true }),
        ])
      );

    const loops = anims.map((a, i) => makeLoop(a, i * 180));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={dot.row}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={[dot.dot, { opacity: a }]} />
      ))}
    </View>
  );
}

const dot = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
});

// ─── THINKING CARD ───────────────────────────────────────────────────────────

function ThinkingCard({ text }: { text: string }) {
  return (
    <View style={styles.thinkingCard}>
      <DotPulse />
      <Text style={styles.thinkingText}>{text}</Text>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

export default function MorningScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ presetEnergy?: string }>();
  const { user } = useSupabaseUser();

  // ── State ──
  const [energy, setEnergy] = useState<number | null>(
    params.presetEnergy ? parseInt(params.presetEnergy, 10) : null
  );
  const [tasks, setTasks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Voice ──
  const { listening, supported, toggle } = useSpeech((t) => {
    setTasks((prev) => (prev ? `${prev} ${t}` : t));
  });

  // ── Entrance animation ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Energy label animation — fades in when energy is picked ──
  const energyContextFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (energy) {
      energyContextFade.setValue(0);
      Animated.timing(energyContextFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [energy]);

  // ── Greeting ──
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning.' :
    hour < 17 ? 'Good afternoon.' :
    'Good evening.';

  // ── Build the plan ──
  const canBuild = !!energy && tasks.trim().length > 0 && !loading;

  const buildDay = async () => {
    if (!canBuild) return;
    setLoading(true);
    setError(null);

    try {
      // Derive display name from Supabase user
      const name =
        user?.user_metadata?.name ??
        user?.email?.split('@')[0] ??
        '';

      const userId = user?.id ?? 'anonymous';

      // Call the Vercel API
      const res = await fetch(`${API_BASE}/api/build-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name, energy, tasks }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();

      // Parse the blocks from the response
      // API returns: { success: true, data: { id, blocks: [...], energy, ... } }
      const blocks: any[] = data?.data?.blocks ?? [];
      if (!Array.isArray(blocks) || blocks.length === 0) {
        throw new Error('Plan came back empty — please try again');
      }

      // Save to Supabase (if user is logged in)
      if (user?.id) {
        const today = new Date().toISOString().split('T')[0];
        await supabase.from('plans').upsert(
          {
            user_id: user.id,
            date: today,
            energy,
            tasks_input: tasks,
            blocks,
          },
          { onConflict: 'user_id,date' }
        );

        // Log energy
        await supabase.from('energy_log').upsert(
          { user_id: user.id, date: today, energy },
          { onConflict: 'user_id,date' }
        );
      }

      // Navigate to plan tab, passing data as params
      router.push({
        pathname: '/(tabs)/plan',
        params: {
          energy: String(energy),
          name: name || 'there',
          blocks: JSON.stringify(blocks),
        },
      });
    } catch (err: any) {
      console.error('buildDay error:', err);
      setError('Something went wrong building your plan. Try again?');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.navHeight + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.sub}>
              Let's build a day that actually works for your brain.
            </Text>
          </View>

          {/* ── Energy picker ── */}
          <View style={styles.section}>
            <Text style={styles.label}>Energy right now</Text>
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
                  accessibilityLabel={`Energy ${opt.label}`}
                  accessibilityState={{ selected: energy === opt.v }}
                >
                  <Text style={styles.eEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.eLabel, energy === opt.v && styles.eLabelSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Energy context line — fades in when picked */}
            {energy && (
              <Animated.Text style={[styles.energyContext, { opacity: energyContextFade }]}>
                {ENERGY_CONTEXT[energy]}
              </Animated.Text>
            )}
          </View>

          {/* ── Brain dump ── */}
          <View style={styles.section}>
            <Text style={styles.label}>What's on today?</Text>
            <View style={styles.textareaWrap}>
              <TextInput
                style={[styles.textarea, listening && styles.textareaListening]}
                placeholder="Brain dump everything — meetings, errands, things you've been avoiding, whatever's in your head…"
                placeholderTextColor={colors.muted2}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={tasks}
                onChangeText={setTasks}
                editable={!loading}
              />

              {/* Mic button — shown only if speech supported */}
              {supported && (
                <Pressable
                  style={[styles.micBtn, listening && styles.micBtnListening]}
                  onPress={toggle}
                  accessibilityRole="button"
                  accessibilityLabel={listening ? 'Stop listening' : 'Start voice input'}
                >
                  <Text style={styles.micIcon}>{listening ? '⏹' : '🎙'}</Text>
                </Pressable>
              )}
            </View>

            {/* Listening status */}
            {listening && (
              <View style={styles.listeningRow}>
                <View style={styles.listeningDot} />
                <Text style={styles.listeningText}>listening…</Text>
              </View>
            )}

            {/* Hint text */}
            {!tasks && !listening && (
              <Text style={styles.hint}>
                No titles needed. No structure. Just get it out.
              </Text>
            )}
          </View>

          {/* ── Error state ── */}
          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Thinking state ── */}
          {loading && <ThinkingCard text="Thinking through your day…" />}

          {/* ── CTA ── */}
          <Pressable
            style={({ pressed }) => [
              styles.buildBtn,
              (!canBuild) && styles.buildBtnDisabled,
              pressed && canBuild && styles.buildBtnPressed,
            ]}
            onPress={buildDay}
            disabled={!canBuild}
            accessibilityRole="button"
            accessibilityLabel="Build my day"
            accessibilityState={{ disabled: !canBuild }}
          >
            {loading ? (
              <ActivityIndicator color={colors.bg} size="small" />
            ) : (
              <Text style={[styles.buildBtnText, !canBuild && styles.buildBtnTextDisabled]}>
                Build my day →
              </Text>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.screenPad,
    gap: spacing.gap,
    flexGrow: 1,
  },

  // Header
  header: {
    gap: 6,
    paddingBottom: spacing.xs,
  },
  greeting: {
    fontFamily: 'Syne-Bold',
    fontSize: 26,
    color: colors.cream,
    letterSpacing: -0.5,
  },
  sub: {
    fontFamily: 'Literata-Light',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
  },

  // Section wrapper
  section: {
    gap: 8,
  },
  label: {
    fontFamily: 'Syne-Regular',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.muted,
  },

  // Energy picker
  energyRow: {
    flexDirection: 'row',
    gap: 6,
  },
  eBtn: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.s1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 3,
  },
  eBtnSelected: {
    borderColor: colors.gold,
    backgroundColor: colors.goldBg,
  },
  eEmoji: {
    fontSize: 18,
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
  energyContext: {
    fontFamily: 'Literata-Light',
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    paddingTop: 2,
    paddingLeft: 1,
  },

  // Brain dump textarea
  textareaWrap: {
    position: 'relative',
  },
  textarea: {
    backgroundColor: colors.s1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    color: colors.text,
    fontFamily: 'Literata-Light',
    fontSize: 15,
    lineHeight: 24,
    paddingTop: 13,
    paddingBottom: 13,
    paddingLeft: 15,
    paddingRight: 52,   // room for mic button
    minHeight: 140,
  },
  textareaListening: {
    borderColor: colors.red,
  },
  micBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.s2,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnListening: {
    borderColor: colors.red,
    backgroundColor: '#1e1008',
  },
  micIcon: {
    fontSize: 15,
  },
  listeningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listeningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.red,
  },
  listeningText: {
    fontFamily: 'Syne-Regular',
    fontSize: 11,
    color: colors.red,
    letterSpacing: 0.5,
  },
  hint: {
    fontFamily: 'Literata-Light',
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.muted2,
    lineHeight: 18,
  },

  // Error
  errorCard: {
    backgroundColor: '#1e0e0a',
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    fontFamily: 'Literata-Light',
    fontSize: 13,
    color: colors.red,
    lineHeight: 20,
  },

  // Thinking card
  thinkingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.s1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  thinkingText: {
    fontFamily: 'Literata-Light',
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.muted,
  },

  // Build button
  buildBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buildBtnDisabled: {
    opacity: 0.35,
  },
  buildBtnPressed: {
    opacity: 0.88,
  },
  buildBtnText: {
    fontFamily: 'Syne-Bold',
    fontSize: 15,
    color: colors.bg,
    letterSpacing: 0.2,
  },
  buildBtnTextDisabled: {
    color: colors.bg,
  },
});
