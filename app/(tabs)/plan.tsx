// ─── Plan Screen ─────────────────────────────────────────────────────────────
// Displays today's AI-generated day plan.
//
// Block rules:
//   fixed=true  → appointment/meeting — locked to its time, cannot be moved
//   fixed=false → task/break/food/transition — user can reorder via up/down arrows
//
// Drag-to-reorder removed (was: react-native-draggable-flatlist — Gradle incompatible
// with SDK 54 / RN 0.76). Replaced with simple up/down controls using only
// ScrollView + Pressable — zero new native dependencies.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, PlanBlock } from '../../lib/store';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../constants/theme';
import { TaskExecutor } from '../../components/TaskExecutor';
import { AppHeader } from '../../components/AppHeader';

// ─── Energy emoji map ──────────────────────────────────────────────────────────

const ENERGY_EMOJI: Record<number, string> = {
  1: '🪫', 2: '😶', 3: '🌤', 4: '⚡', 5: '🔥',
};

// ─── Block with local key ─────────────────────────────────────────────────────

interface KeyedBlock extends PlanBlock {
  key: string;
}

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type, fixed }: { type: PlanBlock['type']; fixed?: boolean }) {
  if (fixed) {
    return (
      <View style={[badge.pill, { backgroundColor: colors.goldBg, borderColor: colors.goldDim, borderWidth: 1 }]}>
        <Text style={[badge.text, { color: colors.gold }]}>🔒 fixed</Text>
      </View>
    );
  }
  const map: Record<string, { bg: string; color: string; label: string }> = {
    break:      { bg: colors.greenBg,   color: colors.green, label: 'break'      },
    food:       { bg: '#1a1008',        color: '#c4945a',    label: 'food'       },
    transition: { bg: colors.blueBg,   color: colors.blue,  label: 'transition' },
  };
  const style = map[type];
  if (!style) return null;
  return (
    <View style={[badge.pill, { backgroundColor: style.bg }]}>
      <Text style={[badge.text, { color: style.color }]}>{style.label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  text: {
    fontFamily: 'Syne-Medium',
    fontSize: 9,
    letterSpacing: 0.3,
  },
});

// ─── Single plan block card ───────────────────────────────────────────────────

interface BlockCardProps {
  block: KeyedBlock;
  index: number;
  total: number;
  isDone: boolean;
  isExecutorOpen: boolean;
  energy: number;
  userId?: string;
  onToggleDone: () => void;
  onToggleExecutor: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function BlockCard({
  block, index, total, isDone, isExecutorOpen, energy, userId,
  onToggleDone, onToggleExecutor, onMoveUp, onMoveDown,
}: BlockCardProps) {
  const timeLabel = block.duration
    ? `${block.time} · ${block.duration} min`
    : block.time;

  const canMoveUp   = !block.fixed && index > 0;
  const canMoveDown = !block.fixed && index < total - 1;

  return (
    <View style={[
      s.block,
      isDone && s.blockDone,
      isExecutorOpen && !block.fixed && s.blockActive,
      block.fixed && s.blockFixed,
    ]}>

      {/* Reorder controls — only on moveable blocks */}
      {!block.fixed && (
        <View style={s.reorderCol}>
          <Pressable
            style={[s.reorderBtn, !canMoveUp && s.reorderBtnDisabled]}
            onPress={canMoveUp ? onMoveUp : undefined}
            accessibilityLabel="Move block up"
          >
            <Text style={[s.reorderIcon, !canMoveUp && s.reorderIconDisabled]}>▲</Text>
          </Pressable>
          <Pressable
            style={[s.reorderBtn, !canMoveDown && s.reorderBtnDisabled]}
            onPress={canMoveDown ? onMoveDown : undefined}
            accessibilityLabel="Move block down"
          >
            <Text style={[s.reorderIcon, !canMoveDown && s.reorderIconDisabled]}>▼</Text>
          </Pressable>
        </View>
      )}

      {/* Fixed block left accent */}
      {block.fixed && (
        <View style={s.fixedIndicator} />
      )}

      <View style={s.blockContent}>
        {/* Header row */}
        <View style={s.blockTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.blockTime}>{timeLabel}</Text>
            <Text style={s.blockTitle}>{block.title}</Text>
            {block.note ? <Text style={s.blockNote}>{block.note}</Text> : null}
          </View>
          <TypeBadge type={block.type} fixed={block.fixed} />
        </View>

        {/* Actions */}
        <View style={s.blockActions}>
          <Pressable style={[s.actionBtn, isDone && s.actionBtnActive]} onPress={onToggleDone}>
            <Text style={[s.actionBtnText, isDone && s.actionBtnTextActive]}>
              {isDone ? '↩ Undo' : '✓ Done'}
            </Text>
          </Pressable>

          {/* ⚡ Do this on all non-fixed blocks — including breaks/food */}
          {!block.fixed && (
            <Pressable
              style={[s.actionBtn, isExecutorOpen && s.actionBtnActive]}
              onPress={onToggleExecutor}
            >
              <Text style={[s.actionBtnText, isExecutorOpen && s.actionBtnTextActive]}>
                ⚡ Do this
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Inline executor */}
      {isExecutorOpen && !block.fixed && (
        <TaskExecutor
          taskTitle={block.title}
          taskNote={block.note}
          energy={energy}
          userId={userId}
        />
      )}
    </View>
  );
}

// ─── No plan gate ─────────────────────────────────────────────────────────────

function NoPlanGate() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[gate.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.navHeight }]}>
      <Text style={gate.icon}>🌅</Text>
      <Text style={gate.title}>Start your morning first</Text>
      <Text style={gate.sub}>I need your energy and today's context to help properly.</Text>
      <Pressable style={gate.btn} onPress={() => router.push('/(tabs)/morning')}>
        <Text style={gate.btnText}>Go to morning →</Text>
      </Pressable>
    </View>
  );
}

