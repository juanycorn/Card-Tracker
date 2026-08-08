import { useAudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';
import type { SavedCounter } from '../storage/gameSave';
import type { PlayerTheme } from '../themes';

export type DynamicMusicState = 'turn' | 'combat' | 'winning' | 'desperation' | 'victory' | 'defeat' | 'silent';

const POSITIVE_COUNTERS = new Set(['buff', 'treasure', 'food', 'resource', 'experience', 'energy', 'attachedEnergy', 'spellCounter']);

export function isDesperation(value: number, startingValue: number): boolean {
  const threshold = Math.max(1, Math.ceil(startingValue * 0.25));
  return value > 0 && value <= threshold;
}

export function isWinning(value: number, startingValue: number, counters: SavedCounter[]): boolean {
  const highHealth = startingValue > 0 && value >= Math.max(startingValue + 10, Math.ceil(startingValue * 1.75));
  const buffScore = counters.reduce((sum, counter) => POSITIVE_COUNTERS.has(counter.role) ? sum + Math.max(0, counter.value) + Math.max(0, counter.secondaryValue ?? 0) : sum, 0);
  return highHealth || buffScore >= 10;
}

export function resolveDynamicMusic({ value, startingValue, counters, phase, alive = true }: { value: number; startingValue: number; counters: SavedCounter[]; phase?: string; alive?: boolean }): DynamicMusicState {
  if (!alive) return 'silent';
  if (isDesperation(value, startingValue)) return 'desperation';
  if (isWinning(value, startingValue, counters)) return 'winning';
  const normalized = (phase ?? '').toUpperCase();
  if (normalized.includes('COMBAT') || normalized.includes('ATTACK') || normalized.includes('BATTLE')) return 'combat';
  return 'turn';
}

function uriFor(theme: PlayerTheme, state: DynamicMusicState): string | undefined {
  if (state === 'silent') return undefined;
  return theme.music[state];
}

export function useDynamicThemeAudio(theme: PlayerTheme, state: DynamicMusicState) {
  const player = useAudioPlayer(null);
  const currentUri = useRef<string | undefined>(undefined);

  useEffect(() => {
    const uri = uriFor(theme, state);
    if (!uri) {
      player.pause();
      currentUri.current = undefined;
      return;
    }
    if (currentUri.current !== uri) {
      player.pause();
      player.replace(uri);
      player.loop = state !== 'victory' && state !== 'defeat';
      player.volume = 1;
      currentUri.current = uri;
    }
    void player.seekTo(0);
    player.play();
  }, [player, state, theme]);

  return player;
}

export function useOneShotThemeAudio() {
  const player = useAudioPlayer(null);
  return (uri?: string) => {
    if (!uri) return;
    player.pause();
    player.replace(uri);
    player.loop = false;
    void player.seekTo(0);
    player.play();
  };
}
