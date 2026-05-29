// app/_layout.tsx
// Root layout: loads fonts, manages splash screen, wraps everything in
// gesture handler and safe area context.

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useState } from 'react';
import { View } from 'react-native';

// Google Fonts — loaded with custom aliases so all existing fontFamily
// strings ('Syne-Bold', 'Literata-Light' etc.) work unchanged throughout the app.
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

import { colors } from '../constants/theme';

// Keep splash screen visible until fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          // Map Google Font objects to the names used throughout the app
          'Syne-Regular': Syne_400Regular,
          'Syne-Medium':  Syne_500Medium,
          'Syne-Bold':    Syne_700Bold,
          'Literata-Light': Literata_300Light,
          'Literata-Regular': Literata_400Regular,
          'Literata-LightItalic': Literata_300Light_Italic,
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
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
