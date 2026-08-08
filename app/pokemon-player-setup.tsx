import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RULES_PRESETS } from '../games';
import { POKEMON_ENERGY_COLORS, POKEMON_ENERGY_LABELS, POKEMON_ENERGY_TYPES, emptyPokemonEnergy, type PokemonEnergyType } from '../games/pokemonEnergy';
import { DEFAULT_PLAYER_THEME_ID, getPlayerTheme } from '../themes';
import { loadBattleProfiles, type BattleProfile } from '../storage/deckProfiles';
import { saveGame, type SavedPlayer } from '../storage/gameSave';

type PokemonSavedPlayer = SavedPlayer & {
  pokemonEnergyTypes: PokemonEnergyType[];
  pokemonEnergy: Record<PokemonEnergyType, number>;
};

type Choice = { profileId?: string; energyTypes: PokemonEnergyType[] };
const makeChoice = (): Choice => ({ energyTypes: [] });

export default function PokemonPlayerSetupScreen() {
  const params = useLocalSearchParams<{ presetId?: string; players?: string }>();
  const preset = useMemo(() => RULES_PRESETS.find((item) => item.id === params.presetId) ?? RULES_PRESETS.find((item) => item.gameKey === 'pokemon')!, [params.presetId]);
  const playerCount = Math.min(6, Math.max(1, Number(params.players) || preset.players));
  const [profiles, setProfiles] = useState<BattleProfile[]>([]);
  const [choices, setChoices] = useState<Choice[]>(() => Array.from({ length: playerCount }, makeChoice));
  const [playerIndex, setPlayerIndex] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    loadBattleProfiles().then((items) => { if (active) setProfiles(items.filter((item) => item.gameKey === 'pokemon')); });
    return () => { active = false; };
  }, []));

  const current = choices[playerIndex] ?? makeChoice();
  const selectedProfile = profiles.find((profile) => profile.id === current.profileId);
  const selectedTheme = getPlayerTheme(selectedProfile?.themeId ?? DEFAULT_PLAYER_THEME_ID);

  const selectProfile = (profile?: BattleProfile) => setChoices((items) => items.map((choice, index) => index === playerIndex ? { ...choice, profileId: profile?.id } : choice));
  const toggleEnergy = (type: PokemonEnergyType) => setChoices((items) => items.map((choice, index) => {
    if (index !== playerIndex) return choice;
    const energyTypes = choice.energyTypes.includes(type) ? choice.energyTypes.filter((item) => item !== type) : [...choice.energyTypes, type];
    return { ...choice, energyTypes };
  }));

  const finish = async () => {
    const players: PokemonSavedPlayer[] = Array.from({ length: playerCount }, (_, index) => {
      const choice = choices[index] ?? makeChoice();
      const profile = profiles.find((item) => item.id === choice.profileId);
      return {
        id: index + 1,
        name: profile?.playerName || profile?.name || `PLAYER ${index + 1}`,
        value: preset.startingValue,
        counters: [],
        mana: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
        manaColors: [],
        themeId: profile?.themeId ?? DEFAULT_PLAYER_THEME_ID,
        deckProfileId: profile?.id,
        preferredCounters: profile?.preferredCounters ?? [],
        pokemonEnergyTypes: choice.energyTypes,
        pokemonEnergy: emptyPokemonEnergy(),
      };
    });

    await saveGame({
      version: 1,
      updatedAt: Date.now(),
      config: { game: preset.game, mode: preset.mode, players: playerCount, start: preset.startingValue, metric: preset.metric, step: preset.step, theme: DEFAULT_PLAYER_THEME_ID },
      state: { players, activePlayer: 0, activePhase: 0 },
    });
    router.replace({ pathname: '/game', params: { game: preset.game, mode: preset.mode, players: String(playerCount), start: String(preset.startingValue), metric: preset.metric, step: String(preset.step), theme: DEFAULT_PLAYER_THEME_ID, resume: '1' } });
  };

  const confirm = async () => {
    if (playerIndex === playerCount - 1) return finish();
    setPlayerIndex((value) => value + 1);
  };

  return <SafeAreaView style={[styles.safeArea, { backgroundColor: selectedTheme.colors.background }]}>
    <View style={styles.header}>
      <Pressable onPress={() => playerIndex === 0 ? router.back() : setPlayerIndex((value) => value - 1)} style={styles.back}><Text style={styles.backText}>‹ BACK</Text></Pressable>
      <View style={styles.headerCenter}><Text style={styles.eyebrow}>POKÉMON TCG</Text><Text style={styles.title}>PLAYER {playerIndex + 1}</Text><Text style={styles.subtitle}>Choose a Battle Profile, then the Energy types this deck uses.</Text></View>
      <Text style={styles.progress}>{playerIndex + 1}/{playerCount}</Text>
    </View>

    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.section}>BATTLE PROFILE</Text>
      <View style={styles.grid}>
        <Pressable onPress={() => selectProfile()} style={[styles.card, !current.profileId && styles.selected]}><Text style={styles.cardTitle}>No Profile</Text><Text style={styles.cardMeta}>Manual Pokémon setup</Text></Pressable>
        {profiles.map((profile) => <Pressable key={profile.id} onPress={() => selectProfile(profile)} style={[styles.card, current.profileId === profile.id && styles.selected]}><Text style={styles.cardTitle}>{profile.name}</Text><Text style={styles.cardMeta}>{profile.playerName || 'Pokémon Battle Profile'}</Text></Pressable>)}
      </View>

      <Text style={styles.section}>ENERGY TYPES</Text>
      <Text style={styles.help}>Pick every Energy type you want available in this player's Energy drawer.</Text>
      <View style={styles.energyGrid}>
        {POKEMON_ENERGY_TYPES.map((type) => {
          const active = current.energyTypes.includes(type);
          const color = POKEMON_ENERGY_COLORS[type];
          return <Pressable key={type} onPress={() => toggleEnergy(type)} style={[styles.energyCard, active && { borderColor: color, borderWidth: 3 }]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.energyName}>{POKEMON_ENERGY_LABELS[type]}</Text>
            {type === 'fairy' && <Text style={styles.legacy}>LEGACY</Text>}
          </Pressable>;
        })}
      </View>
    </ScrollView>

    <View style={styles.footer}><Pressable onPress={confirm} style={[styles.confirm, { backgroundColor: selectedTheme.colors.primary }]}><Text style={styles.confirmText}>{playerIndex === playerCount - 1 ? 'CONFIRM & START GAME' : `CONFIRM PLAYER ${playerIndex + 1}`}</Text></Pressable></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 82, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { minWidth: 78, paddingVertical: 10, borderRadius: 12, backgroundColor: '#151820', alignItems: 'center' },
  backText: { color: '#C5C9D4', fontSize: 10, fontWeight: '900' },
  headerCenter: { flex: 1, alignItems: 'center' },
  eyebrow: { color: '#9EA5B2', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#B9BEC8', fontSize: 10, marginTop: 2, textAlign: 'center' },
  progress: { color: '#FFFFFF', minWidth: 44, textAlign: 'center', fontWeight: '900' },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  section: { color: '#D3D6DD', fontSize: 9, fontWeight: '900', letterSpacing: 1.6, marginTop: 12, marginBottom: 7 },
  help: { color: '#9EA5B2', fontSize: 9, marginBottom: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  card: { width: '31.5%', minHeight: 76, flexGrow: 1, borderRadius: 14, borderWidth: 1, borderColor: '#343947', backgroundColor: '#11141B', padding: 12, justifyContent: 'center' },
  selected: { borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#1C2029' },
  cardTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  cardMeta: { color: '#9BA1AE', fontSize: 9, marginTop: 4 },
  energyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  energyCard: { width: '31%', minHeight: 60, flexGrow: 1, borderRadius: 13, borderWidth: 1, borderColor: '#353B47', backgroundColor: '#151820', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  energyName: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  legacy: { color: '#9AA0AD', fontSize: 6, fontWeight: '900' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, backgroundColor: '#0D1016', borderTopWidth: 1, borderTopColor: '#2B303C' },
  confirm: { minHeight: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});