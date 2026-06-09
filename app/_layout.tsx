// app/_layout.tsx
// Root layout: loads fonts, manages splash screen, wraps everything in
// gesture handler and safe area context.
// Deep link handler: catches iassistyou://auth/callback?... from Supabase
// magic links and exchanges the token so auth works on device.

import { useEffect } from 'react';
import { Linking } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Syne_400Regular,
  Syne_500Medium,
  Syne_700Bold,
} from '@expo-google-fonts/syne';
import {
  Literata_300Light,
  Literata_400Regular,
  Literata_300Light_Italic,
} from '@expo-google-fonts/literata';

import { supabase } from '../lib/supabase';
import { colors } from '../constants/theme';

SplashScreen.preventAutoHideAsync();

// Parse token_hash / access_token / refresh_token out of a deep-link URL.
// Supabase can send them as query params OR as a hash fragment.
function parseAuthUrl(url: string): {
  access_token?: string;
  refresh_token?: string;
  token_hash?: string;
  type?: string;
} {
  try {
    // Normalise hash fragments to query params for easy parsing
    const normalised = url.replace('#', '?');
    const parsed = new URL(normalised);
    const p = parsed.searchParams;
    return {
      access_token:  p.get('access_token')  ?? undefined,
      refresh_token: p.get('refresh_token') ?? undefined,
      token_hash:    p.get('token_hash')    ?? undefined,
      type:          p.get('type')          ?? undefined,
    };
  } catch {
    return {};
  }
}

async function handleDeepLink(url: string) {
  if (!url.startsWith('iassistyou://')) return;

  const { access_token, refresh_token, token_hash, type } = parseAuthUrl(url);

  // Magic link / OTP — exchange token_hash for a real session
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });
    if (!error) {
      router.replace('/');
    }
    return;
  }

  // Fallback: direct access + refresh tokens (older Supabase behaviour)
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (!error) {
      router.replace('/');
    }
  }
}

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // ── Fonts ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Syne-Regular':           Syne_400Regular,
          'Syne-Medium':            Syne_500Medium,
          'Syne-Bold':              Syne_700Bold,
          'Literata-Light':         Literata_300Light,
          'Literata-Regular':       Literata_400Regular,
          'Literata-LightItalic':   Literata_300Light_Italic,
        });
      } catch (e) {
        console.warn('Font loading error:', e);
      } finally {
        setFontsLoaded(true);
        await SplashScreen.hideAsync();
      }
    }
    loadFonts();
  }, []);

  // ── Deep link handler ────────────────────────────────────────────────────
  useEffect(() => {
    // Handle app opened via deep link while cold-started
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle deep link while app is already open
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={colors.bg} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="auth/login"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="auth/signup"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="auth/callback" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
