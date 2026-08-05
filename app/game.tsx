import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';
type ManaPool = Record<ManaColor, number>;
type CounterKind = 'single' | 'stats' | 'toggle';
type CounterRole =
  | 'enemy' | 'treasure' | 'food' | 'resource' | 'buff' | 'debuff'
  | 'objective' | 'poison' | 'energy' | 'experience' | 'storm'
  | 'monarch' | 'initiative' | 'daynight' | 'damage' | 'status'
  | 'attachedEnergy' | 'spellCounter' | 'turnCounter' | 'tempHp'
  | 'inspiration' | 'condition' | 'spellSlot' | 'custom';

type TrackedCounter = {
  id: string;
  role: CounterRole;
  kind: CounterKind;
  value: number;
  secondaryValue?: number;
  active?: boolean;
  temporary: boolean;
};

type Player = {
  id: number;
  name: string;
  value: number;
  counters: TrackedCounter[];
  mana: ManaPool;
  manaColors: ManaColor[];
};

type CounterGroup = { title: string; roles: CounterRole[] };
type Theme = { name: string; labels: Record<CounterRole, string> };

const EMPTY_MANA: ManaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
const MANA_COLORS: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];

const BASE_LABELS: Record<CounterRole, string> = {
  enemy: 'Creature Modifier', treasure: 'Treasure', food: 'Food', resource: 'Resource',
  buff: 'Buff', debuff: 'Debuff', objective: 'Objective', poison: 'Poison', energy: 'Energy',
  experience: 'Experience', storm: 'Storm Count', monarch: 'Monarch', initiative: 'Initiative',
  daynight: 'Day / Night', damage: 'Damage Counters', status: 'Status Condition',
  attachedEnergy: 'Attached Energy', spellCounter: 'Spell Counter', turnCounter: 'Turn Counter',
  tempHp: 'Temporary HP', inspiration: 'Inspiration', condition: 'Condition', spellSlot: 'Spell Slot',
  custom: 'Custom Counter',
};

const THEMES: Record<string, Theme> = {
  arcane: { name: 'Arcane', labels: BASE_LABELS },
  fantasy: {
    name: 'Fantasy Raid',
    labels: { ...BASE_LABELS, enemy: 'Enemy Modifier', treasure: 'Gold', food: 'Rations', resource: 'Supplies', buff: 'Blessing', debuff: 'Curse', objective: 'Quest', poison: 'Venom', energy: 'Stamina', experience: 'Renown', storm: 'Combo', monarch: 'Crowned', initiative: 'Dungeon Lead', inspiration: 'Heroic Spark' },
  },
  scifi: {
    name: 'Sci-Fi',
    labels: { ...BASE_LABELS, enemy: 'Target Modifier', treasure: 'Credits', food: 'Med Packs', resource: 'Energy Cells', buff: 'Upgrade', debuff: 'Malfunction', objective: 'Mission', poison: 'Contamination', energy: 'Charge', experience: 'Intel', storm: 'Chain', monarch: 'Command', initiative: 'Priority', daynight: 'Cycle', tempHp: 'Shield HP', spellSlot: 'Ability Charge' },
  },
};

const COUNTER_KIND: Record<CounterRole, CounterKind> = {
  enemy: 'stats', treasure: 'single', food: 'single', resource: 'single', buff: 'single', debuff: 'single',
  objective: 'single', poison: 'single', energy: 'single', experience: 'single', storm: 'single',
  monarch: 'toggle', initiative: 'toggle', daynight: 'toggle', damage: 'single', status: 'toggle',
  attachedEnergy: 'single', spellCounter: 'single', turnCounter: 'single', tempHp: 'single',
  inspiration: 'toggle', condition: 'toggle', spellSlot: 'single', custom: 'single',
};

