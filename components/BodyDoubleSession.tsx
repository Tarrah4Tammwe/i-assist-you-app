// components/BodyDoubleSession.tsx
// Full body double session UI — setup, active presence, check-ins, wrap-up interrupt.
// Rendered inside CheckinScreen when mode === 'body-double'.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { useStore, CheckInInterval, PlanBlock } from '../lib/store';
import { useBodyDouble } from '../hooks/useBodyDouble';
import { VoiceInput } from './VoiceInput';
import { colors, spacing, radius } from '../constants/theme';

const API_BASE = 'https://i-assist-you.vercel.app';

type SessionPhase = 'setup' | 'active' | 'wrapup';

interface IntervalOption {
  value: CheckInInterval;
  label: string;
  sub?: string;
}

const INTERVAL_OPTIONS: IntervalOption[] = [
  { value: 5,  label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 25, label: '25 min', sub: 'Pomodoro' },
  { value: 45, label: '45 min' },
];

interface WrapUpData {
  message: string;
  eventName: string;
  minutesLeft: number;
}

interface BodyDoubleSessionProps {
  onEnd: () => void;
}

// ─── Prep step generation ─────────────────────────────────────────────────────
// Returns physical prep steps based on event type
function getPrepSteps(eventTitle: string): string[] {
  const t = eventTitle.toLowerCase();
  const isCall = /zoom|meet|teams|call|video|online|remote/.test(t);
  const isPhysical = /office|commute|drive|walk|gym|appointment|clinic|doctor/.test(t);

  if (isCall) return [
    'Save and close what you\'re working on',
    'Get water, use the bathroom',
    'Open the meeting link 2 min early',
  ];
  if (isPhysical) return [
    'Save and close what you\'re working on',
    'Check you have everything you need',
    'Give yourself time to get out the door',
  ];
  return [
    'Save and close what you\'re working on',
    'Get water, take a breath',
    'Clear your head before the next thing',
  ];
}

