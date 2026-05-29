// ─── TaskExecutor ─────────────────────────────────────────────────────────────
// Inline panel that slides open beneath a plan block.
// Three modes: research / decide / structure — each is a real API call.
// Sits inside the Plan screen; only one executor open at a time.

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, radius, spacing } from '../constants/theme';
import { VoiceTextarea } from './VoiceTextarea';

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'research' | 'decide' | 'structure';

type Result =
  | { kind: 'text'; data: string }
  | { kind: 'decide'; verdict: string; reason: string }
  | { kind: 'steps'; steps: string[] };

interface Props {
  taskTitle: string;
  taskNote?: string;
  energy: number;
  userId?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const MODES: { id: Mode; icon: string; label: string }[] = [
  { id: 'research',  icon: '🔍', label: 'Research it' },
  { id: 'decide',    icon: '⚖️',  label: 'Decide'      },
  { id: 'structure', icon: '🧠', label: 'Structure'   },
];

const PLACEHOLDERS: Record<Mode, string> = {
  research:  'What do you need to know?',
  decide:    "What are you stuck deciding? List options if you have them.",
  structure: "Brain-dump everything. Don't organise — just get it out.",
};

const BTN_LABELS: Record<Mode, string> = {
  research:  'Find out',
  decide:    'Make the call',
  structure: 'Structure this',
};

const THINKING_TEXT: Record<Mode, string> = {
  research:  'Researching…',
  decide:    'Weighing it up…',
  structure: 'Structuring…',
};

const API_BASE = 'https://i-assist-you.vercel.app';

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskExecutor({ taskTitle, taskNote, energy, userId }: Props) {
  const [mode, setMode] = useState<Mode>('research');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/execute-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          input,
          context: { taskTitle, taskNote, energy, userId },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'API error');

      const d = json.data;
      if (d.type === 'decide' && d.data?.verdict) {
        setResult({ kind: 'decide', verdict: d.data.verdict, reason: d.data.reason });
      } else if (d.type === 'steps' && Array.isArray(d.data)) {
        setResult({ kind: 'steps', steps: d.data });
      } else {
        setResult({ kind: 'text', data: d.data ?? JSON.stringify(d) });
      }
    } catch {
      setError('Something went wrong. Try again.');
    }
    setLoading(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setResult(null);
    setInput('');
    setError(null);
  };

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={s.panel}>

      {/* Mode tabs */}
      <View style={s.tabs}>
        {MODES.map((m, i) => (
          <Pressable
            key={m.id}
            style={[s.tab, i < MODES.length - 1 && s.tabBorder, mode === m.id && s.tabActive]}
            onPress={() => switchMode(m.id)}
          >
            <Text style={s.tabIcon}>{m.icon}</Text>
            <Text style={[s.tabLabel, mode === m.id && s.tabLabelActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Body */}
      <View style={s.body}>
        <VoiceTextarea rows={3} placeholder={PLACEHOLDERS[mode]} value={input} onChange={setInput} />

        <Pressable
          style={[s.runBtn, (!input.trim() || loading) && s.runBtnDisabled]}
          onPress={run}
          disabled={!input.trim() || loading}
        >
          {loading
            ? <ActivityIndicator size="small" color={colors.bg} />
            : <Text style={s.runBtnText}>{BTN_LABELS[mode]}</Text>
          }
        </Pressable>

        {loading && (
          <Text style={s.thinkingText}>{THINKING_TEXT[mode]}</Text>
        )}

        {error && <Text style={s.errorText}>{error}</Text>}

        {/* Text result */}
        {result?.kind === 'text' && (
          <View>
            <ScrollView style={s.textResult} nestedScrollEnabled>
              <Text style={s.textResultContent}>{result.data}</Text>
            </ScrollView>
            <Pressable style={s.copyBtn} onPress={() => copy((result as any).data)}>
              <Text style={s.copyBtnText}>{copied ? 'Copied ✓' : 'Copy'}</Text>
            </Pressable>
          </View>
        )}

        {/* Decision result */}
        {result?.kind === 'decide' && (
          <View style={s.decideCard}>
            <Text style={s.decideVerdict}>→ {result.verdict}</Text>
            <Text style={s.decideReason}>{result.reason}</Text>
          </View>
        )}

        {/* Steps result */}
        {result?.kind === 'steps' && (
          <View style={s.stepList}>
            {result.steps.map((step, i) => (
              <View key={i} style={s.stepItem}>
                <Text style={s.stepNum}>{i + 1}</Text>
                <Text style={s.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  panel: {
    backgroundColor: colors.s2,
    borderWidth: 1.5,
    borderColor: colors.border2,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: 2,
  },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 3,
  },
  tabBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.goldBg,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontFamily: 'Syne-Medium',
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: colors.gold,
  },

  body: {
    padding: spacing.md,
    gap: spacing.sm + 2,
  },

  runBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  runBtnDisabled: {
    opacity: 0.35,
  },
  runBtnText: {
    fontFamily: 'Syne-Bold',
    fontSize: 14,
    color: colors.bg,
    letterSpacing: 0.2,
  },

  thinkingText: {
    fontFamily: 'Literata-Light',
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.muted,
  },

  errorText: {
    fontFamily: 'Literata-Light',
    fontSize: 13,
    color: colors.red,
    lineHeight: 20,
  },

  textResult: {
    backgroundColor: colors.s1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 13,
    maxHeight: 280,
  },
  textResultContent: {
    fontFamily: 'Literata-Light',
    fontSize: 13,
    lineHeight: 21,
    color: colors.cream,
  },
  copyBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  copyBtnText: {
    fontFamily: 'Syne-Regular',
    fontSize: 11,
    color: colors.muted,
  },

  decideCard: {
    backgroundColor: colors.goldBg,
    borderWidth: 1.5,
    borderColor: colors.goldDim,
    borderRadius: radius.md,
    padding: 13,
    gap: 8,
  },
  decideVerdict: {
    fontFamily: 'Syne-Bold',
    fontSize: 15,
    color: colors.gold,
  },
  decideReason: {
    fontFamily: 'Literata-Light',
    fontSize: 13,
    lineHeight: 21,
    color: colors.cream,
  },

  stepList: { gap: 8 },
  stepItem: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.s2,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  stepNum: {
    fontFamily: 'Syne-Bold',
    fontSize: 11,
    color: colors.gold,
    minWidth: 18,
    paddingTop: 1,
  },
  stepText: {
    flex: 1,
    fontFamily: 'Literata-Light',
    fontSize: 13,
    lineHeight: 20,
    color: colors.cream,
  },
});
