import { BASE_COUNTER_LABELS } from '../games/counters';
import type { CounterRole, ManaColor } from '../games';
import { POKEMON_ENERGY_COLORS, POKEMON_ENERGY_LABELS, POKEMON_ENERGY_TYPES, type PokemonEnergyType } from '../games/pokemonEnergy';

export type ThemeAnimation = 'none' | 'pulse' | 'shake' | 'spring' | 'glow';

export type PlayerTheme = {
  id: string;
  name: string;
  example: string;
  labels: Record<CounterRole, string>;
  gradientColors: readonly [string, string, ...string[]];
  backgroundImageUri?: string;
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

export type EncodedCustomTheme = {
  id: string;
  name: string;
  description?: string;
  colors: PlayerTheme['colors'];
  animations: PlayerTheme['animations'];
  assets?: {
    backgroundImage?: { uri?: string };
    previewImage?: { uri?: string };
    damageSound?: { uri?: string };
    healSound?: { uri?: string };
    counterSound?: { uri?: string };
    turnSound?: { uri?: string };
    music?: { uri?: string };
  };
};

export const MANA_THEME_COLORS: Record<ManaColor, string> = {
  W: '#F4F4F2',
  U: '#0078FF',
  B: '#09090B',
  R: '#FF3B30',
  G: '#00D26A',
  C: '#9098A5',
};

export const MANA_COLOR_NAMES: Record<ManaColor, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
};

const MANA_ORDER: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];
const POKEMON_TYPE_ORDER: PokemonEnergyType[] = [...POKEMON_ENERGY_TYPES];

const DEFAULT_THEME_VALUES = {
  colors: {
    primary: '#9098A5',
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
  if (!unique.length) return ['C'];
  return MANA_ORDER.filter((color) => unique.includes(color));
}

function normalizePokemonTypes(types?: readonly PokemonEnergyType[]): PokemonEnergyType[] {
  const unique = [...new Set(types ?? [])];
  if (!unique.length) return ['colorless'];
  return POKEMON_TYPE_ORDER.filter((type) => unique.includes(type));
}

export function getManaThemeId(colors?: readonly ManaColor[]): string {
  return `mana:${normalizeManaColors(colors).join('-')}`;
}

export function getManaTheme(colors?: readonly ManaColor[]): PlayerTheme {
  const manaColors = normalizeManaColors(colors);
  const swatches = manaColors.map((color) => MANA_THEME_COLORS[color]);
  const gradientColors = (swatches.length === 1
    ? [shade(swatches[0], manaColors[0] === 'B' ? 0.45 : manaColors[0] === 'W' ? 0.82 : 0.58), swatches[0]]
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
      background: manaColors[0] === 'B' ? '#07070A' : manaColors[0] === 'W' ? '#242426' : shade(primary, 0.16),
      surface: manaColors[0] === 'B' ? '#111116' : manaColors[0] === 'W' ? '#2F3032' : shade(primary, 0.24),
      border: manaColors[0] === 'B' ? '#4A4A52' : manaColors[0] === 'W' ? '#D4D4D0' : shade(accent, 0.78),
      text: '#FFFFFF',
      mutedText: '#C0C5CE',
    },
    icons: DEFAULT_THEME_VALUES.icons,
    sounds: DEFAULT_THEME_VALUES.sounds,
    animations: DEFAULT_THEME_VALUES.animations,
    typography: DEFAULT_THEME_VALUES.typography,
  };
}

export function getPokemonThemeId(types?: readonly PokemonEnergyType[]): string {
  return `pokemon:${normalizePokemonTypes(types).join('-')}`;
}

