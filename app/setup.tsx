import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getRulesPack, RULES_PRESETS, type RulesPreset } from '../games';
import { THEME_PACKS, DEFAULT_PLAYER_THEME_ID } from '../themes';
import { loadDeckProfiles, type DeckProfile } from '../storage/deckProfiles';
import { saveGame, type SavedPlayer } from '../storage/gameSave';
import type { ManaColor } from '../games';

const EMPTY_MANA: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

type PlayerSetup = {
  profileId?: string;
  themeId: string;
};

const makePlayerSetup = (): PlayerSetup => ({ themeId: DEFAULT_PLAYER_THEME_ID });

export default function SetupScreen() {
  const [selected, setSelected] = useState<RulesPreset>(RULES_PRESETS[0]);
  const [players, setPlayers] = useState(selected.players);
  const [profiles, setProfiles] = useState<DeckProfile[]>([]);
  const [playerSetups, setPlayerSetups] = useState<PlayerSetup[]>(() => Array.from({ length: selected.players }, makePlayerSetup));

  useFocusEffect(useCallback(() => {
    let active = true;
    loadDeckProfiles().then((items) => { if (active) setProfiles(items); });
    return () => { active = false; };
  }, []));

  const compatibleProfiles = useMemo(
    () => profiles.filter((profile) => profile.presetId === selected.id),
    [profiles, selected.id],
  );

  const resizeSetups = (count: number) => {
    setPlayerSetups((current) => Array.from({ length: count }, (_, index) => current[index] ?? makePlayerSetup()));
  };

  const choosePreset = (preset: RulesPreset) => {
    setSelected(preset);
    setPlayers(preset.players);
    setPlayerSetups(Array.from({ length: preset.players }, makePlayerSetup));
  };

  const changePlayers = (amount: number) => {
    const next = Math.min(6, Math.max(1, players + amount));
    setPlayers(next);
    resizeSetups(next);
  };

  const selectProfile = (playerIndex: number, profile?: DeckProfile) => {
    setPlayerSetups((current) => current.map((setup, index) => index === playerIndex
      ? {
          ...setup,
          profileId: profile?.id,
          themeId: profile?.themeId ?? setup.themeId,
        }
      : setup));
  };

  const selectTheme = (playerIndex: number, themeId: string) => {
    setPlayerSetups((current) => current.map((setup, index) => index === playerIndex ? { ...setup, themeId } : setup));
  };

  const startGame = async () => {
    const rules = getRulesPack(selected.game);
    const savedPlayers: SavedPlayer[] = Array.from({ length: players }, (_, index) => {
      const setup = playerSetups[index] ?? makePlayerSetup();
      const profile = profiles.find((item) => item.id === setup.profileId);
      return {
        id: index + 1,
        name: profile?.playerName || profile?.name || `PLAYER ${index + 1}`,
        value: selected.startingValue,
        counters: [],
        mana: { ...EMPTY_MANA },
        manaColors: rules.supportsMana ? (profile?.manaColors ?? []) : [],
        themeId: setup.themeId,
        deckProfileId: profile?.id,
        preferredCounters: profile?.preferredCounters ?? [],
      };
    });

    await saveGame({
      version: 1,
      updatedAt: Date.now(),
      config: {
        game: selected.game,
        mode: selected.mode,
        players,
        start: selected.startingValue,
        metric: selected.metric,
        step: selected.step,
        theme: DEFAULT_PLAYER_THEME_ID,
      },
      state: { players: savedPlayers, activePlayer: 0, activePhase: 0 },
    });

    router.push({
      pathname: '/game',
      params: {
        game: selected.game,
        mode: selected.mode,
        players: String(players),
        start: String(selected.startingValue),
        metric: selected.metric,
        step: String(selected.step),
        theme: DEFAULT_PLAYER_THEME_ID,
        resume: '1',
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ HOME</Text></Pressable>
        <View><Text style={styles.title}>New Game</Text><Text style={styles.subtitle}>Choose rules, then configure each player.</Text></View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>GAME RULES</Text>
        <View style={styles.presetGrid}>
          {RULES_PRESETS.map((preset) => {
            const active = preset.id === selected.id;
            return <Pressable key={preset.id} onPress={() => choosePreset(preset)} style={[styles.presetCard, active && styles.activeCard]}>
              <Text style={styles.gameLabel}>{preset.game}</Text><Text style={styles.modeLabel}>{preset.mode}</Text><Text style={styles.presetDetails}>{preset.players} players · {preset.startingValue} {preset.metric}</Text>
            </Pressable>;
          })}
        </View>

        <Text style={styles.sectionLabel}>PLAYERS</Text>
        <Text style={styles.helpText}>Deck Profiles are optional. Each player can use a different Player Theme.</Text>
        <View style={styles.playerList}>
          {Array.from({ length: players }, (_, playerIndex) => {
            const setup = playerSetups[playerIndex] ?? makePlayerSetup();
            const selectedProfile = profiles.find((profile) => profile.id === setup.profileId);
            return <View key={playerIndex} style={styles.playerCard}>
              <View style={styles.playerHeader}>
                <Text style={styles.playerTitle}>PLAYER {playerIndex + 1}</Text>
                <Text style={styles.playerSummary}>{selectedProfile ? selectedProfile.name : 'Manual setup'}</Text>
              </View>

              <Text style={styles.miniLabel}>DECK PROFILE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                <Pressable onPress={() => selectProfile(playerIndex)} style={[styles.choiceChip, !setup.profileId && styles.selectedChoice]}><Text style={styles.choiceText}>NONE</Text></Pressable>
                {compatibleProfiles.map((profile) => <Pressable key={profile.id} onPress={() => selectProfile(playerIndex, profile)} style={[styles.choiceChip, setup.profileId === profile.id && styles.selectedChoice]}><Text style={styles.choiceText}>{profile.name}</Text></Pressable>)}
              </ScrollView>
              {compatibleProfiles.length === 0 && <Text style={styles.emptyHint}>No saved profiles for this rules preset yet.</Text>}

              <Text style={styles.miniLabel}>PLAYER THEME</Text>
              <View style={styles.themeRow}>
                {THEME_PACKS.map((theme) => <Pressable key={theme.id} onPress={() => selectTheme(playerIndex, theme.id)} style={[styles.themeCard, setup.themeId === theme.id && styles.activeTheme, { borderColor: setup.themeId === theme.id ? theme.colors.accent : '#282C37' }]}>
                  <View style={[styles.themeDot, { backgroundColor: theme.colors.primary }]} /><Text style={styles.themeName}>{theme.name}</Text>
                </Pressable>)}
              </View>
            </View>;
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.playerSelector}><Text style={styles.selectorLabel}>PLAYERS</Text><Pressable onPress={() => changePlayers(-1)} style={styles.countButton}><Text style={styles.countButtonText}>−</Text></Pressable><Text style={styles.playerCount}>{players}</Text><Pressable onPress={() => changePlayers(1)} style={styles.countButton}><Text style={styles.countButtonText}>+</Text></Pressable></View>
        <View style={styles.selectionSummary}><Text style={styles.summaryGame}>{selected.game} · {selected.mode}</Text><Text style={styles.summaryDetails}>{players} players · individual themes</Text></View>
        <Pressable onPress={startGame} style={styles.startButton}><Text style={styles.startButtonText}>START GAME</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080A0F' }, header: { minHeight: 80, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, backButton: { minWidth: 86, paddingVertical: 10, borderRadius: 12, backgroundColor: '#151820', alignItems: 'center' }, backText: { color: '#AEB3C1', fontSize: 11, fontWeight: '900' }, title: { color: '#F7F8FC', fontSize: 24, fontWeight: '900', textAlign: 'center' }, subtitle: { color: '#7E8494', fontSize: 10, marginTop: 3, textAlign: 'center' }, headerSpacer: { width: 86 },
  content: { paddingHorizontal: 20, paddingBottom: 24 }, sectionLabel: { color: '#6F7585', fontSize: 9, fontWeight: '900', letterSpacing: 1.7, marginBottom: 8, marginTop: 8 }, helpText: { color: '#7E8494', fontSize: 10, marginBottom: 10 }, presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, presetCard: { width: '31%', minHeight: 82, flexGrow: 1, borderRadius: 14, borderWidth: 1, borderColor: '#282C37', backgroundColor: '#11141B', padding: 12, justifyContent: 'center' }, activeCard: { borderColor: '#8F7CFF', borderWidth: 2, backgroundColor: '#181528' }, gameLabel: { color: '#8F7CFF', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, modeLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 3 }, presetDetails: { color: '#8E94A6', fontSize: 9, fontWeight: '700', marginTop: 5 },
  playerList: { gap: 10 }, playerCard: { borderRadius: 16, borderWidth: 1, borderColor: '#282C37', backgroundColor: '#11141B', padding: 12 }, playerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, playerTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' }, playerSummary: { color: '#8F7CFF', fontSize: 9, fontWeight: '800' }, miniLabel: { color: '#6F7585', fontSize: 7, fontWeight: '900', letterSpacing: 1.2, marginTop: 6, marginBottom: 5 }, choiceRow: { gap: 6 }, choiceChip: { minHeight: 34, borderRadius: 10, borderWidth: 1, borderColor: '#303544', backgroundColor: '#181B23', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }, selectedChoice: { borderColor: '#8F7CFF', backgroundColor: '#2B2550' }, choiceText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' }, emptyHint: { color: '#5F6573', fontSize: 8, marginTop: 5 }, themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, themeCard: { minWidth: 105, flexGrow: 1, minHeight: 40, borderRadius: 10, borderWidth: 1, backgroundColor: '#181B23', paddingHorizontal: 9, flexDirection: 'row', gap: 7, alignItems: 'center' }, activeTheme: { backgroundColor: '#211D35', borderWidth: 2 }, themeDot: { width: 10, height: 10, borderRadius: 5 }, themeName: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  bottomBar: { minHeight: 82, borderTopWidth: 1, borderTopColor: '#222630', backgroundColor: '#0D1016', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }, playerSelector: { flexDirection: 'row', alignItems: 'center', gap: 8 }, selectorLabel: { color: '#717787', fontSize: 9, fontWeight: '900' }, countButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#222630', alignItems: 'center', justifyContent: 'center' }, countButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' }, playerCount: { minWidth: 22, color: '#FFFFFF', fontSize: 20, fontWeight: '900', textAlign: 'center' }, selectionSummary: { flex: 1 }, summaryGame: { color: '#E9E7FF', fontSize: 12, fontWeight: '900' }, summaryDetails: { color: '#7E8494', fontSize: 9, marginTop: 2 }, startButton: { minWidth: 150, borderRadius: 14, backgroundColor: '#7560FF', paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center' }, startButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});