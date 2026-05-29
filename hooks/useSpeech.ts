// hooks/useSpeech.ts
// Voice input hook using @react-native-voice/voice (native Android + iOS).
// Transcription APPENDS to existing text — user always confirms before submitting.

import { useState, useEffect } from 'react';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

export function useSpeech(onResult: (text: string) => void) {
  const [listening, setListening]   = useState(false);
  const [supported, setSupported]   = useState(true); // assume true; Voice handles unavailability

  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const transcript = e.value?.[0];
      if (transcript) onResult(transcript);
      setListening(false);
    };

    Voice.onSpeechError = (_e: SpeechErrorEvent) => {
      setListening(false);
    };

    Voice.onSpeechEnd = () => {
      setListening(false);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
    };
  }, []);

  const toggle = async () => {
    try {
      if (listening) {
        await Voice.stop();
        setListening(false);
      } else {
        await Voice.start('en-GB');
        setListening(true);
      }
    } catch (e) {
      console.warn('Voice error:', e);
      setListening(false);
    }
  };

  return { listening, supported, toggle };
}
