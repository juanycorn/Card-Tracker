import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CounterRole, ManaColor } from '../games';

const DECK_PROFILES_KEY = '@cardsync/deck-profiles-v1';

export type DeckProfile = {
  id: string;
  name: string;
  playerName: string;
  presetId: string;
  themeId: string;
  manaColors: ManaColor[];
  preferredCounters: CounterRole[];
  createdAt: number;
  updatedAt: number;
};

export async function loadDeckProfiles(): Promise<DeckProfile[]> {
  const raw = await AsyncStorage.getItem(DECK_PROFILES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as DeckProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDeckProfiles(profiles: DeckProfile[]): Promise<void> {
  await AsyncStorage.setItem(DECK_PROFILES_KEY, JSON.stringify(profiles));
}

export async function upsertDeckProfile(profile: DeckProfile): Promise<DeckProfile[]> {
  const profiles = await loadDeckProfiles();
  const existingIndex = profiles.findIndex((item) => item.id === profile.id);
  const next = existingIndex === -1
    ? [profile, ...profiles]
    : profiles.map((item) => item.id === profile.id ? profile : item);
  await saveDeckProfiles(next);
  return next;
}

export async function deleteDeckProfile(id: string): Promise<DeckProfile[]> {
  const profiles = (await loadDeckProfiles()).filter((profile) => profile.id !== id);
  await saveDeckProfiles(profiles);
  return profiles;
}
