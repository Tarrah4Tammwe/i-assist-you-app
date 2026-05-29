// ─── Supabase client ─────────────────────────────────────────────────────────
// Single shared instance for the whole app.
// URL + anon key come from Expo's Constants.expoConfig.extra (set in app.config.js)
// which reads from process.env / .env.local at build time.

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

const SUPABASE_URL: string =
  extra.supabaseUrl ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  '';

const SUPABASE_ANON_KEY: string =
  extra.supabaseAnonKey ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[supabase] Missing env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Persist session in AsyncStorage (expo-secure-store recommended for prod)
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
