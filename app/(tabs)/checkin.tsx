// app/(tabs)/checkin.tsx
// Check-in — context-aware AI companion + body double session host.
// Modes: conversation | body-double
// Body double is a persistent session with interval check-ins and calendar wrap-up logic.

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useStore } from '../../lib/store';
import { colors, spacing, radius } from '../../constants/theme';
import { VoiceInput } from '../../components/VoiceInput';
import { BodyDoubleSession } from '../../components/BodyDoubleSession';
import { AppHeader } from '../../components/AppHeader';

const API_BASE = 'https://i-assist-you.vercel.app';

interface Message { role: 'user' | 'assistant'; content: string; }

type ScreenMode = 'conversation' | 'body-double';

// ─── Quick taps ───────────────────────────────────────────────────────────────
const QUICK_TAPS = [
  { label: "I'm stuck",        msg: "I'm stuck and can't start anything.",               icon: '🧱' },
  { label: 'Overwhelmed',      msg: "I'm overwhelmed. Too much at once.",                icon: '🌊' },
  { label: 'Body double me',   msg: '__body_double__',                                   icon: '🪞' },
  { label: 'Going quiet',      msg: "I'm heading toward shutdown. Not okay right now.",  icon: '🔇' },
  { label: "What's next?",     msg: 'Just tell me the one next small thing.',            icon: '👆' },
  { label: 'I did a thing',    msg: 'I did something small but I actually did it.',      icon: '✨' },
];

