// ═══════════════════════════════════════════════════
// LOGISTMA FACTORY — Design System Tokens
// Theme: Industrial-tech dark · Teal + Amber accents
// ═══════════════════════════════════════════════════

export const G = {
  // Backgrounds (darkest → lightest)
  bg0: '#060a0f',
  bg1: '#0b1017',
  bg2: '#111820',
  bg3: '#18212d',
  bg4: '#1e2a38',
  bg5: '#253348',

  // Borders
  border:   '#1e2d3d',
  borderHi: '#2a3f55',

  // Text
  text:      '#e2eaf4',
  textMuted: '#6b8299',
  textDim:   '#3a5068',

  // Primary — Teal
  teal:    '#0ea5a0',
  tealHi:  '#2dd4bf',
  tealLo:  '#0d9488',
  tealDim: '#0ea5a018',
  tealMid: '#0ea5a040',

  // Accent — Amber
  amber:    '#f59e0b',
  amberHi:  '#fbbf24',
  amberDim: '#f59e0b18',

  // Semantic
  red:     '#f87171',
  redDim:  '#f8717118',
  green:   '#34d399',
  greenDim:'#34d39918',
  blue:    '#60a5fa',
  blueDim: '#60a5fa18',
  purple:  '#a78bfa',
  purpleDim:'#a78bfa18',
};

export const FONTS = {
  mono: "'JetBrains Mono', monospace",
  sans: "'DM Sans', sans-serif",
};

export const RADII = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};

export const SHADOW = {
  teal:  `0 4px 20px ${G.teal}40`,
  amber: `0 4px 20px ${G.amber}40`,
  card:  '0 4px 24px rgba(0,0,0,0.35)',
  deep:  '0 16px 48px rgba(0,0,0,0.5)',
};
