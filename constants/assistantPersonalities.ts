// ─── Assistant Personality Configs ────────────────────────────────────────────
// Each name has a real tone difference baked into the system prompt modifier.
// Custom names use Nova characteristics.

export type PersonalityKey = 'nova' | 'sage' | 'arlo' | 'wren';

export interface Personality {
  key: PersonalityKey;
  name: string;
  tagline: string;
  toneModifier: string; // appended to all system prompts
}

export const PERSONALITIES: Personality[] = [
  {
    key: 'nova',
    name: 'Nova',
    tagline: 'Default · clear and calm',
    toneModifier: 'Be direct, clear, and calm. Two to four sentences maximum. No fluff, no padding.',
  },
  {
    key: 'sage',
    name: 'Sage',
    tagline: 'Grounded · wise energy',
    toneModifier: 'Be warm, grounded, and considered. Take a beat before answering. Two to four sentences.',
  },
  {
    key: 'arlo',
    name: 'Arlo',
    tagline: 'Friendly · low pressure',
    toneModifier: 'Light touch, informal, comfortable with short replies and silence. Two to four sentences.',
  },
  {
    key: 'wren',
    name: 'Wren',
    tagline: 'Quiet · steady presence',
    toneModifier: 'Minimal words. Almost terse. Steady without being warm. One to two sentences only.',
  },
];

export const DEFAULT_PERSONALITY = PERSONALITIES[0];

export function getPersonality(key: string): Personality {
  return PERSONALITIES.find(p => p.key === key) ?? DEFAULT_PERSONALITY;
}

export function buildSystemPrompt(base: string, personalityKey: string): string {
  const p = getPersonality(personalityKey);
  return `${base}\n\nTone: ${p.toneModifier}`;
}
