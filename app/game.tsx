import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

type Player = {
  id: number;
  name: string;
  value: number;
};

const PHASES_BY_GAME: Record<string, string[]> = {
  MAGIC: ['UNTAP', 'UPKEEP', 'DRAW', 'MAIN 1', 'COMBAT', 'MAIN 2', 'END'],
  POKEMON: ['DRAW', 'ACTIONS', 'ATTACK', 'CHECKUP'],
  'YU-GI-OH!': ['DRAW', 'STANDBY', 'MAIN 1', 'BATTLE', 'MAIN 2', 'END'],
  DND: ['START', 'MOVE', 'ACTION', 'BONUS', 'END'],
};

export default function GameScreen() {
  const params = useLocalSearchParams<{
    game?: string;
    mode?: string;
    players?: string;
    start?: string;
    metric?: string;
    step?: string;
  }>();

  const playerCount = Math.min(6, Math.max(1, Number(params.players) || 4));
  const startingValue = Number(params.start) || 40;
  const metric = params.metric || 'LIFE';
  const largeStep = Number(params.step) || 5;
  const gameName = params.game || 'MAGIC';
  const modeName = params.mode || 'Commander';
  const phases = PHASES_BY_GAME[gameName.toUpperCase()] ?? ['START', 'MAIN', 'END'];

  const initialPlayers = useMemo<Player[]>(
    () => Array.from({ length: playerCount }, (_, index) => ({ id: index + 1, name: `PLAYER ${index + 1}`, value: startingValue })),
    [playerCount, startingValue],
  );

  const [players, setPlayers] = useState(initialPlayers);
  const [activePlayer, setActivePlayer] = useState(0);
  const [activePhase, setActivePhase] = useState(0);

  const activeName = players[activePlayer]?.name ?? 'PLAYER 1';
  const isLastPhase = activePhase === phases.length - 1;

  const changeValue = (id: number, amount: number) => {
    setPlayers((current) => current.map((player) => player.id === id ? { ...player, value: player.value + amount } : player));
  };

  const resetGame = () => {
    setPlayers(initialPlayers);
    setActivePlayer(0);
    setActivePhase(0);
  };

  const advanceGame = () => {
    if (!isLastPhase) {
      setActivePhase((current) => current + 1);
      return;
    }

    setActivePlayer((current) => (current + 1) % players.length);
    setActivePhase(0);
  };

  const isLargeGrid = players.length >= 5;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}>
          <Text style={styles.topButtonText}>‹ SETUP</Text>
        </Pressable>

        <View style={styles.turnStatus}>
          <Text style={styles.gameMode}>{gameName} · {modeName}</Text>
          <Text style={styles.turnLabel}>CURRENT TURN</Text>
          <Text style={styles.turnName}>{activeName}</Text>
        </View>

        <Pressable onPress={resetGame} style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}>
          <Text style={styles.topButtonText}>RESET</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {players.map((player, index) => (
          <PlayerPanel
            key={player.id}
            player={player}
            metric={metric}
            largeStep={largeStep}
            compact={isLargeGrid}
            isActive={index === activePlayer}
            onChange={changeValue}
          />
        ))}
      </View>

      <View style={styles.turnControls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.phaseTrack}
        >
          {phases.map((phase, index) => (
            <Pressable
              key={phase}
              onPress={() => setActivePhase(index)}
              style={[styles.phaseChip, index === activePhase && styles.activePhaseChip]}
            >
              <Text style={[styles.phaseText, index === activePhase && styles.activePhaseText]}>{phase}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable onPress={advanceGame} style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}>
          <View>
            <Text style={styles.nextButtonText}>{isLastPhase ? 'END TURN' : 'NEXT PHASE'}</Text>
            <Text style={styles.nextButtonHint}>
              {isLastPhase ? `PASS TO ${players[(activePlayer + 1) % players.length].name}` : phases[activePhase + 1]}
            </Text>
          </View>
          <Text style={styles.nextArrow}>›</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function PlayerPanel({ player, metric, largeStep, compact, isActive, onChange }: {
  player: Player;
  metric: string;
  largeStep: number;
  compact: boolean;
  isActive: boolean;
  onChange: (id: number, amount: number) => void;
}) {
  return (
    <View style={[styles.panel, compact && styles.compactPanel, isActive && styles.activePanel]}>
      {isActive && <Text style={styles.activeBadge}>ACTIVE</Text>}
      <Text style={styles.playerName}>{player.name}</Text>
      <Text style={styles.metric}>{metric}</Text>
      <Text style={[styles.value, compact && styles.compactValue, player.value <= 10 && metric !== 'PRIZE CARDS' && styles.lowValue]}>{player.value}</Text>

      <View style={styles.controls}>
        <CounterButton label={`−${largeStep}`} onPress={() => onChange(player.id, -largeStep)} />
        <CounterButton label="−1" onPress={() => onChange(player.id, -1)} primary />
        <CounterButton label="+1" onPress={() => onChange(player.id, 1)} primary />
        <CounterButton label={`+${largeStep}`} onPress={() => onChange(player.id, largeStep)} />
      </View>
    </View>
  );
}

function CounterButton({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.counterButton, primary && styles.counterButtonPrimary, pressed && styles.pressed]}>
      <Text style={[styles.counterButtonText, primary && styles.counterButtonPrimaryText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080A0F', paddingHorizontal: 18, paddingBottom: 12 },
  topBar: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topButton: { minWidth: 92, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#151820', alignItems: 'center' },
  topButtonText: { color: '#AEB3C1', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  turnStatus: { alignItems: 'center' },
  gameMode: { color: '#8F7CFF', fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginBottom: 2 },
  turnLabel: { color: '#676D7D', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  turnName: { color: '#F4F3FF', fontSize: 18, fontWeight: '900', marginTop: 1 },
  grid: { flex: 1, minHeight: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  panel: { width: '49%', flexBasis: '47%', flexGrow: 1, borderRadius: 18, borderWidth: 1, borderColor: '#252936', backgroundColor: '#11141B', alignItems: 'center', justifyContent: 'center', padding: 8 },
  compactPanel: { width: '32%', flexBasis: '31%' },
  activePanel: { borderColor: '#8F7CFF', borderWidth: 3, backgroundColor: '#181528', shadowColor: '#7560FF', shadowOpacity: 0.28, shadowRadius: 12, elevation: 5 },
  activeBadge: { position: 'absolute', top: 8, right: 10, color: '#B8ACFF', fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  playerName: { color: '#AEB3C1', fontSize: 11, fontWeight: '900', letterSpacing: 1.6 },
  metric: { color: '#5F6573', fontSize: 7, fontWeight: '900', letterSpacing: 1.3, marginTop: 2 },
  value: { color: '#FFFFFF', fontSize: 50, lineHeight: 54, fontWeight: '900', letterSpacing: -3 },
  compactValue: { fontSize: 40, lineHeight: 44 },
  lowValue: { color: '#FF6B78' },
  controls: { flexDirection: 'row', gap: 6 },
  counterButton: { minWidth: 44, paddingVertical: 8, paddingHorizontal: 7, borderRadius: 10, backgroundColor: '#222630', alignItems: 'center' },
  counterButtonPrimary: { backgroundColor: '#343047' },
  counterButtonText: { color: '#AEB3C1', fontSize: 12, fontWeight: '900' },
  counterButtonPrimaryText: { color: '#E5E1FF', fontSize: 15 },
  turnControls: { flexDirection: 'row', gap: 10, height: 66 },
  phaseTrack: { alignItems: 'center', gap: 6, paddingRight: 4 },
  phaseChip: { minWidth: 62, height: 44, borderRadius: 12, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151820', borderWidth: 1, borderColor: '#252936' },
  activePhaseChip: { backgroundColor: '#312A59', borderColor: '#8F7CFF' },
  phaseText: { color: '#737988', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  activePhaseText: { color: '#E3DFFF' },
  nextButton: { width: 190, borderRadius: 16, backgroundColor: '#7560FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 14 },
  nextButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.1 },
  nextButtonHint: { color: '#D9D4FF', fontSize: 8, fontWeight: '800', letterSpacing: 0.7, marginTop: 2 },
  nextArrow: { color: '#FFFFFF', fontSize: 30, lineHeight: 32, fontWeight: '500' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
