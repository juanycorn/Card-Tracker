export type PokemonEnergyType = 'grass' | 'fire' | 'water' | 'lightning' | 'psychic' | 'fighting' | 'darkness' | 'metal' | 'colorless' | 'fairy';

export const POKEMON_ENERGY_TYPES: PokemonEnergyType[] = [
  'grass',
  'fire',
  'water',
  'lightning',
  'psychic',
  'fighting',
  'darkness',
  'metal',
  'colorless',
  'fairy',
];

export const POKEMON_ENERGY_LABELS: Record<PokemonEnergyType, string> = {
  grass: 'Grass',
  fire: 'Fire',
  water: 'Water',
  lightning: 'Lightning',
  psychic: 'Psychic',
  fighting: 'Fighting',
  darkness: 'Darkness',
  metal: 'Metal',
  colorless: 'Colorless',
  fairy: 'Fairy',
};

export const POKEMON_ENERGY_COLORS: Record<PokemonEnergyType, string> = {
  grass: '#38C96B',
  fire: '#FF573D',
  water: '#3E9BFF',
  lightning: '#FFD43B',
  psychic: '#C66BFF',
  fighting: '#D07A45',
  darkness: '#34343B',
  metal: '#AEB8C3',
  colorless: '#E4E1D8',
  fairy: '#FF8FCB',
};

export const emptyPokemonEnergy = (): Record<PokemonEnergyType, number> => ({
  grass: 0,
  fire: 0,
  water: 0,
  lightning: 0,
  psychic: 0,
  fighting: 0,
  darkness: 0,
  metal: 0,
  colorless: 0,
  fairy: 0,
});
