import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

type Preset = { id: string; game: string; mode: string; players: number; startingValue: number; metric: string; step: number };
type ThemeChoice = { id: string; name: string; example: string };

const PRESETS: Preset[] = [
  { id: 'mtg-commander', game: 'MAGIC', mode: 'Commander', players: 4, startingValue: 40, metric: 'LIFE', step: 5 },
  { id: 'mtg-standard', game: 'MAGIC', mode: 'Standard / Modern', players: 2, startingValue: 20, metric: 'LIFE', step: 5 },
  { id: 'mtg-brawl', game: 'MAGIC', mode: 'Brawl', players: 2, startingValue: 25, metric: 'LIFE', step: 5 },
  { id: 'pokemon', game: 'POKÉMON TCG', mode: 'Standard Match', players: 2, startingValue: 6, metric: 'PRIZE CARDS', step: 1 },
  { id: 'yugioh', game: 'YU-GI-OH!', mode: 'Duel', players: 2, startingValue: 8000, metric: 'LP', step: 500 },
  { id: 'dnd', game: 'D&D', mode: 'Party HP', players: 4, startingValue: 20, metric: 'HP', step: 5 },
];

const THEMES: ThemeChoice[] = [
  { id: 'arcane', name: 'Arcane', example: 'Enemy · Resource · Buff' },
  { id: 'fantasy', name: 'Fantasy Raid', example: 'Goblins · Gold · Blessing' },
  { id: 'scifi', name: 'Sci-Fi', example: 'Hostiles · Energy Cells · Upgrade' },
];

export default function SetupScreen() {
  const [selected, setSelected] = useState(PRESETS[0]);
  const [players, setPlayers] = useState(selected.players);
  const [theme, setTheme] = useState(THEMES[0]);

  const choosePreset = (preset: Preset) => { setSelected(preset); setPlayers(preset.players); };

  const startGame = () => router.push({ pathname: '/game', params: { game: selected.game, mode: selected.mode, players: String(players), start: String(selected.startingValue), metric: selected.metric, step: String(selected.step), theme: theme.id } });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ HOME</Text></Pressable>
        <View><Text style={styles.title}>Choose rules and theme</Text><Text style={styles.subtitle}>Rules control mechanics. Themes control presentation.</Text></View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>GAME RULES</Text>
        <View style={styles.presetGrid}>
          {PRESETS.map((preset) => {
            const active = preset.id === selected.id;
            return <Pressable key={preset.id} onPress={() => choosePreset(preset)} style={[styles.presetCard, active && styles.activeCard]}>
              <Text style={styles.gameLabel}>{preset.game}</Text><Text style={styles.modeLabel}>{preset.mode}</Text><Text style={styles.presetDetails}>{preset.players} players · {preset.startingValue} {preset.metric}</Text>
            </Pressable>;
          })}
        </View>

        <Text style={styles.sectionLabel}>THEME PACK</Text>
        <View style={styles.themeRow}>
          {THEMES.map((item) => <Pressable key={item.id} onPress={() => setTheme(item)} style={[styles.themeCard, item.id === theme.id && styles.activeTheme]}>
            <Text style={styles.themeName}>{item.name}</Text><Text style={styles.themeExample}>{item.example}</Text>
          </Pressable>)}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.playerSelector}><Text style={styles.selectorLabel}>PLAYERS</Text><Pressable onPress={() => setPlayers((value) => Math.max(1, value - 1))} style={styles.countButton}><Text style={styles.countButtonText}>−</Text></Pressable><Text style={styles.playerCount}>{players}</Text><Pressable onPress={() => setPlayers((value) => Math.min(6, value + 1))} style={styles.countButton}><Text style={styles.countButtonText}>+</Text></Pressable></View>
        <View style={styles.selectionSummary}><Text style={styles.summaryGame}>{selected.game} · {selected.mode}</Text><Text style={styles.summaryDetails}>{theme.name} theme · {players} players · {selected.startingValue} {selected.metric}</Text></View>
        <Pressable onPress={startGame} style={styles.startButton}><Text style={styles.startButtonText}>START GAME</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080A0F' }, header: { minHeight: 86, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, backButton: { minWidth: 96, paddingVertical: 11, borderRadius: 12, backgroundColor: '#151820', alignItems: 'center' }, backText: { color: '#AEB3C1', fontSize: 12, fontWeight: '900' }, title: { color: '#F7F8FC', fontSize: 25, fontWeight: '900', textAlign: 'center' }, subtitle: { color: '#7E8494', fontSize: 11, marginTop: 3, textAlign: 'center' }, headerSpacer: { width: 96 },
  content: { paddingHorizontal: 28, paddingBottom: 18 }, sectionLabel: { color: '#6F7585', fontSize: 9, fontWeight: '900', letterSpacing: 1.7, marginBottom: 8, marginTop: 4 }, presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, presetCard: { width: '32%', minHeight: 94, flexGrow: 1, borderRadius: 16, borderWidth: 1, borderColor: '#282C37', backgroundColor: '#11141B', padding: 14, justifyContent: 'center' }, activeCard: { borderColor: '#8F7CFF', borderWidth: 3, backgroundColor: '#181528' }, gameLabel: { color: '#8F7CFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 }, modeLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginTop: 4 }, presetDetails: { color: '#8E94A6', fontSize: 10, fontWeight: '700', marginTop: 6 },
  themeRow: { flexDirection: 'row', gap: 10 }, themeCard: { flex: 1, minHeight: 70, borderRadius: 14, borderWidth: 1, borderColor: '#282C37', backgroundColor: '#11141B', padding: 12, justifyContent: 'center' }, activeTheme: { borderColor: '#57C7B6', borderWidth: 2, backgroundColor: '#12211F' }, themeName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, themeExample: { color: '#7E8494', fontSize: 9, marginTop: 4 },
  bottomBar: { minHeight: 88, borderTopWidth: 1, borderTopColor: '#222630', backgroundColor: '#0D1016', paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', gap: 24 }, playerSelector: { flexDirection: 'row', alignItems: 'center', gap: 10 }, selectorLabel: { color: '#717787', fontSize: 10, fontWeight: '900', marginRight: 4 }, countButton: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#222630', alignItems: 'center', justifyContent: 'center' }, countButtonText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' }, playerCount: { minWidth: 26, color: '#FFFFFF', fontSize: 23, fontWeight: '900', textAlign: 'center' }, selectionSummary: { flex: 1 }, summaryGame: { color: '#E9E7FF', fontSize: 13, fontWeight: '900' }, summaryDetails: { color: '#7E8494', fontSize: 10, marginTop: 3 }, startButton: { minWidth: 180, borderRadius: 15, backgroundColor: '#7560FF', paddingVertical: 15, paddingHorizontal: 22, alignItems: 'center' }, startButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
});
