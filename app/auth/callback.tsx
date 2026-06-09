// app/auth/callback.tsx
// Landing screen for magic link redirects.
// The actual token exchange happens in _layout.tsx's deep link handler.
// This screen just shows a calm "signing you in" state while that runs.

import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../constants/theme';

export default function AuthCallbackScreen() {
  useEffect(() => {
    // Poll briefly — _layout.tsx will have called setSession/verifyOtp
    // by the time we're here. If the session exists, redirect immediately.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/');
      } else {
        // Give the root handler a moment to complete
        setTimeout(async () => {
          const { data: d2 } = await supabase.auth.getSession();
          if (d2.session) {
            router.replace('/');
          } else {
            // Fallback: back to login
            router.replace('/auth/login');
          }
        }, 2000);
      }
    };
    check();
  }, []);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.gold} size="small" />
      <Text style={styles.label}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  label: {
    fontFamily: 'Syne-Regular',
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 0.5,
  },
});
