import { BASE_COUNTER_LABELS } from '../games/counters';
import type { CounterRole } from '../games';

export type ThemeAnimation = 'none' | 'pulse' | 'shake' | 'spring' | 'glow';

export type PlayerTheme = {
  id: string;
  name: string;
  example: string;
  labels: Record<CounterRole, string>;
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

// Backwards-compatible alias while older screens still import ThemePack.
export type ThemePack = PlayerTheme;

const DEFAULT_THEME_VALUES = {
  colors: {
    primary: '#7560FF',
    accent: '#A899FF',
    background: '#080A0F',
    surface: '#11141B',
    border: '#252936',
    text: '#FFFFFF',
    mutedText: '#8E94A6',
    lifeGain: '#4ADE80',
    lifeLoss: '#FF5F6D',
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

function createTheme(theme: Pick<PlayerTheme, 'id' | 'name' | 'example' | 'labels'> & Partial<Omit<PlayerTheme, 'id' | 'name' | 'example' | 'labels'>>): PlayerTheme {
  return {
    ...theme,
    colors: { ...DEFAULT_THEME_VALUES.colors, ...theme.colors },
    icons: { ...DEFAULT_THEME_VALUES.icons, ...theme.icons },
    sounds: { ...DEFAULT_THEME_VALUES.sounds, ...theme.sounds },
    animations: { ...DEFAULT_THEME_VALUES.animations, ...theme.animations },
    typography: { ...DEFAULT_THEME_VALUES.typography, ...theme.typography },
  };
}

export const THEME_PACKS: PlayerTheme[] = [
  createTheme({
    id: 'arcane',
    name: 'Arcane',
    example: 'Enemy · Resource · Buff',
    labels: BASE_COUNTER_LABELS,
  }),
  createTheme({
    id: 'fantasy',
    name: 'Fantasy Raid',
    example: 'Goblins · Gold · Blessing',
    labels: {
      ...BASE_COUNTER_LABELS,
      enemy: 'Enemy Modifier',
      treasure: 'Gold',
      food: 'Rations',
      resource: 'Supplies',
      buff: 'Blessing',
      debuff: 'Curse',
      objective: 'Quest',
      poison: 'Venom',
      energy: 'Stamina',
      experience: 'Renown',
      storm: 'Combo',
      monarch: 'Crowned',
      initiative: 'Dungeon Lead',
      inspiration: 'Heroic Spark',
    },
    colors: {
      primary: '#7A9B4A',
      accent: '#D6B85A',
      background: '#10130C',
      surface: '#191D12',
      border: '#46552D',
      text: '#FFF8DE',
      mutedText: '#AFA98C',
      lifeGain: '#7ED957',
      lifeLoss: '#D95D4F',
    },
    animations: { turnStart: 'glow' },
  }),
  createTheme({
    id: 'scifi',
    name: 'Sci-Fi',
    example: 'Hostiles · Energy Cells · Upgrade',
    labels: {
      ...BASE_COUNTER_LABELS,
      enemy: 'Target Modifier',
      treasure: 'Credits',
      food: 'Med Packs',
      resource: 'Energy Cells',
      buff: 'Upgrade',
      debuff: 'Malfunction',
      objective: 'Mission',
      poison: 'Contamination',
      energy: 'Charge',
      experience: 'Intel',
      storm: 'Chain',
      monarch: 'Command',
      initiative: 'Priority',
      daynight: 'Cycle',
      tempHp: 'Shield HP',
      spellSlot: 'Ability Charge',
    },
    colors: {
      primary: '#23C7D9',
      accent: '#79F0FF',
      background: '#061014',
      surface: '#0B1C22',
      border: '#1F5661',
      text: '#E9FDFF',
      mutedText: '#78A8B0',
      lifeGain: '#43E6A5',
      lifeLoss: '#FF647C',
    },
    animations: { damage: 'shake', heal: 'pulse', turnStart: 'glow' },
  }),
];

export const THEMES_BY_ID = Object.fromEntries(THEME_PACKS.map((theme) => [theme.id, theme])) as Record<string, PlayerTheme>;

export function getThemePack(id?: string): PlayerTheme {
  return THEMES_BY_ID[id ?? 'arcane'] ?? THEMES_BY_ID.arcane;
}

export function getPlayerTheme(id?: string): PlayerTheme {
  return getThemePack(id);
}

export const DEFAULT_PLAYER_THEME_ID = 'arcane';