// ─── Presence bar ─────────────────────────────────────────────────────────────
function PresenceBar({
  startedAt,
  intervalMinutes,
  lastCheckInAt,
  wrapUp,
  onEnd,
}: {
  startedAt: number;
  intervalMinutes: number;
  lastCheckInAt: number;
  wrapUp: boolean;
  onEnd: () => void;
}) {
  const [display, setDisplay] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    const update = () => {
      const elapsedTotal = Math.floor((Date.now() - startedAt) / 60000);
      const elapsedSinceCheckIn = (Date.now() - lastCheckInAt) / 60000;
      const remaining = Math.max(0, Math.ceil(intervalMinutes - elapsedSinceCheckIn));
      setDisplay(`Here with you · ${elapsedTotal} min · check-in in ${remaining} min`);
    };
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [startedAt, intervalMinutes, lastCheckInAt]);

  return (
    <View style={[s.presenceBar, wrapUp && s.presenceBarWrapUp]}>
      <Animated.View style={[s.presenceDot, wrapUp && s.presenceDotWrapUp, { opacity: pulseAnim }]} />
      <Text style={[s.presenceText, wrapUp && s.presenceTextWrapUp]} numberOfLines={1}>
        {wrapUp ? 'Session pausing — you need to prep' : display}
      </Text>
      <Pressable style={[s.presenceEndBtn, wrapUp && s.presenceEndBtnWrapUp]} onPress={onEnd}>
        <Text style={[s.presenceEndText, wrapUp && s.presenceEndTextWrapUp]}>End</Text>
      </Pressable>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function BodyDoubleSession({ onEnd }: BodyDoubleSessionProps) {
  const { todayPlan, bodyDouble, startBodyDouble, updateBodyDoubleMessages, endBodyDouble } = useStore();

  const [phase, setPhase] = useState<SessionPhase>(bodyDouble?.active ? 'active' : 'setup');
  const [selectedInterval, setSelectedInterval] = useState<CheckInInterval>(25);
  const [taskInput, setTaskInput] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>(
    bodyDouble?.sessionMessages ?? []
  );
  const [msgInput, setMsgInput] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);
  const [wrapUpData, setWrapUpData] = useState<WrapUpData | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Find the next fixed block in today's plan
  const nextFixedBlock: PlanBlock | null = React.useMemo(() => {
    if (!todayPlan?.blocks) return null;
    const now = new Date();
    const upcoming = todayPlan.blocks.filter(b => {
      if (!b.fixed) return false;
      // Parse time and check it's in the future
      const match = b.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!match) return false;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      const blockDate = new Date();
      blockDate.setHours(h, m, 0, 0);
      return blockDate > now;
    });
    // Return the soonest
    return upcoming[0] ?? null;
  }, [todayPlan]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setMessages(prev => {
      const updated = [...prev, { role, content }];
      updateBodyDoubleMessages(updated);
      return updated;
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [updateBodyDoubleMessages]);

  // ─── Check-in callback (fired by hook) ─────────────────────────────────────
  const handleCheckIn = useCallback((message: string) => {
    addMessage('assistant', message);
  }, [addMessage]);

  // ─── Wrap-up callback (fired by hook) ──────────────────────────────────────
  const handleWrapUp = useCallback((message: string, eventName: string, minutesLeft: number) => {
    setWrapUpData({ message, eventName, minutesLeft: Math.round(minutesLeft) });
    addMessage('assistant', message);
    setPhase('wrapup');
  }, [addMessage]);

  useBodyDouble(handleCheckIn, handleWrapUp);

  // ─── Start session ──────────────────────────────────────────────────────────
  const startSession = async () => {
    if (!taskInput.trim()) return;
    setSetupLoading(true);
    const energy = todayPlan?.energy ?? 3;

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Can you body double me? I'm working on: "${taskInput.trim()}"`,
          }],
          system: `You are a body double companion for someone with AuDHD. Energy today: ${energy}/5.
Opening message rules:
- 2-3 sentences. Calm, present.
- Acknowledge what they're working on.
- Give one concrete micro-task to start RIGHT NOW (under 2 min).
- Tell them you'll check in every ${selectedInterval} minutes.
- No toxic positivity. No "you've got this".`,
          context: { energy, screen: 'body-double-start' },
        }),
      });
      const data = await res.json();
      const reply = data?.content ?? "I'm here. Let's get started.";

      startBodyDouble(taskInput.trim(), selectedInterval, nextFixedBlock);
      setMessages([{ role: 'assistant', content: reply }]);
      updateBodyDoubleMessages([{ role: 'assistant', content: reply }]);
      setPhase('active');
    } catch {
      startBodyDouble(taskInput.trim(), selectedInterval, nextFixedBlock);
      setMessages([{ role: 'assistant', content: "I'm here. Start with one small step." }]);
      setPhase('active');
    }
    setSetupLoading(false);
  };

  // ─── Mid-session message ────────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim() || msgLoading) return;
    setMsgInput('');
    addMessage('user', text);
    setMsgLoading(true);

    const energy = todayPlan?.energy ?? 3;
    // Condensed history — last 6 messages to keep context lean
    const history = [...messages, { role: 'user' as const, content: text }].slice(-6);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          system: `You are a body double companion for someone with AuDHD. Energy today: ${energy}/5. They are working on: "${bodyDouble?.taskDescription ?? taskInput}".
Mid-session rules:
- 1-3 sentences. Present. Calm.
- If they're stuck: one tiny action, nothing vague.
- If distracted: no shame, just redirect. "Phone down, back to the doc."
- If they finished something: "Good. Next: [one thing]."
- Never inflate praise. Never rush.`,
          context: { energy, screen: 'body-double-chat' },
        }),
      });
      const data = await res.json();
      addMessage('assistant', data?.content ?? "Still here.");
    } catch {
      addMessage('assistant', "Still here.");
    }
    setMsgLoading(false);
  };

  const handleEnd = () => {
    endBodyDouble();
    onEnd();
  };

  // ─── SETUP PHASE ────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <View style={s.setupWrap}>
        <View style={s.setupCard}>
          {/* Interval picker */}
          <Text style={s.setupLabel}>CHECK-IN INTERVAL</Text>
          <View style={s.intervalRow}>
            {INTERVAL_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                style={[s.intervalBtn, selectedInterval === opt.value && s.intervalBtnSel]}
                onPress={() => setSelectedInterval(opt.value)}
              >
                <Text style={[s.intervalBtnLabel, selectedInterval === opt.value && s.intervalBtnLabelSel]}>
                  {opt.label}
                </Text>
                {opt.sub && (
                  <Text style={[s.intervalBtnSub, selectedInterval === opt.value && s.intervalBtnSubSel]}>
                    {opt.sub}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>

          <View style={s.divider} />

          {/* Task input */}
          <Text style={s.setupLabel}>WHAT ARE YOU WORKING ON?</Text>
          <VoiceInput
            value={taskInput}
            onChange={setTaskInput}
            onSubmit={startSession}
            placeholder="Say or type it…"
            loading={setupLoading}
          />
        </View>

        {/* Calendar awareness — shown if a fixed block exists today */}
        {nextFixedBlock && (
          <View style={s.calAwarenessBar}>
            <Text style={s.calAwarenessIcon}>📅</Text>
            <Text style={s.calAwarenessText}>
              Next: <Text style={s.calAwarenessEvent}>{nextFixedBlock.title}</Text>
              {' '}at {nextFixedBlock.time} — I'll give you a heads up before you need to leave.
            </Text>
          </View>
        )}

        <Pressable
          style={[s.startBtn, (!taskInput.trim() || setupLoading) && s.startBtnDisabled]}
          onPress={startSession}
          disabled={!taskInput.trim() || setupLoading}
        >
          <Text style={s.startBtnText}>{setupLoading ? 'Starting…' : 'Start session'}</Text>
        </Pressable>
      </View>
    );
  }

  // ─── ACTIVE + WRAPUP PHASES ─────────────────────────────────────────────────
  return (
    <View style={s.activeWrap}>
      {/* Presence bar */}
      {bodyDouble && (
        <PresenceBar
          startedAt={bodyDouble.startedAt}
          intervalMinutes={bodyDouble.intervalMinutes}
          lastCheckInAt={bodyDouble.lastCheckInAt}
          wrapUp={phase === 'wrapup'}
          onEnd={handleEnd}
        />
      )}

      <ScrollView
        ref={scrollRef}
        style={s.chatScroll}
        contentContainerStyle={s.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Messages */}
        {messages.map((m, i) => (
          <View key={i} style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleAi]}>
            {m.role === 'assistant' && <Text style={s.bubbleFrom}>companion</Text>}
            <Text style={m.role === 'user' ? s.bubbleTextUser : s.bubbleTextAi}>{m.content}</Text>
          </View>
        ))}

        {msgLoading && (
          <View style={[s.bubble, s.bubbleAi]}>
            <Text style={s.bubbleFrom}>companion</Text>
            <Text style={s.bubbleTextAi}>…</Text>
          </View>
        )}

        {/* Wrap-up interrupt card */}
        {phase === 'wrapup' && wrapUpData && (
          <View style={s.wrapUpCard}>
            <View style={s.wrapUpEventRow}>
              <Text style={s.wrapUpEventName}>{wrapUpData.eventName}</Text>
              <Text style={s.wrapUpEventDetail}>{wrapUpData.minutesLeft} min away</Text>
            </View>

            {/* Prep steps */}
            <View style={s.prepSteps}>
              <Text style={s.prepStepsLabel}>BEFORE YOU GO</Text>
              {getPrepSteps(wrapUpData.eventName).map((step, i) => (
                <View key={i} style={s.prepStep}>
                  <Text style={s.prepStepNum}>{i + 1}</Text>
                  <Text style={s.prepStepText}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={s.wrapUpActions}>
              <Pressable style={s.wrapUpBtnPrimary} onPress={handleEnd}>
                <Text style={s.wrapUpBtnPrimaryText}>Close the session</Text>
              </Pressable>
              <Pressable
                style={s.wrapUpBtnSecondary}
                onPress={() => {
                  setPhase('active');
                  setWrapUpData(null);
                }}
              >
                <Text style={s.wrapUpBtnSecondaryText}>5 more min</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Quick chips — mid-session */}
        {phase === 'active' && messages.length > 0 && (
          <View style={s.chipsRow}>
            {['back on it', 'got distracted', 'need a break', 'change task'].map(chip => (
              <Pressable key={chip} style={s.chip} onPress={() => sendMessage(chip)}>
                <Text style={s.chipText}>{chip}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input */}
      {phase === 'active' && (
        <View style={s.inputArea}>
          <VoiceInput
            value={msgInput}
            onChange={setMsgInput}
            onSubmit={() => sendMessage(msgInput)}
            placeholder="Say anything…"
            loading={msgLoading}
          />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Setup
  setupWrap:        { flex: 1, gap: spacing.md },
  setupCard:        { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.cardPad, gap: spacing.md },
  setupLabel:       { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted2 },
  intervalRow:      { flexDirection: 'row', gap: 6 },
  intervalBtn:      { flex: 1, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  intervalBtnSel:   { borderColor: colors.gold, backgroundColor: colors.goldBg },
  intervalBtnLabel: { fontFamily: 'Syne-Medium', fontSize: 12, color: colors.muted, textAlign: 'center' },
  intervalBtnLabelSel: { color: colors.gold },
  intervalBtnSub:   { fontFamily: 'Syne-Regular', fontSize: 9, color: colors.muted2, marginTop: 1 },
  intervalBtnSubSel:{ color: colors.goldDim },
  divider:          { height: 1, backgroundColor: colors.border },
  startBtn:         { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  startBtnDisabled: { opacity: 0.35 },
  startBtnText:     { fontFamily: 'Syne-Bold', fontSize: 14, color: colors.bg },

  // Calendar awareness
  calAwarenessBar:   { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border2, borderRadius: radius.md, padding: 11 },
  calAwarenessIcon:  { fontSize: 14, marginTop: 1 },
  calAwarenessText:  { flex: 1, fontFamily: 'Literata-Light', fontSize: 12, color: colors.muted, lineHeight: 18 },
  calAwarenessEvent: { fontFamily: 'Syne-Medium', fontSize: 12, color: colors.cream },

  // Active session
  activeWrap:  { flex: 1 },
  presenceBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.goldBg, borderWidth: 1.5, borderColor: colors.goldDim, borderRadius: radius.lg, padding: 11, marginBottom: spacing.sm },
  presenceBarWrapUp: { backgroundColor: '#1a1210', borderColor: colors.red },
  presenceDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold, flexShrink: 0 },
  presenceDotWrapUp: { backgroundColor: colors.red },
  presenceText:{ flex: 1, fontFamily: 'Syne-Regular', fontSize: 11, color: colors.gold },
  presenceTextWrapUp: { color: colors.red },
  presenceEndBtn: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.goldDim, borderRadius: radius.sm, paddingVertical: 3, paddingHorizontal: 9 },
  presenceEndBtnWrapUp: { borderColor: colors.red },
  presenceEndText: { fontFamily: 'Syne-Regular', fontSize: 10, color: colors.goldDim },
  presenceEndTextWrapUp: { color: colors.red },

  // Chat
  chatScroll:  { flex: 1 },
  chatContent: { gap: spacing.sm, paddingBottom: spacing.lg },
  bubble:      { maxWidth: '88%', padding: 11, borderRadius: radius.lg, marginVertical: 2 },
  bubbleUser:  { backgroundColor: colors.s2, borderWidth: 1.5, borderColor: colors.border2, alignSelf: 'flex-end' },
  bubbleAi:    { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, alignSelf: 'flex-start' },
  bubbleFrom:  { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.goldDim, marginBottom: 4 },
  bubbleTextUser: { fontFamily: 'Literata-Light', fontSize: 14, color: colors.text, lineHeight: 22 },
  bubbleTextAi:   { fontFamily: 'Literata-Light', fontSize: 14, color: colors.cream, lineHeight: 22 },

  // Chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip:     { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingVertical: 5, paddingHorizontal: 11 },
  chipText: { fontFamily: 'Syne-Regular', fontSize: 11, color: colors.muted },

  // Input
  inputArea: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },

  // Wrap-up card
  wrapUpCard:           { backgroundColor: '#1a1210', borderWidth: 1.5, borderColor: colors.red, borderRadius: radius.lg, padding: spacing.cardPad, gap: spacing.sm, marginTop: spacing.sm },
  wrapUpEventRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wrapUpEventName:      { fontFamily: 'Syne-Bold', fontSize: 14, color: colors.cream },
  wrapUpEventDetail:    { fontFamily: 'Syne-Regular', fontSize: 11, color: colors.red },
  prepSteps:            { backgroundColor: colors.bg, borderRadius: radius.md, padding: 10, gap: 8 },
  prepStepsLabel:       { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted2, marginBottom: 2 },
  prepStep:             { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  prepStepNum:          { fontFamily: 'Syne-Bold', fontSize: 11, color: colors.blue, minWidth: 16 },
  prepStepText:         { flex: 1, fontFamily: 'Literata-Light', fontSize: 12, color: colors.muted, lineHeight: 18 },
  wrapUpActions:        { flexDirection: 'row', gap: 8 },
  wrapUpBtnPrimary:     { flex: 1, backgroundColor: colors.red, borderRadius: radius.md, paddingVertical: 11, alignItems: 'center' },
  wrapUpBtnPrimaryText: { fontFamily: 'Syne-Bold', fontSize: 12, color: colors.bg },
  wrapUpBtnSecondary:   { flex: 1, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: '#3a2018', borderRadius: radius.md, paddingVertical: 11, alignItems: 'center' },
  wrapUpBtnSecondaryText:{ fontFamily: 'Syne-Medium', fontSize: 12, color: colors.red },
});