// ─── Concern detection ────────────────────────────────────────────────────────
function detectConcern(msgs: Message[]): 'shutdown' | 'overwhelm' | null {
  const userMsgs = msgs.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
  if (userMsgs.filter(m => /\b(shutdown|can't do|done for|nothing left|numb|can't cope)\b/.test(m)).length >= 2) return 'shutdown';
  if (userMsgs.filter(m => /\b(too much|overwhelm|can't breathe|spiral|panic)\b/.test(m)).length >= 2) return 'overwhelm';
  return null;
}

// ─── Triage card (overwhelmed) ────────────────────────────────────────────────
function TriageCard({ blocks }: { blocks: Array<{ title: string }> }) {
  const categorise = (title: string): { label: string; style: 'keep' | 'tomorrow' | 'drop' } => {
    const t = title.toLowerCase();
    if (/meeting|call|appointment|standup|fixed|doctor/.test(t)) return { label: 'keep', style: 'keep' };
    if (/tidy|clean|sort|organise|organize/.test(t)) return { label: 'drop it', style: 'drop' };
    return { label: 'tomorrow', style: 'tomorrow' };
  };

  return (
    <View style={ts.card}>
      <Text style={ts.label}>TODAY'S TASKS — SORTED FOR YOU</Text>
      {blocks.slice(0, 5).map((b, i) => {
        const cat = categorise(b.title);
        return (
          <View key={i} style={ts.row}>
            <Text style={ts.rowText}>{b.title}</Text>
            <View style={[ts.pill, ts[cat.style]]}>
              <Text style={[ts.pillText, ts[`${cat.style}Text` as keyof typeof ts] as any]}>{cat.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const ts = StyleSheet.create({
  card:         { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border2, borderRadius: radius.lg, padding: spacing.cardPad, gap: 7 },
  label:        { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.blue, marginBottom: 2 },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: 11, gap: 8 },
  rowText:      { flex: 1, fontFamily: 'Syne-Medium', fontSize: 12, color: colors.cream },
  pill:         { borderRadius: radius.full, paddingVertical: 3, paddingHorizontal: 9, borderWidth: 1 },
  pillText:     { fontFamily: 'Syne-Medium', fontSize: 10 },
  keep:         { backgroundColor: colors.greenBg, borderColor: '#1a3028' },
  tomorrow:     { backgroundColor: colors.s1, borderColor: colors.border },
  drop:         { backgroundColor: '#1a1210', borderColor: '#3a2018' },
  keepText:     { fontFamily: 'Syne-Medium', fontSize: 10, color: colors.green },
  tomorrowText: { fontFamily: 'Syne-Medium', fontSize: 10, color: colors.muted },
  dropText:     { fontFamily: 'Syne-Medium', fontSize: 10, color: colors.red },
});

// ─── What's next card ─────────────────────────────────────────────────────────
function WhatsNextCard({
  block,
  onDone,
  onSkip,
}: {
  block: { title: string; note?: string };
  onDone: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={wn.card}>
      <Text style={wn.label}>YOUR NEXT THING</Text>
      <Text style={wn.title}>{block.title}</Text>
      {block.note && <Text style={wn.note}>{block.note}</Text>}
      <Text style={wn.step}>Start with the smallest possible first action. That's it.</Text>
      <View style={wn.actions}>
        <Pressable style={wn.btnPrimary} onPress={onDone}>
          <Text style={wn.btnPrimaryText}>On it →</Text>
        </Pressable>
        <Pressable style={wn.btnSecondary} onPress={onSkip}>
          <Text style={wn.btnSecondaryText}>Not that one</Text>
        </Pressable>
      </View>
    </View>
  );
}

const wn = StyleSheet.create({
  card:           { backgroundColor: colors.goldBg, borderWidth: 1.5, borderColor: colors.goldDim, borderRadius: radius.lg, padding: spacing.cardPad, gap: 8 },
  label:          { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.goldDim },
  title:          { fontFamily: 'Syne-Bold', fontSize: 16, color: colors.gold, lineHeight: 22 },
  note:           { fontFamily: 'Literata-Light', fontSize: 12, color: colors.muted, lineHeight: 18 },
  step:           { fontFamily: 'Literata-Light', fontSize: 13, color: colors.cream, lineHeight: 20 },
  actions:        { flexDirection: 'row', gap: 8, marginTop: 2 },
  btnPrimary:     { flex: 1, backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  btnPrimaryText: { fontFamily: 'Syne-Bold', fontSize: 12, color: colors.bg },
  btnSecondary:   { flex: 1, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.goldDim, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  btnSecondaryText:{ fontFamily: 'Syne-Medium', fontSize: 12, color: colors.goldDim },
});

// ─── Shutdown card ────────────────────────────────────────────────────────────
function ShutdownCard() {
  return (
    <View style={sd.card}>
      <Text style={sd.title}>One physical thing</Text>
      {[
        { icon: '💧', text: 'Drink some water. Sit somewhere you don\'t usually sit.' },
        { icon: '🌬', text: '4 counts in, hold 4, out 4. Once is enough.' },
        { icon: '📵', text: 'Put the phone down. Come back when you\'re ready.' },
      ].map((item, i) => (
        <View key={i} style={sd.row}>
          <Text style={sd.rowIcon}>{item.icon}</Text>
          <Text style={sd.rowText}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

const sd = StyleSheet.create({
  card:    { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border2, borderRadius: radius.lg, padding: spacing.cardPad, gap: 9 },
  title:   { fontFamily: 'Syne-Bold', fontSize: 13, color: colors.cream, marginBottom: 2 },
  row:     { flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: colors.bg, borderRadius: radius.md, padding: 9 },
  rowIcon: { fontSize: 15 },
  rowText: { flex: 1, fontFamily: 'Literata-Light', fontSize: 12, color: colors.muted, lineHeight: 18 },
});

// ─── I did a thing card ────────────────────────────────────────────────────────
function DidAThingCard({ onNameIt }: { onNameIt: (taskName: string) => void }) {
  const { todayPlan } = useStore();
  const taskBlocks = todayPlan?.blocks.filter(b => b.type === 'task').slice(0, 3) ?? [];

  return (
    <View style={da.card}>
      <View style={da.topRow}>
        <Text style={da.check}>✓</Text>
        <Text style={da.title}>That counts.</Text>
      </View>
      <Text style={da.note}>Small things are real things.</Text>
      {taskBlocks.length > 0 && (
        <View style={da.chipsWrap}>
          <Text style={da.chipsLabel}>MARK SOMETHING DONE</Text>
          <View style={da.chips}>
            {taskBlocks.map((b, i) => (
              <Pressable key={i} style={da.chip} onPress={() => onNameIt(b.title)}>
                <Text style={da.chipText}>{b.title}</Text>
              </Pressable>
            ))}
            <Pressable style={da.chip} onPress={() => onNameIt('something else')}>
              <Text style={da.chipText}>something else</Text>
            </Pressable>
            <Pressable style={[da.chip, da.chipMuted]} onPress={() => onNameIt('')}>
              <Text style={[da.chipText, { color: colors.muted2 }]}>rather not say</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const da = StyleSheet.create({
  card:       { backgroundColor: colors.greenBg, borderWidth: 1.5, borderColor: '#1a3028', borderRadius: radius.lg, padding: spacing.cardPad, gap: 8 },
  topRow:     { flexDirection: 'row', alignItems: 'center', gap: 9 },
  check:      { fontFamily: 'Syne-Bold', fontSize: 18, color: colors.green },
  title:      { fontFamily: 'Syne-Bold', fontSize: 15, color: colors.green },
  note:       { fontFamily: 'Literata-Light', fontSize: 13, color: colors.cream, lineHeight: 20 },
  chipsWrap:  { gap: 7, marginTop: 2 },
  chipsLabel: { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#2a6040' },
  chips:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:       { backgroundColor: colors.bg, borderWidth: 1, borderColor: '#1a3028', borderRadius: radius.full, paddingVertical: 5, paddingHorizontal: 11 },
  chipMuted:  { borderColor: colors.border },
  chipText:   { fontFamily: 'Syne-Regular', fontSize: 11, color: colors.green },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CheckinScreen() {
  const insets = useSafeAreaInsets();
  const { todayPlan } = useStore();
  const params = useLocalSearchParams<{ dumpText?: string }>();

  const energy = todayPlan?.energy ?? 3;
  const tasks  = todayPlan?.tasks ?? 'not specified';

  const [mode, setMode] = useState<ScreenMode>('conversation');
  const [msgs, setMsgs]       = useState<Message[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);

  // Special cards surfaced inline
  const [showTriage, setShowTriage]       = useState(false);
  const [showShutdown, setShowShutdown]   = useState(false);
  const [showDidAThing, setShowDidAThing] = useState(false);
  const [whatsNextBlock, setWhatsNextBlock] = useState<{ title: string; note?: string } | null>(null);
  const [nextBlockIndex, setNextBlockIndex] = useState(0);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [msgs]);

  // Arrive from Dump Space
  useEffect(() => {
    if (params.dumpText) {
      setTimeout(() => send(`I want to talk through something I just wrote: "${params.dumpText}"`, true), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const concern = detectConcern(msgs);

  const buildSystem = (extra = '') => `
You are a calm, non-judgmental companion for someone with AuDHD. Energy today: ${energy}/5. Their tasks today: ${tasks}.
${params.dumpText ? `They came from their Dump Space — they wrote: "${params.dumpText}". Don't make them re-explain it.` : ''}
${extra}
Rules:
- 2-4 sentences max unless body doubling.
- Never shame. Never rush. Zero toxic positivity.
- Overwhelmed → validate first, then offer one thing to put down.
- Shutdown → don't push. Suggest physical first (water, move, breathe).
- Body doubling → stay present, give one tiny task right now.
- Match their energy. Deadpan is fine.
- Never say "You've got this", "Amazing", "I hear you" as hollow affirmation.
- Surviving counts. Say so plainly when relevant.`.trim();

  const send = async (text: string, fromDump = false) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: 'user', content: text };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setInput('');
    setLoading(true);

    // Reset special cards
    setShowTriage(false);
    setShowShutdown(false);
    setShowDidAThing(false);
    setWhatsNextBlock(null);

    // Detect specific intents to surface special cards alongside AI response
    const t = text.toLowerCase();
    const isOverwhelmed = /\b(overwhelm|too much|everything|can't handle)\b/.test(t);
    const isShutdown    = /\b(shutdown|going quiet|not okay|numb|can't)\b/.test(t);
    const isWhatsNext   = /\b(what'?s next|next thing|one thing|tell me)\b/.test(t);
    const isDidAThing   = /\b(did a thing|did something|actually did|small win)\b/.test(t);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs,
          system: buildSystem(),
          context: { energy, tasks, screen: 'checkin' },
        }),
      });
      const data = await res.json();
      const reply = data?.content ?? "I'm here.";
      setMsgs([...newMsgs, { role: 'assistant', content: reply }]);

      // Surface special UI cards
      if (isOverwhelmed && todayPlan?.blocks?.length) setShowTriage(true);
      if (isShutdown) setShowShutdown(true);
      if (isWhatsNext && todayPlan?.blocks) {
        const taskBlocks = todayPlan.blocks.filter(b => b.type === 'task');
        if (taskBlocks[nextBlockIndex]) setWhatsNextBlock(taskBlocks[nextBlockIndex]);
      }
      if (isDidAThing) setShowDidAThing(true);
    } catch {
      setMsgs([...newMsgs, { role: 'assistant', content: "I'm here. Tell me what's going on." }]);
    }
    setLoading(false);
  };

  const handleQuickTap = (tap: typeof QUICK_TAPS[0]) => {
    if (tap.msg === '__body_double__') {
      setMode('body-double');
      return;
    }
    send(tap.msg);
  };

  const handleDidAThingName = (taskName: string) => {
    setShowDidAThing(false);
    if (taskName && taskName !== 'something else') {
      send(`I finished: ${taskName}`);
    }
  };

  const handleWhatsNextDone = () => {
    setWhatsNextBlock(null);
    send("I'm on it.");
  };

  const handleWhatsNextSkip = () => {
    const taskBlocks = todayPlan?.blocks.filter(b => b.type === 'task') ?? [];
    const next = nextBlockIndex + 1;
    setNextBlockIndex(next);
    const nextBlock = taskBlocks[next];
    if (nextBlock) {
      setWhatsNextBlock(nextBlock);
    } else {
      setWhatsNextBlock(null);
      send("None of those feel right — what else could I do?");
    }
  };

  // ─── Body double mode ────────────────────────────────────────────────────────
  if (mode === 'body-double') {
    return (
      <View style={[s.container, { paddingTop: 0 }]}>
        <AppHeader />
        <View style={[s.bodyDoubleWrap, { paddingBottom: insets.bottom + 80 }]}>
          <BodyDoubleSession onEnd={() => setMode('conversation')} />
        </View>
      </View>
    );
  }

  // ─── Conversation mode ───────────────────────────────────────────────────────
  return (
    <View style={[s.container, { paddingTop: 0 }]}>
      <AppHeader />
      <View style={s.header}>
        <Text style={s.title}>Check in</Text>
        {msgs.length === 0 && !params.dumpText && (
          <Text style={s.sub}>What do you need right now?</Text>
        )}
        {params.dumpText && (
          <View style={s.dumpBar}>
            <Text style={s.dumpBarLabel}>FROM YOUR DUMP</Text>
            <Text style={s.dumpBarText} numberOfLines={2}>"{params.dumpText}"</Text>
          </View>
        )}
      </View>

      {/* Concern banner */}
      {concern === 'shutdown' && (
        <View style={[s.concernBanner, { borderColor: colors.purpleBorder }]}>
          <Text style={s.concernText}>
            You've mentioned shutdown a couple of times. You don't have to push through anything right now.
          </Text>
        </View>
      )}
      {concern === 'overwhelm' && (
        <View style={[s.concernBanner, { borderColor: '#3a2010' }]}>
          <Text style={[s.concernText, { color: '#c4945a' }]}>
            You've been carrying a lot. Let's just find one thing to put down.
          </Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick taps — empty state */}
        {msgs.length === 0 && (
          <View style={s.quickGrid}>
            {QUICK_TAPS.map(q => (
              <Pressable key={q.label} style={s.quickBtn} onPress={() => handleQuickTap(q)}>
                <Text style={s.quickBtnIcon}>{q.icon}</Text>
                <Text style={s.quickBtnText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Messages + inline cards */}
        {msgs.map((m, i) => (
          <View key={i} style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleAi]}>
            {m.role === 'assistant' && <Text style={s.bubbleFrom}>companion</Text>}
            <Text style={m.role === 'user' ? s.bubbleTextUser : s.bubbleTextAi}>{m.content}</Text>
          </View>
        ))}

        {loading && (
          <View style={[s.bubble, s.bubbleAi]}>
            <Text style={s.bubbleFrom}>companion</Text>
            <ActivityIndicator size="small" color={colors.muted} />
          </View>
        )}

        {/* Special cards — surface after AI responds */}
        {showTriage && todayPlan?.blocks && (
          <TriageCard blocks={todayPlan.blocks.filter(b => b.type === 'task')} />
        )}
        {showShutdown && <ShutdownCard />}
        {whatsNextBlock && (
          <WhatsNextCard
            block={whatsNextBlock}
            onDone={handleWhatsNextDone}
            onSkip={handleWhatsNextSkip}
          />
        )}
        {showDidAThing && <DidAThingCard onNameIt={handleDidAThingName} />}

        {/* Persistent quick taps after conversation */}
        {msgs.length > 0 && (
          <View style={s.chipsRow}>
            {QUICK_TAPS.slice(0, 4).map(q => (
              <Pressable key={q.label} style={s.chip} onPress={() => handleQuickTap(q)}>
                <Text style={s.chipText}>{q.icon} {q.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[s.inputArea, { paddingBottom: insets.bottom + 72 }]}>
        <VoiceInput
          value={input}
          onChange={setInput}
          onSubmit={() => send(input)}
          placeholder={msgs.length === 0 ? 'Or just say anything…' : 'Say anything…'}
          loading={loading}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg },
  header:          { paddingHorizontal: spacing.screenPad, paddingTop: spacing.lg, paddingBottom: spacing.sm, gap: 5 },
  headerRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:           { fontFamily: 'Syne-Bold', fontSize: 22, color: colors.cream, letterSpacing: -0.5 },
  sub:             { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted },
  backBtn:         { paddingVertical: 4, paddingHorizontal: 2 },
  backBtnText:     { fontFamily: 'Syne-Regular', fontSize: 12, color: colors.muted },

  dumpBar:         { backgroundColor: colors.purpleBg, borderWidth: 1, borderColor: colors.purpleBorder, borderRadius: radius.md, padding: 10, gap: 3, marginTop: 4 },
  dumpBarLabel:    { fontFamily: 'Syne-Regular', fontSize: 9, color: colors.purpleDim, letterSpacing: 1, textTransform: 'uppercase' },
  dumpBarText:     { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 12, color: colors.purple, lineHeight: 18 },

  concernBanner:   { marginHorizontal: spacing.screenPad, backgroundColor: colors.purpleBg, borderWidth: 1, borderRadius: radius.md, padding: 11, marginBottom: 2 },
  concernText:     { fontFamily: 'Literata-Light', fontSize: 13, color: colors.purple, lineHeight: 19 },

  scroll:          { flex: 1 },
  scrollContent:   { padding: spacing.screenPad, gap: spacing.sm },

  quickGrid:       { gap: 7 },
  quickBtn:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, paddingVertical: 13, paddingHorizontal: 14 },
  quickBtnIcon:    { fontSize: 17 },
  quickBtnText:    { fontFamily: 'Syne-Medium', fontSize: 13, color: colors.text },

  bubble:          { maxWidth: '88%', padding: 11, borderRadius: radius.lg, marginVertical: 2 },
  bubbleUser:      { backgroundColor: colors.s2, borderWidth: 1.5, borderColor: colors.border2, alignSelf: 'flex-end' },
  bubbleAi:        { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, alignSelf: 'flex-start' },
  bubbleFrom:      { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.goldDim, marginBottom: 4 },
  bubbleTextUser:  { fontFamily: 'Literata-Light', fontSize: 14, color: colors.text, lineHeight: 22 },
  bubbleTextAi:    { fontFamily: 'Literata-Light', fontSize: 14, color: colors.cream, lineHeight: 22 },

  chipsRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip:            { backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: 12 },
  chipText:        { fontFamily: 'Syne-Regular', fontSize: 11, color: colors.muted },

  inputArea:       { paddingHorizontal: spacing.screenPad, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },

  bodyDoubleWrap:  { flex: 1, paddingHorizontal: spacing.screenPad, paddingTop: spacing.sm },
});

