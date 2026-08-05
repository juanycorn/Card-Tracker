import type { CounterKind, CounterRole } from './types';

export const COUNTER_KIND: Record<CounterRole, CounterKind> = {
  enemy: 'stats', treasure: 'single', food: 'single', resource: 'single', buff: 'single', debuff: 'single',
  objective: 'single', poison: 'single', energy: 'single', experience: 'single', storm: 'single',
  monarch: 'toggle', initiative: 'toggle', daynight: 'toggle', damage: 'single', status: 'toggle',
  attachedEnergy: 'single', spellCounter: 'single', turnCounter: 'single', tempHp: 'single',
  inspiration: 'toggle', condition: 'toggle', spellSlot: 'single', custom: 'single',
};

export const BASE_COUNTER_LABELS: Record<CounterRole, string> = {
  enemy: 'Creature Modifier', treasure: 'Treasure', food: 'Food', resource: 'Resource',
  buff: 'Buff', debuff: 'Debuff', objective: 'Objective', poison: 'Poison', energy: 'Energy',
  experience: 'Experience', storm: 'Storm Count', monarch: 'Monarch', initiative: 'Initiative',
  daynight: 'Day / Night', damage: 'Damage Counters', status: 'Status Condition',
  attachedEnergy: 'Attached Energy', spellCounter: 'Spell Counter', turnCounter: 'Turn Counter',
  tempHp: 'Temporary HP', inspiration: 'Inspiration', condition: 'Condition', spellSlot: 'Spell Slot',
  custom: 'Custom Counter',
};
