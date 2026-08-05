import type { RulesPack } from './types';

export const dndRules: RulesPack = {
  key: 'dnd',
  name: 'Dungeons & Dragons',
  phases: ['START', 'MOVE', 'ACTION', 'BONUS', 'END'],
  supportsMana: false,
  defaultCounter: 'tempHp',
  counterGroups: [
    { title: 'CHARACTER', roles: ['tempHp', 'inspiration', 'condition', 'spellSlot'] },
    { title: 'ENCOUNTER', roles: ['enemy', 'resource', 'objective', 'custom'] },
  ],
  presets: [
    { id: 'dnd', gameKey: 'dnd', game: 'D&D', mode: 'Party HP', players: 4, startingValue: 20, metric: 'HP', step: 5 },
  ],
};
