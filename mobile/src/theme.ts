/**
 * 灵山胜境 AI 导览 — 禅意设计系统
 * Inspired by Buddhist temple aesthetics, Chinese traditional colors, and nature.
 */

export const Colors = {
  // Primary — 佛光金
  gold: '#C8963E',
  goldDark: '#8B5E2B',
  goldLight: '#F5ECD7',
  goldSurface: '#FBF6ED',

  // Accent — 朱砂红
  vermilion: '#B5453A',
  vermilionLight: '#FCE8E6',

  // Nature — 山水绿
  jade: '#5D8C5A',
  jadeLight: '#E8F2E7',

  // Sky — 青金石
  lapis: '#5B7BA0',
  lapisLight: '#EDF1F6',

  // Background
  paper: '#FEF9F3',
  white: '#FFFFFF',
  card: '#FFFFFF',

  // Surface
  surface: '#F8F4EC',
  divider: '#EDE6DA',

  // Text
  ink: '#2C1810',
  text: '#4A3728',
  textSecondary: '#8B7E74',
  textMuted: '#BFB5A8',

  // Status
  success: '#5D8C5A',
  warning: '#D4A43A',
  error: '#B5453A',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '800' as const, color: Colors.ink, letterSpacing: 0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, color: Colors.ink },
  h3: { fontSize: 18, fontWeight: '700' as const, color: Colors.ink },
  h4: { fontSize: 16, fontWeight: '600' as const, color: Colors.text },
  body: { fontSize: 15, color: Colors.text, lineHeight: 24 },
  bodySmall: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  caption: { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  price: { fontSize: 20, fontWeight: '700' as const, color: Colors.vermilion },
};
