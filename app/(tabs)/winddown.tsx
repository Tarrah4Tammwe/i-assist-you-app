// app/(tabs)/winddown.tsx
// Wind-down — mood picker + optional note + AI grounding close.
// No recap of failures. Surviving counts.

import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../lib/store';
import { colors, spacing, radius } from '../../constants/theme';
import { VoiceTextarea } from '../../components/VoiceTextarea';

const API_BASE = 'https://i-assist-you.vercel.app';

const MOODS = [
  '😮‍💨 exhausted', '😤 frustrated', '🙂 okay',
  '😌 relieved',   '🥹 proud',      '😶 numb',
];

export default function WinddownScreen() {
  const insets = useSafeAreaInsets();
  const { todayPlan } = useStore();
  const energy = todayPlan?.energy ?? 3;

  const [mood, setMood]   = useState<string | null>(null);
  const [note, setNote]   = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const closeDay = async () => {
    if (!mood) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/winddown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ energy, mood, note }),
      });
      const data = await res.json();
      setResult(data?.content ?? 'The day is done. You got through it.');
    } catch {
      setResult('The day is done. You got through it.');
    }
    setLoading(false);
  };

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 90 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[s.title, { fontStyle: 'italic' }]}>The day is done.</Text>
      <Text style={s.sub}>No recap of failures. Just a quiet landing.</Text>

      {!result ? (
        <>
          <View style={s.section}>
            <Text style={s.label}>How are you ending the day?</Text>
            <View style={s.moodGrid}>
              {MOODS.map(m => (
                <Pressable key={m} style={[s.moodChip, mood === m && s.moodChipActive]} onPress={() => setMood(m)}>
                  <Text style={[s.moodText, mood === m && s.moodTextActive]}>{m}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.label}>Anything to say? (optional)</Text>
            <VoiceTextarea
              rows={3}
              placeholder="A frustration, small win, something you noticed…"
              value={note}
              onChange={setNote}
            />
          </View>

          <Pressable
            style={[s.closeBtn, (!mood || loading) && s.closeBtnDisabled]}
            onPress={closeDay}
            disabled={!mood || loading}
          >
            {loading
              ? <ActivityIndicator size="small" color={colors.bg} />
              : <Text style={s.closeBtnText}>Close the day</Text>
            }
          </Pressable>
        </>
      ) : (
        <>
          <View style={s.resultCard}>
            <Text style={s.resultText}>{result}</Text>
          </View>
          <Text style={s.restSign}>✦  rest now  ✦</Text>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:         { paddingHorizontal: spacing.screenPad, gap: spacing.gap },
  title:          { fontFamily: 'Syne-Bold', fontSize: 22, color: colors.cream, letterSpacing: -0.5 },
  sub:            { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted, lineHeight: 20 },
  section:        { gap: 8 },
  label:          { fontFamily: 'Syne-Regular', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted },
  moodGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodChip:       { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 14 },
  moodChipActive: { borderColor: colors.gold, backgroundColor: colors.goldBg },
  moodText:       { fontFamily: 'Literata-Light', fontSize: 14, color: colors.text },
  moodTextActive: { color: colors.gold },
  closeBtn:       { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  closeBtnDisabled: { opacity: 0.35 },
  closeBtnText:   { fontFamily: 'Syne-Bold', fontSize: 15, color: colors.bg },
  resultCard:     { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md + 2 },
  resultText:     { fontFamily: 'Literata-Light', fontSize: 15, lineHeight: 26, color: colors.cream },
  restSign:       { textAlign: 'center', color: colors.muted2, fontFamily: 'Syne-Regular', fontSize: 12, letterSpacing: 3, paddingTop: 8 },
});
