export type ResolvedTheme = 'light' | 'dark';

export const canvas = { width: 390, height: 844, horizontalPadding: 24, topReserved: 88, bottomReserved: 56 } as const;

export type ThemeColors = {
  background: string;
  backgroundEnd: string;
  surface: string;
  ink: string;
  muted: string;
  stroke: string;
  accent: string;
  cyan: string;
  danger: string;
  wash: string;
};

export const palette: Record<ResolvedTheme, ThemeColors> = {
  light: {
    background: '#F9FAFE',
    backgroundEnd: '#EFEBF8',
    surface: '#FFFFFF',
    ink: '#202438',
    muted: '#626980',
    stroke: '#DFE3EF',
    accent: '#6550B9',
    cyan: '#087D91',
    danger: '#AE354B',
    wash: '#EEEBF8',
  },
  dark: {
    background: '#111629',
    backgroundEnd: '#232039',
    surface: '#20263D',
    ink: '#F5F3FF',
    muted: '#B9BED3',
    stroke: '#39405B',
    accent: '#C4B1FF',
    cyan: '#70D9E9',
    danger: '#AE354B',
    wash: '#27263F',
  },
};

export const typography = {
  family: ['-apple-system', 'BlinkMacSystemFont', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'] as const,
  display: 25,
  pageTitle: 22,
  body: 16,
  secondary: 13,
  caption: 11,
  lineHeight: 1.5,
} as const;

export const radii = { button: 16, card: 24, chip: 12, screen: 28 } as const;

export const spacing = { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 } as const;

export const interaction = {
  minimumTouchTarget: 44,
  primaryButtonHeight: 50,
  transitionMs: 200,
  reducedMotion: 'no parallax or animated pixels',
} as const;
