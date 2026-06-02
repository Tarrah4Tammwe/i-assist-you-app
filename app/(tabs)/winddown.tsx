// app/(tabs)/winddown.tsx
// Wind-down — full executive assistant close for the day.
// Flow:
//   1. Surfaces unfinished tasks from today's plan → move to tomorrow or drop
//   2. Mood chips + free-type/voice emotion field
//   3. Seed one thing for tomorrow (pre-loads into morning setup)
//   4. "Close the day" → AI grounding close + carried items confirmed
//   5. "I'm done for the night" → screen dims to near-black, "Goodnight." fades in
//
// No toxic positivity. No recap of failures. Surviving counts.

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../lib/store';
import { colors, spacing, radius } from '../../constants/theme';
import { VoiceTextarea } from '../../components/VoiceTextarea';

const API_BASE = 'https://i-assist-you.vercel.app';

const MOODS = [
  '😮‍💨 exhausted', '😌 relieved', '🙂 okay',
  '😤 frustrated',  '😶 numb',     '🥹 proud',
];

type BlockDecision = 'tomorrow' | 'drop' | null;

interface UnfinishedItem {
  title: string;
  note?: string;
  decision: BlockDecision;
}

// ─── Goodnight screen ─────────────────────────────────────────────────────────
function GoodnightScreen({ onDismiss }: { onDismiss: () => void }) {
  const bgOpacity   = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Dim bg first, then fade in text
    Animated.sequence([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Pressable style={gn.container} onPress={onDismiss}>
      <Animated.View style={[StyleSheet.absoluteFill, gn.bg, { opacity: bgOpacity }]} />
      <Animated.View style={[gn.content, { opacity: textOpacity }]}>
        <Text style={gn.star}>✦</Text>
        <Text style={gn.text}>Goodnight.</Text>
      </Animated.View>
    </Pressable>
  );
}

const gn = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020308',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020308',
  },
  content: {
    alignItems: 'center',
    gap: 14,
  },
  star: {
    fontSize: 13,
    color: '#151e2e',
    letterSpacing: 6,
  },
  text: {
    fontFamily: 'Literata-Light',
    fontStyle: 'italic',
    fontSize: 28,
    color: '#1e2a40',
    letterSpacing: -0.5,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function WinddownScreen() {
  const insets = useSafeAreaInsets();
  const { todayPlan, setTodayPlan } = useStore();
  const energy = todayPlan?.energy ?? 3;

  // Unfinished items from today's plan
  const unfinishedBlocks = (todayPlan?.blocks ?? []).filter(
    b => b.type === 'task' && !(todayPlan as any)?.doneBlocks?.includes(b.title)
  );

  const [items, setItems] = useState<UnfinishedItem[]>(
    unfinishedBlocks.map(b => ({ title: b.title, note: b.note, decision: null }))
  );
  const [mood, setMood]         = useState<string | null>(null);
  const [freeEmotion, setFreeEmotion] = useState('');
  const [seedTomorrow, setSeedTomorrow] = useState('');
  const [result, setResult]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [showGoodnight, setShowGoodnight] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const setDecision = (index: number, decision: BlockDecision) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, decision } : item));
  };

  const carriedToTomorrow = items.filter(i => i.decision === 'tomorrow');
  const canClose = mood !== null || freeEmotion.trim().length > 0;

  const closeDay = async () => {
    if (!canClose) return;
    setLoading(true);

    const effectiveMood = mood ?? freeEmotion.trim();

    try {
      const res = await fetch(`${API_BASE}/api/winddown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          energy,
          mood: effectiveMood,
          note: freeEmotion.trim() && mood ? freeEmotion.trim() : '',
          carriedItems: carriedToTomorrow.map(i => i.title),
          droppedItems: items.filter(i => i.decision === 'drop').map(i => i.title),
          seedTomorrow: seedTomorrow.trim(),
        }),
      });
      const data = await res.json();
      setResult(data?.content ?? 'The day is done. You got through it.');

      // Seed tomorrow into tomorrow's plan context in the store
      if (seedTomorrow.trim() && todayPlan) {
        setTodayPlan({ ...todayPlan, seedTomorrow: seedTomorrow.trim() } as any);
      }
    } catch {
      setResult('The day is done. You got through it.');
    }

    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (showGoodnight) {
    return <GoodnightScreen onDismiss={() => setShowGoodnight(false)} />;
  }

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title */}
      <View style={s.titleBlock}>
        <Text style={s.title}>The day is done.</Text>
        {!result && <Text style={s.sub}>No recap of failures. Just a quiet landing.</Text>}
      </View>

      {!result ? (
        <>
          {/* Unfinished tasks */}
          {items.length > 0 && (
            <View style={s.card}>
              <Text style={s.label}>LEFT UNFINISHED TODAY</Text>
              {items.map((item, i) => (
                <View key={i} style={s.blockRow}>
                  <View style={s.blockDot} />
                  <Text style={s.blockTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={s.blockActions}>
                    <Pressable
                      style={[s.blockBtn, s.btnTomorrow, item.decision === 'tomorrow' && s.btnTomorrowActive]}
                      onPress={() => setDecision(i, item.decision === 'tomorrow' ? null : 'tomorrow')}
                    >
                      <Text style={[s.blockBtnText, s.btnTomorrowText, item.decision === 'tomorrow' && s.btnTomorrowTextActive]}>
                        → tomorrow
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[s.blockBtn, s.btnDrop, item.decision === 'drop' && s.btnDropActive]}
                      onPress={() => setDecision(i, item.decision === 'drop' ? null : 'drop')}
                    >
                      <Text style={[s.blockBtnText, s.btnDropText]}>drop it</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <Text style={s.blockHint}>
                Tap to move to tomorrow or drop. Your assistant will pick these up in morning setup.
              </Text>
            </View>
          )}

          {/* Mood */}
          <View style={s.card}>
            <Text style={s.label}>HOW ARE YOU ENDING</Text>
            <View style={s.moodRow}>
              {MOODS.map(m => (
                <Pressable
                  key={m}
                  style={[s.moodChip, mood === m && s.moodChipActive]}
                  onPress={() => setMood(mood === m ? null : m)}
                >
                  <Text style={[s.moodText, mood === m && s.moodTextActive]}>{m}</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.orRow}>
              <View style={s.orLine} />
              <Text style={s.orText}>or describe it</Text>
              <View style={s.orLine} />
            </View>
            <VoiceTextarea
              rows={2}
              placeholder="Something else… type or speak it"
              value={freeEmotion}
              onChange={setFreeEmotion}
            />
          </View>

          {/* Seed tomorrow */}
          <View style={s.card}>
            <Text style={s.label}>ONE THING FOR TOMORROW (OPTIONAL)</Text>
            <VoiceTextarea
              rows={2}
              placeholder="The first thing I want to do tomorrow…"
              value={seedTomorrow}
              onChange={setSeedTomorrow}
            />
            <Text style={s.seedHint}>
              Your assistant will put this first in tomorrow's morning setup.
            </Text>
          </View>

          {/* CTA */}
          <Pressable
            style={[s.closeBtn, (!canClose || loading) && s.closeBtnDisabled]}
            onPress={closeDay}
            disabled={!canClose || loading}
          >
            {loading
              ? <ActivityIndicator size="small" color={colors.bg} />
              : <Text style={s.closeBtnText}>Close the day →</Text>
            }
          </Pressable>
        </>
      ) : (
        <>
          {/* AI grounding close */}
          <View style={s.resultCard}>
            <Text style={s.resultText}>{result}</Text>
            <View style={s.signalRow}>
              <View style={s.signalDot} />
              <Text style={s.signalText}>
                Put the phone down and change into something comfortable.
              </Text>
            </View>
          </View>

          {/* Carried to tomorrow */}
          {carriedToTomorrow.length > 0 && (
            <View style={s.card}>
              <Text style={s.label}>CARRIED TO TOMORROW</Text>
              {carriedToTomorrow.map((item, i) => (
                <View key={i} style={s.carriedRow}>
                  <View style={s.carriedDot} />
                  <Text style={s.carriedTitle}>{item.title}</Text>
                </View>
              ))}
              <Text style={s.blockHint}>
                These will appear in tomorrow's morning setup. You don't need to remember them.
              </Text>
            </View>
          )}

          <Text style={s.restMark}>✦   rest now   ✦</Text>

          {/* Done for the night */}
          <Pressable style={s.doneBtn} onPress={() => setShowGoodnight(true)}>
            <Text style={s.doneBtnText}>I'm done for the night</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:            { paddingHorizontal: spacing.screenPad, paddingTop: spacing.lg, gap: spacing.gap },
  titleBlock:        { gap: 4 },
  title:             { fontFamily: 'Syne-Bold', fontSize: 22, color: colors.cream, letterSpacing: -0.5, fontStyle: 'italic' },
  sub:               { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted, lineHeight: 20 },
  label:             { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.muted2, marginBottom: 10 },
  card:              { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.cardPad, gap: 0 },

  // Unfinished blocks
  blockRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: 10, marginBottom: 6 },
  blockDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border2, flexShrink: 0 },
  blockTitle:        { flex: 1, fontFamily: 'Syne-Medium', fontSize: 12, color: colors.text },
  blockActions:      { flexDirection: 'row', gap: 5 },
  blockBtn:          { borderRadius: radius.full, paddingVertical: 4, paddingHorizontal: 9, borderWidth: 1 },
  blockBtnText:      { fontFamily: 'Syne-Medium', fontSize: 10 },
  btnTomorrow:       { borderColor: colors.goldDim, backgroundColor: colors.goldBg },
  btnTomorrowActive: { borderColor: colors.gold, backgroundColor: colors.goldBg },
  btnTomorrowText:   { color: colors.goldDim },
  btnTomorrowTextActive: { color: colors.gold },
  btnDrop:           { borderColor: '#3a1a15', backgroundColor: '#140808' },
  btnDropActive:     { borderColor: colors.red },
  btnDropText:       { color: colors.red },
  blockHint:         { fontFamily: 'Literata-Light', fontSize: 11, color: colors.muted2, lineHeight: 16, marginTop: 6 },

  // Mood
  moodRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  moodChip:          { backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingVertical: 7, paddingHorizontal: 12 },
  moodChipActive:    { borderColor: colors.goldDim, backgroundColor: colors.goldBg },
  moodText:          { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted },
  moodTextActive:    { color: colors.gold },
  orRow:             { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  orLine:            { flex: 1, height: 1, backgroundColor: colors.border },
  orText:            { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted2 },

  // Seed tomorrow
  seedHint:          { fontFamily: 'Literata-Light', fontSize: 11, color: colors.muted2, lineHeight: 16, marginTop: 8 },

  // CTA
  closeBtn:          { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  closeBtnDisabled:  { opacity: 0.35 },
  closeBtnText:      { fontFamily: 'Syne-Bold', fontSize: 15, color: colors.bg },

  // Result
  resultCard:        { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.cardPad, gap: 0 },
  resultText:        { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 15, lineHeight: 27, color: colors.cream },
  signalRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: colors.bg, borderRadius: radius.md, padding: 10, marginTop: 12 },
  signalDot:         { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold, marginTop: 5, flexShrink: 0 },
  signalText:        { flex: 1, fontFamily: 'Syne-Regular', fontSize: 12, color: colors.gold, lineHeight: 18 },

  // Carried
  carriedRow:        { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: 10, marginBottom: 6 },
  carriedDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.goldDim },
  carriedTitle:      { fontFamily: 'Syne-Medium', fontSize: 12, color: colors.text },

  restMark:          { textAlign: 'center', fontFamily: 'Syne-Regular', fontSize: 11, color: colors.muted2, letterSpacing: 3, paddingVertical: 4 },
  doneBtn:           { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingVertical: 12, alignItems: 'center' },
  doneBtnText:       { fontFamily: 'Syne-Regular', fontSize: 13, color: colors.muted },
});
