import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getRulesPack, RULES_PRESETS, type ManaColor } from '../games';
import { DEFAULT_PLAYER_THEME_ID, MANA_COLOR_NAMES, MANA_THEME_COLORS, getManaTheme, getManaThemeId, getPlayerTheme } from '../themes';
import { loadBattleProfiles, type BattleProfile } from '../storage/deckProfiles';
import { saveGame, type SavedPlayer } from '../storage/gameSave';

const EMPTY_MANA: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
const MANA_COLORS: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];

function contrastTextColor(background: string): string {
  const clean = background.replace('#', '');
  if (clean.length !== 6) return '#FFFFFF';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#111318' : '#FFFFFF';
}

type PlayerChoice = {
  profileId?: string;
  manaColors: ManaColor[];
};

const makeChoice = (): PlayerChoice => ({ manaColors: ['C'] });

export default function PlayerSetupScreen() {
  const params = useLocalSearchParams<{ presetId?: string; players?: string }>();
  const preset = useMemo(() => RULES_PRESETS.find((item) => item.id === params.presetId) ?? RULES_PRESETS[0], [params.presetId]);
  const playerCount = Math.min(6, Math.max(1, Number(params.players) || preset.players));
  const rules = getRulesPack(preset.game);

  const [profiles, setProfiles] = useState<BattleProfile[]>([]);
  const [choices, setChoices] = useState<PlayerChoice[]>(() => Array.from({ length: playerCount }, makeChoice));
  const [playerIndex, setPlayerIndex] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    loadBattleProfiles().then((items) => { if (active) setProfiles(items); });
    return () => { active = false; };
  }, []));

  const compatibleProfiles = useMemo(() => profiles.filter((profile) => profile.gameKey === preset.gameKey), [profiles, preset.gameKey]);
  const current = choices[playerIndex] ?? makeChoice();
  const selectedProfile = profiles.find((profile) => profile.id === current.profileId);
  const selectedManaColors = selectedProfile?.manaColors.length ? selectedProfile.manaColors : current.manaColors;
  const fallbackTheme = getManaTheme(selectedManaColors);
  const selectedTheme = selectedProfile ? getPlayerTheme(selectedProfile.themeId) : fallbackTheme;
  const confirmTextColor = contrastTextColor(selectedTheme.colors.primary);

  const selectProfile = (profile?: BattleProfile) => {
    setChoices((items) => items.map((choice, index) => index === playerIndex
      ? {
          ...choice,
          profileId: profile?.id,
          manaColors: profile?.manaColors.length ? profile.manaColors : choice.manaColors,
        }
      : choice));
  };

  const toggleManaColor = (color: ManaColor) => {
    if (selectedProfile) return;
    setChoices((items) => items.map((choice, index) => {
      if (index !== playerIndex) return choice;
      const exists = choice.manaColors.includes(color);
      let next = exists ? choice.manaColors.filter((item) => item !== color) : [...choice.manaColors, color];
      if (color !== 'C') next = next.filter((item) => item !== 'C');
      if (color === 'C' && !exists) next = ['C'];
      if (next.length === 0) next = ['C'];
      return { ...choice, manaColors: next };
    }));
  };

  const finish = async () => {
    const savedPlayers: SavedPlayer[] = Array.from({ length: playerCount }, (_, index) => {
      const choice = choices[index] ?? makeChoice();
      const profile = profiles.find((item) => item.id === choice.profileId);
      const manaColors = profile?.manaColors.length ? profile.manaColors : choice.manaColors;
      return {
        id: index + 1,
        name: profile?.playerName || profile?.name || `PLAYER ${index + 1}`,
        value: preset.startingValue,
        counters: [],
        mana: { ...EMPTY_MANA },
        manaColors: rules.supportsMana ? manaColors : [],
        themeId: profile?.themeId || getManaThemeId(manaColors),
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
    <LinearGradient colors={selectedTheme.gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientRoot}>
      {!!selectedTheme.backgroundImageUri && <Image pointerEvents="none" source={{ uri: selectedTheme.backgroundImageUri }} style={styles.fullBackgroundImage} resizeMode="cover" />}
      <View pointerEvents="none" style={styles.darkWash} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => playerIndex === 0 ? router.back() : setPlayerIndex((index) => index - 1)} style={styles.backButton}><Text style={styles.backText}>‹ BACK</Text></Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.eyebrow}>{preset.game} · {preset.mode}</Text>
            <Text style={styles.title}>PLAYER {playerIndex + 1}</Text>
            <Text style={styles.subtitle}>Choose a Battle Profile. Any {preset.game} build works in this mode.</Text>
          </View>
          <Text style={styles.progress}>{playerIndex + 1}/{playerCount}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>BATTLE PROFILE</Text>
          <Text style={styles.helpText}>Profiles bring the build name, colors, counter suggestions, and attached theme.</Text>
          <View style={styles.grid}>
            <Pressable onPress={() => selectProfile()} style={[styles.optionCard, !current.profileId && styles.selectedCard]}>
              <Text style={styles.optionTitle}>No Profile</Text>
              <Text style={styles.optionMeta}>{rules.supportsMana ? 'Choose mana colors manually' : 'Use the default game setup'}</Text>
            </Pressable>
            {compatibleProfiles.map((profile) => {
              const profileTheme = getPlayerTheme(profile.themeId);
              return <Pressable key={profile.id} onPress={() => selectProfile(profile)} style={[styles.optionCard, current.profileId === profile.id && [styles.selectedCard, { borderColor: profileTheme.colors.accent }]]}>
                <Text style={styles.optionTitle}>{profile.name}</Text>
                <Text style={styles.optionMeta}>{profile.playerName || 'Saved Battle Profile'}</Text>
                {!!profile.manaColors.length && <Text style={styles.optionHint}>{profile.manaColors.join(' / ')} mana</Text>}
                <Text style={[styles.themeHint, { color: profileTheme.colors.accent }]}>{profileTheme.name}</Text>
              </Pressable>;
            })}
          </View>
          {compatibleProfiles.length === 0 && <Text style={styles.emptyHint}>No saved Battle Profiles for {preset.game} yet.</Text>}

          {!selectedProfile && rules.supportsMana && <>
            <Text style={styles.sectionLabel}>MANA COLORS</Text>
            <Text style={styles.helpText}>No Battle Profile selected, so pick this player's mana colors for the default theme.</Text>
            <View style={styles.manaRow}>
              {MANA_COLORS.map((color) => {
                const selected = selectedManaColors.includes(color);
                return <Pressable key={color} onPress={() => toggleManaColor(color)} style={[styles.manaChip, selected && styles.manaChipSelected, { borderColor: selected ? MANA_THEME_COLORS[color] : '#3A404D' }]}>
                  <View style={[styles.manaDot, { backgroundColor: MANA_THEME_COLORS[color] }]} />
                  <Text style={styles.manaLetter}>{color}</Text>
                  <Text style={styles.manaName}>{MANA_COLOR_NAMES[color]}</Text>
                </Pressable>;
              })}
            </View>
          </>}

          <LinearGradient colors={selectedTheme.gradientColors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.confirmCard, { borderColor: selectedTheme.colors.accent }]}>
            {!!selectedTheme.backgroundImageUri && <Image source={{ uri: selectedTheme.backgroundImageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />}
            <View style={styles.previewWash} />
            <Text style={styles.confirmLabel}>PLAYER {playerIndex + 1} READY</Text>
            <Text style={styles.confirmTitle}>{selectedProfile?.name ?? `Player ${playerIndex + 1}`}</Text>
            <Text style={styles.confirmMeta}>{selectedTheme.name}</Text>
          </LinearGradient>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={confirmPlayer} style={[styles.confirmButton, { backgroundColor: selectedTheme.colors.primary }]}>
            <Text style={[styles.confirmButtonText, { color: confirmTextColor }]}>{playerIndex === playerCount - 1 ? 'CONFIRM & START GAME' : `CONFIRM PLAYER ${playerIndex + 1}`}</Text>
            <Text style={[styles.confirmButtonHint, { color: confirmTextColor }]}>{playerIndex === playerCount - 1 ? 'All players configured' : `Next: Player ${playerIndex + 2}`}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientRoot: { flex: 1 },
  fullBackgroundImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  darkWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,6,10,0.66)' },
  safeArea: { flex: 1 },
  header: { minHeight: 82, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { minWidth: 78, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(17,20,27,0.9)', alignItems: 'center' },
  backText: { color: '#C5C9D4', fontSize: 10, fontWeight: '900' },
  headerCenter: { flex: 1, alignItems: 'center' },
  eyebrow: { color: '#C2C6CF', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#C3C7D0', fontSize: 10, marginTop: 2, textAlign: 'center' },
  progress: { minWidth: 46, color: '#FFFFFF', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 110 },
  sectionLabel: { color: '#D3D6DD', fontSize: 9, fontWeight: '900', letterSpacing: 1.6, marginTop: 10, marginBottom: 5 },
  helpText: { color: '#B5BAC5', fontSize: 9, marginBottom: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  optionCard: { width: '31.5%', minHeight: 82, flexGrow: 1, borderRadius: 14, borderWidth: 1, borderColor: '#343947', backgroundColor: 'rgba(17,20,27,0.92)', padding: 12, justifyContent: 'center' },
  selectedCard: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: 'rgba(35,39,49,0.96)' },
  optionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  optionMeta: { color: '#9BA1AE', fontSize: 9, marginTop: 4 },
  optionHint: { color: '#E1E4E9', fontSize: 8, marginTop: 4, fontWeight: '800' },
  themeHint: { fontSize: 8, marginTop: 4, fontWeight: '900' },
  emptyHint: { color: '#9AA0AD', fontSize: 9, marginTop: 7 },
  manaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  manaChip: { minWidth: 92, flexGrow: 1, minHeight: 56, borderRadius: 13, borderWidth: 1, backgroundColor: 'rgba(17,20,27,0.9)', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  manaChipSelected: { borderWidth: 3, backgroundColor: 'rgba(28,31,39,0.96)' },
  manaDot: { width: 14, height: 14, borderRadius: 7 },
  manaLetter: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  manaName: { color: '#B8BDC8', fontSize: 8, fontWeight: '700' },
  confirmCard: { marginTop: 18, minHeight: 112, borderRadius: 16, borderWidth: 2, padding: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  previewWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  confirmLabel: { color: '#E1E3E8', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  confirmTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 3 },
  confirmMeta: { color: '#F0F1F4', fontSize: 10, marginTop: 3 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, backgroundColor: 'rgba(8,10,15,0.94)', borderTopWidth: 1, borderTopColor: '#2B303C' },
  confirmButton: { minHeight: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmButtonText: { fontSize: 14, fontWeight: '900' },
  confirmButtonHint: { fontSize: 8, fontWeight: '800', marginTop: 2 },
});