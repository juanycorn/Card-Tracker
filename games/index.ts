import { dndRules } from './dnd';
import { magicRules } from './magic';
import { pokemonRules } from './pokemon';
import type { GameKey, RulesPack, RulesPreset } from './types';
import { yugiohRules } from './yugioh';

export const RULES_PACKS: Record<GameKey, RulesPack> = {
  magic: magicRules,
  pokemon: pokemonRules,
  yugioh: yugiohRules,
  dnd: dndRules,
};

export const RULES_PRESETS: RulesPreset[] = Object.values(RULES_PACKS).flatMap((pack) => pack.presets);

export function normalizeGameKey(game?: string): GameKey {
  const normalized = (game ?? '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('POKEMON')) return 'pokemon';
  if (normalized.includes('YU-GI-OH')) return 'yugioh';
  if (normalized.includes('D&D') || normalized.includes('DND')) return 'dnd';
  return 'magic';
}

export function getRulesPack(game?: string): RulesPack {
  return RULES_PACKS[normalizeGameKey(game)];
}

export type { CounterGroup, CounterKind, CounterRole, GameKey, ManaColor, RulesPack, RulesPreset } from './types';
