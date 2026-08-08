import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeAnimation } from '../themes';

const CUSTOM_THEMES_KEY = '@cardsync/custom-themes-v1';

export type ThemeAssetSlot = {
  uri?: string;
  name?: string;
  mimeType?: string;
};

export type CustomTheme = {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    lifeGain: string;
    lifeLoss: string;
  };
  animations: {
    damage: ThemeAnimation;
    heal: ThemeAnimation;
    turnStart: ThemeAnimation;
    counterAdd: ThemeAnimation;
  };
  assets: {
    backgroundImage: ThemeAssetSlot;
    previewImage: ThemeAssetSlot;
    damageSound: ThemeAssetSlot;
    healSound: ThemeAssetSlot;
    counterSound: ThemeAssetSlot;
    turnSound: ThemeAssetSlot;
    music: ThemeAssetSlot;
  };
  createdAt: number;
  updatedAt: number;
};

export function createCustomThemeDraft(): CustomTheme {
  const now = Date.now();
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    description: '',
    colors: {
      primary: '#4F7CFF',
      accent: '#9AB4FF',
      background: '#080A0F',
      surface: '#11141B',
      text: '#FFFFFF',
      mutedText: '#A8AEB9',
      lifeGain: '#28E66F',
      lifeLoss: '#FF3B4F',
    },
    animations: {
      damage: 'shake',
      heal: 'pulse',
      turnStart: 'glow',
      counterAdd: 'spring',
    },
    assets: {
      backgroundImage: {},
      previewImage: {},
      damageSound: {},
      healSound: {},
      counterSound: {},
      turnSound: {},
      music: {},
    },
    createdAt: now,
    updatedAt: now,
  };
}

export async function loadCustomThemes(): Promise<CustomTheme[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_THEMES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CustomTheme[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCustomThemes(themes: CustomTheme[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
}

export async function upsertCustomTheme(theme: CustomTheme): Promise<CustomTheme[]> {
  const themes = await loadCustomThemes();
  const exists = themes.some((item) => item.id === theme.id);
  const next = exists ? themes.map((item) => item.id === theme.id ? theme : item) : [theme, ...themes];
  await saveCustomThemes(next);
  return next;
}

export async function deleteCustomTheme(id: string): Promise<CustomTheme[]> {
  const next = (await loadCustomThemes()).filter((theme) => theme.id !== id);
  await saveCustomThemes(next);
  return next;
}
