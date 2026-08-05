import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

type CounterRole = 'enemy' | 'resource' | 'buff' | 'debuff' | 'objective' | 'custom';
type TrackedCounter = { id: string; role: CounterRole; value: number; temporary: boolean };
type Player = { id: number; name: string; value: number; counters: TrackedCounter[] };
type Theme = { name: string; labels: Record<CounterRole, string> };

const THEMES: Record<string, Theme> = {
  arcane: { name: 'Arcane', labels: { enemy: 'Enemy', resource: 'Resource', buff: 'Buff', debuff: 'Debuff', objective: 'Objective', custom: 'Counter' } },
  fantasy: { name: 'Fantasy Raid', labels: { enemy: 'Goblins', resource: 'Gold', buff: 'Blessing', debuff: 'Curse', objective: 'Quest', custom: 'Counter' } },
  scifi: { name: 'Sci-Fi', labels: { enemy: 'Hostiles', resource: 'Energy Cells', buff: 'Upgrade', debuff: 'Malfunction', objective: 'Mission', custom: 'Counter' } },
};

const PHASES_BY_GAME: Record<string, string[]> = {
  MAGIC: ['UNTAP', 'UPKEEP', 'DRAW', 'MAIN 1', 'COMBAT', 'MAIN 2', 'END'],
  POKEMON: ['DRAW', 'ACTIONS', 'ATTACK', 'CHECKUP'],
  'YU-GI-OH!': ['DRAW', 'STANDBY', 'MAIN 1', 'BATTLE', 'MAIN 2', 'END'],
  DND: ['START', 'MOVE', 'ACTION', 'BONUS', 'END'],
};

const COUNTER_ROLES: CounterRole[] = ['enemy', 'resource', 'buff', 'debuff', 'objective', 'custom'];

