import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getRulesPack, RULES_PRESETS, type ManaColor } from '../games';
import { DEFAULT_PLAYER_THEME_ID, THEME_PACKS } from '../themes';
import { loadDeckProfiles, type DeckProfile } from '../storage/deckProfiles';
import { saveGame, type SavedPlayer } from '../storage/gameSave';

const EMPTY_MANA: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

type PlayerChoice = {
  profileId?: string;
  themeId: string;
};

const makeChoice = (): PlayerChoice => ({ themeId: DEFAULT_PLAYER_THEME_ID });

export default function PlayerSetupScreen() {
  const params = useLocalSearchParams<{ presetId?: string; players?: string }>();
  const preset = useMemo(() => RULES_PRESETS.find((item) => item.id === params.presetId) ?? RULES_PRESETS[0], [params.presetId]);
  const playerCount = Math.min(6, Math.max(1, Number(params.players) || preset.players));
  const rules = getRulesPack(preset.game);

  const [profiles, setProfiles] = useState<DeckProfile[]>([]);
  const [choices, setChoices] = useState<PlayerChoice[]>(() => Array.from({ length: playerCount }, makeChoice));
  const [playerIndex, setPlayerIndex] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    loadDeckProfiles().then((items) => { if (active) setProfiles(items); });
    return () => { active = false; };
  }, []));

  const compatibleProfiles = useMemo(() => profiles.filter((profile) => profile.presetId === preset.id), [profiles, preset.id]);
  const current = choices[playerIndex] ?? makeChoice();
  const selectedProfile = profiles.find((profile) => profile.id === current.profileId);
  const selectedTheme = THEME_PACKS.find((theme) => theme.id === current.themeId) ?? THEME_PACKS[0];

  const selectProfile = (profile?: DeckProfile) => {
    setChoices((items) => items.map((choice, index) => index === playerIndex
      ? { ...choice, profileId: profile?.id, themeId: profile?.themeId ?? choice.themeId }
      : choice));
  };

  const selectTheme = (themeId: string) => {
    setChoices((items) => items.map((choice, index) => index === playerIndex ? { ...choice, themeId } : choice));
  };

  const finish = async () => {
    const savedPlayers: SavedPlayer[] = Array.from({ length: playerCount }, (_, index) => {
      const choice = choices[index] ?? makeChoice();
      const profile = profiles.find((item) => item.id === choice.profileId);
      return {
        id: index + 1,
        name: profile?.playerName || profile?.name || `PLAYER ${index + 1}`,
        value: preset.startingValue,
        counters: [],
        mana: { ...EMPTY_MANA },
        manaColors: rules.supportsMana ? (profile?.manaColors ?? []) : [],
        themeId: choice.themeId,
        deckProfileId: profile?.id,
        preferredCounters: profile?.preferredCounters ?? [],
      };
    });

    await saveGame({
      version: 1,
      updatedAt: Date.now(),
      config: {
        game: preset.game,
        mode: preset.mode,
        players: playerCount,
        start: preset.startingValue,
        metric: preset.metric,
        step: preset.step,
        theme: DEFAULT_PLAYER_THEME_ID,
      },
      state: { players: savedPlayers, activePlayer: 0, activePhase: 0 },
    });

    router.replace({
      pathname: '/game',
      params: {
        game: preset.game,
        mode: preset.mode,
        players: String(playerCount),
        start: String(preset.startingValue),
        metric: preset.metric,
        step: String(preset.step),
        theme: DEFAULT_PLAYER_THEME_ID,
        resume: '1',
      },
    });
  };

  const confirmPlayer = async () => {
    if (playerIndex === playerCount - 1) {
      await finish();
      return;
    }
    setPlayerIndex((index) => index + 1);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: selectedTheme.colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => playerIndex === 0 ? router.back() : setPlayerIndex((index) => index - 1)} style={styles.backButton}><Text style={styles.backText}>‹ BACK</Text></Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>{preset.game} · {preset.mode}</Text>
          <Text style={styles.title}>PLAYER {playerIndex + 1}</Text>
          <Text style={styles.subtitle}>Choose a deck profile and player theme.</Text>
        </View>
        <Text style={styles.progress}>{playerIndex + 1}/{playerCount}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>DECK PROFILE</Text>
        <Text style={styles.helpText}>Optional. Profiles load the player name, mana colors, counter suggestions, and their saved theme.</Text>
        <View style={styles.grid}>
          <Pressable onPress={() => selectProfile()} style={[styles.optionCard, !current.profileId && styles.selectedCard]}>
            <Text style={styles.optionTitle}>No Profile</Text>
            <Text style={styles.optionMeta}>Manual player</Text>
          </Pressable>
          {compatibleProfiles.map((profile) => (
            <Pressable key={profile.id} onPress={() => selectProfile(profile)} style={[styles.optionCard, current.profileId === profile.id && styles.selectedCard]}>
              <Text style={styles.optionTitle}>{profile.name}</Text>
              <Text style={styles.optionMeta}>{profile.playerName || 'Saved deck profile'}</Text>
              {!!profile.manaColors.length && <Text style={styles.optionHint}>{profile.manaColors.join(' / ')} mana</Text>}
            </Pressable>
          ))}
        </View>
        {compatibleProfiles.length === 0 && <Text style={styles.emptyHint}>No saved profiles for this game mode yet.</Text>}

        <Text style={styles.sectionLabel}>PLAYER THEME</Text>
        <Text style={styles.helpText}>This theme belongs only to Player {playerIndex + 1}. The full game background will switch to it on their turn.</Text>
        <View style={styles.grid}>
          {THEME_PACKS.map((theme) => (
            <Pressable key={theme.id} onPress={() => selectTheme(theme.id)} style={[styles.themeCard, current.themeId === theme.id && { borderColor: theme.colors.accent, borderWidth: 3 }]}> 
              <View style={[styles.themePreview, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <View style={[styles.previewAccent, { backgroundColor: theme.colors.primary }]} />
                <Text style={[styles.themeName, { color: theme.colors.text }]}>{theme.name}</Text>
                <Text style={[styles.themeExample, { color: theme.colors.mutedText }]}>{theme.example}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={[styles.confirmCard, { borderColor: selectedTheme.colors.accent }]}>
          <Text style={styles.confirmLabel}>PLAYER {playerIndex + 1} READY</Text>
          <Text style={styles.confirmTitle}>{selectedProfile?.name ?? `Player ${playerIndex + 1}`}</Text>
          <Text style={styles.confirmMeta}>{selectedTheme.name} theme</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={confirmPlayer} style={[styles.confirmButton, { backgroundColor: selectedTheme.colors.primary }]}>
          <Text style={styles.confirmButtonText}>{playerIndex === playerCount - 1 ? 'CONFIRM & START GAME' : `CONFIRM PLAYER ${playerIndex + 1}`}</Text>
          <Text style={styles.confirmButtonHint}>{playerIndex === playerCount - 1 ? 'All players configured' : `Next: Player ${playerIndex + 2}`}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 82, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { minWidth: 78, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(17,20,27,0.9)', alignItems: 'center' },
  backText: { color: '#C5C9D4', fontSize: 10, fontWeight: '900' },
  headerCenter: { flex: 1, alignItems: 'center' },
  eyebrow: { color: '#9DA3B2', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#A8ADBA', fontSize: 10, marginTop: 2, textAlign: 'center' },
  progress: { minWidth: 46, color: '#FFFFFF', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 110 },
  sectionLabel: { color: '#B3B8C5', fontSize: 9, fontWeight: '900', letterSpacing: 1.6, marginTop: 10, marginBottom: 5 },
  helpText: { color: '#9AA0AE', fontSize: 9, marginBottom: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  optionCard: { width: '31.5%', minHeight: 76, flexGrow: 1, borderRadius: 14, borderWidth: 1, borderColor: '#343947', backgroundColor: 'rgba(17,20,27,0.92)', padding: 12, justifyContent: 'center' },
  selectedCard: { borderColor: '#8F7CFF', borderWidth: 3, backgroundColor: 'rgba(43,37,80,0.95)' },
  optionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  optionMeta: { color: '#9BA1AE', fontSize: 9, marginTop: 4 },
  optionHint: { color: '#C7C1FF', fontSize: 8, marginTop: 4, fontWeight: '800' },
  emptyHint: { color: '#7E8494', fontSize: 9, marginTop: 7 },
  themeCard: { width: '31.5%', minHeight: 92, flexGrow: 1, borderRadius: 15, borderWidth: 1, borderColor: '#343947', overflow: 'hidden' },
  themePreview: { flex: 1, minHeight: 92, padding: 12, justifyContent: 'center', borderWidth: 1 },
  previewAccent: { width: 26, height: 5, borderRadius: 3, marginBottom: 8 },
  themeName: { fontSize: 14, fontWeight: '900' },
  themeExample: { fontSize: 8, marginTop: 4 },
  confirmCard: { marginTop: 18, borderRadius: 16, borderWidth: 2, backgroundColor: 'rgba(8,10,15,0.82)', padding: 14, alignItems: 'center' },
  confirmLabel: { color: '#8E94A6', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  confirmTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 3 },
  confirmMeta: { color: '#AEB3C1', fontSize: 10, marginTop: 3 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, backgroundColor: 'rgba(8,10,15,0.94)', borderTopWidth: 1, borderTopColor: '#2B303C' },
  confirmButton: { minHeight: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  confirmButtonHint: { color: '#E6E2FF', fontSize: 8, fontWeight: '800', marginTop: 2 },
});