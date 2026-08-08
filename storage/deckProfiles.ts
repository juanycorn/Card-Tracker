import AsyncStorage from '@react-native-async-storage/async-storage';
import { RULES_PRESETS, type CounterRole, type GameKey, type ManaColor } from '../games';
import type { PokemonEnergyType } from '../games/pokemonEnergy';

const BATTLE_PROFILES_KEY = '@cardsync/deck-profiles-v1';

export type BattleProfile = {
  id: string;
  name: string;
  playerName: string;
  gameKey: GameKey;
  /** Legacy field kept only so older local saves can be migrated safely. */
  presetId?: string;
  themeId: string;
  manaColors: ManaColor[];
  pokemonEnergyTypes?: PokemonEnergyType[];
  preferredCounters: CounterRole[];
  createdAt: number;
  updatedAt: number;
};

export type DeckProfile = BattleProfile;

function inferGameKey(profile: Partial<BattleProfile> & { presetId?: string }): GameKey {
  if (profile.gameKey) return profile.gameKey;
  const legacyPreset = RULES_PRESETS.find((item) => item.id === profile.presetId);
  return legacyPreset?.gameKey ?? 'magic';
}

export async function loadBattleProfiles(): Promise<BattleProfile[]> {
  const raw = await AsyncStorage.getItem(BATTLE_PROFILES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as BattleProfile[];
    if (!Array.isArray(parsed)) return [];
    const migrated = parsed.map((profile) => ({
      ...profile,
      gameKey: inferGameKey(profile),
      pokemonEnergyTypes: profile.pokemonEnergyTypes ?? [],
    }));
    if (migrated.some((profile, index) => profile.gameKey !== parsed[index]?.gameKey || !Array.isArray(parsed[index]?.pokemonEnergyTypes))) {
      await saveBattleProfiles(migrated);
    }
    return migrated;
  } catch {
    return [];
  }
}

export async function saveBattleProfiles(profiles: BattleProfile[]): Promise<void> {
  await AsyncStorage.setItem(BATTLE_PROFILES_KEY, JSON.stringify(profiles));
}

export async function upsertBattleProfile(profile: BattleProfile): Promise<BattleProfile[]> {
  const profiles = await loadBattleProfiles();
  const existingIndex = profiles.findIndex((item) => item.id === profile.id);
  const next = existingIndex === -1
    ? [profile, ...profiles]
    : profiles.map((item) => item.id === profile.id ? profile : item);
  await saveBattleProfiles(next);
  return next;
}

export async function deleteBattleProfile(id: string): Promise<BattleProfile[]> {
  const profiles = (await loadBattleProfiles()).filter((profile) => profile.id !== id);
  await saveBattleProfiles(profiles);
  return profiles;
}

export const loadDeckProfiles = loadBattleProfiles;
export const saveDeckProfiles = saveBattleProfiles;
export const upsertDeckProfile = upsertBattleProfile;
export const deleteDeckProfile = deleteBattleProfile;
