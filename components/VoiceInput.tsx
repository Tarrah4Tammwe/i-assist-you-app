// ─── VoiceInput ───────────────────────────────────────────────────────────────
// Single-line TextInput with mic button + send arrow.
// Used on Check-in chat and any "type a quick message" field.

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

interface VoiceInputProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  loading?: boolean;
  editable?: boolean;
}

export function VoiceInput({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  loading = false,
  editable = true,
}: VoiceInputProps) {
  const { listening, supported, toggle } = useSpeech((transcript) => {
    onChange(value ? `${value} ${transcript}` : transcript);
  });

  const canSend = value.trim().length > 0 && !loading;

  return (
    <View style={styles.row}>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.muted2}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={canSend ? onSubmit : undefined}
          returnKeyType="send"
          editable={editable && !loading}
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

      <Pressable
        style={({ pressed }) => [
          styles.sendBtn,
          !canSend && styles.sendBtnDisabled,
          pressed && canSend && { opacity: 0.8 },
        ]}
        onPress={canSend ? onSubmit : undefined}
        accessibilityRole="button"
        accessibilityLabel="Send"
        accessibilityState={{ disabled: !canSend }}
      >
        <Text style={styles.sendIcon}>→</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inputWrap: {
    flex: 1,
    position: 'relative',
  },
  input: {
    backgroundColor: colors.s1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingLeft: 15,
    paddingRight: 46,
    color: colors.text,
    fontFamily: 'Literata-Light',
    fontSize: 15,
  },
  micBtn: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -13,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnListening: {
    borderColor: colors.red,
    backgroundColor: '#1e1008',
  },
  micIcon: {
    fontSize: 12,
  },
  sendBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 46,
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
  sendIcon: {
    fontSize: 16,
    fontFamily: 'Syne-Bold',
    color: colors.bg,
  },
});
