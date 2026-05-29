// ─── i assist you — Design Tokens ─────────────────────────────────────────────
// Navy palette. Updated from warm-black prototype to navy production palette.
// All screens and components should import from here — never hardcode colours.

export const colors = {
  // ── Backgrounds (navy dark scale) ──
  bg:       '#0a0d14',  // App background — deep navy
  s1:       '#0f1420',  // Card surface
  s2:       '#141a28',  // Elevated surface
  s3:       '#1a2130',  // Hover / active state

  // ── Borders ──
  border:   '#1e2535',
  border2:  '#263045',

  // ── Primary accent — warm gold (unchanged, works beautifully on navy) ──
  gold:     '#d4a853',
  goldDim:  '#8a6a2e',
  goldBg:   '#1a160a',

  // ── Text ──
  cream:    '#ede8df',  // Headings, important text
  text:     '#c8d0e0',  // Body text (cooler on navy)
  muted:    '#6272a4',  // Secondary text — slate blue
  muted2:   '#3d4f6e',  // Tertiary / timestamps

  // ── Semantic ──
  green:    '#6faa88',
  greenBg:  '#0a1a10',
  red:      '#b86b5a',
  blue:     '#6a9ab8',
  blueBg:   '#0a1420',
} as const;

export type ColorKey = keyof typeof colors;

// ─── Typography ────────────────────────────────────────────────────────────────
// Fonts loaded via expo-font in app/_layout.tsx

export const type = {
  screenTitle:  { fontFamily: 'Syne-Bold',          fontSize: 22, letterSpacing: -0.5, color: colors.cream },
  screenSub:    { fontFamily: 'Literata-Light',      fontSize: 13, color: colors.muted,  lineHeight: 20 },
  label:        { fontFamily: 'Syne-Regular',        fontSize: 10, letterSpacing: 1.2,  textTransform: 'uppercase' as const, color: colors.muted },
  cardTitle:    { fontFamily: 'Syne-Medium',         fontSize: 14, color: colors.cream },
  cardTime:     { fontFamily: 'Syne-Regular',        fontSize: 10, color: colors.goldDim, letterSpacing: 0.5 },
  body:         { fontFamily: 'Literata-Light',      fontSize: 15, lineHeight: 25, color: colors.text },
  bodySmall:    { fontFamily: 'Literata-Light',      fontSize: 13, lineHeight: 20, color: colors.muted },
  bodyItalic:   { fontFamily: 'Literata-Light',      fontStyle: 'italic' as const, fontSize: 15, lineHeight: 25, color: colors.text },
  brand:        { fontFamily: 'Syne-Bold',           fontSize: 17, color: colors.gold, letterSpacing: -0.3 },
  clock:        { fontFamily: 'Syne-Regular',        fontSize: 13, color: colors.muted },
  tagGold:      { fontFamily: 'Syne-Medium',         fontSize: 10, color: colors.gold },
} as const;

// ─── Spacing ───────────────────────────────────────────────────────────────────

export const spacing = {
  xs:         4,
  sm:         8,
  md:         14,
  lg:         20,
  xl:         28,
  screenPad:  20,   // Horizontal padding for all screens
  cardPad:    14,   // Card internal padding
  gap:        18,   // Default gap between sections
  navHeight:  72,   // Bottom nav height (add safe area on top)
} as const;

// ─── Border radius ─────────────────────────────────────────────────────────────

export const radius = {
  sm:   8,
  md:   10,
  lg:   14,
  xl:   20,
  full: 100,
} as const;

// ─── Plan block type colours ───────────────────────────────────────────────────

export const blockTypeColors = {
  task: {
    border:  colors.border,
    bg:      colors.s1,
    chip:    colors.muted,
    chipBg:  colors.s2,
  },
  break: {
    border:  colors.border,
    bg:      colors.s1,
    chip:    colors.green,
    chipBg:  colors.greenBg,
  },
  food: {
    border:  colors.border,
    bg:      colors.s1,
    chip:    '#c4945a',
    chipBg:  '#1a1008',
  },
  transition: {
    border:  colors.border,
    bg:      colors.s1,
    chip:    colors.blue,
    chipBg:  colors.blueBg,
  },
} as const;

// ─── Dump entry type colours ───────────────────────────────────────────────────

export const dumpTypeColors = {
  idea:    { color: '#c4945a', bg: '#1a1008' },
  list:    { color: colors.blue,  bg: colors.blueBg  },
  thought: { color: colors.muted, bg: colors.s2      },
  task:    { color: colors.green, bg: colors.greenBg },
} as const;
