import type { RulesPack } from './types';

export const yugiohRules: RulesPack = {
  key: 'yugioh',
  name: 'Yu-Gi-Oh!',
  phases: ['DRAW', 'STANDBY', 'MAIN 1', 'BATTLE', 'MAIN 2', 'END'],
  supportsMana: false,
  defaultCounter: 'spellCounter',
  counterGroups: [
    { title: 'DUEL COUNTERS', roles: ['spellCounter', 'turnCounter', 'enemy'] },
    { title: 'EFFECTS', roles: ['buff', 'debuff', 'status', 'custom'] },
  ],
  presets: [
    { id: 'yugioh', gameKey: 'yugioh', game: 'YU-GI-OH!', mode: 'Duel', players: 2, startingValue: 8000, metric: 'LP', step: 500 },
  ],
};
