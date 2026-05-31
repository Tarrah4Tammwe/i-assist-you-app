// ─── i assist you — Design Tokens ─────────────────────────────────────────────
export const colors = {
  bg:       '#0a0d14',
  s1:       '#0f1420',
  s2:       '#141a28',
  s3:       '#1a2130',
  border:   '#1e2535',
  border2:  '#263045',
  gold:     '#d4a853',
  goldDim:  '#8a6a2e',
  goldBg:   '#1a160a',
  cream:    '#ede8df',
  text:     '#c8d0e0',
  muted:    '#6272a4',
  muted2:   '#3d4f6e',
  green:    '#6faa88',
  greenBg:  '#0a1a10',
  red:      '#b86b5a',
  blue:     '#6a9ab8',
  blueBg:   '#0a1420',
  purple:   '#9b85cc',
  purpleDim:'#5a3e8a',
  purpleBg: '#140e22',
  purpleBorder: '#2a1e40',
} as const;

export type ColorKey = keyof typeof colors;

export const type = {
  screenTitle:  { fontFamily: 'Syne-Bold',     fontSize: 22, letterSpacing: -0.5, color: colors.cream },
  screenSub:    { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted, lineHeight: 20 },
  label:        { fontFamily: 'Syne-Regular',   fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: colors.muted },
  cardTitle:    { fontFamily: 'Syne-Medium',    fontSize: 14, color: colors.cream },
  cardTime:     { fontFamily: 'Syne-Regular',   fontSize: 10, color: colors.goldDim, letterSpacing: 0.5 },
  body:         { fontFamily: 'Literata-Light', fontSize: 15, lineHeight: 25, color: colors.text },
  bodySmall:    { fontFamily: 'Literata-Light', fontSize: 13, lineHeight: 20, color: colors.muted },
  bodyItalic:   { fontFamily: 'Literata-Light', fontStyle: 'italic' as const, fontSize: 15, lineHeight: 25, color: colors.text },
  brand:        { fontFamily: 'Syne-Bold',      fontSize: 17, color: colors.gold, letterSpacing: -0.3 },
  clock:        { fontFamily: 'Syne-Regular',   fontSize: 13, color: colors.muted },
  tagGold:      { fontFamily: 'Syne-Medium',    fontSize: 10, color: colors.gold },
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 14, lg: 20, xl: 28,
  screenPad: 20, cardPad: 14, gap: 18, navHeight: 72,
} as const;

export const radius = { sm: 8, md: 10, lg: 14, xl: 20, full: 100 } as const;

export const blockTypeColors = {
  task:       { border: colors.border,  bg: colors.s1,      chip: colors.muted,  chipBg: colors.s2      },
  break:      { border: colors.border,  bg: colors.s1,      chip: colors.green,  chipBg: colors.greenBg },
  food:       { border: colors.border,  bg: colors.s1,      chip: '#c4945a',     chipBg: '#1a1008'      },
  transition: { border: colors.border,  bg: colors.s1,      chip: colors.blue,   chipBg: colors.blueBg  },
} as const;

// Full card colours for dump entries (bg = entire card bg)
export const dumpTypeColors = {
  idea:    { color: '#d4a070', bg: '#1a1208', border: '#2e1e08', timeFg: '#7a4a20', tagBg: '#2e1e08', tagFg: '#c4945a', label: 'Idea'    },
  task:    { color: '#8ecba8', bg: '#0a1510', border: '#0f2518', timeFg: '#2a6040', tagBg: '#0f2518', tagFg: '#6faa88', label: 'Task'    },
  list:    { color: '#7ab0cc', bg: '#0b1420', border: '#112035', timeFg: '#2a4060', tagBg: '#112035', tagFg: '#6a9ab8', label: 'List'    },
  thought: { color: '#b09cd4', bg: '#140e22', border: '#2a1e40', timeFg: '#4a3570', tagBg: '#2a1e40', tagFg: '#9b85cc', label: 'Thought' },
} as const;
