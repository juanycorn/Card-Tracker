import type { RulesPack } from './types';

export const magicRules: RulesPack = {
  key: 'magic',
  name: 'Magic: The Gathering',
  phases: ['UNTAP', 'UPKEEP', 'DRAW', 'MAIN 1', 'COMBAT', 'MAIN 2', 'END'],
  supportsMana: true,
  defaultCounter: 'treasure',
  counterGroups: [
    { title: 'PLAYER COUNTERS', roles: ['treasure', 'food', 'poison', 'energy', 'experience'] },
    { title: 'CREATURE / EFFECTS', roles: ['enemy', 'buff', 'debuff', 'objective'] },
    { title: 'GAME STATE', roles: ['storm', 'monarch', 'initiative', 'daynight', 'custom'] },
  ],
  presets: [
    { id: 'mtg-commander', gameKey: 'magic', game: 'MAGIC', mode: 'Commander', players: 4, startingValue: 40, metric: 'LIFE', step: 5 },
    { id: 'mtg-standard', gameKey: 'magic', game: 'MAGIC', mode: 'Standard / Modern', players: 2, startingValue: 20, metric: 'LIFE', step: 5 },
    { id: 'mtg-brawl', gameKey: 'magic', game: 'MAGIC', mode: 'Brawl', players: 2, startingValue: 25, metric: 'LIFE', step: 5 },
  ],
};
