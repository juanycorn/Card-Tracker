import { BASE_COUNTER_LABELS } from '../games/counters';
import type { CounterRole } from '../games';

export type ThemePack = {
  id: string;
  name: string;
  example: string;
  labels: Record<CounterRole, string>;
};

export const THEME_PACKS: ThemePack[] = [
  { id: 'arcane', name: 'Arcane', example: 'Enemy · Resource · Buff', labels: BASE_COUNTER_LABELS },
  {
    id: 'fantasy', name: 'Fantasy Raid', example: 'Goblins · Gold · Blessing',
    labels: { ...BASE_COUNTER_LABELS, enemy: 'Enemy Modifier', treasure: 'Gold', food: 'Rations', resource: 'Supplies', buff: 'Blessing', debuff: 'Curse', objective: 'Quest', poison: 'Venom', energy: 'Stamina', experience: 'Renown', storm: 'Combo', monarch: 'Crowned', initiative: 'Dungeon Lead', inspiration: 'Heroic Spark' },
  },
  {
    id: 'scifi', name: 'Sci-Fi', example: 'Hostiles · Energy Cells · Upgrade',
    labels: { ...BASE_COUNTER_LABELS, enemy: 'Target Modifier', treasure: 'Credits', food: 'Med Packs', resource: 'Energy Cells', buff: 'Upgrade', debuff: 'Malfunction', objective: 'Mission', poison: 'Contamination', energy: 'Charge', experience: 'Intel', storm: 'Chain', monarch: 'Command', initiative: 'Priority', daynight: 'Cycle', tempHp: 'Shield HP', spellSlot: 'Ability Charge' },
  },
];

export const THEMES_BY_ID = Object.fromEntries(THEME_PACKS.map((theme) => [theme.id, theme])) as Record<string, ThemePack>;

export function getThemePack(id?: string): ThemePack {
  return THEMES_BY_ID[id ?? 'arcane'] ?? THEMES_BY_ID.arcane;
}
