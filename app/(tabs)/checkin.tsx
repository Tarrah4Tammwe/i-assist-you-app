// app/(tabs)/checkin.tsx
// Check-in — context-aware AI companion.
// Receives dump context via route params when triggered from Dump Space.
// Pattern detection, smart suggestions, watches for shutdown/overwhelm signals.

import { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '../../lib/store';
import { colors, spacing, radius } from '../../constants/theme';
import { VoiceInput } from '../../components/VoiceInput';

const API_BASE = 'https://i-assist-you.vercel.app';

interface Message { role: 'user' | 'assistant'; content: string; }

// ─── Smart suggestions — contextual, not generic ──────────────────────────────
type SuggestionVariant = 'purple' | 'green' | 'neutral' | 'gold';
interface Suggestion { label: string; variant: SuggestionVariant; action?: string; }

function getSuggestions(lastUserMsg: string, energy: number): Suggestion[] {
  const t = lastUserMsg.toLowerCase();

  if (/\b(noise|loud|overstimulat|sensory)\b/.test(t)) return [
    { label: 'Go quiet for 10 mins', variant: 'purple' },
    { label: 'Move your body',       variant: 'green' },
    { label: 'Water first',          variant: 'neutral' },
    { label: 'Block next hour',      variant: 'gold', action: 'blockHour' },
  ];

  if (/\b(stuck|can't start|initiat|paralys)\b/.test(t)) return [
    { label: 'Open the doc — that\'s it', variant: 'neutral' },
    { label: 'Two minute start',           variant: 'green' },
    { label: 'Body double me',             variant: 'purple', action: 'bodyDouble' },
  ];

  if (/\b(overwhelm|too much|everything|pile)\b/.test(t)) return [
    { label: 'Put one thing down',  variant: 'purple' },
    { label: 'Water first',         variant: 'neutral' },
    { label: 'What\'s the ONE thing', variant: 'gold' },
  ];

  if (/\b(shutdown|numb|can't|flat|done)\b/.test(t)) return [
    { label: 'Drink water',         variant: 'neutral' },
    { label: 'Lie down — it\'s ok', variant: 'purple' },
    { label: 'Change rooms',        variant: 'green' },
  ];

  if (/\b(tired|exhaust|no energy|drained)\b/.test(t) || energy <= 2) return [
    { label: 'Rest is valid',      variant: 'purple' },
    { label: 'Scale the day back', variant: 'gold', action: 'scalePlan' },
    { label: 'Just water + lie down', variant: 'neutral' },
  ];

  // Default gentle suggestions
  return [
    { label: 'Water first',     variant: 'neutral' },
    { label: 'Move your body',  variant: 'green' },
    { label: 'Block next hour', variant: 'gold', action: 'blockHour' },
  ];
}

const SUGGESTION_STYLES: Record<SuggestionVariant, { bg: string; border: string; color: string }> = {
  purple:  { bg: colors.purpleBg,  border: colors.purpleBorder, color: colors.purple },
  green:   { bg: colors.greenBg,   border: '#1a3028',            color: colors.green  },
  neutral: { bg: colors.s1,        border: colors.border,        color: colors.muted  },
  gold:    { bg: colors.goldBg,    border: '#3a2a10',            color: '#c4945a'     },
};

// ─── What the AI watches for ──────────────────────────────────────────────────
function detectConcern(msgs: Message[]): string | null {
  const userMsgs = msgs.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
  const shutdownWords = /\b(shutdown|can't do|done for|nothing left|numb|can't cope|breaking)\b/;
  const shutdownCount = userMsgs.filter(m => shutdownWords.test(m)).length;
  if (shutdownCount >= 2) return 'shutdown';

  const overwhelmWords = /\b(too much|overwhelm|can't breathe|spiral|panic)\b/;
  const overwhelmCount = userMsgs.filter(m => overwhelmWords.test(m)).length;
  if (overwhelmCount >= 2) return 'overwhelm';

  return null;
}

const QUICK_TAPS = [
  { label: 'Stuck',          msg: "I'm stuck and can't start anything." },
  { label: 'Overwhelmed',    msg: "I'm overwhelmed. Too much at once." },
  { label: 'Body double me', msg: 'Can you body double me? I need presence while I work.' },
  { label: 'Going quiet',    msg: "I'm heading toward shutdown. Not okay right now." },
  { label: 'What\'s next?',  msg: 'Just tell me the one next small thing.' },
  { label: 'I did a thing',  msg: 'I did something small but I actually did it.' },
];

export default function CheckinScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { todayPlan, setTodayPlan } = useStore();
  const params = useLocalSearchParams<{ dumpText?: string; dumpType?: string }>();

  const energy = todayPlan?.energy ?? 3;
  const tasks  = todayPlan?.tasks ?? 'not specified';

  const [msgs, setMsgs]       = useState<Message[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions]         = useState<Suggestion[]>([]);
  const [concern, setConcern]                 = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // If arrived from Dump Space, auto-open with that thought as context
  useEffect(() => {
    if (params.dumpText) {
      const opener = `I want to talk through something I just dumped: "${params.dumpText}"`;
      // Small delay so the screen has rendered
      setTimeout(() => send(opener, true), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [msgs]);

  const buildSystemPrompt = () => `
You are a calm, non-judgmental companion for someone with AuDHD. Energy today: ${energy}/5. Their tasks: ${tasks}.
${params.dumpText ? `They came here from their Dump Space — they wrote: "${params.dumpText}". Acknowledge what they wrote, don't make them re-explain.` : ''}

Rules:
- 2-4 sentences max unless body doubling.
- Never shame. Never rush. Never use toxic positivity.
- Overwhelmed → find ONE small next thing.
- Shutdown signals → don't push, suggest physical regulation first (water, move, breathe).
- Body doubling → stay present, give one tiny task to start right now.
- Match their energy. Deadpan is fine. Not every response needs warmth.
- If they mention something specific (noise, people, a task) — respond to that specifically, not generically.
- Never say "You've got this", "Amazing", "I hear you", or any hollow affirmations.
- Surviving counts. Say so plainly when relevant.`.trim();

  const send = async (text: string, fromDump = false) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: 'user', content: text };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setInput('');
    setLoading(true);
    setShowSuggestions(false);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs,
          system: buildSystemPrompt(),
          context: { energy, tasks, screen: 'checkin' },
        }),
      });
      const data = await res.json();
      const reply = data?.content ?? "I'm here.";
      const updatedMsgs = [...newMsgs, { role: 'assistant' as const, content: reply }];
      setMsgs(updatedMsgs);

      // After AI replies, show contextual suggestions based on what user said
      const newSuggestions = getSuggestions(text, energy);
      setSuggestions(newSuggestions);
      setShowSuggestions(true);

      // Check for concern patterns
      const detectedConcern = detectConcern(updatedMsgs);
      setConcern(detectedConcern);
    } catch {
      setMsgs([...newMsgs, { role: 'assistant', content: "I'm here. Tell me what's going on." }]);
    }
    setLoading(false);
  };

  const handleSuggestionAction = (suggestion: Suggestion) => {
    if (suggestion.action === 'blockHour') {
      if (todayPlan) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const newBlock = { time: timeStr, title: 'Protected hour', note: 'Space for yourself.', type: 'break' as const };
        setTodayPlan({ ...todayPlan, blocks: [...todayPlan.blocks, newBlock] });
        send(`I'm going to block the next hour for myself.`);
      }
      return;
    }
    if (suggestion.action === 'bodyDouble') {
      send('Can you body double me? I need presence while I work.');
      return;
    }
    if (suggestion.action === 'scalePlan') {
      send("I need to scale back today. What's actually essential?");
      return;
    }
    // Otherwise treat as a message
    send(suggestion.label);
  };

  const dumpContext = params.dumpText;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Check-in</Text>
        {!dumpContext && <Text style={s.sub}>What do you need right now?</Text>}

        {/* Context bar — shown when arrived from Dump */}
        {dumpContext && (
          <View style={s.contextBar}>
            <Text style={s.contextBarLabel}>FROM YOUR DUMP</Text>
            <Text style={s.contextBarText} numberOfLines={2}>"{dumpContext}"</Text>
          </View>
        )}
      </View>

      {/* Concern flag — surfaces after 2+ distress signals */}
      {concern === 'shutdown' && (
        <View style={[s.concernBanner, { borderColor: colors.purpleBorder }]}>
          <Text style={s.concernText}>
            You've mentioned shutdown a couple of times. That's okay. You don't have to push through anything right now.
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
        style={s.chatScroll}
        contentContainerStyle={s.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick taps — only on empty state */}
        {msgs.length === 0 && (
          <View style={s.quickGrid}>
            {QUICK_TAPS.map(q => (
              <Pressable key={q.label} style={s.quickBtn} onPress={() => send(q.msg)}>
                <Text style={s.quickBtnText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Messages */}
        {msgs.map((m, i) => (
          <View key={i} style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleAi]}>
            {m.role === 'assistant' && <Text style={s.bubbleFrom}>companion</Text>}
            <Text style={m.role === 'user' ? s.bubbleTextUser : s.bubbleTextAi}>{m.content}</Text>
          </View>
        ))}

        {loading && (
          <View style={[s.bubble, s.bubbleAi]}>
            <Text style={s.bubbleFrom}>companion</Text>
            <ActivityIndicator size="small" color={colors.muted} style={{ alignSelf: 'flex-start' }} />
          </View>
        )}

        {/* Smart suggestions — appear after AI responds */}
        {showSuggestions && suggestions.length > 0 && !loading && (
          <View style={s.suggestionsWrap}>
            <Text style={s.suggestionsLabel}>THINGS THAT MIGHT HELP</Text>
            <View style={s.suggestionsRow}>
              {suggestions.map(sugg => {
                const style = SUGGESTION_STYLES[sugg.variant];
                return (
                  <Pressable
                    key={sugg.label}
                    style={[s.suggChip, { backgroundColor: style.bg, borderColor: style.border }]}
                    onPress={() => handleSuggestionAction(sugg)}
                  >
                    <Text style={[s.suggChipText, { color: style.color }]}>{sugg.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Persistent quick taps after conversation started */}
        {msgs.length > 0 && (
          <View style={s.quickRow}>
            {QUICK_TAPS.slice(0, 4).map(q => (
              <Pressable key={q.label} style={s.quickBtnSmall} onPress={() => send(q.msg)}>
                <Text style={s.quickBtnSmallText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[s.inputArea, { paddingBottom: insets.bottom + 70 }]}>
        <VoiceInput
          value={input}
          onChange={setInput}
          onSubmit={() => send(input)}
          placeholder="Say anything…"
          loading={loading}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg },
  header:          { paddingHorizontal: spacing.screenPad, paddingTop: spacing.lg, paddingBottom: spacing.sm, gap: 6 },
  title:           { fontFamily: 'Syne-Bold', fontSize: 22, color: colors.cream, letterSpacing: -0.5 },
  sub:             { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted },

  contextBar:      { backgroundColor: colors.purpleBg, borderWidth: 1, borderColor: colors.purpleBorder, borderRadius: radius.md, padding: 10, gap: 3, marginTop: 4 },
  contextBarLabel: { fontFamily: 'Syne-Regular', fontSize: 9, color: colors.purpleDim, letterSpacing: 1, textTransform: 'uppercase' },
  contextBarText:  { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 12, color: colors.purple, lineHeight: 18 },

  concernBanner:   { marginHorizontal: spacing.screenPad, backgroundColor: colors.purpleBg, borderWidth: 1, borderRadius: radius.md, padding: 11, marginBottom: 2 },
  concernText:     { fontFamily: 'Literata-Light', fontSize: 13, color: colors.purple, lineHeight: 19 },

  chatScroll:      { flex: 1 },
  chatContent:     { padding: spacing.screenPad, gap: spacing.sm, paddingBottom: spacing.lg },

  quickGrid:       { gap: 7 },
  quickBtn:        { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingVertical: 9, paddingHorizontal: 16 },
  quickBtnText:    { fontFamily: 'Syne-Medium', fontSize: 13, color: colors.text },
  quickRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  quickBtnSmall:   { backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: 12 },
  quickBtnSmallText:{ fontFamily: 'Syne-Regular', fontSize: 11, color: colors.muted },

  bubble:          { maxWidth: '88%', padding: 11, borderRadius: radius.lg, marginVertical: 2 },
  bubbleUser:      { backgroundColor: colors.purpleBg, borderWidth: 1.5, borderColor: colors.purpleBorder, alignSelf: 'flex-end' },
  bubbleAi:        { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, alignSelf: 'flex-start' },
  bubbleFrom:      { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.purpleDim, marginBottom: 4 },
  bubbleTextUser:  { fontFamily: 'Literata-Light', fontSize: 14, color: colors.purple, lineHeight: 22 },
  bubbleTextAi:    { fontFamily: 'Literata-Light', fontSize: 14, color: colors.cream, lineHeight: 22 },

  suggestionsWrap: { gap: 7, marginTop: 4 },
  suggestionsLabel:{ fontFamily: 'Syne-Regular', fontSize: 9, color: colors.muted2, letterSpacing: 1, textTransform: 'uppercase' },
  suggestionsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  suggChip:        { borderWidth: 1, borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: 12 },
  suggChipText:    { fontFamily: 'Syne-Medium', fontSize: 11 },

  inputArea:       { paddingHorizontal: spacing.screenPad, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
});
