export type PokemonEnergyType = 'grass' | 'fire' | 'water' | 'lightning' | 'psychic' | 'fighting' | 'darkness' | 'metal' | 'colorless' | 'fairy' | 'dragon';

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
  'dragon',
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
  dragon: 'Dragon',
};

export const POKEMON_ENERGY_COLORS: Record<PokemonEnergyType, string> = {
  grass: '#25D366',
  fire: '#FF4D35',
  water: '#278CFF',
  lightning: '#FFD329',
  psychic: '#B85CFF',
  fighting: '#C96E3B',
  darkness: '#26262D',
  metal: '#BFC8D2',
  colorless: '#ECE9E1',
  fairy: '#FF83C8',
  dragon: '#6D5BFF',
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
  dragon: 0,
});
