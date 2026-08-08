import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COUNTER_KIND } from '../games/counters';
import { getRulesPack, type CounterRole } from '../games';
import { POKEMON_ENERGY_COLORS, POKEMON_ENERGY_LABELS, emptyPokemonEnergy, type PokemonEnergyType } from '../games/pokemonEnergy';
import { getPlayerTheme } from '../themes';
import { clearSavedGame, loadSavedGame, saveGame, type SavedCounter, type SavedPlayer } from '../storage/gameSave';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/haptics';

type PokemonPlayer = SavedPlayer & {
  pokemonEnergyTypes?: PokemonEnergyType[];
  pokemonEnergy?: Record<PokemonEnergyType, number>;
};

type State = { players: PokemonPlayer[]; activePlayer: number; activePhase: number };

export default function PokemonGameScreen() {
  const params = useLocalSearchParams<{ game?: string; mode?: string; players?: string; start?: string; metric?: string; step?: string; theme?: string; resume?: string }>();
  const rules = getRulesPack('pokemon');
  const count = Math.max(1, Number(params.players) || 2);
  const start = Number(params.start) || 6;
  const themeId = params.theme || 'mana:C';
  const initial = useMemo<State>(() => ({
    players: Array.from({ length: count }, (_, index) => ({ id: index + 1, name: `PLAYER ${index + 1}`, value: start, counters: [], mana: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }, manaColors: [], themeId, preferredCounters: [], pokemonEnergyTypes: [], pokemonEnergy: emptyPokemonEnergy() })),
    activePlayer: 0,
    activePhase: 0,
  }), [count, start, themeId]);

  const [game, setGame] = useState<State>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [energyOpen, setEnergyOpen] = useState<number | null>(null);
  const [counterPlayerId, setCounterPlayerId] = useState<number | null>(null);
  const [counterRole, setCounterRole] = useState<CounterRole>('damage');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let live = true;
    if (params.resume !== '1') { setHydrated(true); return () => { live = false; }; }
    loadSavedGame().then((saved) => {
      if (!live) return;
      if (saved) setGame({
        players: saved.state.players.map((player) => ({ ...player, pokemonEnergyTypes: (player as PokemonPlayer).pokemonEnergyTypes ?? [], pokemonEnergy: (player as PokemonPlayer).pokemonEnergy ?? emptyPokemonEnergy() })),
        activePlayer: saved.state.activePlayer,
        activePhase: Math.min(saved.state.activePhase, rules.phases.length - 1),
      });
      setHydrated(true);
    });
    return () => { live = false; };
  }, [params.resume, rules.phases.length]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => void saveGame({
      version: 1,
      updatedAt: Date.now(),
      config: { game: 'POKÉMON TCG', mode: params.mode || 'Standard Match', players: game.players.length, start, metric: 'PRIZE CARDS', step: 1, theme: themeId },
      state: game,
    }), 120);
    return () => clearTimeout(timer);
  }, [game, hydrated, params.mode, start, themeId]);

  const updatePlayer = (id: number, updater: (player: PokemonPlayer) => PokemonPlayer) => setGame((state) => ({ ...state, players: state.players.map((player) => player.id === id ? updater(player) : player) }));
  const changePrize = (id: number, amount: number) => { void hapticLight(); updatePlayer(id, (player) => ({ ...player, value: Math.max(0, Math.min(6, player.value + amount)) })); };
  const changeEnergy = (id: number, type: PokemonEnergyType, amount: number) => { void hapticLight(); updatePlayer(id, (player) => ({ ...player, pokemonEnergy: { ...(player.pokemonEnergy ?? emptyPokemonEnergy()), [type]: Math.max(0, (player.pokemonEnergy?.[type] ?? 0) + amount) } })); };
  const changeCounter = (id: number, counterId: string, amount: number) => { void hapticLight(); updatePlayer(id, (player) => ({ ...player, counters: player.counters.map((counter) => counter.id === counterId ? { ...counter, value: Math.max(0, counter.value + amount) } : counter) })); };
  const removeCounter = (id: number, counterId: string) => updatePlayer(id, (player) => ({ ...player, counters: player.counters.filter((counter) => counter.id !== counterId) }));
  const addCounter = () => {
    if (counterPlayerId === null) return;
    void hapticSuccess();
    const counter: SavedCounter = { id: `${Date.now()}-${counterRole}`, role: counterRole, value: 1, temporary: false };
    updatePlayer(counterPlayerId, (player) => ({ ...player, counters: [...player.counters, counter] }));
    setCounterPlayerId(null);
  };
  const advance = () => {
    void hapticMedium();
    setGame((state) => state.activePhase < rules.phases.length - 1
      ? { ...state, activePhase: state.activePhase + 1 }
      : { ...state, activePlayer: (state.activePlayer + 1) % state.players.length, activePhase: 0 });
  };
  const endGame = async () => { await clearSavedGame(); setSettingsOpen(false); router.replace('/'); };

  const active = game.players[game.activePlayer];
  const activeTheme = getPlayerTheme(active?.themeId ?? themeId);
  const counterPlayer = game.players.find((player) => player.id === counterPlayerId);
  const counterTheme = getPlayerTheme(counterPlayer?.themeId ?? themeId);

  return <SafeAreaView style={[styles.safe, { backgroundColor: activeTheme.colors.background }]}>
    <View style={styles.topBar}>
      <Pressable onPress={() => router.replace('/')} style={styles.topButton}><Text style={styles.topText}>‹ HOME</Text></Pressable>
      <View style={styles.turn}><Text style={[styles.mode, { color: activeTheme.colors.accent }]}>POKÉMON TCG · {params.mode || 'Standard Match'}</Text><Text style={styles.turnLabel}>CURRENT TURN</Text><Text style={styles.turnName}>{active?.name ?? 'PLAYER 1'}</Text></View>
      <Pressable onPress={() => setSettingsOpen(true)} style={styles.gear}><Text style={styles.gearText}>⚙</Text></Pressable>
    </View>

    <ScrollView contentContainerStyle={styles.grid}>
      {game.players.map((player, index) => {
        const theme = getPlayerTheme(player.themeId ?? themeId);
        const energyTypes = player.pokemonEnergyTypes ?? [];
        const totalEnergy = energyTypes.reduce((sum, type) => sum + (player.pokemonEnergy?.[type] ?? 0), 0);
        return <View key={player.id} style={[styles.panel, { borderColor: index === game.activePlayer ? theme.colors.accent : theme.colors.border, backgroundColor: theme.colors.surface }]}>
          {index === game.activePlayer && <Text style={[styles.active, { color: theme.colors.accent }]}>ACTIVE</Text>}
          <View style={styles.energyRail}>
            <Pressable onPress={() => setEnergyOpen((open) => open === player.id ? null : player.id)} style={[styles.energyButton, { borderColor: theme.colors.accent }]}><Text style={[styles.energyTitle, { color: theme.colors.accent }]}>ENERGY</Text><Text style={styles.energyTotal}>{totalEnergy}</Text></Pressable>
            {energyOpen === player.id && <View style={styles.energyDrawer}>
              {energyTypes.length === 0 ? <Text style={styles.emptyEnergy}>No Energy types selected</Text> : energyTypes.map((type) => <View key={type} style={styles.energyRow}>
                <View style={[styles.energyDot, { backgroundColor: POKEMON_ENERGY_COLORS[type] }]} />
                <Text style={styles.energyLabel}>{POKEMON_ENERGY_LABELS[type]}</Text>
                <Pressable onPress={() => changeEnergy(player.id, type, -1)}><Text style={[styles.energyControl, { color: theme.colors.accent }]}>−</Text></Pressable>
                <Text style={styles.energyValue}>{player.pokemonEnergy?.[type] ?? 0}</Text>
                <Pressable onPress={() => changeEnergy(player.id, type, 1)}><Text style={[styles.energyControl, { color: theme.colors.accent }]}>+</Text></Pressable>
              </View>)}
            </View>}
          </View>

          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.metric}>PRIZE CARDS</Text>
          <Text style={styles.prizes}>{player.value}</Text>
          <View style={styles.prizeControls}>
            <Pressable onPress={() => changePrize(player.id, -1)} style={styles.prizeButton}><Text style={styles.prizeButtonText}>−1</Text></Pressable>
            <Pressable onPress={() => changePrize(player.id, 1)} style={styles.prizeButton}><Text style={styles.prizeButtonText}>+1</Text></Pressable>
          </View>

          <View style={styles.counterArea}>{player.counters.map((counter) => <View key={counter.id} style={styles.counter}><Text style={styles.counterLabel}>{theme.labels[counter.role]}</Text><View style={styles.counterControls}><Pressable onPress={() => changeCounter(player.id, counter.id, -1)}><Text style={[styles.energyControl, { color: theme.colors.accent }]}>−</Text></Pressable><Text style={styles.energyValue}>{counter.value}</Text><Pressable onPress={() => changeCounter(player.id, counter.id, 1)}><Text style={[styles.energyControl, { color: theme.colors.accent }]}>+</Text></Pressable><Pressable onPress={() => removeCounter(player.id, counter.id)}><Text style={styles.remove}>×</Text></Pressable></View></View>)}<Pressable onPress={() => setCounterPlayerId(player.id)} style={styles.addCounter}><Text style={[styles.addCounterText, { color: theme.colors.accent }]}>＋ COUNTER</Text></Pressable></View>
        </View>;
      })}
    </ScrollView>

    <View style={styles.turnControls}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.phaseRow}>{rules.phases.map((phase, index) => <Pressable key={`${phase}-${index}`} onPress={() => setGame((state) => ({ ...state, activePhase: index }))} style={[styles.phase, index === game.activePhase && { borderColor: activeTheme.colors.accent, borderWidth: 2 }]}><Text style={styles.phaseText}>{phase}</Text></Pressable>)}</ScrollView>
      <Pressable onPress={advance} style={[styles.next, { backgroundColor: activeTheme.colors.primary }]}><Text style={styles.nextText}>{game.activePhase === rules.phases.length - 1 ? 'END TURN' : 'NEXT PHASE'}</Text></Pressable>
    </View>

    <Modal transparent visible={counterPlayerId !== null} animationType="fade" onRequestClose={() => setCounterPlayerId(null)}><View style={styles.backdrop}><View style={styles.modal}><Text style={styles.modalTitle}>Add Pokémon counter</Text><View style={styles.counterChoices}>{rules.counterGroups.flatMap((group) => group.roles).map((role) => <Pressable key={role} onPress={() => setCounterRole(role)} style={[styles.choice, counterRole === role && { borderColor: counterTheme.colors.accent, borderWidth: 2 }]}><Text style={styles.choiceTitle}>{counterTheme.labels[role]}</Text><Text style={styles.choiceMeta}>{COUNTER_KIND[role] === 'stats' ? 'Two values' : COUNTER_KIND[role] === 'toggle' ? 'On / off' : 'Number'}</Text></Pressable>)}</View><View style={styles.modalActions}><Pressable onPress={() => setCounterPlayerId(null)}><Text style={styles.cancel}>CANCEL</Text></Pressable><Pressable onPress={addCounter} style={[styles.addButton, { backgroundColor: counterTheme.colors.primary }]}><Text style={styles.addButtonText}>ADD</Text></Pressable></View></View></View></Modal>

    <Modal transparent visible={settingsOpen} animationType="fade" onRequestClose={() => setSettingsOpen(false)}><View style={styles.backdrop}><View style={styles.modal}><Text style={styles.modalTitle}>Game Settings</Text><Pressable onPress={endGame} style={styles.end}><Text style={styles.endText}>END GAME</Text></Pressable><Pressable onPress={() => setSettingsOpen(false)}><Text style={styles.cancel}>CLOSE</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 12, paddingBottom: 8 },
  topBar: { height: 68, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topButton: { paddingVertical: 9, paddingHorizontal: 10, borderRadius: 11, backgroundColor: '#151820' },
  topText: { color: '#E4E7EC', fontSize: 8, fontWeight: '900' },
  turn: { flex: 1, alignItems: 'center' }, mode: { fontSize: 7, fontWeight: '900' }, turnLabel: { color: '#C3C7D0', fontSize: 7, fontWeight: '900' }, turnName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  gear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, gearText: { color: '#FFFFFF', fontSize: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 18 },
  panel: { width: '48.5%', minHeight: 245, borderRadius: 18, borderWidth: 2, alignItems: 'center', padding: 9, paddingTop: 16 },
  active: { position: 'absolute', top: 7, right: 9, fontSize: 7, fontWeight: '900' },
  energyRail: { position: 'absolute', left: 6, top: 8, zIndex: 5, alignItems: 'flex-start' },
  energyButton: { width: 52, minHeight: 42, borderRadius: 10, backgroundColor: '#171A22', borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, energyTitle: { fontSize: 6, fontWeight: '900' }, energyTotal: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  energyDrawer: { marginTop: 5, width: 175, borderRadius: 12, backgroundColor: '#171A22', borderWidth: 1, borderColor: '#303544', padding: 7, gap: 5 },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, energyDot: { width: 10, height: 10, borderRadius: 5 }, energyLabel: { flex: 1, color: '#FFFFFF', fontSize: 8, fontWeight: '800' }, energyControl: { fontSize: 17, fontWeight: '900', paddingHorizontal: 4 }, energyValue: { color: '#FFFFFF', minWidth: 18, textAlign: 'center', fontWeight: '900' }, emptyEnergy: { color: '#9AA0AD', fontSize: 8, paddingVertical: 5 },
  playerName: { color: '#D5D8E0', fontSize: 10, fontWeight: '900' }, metric: { color: '#A6ACB7', fontSize: 7, fontWeight: '900' }, prizes: { color: '#FFFFFF', fontSize: 48, lineHeight: 52, fontWeight: '900' },
  prizeControls: { flexDirection: 'row', gap: 8 }, prizeButton: { minWidth: 58, paddingVertical: 9, borderRadius: 10, backgroundColor: '#222630', alignItems: 'center' }, prizeButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  counterArea: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', paddingTop: 10 }, counter: { minWidth: 105, borderRadius: 10, backgroundColor: '#1B1E27', padding: 7 }, counterLabel: { color: '#B5BBC7', fontSize: 7, fontWeight: '900', textAlign: 'center' }, counterControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, remove: { color: '#FF747F', fontSize: 16, marginLeft: 5 }, addCounter: { minWidth: 100, height: 45, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#3B4150', alignItems: 'center', justifyContent: 'center' }, addCounterText: { fontSize: 8, fontWeight: '900' },
  turnControls: { height: 62, flexDirection: 'row', gap: 8, paddingTop: 4 }, phaseRow: { alignItems: 'center', gap: 6 }, phase: { minWidth: 64, height: 42, borderRadius: 11, backgroundColor: '#151820', borderWidth: 1, borderColor: '#353B47', alignItems: 'center', justifyContent: 'center' }, phaseText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' }, next: { width: 170, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, nextText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 18 }, modal: { width: '100%', maxWidth: 560, borderRadius: 22, backgroundColor: '#12151D', borderWidth: 1, borderColor: '#303544', padding: 18, gap: 12 }, modalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' }, counterChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { width: '31%', minHeight: 56, borderRadius: 12, borderWidth: 1, borderColor: '#2A2F3C', backgroundColor: '#1A1D26', padding: 8 }, choiceTitle: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' }, choiceMeta: { color: '#8A909D', fontSize: 7, marginTop: 3 }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }, cancel: { color: '#9AA0AD', fontSize: 10, fontWeight: '900', paddingVertical: 10 }, addButton: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 }, addButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' }, end: { borderRadius: 13, backgroundColor: '#4A1E26', borderWidth: 1, borderColor: '#8B3948', paddingVertical: 14, alignItems: 'center' }, endText: { color: '#FFB5BE', fontSize: 12, fontWeight: '900' },
});