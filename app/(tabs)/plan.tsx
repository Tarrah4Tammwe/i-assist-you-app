// ─── Plan Screen ─────────────────────────────────────────────────────────────
// Displays today's AI-generated day plan.
//
// Block rules:
//   fixed=true  → appointment/meeting — locked to its time, cannot be moved
//   fixed=false → task/break/food/transition — user can reorder freely
//
// Drag to reorder: uses react-native-draggable-flatlist

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useStore, PlanBlock } from '../../lib/store';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../constants/theme';
import { TaskExecutor } from '../../components/TaskExecutor';

// ─── Energy emoji map ──────────────────────────────────────────────────────────

const ENERGY_EMOJI: Record<number, string> = {
  1: '🪫', 2: '😶', 3: '🌤', 4: '⚡', 5: '🔥',
};

// ─── Block with local key for DraggableFlatList ────────────────────────────────

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
  isDone: boolean;
  isExecutorOpen: boolean;
  energy: number;
  userId?: string;
  onToggleDone: () => void;
  onToggleExecutor: () => void;
  drag: () => void;
  isActive: boolean;
}

function BlockCard({
  block, isDone, isExecutorOpen, energy, userId,
  onToggleDone, onToggleExecutor, drag, isActive,
}: BlockCardProps) {
  const timeLabel = block.duration
    ? `${block.time} · ${block.duration} min`
    : block.time;

  return (
    <View style={[
      s.block,
      isDone && s.blockDone,
      isExecutorOpen && !block.fixed && s.blockActive,
      block.fixed && s.blockFixed,
      isActive && s.blockDragging,
    ]}>
      {/* Drag handle — only on moveable blocks */}
      {!block.fixed && (
        <Pressable
          onLongPress={drag}
          delayLongPress={150}
          style={s.dragHandle}
          accessibilityLabel="Hold to drag"
        >
          <Text style={s.dragIcon}>⠿</Text>
        </Pressable>
      )}

      {/* Fixed block — no drag handle, slightly wider content */}
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

          {/* ⚡ Do this on all blocks — including breaks/food */}
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
// Fire-and-forget — we don't block the UI on this.

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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ energy?: string; name?: string; blocks?: string }>();
  const { todayPlan } = useStore();
  const { user } = useSupabaseUser();

  // Resolve plan data — prefer Zustand, fall back to route params
  const energy  = todayPlan?.energy ?? parseInt(params.energy ?? '3', 10);
  const name    = todayPlan?.name   ?? params.name ?? '';
  const planId  = todayPlan?.id;

  const rawBlocks: PlanBlock[] = useMemo(() =>
    todayPlan?.blocks ?? (params.blocks ? JSON.parse(params.blocks) : []),
    [todayPlan, params.blocks],
  );

  // No plan at all — show gate
  const hasPlan = rawBlocks.length > 0;

  // Keyed blocks for DraggableFlatList
  const [blocks, setBlocks] = useState<KeyedBlock[]>(() =>
    rawBlocks.map((b, i) => ({ ...b, key: `block-${i}` }))
  );

  // Re-sync blocks if plan changes (e.g. user rebuilt morning)
  const prevRawRef = useRef(rawBlocks);
  useEffect(() => {
    if (rawBlocks !== prevRawRef.current && rawBlocks.length > 0) {
      setBlocks(rawBlocks.map((b, i) => ({ ...b, key: `block-${i}` })));
      setDone(new Set());
      setOpenExec(null);
      prevRawRef.current = rawBlocks;
    }
  }, [rawBlocks]);

  const [done, setDone]         = useState<Set<string>>(() => {
    // Re-hydrate done state from blocks if they came from Supabase with done:true
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

      // Persist with debounce — don't hammer Supabase on every tap
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

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<KeyedBlock>) => (
    <ScaleDecorator activeScale={1.02}>
      <BlockCard
        block={item}
        isDone={done.has(item.key)}
        isExecutorOpen={openExec === item.key}
        energy={energy}
        userId={user?.id}
        onToggleDone={() => toggleDone(item.key)}
        onToggleExecutor={() => toggleExec(item.key)}
        drag={item.fixed ? () => {} : drag}
        isActive={isActive}
      />
    </ScaleDecorator>
  ), [done, openExec, energy, user]);

  // Fixed blocks stay in place — only reorder moveable blocks
  const onDragEnd = useCallback(({ data }: { data: KeyedBlock[] }) => {
    const fixedPositions = blocks.reduce<Record<number, KeyedBlock>>((acc, b, i) => {
      if (b.fixed) acc[i] = b;
      return acc;
    }, {});

    const movedFlexible = data.filter(b => !b.fixed);
    let flexIdx = 0;
    const merged = blocks.map((_, i) => {
      if (fixedPositions[i]) return fixedPositions[i];
      return movedFlexible[flexIdx++];
    });
    setBlocks(merged);

    // Persist reordered blocks
    if (planId && user?.id) {
      supabase
        .from('plans')
        .update({ blocks: merged })
        .eq('id', planId)
        .eq('user_id', user.id);
    }
  }, [blocks, planId, user]);

  if (!hasPlan) return <NoPlanGate />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[s.container, { paddingTop: insets.top }]}>

        {/* ── Header ── */}
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

        {/* ── Drag hint ── */}
        <Text style={s.dragHint}>Hold to reorder · I rescheduled fixed blocks — don't touch those</Text>

        {/* ── Plan blocks ── */}
        <DraggableFlatList
          data={blocks}
          onDragEnd={onDragEnd}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          contentContainerStyle={[
            s.listContent,
            { paddingBottom: insets.bottom + spacing.navHeight + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <Pressable style={s.checkinBtn} onPress={() => router.push('/(tabs)/checkin')}>
              <Text style={s.checkinBtnText}>Need a check-in? →</Text>
            </Pressable>
          }
        />
      </View>
    </GestureHandlerRootView>
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
  blockDragging: {
    borderColor: colors.gold,
    backgroundColor: colors.s2,
  },

  dragHandle: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.s2,
  },
  dragIcon: {
    fontSize: 14,
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
