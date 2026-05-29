// hooks/useSpeech.ts
// STUB VERSION — @react-native-voice/voice temporarily disabled
// Returns a no-op implementation that keeps the app buildable

import { useState } from 'react';

export function useSpeech(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  const toggle = async () => {
    // No-op voice input for now
    console.log('Voice input not available in this build');
  };

  return { listening, supported, toggle };
}
