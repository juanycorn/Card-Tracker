import { useLocalSearchParams } from 'expo-router';
import GameScreenSafe from '../screens/GameScreenSafe';
import PokemonGameScreen from '../screens/PokemonGameScreen';

export default function GameRoute() {
  const params = useLocalSearchParams<{ game?: string }>();
  const game = (params.game ?? '').toUpperCase();
  if (game.includes('POKÉMON') || game.includes('POKEMON')) return <PokemonGameScreen />;
  return <GameScreenSafe />;
}
