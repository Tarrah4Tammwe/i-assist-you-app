// app/(tabs)/do.tsx
// Do It Now — same 3 executor modes as the plan screen but outside the plan.
// For anything that comes up mid-day. No context needed.

import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../../lib/store';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';
import { colors, spacing, radius } from '../../constants/theme';
import { VoiceTextarea } from '../../components/VoiceTextarea';

const API_BASE = 'https://i-assist-you.vercel.app';

type Mode = 'research' | 'decide' | 'structure';

const MODES = [
  { id: 'research'  as Mode, icon: '🔍', title: 'Research it',    desc: 'Get a quick, usable answer' },
  { id: 'decide'    as Mode, icon: '⚖️',  title: 'Decide for me', desc: 'Give me the options, pick one' },
  { id: 'structure' as Mode, icon: '🧠', title: 'Structure this', desc: 'Turn chaos into steps' },
];

const PLACEHOLDERS: Record<Mode, string> = {
  research:  'What do you need to know? Ask like you\'d ask a smart friend.',
  decide:    'What\'s the decision? What are the options? Just describe it.',
  structure: 'Brain-dump everything. Don\'t organise — just type it all out.',
};

const BTN_LABELS: Record<Mode, string> = {
  research: 'Find out', decide: 'Make the call', structure: 'Structure this',
};

export default function DoNowScreen() {
  const insets = useSafeAreaInsets();
  const { todayPlan } = useStore();
  const { user } = useSupabaseUser();
  const energy = todayPlan?.energy ?? 3;

  const [mode, setMode]     = useState<Mode | null>(null);
  const [input, setInput]   = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const run = async () => {
    if (!input.trim() || !mode) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/execute-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, input, context: { energy, userId: user?.id } }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
    } catch { setError('Something went wrong. Try again.'); }
    setLoading(false);
  };

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => { setMode(null); setInput(''); setResult(null); setError(null); };

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 90 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Do it now</Text>
      <Text style={s.sub}>Outside the plan. Just tell me what you need.</Text>

      {!mode && (
        <View style={s.modeGrid}>
          {MODES.map(m => (
            <Pressable key={m.id} style={s.modeCard} onPress={() => setMode(m.id)}>
              <Text style={s.modeIcon}>{m.icon}</Text>
              <Text style={s.modeTitle}>{m.title}</Text>
              <Text style={s.modeDesc}>{m.desc}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {mode && !result && (
        <View style={{ gap: spacing.sm + 2 }}>
          <View style={s.modeTagRow}>
            <View style={s.modeTag}><Text style={s.modeTagText}>{MODES.find(m => m.id === mode)?.icon} {MODES.find(m => m.id === mode)?.title}</Text></View>
            <Pressable onPress={reset} style={s.changeBtn}><Text style={s.changeBtnText}>← Change</Text></Pressable>
          </View>
          <VoiceTextarea rows={5} placeholder={PLACEHOLDERS[mode]} value={input} onChange={setInput} />
          <Pressable style={[s.runBtn, (!input.trim() || loading) && s.runBtnDisabled]} onPress={run} disabled={!input.trim() || loading}>
            {loading ? <ActivityIndicator size="small" color={colors.bg} /> : <Text style={s.runBtnText}>{BTN_LABELS[mode]}</Text>}
          </Pressable>
          {error && <Text style={s.errorText}>{error}</Text>}
        </View>
      )}

      {result && (
        <View style={{ gap: spacing.sm + 2 }}>
          <View style={s.modeTagRow}>
            <View style={s.modeTag}><Text style={s.modeTagText}>{MODES.find(m => m.id === mode)?.icon} {MODES.find(m => m.id === mode)?.title}</Text></View>
            <Pressable onPress={reset} style={s.changeBtn}><Text style={s.changeBtnText}>Start over</Text></Pressable>
          </View>
          {result.type === 'text' && (
            <View>
              <View style={s.textResult}><Text style={s.textResultContent}>{result.data}</Text></View>
              <Pressable onPress={() => copy(result.data)} style={s.copyBtn}><Text style={s.copyBtnText}>{copied ? 'Copied ✓' : 'Copy'}</Text></Pressable>
            </View>
          )}
          {result.type === 'decide' && result.data && (
            <View style={s.decideCard}>
              <Text style={s.decideVerdict}>→ {result.data.verdict}</Text>
              <Text style={s.decideReason}>{result.data.reason}</Text>
            </View>
          )}
          {result.type === 'steps' && Array.isArray(result.data) && (
            <View style={{ gap: 8 }}>
              {result.data.map((step: string, i: number) => (
                <View key={i} style={s.stepItem}>
                  <Text style={s.stepNum}>{i + 1}</Text>
                  <Text style={s.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}
          <Pressable style={s.ghostBtn} onPress={() => { setResult(null); setInput(''); }}>
            <Text style={s.ghostBtnText}>Do something else →</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:       { paddingHorizontal: spacing.screenPad, gap: spacing.gap },
  title:        { fontFamily: 'Syne-Bold', fontSize: 22, color: colors.cream, letterSpacing: -0.5 },
  sub:          { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted, lineHeight: 20 },
  modeGrid:     { gap: spacing.sm },
  modeCard:     { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: 5 },
  modeIcon:     { fontSize: 22 },
  modeTitle:    { fontFamily: 'Syne-Bold', fontSize: 14, color: colors.cream },
  modeDesc:     { fontFamily: 'Literata-Light', fontSize: 12, color: colors.muted, lineHeight: 18 },
  modeTagRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeTag:      { backgroundColor: colors.goldBg, borderWidth: 1, borderColor: colors.goldDim, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  modeTagText:  { fontFamily: 'Syne-Medium', fontSize: 11, color: colors.gold },
  changeBtn:    { backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 },
  changeBtnText:{ fontFamily: 'Syne-Regular', fontSize: 11, color: colors.muted },
  runBtn:       { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  runBtnDisabled: { opacity: 0.35 },
  runBtnText:   { fontFamily: 'Syne-Bold', fontSize: 14, color: colors.bg },
  errorText:    { fontFamily: 'Literata-Light', fontSize: 13, color: colors.red },
  textResult:   { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 13 },
  textResultContent: { fontFamily: 'Literata-Light', fontSize: 13, lineHeight: 21, color: colors.cream },
  copyBtn:      { alignSelf: 'flex-start', marginTop: 6, backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 },
  copyBtnText:  { fontFamily: 'Syne-Regular', fontSize: 11, color: colors.muted },
  decideCard:   { backgroundColor: colors.goldBg, borderWidth: 1.5, borderColor: colors.goldDim, borderRadius: radius.md, padding: 13, gap: 8 },
  decideVerdict:{ fontFamily: 'Syne-Bold', fontSize: 15, color: colors.gold },
  decideReason: { fontFamily: 'Literata-Light', fontSize: 13, lineHeight: 21, color: colors.cream },
  stepItem:     { flexDirection: 'row', gap: 10, backgroundColor: colors.s2, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 12 },
  stepNum:      { fontFamily: 'Syne-Bold', fontSize: 11, color: colors.gold, minWidth: 18, paddingTop: 1 },
  stepText:     { flex: 1, fontFamily: 'Literata-Light', fontSize: 13, lineHeight: 20, color: colors.cream },
  ghostBtn:     { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  ghostBtnText: { fontFamily: 'Syne-Medium', fontSize: 13, color: colors.text },
});
