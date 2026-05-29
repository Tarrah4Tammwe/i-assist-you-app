// app/(tabs)/dump.tsx
// Dump Space — frictionless capture, auto-tag, filter, AI sort.
// Persisted to Supabase. Falls back to local state if not logged in.

import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';
import { useSpeech } from '../../hooks/useSpeech';

const API_BASE = 'https://i-assist-you.vercel.app';

type DumpType = 'idea' | 'list' | 'thought' | 'task';

interface DumpEntry { id: string; text: string; type: DumpType; created_at: string; }

const TYPE_META: Record<DumpType, { label: string; color: string; bg: string }> = {
  idea:    { label: '💡 Idea',    color: '#c4945a', bg: '#1a1008'       },
  list:    { label: '📋 List',    color: colors.blue, bg: colors.blueBg  },
  thought: { label: '🌀 Thought', color: colors.muted, bg: colors.s2    },
  task:    { label: '✅ Task',    color: colors.green, bg: colors.greenBg},
};

function autoTag(text: string): DumpType {
  const t = text.toLowerCase();
  if (/^[-•*]|\n[-•*]/.test(text) || t.includes('list of') || text.split(',').length > 2) return 'list';
  if (/\b(should|need to|have to|must|don't forget|remember to|todo)\b/.test(t)) return 'task';
  if (/\b(idea|what if|imagine|could|maybe|concept|app|build|create|feature)\b/.test(t)) return 'idea';
  return 'thought';
}

function fmtTime(iso: string) {
  const d = new Date(iso), now = new Date(), diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function DumpScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useSupabaseUser();
  const [text, setText]     = useState('');
  const [dumps, setDumps]   = useState<DumpEntry[]>([]);
  const [filter, setFilter] = useState<DumpType | 'all'>('all');
  const [sorting, setSorting]     = useState(false);
  const [sorted, setSorted]       = useState<{ title: string; items: string[] }[] | null>(null);
  const [sortLoading, setSortLoading] = useState(false);

  const { listening, supported, toggle } = useSpeech(t =>
    setText(prev => prev ? `${prev} ${t}` : t)
  );

  // Load from Supabase on mount
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('dumps').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setDumps(data as DumpEntry[]); });
  }, [user?.id]);

  const add = async () => {
    if (!text.trim()) return;
    const entry: DumpEntry = { id: Date.now().toString(), text: text.trim(), type: autoTag(text.trim()), created_at: new Date().toISOString() };
    setDumps(prev => [entry, ...prev]);
    setText(''); setSorted(null);
    if (user?.id) {
      await supabase.from('dumps').insert({ user_id: user.id, text: entry.text, type: entry.type });
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

  const visible = filter === 'all' ? dumps : dumps.filter(d => d.type === filter);
  const FILTERS: { id: DumpType | 'all'; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'idea', label: '💡 Ideas' },
    { id: 'task', label: '✅ Tasks' }, { id: 'list', label: '📋 Lists' }, { id: 'thought', label: '🌀 Thoughts' },
  ];

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 90 }]}
      showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Dump space</Text>
      <Text style={s.sub}>Capture it. Don't lose it. Do nothing with it yet.</Text>

      {/* Capture box */}
      <View style={s.captureBox}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <TextInput
            style={s.captureInput} multiline placeholder="What's in your head right now…"
            placeholderTextColor={colors.muted2} value={text} onChangeText={setText}
            onSubmitEditing={add} blurOnSubmit={false}
          />
          <View style={{ gap: 6 }}>
            {supported && (
              <Pressable style={[s.micBtn, listening && s.micBtnListening]} onPress={toggle}>
                <Text style={{ fontSize: 16 }}>{listening ? '⏹' : '🎙'}</Text>
              </Pressable>
            )}
            <Pressable style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]} onPress={add} disabled={!text.trim()}>
              <Text style={s.sendBtnText}>↑</Text>
            </Pressable>
          </View>
        </View>
        {listening && <Text style={s.listeningText}>● listening…</Text>}
      </View>

      {dumps.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {FILTERS.map(f => (
                <Pressable key={f.id} style={[s.filterPill, filter === f.id && s.filterPillActive]}
                  onPress={() => { setFilter(f.id as any); setSorting(false); setSorted(null); }}>
                  <Text style={[s.filterText, filter === f.id && s.filterTextActive]}>{f.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={s.sortBtn} onPress={sorting ? () => { setSorting(false); setSorted(null); } : sortOut}>
              {sortLoading ? <ActivityIndicator size="small" color={colors.muted} /> : <Text style={s.sortBtnText}>{sorting ? '✕ Unsort' : '✦ Sort this out'}</Text>}
            </Pressable>
          </View>

          {sorting && sorted && sorted.map((group, i) => (
            <View key={i}>
              <Text style={s.groupTitle}>{group.title}</Text>
              {group.items.map((item, j) => (
                <View key={j} style={[s.dumpItem, { marginBottom: 8 }]}>
                  <Text style={s.dumpText}>{item}</Text>
                </View>
              ))}
            </View>
          ))}

          {sorting && sortLoading && <Text style={s.thinkingText}>Grouping your thoughts…</Text>}

          {!sorting && (
            <View style={{ gap: 8 }}>
              {visible.length === 0
                ? <Text style={s.emptyText}>No {filter} entries yet.</Text>
                : visible.map(d => {
                    const meta = TYPE_META[d.type];
                    return (
                      <View key={d.id} style={s.dumpItem}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                          <Text style={[s.dumpText, { flex: 1 }]}>{d.text}</Text>
                          <Pressable onPress={() => del(d.id)}><Text style={{ color: colors.muted2, fontSize: 13 }}>✕</Text></Pressable>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                          <Text style={s.dumpTime}>{fmtTime(d.created_at)}</Text>
                          <View style={{ backgroundColor: meta.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 }}>
                            <Text style={{ fontFamily: 'Syne-Medium', fontSize: 9, color: meta.color }}>{meta.label}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
              }
            </View>
          )}
        </>
      )}

      {dumps.length === 0 && (
        <Text style={s.emptyText}>Nothing here yet.{'\n'}Tap the mic or type. No title needed. Just dump it.</Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:       { paddingHorizontal: spacing.screenPad, gap: spacing.gap },
  title:        { fontFamily: 'Syne-Bold', fontSize: 22, color: colors.cream, letterSpacing: -0.5 },
  sub:          { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted, lineHeight: 20 },
  captureBox:   { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: 8 },
  captureInput: { flex: 1, backgroundColor: colors.s2, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 11, color: colors.cream, fontFamily: 'Literata-Light', fontSize: 14, minHeight: 52 },
  micBtn:       { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.s2, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  micBtnListening: { borderColor: colors.red, backgroundColor: '#1e1008' },
  sendBtn:      { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.3 },
  sendBtnText:  { fontFamily: 'Syne-Bold', fontSize: 18, color: colors.bg },
  listeningText:{ fontFamily: 'Syne-Regular', fontSize: 11, color: colors.red, letterSpacing: 0.5 },
  filterPill:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.s1 },
  filterPillActive: { borderColor: colors.goldDim },
  filterText:   { fontFamily: 'Syne-Regular', fontSize: 11, color: colors.muted },
  filterTextActive: { color: colors.gold },
  sortBtn:      { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 7 },
  sortBtnText:  { fontFamily: 'Syne-Medium', fontSize: 12, color: colors.muted },
  groupTitle:   { fontFamily: 'Syne-Regular', fontSize: 11, color: colors.goldDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, marginTop: 8 },
  dumpItem:     { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 12 },
  dumpText:     { fontFamily: 'Literata-Light', fontSize: 14, color: colors.cream, lineHeight: 22 },
  dumpTime:     { fontFamily: 'Syne-Regular', fontSize: 10, color: colors.muted2, letterSpacing: 0.3 },
  emptyText:    { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 22, paddingVertical: 24 },
  thinkingText: { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 13, color: colors.muted },
});
