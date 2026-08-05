import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

type Player = {
  id: number;
  name: string;
  life: number;
};

const STARTING_PLAYERS: Player[] = [
  { id: 1, name: 'PLAYER 1', life: 40 },
  { id: 2, name: 'PLAYER 2', life: 40 },
  { id: 3, name: 'PLAYER 3', life: 40 },
  { id: 4, name: 'PLAYER 4', life: 40 },
];

export default function GameScreen() {
  const [players, setPlayers] = useState(STARTING_PLAYERS);
  const [activePlayer, setActivePlayer] = useState(0);

  const activeName = useMemo(() => players[activePlayer]?.name ?? 'PLAYER 1', [activePlayer, players]);

  const changeLife = (id: number, amount: number) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id ? { ...player, life: player.life + amount } : player,
      ),
    );
  };

  const resetGame = () => {
    setPlayers(STARTING_PLAYERS);
    setActivePlayer(0);
  };

  const nextTurn = () => {
    setActivePlayer((current) => (current + 1) % players.length);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}>
          <Text style={styles.topButtonText}>‹ HOME</Text>
        </Pressable>

        <View style={styles.turnStatus}>
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
            isActive={index === activePlayer}
            onChangeLife={changeLife}
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

function PlayerPanel({
  player,
  isActive,
  onChangeLife,
}: {
  player: Player;
  isActive: boolean;
  onChangeLife: (id: number, amount: number) => void;
}) {
  return (
    <View style={[styles.panel, isActive && styles.activePanel]}>
      {isActive && <Text style={styles.activeBadge}>ACTIVE</Text>}
      <Text style={styles.playerName}>{player.name}</Text>
      <Text style={[styles.life, player.life <= 10 && styles.lowLife]}>{player.life}</Text>

      <View style={styles.lifeControls}>
        <LifeButton label="−5" onPress={() => onChangeLife(player.id, -5)} />
        <LifeButton label="−1" onPress={() => onChangeLife(player.id, -1)} primary />
        <LifeButton label="+1" onPress={() => onChangeLife(player.id, 1)} primary />
        <LifeButton label="+5" onPress={() => onChangeLife(player.id, 5)} />
      </View>
    </View>
  );
}

function LifeButton({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.lifeButton, primary && styles.lifeButtonPrimary, pressed && styles.pressed]}
    >
      <Text style={[styles.lifeButtonText, primary && styles.lifeButtonPrimaryText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080A0F', paddingHorizontal: 18, paddingBottom: 16 },
  topBar: { height: 74, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topButton: { minWidth: 96, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#151820', alignItems: 'center' },
  topButtonText: { color: '#AEB3C1', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  turnStatus: { alignItems: 'center' },
  turnLabel: { color: '#676D7D', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  turnName: { color: '#F4F3FF', fontSize: 20, fontWeight: '900', marginTop: 2 },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  panel: { width: '49%', height: '48.5%', flexGrow: 1, borderRadius: 22, borderWidth: 1, borderColor: '#252936', backgroundColor: '#11141B', alignItems: 'center', justifyContent: 'center', padding: 14 },
  activePanel: { borderColor: '#8F7CFF', borderWidth: 3, backgroundColor: '#181528', shadowColor: '#7560FF', shadowOpacity: 0.28, shadowRadius: 16, elevation: 5 },
  activeBadge: { position: 'absolute', top: 12, right: 14, color: '#B8ACFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  playerName: { color: '#AEB3C1', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  life: { color: '#FFFFFF', fontSize: 68, lineHeight: 74, fontWeight: '900', letterSpacing: -3, marginVertical: 3 },
  lowLife: { color: '#FF6B78' },
  lifeControls: { flexDirection: 'row', gap: 8 },
  lifeButton: { minWidth: 52, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 13, backgroundColor: '#222630', alignItems: 'center' },
  lifeButtonPrimary: { backgroundColor: '#343047' },
  lifeButtonText: { color: '#AEB3C1', fontSize: 15, fontWeight: '900' },
  lifeButtonPrimaryText: { color: '#E5E1FF', fontSize: 18 },
  nextTurnButton: { marginTop: 12, minHeight: 60, borderRadius: 18, backgroundColor: '#7560FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  nextTurnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  nextTurnHint: { color: '#D9D4FF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
