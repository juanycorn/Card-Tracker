export type GameKey = 'magic' | 'pokemon' | 'yugioh' | 'dnd';
export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';
export type CounterKind = 'single' | 'stats' | 'toggle';

export type CounterRole =
  | 'enemy' | 'treasure' | 'food' | 'resource' | 'buff' | 'debuff'
  | 'objective' | 'poison' | 'energy' | 'experience' | 'storm'
  | 'monarch' | 'initiative' | 'daynight' | 'damage' | 'status'
  | 'attachedEnergy' | 'spellCounter' | 'turnCounter' | 'tempHp'
  | 'inspiration' | 'condition' | 'spellSlot' | 'custom';

export type CounterDefinition = {
  role: CounterRole;
  label: string;
  kind: CounterKind;
};

export type CounterGroup = {
  title: string;
  roles: CounterRole[];
};

export type RulesPreset = {
  id: string;
  gameKey: GameKey;
  game: string;
  mode: string;
  players: number;
  startingValue: number;
  metric: string;
  step: number;
};

export type RulesPack = {
  key: GameKey;
  name: string;
  phases: string[];
  supportsMana: boolean;
  defaultCounter: CounterRole;
  counterGroups: CounterGroup[];
  presets: RulesPreset[];
};
