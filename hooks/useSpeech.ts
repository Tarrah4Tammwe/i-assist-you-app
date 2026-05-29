// hooks/useSpeech.ts
// Speech-to-text hook using @react-native-voice/voice.
//
// BEHAVIOUR:
// - Tap mic → start listening
// - Tap again (or speech ends naturally) → stop, transcript APPENDED to field
// - Multiple taps allowed — each adds to the existing text
// - User always edits/confirms before submitting (no auto-submit)
// - Status: 'listening…' shown while active
// - If unavailable (Expo Go without dev build): supported=false, mic hidden
//
// TESTING:
// - Requires a development build or production build (not Expo Go)
// - Run: eas build --platform ios --profile development
//       eas build --platform android --profile development
// - Then: expo start --dev-client

import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// Lazy import — won't crash if native module missing (e.g. Expo Go)
let Voice: any = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch {
  // Not available — happens in Expo Go without dev build
}

type SpeechState = 'idle' | 'listening' | 'processing';

interface UseSpeechReturn {
  listening: boolean;
  supported: boolean;
  state: SpeechState;
  toggle: () => Promise<void>;
}

export function useSpeech(onResult: (transcript: string) => void): UseSpeechReturn {
  const [state, setState] = useState<SpeechState>('idle');
  const [supported, setSupported] = useState(false);
  const onResultRef = useRef(onResult);

  // Keep callback ref current so we don't need it in dep arrays
  useEffect(() => {
    onResultRef.current = onResult;
  });

  useEffect(() => {
    if (!Voice) return; // Expo Go or unsupported env

    // Check availability
    Voice.isAvailable()
      .then((available: boolean | number) => {
        setSupported(!!available);
      })
      .catch(() => setSupported(false));

    // Wire up listeners
    Voice.onSpeechStart = () => {
      setState('listening');
    };

    Voice.onSpeechEnd = () => {
      setState('processing');
    };

    Voice.onSpeechResults = (e: { value?: string[] }) => {
      const transcript = e.value?.[0]?.trim();
      if (transcript) {
        onResultRef.current(transcript);
      }
      setState('idle');
    };

    Voice.onSpeechError = (e: { error?: { message?: string } }) => {
      const msg = e.error?.message ?? '';
      // "recognition canceled" is normal when user stops — not an error
      if (!msg.includes('canceled') && !msg.includes('cancelled')) {
        console.warn('[useSpeech] error:', msg);
      }
      setState('idle');
    };

    return () => {
      Voice.destroy()
        .then(() => Voice.removeAllListeners())
        .catch(() => {});
    };
  }, []);

  const toggle = async () => {
    if (!Voice || !supported) return;

    try {
      if (state === 'listening') {
        await Voice.stop();
        setState('idle');
      } else {
        // Always destroy first to clear any stale state
        try { await Voice.destroy(); } catch {}

        const locale = Platform.OS === 'ios' ? 'en-GB' : 'en-GB';
        await Voice.start(locale);
        setState('listening');
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (!msg.includes('canceled') && !msg.includes('cancelled')) {
        console.warn('[useSpeech] toggle error:', msg);
      }
      setState('idle');
    }
  };

  return {
    listening: state === 'listening',
    supported,
    state,
    toggle,
  };
}
