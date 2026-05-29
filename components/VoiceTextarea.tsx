// ─── VoiceTextarea ────────────────────────────────────────────────────────────
// Multi-line TextInput with an integrated mic button.
// Drop-in replacement for bare TextInput on every screen that needs voice input.
// Mic transcription APPENDS to existing text — user always confirms before sending.

import React from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';
import { colors, radius } from '../constants/theme';
import { useSpeech } from '../hooks/useSpeech';

interface VoiceTextareaProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  rows?: number;
  editable?: boolean;
}

export function VoiceTextarea({
  value,
  onChange,
  placeholder = '',
  rows = 4,
  editable = true,
}: VoiceTextareaProps) {
  const { listening, supported, toggle } = useSpeech((transcript) => {
    onChange(value ? `${value} ${transcript}` : transcript);
  });

  return (
    <View>
      <View style={styles.wrap}>
        <TextInput
          style={[styles.input, { minHeight: rows * 24 + 26 }]}
          multiline
          placeholder={placeholder}
          placeholderTextColor={colors.muted2}
          value={value}
          onChangeText={onChange}
          editable={editable}
          textAlignVertical="top"
        />
        {supported && (
          <Pressable
            style={[styles.micBtn, listening && styles.micBtnListening]}
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Stop listening' : 'Start voice input'}
          >
            <Text style={styles.micIcon}>{listening ? '⏹' : '🎙'}</Text>
          </Pressable>
        )}
      </View>

      {listening && (
        <View style={styles.listeningRow}>
          <View style={styles.listeningDot} />
          <Text style={styles.listeningText}>listening…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.s1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingTop: 13,
    paddingBottom: 13,
    paddingLeft: 15,
    paddingRight: 52,   // clearance for mic button
    color: colors.text,
    fontFamily: 'Literata-Light',
    fontSize: 15,
    lineHeight: 24,
  },
  micBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.s2,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnListening: {
    borderColor: colors.red,
    backgroundColor: '#1e1008',
  },
  micIcon: {
    fontSize: 15,
  },
  listeningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  listeningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.red,
  },
  listeningText: {
    fontFamily: 'Syne-Regular',
    fontSize: 11,
    color: colors.red,
    letterSpacing: 0.5,
  },
});
