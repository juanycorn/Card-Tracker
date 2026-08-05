import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CounterRole, ManaColor } from '../games';

export const GAME_SAVE_KEY = '@cardsync/active-game-v1';

export type SavedCounter = {
  id: string;
  role: CounterRole;
  value: number;
  secondaryValue?: number;
  active?: boolean;
  temporary: boolean;
};

export type SavedPlayer = {
  id: number;
  name: string;
  value: number;
  counters: SavedCounter[];
  mana: Record<ManaColor, number>;
  manaColors: ManaColor[];
};

export type SavedGame = {
  version: 1;
  updatedAt: number;
  config: {
    game: string;
    mode: string;
    players: number;
    start: number;
    metric: string;
    step: number;
    theme: string;
  };
  state: {
    players: SavedPlayer[];
    activePlayer: number;
    activePhase: number;
  };
};

export async function loadSavedGame(): Promise<SavedGame | null> {
  const raw = await AsyncStorage.getItem(GAME_SAVE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SavedGame;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveGame(game: SavedGame): Promise<void> {
  await AsyncStorage.setItem(GAME_SAVE_KEY, JSON.stringify(game));
}

export async function clearSavedGame(): Promise<void> {
  await AsyncStorage.removeItem(GAME_SAVE_KEY);
}
