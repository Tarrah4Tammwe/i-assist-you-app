// app/(tabs)/do.tsx
// Do It Now — three modes: Research it / Decide for me / Structure this

import { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, Linking, Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../../lib/store';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';
import { colors, spacing, radius } from '../../constants/theme';
import { VoiceTextarea } from '../../components/VoiceTextarea';

const API_BASE = 'https://i-assist-you.vercel.app';

type Mode = 'research' | 'decide' | 'structure';

interface ModeConfig {
  id: Mode;
  icon: string;
  title: string;
  desc: string;
  tagBg: string;
  tagBorder: string;
  tagColor: string;
  placeholder: string;
  btnLabel: string;
  thinkingText: string;
}

const MODES: ModeConfig[] = [
  {
    id: 'research',
    icon: '🔍',
    title: 'Research it',
    desc: 'Get a quick, usable answer',
    tagBg: colors.blueBg, tagBorder: '#0d1d2e', tagColor: colors.blue,
    placeholder: "Ask like you'd ask a smart friend. No need to be formal.",
    btnLabel: 'Find out',
    thinkingText: 'Researching…',
  },
  {
    id: 'decide',
    icon: '⚖️',
    title: 'Decide for me',
    desc: 'Give me the options, pick one',
    tagBg: colors.goldBg, tagBorder: colors.goldDim, tagColor: colors.gold,
    placeholder: "Describe what you're stuck on. List your options if you have them — or just dump the situation.",
    btnLabel: 'Make the call',
    thinkingText: 'Weighing it up…',
  },
  {
    id: 'structure',
    icon: '🧠',
    title: 'Structure this',
    desc: 'Turn chaos into steps',
    tagBg: colors.greenBg, tagBorder: '#0d221a', tagColor: colors.green,
    placeholder: "Don't organise — just get it all out. Everything in your head about this.",
    btnLabel: 'Structure this',
    thinkingText: 'Structuring…',
  },
];

interface Source {
  type: 'video' | 'site';
  url: string;
  title: string;
  source: string;
}

interface Result {
  type: 'text' | 'decide' | 'steps';
  data: any;
  sources?: Source[];
}

function DotPulse() {
  return (
    <View style={dp.row}>
      {[0, 1, 2].map(i => <View key={i} style={dp.dot} />)}
    </View>
  );
}
const dp = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold, opacity: 0.6 },
});

function SourceCard({ source, onPress }: { source: Source; onPress: () => void }) {
  return (
    <Pressable style={sc.card} onPress={onPress}>
      <View style={sc.iconWrap}>
        <Text style={sc.icon}>{source.type === 'video' ? '▶' : '↗'}</Text>
      </View>
      <View style={sc.text}>
        <Text style={sc.sourceName}>{source.source}</Text>
        <Text style={sc.sourceTitle} numberOfLines={2}>{source.title}</Text>
      </View>
    </Pressable>
  );
}
const sc = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  iconWrap: { width: 44, height: 44, backgroundColor: colors.s2, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 14, color: colors.muted },
  text: { flex: 1, paddingHorizontal: 12 },
  sourceName: { fontFamily: 'Syne-Regular', fontSize: 9, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sourceTitle: { fontFamily: 'Syne-Medium', fontSize: 12, color: colors.cream, lineHeight: 17, marginTop: 2 },
});

function InAppBrowser({ url, onClose }: { url: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[iab.container, { backgroundColor: colors.bg }]}>
        <View style={[iab.bar, { paddingTop: insets.top + 8 }]}>
          <Text style={iab.url} numberOfLines={1}>{url}</Text>
          <Pressable style={iab.closeBtn} onPress={onClose}>
            <Text style={iab.closeTxt}>Close</Text>
          </Pressable>
        </View>
        <WebView source={{ uri: url }} style={{ flex: 1 }} onError={() => Linking.openURL(url)} />
      </View>
    </Modal>
  );
}
const iab = StyleSheet.create({
  container: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.screenPad, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  url: { flex: 1, fontFamily: 'Syne-Regular', fontSize: 10, color: colors.muted },
  closeBtn: { backgroundColor: colors.s2, borderRadius: radius.sm, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border },
  closeTxt: { fontFamily: 'Syne-Regular', fontSize: 11, color: colors.muted },
});

