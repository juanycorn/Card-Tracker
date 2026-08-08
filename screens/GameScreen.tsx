import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { COUNTER_KIND } from '../games/counters';
import { getRulesPack, type CounterRole, type ManaColor } from '../games';
import { getPlayerTheme, type PlayerTheme } from '../themes';
import { clearSavedGame, loadSavedGame, saveGame, type SavedPlayer } from '../storage/gameSave';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/haptics';

type ManaPool = Record<ManaColor, number>;
type TrackedCounter = { id: string; role: CounterRole; value: number; secondaryValue?: number; active?: boolean; temporary: boolean };
type Player = SavedPlayer;
type GameState = { players: Player[]; activePlayer: number; activePhase: number };

const EMPTY_MANA: ManaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
const MANA_COLORS: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];
const HISTORY_LIMIT = 40;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const cloneState = (state: GameState): GameState => JSON.parse(JSON.stringify(state)) as GameState;
const animateLayout = () => LayoutAnimation.configureNext({
  duration: 230,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
});

export default function GameScreen() {
  const params = useLocalSearchParams<{ game?: string; mode?: string; players?: string; start?: string; metric?: string; step?: string; theme?: string; resume?: string }>();
  const rules = getRulesPack(params.game);
  const playerCount = Math.min(6, Math.max(1, Number(params.players) || rules.presets[0].players));
  const startingValue = Number(params.start) || rules.presets[0].startingValue;
  const metric = params.metric || rules.presets[0].metric;
  const largeStep = Number(params.step) || rules.presets[0].step;
  const modeName = params.mode || rules.presets[0].mode;
  const themeId = params.theme || 'mana:C';

  const initialState = useMemo<GameState>(() => ({
    players: Array.from({ length: playerCount }, (_, index) => ({
      id: index + 1,
      name: `PLAYER ${index + 1}`,
      value: startingValue,
      counters: [],
      mana: { ...EMPTY_MANA },
      manaColors: [],
      themeId,
      preferredCounters: [],
    })),
    activePlayer: 0,
    activePhase: 0,
  }), [playerCount, startingValue, themeId]);

  const [game, setGame] = useState<GameState>(initialState);
  const [history, setHistory] = useState<GameState[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [counterPlayerId, setCounterPlayerId] = useState<number | null>(null);
  const [counterRole, setCounterRole] = useState<CounterRole>(rules.defaultCounter);
  const [temporary, setTemporary] = useState(false);
  const [manaPlayerId, setManaPlayerId] = useState<number | null>(null);
  const [manaColorPickerId, setManaColorPickerId] = useState<number | null>(null);
  const [namePlayerId, setNamePlayerId] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (params.resume !== '1') {
      setHydrated(true);
      return () => { active = false; };
    }
    loadSavedGame().then((saved) => {
      if (!active) return;
      if (saved) {
        setGame({
          players: saved.state.players.map((player) => ({ ...player, themeId: player.themeId ?? saved.config.theme ?? themeId, preferredCounters: player.preferredCounters ?? [] })),
          activePlayer: Math.min(saved.state.activePlayer, Math.max(0, saved.state.players.length - 1)),
          activePhase: Math.min(saved.state.activePhase, Math.max(0, rules.phases.length - 1)),
        });
      }
      setHydrated(true);
    });
    return () => { active = false; };
  }, [params.resume, rules.phases.length, themeId]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      void saveGame({
        version: 1,
        updatedAt: Date.now(),
        config: { game: rules.name, mode: modeName, players: game.players.length, start: startingValue, metric, step: largeStep, theme: themeId },
        state: game,
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [game, hydrated, largeStep, metric, modeName, rules.name, startingValue, themeId]);

  const commit = (updater: (current: GameState) => GameState) => {
    animateLayout();
    setGame((current) => {
      setHistory((items) => [...items.slice(-(HISTORY_LIMIT - 1)), cloneState(current)]);
      return updater(current);
    });
  };

  const undo = () => {
    void hapticSuccess();
    animateLayout();
    setHistory((items) => {
      const previous = items[items.length - 1];
      if (!previous) return items;
      setGame(cloneState(previous));
      return items.slice(0, -1);
    });
  };

  const updatePlayer = (state: GameState, playerId: number, updater: (player: Player) => Player): GameState => ({
    ...state,
    players: state.players.map((player) => player.id === playerId ? updater(player) : player),
  });

  const changeValue = (playerId: number, amount: number) => {
    void hapticLight();
    commit((state) => updatePlayer(state, playerId, (player) => ({ ...player, value: player.value + amount })));
  };
  const removeCounter = (playerId: number, counterId: string) => {
    void hapticMedium();
    commit((state) => updatePlayer(state, playerId, (player) => ({ ...player, counters: player.counters.filter((counter) => counter.id !== counterId) })));
  };
  const changeCounter = (playerId: number, counterId: string, field: 'value' | 'secondaryValue', amount: number) => {
    void hapticLight();
    commit((state) => updatePlayer(state, playerId, (player) => ({
      ...player,
      counters: player.counters.map((counter) => {
        if (counter.id !== counterId) return counter;
        const next = (counter[field] ?? 0) + amount;
        return { ...counter, [field]: field === 'value' && COUNTER_KIND[counter.role] === 'single' ? Math.max(0, next) : next };
      }),
    })));
  };
  const toggleCounter = (playerId: number, counterId: string) => {
    void hapticMedium();
    commit((state) => updatePlayer(state, playerId, (player) => ({ ...player, counters: player.counters.map((counter) => counter.id === counterId ? { ...counter, active: !counter.active } : counter) })));
  };
  const changeMana = (playerId: number, color: ManaColor, amount: number) => {
    void hapticLight();
    commit((state) => updatePlayer(state, playerId, (player) => ({ ...player, mana: { ...player.mana, [color]: Math.max(0, player.mana[color] + amount) } })));
  };
  const toggleManaColor = (playerId: number, color: ManaColor) => {
    void hapticLight();
    commit((state) => updatePlayer(state, playerId, (player) => ({ ...player, manaColors: player.manaColors.includes(color) ? player.manaColors.filter((item) => item !== color) : [...player.manaColors, color] })));
  };

  const addCounter = () => {
    if (counterPlayerId === null) return;
    void hapticSuccess();
    const kind = COUNTER_KIND[counterRole];
    const counter: TrackedCounter = {
      id: `${Date.now()}-${counterRole}`,
      role: counterRole,
      value: kind === 'stats' ? 1 : kind === 'toggle' ? 0 : 1,
      secondaryValue: kind === 'stats' ? 1 : undefined,
      active: kind === 'toggle' ? false : undefined,
      temporary,
    };
    commit((state) => updatePlayer(state, counterPlayerId, (player) => ({ ...player, counters: [...player.counters, counter] })));
    setCounterPlayerId(null);
    setCounterRole(rules.defaultCounter);
    setTemporary(false);
  };

  const saveName = () => {
    if (namePlayerId === null) return;
    void hapticSuccess();
    const cleanName = nameDraft.trim().slice(0, 18) || `PLAYER ${namePlayerId}`;
    commit((state) => updatePlayer(state, namePlayerId, (player) => ({ ...player, name: cleanName })));
    setNamePlayerId(null);
  };

  const resetGame = () => {
    void hapticMedium();
    commit(() => cloneState(initialState));
  };

  const endGame = async () => {
    void hapticMedium();
    await clearSavedGame();
    setSettingsOpen(false);
    router.replace('/');
  };

  const selectPhase = (index: number) => {
    if (index === game.activePhase) return;
    void hapticLight();
    commit((state) => {
      let players = state.players;
      if (rules.supportsMana) {
        const activeId = state.players[state.activePlayer]?.id;
        players = state.players.map((player) => player.id === activeId ? { ...player, mana: { ...EMPTY_MANA } } : player);
      }
      return { ...state, players, activePhase: index };
    });
  };

  const advance = () => {
    void hapticMedium();
    commit((state) => {
      let players = state.players;
      if (rules.supportsMana) {
        const activeId = state.players[state.activePlayer]?.id;
        players = players.map((player) => player.id === activeId ? { ...player, mana: { ...EMPTY_MANA } } : player);
      }
      const lastPhase = state.activePhase === rules.phases.length - 1;
      if (!lastPhase) return { ...state, players, activePhase: state.activePhase + 1 };
      return {
        players: players.map((player) => ({ ...player, counters: player.counters.filter((counter) => !counter.temporary) })),
        activePlayer: (state.activePlayer + 1) % state.players.length,
        activePhase: 0,
      };
    });
  };

  const activeName = game.players[game.activePlayer]?.name ?? 'PLAYER 1';
  const activeTheme = getPlayerTheme(game.players[game.activePlayer]?.themeId ?? themeId);
  const nextButtonTextColor = activeTheme.id.split(':')[1]?.split('-')[0] === 'W' ? '#111318' : '#FFFFFF';
  const isLastPhase = game.activePhase === rules.phases.length - 1;
  const counterPlayer = game.players.find((player) => player.id === counterPlayerId);
  const counterTheme = getPlayerTheme(counterPlayer?.themeId ?? themeId);
  const preferredCounters = counterPlayer?.preferredCounters ?? [];
  const manaPickerPlayer = game.players.find((player) => player.id === manaColorPickerId);
  const manaPickerTheme = getPlayerTheme(manaPickerPlayer?.themeId ?? themeId);
  const orderedCounterGroups = rules.counterGroups.map((group) => ({
    ...group,
    roles: [...group.roles].sort((a, b) => Number(preferredCounters.includes(b)) - Number(preferredCounters.includes(a))),
  }));

  return (
    <LinearGradient colors={activeTheme.gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientRoot}>
      <View pointerEvents="none" style={styles.gameWash} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.replace('/')} style={styles.topButton}><Text style={styles.topButtonText}>‹ HOME</Text></Pressable>
          <Pressable disabled={history.length === 0} onPress={undo} style={[styles.topButton, history.length === 0 && styles.disabledButton]}><Text style={styles.topButtonText}>↶ UNDO</Text></Pressable>
          <View style={styles.turnStatus}><Text style={[styles.gameMode, { color: activeTheme.colors.accent }]}>{rules.name} · {modeName} · {activeTheme.name}</Text><Text style={styles.turnLabel}>CURRENT TURN</Text><Text style={styles.turnName}>{activeName}</Text></View>
          <Pressable onPress={resetGame} style={styles.topButton}><Text style={styles.topButtonText}>RESET</Text></Pressable>
          <Pressable hitSlop={14} onPress={() => { void hapticLight(); setSettingsOpen(true); }} style={styles.settingsButton}><Text style={styles.settingsText}>⚙</Text></Pressable>
        </View>

        <ScrollView style={styles.boardScroll} contentContainerStyle={styles.grid} persistentScrollbar>
          {game.players.map((player, index) => {
            const playerTheme = getPlayerTheme(player.themeId ?? themeId);
            return <PlayerPanel
              key={player.id}
              player={player}
              theme={playerTheme}
              metric={metric}
              largeStep={largeStep}
              active={index === game.activePlayer}
              supportsMana={rules.supportsMana}
              manaOpen={manaPlayerId === player.id}
              onRename={() => { setNamePlayerId(player.id); setNameDraft(player.name); }}
              onToggleMana={() => { void hapticLight(); animateLayout(); setManaPlayerId((current) => current === player.id ? null : player.id); }}
              onManaColors={() => setManaColorPickerId(player.id)}
              onChangeMana={changeMana}
              onChangeValue={changeValue}
              onChangeCounter={changeCounter}
              onToggleCounter={toggleCounter}
              onRemoveCounter={removeCounter}
              onAddCounter={() => setCounterPlayerId(player.id)}
            />;
          })}
        </ScrollView>

        <View style={styles.turnControls}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.phaseTrack}>
            {rules.phases.map((phase, index) => <Pressable key={phase} onPress={() => selectPhase(index)} style={[styles.phaseChip, index === game.activePhase && [styles.activePhaseChip, { borderColor: activeTheme.colors.accent, backgroundColor: activeTheme.colors.surface }]]}><Text style={[styles.phaseText, index === game.activePhase && styles.activePhaseText]}>{phase}</Text></Pressable>)}
          </ScrollView>
          <Pressable onPress={advance} style={[styles.nextButton, { backgroundColor: activeTheme.colors.primary }]}><Text style={[styles.nextButtonText, { color: nextButtonTextColor }]}>{isLastPhase ? 'END TURN' : 'NEXT PHASE'}</Text><Text style={[styles.nextButtonHint, { color: nextButtonTextColor }]}>{isLastPhase ? `PASS TO ${game.players[(game.activePlayer + 1) % game.players.length].name}` : rules.phases[game.activePhase + 1]}</Text></Pressable>
        </View>

        <Modal transparent visible={settingsOpen} animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
          <View style={styles.modalBackdrop}><View style={styles.settingsCard}><Text style={styles.modalTitle}>Game Settings</Text><Text style={styles.modalSubtitle}>More game options will live here later.</Text><Pressable onPress={endGame} style={styles.endGameButton}><Text style={styles.endGameText}>END GAME</Text></Pressable><Pressable onPress={() => setSettingsOpen(false)} style={styles.closeSettings}><Text style={styles.cancelText}>CLOSE</Text></Pressable></View></View>
        </Modal>

        <Modal transparent visible={namePlayerId !== null} animationType="fade" onRequestClose={() => setNamePlayerId(null)}>
          <View style={styles.modalBackdrop}><View style={styles.nameCard}><Text style={styles.modalTitle}>Rename player</Text><TextInput autoFocus value={nameDraft} onChangeText={setNameDraft} onSubmitEditing={saveName} maxLength={18} selectTextOnFocus style={styles.nameInput} placeholder="Player name" placeholderTextColor="#666D7D" /><View style={styles.modalActions}><Pressable onPress={() => setNamePlayerId(null)} style={styles.cancelButton}><Text style={styles.cancelText}>CANCEL</Text></Pressable><Pressable onPress={saveName} style={[styles.addButton, { backgroundColor: activeTheme.colors.primary }]}><Text style={styles.addText}>SAVE NAME</Text></Pressable></View></View></View>
        </Modal>

        <Modal transparent visible={counterPlayerId !== null} animationType="fade" onRequestClose={() => setCounterPlayerId(null)}>
          <View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>Add {rules.name} counter</Text><Text style={styles.modalSubtitle}>{preferredCounters.length ? 'Deck suggestions are shown first. Nothing is added until you choose it.' : 'This catalog comes from the active rules pack.'}</Text><ScrollView style={styles.pickerScroll} persistentScrollbar>{orderedCounterGroups.map((group) => <View key={group.title}><Text style={styles.groupTitle}>{group.title}</Text><View style={styles.roleGrid}>{group.roles.map((role) => <Pressable key={role} onPress={() => setCounterRole(role)} style={[styles.roleButton, counterRole === role && [styles.selectedRole, { borderColor: counterTheme.colors.accent, backgroundColor: counterTheme.colors.surface }], preferredCounters.includes(role) && styles.suggestedRole]}><Text style={styles.roleName}>{counterTheme.labels[role]}</Text><Text style={styles.roleType}>{preferredCounters.includes(role) ? 'DECK SUGGESTION · ' : ''}{COUNTER_KIND[role] === 'stats' ? 'TWO VALUES' : COUNTER_KIND[role] === 'toggle' ? 'ON / OFF' : 'NUMBER'}</Text></Pressable>)}</View></View>)}</ScrollView><Text style={styles.expiryLabel}>UNTIL END OF TURN?</Text><View style={styles.expiryRow}><Pressable onPress={() => setTemporary(false)} style={[styles.expiryButton, !temporary && [styles.selectedRole, { borderColor: counterTheme.colors.accent, backgroundColor: counterTheme.colors.surface }]]}><Text style={styles.roleName}>PERSISTENT</Text></Pressable><Pressable onPress={() => setTemporary(true)} style={[styles.expiryButton, temporary && [styles.selectedRole, { borderColor: counterTheme.colors.accent, backgroundColor: counterTheme.colors.surface }]]}><Text style={styles.roleName}>TEMPORARY</Text></Pressable></View><View style={styles.modalActions}><Pressable onPress={() => setCounterPlayerId(null)} style={styles.cancelButton}><Text style={styles.cancelText}>CANCEL</Text></Pressable><Pressable onPress={addCounter} style={[styles.addButton, { backgroundColor: counterTheme.colors.primary }]}><Text style={styles.addText}>ADD</Text></Pressable></View></View></View>
        </Modal>

        <Modal transparent visible={manaColorPickerId !== null} animationType="fade" onRequestClose={() => setManaColorPickerId(null)}>
          <View style={styles.modalBackdrop}><View style={styles.manaPickerCard}><Text style={styles.modalTitle}>Choose mana colors</Text><View style={styles.manaPickerGrid}>{MANA_COLORS.map((color) => { const selected = manaPickerPlayer?.manaColors.includes(color) ?? false; return <Pressable key={color} onPress={() => manaColorPickerId && toggleManaColor(manaColorPickerId, color)} style={[styles.manaPickerButton, selected && [styles.selectedRole, { borderColor: manaPickerTheme.colors.accent, backgroundColor: manaPickerTheme.colors.surface }]]}><Text style={styles.manaSymbol}>{color}</Text><Text style={styles.roleType}>{selected ? 'SHOWN' : 'HIDDEN'}</Text></Pressable>; })}</View><Pressable onPress={() => setManaColorPickerId(null)} style={[styles.addButton, { backgroundColor: manaPickerTheme.colors.primary }]}><Text style={styles.addText}>DONE</Text></Pressable></View></View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

function PlayerPanel({ player, theme, metric, largeStep, active, supportsMana, manaOpen, onRename, onToggleMana, onManaColors, onChangeMana, onChangeValue, onChangeCounter, onToggleCounter, onRemoveCounter, onAddCounter }: {
  player: Player; theme: PlayerTheme; metric: string; largeStep: number; active: boolean; supportsMana: boolean; manaOpen: boolean;
  onRename: () => void; onToggleMana: () => void; onManaColors: () => void; onChangeMana: (id: number, color: ManaColor, amount: number) => void; onChangeValue: (id: number, amount: number) => void;
  onChangeCounter: (playerId: number, counterId: string, field: 'value' | 'secondaryValue', amount: number) => void; onToggleCounter: (playerId: number, counterId: string) => void; onRemoveCounter: (playerId: number, counterId: string) => void; onAddCounter: () => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [lifeColor, setLifeColor] = useState(theme.colors.text);
  const lifeScale = useRef(new Animated.Value(1)).current;
  const panelScale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(active ? 1 : 0)).current;
  const drawer = useRef(new Animated.Value(manaOpen ? 1 : 0)).current;
  const previousValue = useRef(player.value);
  const lifeColorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLifeColor(theme.colors.text); }, [theme.colors.text]);

  useEffect(() => {
    if (previousValue.current !== player.value) {
      const previous = previousValue.current;
      previousValue.current = player.value;
      setLifeColor(player.value > previous ? theme.colors.lifeGain : theme.colors.lifeLoss);
      if (lifeColorTimer.current) clearTimeout(lifeColorTimer.current);
      lifeColorTimer.current = setTimeout(() => setLifeColor(theme.colors.text), 420);
      lifeScale.setValue(0.72);
      Animated.spring(lifeScale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start();
    }
    return () => { if (lifeColorTimer.current) clearTimeout(lifeColorTimer.current); };
  }, [lifeScale, player.value, theme.colors.lifeGain, theme.colors.lifeLoss, theme.colors.text]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(panelScale, { toValue: active ? 1.025 : 1, friction: 6, tension: 100, useNativeDriver: true }),
      Animated.timing(glow, { toValue: active ? 1 : 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
  }, [active, glow, panelScale]);

  useEffect(() => { Animated.spring(drawer, { toValue: manaOpen ? 1 : 0, friction: 7, tension: 110, useNativeDriver: true }).start(); }, [drawer, manaOpen]);

  const manaTotal = Object.values(player.mana).reduce((sum, value) => sum + value, 0);
  const borderColor = glow.interpolate({ inputRange: [0, 1], outputRange: [theme.colors.border, theme.colors.accent] });
  const backgroundColor = glow.interpolate({ inputRange: [0, 1], outputRange: [theme.colors.surface, theme.colors.background] });

  return <Animated.View style={[styles.panel, { transform: [{ scale: panelScale }], borderColor, backgroundColor }]}> 
    {active && <Text style={[styles.activeBadge, { color: theme.colors.accent }]}>ACTIVE</Text>}
    {supportsMana && <View style={styles.manaRail}><Pressable onPress={onToggleMana} style={[styles.manaButton, { borderColor: theme.colors.primary }]}><Text style={[styles.manaTitle, { color: theme.colors.accent }]}>MANA</Text><Text style={styles.manaTotal}>{manaTotal}</Text></Pressable>{manaOpen && <Animated.View style={[styles.manaDrawer, { borderColor: theme.colors.border, opacity: drawer, transform: [{ translateX: drawer.interpolate({ inputRange: [0, 1], outputRange: [-22, 0] }) }, { scale: drawer.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}><Pressable onPress={onManaColors}><Text style={[styles.chooseColors, { color: theme.colors.accent }]}>COLORS</Text></Pressable>{player.manaColors.length === 0 ? <Text style={styles.emptyText}>Select colors</Text> : player.manaColors.map((color) => <View key={color} style={styles.manaRow}><Text style={styles.manaSymbol}>{color}</Text><Pressable onPress={() => onChangeMana(player.id, color, -1)}><Text style={[styles.smallControl, { color: theme.colors.accent }]}>−</Text></Pressable><Text style={styles.trackedValue}>{player.mana[color]}</Text><Pressable onPress={() => onChangeMana(player.id, color, 1)}><Text style={[styles.smallControl, { color: theme.colors.accent }]}>+</Text></Pressable></View>)}</Animated.View>}</View>}
    <Pressable onPress={onRename}><Text style={[styles.playerName, { color: theme.colors.mutedText }]}>{player.name} ✎</Text></Pressable>
    <Text style={styles.metric}>{metric}</Text><Animated.Text style={[styles.value, { color: lifeColor, transform: [{ scale: lifeScale }] }]}>{player.value}</Animated.Text>
    <View style={styles.controls}>{[-largeStep, -1, 1, largeStep].map((amount) => <Pressable key={amount} onPress={() => onChangeValue(player.id, amount)} style={({ pressed }) => [styles.counterButton, { borderColor: theme.colors.border }, pressed && styles.pressedButton]}><Text style={styles.counterButtonText}>{amount > 0 ? `+${amount}` : amount}</Text></Pressable>)}</View>
    <View style={styles.playerCounters}>{player.counters.map((counter) => <AnimatedCounter key={counter.id} counter={counter} playerId={player.id} label={theme.labels[counter.role]} deleteId={deleteId} setDeleteId={setDeleteId} onChangeCounter={onChangeCounter} onToggleCounter={onToggleCounter} onRemoveCounter={onRemoveCounter} accent={theme.colors.accent} />)}<Pressable onPress={onAddCounter} style={[styles.addCounterChip, { borderColor: theme.colors.border }]}><Text style={[styles.addCounterText, { color: theme.colors.primary }]}>＋ COUNTER</Text></Pressable></View>
  </Animated.View>;
}

function AnimatedCounter({ counter, playerId, label, deleteId, setDeleteId, onChangeCounter, onToggleCounter, onRemoveCounter, accent }: {
  counter: TrackedCounter; playerId: number; label: string; deleteId: string | null; setDeleteId: (id: string | null) => void; accent: string;
  onChangeCounter: (playerId: number, counterId: string, field: 'value' | 'secondaryValue', amount: number) => void; onToggleCounter: (playerId: number, counterId: string) => void; onRemoveCounter: (playerId: number, counterId: string) => void;
}) {
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(appear, { toValue: 1, friction: 5, tension: 130, useNativeDriver: true }).start(); }, [appear]);
  const kind = COUNTER_KIND[counter.role];
  return <Animated.View style={{ opacity: appear, transform: [{ scale: appear }, { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}><Pressable onLongPress={() => setDeleteId(counter.id)} style={[styles.trackedCounter, kind === 'stats' && styles.statsCounter]}><Text style={styles.trackedLabel}>{label}{counter.temporary ? ' · EOT' : ''}</Text>{kind === 'single' && <ValueControl value={counter.value} onMinus={() => onChangeCounter(playerId, counter.id, 'value', -1)} onPlus={() => onChangeCounter(playerId, counter.id, 'value', 1)} accent={accent} />}{kind === 'stats' && <><ValueControl label="A" value={counter.value} onMinus={() => onChangeCounter(playerId, counter.id, 'value', -1)} onPlus={() => onChangeCounter(playerId, counter.id, 'value', 1)} accent={accent} /><ValueControl label="B" value={counter.secondaryValue ?? 0} onMinus={() => onChangeCounter(playerId, counter.id, 'secondaryValue', -1)} onPlus={() => onChangeCounter(playerId, counter.id, 'secondaryValue', 1)} accent={accent} /></>}{kind === 'toggle' && <Pressable onPress={() => onToggleCounter(playerId, counter.id)} style={[styles.toggleButton, counter.active && { backgroundColor: accent }]}><Text style={styles.toggleText}>{counter.active ? 'ACTIVE' : 'INACTIVE'}</Text></Pressable>}{deleteId === counter.id && <Pressable onPress={() => onRemoveCounter(playerId, counter.id)} style={styles.deleteCounter}><Text style={styles.deleteText}>×</Text></Pressable>}</Pressable></Animated.View>;
}

function ValueControl({ label, value, onMinus, onPlus, accent }: { label?: string; value: number; onMinus: () => void; onPlus: () => void; accent: string }) {
  return <View style={styles.valueControl}>{label && <Text style={styles.statLabel}>{label}</Text>}<Pressable onPress={onMinus}><Text style={[styles.smallControl, { color: accent }]}>−</Text></Pressable><Text style={styles.trackedValue}>{value > 0 && label ? `+${value}` : value}</Text><Pressable onPress={onPlus}><Text style={[styles.smallControl, { color: accent }]}>+</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  gradientRoot: { flex: 1 },
  gameWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,6,10,0.48)' },
  safeArea: { flex: 1, paddingHorizontal: 12, paddingBottom: 8 },
  topBar: { height: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  topButton: { minWidth: 62, paddingVertical: 9, paddingHorizontal: 7, borderRadius: 11, backgroundColor: 'rgba(21,24,32,0.88)', alignItems: 'center' },
  settingsButton: { width: 44, height: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', zIndex: 20, elevation: 10 },
  settingsText: { color: '#F3F4F7', fontSize: 22, fontWeight: '900' },
  disabledButton: { opacity: 0.35 },
  topButtonText: { color: '#E4E7EC', fontSize: 8, fontWeight: '900' },
  turnStatus: { flex: 1, alignItems: 'center' },
  gameMode: { fontSize: 7, fontWeight: '900' },
  turnLabel: { color: '#C3C7D0', fontSize: 7, fontWeight: '900' },
  turnName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  boardScroll: { flex: 1, minHeight: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8, paddingBottom: 18 },
  panel: { width: '48.5%', minHeight: 230, borderRadius: 18, borderWidth: 2, alignItems: 'center', padding: 8, paddingTop: 16, elevation: 5 },
  activeBadge: { position: 'absolute', top: 7, right: 9, fontSize: 7, fontWeight: '900' },
  playerName: { fontSize: 10, fontWeight: '900' },
  metric: { color: '#A6ACB7', fontSize: 7, fontWeight: '900' },
  value: { fontSize: 43, lineHeight: 46, fontWeight: '900' },
  controls: { flexDirection: 'row', gap: 5 },
  counterButton: { minWidth: 42, paddingVertical: 7, borderRadius: 9, backgroundColor: '#222630', borderWidth: 1, alignItems: 'center' },
  pressedButton: { transform: [{ scale: 0.9 }], opacity: 0.75 },
  counterButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  manaRail: { position: 'absolute', left: 6, top: 8, zIndex: 4, alignItems: 'flex-start' },
  manaButton: { width: 46, minHeight: 42, borderRadius: 10, backgroundColor: '#171A22', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  manaTitle: { fontSize: 6, fontWeight: '900' },
  manaTotal: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  manaDrawer: { marginTop: 5, width: 122, borderRadius: 12, backgroundColor: '#171A22', borderWidth: 1, padding: 7, gap: 5 },
  chooseColors: { fontSize: 7, fontWeight: '900', textAlign: 'center', paddingVertical: 5 },
  emptyText: { color: '#9AA0AD', fontSize: 8, textAlign: 'center', paddingVertical: 6 },
  manaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  manaSymbol: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  playerCounters: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 9, justifyContent: 'center' },
  trackedCounter: { minWidth: 96, minHeight: 48, borderRadius: 10, backgroundColor: '#1B1E27', paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center' },
  statsCounter: { minWidth: 145 },
  trackedLabel: { color: '#B5BBC7', fontSize: 7, fontWeight: '900', textAlign: 'center', marginBottom: 2 },
  valueControl: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  smallControl: { fontSize: 17, fontWeight: '900', paddingHorizontal: 5 },
  trackedValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  statLabel: { color: '#9AA0AD', fontSize: 7, fontWeight: '900' },
  toggleButton: { borderRadius: 8, backgroundColor: '#242833', paddingVertical: 7, paddingHorizontal: 10, alignItems: 'center' },
  toggleText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  deleteCounter: { position: 'absolute', right: -5, top: -7, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF5F6D', alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  addCounterChip: { minWidth: 96, height: 48, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  addCounterText: { fontSize: 8, fontWeight: '900' },
  turnControls: { flexDirection: 'row', gap: 8, height: 62, paddingTop: 4 },
  phaseTrack: { alignItems: 'center', gap: 6 },
  phaseChip: { minWidth: 58, height: 42, borderRadius: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(21,24,32,0.9)', borderWidth: 1, borderColor: '#353B47' },
  activePhaseChip: { borderWidth: 2 },
  phaseText: { color: '#A8AEB9', fontSize: 8, fontWeight: '900' },
  activePhaseText: { color: '#FFFFFF' },
  nextButton: { width: 170, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  nextButtonText: { fontSize: 13, fontWeight: '900' },
  nextButtonHint: { fontSize: 7, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalCard: { width: '100%', maxWidth: 620, maxHeight: '92%', borderRadius: 22, backgroundColor: '#12151D', borderWidth: 1, borderColor: '#303544', padding: 18 },
  nameCard: { width: '100%', maxWidth: 430, borderRadius: 22, backgroundColor: '#12151D', borderWidth: 1, borderColor: '#303544', padding: 18 },
  manaPickerCard: { width: '100%', maxWidth: 460, borderRadius: 22, backgroundColor: '#12151D', borderWidth: 1, borderColor: '#303544', padding: 18, gap: 14 },
  settingsCard: { width: '100%', maxWidth: 390, borderRadius: 22, backgroundColor: '#12151D', borderWidth: 1, borderColor: '#303544', padding: 18, gap: 12 },
  modalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  modalSubtitle: { color: '#8E94A6', fontSize: 10, marginTop: 4, marginBottom: 10 },
  endGameButton: { borderRadius: 13, backgroundColor: '#4A1E26', borderWidth: 1, borderColor: '#8B3948', paddingVertical: 14, alignItems: 'center' },
  endGameText: { color: '#FFB5BE', fontSize: 12, fontWeight: '900' },
  closeSettings: { paddingVertical: 10, alignItems: 'center' },
  nameInput: { marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: '#3B4150', backgroundColor: '#1A1D26', color: '#FFFFFF', fontSize: 18, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 12 },
  pickerScroll: { maxHeight: 280 },
  groupTitle: { color: '#9AA0AD', fontSize: 8, fontWeight: '900', marginTop: 8, marginBottom: 6 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleButton: { width: '31.5%', minHeight: 58, borderRadius: 12, backgroundColor: '#1A1D26', borderWidth: 1, borderColor: '#2A2F3C', padding: 8, justifyContent: 'center' },
  selectedRole: { borderWidth: 2 },
  suggestedRole: { borderColor: '#57C7B6' },
  roleName: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  roleType: { color: '#8A909D', fontSize: 7, fontWeight: '800', marginTop: 3 },
  expiryLabel: { color: '#9AA0AD', fontSize: 8, fontWeight: '900', marginTop: 12, marginBottom: 7 },
  expiryRow: { flexDirection: 'row', gap: 8 },
  expiryButton: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: '#1A1D26', borderWidth: 1, borderColor: '#2A2F3C', alignItems: 'center', justifyContent: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 18 },
  cancelText: { color: '#8E94A6', fontSize: 11, fontWeight: '900' },
  addButton: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
  addText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  manaPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  manaPickerButton: { width: '31%', minHeight: 62, borderRadius: 12, backgroundColor: '#1A1D26', borderWidth: 1, borderColor: '#2A2F3C', alignItems: 'center', justifyContent: 'center' },
});