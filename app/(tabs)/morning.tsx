// ─── Morning Screen ───────────────────────────────────────────────────────────
// Flow:
//   1. Energy picker + voice brain-dump
//   2. POST to /api/build-plan → returns blocks (some may have fixed:true)
//   3. For each fixed appointment, show inline follow-up form (sequential)
//   4. Hybrid confirmation: "I rescheduled X. Does this work?"
//   5. Navigate to /(tabs)/plan

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
import { Picker } from '@react-native-picker/picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';
import { useStore, PlanBlock } from '../../lib/store';
import { colors, spacing, radius } from '../../constants/theme';

const API_BASE = 'https://i-assist-you.vercel.app';

const ENERGY_OPTS = [
  { v: 1, emoji: '🪫', label: 'empty' },
  { v: 2, emoji: '😶', label: 'low'   },
  { v: 3, emoji: '🌤', label: 'okay'  },
  { v: 4, emoji: '⚡', label: 'good'  },
  { v: 5, emoji: '🔥', label: 'fired' },
];

const ENERGY_CONTEXT: Record<number, string> = {
  1: "That's okay. We'll make today very small.",
  2: "We'll keep it light. You just need one thing to count.",
  3: "A moderate day. One main win = success.",
  4: "Good energy. We can fit in some real work.",
  5: "Let's use it while you have it.",
};

const DURATION_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour',     value: 60 },
  { label: '1.5 hours',  value: 90 },
  { label: '2 hours',    value: 120 },
  { label: '2.5 hours',  value: 150 },
  { label: '3 hours',    value: 180 },
];

interface AppointmentDetails {
  blockIndex: number;
  address: string;
  userLocation: string;
  travelMinutes: number | null;
  travelSummary: string;
  trafficNote: string;
  duration: number;
  getReadyMinutes: number;
  recoveryMinutes: number;
  loadingTravel: boolean;
}

interface RescheduledInfo {
  originalTitle: string;
  originalTime: string;
  newTime: string;
}

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
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = 'en-GB'; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e: any) => onResult(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec; rec.start(); setListening(true);
  };
  return { listening, supported, toggle };
}

function DotPulse() {
  const anims = [useRef(new Animated.Value(0.2)).current, useRef(new Animated.Value(0.2)).current, useRef(new Animated.Value(0.2)).current];
  useEffect(() => {
    const makeLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.2, duration: 400, useNativeDriver: true }),
      ]));
    const loops = anims.map((a, i) => makeLoop(a, i * 180));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold, opacity: a }} />
      ))}
    </View>
  );
}

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