export default function DoNowScreen() {
  const insets = useSafeAreaInsets();
  const { todayPlan } = useStore();
  const { user } = useSupabaseUser();
  const energy = todayPlan?.energy ?? 3;

  const [mode, setMode]       = useState<Mode | null>(null);
  const [input, setInput]     = useState('');
  const [result, setResult]   = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [stepsDone, setStepsDone]   = useState<Set<number>>(new Set());

  const currentMode = MODES.find(m => m.id === mode);

  const run = async () => {
    if (!input.trim() || !mode) return;
    setLoading(true); setResult(null); setError(null); setStepsDone(new Set());
    try {
      const res = await fetch(`${API_BASE}/api/execute-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, input, context: { energy, userId: user?.id } }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
    } catch {
      setError('Something went wrong. Try again.');
    }
    setLoading(false);
  };

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => { setMode(null); setInput(''); setResult(null); setError(null); setStepsDone(new Set()); };
  const newQuery = () => { setInput(''); setResult(null); setError(null); setStepsDone(new Set()); };

  const toggleStep = (i: number) => {
    setStepsDone(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const stepsTotal = result?.type === 'steps' ? result.data?.length ?? 0 : 0;
  const stepsProgress = stepsTotal > 0 ? stepsDone.size / stepsTotal : 0;

  const resetLabel = mode === 'research' ? 'Ask something else' : mode === 'decide' ? 'Decide something else' : 'Start over';

  return (
    <>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Do it now</Text>

        {!mode && (
          <View style={s.modeList}>
            {MODES.map(m => (
              <Pressable key={m.id} style={s.modeCard} onPress={() => setMode(m.id)}>
                <View style={[s.modeIconWrap, { backgroundColor: m.tagBg, borderColor: m.tagBorder }]}>
                  <Text style={s.modeIconText}>{m.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.modeTitle}>{m.title}</Text>
                  <Text style={s.modeDesc}>{m.desc}</Text>
                </View>
                <Text style={s.modeArrow}>›</Text>
              </Pressable>
            ))}
          </View>
        )}

        {mode && currentMode && (
          <View style={s.activeWrap}>
            <View style={s.tagRow}>
              <View style={[s.modeTag, { backgroundColor: currentMode.tagBg, borderColor: currentMode.tagBorder }]}>
                <Text style={[s.modeTagText, { color: currentMode.tagColor }]}>
                  {currentMode.icon}  {currentMode.title}
                </Text>
              </View>
              {!loading && (
                <Pressable onPress={result ? newQuery : reset} style={s.backBtn}>
                  <Text style={s.backBtnText}>{result ? resetLabel : '← Back'}</Text>
                </Pressable>
              )}
            </View>

            {!result && (
              <>
                <VoiceTextarea
                  rows={mode === 'structure' ? 6 : 5}
                  placeholder={currentMode.placeholder}
                  value={input}
                  onChange={setInput}
                />
                <Pressable
                  style={[s.runBtn, (!input.trim() || loading) && s.runBtnDisabled]}
                  onPress={run}
                  disabled={!input.trim() || loading}
                >
                  {loading
                    ? <ActivityIndicator size="small" color={colors.bg} />
                    : <Text style={s.runBtnText}>{currentMode.btnLabel}</Text>
                  }
                </Pressable>
                {loading && (
                  <View style={s.thinkingCard}>
                    <DotPulse />
                    <Text style={s.thinkingText}>{currentMode.thinkingText}</Text>
                  </View>
                )}
                {error && <Text style={s.errorText}>{error}</Text>}
              </>
            )}

            {result?.type === 'text' && (
              <View style={{ gap: spacing.sm }}>
                <View style={s.textCard}>
                  <Text style={s.textCardContent}>{result.data}</Text>
                </View>
                {result.sources && result.sources.length > 0 && (
                  <View style={{ gap: spacing.xs + 2 }}>
                    <Text style={s.sourcesLabel}>Related</Text>
                    {result.sources.map((src, i) => (
                      <SourceCard key={i} source={src} onPress={() => setBrowserUrl(src.url)} />
                    ))}
                  </View>
                )}
                <View style={s.actionsRow}>
                  <Pressable style={s.copyBtn} onPress={() => copy(result.data)}>
                    <Text style={s.copyBtnText}>{copied ? 'Copied ✓' : 'Copy'}</Text>
                  </Pressable>
                  <Pressable style={s.ghostBtn} onPress={newQuery}>
                    <Text style={s.ghostBtnText}>Ask something else →</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {result?.type === 'decide' && result.data && (
              <View style={{ gap: spacing.sm }}>
                <View style={s.verdictCard}>
                  <Text style={s.verdictLabel}>The call</Text>
                  <Text style={s.verdictText}>{result.data.verdict}</Text>
                  <View style={s.verdictDivider} />
                  <Text style={s.verdictReasonLabel}>Why</Text>
                  <Text style={s.verdictReason}>{result.data.reason}</Text>
                </View>
                <View style={s.actionsRow}>
                  <Pressable style={s.copyBtn} onPress={() => copy(`${result.data.verdict}\n\n${result.data.reason}`)}>
                    <Text style={s.copyBtnText}>{copied ? 'Copied ✓' : 'Copy'}</Text>
                  </Pressable>
                  <Pressable style={s.ghostBtn} onPress={newQuery}>
                    <Text style={s.ghostBtnText}>Decide something else →</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {result?.type === 'steps' && Array.isArray(result.data) && (
              <View style={{ gap: spacing.sm }}>
                <View style={s.progRow}>
                  <View style={s.progBar}>
                    <View style={[s.progFill, { width: `${stepsProgress * 100}%` as any }]} />
                  </View>
                  <Text style={s.progLabel}>{stepsDone.size} of {stepsTotal}</Text>
                </View>
                <View style={{ gap: 8 }}>
                  {result.data.map((step: string, i: number) => {
                    const done = stepsDone.has(i);
                    return (
                      <Pressable key={i} style={[s.stepItem, done && s.stepDone]} onPress={() => toggleStep(i)}>
                        <View style={[s.stepNum, done && s.stepNumDone]}>
                          <Text style={[s.stepNumText, done && s.stepNumTextDone]}>{i + 1}</Text>
                        </View>
                        <Text style={[s.stepText, done && s.stepTextDone]}>{step}</Text>
                        <Text style={[s.stepCheck, done && s.stepCheckDone]}>{done ? '✓' : '○'}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={s.actionsRow}>
                  <Pressable style={s.copyBtn} onPress={() => copy(result.data.map((st: string, i: number) => `${i+1}. ${st}`).join('\n'))}>
                    <Text style={s.copyBtnText}>{copied ? 'Copied ✓' : 'Copy'}</Text>
                  </Pressable>
                  <Pressable style={s.ghostBtn} onPress={newQuery}>
                    <Text style={s.ghostBtnText}>Structure something else →</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {browserUrl && <InAppBrowser url={browserUrl} onClose={() => setBrowserUrl(null)} />}
    </>
  );
}

const s = StyleSheet.create({
  scroll:       { paddingHorizontal: spacing.screenPad, paddingTop: spacing.lg, gap: spacing.gap },
  title:        { fontFamily: 'Syne-Bold', fontSize: 22, color: colors.cream, letterSpacing: -0.5 },
  modeList:     { gap: spacing.sm },
  modeCard:     { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  modeIconWrap: { width: 36, height: 36, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modeIconText: { fontSize: 16 },
  modeTitle:    { fontFamily: 'Syne-Bold', fontSize: 13, color: colors.cream },
  modeDesc:     { fontFamily: 'Literata-Light', fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: 2 },
  modeArrow:    { fontSize: 18, color: colors.border2 },
  activeWrap:   { gap: spacing.sm + 2 },
  tagRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeTag:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 11, paddingVertical: 4 },
  modeTagText:  { fontFamily: 'Syne-Medium', fontSize: 10 },
  backBtn:      { backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 5, paddingHorizontal: 10 },
  backBtnText:  { fontFamily: 'Syne-Regular', fontSize: 11, color: colors.muted },
  runBtn:       { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  runBtnDisabled: { opacity: 0.35 },
  runBtnText:   { fontFamily: 'Syne-Bold', fontSize: 13, color: colors.bg },
  thinkingCard: { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10 },
  thinkingText: { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 13, color: colors.muted },
  errorText:    { fontFamily: 'Literata-Light', fontSize: 13, color: colors.red },
  textCard:     { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  textCardContent: { fontFamily: 'Literata-Light', fontSize: 13, lineHeight: 22, color: colors.cream },
  sourcesLabel: { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted },
  verdictCard:  { backgroundColor: colors.goldBg, borderWidth: 1.5, borderColor: colors.goldDim, borderRadius: radius.lg, padding: 18, gap: 10 },
  verdictLabel: { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.goldDim },
  verdictText:  { fontFamily: 'Syne-Bold', fontSize: 18, color: colors.gold, letterSpacing: -0.3, lineHeight: 24 },
  verdictDivider: { height: 1, backgroundColor: '#2e2410' },
  verdictReasonLabel: { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.goldDim },
  verdictReason:{ fontFamily: 'Literata-Light', fontSize: 13, lineHeight: 22, color: colors.cream },
  progRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progBar:      { flex: 1, height: 2, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  progFill:     { height: '100%', backgroundColor: colors.green, borderRadius: 2 },
  progLabel:    { fontFamily: 'Syne-Regular', fontSize: 10, color: colors.muted },
  stepItem:     { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: colors.greenBg, borderWidth: 1.5, borderColor: '#0d221a', borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 13 },
  stepDone:     { opacity: 0.38 },
  stepNum:      { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#1a3328', backgroundColor: '#0a1510', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumDone:  { borderColor: colors.border, backgroundColor: colors.s1 },
  stepNumText:  { fontFamily: 'Syne-Bold', fontSize: 10, color: colors.green },
  stepNumTextDone: { color: colors.muted },
  stepText:     { flex: 1, fontFamily: 'Literata-Light', fontSize: 13, lineHeight: 21, color: colors.cream, paddingTop: 1 },
  stepTextDone: { textDecorationLine: 'line-through', color: colors.muted },
  stepCheck:    { fontSize: 15, color: '#1a3328', paddingTop: 1 },
  stepCheckDone:{ color: colors.green },
  actionsRow:   { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  copyBtn:      { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 13 },
  copyBtnText:  { fontFamily: 'Syne-Regular', fontSize: 12, color: colors.muted },
  ghostBtn:     { flex: 1, backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 11, alignItems: 'center' },
  ghostBtnText: { fontFamily: 'Syne-Medium', fontSize: 12, color: colors.text },
});