export function getPokemonTheme(types?: readonly PokemonEnergyType[]): PlayerTheme {
  const pokemonTypes = normalizePokemonTypes(types);
  const swatches = pokemonTypes.map((type) => POKEMON_ENERGY_COLORS[type]);
  const first = pokemonTypes[0];
  const gradientColors = (swatches.length === 1
    ? [shade(swatches[0], first === 'darkness' ? 0.5 : first === 'colorless' || first === 'metal' ? 0.72 : 0.56), swatches[0]]
    : swatches) as [string, string, ...string[]];
  const primary = swatches[0];
  const accent = swatches[swatches.length - 1];
  const lightPrimary = first === 'colorless' || first === 'metal' || first === 'lightning';

  return {
    id: getPokemonThemeId(pokemonTypes),
    name: pokemonTypes.map((type) => POKEMON_ENERGY_LABELS[type]).join(' / '),
    example: pokemonTypes.join(' · '),
    labels: BASE_COUNTER_LABELS,
    gradientColors,
    colors: {
      ...DEFAULT_THEME_VALUES.colors,
      primary,
      accent,
      background: first === 'darkness' ? '#08080D' : lightPrimary ? '#25272A' : shade(primary, 0.15),
      surface: first === 'darkness' ? '#15151B' : lightPrimary ? '#303338' : shade(primary, 0.23),
      border: lightPrimary ? '#D5D9DE' : shade(accent, 0.78),
      text: '#FFFFFF',
      mutedText: '#D0D4DC',
    },
    icons: DEFAULT_THEME_VALUES.icons,
    sounds: DEFAULT_THEME_VALUES.sounds,
    animations: DEFAULT_THEME_VALUES.animations,
    typography: DEFAULT_THEME_VALUES.typography,
  };
}

export function getCustomThemeId(theme: EncodedCustomTheme): string {
  return `custom:${encodeURIComponent(JSON.stringify(theme))}`;
}

function decodeCustomTheme(id: string): PlayerTheme | null {
  try {
    const raw = decodeURIComponent(id.slice('custom:'.length));
    const theme = JSON.parse(raw) as EncodedCustomTheme;
    if (!theme?.id || !theme?.colors?.primary || !theme?.colors?.accent) return null;
    return {
      id,
      name: theme.name || 'Custom Theme',
      example: theme.description || 'Custom player theme',
      labels: BASE_COUNTER_LABELS,
      gradientColors: [theme.colors.background || '#080A0F', theme.colors.primary, theme.colors.accent],
      backgroundImageUri: theme.assets?.backgroundImage?.uri,
      colors: {
        ...DEFAULT_THEME_VALUES.colors,
        ...theme.colors,
        border: theme.colors.accent,
      },
      icons: DEFAULT_THEME_VALUES.icons,
      sounds: {
        damage: theme.assets?.damageSound?.uri,
        heal: theme.assets?.healSound?.uri,
        turnStart: theme.assets?.turnSound?.uri,
      },
      animations: { ...DEFAULT_THEME_VALUES.animations, ...theme.animations },
      typography: DEFAULT_THEME_VALUES.typography,
    };
  } catch {
    return null;
  }
}

export const DEFAULT_PLAYER_THEME_ID = getManaThemeId(['C']);

export const THEME_PACKS: PlayerTheme[] = [getManaTheme(['C'])];
export const THEMES_BY_ID: Record<string, PlayerTheme> = { [DEFAULT_PLAYER_THEME_ID]: THEME_PACKS[0] };

export function getThemePack(id?: string): PlayerTheme {
  if (id?.startsWith('custom:')) return decodeCustomTheme(id) ?? getManaTheme(['C']);
  if (id?.startsWith('pokemon:')) {
    const types = id.slice(8).split('-').filter((type): type is PokemonEnergyType => POKEMON_TYPE_ORDER.includes(type as PokemonEnergyType));
    return getPokemonTheme(types);
  }
  if (id?.startsWith('mana:')) {
    const colors = id.slice(5).split('-').filter((color): color is ManaColor => MANA_ORDER.includes(color as ManaColor));
    return getManaTheme(colors);
  }
  return getManaTheme(['C']);
}

export function getPlayerTheme(id?: string): PlayerTheme {
  return getThemePack(id);
}