const gate = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPad,
    gap: spacing.md,
  },
  icon: { fontSize: 40 },
  title: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: colors.cream,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  sub: {
    fontFamily: 'Literata-Light',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 28,
    marginTop: spacing.sm,
  },
  btnText: {
    fontFamily: 'Syne-Bold',
    fontSize: 14,
    color: colors.bg,
    letterSpacing: 0.2,
  },
});

// ─── Persist done state to Supabase ──────────────────────────────────────────

async function persistDoneState(
  planId: string,
  userId: string,
  doneKeys: string[],
  blocks: KeyedBlock[],
) {
  const updatedBlocks = blocks.map(b => ({
    ...b,
    done: doneKeys.includes(b.key),
  }));
  await supabase
    .from('plans')
    .update({ blocks: updatedBlocks })
    .eq('id', planId)
    .eq('user_id', userId);
}

// ─── Move block helper ────────────────────────────────────────────────────────
// Swaps item at `from` with item at `to`, respecting fixed block positions.

function moveBlock(blocks: KeyedBlock[], from: number, to: number): KeyedBlock[] {
  // Don't move past a fixed block
  if (blocks[to]?.fixed) return blocks;
  const next = [...blocks];
  const temp = next[from];
  next[from] = next[to];
  next[to] = temp;
  return next;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ energy?: string; name?: string; blocks?: string }>();
  const { todayPlan } = useStore();
  const { user } = useSupabaseUser();

  const energy  = todayPlan?.energy ?? parseInt(params.energy ?? '3', 10);
  const name    = todayPlan?.name   ?? params.name ?? '';
  const planId  = todayPlan?.id;

  const rawBlocks: PlanBlock[] = useMemo(() =>
    todayPlan?.blocks ?? (params.blocks ? JSON.parse(params.blocks) : []),
    [todayPlan, params.blocks],
  );

  const hasPlan = rawBlocks.length > 0;

  const [blocks, setBlocks] = useState<KeyedBlock[]>(() =>
    rawBlocks.map((b, i) => ({ ...b, key: `block-${i}` }))
  );

  const prevRawRef = useRef(rawBlocks);
  useEffect(() => {
    if (rawBlocks !== prevRawRef.current && rawBlocks.length > 0) {
      setBlocks(rawBlocks.map((b, i) => ({ ...b, key: `block-${i}` })));
      setDone(new Set());
      setOpenExec(null);
      prevRawRef.current = rawBlocks;
    }
  }, [rawBlocks]);

  const [done, setDone] = useState<Set<string>>(() => {
    const doneSaved = rawBlocks
      .map((b: any, i) => (b.done ? `block-${i}` : null))
      .filter(Boolean) as string[];
    return new Set(doneSaved);
  });
  const [openExec, setOpenExec] = useState<string | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = blocks.length > 0 ? Math.round((done.size / blocks.length) * 100) : 0;

  const toggleDone = (key: string) => {
    setDone(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      if (planId && user?.id) {
        if (persistTimer.current) clearTimeout(persistTimer.current);
        persistTimer.current = setTimeout(() => {
          persistDoneState(planId, user.id, [...next], blocks);
        }, 1500);
      }
      return next;
    });
  };

  const toggleExec = (key: string) => {
    setOpenExec(prev => prev === key ? null : key);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const to = direction === 'up' ? index - 1 : index + 1;
    const next = moveBlock(blocks, index, to);
    setBlocks(next);
    if (planId && user?.id) {
      supabase
        .from('plans')
        .update({ blocks: next })
        .eq('id', planId)
        .eq('user_id', user.id);
    }
  };

  if (!hasPlan) return <NoPlanGate />;

  return (
    <View style={[s.container, { paddingTop: 0 }]}>
      <AppHeader />

      {/* ── Plan sub-header: name + progress + energy tag ── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>{name ? `${name}'s day` : 'Your day'}</Text>
          <Text style={s.sub}>{done.size} of {blocks.length} done</Text>
        </View>
        <View style={s.energyTag}>
          <Text style={s.energyTagText}>
            {ENERGY_EMOJI[energy] ?? '🌤'} {energy}/5
          </Text>
        </View>
      </View>

      {/* ── Progress bar ── */}
      <View style={s.progressWrap}>
        <View style={[s.progressFill, { width: `${progress}%` as any }]} />
      </View>

      {/* ── Hint ── */}
      <Text style={s.dragHint}>▲▼ to reorder · I rescheduled fixed blocks</Text>

      {/* ── Plan blocks ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.listContent,
          { paddingBottom: insets.bottom + spacing.navHeight + spacing.xl },
        ]}
      >
        {blocks.map((block, index) => (
          <View key={block.key} style={index > 0 ? { marginTop: spacing.md } : undefined}>
            <BlockCard
              block={block}
              index={index}
              total={blocks.length}
              isDone={done.has(block.key)}
              isExecutorOpen={openExec === block.key}
              energy={energy}
              userId={user?.id}
              onToggleDone={() => toggleDone(block.key)}
              onToggleExecutor={() => toggleExec(block.key)}
              onMoveUp={() => handleMove(index, 'up')}
              onMoveDown={() => handleMove(index, 'down')}
            />
          </View>
        ))}

        <Pressable style={s.checkinBtn} onPress={() => router.push('/(tabs)/checkin')}>
          <Text style={s.checkinBtnText}>Need a check-in? →</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.screenPad,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: 'Syne-Bold',
    fontSize: 22,
    color: colors.cream,
    letterSpacing: -0.5,
  },
  sub: {
    fontFamily: 'Syne-Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 3,
  },
  energyTag: {
    backgroundColor: colors.goldBg,
    borderWidth: 1,
    borderColor: colors.goldDim,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  energyTagText: {
    fontFamily: 'Syne-Medium',
    fontSize: 12,
    color: colors.gold,
  },

  progressWrap: {
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.screenPad,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 2,
  },

  dragHint: {
    fontFamily: 'Syne-Regular',
    fontSize: 10,
    color: colors.muted2,
    textAlign: 'center',
    letterSpacing: 0.3,
    paddingVertical: spacing.sm,
  },

  listContent: {
    paddingHorizontal: spacing.screenPad,
    paddingTop: spacing.xs,
  },

  // Block card
  block: {
    backgroundColor: colors.s1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  blockDone: {
    opacity: 0.38,
  },
  blockActive: {
    borderColor: colors.gold,
    backgroundColor: colors.goldBg,
  },
  blockFixed: {
    borderColor: colors.goldDim,
  },

  reorderCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.s2,
    gap: 2,
    paddingVertical: 8,
  },
  reorderBtn: {
    padding: 6,
    borderRadius: 4,
  },
  reorderBtnDisabled: {
    opacity: 0,
  },
  reorderIcon: {
    fontSize: 10,
    color: colors.muted,
  },
  reorderIconDisabled: {
    color: colors.muted2,
  },

  fixedIndicator: {
    width: 3,
    backgroundColor: colors.goldDim,
  },

  blockContent: {
    flex: 1,
    padding: spacing.md,
  },

  blockTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  blockTime: {
    fontFamily: 'Syne-Regular',
    fontSize: 10,
    color: colors.goldDim,
    letterSpacing: 0.5,
    fontWeight: '500',
    marginBottom: 2,
  },
  blockTitle: {
    fontFamily: 'Syne-Medium',
    fontSize: 14,
    color: colors.cream,
    lineHeight: 20,
  },
  blockNote: {
    fontFamily: 'Literata-Light',
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
    marginTop: 4,
  },

  blockActions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionBtn: {
    backgroundColor: colors.s2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionBtnActive: {
    borderColor: colors.gold,
    backgroundColor: colors.goldBg,
  },
  actionBtnText: {
    fontFamily: 'Syne-Medium',
    fontSize: 12,
    color: colors.text,
  },
  actionBtnTextActive: {
    color: colors.gold,
  },

  checkinBtn: {
    backgroundColor: colors.s1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  checkinBtnText: {
    fontFamily: 'Syne-Medium',
    fontSize: 13,
    color: colors.text,
  },
});

