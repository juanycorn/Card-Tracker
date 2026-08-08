import { BASE_COUNTER_LABELS } from '../games/counters';
import type { CounterRole, ManaColor } from '../games';

export type ThemeAnimation = 'none' | 'pulse' | 'shake' | 'spring' | 'glow';

export type PlayerTheme = {
  id: string;
  name: string;
  example: string;
  labels: Record<CounterRole, string>;
  gradientColors: readonly [string, string, ...string[]];
  colors: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    border: string;
    text: string;
    mutedText: string;
    lifeGain: string;
    lifeLoss: string;
  };
  icons: {
    life: string;
    mana: string;
    counter: string;
    turn: string;
  };
  sounds: {
    damage?: string;
    heal?: string;
    turnStart?: string;
    turnEnd?: string;
  };
  animations: {
    damage: ThemeAnimation;
    heal: ThemeAnimation;
    turnStart: ThemeAnimation;
    counterAdd: ThemeAnimation;
  };
  typography: {
    titleFont?: string;
    bodyFont?: string;
    numberFont?: string;
  };
};

export type ThemePack = PlayerTheme;

// Intentionally vivid. Multi-color identities keep separate gradient stops instead
// of averaging colors together, so combinations like White/Black stay gold→black
// instead of collapsing into muddy brown.
export const MANA_THEME_COLORS: Record<ManaColor, string> = {
  W: '#FFD54A',
  U: '#087BFF',
  B: '#15151B',
  R: '#FF3B30',
  G: '#00C853',
  C: '#8A98A8',
};

export const MANA_COLOR_NAMES: Record<ManaColor, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
};

const DEFAULT_THEME_VALUES = {
  colors: {
    primary: '#8A98A8',
    accent: '#C7D0DB',
    background: '#07090D',
    surface: '#11141B',
    border: '#303642',
    text: '#FFFFFF',
    mutedText: '#B4BAC5',
    lifeGain: '#28E66F',
    lifeLoss: '#FF3B4F',
  },
  icons: {
    life: 'heart',
    mana: 'spark',
    counter: 'token',
    turn: 'arrow',
  },
  sounds: {},
  animations: {
    damage: 'shake' as ThemeAnimation,
    heal: 'pulse' as ThemeAnimation,
    turnStart: 'glow' as ThemeAnimation,
    counterAdd: 'spring' as ThemeAnimation,
  },
  typography: {},
};

const CHANNELS = [0, 2, 4] as const;

function shade(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const values = CHANNELS.map((index) => Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(index, index + 2), 16) * amount))));
  return `#${values.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function normalizeManaColors(colors?: readonly ManaColor[]): ManaColor[] {
  const unique = [...new Set(colors ?? [])];
  return unique.length ? unique : ['C'];
}

export function getManaThemeId(colors?: readonly ManaColor[]): string {
  return `mana:${normalizeManaColors(colors).join('-')}`;
}

export function getManaTheme(colors?: readonly ManaColor[]): PlayerTheme {
  const manaColors = normalizeManaColors(colors);
  const swatches = manaColors.map((color) => MANA_THEME_COLORS[color]);
  const gradientColors = (swatches.length === 1
    ? [shade(swatches[0], manaColors[0] === 'B' ? 0.45 : 0.58), swatches[0]]
    : swatches) as [string, string, ...string[]];
  const primary = swatches[0];
  const accent = swatches[swatches.length - 1];
  const names = manaColors.map((color) => MANA_COLOR_NAMES[color]);

  return {
    id: getManaThemeId(manaColors),
    name: names.join(' / '),
    example: manaColors.join(' · '),
    labels: BASE_COUNTER_LABELS,
    gradientColors,
    colors: {
      ...DEFAULT_THEME_VALUES.colors,
      primary,
      accent,
      // Keep readable dark surfaces while the actual mana colors stay saturated
      // in gradients, borders, active controls, and highlights.
      background: manaColors[0] === 'B' ? '#07070A' : shade(primary, 0.16),
      surface: manaColors[0] === 'B' ? '#111116' : shade(primary, 0.24),
      border: manaColors[0] === 'B' ? '#4A4A52' : shade(accent, 0.78),
      text: '#FFFFFF',
      mutedText: '#C0C5CE',
    },
    icons: DEFAULT_THEME_VALUES.icons,
    sounds: DEFAULT_THEME_VALUES.sounds,
    animations: DEFAULT_THEME_VALUES.animations,
    typography: DEFAULT_THEME_VALUES.typography,
  };
}

export const DEFAULT_PLAYER_THEME_ID = getManaThemeId(['C']);

export const THEME_PACKS: PlayerTheme[] = [getManaTheme(['C'])];
export const THEMES_BY_ID: Record<string, PlayerTheme> = { [DEFAULT_PLAYER_THEME_ID]: THEME_PACKS[0] };

export function getThemePack(id?: string): PlayerTheme {
  if (id?.startsWith('mana:')) {
    const colors = id.slice(5).split('-').filter((color): color is ManaColor => ['W', 'U', 'B', 'R', 'G', 'C'].includes(color));
    return getManaTheme(colors);
  }
  return getManaTheme(['C']);
}

export function getPlayerTheme(id?: string): PlayerTheme {
  return getThemePack(id);
}
