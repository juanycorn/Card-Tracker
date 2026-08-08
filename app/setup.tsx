import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RULES_PRESETS, type RulesPreset } from '../games';

export default function SetupScreen() {
  const [selected, setSelected] = useState<RulesPreset>(RULES_PRESETS[0]);
  const [players, setPlayers] = useState(selected.players);

  const choosePreset = (preset: RulesPreset) => {
    setSelected(preset);
    setPlayers(preset.players);
  };

  const continueSetup = () => router.push({
    pathname: '/player-setup',
    params: {
      presetId: selected.id,
      players: String(players),
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ HOME</Text></Pressable>
        <View><Text style={styles.title}>New Game</Text><Text style={styles.subtitle}>Choose the game mode first.</Text></View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>GAME MODE</Text>
        <View style={styles.presetGrid}>
          {RULES_PRESETS.map((preset) => {
            const active = preset.id === selected.id;
            return <Pressable key={preset.id} onPress={() => choosePreset(preset)} style={[styles.presetCard, active && styles.activeCard]}>
              <Text style={[styles.gameLabel, active && styles.activeLabel]}>{preset.game}</Text>
              <Text style={styles.modeLabel}>{preset.mode}</Text>
              <Text style={styles.presetDetails}>{preset.players} players · {preset.startingValue} {preset.metric}</Text>
            </Pressable>;
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.playerSelector}>
          <Text style={styles.selectorLabel}>PLAYERS</Text>
          <Pressable onPress={() => setPlayers((value) => Math.max(1, value - 1))} style={styles.countButton}><Text style={styles.countButtonText}>−</Text></Pressable>
          <Text style={styles.playerCount}>{players}</Text>
          <Pressable onPress={() => setPlayers((value) => Math.min(6, value + 1))} style={styles.countButton}><Text style={styles.countButtonText}>+</Text></Pressable>
        </View>
        <View style={styles.selectionSummary}>
          <Text style={styles.summaryGame}>{selected.game} · {selected.mode}</Text>
          <Text style={styles.summaryDetails}>Next: configure each player</Text>
        </View>
        <Pressable onPress={continueSetup} style={styles.startButton}><Text style={styles.startButtonText}>CONTINUE</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080A0F' },
  header: { minHeight: 86, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { minWidth: 96, paddingVertical: 11, borderRadius: 12, backgroundColor: '#151820', alignItems: 'center' },
  backText: { color: '#AEB3C1', fontSize: 12, fontWeight: '900' },
  title: { color: '#F7F8FC', fontSize: 25, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#7E8494', fontSize: 11, marginTop: 3, textAlign: 'center' },
  headerSpacer: { width: 96 },
  content: { paddingHorizontal: 28, paddingBottom: 24 },
  sectionLabel: { color: '#6F7585', fontSize: 9, fontWeight: '900', letterSpacing: 1.7, marginBottom: 8, marginTop: 4 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presetCard: { width: '32%', minHeight: 94, flexGrow: 1, borderRadius: 16, borderWidth: 1, borderColor: '#282C37', backgroundColor: '#11141B', padding: 14, justifyContent: 'center' },
  activeCard: { borderColor: '#D7DCE4', borderWidth: 3, backgroundColor: '#1A1E26' },
  gameLabel: { color: '#A8AEB9', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  activeLabel: { color: '#FFFFFF' },
  modeLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginTop: 4 },
  presetDetails: { color: '#8E94A6', fontSize: 10, fontWeight: '700', marginTop: 6 },
  bottomBar: { minHeight: 88, borderTopWidth: 1, borderTopColor: '#222630', backgroundColor: '#0D1016', paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', gap: 24 },
  playerSelector: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectorLabel: { color: '#717787', fontSize: 10, fontWeight: '900', marginRight: 4 },
  countButton: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#222630', alignItems: 'center', justifyContent: 'center' },
  countButtonText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  playerCount: { minWidth: 26, color: '#FFFFFF', fontSize: 23, fontWeight: '900', textAlign: 'center' },
  selectionSummary: { flex: 1 },
  summaryGame: { color: '#F0F2F5', fontSize: 13, fontWeight: '900' },
  summaryDetails: { color: '#7E8494', fontSize: 10, marginTop: 3 },
  startButton: { minWidth: 180, borderRadius: 15, backgroundColor: '#4A5563', paddingVertical: 15, paddingHorizontal: 22, alignItems: 'center' },
  startButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
});