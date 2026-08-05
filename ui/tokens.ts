export const colors = {
  background: '#080A0F',
  surface: '#11141B',
  surfaceRaised: '#171A22',
  surfaceMuted: '#1B1E27',
  border: '#252936',
  borderStrong: '#303544',
  primary: '#7560FF',
  primarySoft: '#312A59',
  primaryText: '#E3DFFF',
  accent: '#8F7CFF',
  text: '#FFFFFF',
  textMuted: '#AEB3C1',
  textDim: '#676D7D',
  danger: '#FF5F6D',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 22,
  round: 999,
} as const;

export const motion = {
  fast: 150,
  normal: 230,
  slow: 320,
} as const;
