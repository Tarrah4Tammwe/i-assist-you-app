// ─── useSpeech hook ───────────────────────────────────────────────────────────
// Shared voice recognition hook for all screens.
// Currently uses Web Speech API (works on Expo Web + development).
// TODO: swap body for @react-native-voice/voice when doing native build.

import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeech(onResult: (transcript: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);

  // Stable callback ref so the recognition handler doesn't go stale
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SR) setSupported(true);
  }, []);

  const toggle = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SR();
    rec.lang = 'en-GB';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript;
      onResultRef.current(transcript);
    };
    rec.onend  = () => setListening(false);
    rec.onerror = () => setListening(false);

    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening]);

  return { listening, supported, toggle };
}