const CATALOGS: Record<string, CounterGroup[]> = {
  MAGIC: [
    { title: 'PLAYER COUNTERS', roles: ['treasure', 'food', 'poison', 'energy', 'experience'] },
    { title: 'CREATURE / EFFECTS', roles: ['enemy', 'buff', 'debuff', 'objective'] },
    { title: 'GAME STATE', roles: ['storm', 'monarch', 'initiative', 'daynight', 'custom'] },
  ],
  POKEMON: [
    { title: 'POKÉMON', roles: ['damage', 'status', 'attachedEnergy'] },
    { title: 'MATCH', roles: ['turnCounter', 'objective', 'custom'] },
  ],
  YUGIOH: [
    { title: 'DUEL COUNTERS', roles: ['spellCounter', 'turnCounter', 'enemy'] },
    { title: 'EFFECTS', roles: ['buff', 'debuff', 'status', 'custom'] },
  ],
  DND: [
    { title: 'CHARACTER', roles: ['tempHp', 'inspiration', 'condition', 'spellSlot'] },
    { title: 'ENCOUNTER', roles: ['enemy', 'resource', 'objective', 'custom'] },
  ],
};

const PHASES_BY_GAME: Record<string, string[]> = {
  MAGIC: ['UNTAP', 'UPKEEP', 'DRAW', 'MAIN 1', 'COMBAT', 'MAIN 2', 'END'],
  POKEMON: ['DRAW', 'ACTIONS', 'ATTACK', 'CHECKUP'],
  YUGIOH: ['DRAW', 'STANDBY', 'MAIN 1', 'BATTLE', 'MAIN 2', 'END'],
  DND: ['START', 'MOVE', 'ACTION', 'BONUS', 'END'],
};

