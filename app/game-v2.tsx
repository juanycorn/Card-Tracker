import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COUNTER_KIND } from '../games/counters';
import { getRulesPack, type CounterRole, type ManaColor } from '../games';
import { getThemePack } from '../themes';

type ManaPool = Record<ManaColor, number>;
type TrackedCounter = { id: string; role: CounterRole; value: number; secondaryValue?: number; active?: boolean; temporary: boolean };
type Player = { id: number; name: string; value: number; counters: TrackedCounter[]; mana: ManaPool; manaColors: ManaColor[] };

const EMPTY_MANA: ManaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
const MANA_COLORS: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];

export default function GameScreen() {
  const params = useLocalSearchParams<{ game?: string; mode?: string; players?: string; start?: string; metric?: string; step?: string; theme?: string }>();
  const rules = getRulesPack(params.game);
  const theme = getThemePack(params.theme);
  const playerCount = Math.min(6, Math.max(1, Number(params.players) || rules.presets[0].players));
  const startingValue = Number(params.start) || rules.presets[0].startingValue;
  const metric = params.metric || rules.presets[0].metric;
  const largeStep = Number(params.step) || rules.presets[0].step;
  const modeName = params.mode || rules.presets[0].mode;

  const initialPlayers = useMemo<Player[]>(() => Array.from({ length: playerCount }, (_, index) => ({
    id: index + 1,
    name: `PLAYER ${index + 1}`,
    value: startingValue,
    counters: [],
    mana: { ...EMPTY_MANA },
    manaColors: [],
  })), [playerCount, startingValue]);

  const [players, setPlayers] = useState(initialPlayers);
  const [activePlayer, setActivePlayer] = useState(0);
  const [activePhase, setActivePhase] = useState(0);
  const [counterPlayerId, setCounterPlayerId] = useState<number | null>(null);
  const [counterRole, setCounterRole] = useState<CounterRole>(rules.defaultCounter);
  const [temporary, setTemporary] = useState(false);
  const [manaPlayerId, setManaPlayerId] = useState<number | null>(null);
  const [manaColorPickerId, setManaColorPickerId] = useState<number | null>(null);

  const updatePlayers = (update: (player: Player) => Player) => setPlayers((current) => current.map(update));
  const activeName = players[activePlayer]?.name ?? 'PLAYER 1';
  const isLastPhase = activePhase === rules.phases.length - 1;

  const changeValue = (id: number, amount: number) => updatePlayers((player) => player.id === id ? { ...player, value: player.value + amount } : player);
  const removeCounter = (playerId: number, counterId: string) => updatePlayers((player) => player.id === playerId ? { ...player, counters: player.counters.filter((counter) => counter.id !== counterId) } : player);
  const changeCounter = (playerId: number, counterId: string, field: 'value' | 'secondaryValue', amount: number) => updatePlayers((player) => player.id === playerId ? {
    ...player,
    counters: player.counters.map((counter) => counter.id === counterId ? { ...counter, [field]: field === 'value' && COUNTER_KIND[counter.role] === 'single' ? Math.max(0, counter.value + amount) : (counter[field] ?? 0) + amount } : counter),
  } : player);
  const toggleCounter = (playerId: number, counterId: string) => updatePlayers((player) => player.id === playerId ? { ...player, counters: player.counters.map((counter) => counter.id === counterId ? { ...counter, active: !counter.active } : counter) } : player);
  const changeMana = (playerId: number, color: ManaColor, amount: number) => updatePlayers((player) => player.id === playerId ? { ...player, mana: { ...player.mana, [color]: Math.max(0, player.mana[color] + amount) } } : player);
  const toggleManaColor = (playerId: number, color: ManaColor) => updatePlayers((player) => player.id === playerId ? { ...player, manaColors: player.manaColors.includes(color) ? player.manaColors.filter((item) => item !== color) : [...player.manaColors, color] } : player);
  const clearActiveMana = () => {
    const playerId = players[activePlayer]?.id;
    if (playerId) updatePlayers((player) => player.id === playerId ? { ...player, mana: { ...EMPTY_MANA } } : player);
  };

  const addCounter = () => {
    if (counterPlayerId === null) return;
    const kind = COUNTER_KIND[counterRole];
    const counter: TrackedCounter = {
      id: `${Date.now()}-${counterRole}`,
      role: counterRole,
      value: kind === 'stats' ? 1 : kind === 'toggle' ? 0 : 1,
      secondaryValue: kind === 'stats' ? 1 : undefined,
      active: kind === 'toggle' ? false : undefined,
      temporary,
    };
    updatePlayers((player) => player.id === counterPlayerId ? { ...player, counters: [...player.counters, counter] } : player);
    setCounterPlayerId(null);
    setCounterRole(rules.defaultCounter);
    setTemporary(false);
  };

  const resetGame = () => { setPlayers(initialPlayers); setActivePlayer(0); setActivePhase(0); };
  const selectPhase = (index: number) => { if (rules.supportsMana && index !== activePhase) clearActiveMana(); setActivePhase(index); };
  const advance = () => {
    if (rules.supportsMana) clearActiveMana();
    if (!isLastPhase) { setActivePhase((current) => current + 1); return; }
    setPlayers((current) => current.map((player) => ({ ...player, counters: player.counters.filter((counter) => !counter.temporary) })));
    setActivePlayer((current) => (current + 1) % players.length);
    setActivePhase(0);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.topButton}><Text style={styles.topButtonText}>‹ SETUP</Text></Pressable>
        <View style={styles.turnStatus}><Text style={styles.gameMode}>{rules.name} · {modeName} · {theme.name}</Text><Text style={styles.turnLabel}>CURRENT TURN</Text><Text style={styles.turnName}>{activeName}</Text></View>
        <Pressable onPress={resetGame} style={styles.topButton}><Text style={styles.topButtonText}>RESET</Text></Pressable>
      </View>

      <ScrollView style={styles.boardScroll} contentContainerStyle={styles.grid} persistentScrollbar>
        {players.map((player, index) => (
          <PlayerPanel
            key={player.id}
            player={player}
            metric={metric}
            largeStep={largeStep}
            active={index === activePlayer}
            labels={theme.labels}
            supportsMana={rules.supportsMana}
            manaOpen={manaPlayerId === player.id}
            onToggleMana={() => setManaPlayerId((current) => current === player.id ? null : player.id)}
            onManaColors={() => setManaColorPickerId(player.id)}
            onChangeMana={changeMana}
            onChangeValue={changeValue}
            onChangeCounter={changeCounter}
            onToggleCounter={toggleCounter}
            onRemoveCounter={removeCounter}
            onAddCounter={() => setCounterPlayerId(player.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.turnControls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.phaseTrack}>
          {rules.phases.map((phase, index) => <Pressable key={phase} onPress={() => selectPhase(index)} style={[styles.phaseChip, index === activePhase && styles.activePhaseChip]}><Text style={[styles.phaseText, index === activePhase && styles.activePhaseText]}>{phase}</Text></Pressable>)}
        </ScrollView>
        <Pressable onPress={advance} style={styles.nextButton}><Text style={styles.nextButtonText}>{isLastPhase ? 'END TURN' : 'NEXT PHASE'}</Text><Text style={styles.nextButtonHint}>{isLastPhase ? `PASS TO ${players[(activePlayer + 1) % players.length].name}` : rules.phases[activePhase + 1]}</Text></Pressable>
      </View>

      <Modal transparent visible={counterPlayerId !== null} animationType="fade" onRequestClose={() => setCounterPlayerId(null)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Add {rules.name} counter</Text><Text style={styles.modalSubtitle}>This catalog comes from the active rules pack.</Text>
          <ScrollView style={styles.pickerScroll} persistentScrollbar>
            {rules.counterGroups.map((group) => <View key={group.title}><Text style={styles.groupTitle}>{group.title}</Text><View style={styles.roleGrid}>{group.roles.map((role) => <Pressable key={role} onPress={() => setCounterRole(role)} style={[styles.roleButton, counterRole === role && styles.selectedRole]}><Text style={styles.roleName}>{theme.labels[role]}</Text><Text style={styles.roleType}>{COUNTER_KIND[role] === 'stats' ? 'TWO VALUES' : COUNTER_KIND[role] === 'toggle' ? 'ON / OFF' : 'NUMBER'}</Text></Pressable>)}</View></View>)}
          </ScrollView>
          <Text style={styles.expiryLabel}>UNTIL END OF TURN?</Text>
          <View style={styles.expiryRow}><Pressable onPress={() => setTemporary(false)} style={[styles.expiryButton, !temporary && styles.selectedRole]}><Text style={styles.roleName}>PERSISTENT</Text></Pressable><Pressable onPress={() => setTemporary(true)} style={[styles.expiryButton, temporary && styles.selectedRole]}><Text style={styles.roleName}>TEMPORARY</Text></Pressable></View>
          <View style={styles.modalActions}><Pressable onPress={() => setCounterPlayerId(null)} style={styles.cancelButton}><Text style={styles.cancelText}>CANCEL</Text></Pressable><Pressable onPress={addCounter} style={styles.addButton}><Text style={styles.addText}>ADD</Text></Pressable></View>
        </View></View>
      </Modal>

      <Modal transparent visible={manaColorPickerId !== null} animationType="fade" onRequestClose={() => setManaColorPickerId(null)}>
        <View style={styles.modalBackdrop}><View style={styles.manaPickerCard}>
          <Text style={styles.modalTitle}>Choose mana colors</Text>
          <View style={styles.manaPickerGrid}>{MANA_COLORS.map((color) => { const player = players.find((item) => item.id === manaColorPickerId); const selected = player?.manaColors.includes(color) ?? false; return <Pressable key={color} onPress={() => manaColorPickerId && toggleManaColor(manaColorPickerId, color)} style={[styles.manaPickerButton, selected && styles.selectedRole]}><Text style={styles.manaSymbol}>{color}</Text><Text style={styles.roleType}>{selected ? 'SHOWN' : 'HIDDEN'}</Text></Pressable>; })}</View>
          <Pressable onPress={() => setManaColorPickerId(null)} style={styles.addButton}><Text style={styles.addText}>DONE</Text></Pressable>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

function PlayerPanel({ player, metric, largeStep, active, labels, supportsMana, manaOpen, onToggleMana, onManaColors, onChangeMana, onChangeValue, onChangeCounter, onToggleCounter, onRemoveCounter, onAddCounter }: {
  player: Player; metric: string; largeStep: number; active: boolean; labels: Record<CounterRole, string>; supportsMana: boolean; manaOpen: boolean;
  onToggleMana: () => void; onManaColors: () => void; onChangeMana: (id: number, color: ManaColor, amount: number) => void; onChangeValue: (id: number, amount: number) => void;
  onChangeCounter: (playerId: number, counterId: string, field: 'value' | 'secondaryValue', amount: number) => void; onToggleCounter: (playerId: number, counterId: string) => void; onRemoveCounter: (playerId: number, counterId: string) => void; onAddCounter: () => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const manaTotal = Object.values(player.mana).reduce((sum, value) => sum + value, 0);
  return <View style={[styles.panel, active && styles.activePanel]}>
    {active && <Text style={styles.activeBadge}>ACTIVE</Text>}
    {supportsMana && <View style={styles.manaRail}><Pressable onPress={onToggleMana} style={styles.manaButton}><Text style={styles.manaTitle}>MANA</Text><Text style={styles.manaTotal}>{manaTotal}</Text></Pressable>{manaOpen && <View style={styles.manaDrawer}><Pressable onPress={onManaColors}><Text style={styles.chooseColors}>COLORS</Text></Pressable>{player.manaColors.length === 0 ? <Text style={styles.emptyText}>Select colors</Text> : player.manaColors.map((color) => <View key={color} style={styles.manaRow}><Text style={styles.manaSymbol}>{color}</Text><Pressable onPress={() => onChangeMana(player.id, color, -1)}><Text style={styles.smallControl}>−</Text></Pressable><Text style={styles.trackedValue}>{player.mana[color]}</Text><Pressable onPress={() => onChangeMana(player.id, color, 1)}><Text style={styles.smallControl}>+</Text></Pressable></View>)}</View>}</View>}
    <Text style={styles.playerName}>{player.name}</Text><Text style={styles.metric}>{metric}</Text><Text style={styles.value}>{player.value}</Text>
    <View style={styles.controls}>{[-largeStep, -1, 1, largeStep].map((amount) => <Pressable key={amount} onPress={() => onChangeValue(player.id, amount)} style={styles.counterButton}><Text style={styles.counterButtonText}>{amount > 0 ? `+${amount}` : amount}</Text></Pressable>)}</View>
    <View style={styles.playerCounters}>{player.counters.map((counter) => { const kind = COUNTER_KIND[counter.role]; return <Pressable key={counter.id} onLongPress={() => setDeleteId(counter.id)} style={[styles.trackedCounter, kind === 'stats' && styles.statsCounter]}><Text style={styles.trackedLabel}>{labels[counter.role]}{counter.temporary ? ' · EOT' : ''}</Text>{kind === 'single' && <ValueControl value={counter.value} onMinus={() => onChangeCounter(player.id, counter.id, 'value', -1)} onPlus={() => onChangeCounter(player.id, counter.id, 'value', 1)} />}{kind === 'stats' && <><ValueControl label="A" value={counter.value} onMinus={() => onChangeCounter(player.id, counter.id, 'value', -1)} onPlus={() => onChangeCounter(player.id, counter.id, 'value', 1)} /><ValueControl label="B" value={counter.secondaryValue ?? 0} onMinus={() => onChangeCounter(player.id, counter.id, 'secondaryValue', -1)} onPlus={() => onChangeCounter(player.id, counter.id, 'secondaryValue', 1)} /></>}{kind === 'toggle' && <Pressable onPress={() => onToggleCounter(player.id, counter.id)} style={[styles.toggleButton, counter.active && styles.toggleActive]}><Text style={styles.toggleText}>{counter.active ? 'ACTIVE' : 'INACTIVE'}</Text></Pressable>}{deleteId === counter.id && <Pressable onPress={() => onRemoveCounter(player.id, counter.id)} style={styles.deleteCounter}><Text style={styles.deleteText}>×</Text></Pressable>}</Pressable>; })}<Pressable onPress={onAddCounter} style={styles.addCounterChip}><Text style={styles.addCounterText}>＋ COUNTER</Text></Pressable></View>
  </View>;
}

function ValueControl({ label, value, onMinus, onPlus }: { label?: string; value: number; onMinus: () => void; onPlus: () => void }) {
  return <View style={styles.valueControl}>{label && <Text style={styles.statLabel}>{label}</Text>}<Pressable onPress={onMinus}><Text style={styles.smallControl}>−</Text></Pressable><Text style={styles.trackedValue}>{value > 0 && label ? `+${value}` : value}</Text><Pressable onPress={onPlus}><Text style={styles.smallControl}>+</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080A0F', paddingHorizontal: 12, paddingBottom: 8 }, topBar: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, topButton: { minWidth: 82, paddingVertical: 9, borderRadius: 11, backgroundColor: '#151820', alignItems: 'center' }, topButtonText: { color: '#AEB3C1', fontSize: 10, fontWeight: '900' }, turnStatus: { alignItems: 'center' }, gameMode: { color: '#8F7CFF', fontSize: 7, fontWeight: '900' }, turnLabel: { color: '#676D7D', fontSize: 7, fontWeight: '900' }, turnName: { color: '#F4F3FF', fontSize: 16, fontWeight: '900' }, boardScroll: { flex: 1 }, grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8, paddingBottom: 18 },
  panel: { width: '48.5%', minHeight: 230, borderRadius: 18, borderWidth: 1, borderColor: '#252936', backgroundColor: '#11141B', alignItems: 'center', padding: 8, paddingTop: 16 }, activePanel: { borderColor: '#8F7CFF', borderWidth: 3, backgroundColor: '#181528' }, activeBadge: { position: 'absolute', top: 7, right: 9, color: '#B8ACFF', fontSize: 7, fontWeight: '900' }, playerName: { color: '#AEB3C1', fontSize: 10, fontWeight: '900' }, metric: { color: '#5F6573', fontSize: 7, fontWeight: '900' }, value: { color: '#FFFFFF', fontSize: 43, lineHeight: 46, fontWeight: '900' }, controls: { flexDirection: 'row', gap: 5 }, counterButton: { minWidth: 42, paddingVertical: 7, borderRadius: 9, backgroundColor: '#222630', alignItems: 'center' }, counterButtonText: { color: '#E5E1FF', fontSize: 12, fontWeight: '900' },
  manaRail: { position: 'absolute', left: 6, top: 8, zIndex: 4 }, manaButton: { width: 46, minHeight: 42, borderRadius: 10, backgroundColor: '#27213F', borderWidth: 1, borderColor: '#6655B8', alignItems: 'center', justifyContent: 'center' }, manaTitle: { color: '#BDB6FF', fontSize: 6, fontWeight: '900' }, manaTotal: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, manaDrawer: { marginTop: 5, width: 122, borderRadius: 12, backgroundColor: '#171A22', borderWidth: 1, borderColor: '#343948', padding: 7, gap: 5 }, chooseColors: { color: '#BDB6FF', fontSize: 8, fontWeight: '900', textAlign: 'center' }, emptyText: { color: '#757B8A', fontSize: 8, textAlign: 'center' }, manaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, manaSymbol: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  playerCounters: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 9, justifyContent: 'center' }, trackedCounter: { minWidth: 96, minHeight: 48, borderRadius: 10, backgroundColor: '#1B1E27', paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center' }, statsCounter: { minWidth: 145 }, trackedLabel: { color: '#9DA3B2', fontSize: 7, fontWeight: '900', textAlign: 'center' }, valueControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }, statLabel: { color: '#777D8D', fontSize: 7, fontWeight: '900' }, smallControl: { color: '#BDB6FF', fontSize: 17, fontWeight: '900', paddingHorizontal: 5 }, trackedValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, toggleButton: { borderRadius: 8, backgroundColor: '#242833', paddingVertical: 7, alignItems: 'center' }, toggleActive: { backgroundColor: '#4D3FA3' }, toggleText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' }, deleteCounter: { position: 'absolute', right: -5, top: -7, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF5F6D', alignItems: 'center', justifyContent: 'center' }, deleteText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' }, addCounterChip: { minWidth: 96, height: 48, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#4C5060', alignItems: 'center', justifyContent: 'center' }, addCounterText: { color: '#8F7CFF', fontSize: 8, fontWeight: '900' },
  turnControls: { flexDirection: 'row', gap: 8, height: 62, paddingTop: 4 }, phaseTrack: { alignItems: 'center', gap: 6 }, phaseChip: { minWidth: 58, height: 42, borderRadius: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151820', borderWidth: 1, borderColor: '#252936' }, activePhaseChip: { backgroundColor: '#312A59', borderColor: '#8F7CFF' }, phaseText: { color: '#737988', fontSize: 8, fontWeight: '900' }, activePhaseText: { color: '#E3DFFF' }, nextButton: { width: 170, borderRadius: 15, backgroundColor: '#7560FF', alignItems: 'center', justifyContent: 'center' }, nextButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' }, nextButtonHint: { color: '#D9D4FF', fontSize: 7, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 18 }, modalCard: { width: '100%', maxWidth: 620, maxHeight: '92%', borderRadius: 22, backgroundColor: '#12151D', borderWidth: 1, borderColor: '#303544', padding: 18 }, manaPickerCard: { width: '100%', maxWidth: 460, borderRadius: 22, backgroundColor: '#12151D', borderWidth: 1, borderColor: '#303544', padding: 18, gap: 14 }, modalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' }, modalSubtitle: { color: '#8E94A6', fontSize: 10, marginTop: 4, marginBottom: 10 }, pickerScroll: { maxHeight: 280 }, groupTitle: { color: '#777D8D', fontSize: 8, fontWeight: '900', marginTop: 8, marginBottom: 6 }, roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, roleButton: { width: '31.5%', minHeight: 64, borderRadius: 12, backgroundColor: '#1A1D26', borderWidth: 1, borderColor: '#2A2F3C', padding: 8, justifyContent: 'center' }, selectedRole: { borderColor: '#8F7CFF', backgroundColor: '#2C2750' }, roleName: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' }, roleType: { color: '#686E7C', fontSize: 6, fontWeight: '800', marginTop: 3 }, expiryLabel: { color: '#777D8D', fontSize: 8, fontWeight: '900', marginTop: 12, marginBottom: 7 }, expiryRow: { flexDirection: 'row', gap: 8 }, expiryButton: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: '#1A1D26', borderWidth: 1, borderColor: '#2A2F3C', alignItems: 'center', justifyContent: 'center' }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }, cancelButton: { paddingVertical: 12, paddingHorizontal: 18 }, cancelText: { color: '#8E94A6', fontSize: 11, fontWeight: '900' }, addButton: { borderRadius: 12, backgroundColor: '#7560FF', paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' }, addText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' }, manaPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, manaPickerButton: { width: '31%', minHeight: 62, borderRadius: 12, backgroundColor: '#1A1D26', borderWidth: 1, borderColor: '#2A2F3C', alignItems: 'center', justifyContent: 'center' },
});
