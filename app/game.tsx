import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

type Player = {
  id: number;
  name: string;
  value: number;
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

  const initialPlayers = useMemo<Player[]>(
    () => Array.from({ length: playerCount }, (_, index) => ({ id: index + 1, name: `PLAYER ${index + 1}`, value: startingValue })),
    [playerCount, startingValue],
  );

  const [players, setPlayers] = useState(initialPlayers);
  const [activePlayer, setActivePlayer] = useState(0);

  const activeName = players[activePlayer]?.name ?? 'PLAYER 1';

  const changeValue = (id: number, amount: number) => {
    setPlayers((current) => current.map((player) => player.id === id ? { ...player, value: player.value + amount } : player));
  };

  const resetGame = () => {
    setPlayers(initialPlayers);
    setActivePlayer(0);
  };

  const nextTurn = () => setActivePlayer((current) => (current + 1) % players.length);
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

      <Pressable onPress={nextTurn} style={({ pressed }) => [styles.nextTurnButton, pressed && styles.pressed]}>
        <Text style={styles.nextTurnText}>END TURN</Text>
        <Text style={styles.nextTurnHint}>PASS TO {players[(activePlayer + 1) % players.length].name}</Text>
      </Pressable>
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
  safeArea: { flex: 1, backgroundColor: '#080A0F', paddingHorizontal: 18, paddingBottom: 16 },
  topBar: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topButton: { minWidth: 96, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#151820', alignItems: 'center' },
  topButtonText: { color: '#AEB3C1', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  turnStatus: { alignItems: 'center' },
  gameMode: { color: '#8F7CFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginBottom: 3 },
  turnLabel: { color: '#676D7D', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  turnName: { color: '#F4F3FF', fontSize: 20, fontWeight: '900', marginTop: 2 },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  panel: { width: '49%', minHeight: '47%', flexGrow: 1, borderRadius: 22, borderWidth: 1, borderColor: '#252936', backgroundColor: '#11141B', alignItems: 'center', justifyContent: 'center', padding: 12 },
  compactPanel: { width: '32%', minHeight: '47%' },
  activePanel: { borderColor: '#8F7CFF', borderWidth: 3, backgroundColor: '#181528', shadowColor: '#7560FF', shadowOpacity: 0.28, shadowRadius: 16, elevation: 5 },
  activeBadge: { position: 'absolute', top: 10, right: 12, color: '#B8ACFF', fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  playerName: { color: '#AEB3C1', fontSize: 12, fontWeight: '900', letterSpacing: 1.7 },
  metric: { color: '#5F6573', fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginTop: 3 },
  value: { color: '#FFFFFF', fontSize: 62, lineHeight: 68, fontWeight: '900', letterSpacing: -3, marginVertical: 1 },
  compactValue: { fontSize: 48, lineHeight: 53 },
  lowValue: { color: '#FF6B78' },
  controls: { flexDirection: 'row', gap: 7 },
  counterButton: { minWidth: 48, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#222630', alignItems: 'center' },
  counterButtonPrimary: { backgroundColor: '#343047' },
  counterButtonText: { color: '#AEB3C1', fontSize: 13, fontWeight: '900' },
  counterButtonPrimaryText: { color: '#E5E1FF', fontSize: 16 },
  nextTurnButton: { marginTop: 10, minHeight: 58, borderRadius: 18, backgroundColor: '#7560FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  nextTurnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  nextTurnHint: { color: '#D9D4FF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