function normalizeGame(game: string) {
  const normalized = game.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('POKEMON')) return 'POKEMON';
  if (normalized.includes('YU-GI-OH')) return 'YUGIOH';
  if (normalized.includes('D&D')) return 'DND';
  return 'MAGIC';
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ game?: string; mode?: string; players?: string; start?: string; metric?: string; step?: string; theme?: string }>();
  const playerCount = Math.min(6, Math.max(1, Number(params.players) || 4));
  const startingValue = Number(params.start) || 40;
  const metric = params.metric || 'LIFE';
  const largeStep = Number(params.step) || 5;
  const gameName = params.game || 'MAGIC';
  const gameKey = normalizeGame(gameName);
  const modeName = params.mode || 'Commander';
  const theme = THEMES[params.theme || 'arcane'] ?? THEMES.arcane;
  const phases = PHASES_BY_GAME[gameKey];
  const counterGroups = CATALOGS[gameKey];
  const isMagic = gameKey === 'MAGIC';
  const defaultRole = counterGroups[0].roles[0];

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
  const [counterRole, setCounterRole] = useState<CounterRole>(defaultRole);
  const [temporary, setTemporary] = useState(false);
  const [manaPlayerId, setManaPlayerId] = useState<number | null>(null);
  const [manaColorPickerId, setManaColorPickerId] = useState<number | null>(null);

  const activeName = players[activePlayer]?.name ?? 'PLAYER 1';
  const isLastPhase = activePhase === phases.length - 1;
  const updatePlayers = (updater: (player: Player) => Player) => setPlayers((current) => current.map(updater));

  const changeValue = (id: number, amount: number) => updatePlayers((player) => player.id === id ? { ...player, value: player.value + amount } : player);
  const removeCounter = (playerId: number, counterId: string) => updatePlayers((player) => player.id === playerId ? { ...player, counters: player.counters.filter((counter) => counter.id !== counterId) } : player);
  const changeSingle = (playerId: number, counterId: string, amount: number) => updatePlayers((player) => player.id === playerId ? { ...player, counters: player.counters.map((counter) => counter.id === counterId ? { ...counter, value: Math.max(0, counter.value + amount) } : counter) } : player);
  const changeStat = (playerId: number, counterId: string, field: 'value' | 'secondaryValue', amount: number) => updatePlayers((player) => player.id === playerId ? { ...player, counters: player.counters.map((counter) => counter.id === counterId ? { ...counter, [field]: (counter[field] ?? 0) + amount } : counter) } : player);
  const toggleCounter = (playerId: number, counterId: string) => updatePlayers((player) => player.id === playerId ? { ...player, counters: player.counters.map((counter) => counter.id === counterId ? { ...counter, active: !counter.active } : counter) } : player);
  const changeMana = (playerId: number, color: ManaColor, amount: number) => updatePlayers((player) => player.id === playerId ? { ...player, mana: { ...player.mana, [color]: Math.max(0, player.mana[color] + amount) } } : player);
  const toggleManaColor = (playerId: number, color: ManaColor) => updatePlayers((player) => player.id === playerId ? { ...player, manaColors: player.manaColors.includes(color) ? player.manaColors.filter((item) => item !== color) : [...player.manaColors, color] } : player);
  const clearManaForPlayer = (playerIndex: number) => {
    const playerId = players[playerIndex]?.id;
    if (playerId) updatePlayers((player) => player.id === playerId ? { ...player, mana: { ...EMPTY_MANA } } : player);
  };

  const addCounter = () => {
    if (counterPlayerId === null) return;
    const kind = COUNTER_KIND[counterRole];
    const newCounter: TrackedCounter = {
      id: `${Date.now()}-${counterRole}`,
      role: counterRole,
      kind,
      value: kind === 'stats' ? 1 : kind === 'toggle' ? 0 : 1,
      secondaryValue: kind === 'stats' ? 1 : undefined,
      active: kind === 'toggle' ? false : undefined,
      temporary,
    };
    updatePlayers((player) => player.id === counterPlayerId ? { ...player, counters: [...player.counters, newCounter] } : player);
    setCounterPlayerId(null);
    setCounterRole(defaultRole);
    setTemporary(false);
  };

  const resetGame = () => { setPlayers(initialPlayers); setActivePlayer(0); setActivePhase(0); };
  const selectPhase = (index: number) => { if (index !== activePhase && isMagic) clearManaForPlayer(activePlayer); setActivePhase(index); };
  const advanceGame = () => {
    if (isMagic) clearManaForPlayer(activePlayer);
    if (!isLastPhase) { setActivePhase((current) => current + 1); return; }
    setPlayers((current) => current.map((player) => ({ ...player, counters: player.counters.filter((counter) => !counter.temporary) })));
    setActivePlayer((current) => (current + 1) % players.length);
    setActivePhase(0);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.topButton}><Text style={styles.topButtonText}>‹ SETUP</Text></Pressable>
        <View style={styles.turnStatus}><Text style={styles.gameMode}>{gameName} · {modeName} · {theme.name}</Text><Text style={styles.turnLabel}>CURRENT TURN</Text><Text style={styles.turnName}>{activeName}</Text></View>
        <Pressable onPress={resetGame} style={styles.topButton}><Text style={styles.topButtonText}>RESET</Text></Pressable>
      </View>

      <ScrollView style={styles.boardScroll} contentContainerStyle={styles.grid} showsVerticalScrollIndicator nestedScrollEnabled persistentScrollbar>
        {players.map((player, index) => (
          <PlayerPanel key={player.id} player={player} metric={metric} largeStep={largeStep} isActive={index === activePlayer} theme={theme} showMana={isMagic} manaOpen={manaPlayerId === player.id} onToggleMana={() => setManaPlayerId((current) => current === player.id ? null : player.id)} onOpenManaColors={() => setManaColorPickerId(player.id)} onChangeMana={changeMana} onChange={changeValue} onChangeSingle={changeSingle} onChangeStat={changeStat} onToggle={toggleCounter} onRemoveCounter={removeCounter} onAddCounter={() => setCounterPlayerId(player.id)} />
        ))}
      </ScrollView>

      <View style={styles.turnControls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.phaseTrack}>
          {phases.map((phase, index) => <Pressable key={phase} onPress={() => selectPhase(index)} style={[styles.phaseChip, index === activePhase && styles.activePhaseChip]}><Text style={[styles.phaseText, index === activePhase && styles.activePhaseText]}>{phase}</Text></Pressable>)}
        </ScrollView>
        <Pressable onPress={advanceGame} style={styles.nextButton}><View><Text style={styles.nextButtonText}>{isLastPhase ? 'END TURN' : 'NEXT PHASE'}</Text><Text style={styles.nextButtonHint}>{isLastPhase ? `PASS TO ${players[(activePlayer + 1) % players.length].name}` : phases[activePhase + 1]}</Text></View><Text style={styles.nextArrow}>›</Text></Pressable>
      </View>

      <Modal transparent visible={counterPlayerId !== null} animationType="fade" onRequestClose={() => setCounterPlayerId(null)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Add {gameName} counter</Text>
          <Text style={styles.modalSubtitle}>Only mechanics relevant to this game are shown.</Text>
          <ScrollView style={styles.counterPickerScroll} contentContainerStyle={styles.counterPickerContent} showsVerticalScrollIndicator persistentScrollbar indicatorStyle="white">
            {counterGroups.map((group) => <View key={group.title}><Text style={styles.groupTitle}>{group.title}</Text><View style={styles.roleGrid}>{group.roles.map((role) => <Pressable key={role} onPress={() => setCounterRole(role)} style={[styles.roleButton, counterRole === role && styles.selectedRole]}><Text style={styles.roleKey}>{role.toUpperCase()}</Text><Text style={styles.roleName}>{theme.labels[role]}</Text><Text style={styles.roleType}>{COUNTER_KIND[role] === 'stats' ? 'TWO VALUES' : COUNTER_KIND[role] === 'toggle' ? 'ON / OFF' : 'NUMBER'}</Text></Pressable>)}</View></View>)}
          </ScrollView>
          <Text style={styles.expiryLabel}>UNTIL END OF TURN?</Text>
          <View style={styles.expiryRow}><Pressable onPress={() => setTemporary(false)} style={[styles.expiryButton, !temporary && styles.selectedRole]}><Text style={styles.roleName}>NO · PERSISTENT</Text></Pressable><Pressable onPress={() => setTemporary(true)} style={[styles.expiryButton, temporary && styles.selectedRole]}><Text style={styles.roleName}>YES · TEMPORARY</Text></Pressable></View>
          <View style={styles.modalActions}><Pressable onPress={() => setCounterPlayerId(null)} style={styles.cancelButton}><Text style={styles.cancelText}>CANCEL</Text></Pressable><Pressable onPress={addCounter} style={styles.addButton}><Text style={styles.addText}>ADD {theme.labels[counterRole].toUpperCase()}</Text></Pressable></View>
        </View></View>
      </Modal>

      <Modal transparent visible={manaColorPickerId !== null} animationType="fade" onRequestClose={() => setManaColorPickerId(null)}>
        <View style={styles.modalBackdrop}><View style={styles.manaPickerCard}>
          <Text style={styles.modalTitle}>Choose mana colors</Text>
          <Text style={styles.modalSubtitle}>Only selected colors appear in this player’s mana drawer.</Text>
          <View style={styles.manaPickerGrid}>{MANA_COLORS.map((color) => { const player = players.find((item) => item.id === manaColorPickerId); const selected = player?.manaColors.includes(color) ?? false; return <Pressable key={color} onPress={() => manaColorPickerId && toggleManaColor(manaColorPickerId, color)} style={[styles.manaPickerButton, selected && styles.selectedManaColor]}><Text style={[styles.manaSymbol, styles[`mana${color}` as keyof typeof styles] as object]}>{color}</Text><Text style={styles.roleName}>{selected ? 'SHOWN' : 'HIDDEN'}</Text></Pressable>; })}</View>
          <Pressable onPress={() => setManaColorPickerId(null)} style={styles.addButton}><Text style={styles.addText}>DONE</Text></Pressable>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

function PlayerPanel({ player, metric, largeStep, isActive, theme, showMana, manaOpen, onToggleMana, onOpenManaColors, onChangeMana, onChange, onChangeSingle, onChangeStat, onToggle, onRemoveCounter, onAddCounter }: {
  player: Player; metric: string; largeStep: number; isActive: boolean; theme: Theme; showMana: boolean; manaOpen: boolean;
  onToggleMana: () => void; onOpenManaColors: () => void; onChangeMana: (playerId: number, color: ManaColor, amount: number) => void;
  onChange: (id: number, amount: number) => void; onChangeSingle: (playerId: number, counterId: string, amount: number) => void;
  onChangeStat: (playerId: number, counterId: string, field: 'value' | 'secondaryValue', amount: number) => void;
  onToggle: (playerId: number, counterId: string) => void; onRemoveCounter: (playerId: number, counterId: string) => void; onAddCounter: () => void;
}) {
  const [deleteMode, setDeleteMode] = useState<string | null>(null);
  const manaTotal = Object.values(player.mana).reduce((sum, value) => sum + value, 0);
  return <View style={[styles.panel, isActive && styles.activePanel]}>
    {isActive && <Text style={styles.activeBadge}>ACTIVE</Text>}
    {showMana && <View style={styles.manaRail}><Pressable onPress={onToggleMana} style={styles.manaRailButton}><Text style={styles.manaRailTitle}>MANA</Text><Text style={styles.manaRailValue}>{manaTotal}</Text></Pressable>{manaOpen && <View style={styles.manaDrawer}><Pressable onPress={onOpenManaColors} style={styles.chooseColorsButton}><Text style={styles.chooseColorsText}>COLORS</Text></Pressable>{player.manaColors.length === 0 ? <Text style={styles.emptyManaText}>Select colors</Text> : player.manaColors.map((color) => <View key={color} style={styles.manaRow}><Text style={[styles.manaSymbol, styles[`mana${color}` as keyof typeof styles] as object]}>{color}</Text><Pressable onPress={() => onChangeMana(player.id, color, -1)}><Text style={styles.manaButton}>−</Text></Pressable><Text style={styles.manaValue}>{player.mana[color]}</Text><Pressable onPress={() => onChangeMana(player.id, color, 1)}><Text style={styles.manaButton}>+</Text></Pressable></View>)}</View>}</View>}
    <Text style={styles.playerName}>{player.name}</Text><Text style={styles.metric}>{metric}</Text><Text style={[styles.value, player.value <= 10 && metric !== 'PRIZE CARDS' && styles.lowValue]}>{player.value}</Text>
    <View style={styles.controls}><CounterButton label={`−${largeStep}`} onPress={() => onChange(player.id, -largeStep)} /><CounterButton label="−1" onPress={() => onChange(player.id, -1)} primary /><CounterButton label="+1" onPress={() => onChange(player.id, 1)} primary /><CounterButton label={`+${largeStep}`} onPress={() => onChange(player.id, largeStep)} /></View>
    <View style={styles.playerCounters}>{player.counters.map((counter) => <Pressable key={counter.id} onLongPress={() => setDeleteMode(counter.id)} style={[styles.trackedCounter, counter.kind === 'stats' && styles.statsCounter]}><Text style={styles.trackedLabel}>{theme.labels[counter.role]}{counter.temporary ? ' · EOT' : ''}</Text>{counter.kind === 'single' && <View style={styles.trackedControls}><Pressable onPress={() => onChangeSingle(player.id, counter.id, -1)}><Text style={styles.smallControl}>−</Text></Pressable><Text style={styles.trackedValue}>{counter.value}</Text><Pressable onPress={() => onChangeSingle(player.id, counter.id, 1)}><Text style={styles.smallControl}>+</Text></Pressable></View>}{counter.kind === 'stats' && <View style={styles.statRows}><StatControl label="A" value={counter.value} onMinus={() => onChangeStat(player.id, counter.id, 'value', -1)} onPlus={() => onChangeStat(player.id, counter.id, 'value', 1)} /><StatControl label="B" value={counter.secondaryValue ?? 0} onMinus={() => onChangeStat(player.id, counter.id, 'secondaryValue', -1)} onPlus={() => onChangeStat(player.id, counter.id, 'secondaryValue', 1)} /></View>}{counter.kind === 'toggle' && <Pressable onPress={() => onToggle(player.id, counter.id)} style={[styles.toggleButton, counter.active && styles.toggleButtonActive]}><Text style={[styles.toggleText, counter.active && styles.toggleTextActive]}>{counter.active ? 'ACTIVE' : 'INACTIVE'}</Text></Pressable>}{deleteMode === counter.id && <Pressable onPress={() => onRemoveCounter(player.id, counter.id)} style={styles.deleteCounter}><Text style={styles.deleteText}>×</Text></Pressable>}</Pressable>)}<Pressable onPress={onAddCounter} style={styles.addCounterChip}><Text style={styles.addCounterText}>＋ COUNTER</Text></Pressable></View>
  </View>;
}

function CounterButton({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) { return <Pressable onPress={onPress} style={[styles.counterButton, primary && styles.counterButtonPrimary]}><Text style={[styles.counterButtonText, primary && styles.counterButtonPrimaryText]}>{label}</Text></Pressable>; }
function StatControl({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) { const formatted = value > 0 ? `+${value}` : String(value); return <View style={styles.statRow}><Text style={styles.statLabel}>{label}</Text><Pressable onPress={onMinus}><Text style={styles.statButton}>−</Text></Pressable><Text style={styles.statValue}>{formatted}</Text><Pressable onPress={onPlus}><Text style={styles.statButton}>+</Text></Pressable></View>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080A0F', paddingHorizontal: 12, paddingBottom: 8 }, topBar: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, topButton: { minWidth: 82, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 11, backgroundColor: '#151820', alignItems: 'center' }, topButtonText: { color: '#AEB3C1', fontSize: 10, fontWeight: '900' }, turnStatus: { alignItems: 'center' }, gameMode: { color: '#8F7CFF', fontSize: 7, fontWeight: '900' }, turnLabel: { color: '#676D7D', fontSize: 7, fontWeight: '900' }, turnName: { color: '#F4F3FF', fontSize: 16, fontWeight: '900' }, boardScroll: { flex: 1, minHeight: 0 }, grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8, paddingBottom: 18 },
  panel: { width: '48.5%', minHeight: 230, borderRadius: 18, borderWidth: 1, borderColor: '#252936', backgroundColor: '#11141B', alignItems: 'center', padding: 8, paddingTop: 16 }, activePanel: { borderColor: '#8F7CFF', borderWidth: 3, backgroundColor: '#181528' }, activeBadge: { position: 'absolute', top: 7, right: 9, color: '#B8ACFF', fontSize: 7, fontWeight: '900' }, playerName: { color: '#AEB3C1', fontSize: 10, fontWeight: '900' }, metric: { color: '#5F6573', fontSize: 7, fontWeight: '900' }, value: { color: '#FFFFFF', fontSize: 43, lineHeight: 46, fontWeight: '900' }, lowValue: { color: '#FF6B78' }, controls: { flexDirection: 'row', gap: 5 }, counterButton: { minWidth: 42, paddingVertical: 7, borderRadius: 9, backgroundColor: '#222630', alignItems: 'center' }, counterButtonPrimary: { backgroundColor: '#343047' }, counterButtonText: { color: '#AEB3C1', fontSize: 11, fontWeight: '900' }, counterButtonPrimaryText: { color: '#E5E1FF', fontSize: 14 },
  manaRail: { position: 'absolute', left: 6, top: 8, zIndex: 4, alignItems: 'flex-start' }, manaRailButton: { width: 46, minHeight: 42, borderRadius: 10, backgroundColor: '#27213F', borderWidth: 1, borderColor: '#6655B8', alignItems: 'center', justifyContent: 'center' }, manaRailTitle: { color: '#BDB6FF', fontSize: 6, fontWeight: '900' }, manaRailValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, manaDrawer: { marginTop: 5, width: 122, borderRadius: 12, backgroundColor: '#171A22', borderWidth: 1, borderColor: '#343948', padding: 7, gap: 5 }, chooseColorsButton: { borderRadius: 8, backgroundColor: '#2D2942', paddingVertical: 6, alignItems: 'center' }, chooseColorsText: { color: '#BDB6FF', fontSize: 7, fontWeight: '900' }, emptyManaText: { color: '#757B8A', fontSize: 8, textAlign: 'center', paddingVertical: 6 }, manaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, manaSymbol: { width: 24, height: 24, borderRadius: 12, textAlign: 'center', textAlignVertical: 'center', fontSize: 10, fontWeight: '900', overflow: 'hidden' }, manaW: { backgroundColor: '#F3E7C3', color: '#3A3428' }, manaU: { backgroundColor: '#4D9DD6', color: '#FFFFFF' }, manaB: { backgroundColor: '#443B4A', color: '#FFFFFF' }, manaR: { backgroundColor: '#D65C4A', color: '#FFFFFF' }, manaG: { backgroundColor: '#4E9362', color: '#FFFFFF' }, manaC: { backgroundColor: '#9CA1A8', color: '#20242A' }, manaButton: { color: '#BDB6FF', fontSize: 16, fontWeight: '900', paddingHorizontal: 4 }, manaValue: { minWidth: 18, color: '#FFFFFF', fontSize: 12, fontWeight: '900', textAlign: 'center' },
  playerCounters: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 9, justifyContent: 'center' }, trackedCounter: { minWidth: 96, minHeight: 48, borderRadius: 10, backgroundColor: '#1B1E27', paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center' }, statsCounter: { minWidth: 145 }, trackedLabel: { color: '#9DA3B2', fontSize: 7, fontWeight: '900', textAlign: 'center', marginBottom: 2 }, trackedControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }, smallControl: { color: '#BDB6FF', fontSize: 17, fontWeight: '900', paddingHorizontal: 5 }, trackedValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' }, statRows: { gap: 2 }, statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, statLabel: { width: 24, color: '#777D8D', fontSize: 7, fontWeight: '900' }, statButton: { color: '#BDB6FF', fontSize: 16, fontWeight: '900', paddingHorizontal: 5 }, statValue: { minWidth: 28, color: '#FFFFFF', fontSize: 13, fontWeight: '900', textAlign: 'center' }, toggleButton: { borderRadius: 8, backgroundColor: '#242833', paddingVertical: 7, paddingHorizontal: 10, alignItems: 'center' }, toggleButtonActive: { backgroundColor: '#4D3FA3' }, toggleText: { color: '#7F8594', fontSize: 8, fontWeight: '900' }, toggleTextActive: { color: '#FFFFFF' }, deleteCounter: { position: 'absolute', right: -5, top: -7, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF5F6D', alignItems: 'center', justifyContent: 'center' }, deleteText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' }, addCounterChip: { minWidth: 96, height: 48, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#4C5060', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }, addCounterText: { color: '#8F7CFF', fontSize: 8, fontWeight: '900' },
  turnControls: { flexDirection: 'row', gap: 8, height: 62, paddingTop: 4 }, phaseTrack: { alignItems: 'center', gap: 6 }, phaseChip: { minWidth: 58, height: 42, borderRadius: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151820', borderWidth: 1, borderColor: '#252936' }, activePhaseChip: { backgroundColor: '#312A59', borderColor: '#8F7CFF' }, phaseText: { color: '#737988', fontSize: 8, fontWeight: '900' }, activePhaseText: { color: '#E3DFFF' }, nextButton: { width: 170, borderRadius: 15, backgroundColor: '#7560FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }, nextButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' }, nextButtonHint: { color: '#D9D4FF', fontSize: 7, fontWeight: '800' }, nextArrow: { color: '#FFFFFF', fontSize: 28 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 18 }, modalCard: { width: '100%', maxWidth: 620, maxHeight: '92%', borderRadius: 22, backgroundColor: '#12151D', borderWidth: 1, borderColor: '#303544', padding: 18 }, manaPickerCard: { width: '100%', maxWidth: 460, borderRadius: 22, backgroundColor: '#12151D', borderWidth: 1, borderColor: '#303544', padding: 18, gap: 14 }, modalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' }, modalSubtitle: { color: '#8E94A6', fontSize: 10, marginTop: 4, marginBottom: 10 }, counterPickerScroll: { maxHeight: 280, paddingRight: 4 }, counterPickerContent: { paddingRight: 10, paddingBottom: 8 }, groupTitle: { color: '#777D8D', fontSize: 8, fontWeight: '900', marginTop: 8, marginBottom: 6 }, roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, roleButton: { width: '31.5%', minHeight: 64, borderRadius: 12, backgroundColor: '#1A1D26', borderWidth: 1, borderColor: '#2A2F3C', padding: 8, justifyContent: 'center' }, selectedRole: { borderColor: '#8F7CFF', backgroundColor: '#2C2750' }, roleKey: { color: '#777D8D', fontSize: 7, fontWeight: '900' }, roleName: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', marginTop: 2 }, roleType: { color: '#686E7C', fontSize: 6, fontWeight: '800', marginTop: 3 }, expiryLabel: { color: '#777D8D', fontSize: 8, fontWeight: '900', marginTop: 12, marginBottom: 7 }, expiryRow: { flexDirection: 'row', gap: 8 }, expiryButton: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: '#1A1D26', borderWidth: 1, borderColor: '#2A2F3C', alignItems: 'center', justifyContent: 'center' }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }, cancelButton: { paddingVertical: 12, paddingHorizontal: 18 }, cancelText: { color: '#8E94A6', fontSize: 11, fontWeight: '900' }, addButton: { borderRadius: 12, backgroundColor: '#7560FF', paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' }, addText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' }, manaPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, manaPickerButton: { width: '31%', minHeight: 70, borderRadius: 12, backgroundColor: '#1A1D26', borderWidth: 1, borderColor: '#2A2F3C', alignItems: 'center', justifyContent: 'center', gap: 4 }, selectedManaColor: { borderColor: '#8F7CFF', backgroundColor: '#2C2750' },
});