export default function GameScreen() {
  const params = useLocalSearchParams<{ game?: string; mode?: string; players?: string; start?: string; metric?: string; step?: string; theme?: string }>();
  const playerCount = Math.min(6, Math.max(1, Number(params.players) || 4));
  const startingValue = Number(params.start) || 40;
  const metric = params.metric || 'LIFE';
  const largeStep = Number(params.step) || 5;
  const gameName = params.game || 'MAGIC';
  const modeName = params.mode || 'Commander';
  const theme = THEMES[params.theme || 'arcane'] ?? THEMES.arcane;
  const phases = PHASES_BY_GAME[gameName.toUpperCase()] ?? ['START', 'MAIN', 'END'];

  const initialPlayers = useMemo<Player[]>(
    () => Array.from({ length: playerCount }, (_, index) => ({ id: index + 1, name: `PLAYER ${index + 1}`, value: startingValue, counters: [] })),
    [playerCount, startingValue],
  );

  const [players, setPlayers] = useState(initialPlayers);
  const [activePlayer, setActivePlayer] = useState(0);
  const [activePhase, setActivePhase] = useState(0);
  const [counterPlayerId, setCounterPlayerId] = useState<number | null>(null);
  const [counterRole, setCounterRole] = useState<CounterRole>('enemy');
  const [temporary, setTemporary] = useState(false);

  const activeName = players[activePlayer]?.name ?? 'PLAYER 1';
  const isLastPhase = activePhase === phases.length - 1;

  const changeValue = (id: number, amount: number) => setPlayers((current) => current.map((player) => player.id === id ? { ...player, value: player.value + amount } : player));
  const changeCounter = (playerId: number, counterId: string, amount: number) => setPlayers((current) => current.map((player) => player.id === playerId ? { ...player, counters: player.counters.map((counter) => counter.id === counterId ? { ...counter, value: Math.max(0, counter.value + amount) } : counter) } : player));
  const removeCounter = (playerId: number, counterId: string) => setPlayers((current) => current.map((player) => player.id === playerId ? { ...player, counters: player.counters.filter((counter) => counter.id !== counterId) } : player));

  const addCounter = () => {
    if (counterPlayerId === null) return;
    const newCounter: TrackedCounter = { id: `${Date.now()}-${counterRole}`, role: counterRole, value: 1, temporary };
    setPlayers((current) => current.map((player) => player.id === counterPlayerId ? { ...player, counters: [...player.counters, newCounter] } : player));
    setCounterPlayerId(null);
    setCounterRole('enemy');
    setTemporary(false);
  };

  const resetGame = () => { setPlayers(initialPlayers); setActivePlayer(0); setActivePhase(0); };

  const advanceGame = () => {
    if (!isLastPhase) { setActivePhase((current) => current + 1); return; }
    setPlayers((current) => current.map((player) => ({ ...player, counters: player.counters.filter((counter) => !counter.temporary) })));
    setActivePlayer((current) => (current + 1) % players.length);
    setActivePhase(0);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.topButton}><Text style={styles.topButtonText}>‹ SETUP</Text></Pressable>
        <View style={styles.turnStatus}>
          <Text style={styles.gameMode}>{gameName} · {modeName} · {theme.name}</Text>
          <Text style={styles.turnLabel}>CURRENT TURN</Text>
          <Text style={styles.turnName}>{activeName}</Text>
        </View>
        <Pressable onPress={resetGame} style={styles.topButton}><Text style={styles.topButtonText}>RESET</Text></Pressable>
      </View>

      <ScrollView
        style={styles.boardScroll}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        {players.map((player, index) => (
          <PlayerPanel
            key={player.id}
            player={player}
            metric={metric}
            largeStep={largeStep}
            isActive={index === activePlayer}
            theme={theme}
            onChange={changeValue}
            onChangeCounter={changeCounter}
            onRemoveCounter={removeCounter}
            onAddCounter={() => setCounterPlayerId(player.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.turnControls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.phaseTrack}>
          {phases.map((phase, index) => (
            <Pressable key={phase} onPress={() => setActivePhase(index)} style={[styles.phaseChip, index === activePhase && styles.activePhaseChip]}>
              <Text style={[styles.phaseText, index === activePhase && styles.activePhaseText]}>{phase}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable onPress={advanceGame} style={styles.nextButton}>
          <View>
            <Text style={styles.nextButtonText}>{isLastPhase ? 'END TURN' : 'NEXT PHASE'}</Text>
            <Text style={styles.nextButtonHint}>{isLastPhase ? `PASS TO ${players[(activePlayer + 1) % players.length].name}` : phases[activePhase + 1]}</Text>
          </View>
          <Text style={styles.nextArrow}>›</Text>
        </Pressable>
      </View>

      <Modal transparent visible={counterPlayerId !== null} animationType="fade" onRequestClose={() => setCounterPlayerId(null)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Add themed counter</Text>
          <Text style={styles.modalSubtitle}>Choose the generic role. The active theme decides its display name.</Text>
          <View style={styles.roleGrid}>{COUNTER_ROLES.map((role) => (
            <Pressable key={role} onPress={() => setCounterRole(role)} style={[styles.roleButton, counterRole === role && styles.selectedRole]}>
              <Text style={styles.roleKey}>{role.toUpperCase()}</Text><Text style={styles.roleName}>{theme.labels[role]}</Text>
            </Pressable>
          ))}</View>
          <Text style={styles.expiryLabel}>UNTIL END OF TURN?</Text>
          <View style={styles.expiryRow}>
            <Pressable onPress={() => setTemporary(false)} style={[styles.expiryButton, !temporary && styles.selectedRole]}><Text style={styles.roleName}>NO · PERSISTENT</Text></Pressable>
            <Pressable onPress={() => setTemporary(true)} style={[styles.expiryButton, temporary && styles.selectedRole]}><Text style={styles.roleName}>YES · TEMPORARY</Text></Pressable>
          </View>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setCounterPlayerId(null)} style={styles.cancelButton}><Text style={styles.cancelText}>CANCEL</Text></Pressable>
            <Pressable onPress={addCounter} style={styles.addButton}><Text style={styles.addText}>ADD {theme.labels[counterRole].toUpperCase()}</Text></Pressable>
          </View>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

function PlayerPanel({ player, metric, largeStep, isActive, theme, onChange, onChangeCounter, onRemoveCounter, onAddCounter }: { player: Player; metric: string; largeStep: number; isActive: boolean; theme: Theme; onChange: (id: number, amount: number) => void; onChangeCounter: (playerId: number, counterId: string, amount: number) => void; onRemoveCounter: (playerId: number, counterId: string) => void; onAddCounter: () => void }) {
  const [deleteMode, setDeleteMode] = useState<string | null>(null);
  return (
    <View style={[styles.panel, isActive && styles.activePanel]}>
      {isActive && <Text style={styles.activeBadge}>ACTIVE</Text>}
      <Text style={styles.playerName}>{player.name}</Text>
      <Text style={styles.metric}>{metric}</Text>
      <Text style={[styles.value, player.value <= 10 && metric !== 'PRIZE CARDS' && styles.lowValue]}>{player.value}</Text>
      <View style={styles.controls}>
        <CounterButton label={`−${largeStep}`} onPress={() => onChange(player.id, -largeStep)} />
        <CounterButton label="−1" onPress={() => onChange(player.id, -1)} primary />
        <CounterButton label="+1" onPress={() => onChange(player.id, 1)} primary />
        <CounterButton label={`+${largeStep}`} onPress={() => onChange(player.id, largeStep)} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playerCounters}>
        {player.counters.map((counter) => (
          <Pressable key={counter.id} onLongPress={() => setDeleteMode(counter.id)} style={styles.trackedCounter}>
            <Text style={styles.trackedLabel}>{theme.labels[counter.role]}{counter.temporary ? ' · EOT' : ''}</Text>
            <View style={styles.trackedControls}>
              <Pressable onPress={() => onChangeCounter(player.id, counter.id, -1)}><Text style={styles.smallControl}>−</Text></Pressable>
              <Text style={styles.trackedValue}>{counter.value}</Text>
              <Pressable onPress={() => onChangeCounter(player.id, counter.id, 1)}><Text style={styles.smallControl}>+</Text></Pressable>
            </View>
            {deleteMode === counter.id && <Pressable onPress={() => onRemoveCounter(player.id, counter.id)} style={styles.deleteCounter}><Text style={styles.deleteText}>×</Text></Pressable>}
          </Pressable>
        ))}
        <Pressable onPress={onAddCounter} style={styles.addCounterChip}><Text style={styles.addCounterText}>＋ COUNTER</Text></Pressable>
      </ScrollView>
    </View>
  );
}

function CounterButton({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.counterButton, primary && styles.counterButtonPrimary]}><Text style={[styles.counterButtonText, primary && styles.counterButtonPrimaryText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080A0F', paddingHorizontal: 12, paddingBottom: 8 },
  topBar: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topButton: { minWidth: 82, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 11, backgroundColor: '#151820', alignItems: 'center' },
  topButtonText: { color: '#AEB3C1', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  turnStatus: { alignItems: 'center' },
  gameMode: { color: '#8F7CFF', fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  turnLabel: { color: '#676D7D', fontSize: 7, fontWeight: '900', letterSpacing: 1.6 },
  turnName: { color: '#F4F3FF', fontSize: 16, fontWeight: '900' },
  boardScroll: { flex: 1, minHeight: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 18 },
  panel: { width: '48.5%', minHeight: 230, borderRadius: 18, borderWidth: 1, borderColor: '#252936', backgroundColor: '#11141B', alignItems: 'center', justifyContent: 'center', padding: 8 },
  activePanel: { borderColor: '#8F7CFF', borderWidth: 3, backgroundColor: '#181528' },
  activeBadge: { position: 'absolute', top: 7, right: 9, color: '#B8ACFF', fontSize: 7, fontWeight: '900' },
  playerName: { color: '#AEB3C1', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  metric: { color: '#5F6573', fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  value: { color: '#FFFFFF', fontSize: 43, lineHeight: 46, fontWeight: '900' },
  lowValue: { color: '#FF6B78' },
  controls: { flexDirection: 'row', gap: 5 },
  counterButton: { minWidth: 42, paddingVertical: 7, borderRadius: 9, backgroundColor: '#222630', alignItems: 'center' },
  counterButtonPrimary: { backgroundColor: '#343047' },
  counterButtonText: { color: '#AEB3C1', fontSize: 11, fontWeight: '900' },
  counterButtonPrimaryText: { color: '#E5E1FF', fontSize: 14 },
  playerCounters: { gap: 6, paddingTop: 7, alignItems: 'center' },
  trackedCounter: { minWidth: 96, height: 43, borderRadius: 10, backgroundColor: '#1B1E27', paddingHorizontal: 8, justifyContent: 'center' },
  trackedLabel: { color: '#9DA3B2', fontSize: 7, fontWeight: '900', textAlign: 'center' },
  trackedControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  smallControl: { color: '#BDB6FF', fontSize: 17, fontWeight: '900', paddingHorizontal: 5 },
  trackedValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  deleteCounter: { position: 'absolute', right: -5, top: -7, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF5F6D', alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#FFFFFF', fontSize: 17, lineHeight: 18, fontWeight: '900' },
  addCounterChip: { height: 43, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#4C5060', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  addCounterText: { color: '#8F7CFF', fontSize: 8, fontWeight: '900' },
  turnControls: { flexDirection: 'row', gap: 8, height: 62, paddingTop: 4 },
  phaseTrack: { alignItems: 'center', gap: 6 },
  phaseChip: { minWidth: 58, height: 42, borderRadius: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151820', borderWidth: 1, borderColor: '#252936' },
  activePhaseChip: { backgroundColor: '#312A59', borderColor: '#8F7CFF' },
  phaseText: { color: '#737988', fontSize: 8, fontWeight: '900' },
  activePhaseText: { color: '#E3DFFF' },
  nextButton: { width: 170, borderRadius: 15, backgroundColor: '#7560FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 10 },
  nextButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  nextButtonHint: { color: '#D9D4FF', fontSize: 7, fontWeight: '800', marginTop: 2 },
  nextArrow: { color: '#FFFFFF', fontSize: 28, fontWeight: '500' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 620, borderRadius: 22, backgroundColor: '#12151D', borderWidth: 1, borderColor: '#303544', padding: 22 },
  modalTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  modalSubtitle: { color: '#8E94A6', fontSize: 11, marginTop: 4, marginBottom: 14 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleButton: { width: '31.5%', minHeight: 58, borderRadius: 12, backgroundColor: '#1A1D26', borderWidth: 1, borderColor: '#2A2F3C', padding: 9, justifyContent: 'center' },
  selectedRole: { borderColor: '#8F7CFF', backgroundColor: '#2C2750' },
  roleKey: { color: '#777D8D', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  roleName: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', marginTop: 2 },
  expiryLabel: { color: '#777D8D', fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginTop: 16, marginBottom: 7 },
  expiryRow: { flexDirection: 'row', gap: 8 },
  expiryButton: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: '#1A1D26', borderWidth: 1, borderColor: '#2A2F3C', alignItems: 'center', justifyContent: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 18 },
  cancelText: { color: '#8E94A6', fontSize: 11, fontWeight: '900' },
  addButton: { borderRadius: 12, backgroundColor: '#7560FF', paddingVertical: 12, paddingHorizontal: 20 },
  addText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
});