function minutesToTimeStr(totalMins: number): string {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  const meridiem = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${meridiem}`;
}

function buildEnrichedPlan(blocks: PlanBlock[], details: AppointmentDetails) {
  const apptBlock = blocks[details.blockIndex];
  const apptStartMins = parseTimeToMinutes(apptBlock.time);
  const travelMins = details.travelMinutes ?? 20;
  const parkingBuffer = 10;
  const leaveAtMins    = apptStartMins - travelMins - parkingBuffer;
  const getReadyAtMins = leaveAtMins - details.getReadyMinutes;
  const apptEndMins    = apptStartMins + details.duration;
  const recoveryEnd    = apptEndMins + details.recoveryMinutes;

  const autoBlocks: PlanBlock[] = [
    { time: minutesToTimeStr(getReadyAtMins), title: 'Get ready', note: `Shower, get dressed, eat if hungry. Leave by ${minutesToTimeStr(leaveAtMins)}.`, type: 'break', duration: details.getReadyMinutes, isAutoPlaced: true },
    { time: minutesToTimeStr(leaveAtMins), title: `Travel to ${apptBlock.title.replace(/appointment|meeting/i, '').trim() || 'appointment'}`, note: `${travelMins} min drive${details.travelSummary ? ' ' + details.travelSummary : ''}. ${details.trafficNote}.`, type: 'transition', duration: travelMins + parkingBuffer, isAutoPlaced: true },
    { ...apptBlock, note: apptBlock.note || '', duration: details.duration, appointmentAddress: details.address, travelMinutes: travelMins },
    { time: minutesToTimeStr(apptEndMins), title: 'Recovery break', note: 'Appointments are draining. Sit quietly, drink water.', type: 'break', duration: details.recoveryMinutes, isAutoPlaced: true },
  ];

  const blockedStart = getReadyAtMins;
  const blockedEnd   = recoveryEnd;
  const rescheduled: RescheduledInfo[] = [];
  const flexibleBlocks = blocks.filter((b, i) => i !== details.blockIndex && !b.fixed && !b.isAutoPlaced);
  const fixedOtherBlocks = blocks.filter((b, i) => i !== details.blockIndex && b.fixed);

  let nextAvailableMins = recoveryEnd;
  const resolvedFlexible = flexibleBlocks.map(b => {
    const bTime = parseTimeToMinutes(b.time);
    const bEnd  = bTime + (b.duration ?? 60);
    const conflicts = bTime < blockedEnd && bEnd > blockedStart;
    if (conflicts) {
      const oldTime = b.time;
      const newTime = minutesToTimeStr(nextAvailableMins);
      nextAvailableMins += (b.duration ?? 60) + 15;
      rescheduled.push({ originalTitle: b.title, originalTime: oldTime, newTime });
      return { ...b, time: newTime };
    }
    return b;
  });

  const allBlocks = [...autoBlocks, ...fixedOtherBlocks, ...resolvedFlexible];
  allBlocks.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  return { enriched: allBlocks, rescheduled };
}

type Phase = 'input' | 'building' | 'appointment_detail' | 'confirming';

export default function MorningScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ presetEnergy?: string }>();
  const { user } = useSupabaseUser();
  const { setTodayPlan } = useStore();

  const [phase, setPhase] = useState<Phase>('input');
  const [energy, setEnergy] = useState<number | null>(params.presetEnergy ? parseInt(params.presetEnergy, 10) : null);
  const [tasks, setTasks]   = useState('');
  const [error, setError]   = useState<string | null>(null);

  const { listening, supported, toggle } = useSpeech(t => setTasks(prev => prev ? `${prev} ${t}` : t));

  const [blocks, setBlocks]         = useState<PlanBlock[]>([]);
  const [planMeta, setPlanMeta]     = useState<{ id?: string; name: string }>({ name: '' });
  const [fixedQueue, setFixedQueue] = useState<number[]>([]);
  const [currentAppt, setCurrentAppt] = useState<AppointmentDetails | null>(null);
  const [rescheduledItems, setRescheduledItems] = useState<RescheduledInfo[]>([]);
  const [enrichedBlocks, setEnrichedBlocks]     = useState<PlanBlock[]>([]);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const energyFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (energy) {
      energyFade.setValue(0);
      Animated.timing(energyFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [energy]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning.' : hour < 17 ? 'Good afternoon.' : 'Good evening.';

  const buildDay = async () => {
    if (!energy || !tasks.trim()) return;
    setPhase('building'); setError(null);
    try {
      const name   = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? '';
      const userId = user?.id ?? 'anonymous';
      const res    = await fetch(`${API_BASE}/api/build-plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, name, energy, tasks }) });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const rawBlocks: PlanBlock[] = data?.data?.blocks ?? [];
      if (!rawBlocks.length) throw new Error('empty');
      setBlocks(rawBlocks);
      setPlanMeta({ id: data?.data?.id, name: name || 'there' });
      const fixedIdx = rawBlocks.map((b, i) => b.fixed ? i : -1).filter(i => i !== -1);
      if (fixedIdx.length > 0) {
        setFixedQueue(fixedIdx);
        openApptForm(fixedIdx[0]);
      } else {
        finalise(rawBlocks, name || 'there', data?.data?.id);
      }
    } catch {
      setError('Something went wrong building your plan. Try again?'); setPhase('input');
    }
  };

  const openApptForm = (idx: number) => {
    setCurrentAppt({ blockIndex: idx, address: '', userLocation: '', travelMinutes: null, travelSummary: '', trafficNote: '', duration: 45, getReadyMinutes: 30, recoveryMinutes: 30, loadingTravel: false });
    setPhase('appointment_detail');
  };

  const fetchTravel = async () => {
    if (!currentAppt?.address || !currentAppt?.userLocation) return;
    setCurrentAppt(p => p ? { ...p, loadingTravel: true } : p);
    try {
      const res  = await fetch(`${API_BASE}/api/travel-time`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origin: currentAppt.userLocation, destination: currentAppt.address }) });
      const data = await res.json();
      if (data.success) setCurrentAppt(p => p ? { ...p, travelMinutes: data.minutes, travelSummary: data.summary, trafficNote: data.trafficNote, loadingTravel: false } : p);
      else setCurrentAppt(p => p ? { ...p, loadingTravel: false } : p);
    } catch { setCurrentAppt(p => p ? { ...p, loadingTravel: false } : p); }
  };

  const confirmAppt = () => {
    if (!currentAppt) return;
    const { enriched, rescheduled } = buildEnrichedPlan(blocks, currentAppt);
    setBlocks(enriched);
    const remaining = fixedQueue.filter(i => i !== currentAppt.blockIndex);
    setFixedQueue(remaining);
    if (remaining.length > 0) {
      openApptForm(remaining[0]);
    } else {
      setEnrichedBlocks(enriched); setRescheduledItems(rescheduled); setPhase('confirming');
    }
  };

  const skipAppt = () => {
    if (!currentAppt) return;
    const remaining = fixedQueue.filter(i => i !== currentAppt.blockIndex);
    setFixedQueue(remaining);
    if (remaining.length > 0) openApptForm(remaining[0]);
    else finalise(blocks, planMeta.name, planMeta.id);
  };

  const acceptPlan = () => finalise(enrichedBlocks, planMeta.name, planMeta.id);

  const goBackToAdjust = () => {
    const fixedIdx = enrichedBlocks.map((b, i) => b.fixed ? i : -1).filter(i => i !== -1);
    if (fixedIdx.length > 0) { setBlocks(enrichedBlocks); openApptForm(fixedIdx[fixedIdx.length - 1]); }
  };

  const finalise = async (finalBlocks: PlanBlock[], name: string, planId?: string) => {
    const today = new Date().toISOString().split('T')[0];
    setTodayPlan({ id: planId, energy: energy!, tasks, name, blocks: finalBlocks, date: today });
    if (user?.id) await supabase.from('energy_log').upsert({ user_id: user.id, date: today, energy }, { onConflict: 'user_id,date' });
    router.push({ pathname: '/(tabs)/plan', params: { energy: String(energy), name, blocks: JSON.stringify(finalBlocks) } });
  };

  const apptBlock = currentAppt ? blocks[currentAppt.blockIndex] : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 90 + spacing.lg }]}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {phase === 'input' && (
            <View style={{ gap: spacing.gap }}>
              <View style={s.header}>
                <Text style={s.greeting}>{greeting}</Text>
                <Text style={s.sub}>Let's build a day that actually works for your brain.</Text>
              </View>
              <View style={s.section}>
                <Text style={s.label}>Energy right now</Text>
                <View style={s.energyRow}>
                  {ENERGY_OPTS.map(opt => (
                    <Pressable key={opt.v} style={[s.eBtn, energy === opt.v && s.eBtnSel]} onPress={() => setEnergy(opt.v)}>
                      <Text style={s.eEmoji}>{opt.emoji}</Text>
                      <Text style={[s.eLabel, energy === opt.v && s.eLabelSel]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
                {energy && <Animated.Text style={[s.energyCtx, { opacity: energyFade }]}>{ENERGY_CONTEXT[energy]}</Animated.Text>}
              </View>
              <View style={s.section}>
                <Text style={s.label}>What's on today?</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[s.textarea, listening && s.textareaListening]}
                    multiline placeholder="Brain dump everything — meetings, errands, appointments with times…"
                    placeholderTextColor={colors.muted2} value={tasks} onChangeText={setTasks} textAlignVertical="top"
                  />
                  {supported && (
                    <Pressable style={[s.micBtn, listening && s.micBtnListening]} onPress={toggle}>
                      <Text style={{ fontSize: 15 }}>{listening ? '⏹' : '🎙'}</Text>
                    </Pressable>
                  )}
                </View>
                {listening && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.red }} /><Text style={{ fontFamily: 'Syne-Regular', fontSize: 11, color: colors.red }}>listening…</Text></View>}
                <Text style={s.hint}>If you have appointments, include the time — e.g. "doctor's at 11:15"</Text>
              </View>
              {error && <View style={s.errorCard}><Text style={s.errorText}>{error}</Text></View>}
              <Pressable style={[s.buildBtn, (!energy || !tasks.trim()) && s.buildBtnDisabled]} onPress={buildDay} disabled={!energy || !tasks.trim()}>
                <Text style={s.buildBtnText}>Build my day →</Text>
              </Pressable>
            </View>
          )}

          {phase === 'building' && (
            <View style={s.thinkingCard}><DotPulse /><Text style={s.thinkingText}>Thinking through your day…</Text></View>
          )}

          {phase === 'appointment_detail' && currentAppt && apptBlock && (
            <View style={{ gap: spacing.gap }}>
              <View style={s.header}>
                <Text style={s.greeting}>One thing first.</Text>
                <Text style={s.sub}>
                  {fixedQueue.length > 1
                    ? `I found ${fixedQueue.length} appointments that need a bit more info.`
                    : "I found an appointment. Help me build around it properly."}
                </Text>
              </View>
              <View style={af.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={af.cardTime}>{apptBlock.time}</Text>
                  <View style={af.warnBadge}><Text style={af.warnBadgeText}>needs details</Text></View>
                </View>
                <Text style={af.cardTitle}>{apptBlock.title}</Text>
                <Text style={af.cardNote}>Help me schedule around this properly.</Text>
                <View style={af.divider} />

                <Text style={s.label}>Where is it?</Text>
                <TextInput style={af.input} placeholder="Address or clinic/office name" placeholderTextColor={colors.muted2}
                  value={currentAppt.address} onChangeText={v => setCurrentAppt(p => p ? { ...p, address: v } : p)}
                  onBlur={() => { if (currentAppt.address && currentAppt.userLocation) fetchTravel(); }} />

                <Text style={s.label}>Your starting location</Text>
                <TextInput style={af.input} placeholder="Home address / Work / Current location" placeholderTextColor={colors.muted2}
                  value={currentAppt.userLocation} onChangeText={v => setCurrentAppt(p => p ? { ...p, userLocation: v } : p)}
                  onBlur={() => { if (currentAppt.address && currentAppt.userLocation) fetchTravel(); }} />

                {currentAppt.loadingTravel && <View style={af.infoBox}><ActivityIndicator size="small" color={colors.gold} /><Text style={af.infoBoxText}> Getting travel time…</Text></View>}
                {!currentAppt.loadingTravel && currentAppt.travelMinutes !== null && (
                  <View style={af.infoBox}>
                    <Text style={af.infoStrong}>Travel time: {currentAppt.travelMinutes} minutes</Text>
                    {currentAppt.travelSummary ? <Text style={af.infoBoxText}>{currentAppt.travelSummary} · {currentAppt.trafficNote}</Text> : null}
                  </View>
                )}

                <Text style={s.label}>How long is the appointment?</Text>
                <View style={af.pickerWrap}>
                  <Picker selectedValue={currentAppt.duration} onValueChange={v => setCurrentAppt(p => p ? { ...p, duration: v } : p)} style={{ color: colors.cream }} dropdownIconColor={colors.muted}>
                    {DURATION_OPTIONS.map(o => <Picker.Item key={o.value} label={o.label} value={o.value} color={colors.cream} />)}
                  </Picker>
                </View>

                <Text style={s.label}>Time to get ready? <Text style={{ color: colors.gold }}>{currentAppt.getReadyMinutes} min</Text></Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {[10, 20, 30, 45, 60].map(n => (
                    <Pressable key={n} style={[af.pill, currentAppt.getReadyMinutes === n && af.pillActive]} onPress={() => setCurrentAppt(p => p ? { ...p, getReadyMinutes: n } : p)}>
                      <Text style={[af.pillText, currentAppt.getReadyMinutes === n && af.pillTextActive]}>{n} min</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={s.label}>Recovery time after? <Text style={{ color: colors.gold }}>{currentAppt.recoveryMinutes} min</Text></Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {[15, 30, 45, 60].map(n => (
                    <Pressable key={n} style={[af.pill, currentAppt.recoveryMinutes === n && af.pillActive]} onPress={() => setCurrentAppt(p => p ? { ...p, recoveryMinutes: n } : p)}>
                      <Text style={[af.pillText, currentAppt.recoveryMinutes === n && af.pillTextActive]}>{n} min</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <Pressable style={af.btnSec} onPress={skipAppt}><Text style={af.btnSecText}>Skip</Text></Pressable>
                  <Pressable style={af.btnPri} onPress={confirmAppt}><Text style={af.btnPriText}>Show me the plan</Text></Pressable>
                </View>
              </View>
            </View>
          )}

          {phase === 'confirming' && (
            <View style={{ gap: spacing.gap }}>
              <View style={s.header}>
                <Text style={s.greeting}>Here's what I suggest.</Text>
                <Text style={s.sub}>I've adjusted your day around the appointment.</Text>
              </View>
              <View style={cf.card}>
                <Text style={cf.title}>
                  {rescheduledItems.length === 0
                    ? 'Plan updated'
                    : rescheduledItems.length === 1
                      ? `I rescheduled "${rescheduledItems[0].originalTitle}"`
                      : `I rescheduled ${rescheduledItems.length} tasks`}
                </Text>
                {rescheduledItems.length === 0
                  ? <Text style={cf.body}>I've added your prep, travel, and recovery blocks. Everything else stays in place.</Text>
                  : rescheduledItems.map((r, i) => (
                      <Text key={i} style={cf.body}>
                        "{r.originalTitle}" was at {r.originalTime} — moved to {r.newTime} to fit around your appointment.
                      </Text>
                    ))
                }
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {rescheduledItems.length > 0 && <Pressable style={af.btnSec} onPress={goBackToAdjust}><Text style={af.btnSecText}>Change it</Text></Pressable>}
                  <Pressable style={[af.btnPri, { flex: 1 }]} onPress={acceptPlan}><Text style={af.btnPriText}>Looks good →</Text></Pressable>
                </View>
              </View>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:      { paddingHorizontal: spacing.screenPad, flexGrow: 1 },
  header:      { gap: 6, paddingBottom: spacing.xs },
  greeting:    { fontFamily: 'Syne-Bold', fontSize: 26, color: colors.cream, letterSpacing: -0.5 },
  sub:         { fontFamily: 'Literata-Light', fontSize: 14, color: colors.muted, lineHeight: 21 },
  section:     { gap: 8 },
  label:       { fontFamily: 'Syne-Regular', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted, marginTop: 4 },
  energyRow:   { flexDirection: 'row', gap: 6 },
  eBtn:        { flex: 1, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.s1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, gap: 3 },
  eBtnSel:     { borderColor: colors.gold, backgroundColor: colors.goldBg },
  eEmoji:      { fontSize: 18 },
  eLabel:      { fontFamily: 'Syne-Regular', fontSize: 9, color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  eLabelSel:   { color: colors.gold },
  energyCtx:   { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 13, color: colors.muted, lineHeight: 19, paddingTop: 2 },
  textarea:    { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, color: colors.text, fontFamily: 'Literata-Light', fontSize: 15, lineHeight: 24, paddingTop: 13, paddingBottom: 13, paddingLeft: 15, paddingRight: 52, minHeight: 140 },
  textareaListening: { borderColor: colors.red },
  micBtn:      { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.s2, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  micBtnListening: { borderColor: colors.red, backgroundColor: '#1e1008' },
  hint:        { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 12, color: colors.muted2, lineHeight: 18 },
  errorCard:   { backgroundColor: '#1e0e0a', borderWidth: 1, borderColor: colors.red, borderRadius: radius.md, padding: spacing.md },
  errorText:   { fontFamily: 'Literata-Light', fontSize: 13, color: colors.red, lineHeight: 20 },
  thinkingCard:{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  thinkingText:{ fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 13, color: colors.muted },
  buildBtn:    { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.xs },
  buildBtnDisabled: { opacity: 0.35 },
  buildBtnText:{ fontFamily: 'Syne-Bold', fontSize: 15, color: colors.bg, letterSpacing: 0.2 },
});

const af = StyleSheet.create({
  card:         { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.red, borderRadius: radius.lg, padding: spacing.md, gap: 12 },
  cardTime:     { fontFamily: 'Syne-Regular', fontSize: 10, color: colors.goldDim, letterSpacing: 0.5 },
  warnBadge:    { backgroundColor: '#1e1008', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  warnBadgeText:{ fontFamily: 'Syne-Medium', fontSize: 9, color: colors.red },
  cardTitle:    { fontFamily: 'Syne-Bold', fontSize: 16, color: colors.cream },
  cardNote:     { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted, lineHeight: 20 },
  divider:      { height: 1, backgroundColor: colors.border },
  input:        { backgroundColor: colors.s2, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 11, color: colors.cream, fontFamily: 'Literata-Light', fontSize: 14 },
  infoBox:      { backgroundColor: colors.s2, borderLeftWidth: 3, borderLeftColor: colors.gold, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoStrong:   { fontFamily: 'Syne-Medium', fontSize: 13, color: colors.gold },
  infoBoxText:  { fontFamily: 'Literata-Light', fontSize: 12, color: colors.text },
  pickerWrap:   { backgroundColor: colors.s2, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  pill:         { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.s2 },
  pillActive:   { borderColor: colors.gold, backgroundColor: colors.goldBg },
  pillText:     { fontFamily: 'Syne-Medium', fontSize: 12, color: colors.muted },
  pillTextActive:{ color: colors.gold },
  btnPri:       { flex: 1, backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  btnPriText:   { fontFamily: 'Syne-Bold', fontSize: 14, color: colors.bg },
  btnSec:       { flex: 1, backgroundColor: colors.s2, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  btnSecText:   { fontFamily: 'Syne-Medium', fontSize: 14, color: colors.text },
});

const cf = StyleSheet.create({
  card:  { backgroundColor: colors.greenBg, borderWidth: 1.5, borderColor: colors.green, borderRadius: radius.lg, padding: spacing.md, gap: 10 },
  title: { fontFamily: 'Syne-Bold', fontSize: 16, color: colors.green },
  body:  { fontFamily: 'Literata-Light', fontSize: 14, color: colors.text, lineHeight: 22 },
});
