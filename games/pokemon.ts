import type { RulesPack } from './types';

export const pokemonRules: RulesPack = {
  key: 'pokemon',
  name: 'Pokémon TCG',
  phases: ['DRAW', 'ACTIONS', 'ATTACK', 'CHECKUP'],
  supportsMana: false,
  defaultCounter: 'damage',
  counterGroups: [
    { title: 'POKÉMON', roles: ['damage', 'status', 'attachedEnergy'] },
    { title: 'MATCH', roles: ['turnCounter', 'objective', 'custom'] },
  ],
  presets: [
    { id: 'pokemon', gameKey: 'pokemon', game: 'POKÉMON TCG', mode: 'Standard Match', players: 2, startingValue: 6, metric: 'PRIZE CARDS', step: 1 },
  ],
};
