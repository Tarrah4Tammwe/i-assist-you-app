// app/(tabs)/dump.tsx
// Dump Space — frictionless capture, coloured cards, per-type actions,
// pattern detection, AI sort. Full executive assistant layer.

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { colors, spacing, radius, dumpTypeColors } from '../../constants/theme';
import { useSpeech } from '../../hooks/useSpeech';
import { AppHeader } from '../../components/AppHeader';

const API_BASE = 'https://i-assist-you.vercel.app';

type DumpType = 'idea' | 'list' | 'thought' | 'task';

interface DumpEntry {
  id: string;
  text: string;
  type: DumpType;
  created_at: string;
}

interface PatternFlag {
  message: string;
  type: DumpType;
  count: number;
}

// ─── Auto-tag ─────────────────────────────────────────────────────────────────
function autoTag(text: string): DumpType {
  const t = text.toLowerCase();
  if (/^[-•*]|\n[-•*]/.test(text) || t.includes('list of') || text.split(',').length > 3) return 'list';
  if (/\b(should|need to|have to|must|don't forget|remember to|todo|reminder)\b/.test(t)) return 'task';
  if (/\b(idea|what if|imagine|could|maybe|concept|app|build|create|feature|what about)\b/.test(t)) return 'idea';
  return 'thought';
}

function fmtTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Pattern detection — runs client-side, no API needed ─────────────────────
function detectPatterns(dumps: DumpEntry[]): PatternFlag | null {
  if (dumps.length < 3) return null;

  // Count by type in last 24h
  const recent = dumps.filter(d => Date.now() - new Date(d.created_at).getTime() < 86400000);
  const counts: Record<DumpType, number> = { idea: 0, list: 0, thought: 0, task: 0 };
  recent.forEach(d => counts[d.type]++);

  // Check for repeated thought themes (overstimulation, overwhelm, anxiety keywords)
  const stressWords = /\b(overwhelm|anxious|stress|overstimulat|can't cope|too much|shutdown|exhausted|dread)\b/i;
  const stressThoughts = dumps.filter(d => d.type === 'thought' && stressWords.test(d.text));
  if (stressThoughts.length >= 2) {
    return {
      message: `You've logged ${stressThoughts.length} thoughts about feeling overwhelmed recently. Not flagging it as a problem — just so you can see it.`,
      type: 'thought',
      count: stressThoughts.length,
    };
  }

  // Tasks accumulating without action
  const taskDumps = dumps.filter(d => d.type === 'task');
  if (taskDumps.length >= 4) {
    return {
      message: `${taskDumps.length} things tagged as tasks. Want to work through any of them?`,
      type: 'task',
      count: taskDumps.length,
    };
  }

  // Ideas building up
  if (counts.idea >= 3) {
    return {
      message: `${counts.idea} ideas today. Might be worth developing one before they blur together.`,
      type: 'idea',
      count: counts.idea,
    };
  }

  return null;
}

// ─── Action definitions per type ──────────────────────────────────────────────
function getActions(type: DumpType, entry: DumpEntry, handlers: {
  doNow: (text: string) => void;
  breakDown: (text: string) => void;
  addToPlan: (text: string) => void;
  develop: (text: string) => void;
  makeChecklist: (text: string) => void;
  talkThrough: (entry: DumpEntry) => void;
  exportText: (text: string) => void;
  scheduleIt: () => void;
}) {
  switch (type) {
    case 'idea': return [
      { label: 'Develop this', icon: '◈', onPress: () => handlers.develop(entry.text) },
      { label: 'Add to plan',  icon: '＋', onPress: () => handlers.addToPlan(entry.text) },
      { label: 'Export',       icon: '↗',  onPress: () => handlers.exportText(entry.text) },
    ];
    case 'task': return [
      { label: 'Do it now',    icon: '⚡', onPress: () => handlers.doNow(entry.text) },
      { label: 'Schedule it',  icon: '◷',  onPress: handlers.scheduleIt },
      { label: 'Break it down',icon: '⤵',  onPress: () => handlers.breakDown(entry.text) },
    ];
    case 'list': return [
      { label: 'Make checklist', icon: '☐', onPress: () => handlers.makeChecklist(entry.text) },
      { label: 'Export',         icon: '↗', onPress: () => handlers.exportText(entry.text) },
    ];
    case 'thought': return [
      { label: 'Talk it through', icon: '◉', onPress: () => handlers.talkThrough(entry) },
      { label: 'Check-in',        icon: '♥', onPress: () => handlers.talkThrough(entry) },
    ];
    default: return [];
  }
}

// ─── DumpCard component ───────────────────────────────────────────────────────
function DumpCard({ entry, onDelete, onAction }: {
  entry: DumpEntry;
  onDelete: (id: string) => void;
  onAction: (action: string, entry: DumpEntry) => void;
}) {
  const meta = dumpTypeColors[entry.type];
  const actions = getActions(entry.type, entry, {
    doNow:         (text) => onAction('doNow', { ...entry, text }),
    breakDown:     (text) => onAction('breakDown', { ...entry, text }),
    addToPlan:     (text) => onAction('addToPlan', { ...entry, text }),
    develop:       (text) => onAction('develop', { ...entry, text }),
    makeChecklist: (text) => onAction('makeChecklist', { ...entry, text }),
    talkThrough:   (e)    => onAction('talkThrough', e),
    exportText:    (text) => onAction('export', { ...entry, text }),
    scheduleIt:    ()     => onAction('schedule', entry),
  });

  return (
    <View style={[s.card, { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <View style={s.cardTop}>
        <Text style={[s.cardText, { color: meta.color }]}>{entry.text}</Text>
        <Pressable onPress={() => onDelete(entry.id)} hitSlop={8}>
          <Text style={[s.delBtn, { color: meta.tagFg, opacity: 0.45 }]}>✕</Text>
        </Pressable>
      </View>
      <View style={s.cardMeta}>
        <Text style={[s.cardTime, { color: meta.timeFg }]}>{fmtTime(entry.created_at)}</Text>
        <View style={[s.tag, { backgroundColor: meta.tagBg }]}>
          <Text style={[s.tagText, { color: meta.tagFg }]}>{meta.label}</Text>
        </View>
      </View>
      <View style={[s.actionsRow, { borderTopColor: meta.border }]}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            style={[s.actionBtn, { backgroundColor: meta.tagBg, borderColor: meta.border }]}
            onPress={a.onPress}
          >
            <Text style={[s.actionIcon, { color: meta.tagFg }]}>{a.icon}</Text>
            <Text style={[s.actionText, { color: meta.tagFg }]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Pattern flag banner ──────────────────────────────────────────────────────
function PatternBanner({ flag }: { flag: PatternFlag }) {
  const meta = dumpTypeColors[flag.type];
  return (
    <View style={[s.patternBanner, { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <Text style={[s.patternIcon, { color: meta.tagFg }]}>◎</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.patternLabel, { color: meta.tagFg }]}>I NOTICED</Text>
        <Text style={[s.patternText, { color: meta.color }]}>{flag.message}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function DumpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useSupabaseUser();
  const { todayPlan, setTodayPlan } = useStore();

  const [text, setText]             = useState('');
  const [dumps, setDumps]           = useState<DumpEntry[]>([]);
  const [filter, setFilter]         = useState<DumpType | 'all'>('all');
  const [sorting, setSorting]       = useState(false);
  const [sorted, setSorted]         = useState<{ title: string; items: string[] }[] | null>(null);
  const [sortLoading, setSortLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // entry id
  const [actionResult, setActionResult]   = useState<{ id: string; content: string; type: string } | null>(null);

  const { listening, supported, toggle } = useSpeech(t =>
    setText(prev => prev ? `${prev} ${t}` : t)
  );

  // Load from Supabase
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('dumps')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setDumps(data as DumpEntry[]); });
  }, [user?.id]);

  const add = async () => {
    if (!text.trim()) return;
    const entry: DumpEntry = {
      id: Date.now().toString(),
      text: text.trim(),
      type: autoTag(text.trim()),
      created_at: new Date().toISOString(),
    };
    setDumps(prev => [entry, ...prev]);
    setText('');
    setSorted(null);
    if (user?.id) {
      const { data } = await supabase
        .from('dumps')
        .insert({ user_id: user.id, text: entry.text, type: entry.type })
        .select('id')
        .single();
      // Update local entry with real Supabase id
      if (data?.id) {
        setDumps(prev => prev.map(d => d.id === entry.id ? { ...d, id: data.id } : d));
      }
    }
  };

  const del = async (id: string) => {
    setDumps(prev => prev.filter(d => d.id !== id));
    if (user?.id) await supabase.from('dumps').delete().eq('id', id).eq('user_id', user.id);
  };

  const sortOut = async () => {
    if (dumps.length === 0) return;
    setSortLoading(true); setSorting(true); setSorted(null);
    try {
      const res = await fetch(`${API_BASE}/api/dump-sort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: dumps.map(d => d.text) }),
      });
      const data = await res.json();
      if (data.success) setSorted(data.groups);
    } catch { setSorting(false); }
    setSortLoading(false);
  };

  // ─── Action handlers ────────────────────────────────────────────────────────
  const handleAction = useCallback(async (action: string, entry: DumpEntry) => {
    const energy = todayPlan?.energy ?? 3;

    if (action === 'export') {
      // Copy to clipboard via Alert (expo-clipboard not in deps but we can show it)
      Alert.alert('Export', entry.text, [{ text: 'Close' }]);
      return;
    }

    if (action === 'schedule') {
      Alert.alert('Schedule it', 'Calendar integration coming soon. For now, add it to today\'s plan.', [{ text: 'OK' }]);
      return;
    }

    if (action === 'talkThrough') {
      // Navigate to Check-in with this thought pre-loaded as context
      router.push({ pathname: '/(tabs)/checkin', params: { dumpText: entry.text, dumpType: entry.type } });
      return;
    }

    if (action === 'makeChecklist') {
      // Parse comma/newline separated items into a simple list display
      const items = entry.text
        .split(/,|\n|•|-/)
        .map(i => i.trim())
        .filter(Boolean);
      setActionResult({ id: entry.id, type: 'checklist', content: items.join('\n') });
      return;
    }

    if (action === 'addToPlan') {
      if (!todayPlan) {
        Alert.alert('No plan yet', 'Build your morning plan first, then I can add things to it.');
        return;
      }
      const newBlock = {
        time: 'Added',
        title: entry.text.slice(0, 60),
        note: 'Added from dump space',
        type: 'task' as const,
      };
      setTodayPlan({ ...todayPlan, blocks: [...todayPlan.blocks, newBlock] });
      Alert.alert('Added to plan', 'Check your Plan tab.');
      return;
    }

    // AI-powered actions: doNow (routes to Do tab), develop, breakDown
    if (action === 'doNow') {
      router.push({ pathname: '/(tabs)/do', params: { prefill: entry.text, mode: 'structure' } });
      return;
    }

    // develop and breakDown → call API
    setActionLoading(entry.id);
    try {
      const mode = action === 'develop' ? 'develop' : 'structure';
      const res = await fetch(`${API_BASE}/api/execute-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, input: entry.text, energy, taskTitle: entry.text }),
      });
      const data = await res.json();
      setActionResult({ id: entry.id, type: mode, content: data.content ?? '' });
    } catch {
      setActionResult({ id: entry.id, type: 'error', content: 'Something went wrong. Try again.' });
    }
    setActionLoading(null);
  }, [todayPlan, router, setTodayPlan]);

  const pattern = detectPatterns(dumps);
  const visible = filter === 'all' ? dumps : dumps.filter(d => d.type === filter);

  const FILTERS: { id: DumpType | 'all'; label: string }[] = [
    { id: 'all',     label: 'All'      },
    { id: 'idea',    label: 'Ideas'    },
    { id: 'task',    label: 'Tasks'    },
    { id: 'list',    label: 'Lists'    },
    { id: 'thought', label: 'Thoughts' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={[s.scroll, {
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + 90,
        }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Dump space</Text>
      <Text style={s.sub}>Capture it. Don't lose it. Do nothing with it yet.</Text>

      {/* Pattern flag — shown if detected */}
      {pattern && <PatternBanner flag={pattern} />}

      {/* Capture box */}
      <View style={s.captureBox}>
        <View style={s.captureRow}>
          <TextInput
            style={s.captureInput}
            multiline
            placeholder="What's in your head right now…"
            placeholderTextColor={colors.muted2}
            value={text}
            onChangeText={setText}
            blurOnSubmit={false}
          />
          <View style={s.captureButtons}>
            {supported && (
              <Pressable style={[s.micBtn, listening && s.micBtnActive]} onPress={toggle}>
                <Text style={s.micIcon}>{listening ? '⏹' : '🎙'}</Text>
              </Pressable>
            )}
            <Pressable style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]} onPress={add} disabled={!text.trim()}>
              <Text style={s.sendBtnText}>↑</Text>
            </Pressable>
          </View>
        </View>
        {listening && <Text style={s.listeningLabel}>● listening…</Text>}
      </View>

      {dumps.length > 0 && (
        <>
          {/* Filter + sort row */}
          <View style={s.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={s.filters}>
                {FILTERS.map(f => (
                  <Pressable
                    key={f.id}
                    style={[s.filterPill, filter === f.id && s.filterPillActive]}
                    onPress={() => { setFilter(f.id as any); setSorting(false); setSorted(null); }}
                  >
                    <Text style={[s.filterText, filter === f.id && s.filterTextActive]}>{f.label}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Pressable
              style={s.sortBtn}
              onPress={sorting ? () => { setSorting(false); setSorted(null); } : sortOut}
            >
              {sortLoading
                ? <ActivityIndicator size="small" color={colors.muted} />
                : <Text style={s.sortBtnText}>{sorting ? '✕ Unsort' : '✦ Sort this out'}</Text>
              }
            </Pressable>
          </View>

          {/* Sorted view */}
          {sorting && sortLoading && (
            <Text style={s.thinkingText}>Grouping your thoughts…</Text>
          )}
          {sorting && sorted && sorted.map((group, i) => (
            <View key={i} style={{ gap: 6 }}>
              <Text style={s.groupTitle}>{group.title}</Text>
              {group.items.map((item, j) => {
                const orig = dumps.find(d => d.text === item);
                const meta = dumpTypeColors[orig?.type ?? 'thought'];
                return (
                  <View key={j} style={[s.card, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                    <Text style={[s.cardText, { color: meta.color }]}>{item}</Text>
                    {orig && (
                      <View style={s.cardMeta}>
                        <Text style={[s.cardTime, { color: meta.timeFg }]}>{fmtTime(orig.created_at)}</Text>
                        <View style={[s.tag, { backgroundColor: meta.tagBg }]}>
                          <Text style={[s.tagText, { color: meta.tagFg }]}>{meta.label}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}

          {/* Normal list */}
          {!sorting && (
            <View style={{ gap: 8 }}>
              {visible.length === 0
                ? <Text style={s.emptyText}>No {filter} entries yet.</Text>
                : visible.map(d => (
                  <View key={d.id}>
                    <DumpCard
                      entry={d}
                      onDelete={del}
                      onAction={handleAction}
                    />
                    {/* Inline action result for this card */}
                    {actionLoading === d.id && (
                      <View style={s.resultBox}>
                        <ActivityIndicator size="small" color={colors.gold} />
                        <Text style={s.thinkingText}> On it…</Text>
                      </View>
                    )}
                    {actionResult?.id === d.id && (
                      <View style={s.resultBox}>
                        {actionResult.type === 'checklist' && (
                          actionResult.content.split('\n').map((item, i) => (
                            <Text key={i} style={s.resultItem}>☐  {item}</Text>
                          ))
                        )}
                        {actionResult.type === 'develop' && (
                          <Text style={s.resultText}>{actionResult.content}</Text>
                        )}
                        {actionResult.type === 'structure' && (
                          actionResult.content.split('\n').filter(Boolean).map((step, i) => (
                            <Text key={i} style={s.resultItem}>{i + 1}.  {step.replace(/^\d+\.\s*/, '')}</Text>
                          ))
                        )}
                        {actionResult.type === 'error' && (
                          <Text style={s.resultError}>{actionResult.content}</Text>
                        )}
                        <Pressable onPress={() => setActionResult(null)} style={{ marginTop: 8 }}>
                          <Text style={s.dismissText}>Dismiss</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ))
              }
            </View>
          )}
        </>
      )}

      {dumps.length === 0 && (
        <Text style={s.emptyText}>
          {'Nothing here yet.\nTap the mic or type. No title needed. Just dump it.'}
        </Text>
      )}
    </ScrollView>
    </ScrollView>
    </View>
  );
}
