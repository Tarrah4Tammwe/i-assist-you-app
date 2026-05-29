// app/(tabs)/checkin.tsx
// Check-in — 6 quick-tap states + real AI companion conversation.
// Knows your energy and today's tasks as context.

import { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../lib/store';
import { colors, spacing, radius } from '../../constants/theme';
import { VoiceInput } from '../../components/VoiceInput';

const API_BASE = 'https://i-assist-you.vercel.app';

const QUICK_TAPS = [
  { label: '🧱 Stuck',         msg: "I'm stuck and can't start anything." },
  { label: '🌊 Overwhelmed',   msg: "I'm overwhelmed. Too much at once." },
  { label: '🪞 Body double me', msg: 'Can you body double me? I need presence while I work.' },
  { label: '🔇 Going quiet',   msg: "I'm heading toward shutdown. Not okay right now." },
  { label: '👆 What\'s next?', msg: 'Just tell me the one next small thing.' },
  { label: '✨ I did a thing',  msg: 'I did something small but I actually did it.' },
];

interface Message { role: 'user' | 'assistant'; content: string; }

export default function CheckinScreen() {
  const insets = useSafeAreaInsets();
  const { todayPlan } = useStore();
  const energy = todayPlan?.energy ?? 3;
  const tasks  = todayPlan?.tasks ?? 'not specified';

  const [msgs, setMsgs]   = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [msgs]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const newMsgs: Message[] = [...msgs, { role: 'user', content: text }];
    setMsgs(newMsgs); setInput(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs,
          context: { energy, tasks, screen: 'checkin' },
        }),
      });
      const data = await res.json();
      const reply = data?.content ?? "I'm here.";
      setMsgs([...newMsgs, { role: 'assistant', content: reply }]);
    } catch {
      setMsgs([...newMsgs, { role: 'assistant', content: "I'm here. Tell me what's going on." }]);
    }
    setLoading(false);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Check-in</Text>
        <Text style={s.sub}>What do you need right now?</Text>
      </View>

      <ScrollView ref={scrollRef} style={s.chatScroll} contentContainerStyle={s.chatContent} showsVerticalScrollIndicator={false}>
        {msgs.length === 0 && (
          <View style={s.quickGrid}>
            {QUICK_TAPS.map(q => (
              <Pressable key={q.label} style={s.quickBtn} onPress={() => send(q.msg)}>
                <Text style={s.quickBtnText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {msgs.map((m, i) => (
          <View key={i} style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleAi]}>
            {m.role === 'assistant' && <Text style={s.bubbleFrom}>companion</Text>}
            <Text style={s.bubbleText}>{m.content}</Text>
          </View>
        ))}

        {loading && (
          <View style={[s.bubble, s.bubbleAi]}>
            <Text style={s.bubbleFrom}>companion</Text>
            <ActivityIndicator size="small" color={colors.gold} style={{ alignSelf: 'flex-start' }} />
          </View>
        )}

        {msgs.length > 0 && (
          <View style={s.quickRow}>
            {QUICK_TAPS.slice(0, 4).map(q => (
              <Pressable key={q.label} style={s.quickBtnSmall} onPress={() => send(q.msg)}>
                <Text style={s.quickBtnText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[s.inputArea, { paddingBottom: insets.bottom + 70 }]}>
        <VoiceInput
          value={input} onChange={setInput}
          onSubmit={() => send(input)}
          placeholder="Type or speak anything…"
          loading={loading}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  header:       { paddingHorizontal: spacing.screenPad, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: 4 },
  title:        { fontFamily: 'Syne-Bold', fontSize: 22, color: colors.cream, letterSpacing: -0.5 },
  sub:          { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted },
  chatScroll:   { flex: 1 },
  chatContent:  { padding: spacing.screenPad, gap: spacing.sm },
  quickGrid:    { gap: 8 },
  quickBtn:     { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingVertical: 9, paddingHorizontal: 16 },
  quickBtnSmall:{ backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingVertical: 7, paddingHorizontal: 13 },
  quickRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  quickBtnText: { fontFamily: 'Literata-Light', fontSize: 14, color: colors.text },
  bubble:       { maxWidth: '88%', padding: 12, borderRadius: radius.lg },
  bubbleUser:   { backgroundColor: colors.s2, borderWidth: 1.5, borderColor: colors.border, alignSelf: 'flex-end' },
  bubbleAi:     { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border2, alignSelf: 'flex-start' },
  bubbleFrom:   { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.goldDim, marginBottom: 5 },
  bubbleText:   { fontFamily: 'Literata-Light', fontSize: 14, color: colors.cream, lineHeight: 22 },
  inputArea:    { paddingHorizontal: spacing.screenPad, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
});
