import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RULES_PRESETS } from '../games';
import { POKEMON_ENERGY_COLORS, POKEMON_ENERGY_LABELS, POKEMON_ENERGY_TYPES, emptyPokemonEnergy, type PokemonEnergyType } from '../games/pokemonEnergy';
import { DEFAULT_PLAYER_THEME_ID, getPlayerTheme, getPokemonTheme, getPokemonThemeId } from '../themes';
import { loadBattleProfiles, type BattleProfile } from '../storage/deckProfiles';
import { saveGame, type SavedPlayer } from '../storage/gameSave';

type PokemonSavedPlayer = SavedPlayer & {
  pokemonEnergyTypes: PokemonEnergyType[];
  pokemonEnergy: Record<PokemonEnergyType, number>;
};

type Choice = { profileId?: string; energyTypes: PokemonEnergyType[] };
const makeChoice = (): Choice => ({ energyTypes: [] });

function contrastTextColor(background: string): string {
  const clean = background.replace('#', '');
  if (clean.length !== 6) return '#FFFFFF';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#111318' : '#FFFFFF';
}

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
  const selectedTypes = selectedProfile?.pokemonEnergyTypes?.length ? selectedProfile.pokemonEnergyTypes : current.energyTypes;
  const generatedTheme = getPokemonTheme(selectedTypes);
  const selectedTheme = selectedProfile?.themeId?.startsWith('custom:') ? getPlayerTheme(selectedProfile.themeId) : generatedTheme;
  const confirmText = contrastTextColor(selectedTheme.colors.primary);

  const selectProfile = (profile?: BattleProfile) => setChoices((items) => items.map((choice, index) => {
    if (index !== playerIndex) return choice;
    if (!profile) return { ...choice, profileId: undefined };
    return { ...choice, profileId: profile.id, energyTypes: profile.pokemonEnergyTypes ?? [] };
  }));

  const toggleEnergy = (type: PokemonEnergyType) => {
    if (selectedProfile) return;
    setChoices((items) => items.map((choice, index) => {
      if (index !== playerIndex) return choice;
      const energyTypes = choice.energyTypes.includes(type) ? choice.energyTypes.filter((item) => item !== type) : [...choice.energyTypes, type];
      return { ...choice, energyTypes };
    }));
  };

  const finish = async () => {
    const players: PokemonSavedPlayer[] = Array.from({ length: playerCount }, (_, index) => {
      const choice = choices[index] ?? makeChoice();
      const profile = profiles.find((item) => item.id === choice.profileId);
      const energyTypes = profile?.pokemonEnergyTypes?.length ? profile.pokemonEnergyTypes : choice.energyTypes;
      const defaultThemeId = getPokemonThemeId(energyTypes);
      return {
        id: index + 1,
        name: profile?.playerName || profile?.name || `PLAYER ${index + 1}`,
        value: preset.startingValue,
        counters: [],
        mana: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
        manaColors: [],
        themeId: profile?.themeId?.startsWith('custom:') ? profile.themeId : defaultThemeId,
        deckProfileId: profile?.id,
        preferredCounters: profile?.preferredCounters ?? [],
        pokemonEnergyTypes: energyTypes,
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

  return <LinearGradient colors={selectedTheme.gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.root}>
    <View pointerEvents="none" style={styles.wash} />
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => playerIndex === 0 ? router.back() : setPlayerIndex((value) => value - 1)} style={styles.back}><Text style={styles.backText}>‹ BACK</Text></Pressable>
        <View style={styles.headerCenter}><Text style={styles.eyebrow}>POKÉMON TCG</Text><Text style={styles.title}>PLAYER {playerIndex + 1}</Text><Text style={styles.subtitle}>Choose a Battle Profile. Its saved Pokémon types and theme come with it.</Text></View>
        <Text style={styles.progress}>{playerIndex + 1}/{playerCount}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>BATTLE PROFILE</Text>
        <View style={styles.grid}>
          <Pressable onPress={() => selectProfile()} style={[styles.card, !current.profileId && styles.selected]}><Text style={styles.cardTitle}>No Profile</Text><Text style={styles.cardMeta}>Choose Pokémon types manually</Text></Pressable>
          {profiles.map((profile) => <Pressable key={profile.id} onPress={() => selectProfile(profile)} style={[styles.card, current.profileId === profile.id && styles.selected]}><Text style={styles.cardTitle}>{profile.name}</Text><Text style={styles.cardMeta}>{profile.playerName || 'Pokémon Battle Profile'}</Text><Text style={styles.cardTypes}>{profile.pokemonEnergyTypes?.length ? profile.pokemonEnergyTypes.map((type) => POKEMON_ENERGY_LABELS[type]).join(' / ') : 'No saved types'}</Text></Pressable>)}
        </View>

        {!selectedProfile && <>
          <Text style={styles.section}>POKÉMON / ENERGY TYPES</Text>
          <Text style={styles.help}>These types control the default theme and which Energy counters appear during the match.</Text>
          <View style={styles.energyGrid}>
            {POKEMON_ENERGY_TYPES.map((type) => {
              const active = selectedTypes.includes(type);
              const color = POKEMON_ENERGY_COLORS[type];
              return <Pressable key={type} onPress={() => toggleEnergy(type)} style={[styles.energyCard, active && { borderColor: color, borderWidth: 3 }]}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={styles.energyName}>{POKEMON_ENERGY_LABELS[type]}</Text>
                {type === 'fairy' && <Text style={styles.legacy}>LEGACY</Text>}
              </Pressable>;
            })}
          </View>
        </>}

        {selectedProfile && <View style={styles.profileIdentity}><Text style={styles.identityLabel}>SAVED TYPE IDENTITY</Text><Text style={styles.identityText}>{selectedTypes.length ? selectedTypes.map((type) => POKEMON_ENERGY_LABELS[type]).join(' · ') : 'Colorless default'}</Text></View>}

        <LinearGradient colors={selectedTheme.gradientColors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.preview, { borderColor: selectedTheme.colors.accent }]}>
          <View style={styles.previewWash} />
          <Text style={styles.previewSmall}>PLAYER {playerIndex + 1} THEME</Text>
          <Text style={styles.previewTitle}>{selectedProfile?.name ?? 'Pokémon Default'}</Text>
          <Text style={styles.previewMeta}>{selectedProfile?.themeId?.startsWith('custom:') ? selectedTheme.name : generatedTheme.name}</Text>
        </LinearGradient>
      </ScrollView>

      <View style={styles.footer}><Pressable onPress={confirm} style={[styles.confirm, { backgroundColor: selectedTheme.colors.primary }]}><Text style={[styles.confirmText, { color: confirmText }]}>{playerIndex === playerCount - 1 ? 'CONFIRM & START GAME' : `CONFIRM PLAYER ${playerIndex + 1}`}</Text></Pressable></View>
    </SafeAreaView>
  </LinearGradient>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  wash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,6,10,0.58)' },
  safeArea: { flex: 1 },
  header: { minHeight: 82, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { minWidth: 78, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(21,24,32,0.92)', alignItems: 'center' },
  backText: { color: '#C5C9D4', fontSize: 10, fontWeight: '900' },
  headerCenter: { flex: 1, alignItems: 'center' },
  eyebrow: { color: '#D5D9E0', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#D3D7DF', fontSize: 10, marginTop: 2, textAlign: 'center' },
  progress: { color: '#FFFFFF', minWidth: 44, textAlign: 'center', fontWeight: '900' },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  section: { color: '#F0F1F4', fontSize: 9, fontWeight: '900', letterSpacing: 1.6, marginTop: 12, marginBottom: 7 },
  help: { color: '#D0D4DC', fontSize: 9, marginBottom: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  card: { width: '31.5%', minHeight: 82, flexGrow: 1, borderRadius: 14, borderWidth: 1, borderColor: '#4A5060', backgroundColor: 'rgba(17,20,27,0.92)', padding: 12, justifyContent: 'center' },
  selected: { borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: 'rgba(28,32,41,0.96)' },
  cardTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  cardMeta: { color: '#B8BEC9', fontSize: 9, marginTop: 4 },
  cardTypes: { color: '#D7DBE2', fontSize: 7, marginTop: 4, fontWeight: '800' },
  energyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  energyCard: { width: '31%', minHeight: 60, flexGrow: 1, borderRadius: 13, borderWidth: 1, borderColor: '#4A5060', backgroundColor: 'rgba(21,24,32,0.94)', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  energyName: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  legacy: { color: '#AAB0BB', fontSize: 6, fontWeight: '900' },
  profileIdentity: { marginTop: 14, borderRadius: 14, backgroundColor: 'rgba(17,20,27,0.86)', borderWidth: 1, borderColor: '#454B58', padding: 12 },
  identityLabel: { color: '#AEB4BF', fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  identityText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', marginTop: 4 },
  preview: { marginTop: 18, minHeight: 105, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  previewWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  previewSmall: { color: '#E8EBF0', fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  previewTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 3 },
  previewMeta: { color: '#F3F4F7', fontSize: 10, marginTop: 3 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, backgroundColor: 'rgba(13,16,22,0.96)', borderTopWidth: 1, borderTopColor: '#2B303C' },
  confirm: { minHeight: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 14, fontWeight: '900' },
});