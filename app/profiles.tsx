import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { COUNTER_KIND } from '../games/counters';
import { getRulesPack, RULES_PRESETS, type CounterRole, type ManaColor, type RulesPreset } from '../games';
import { DEFAULT_PLAYER_THEME_ID, MANA_THEME_COLORS, getCustomThemeId, getManaThemeId } from '../themes';
import { loadCustomThemes, type CustomTheme } from '../storage/customThemes';
import { deleteDeckProfile, loadDeckProfiles, upsertDeckProfile, type DeckProfile } from '../storage/deckProfiles';

const MANA_COLORS: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];

const makeDraft = (): DeckProfile => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  playerName: '',
  presetId: RULES_PRESETS[0].id,
  themeId: DEFAULT_PLAYER_THEME_ID,
  manaColors: [],
  preferredCounters: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export default function ProfilesScreen() {
  const [profiles, setProfiles] = useState<DeckProfile[]>([]);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [draft, setDraft] = useState<DeckProfile>(makeDraft());
  const [editing, setEditing] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([loadDeckProfiles(), loadCustomThemes()]).then(([profileItems, themeItems]) => {
      if (!active) return;
      setProfiles(profileItems);
      setCustomThemes(themeItems);
    });
    return () => { active = false; };
  }, []));

  const preset = useMemo<RulesPreset>(() => RULES_PRESETS.find((item) => item.id === draft.presetId) ?? RULES_PRESETS[0], [draft.presetId]);
  const rules = getRulesPack(preset.game);
  const availableCounters = rules.counterGroups.flatMap((group) => group.roles);
  const attachedTheme = customThemes.find((theme) => getCustomThemeId(theme) === draft.themeId);
  const selectedAccent = attachedTheme?.colors.accent ?? (draft.manaColors.length ? MANA_THEME_COLORS[draft.manaColors[draft.manaColors.length - 1]] : MANA_THEME_COLORS.C);

  const choosePreset = (item: RulesPreset) => {
    const nextRules = getRulesPack(item.game);
    setDraft((current) => ({
      ...current,
      presetId: item.id,
      manaColors: nextRules.supportsMana ? current.manaColors : [],
      preferredCounters: current.preferredCounters.filter((role) => nextRules.counterGroups.some((group) => group.roles.includes(role))),
    }));
  };

  const toggleMana = (color: ManaColor) => setDraft((current) => {
    const exists = current.manaColors.includes(color);
    let manaColors = exists ? current.manaColors.filter((item) => item !== color) : [...current.manaColors, color];
    if (color !== 'C') manaColors = manaColors.filter((item) => item !== 'C');
    if (color === 'C' && !exists) manaColors = ['C'];
    if (manaColors.length === 0) manaColors = ['C'];
    return { ...current, manaColors, themeId: current.themeId.startsWith('custom:') ? current.themeId : getManaThemeId(manaColors) };
  });

  const chooseTheme = (theme?: CustomTheme) => setDraft((current) => ({
    ...current,
    themeId: theme ? getCustomThemeId(theme) : getManaThemeId(current.manaColors),
  }));

  const toggleCounter = (role: CounterRole) => setDraft((current) => ({
    ...current,
    preferredCounters: current.preferredCounters.includes(role)
      ? current.preferredCounters.filter((item) => item !== role)
      : [...current.preferredCounters, role],
  }));

  const saveProfile = async () => {
    const name = draft.name.trim();
    if (!name) {
      Alert.alert('Deck name required', 'Give this deck profile a name first.');
      return;
    }
    const themeId = draft.themeId.startsWith('custom:') ? draft.themeId : getManaThemeId(draft.manaColors);
    const saved = { ...draft, name, themeId, playerName: draft.playerName.trim(), updatedAt: Date.now() };
    setProfiles(await upsertDeckProfile(saved));
    setDraft(makeDraft());
    setEditing(false);
  };

  const editProfile = (profile: DeckProfile) => { setDraft({ ...profile, manaColors: profile.manaColors.length ? profile.manaColors : ['C'] }); setEditing(true); };
  const removeProfile = (profile: DeckProfile) => Alert.alert('Delete deck profile?', profile.name, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => setProfiles(await deleteDeckProfile(profile.id)) },
  ]);
  const newProfile = () => { setDraft(makeDraft()); setEditing(true); };

  if (!editing) {
    return <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ HOME</Text></Pressable>
        <View><Text style={styles.title}>Deck Profiles</Text><Text style={styles.subtitle}>Save deck defaults and attach a player theme.</Text></View>
        <Pressable onPress={newProfile} style={styles.newButton}><Text style={styles.newButtonText}>＋ NEW</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.profileList}>
        {profiles.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No deck profiles yet</Text><Text style={styles.emptyBody}>Profiles remember rules, mana colors, counters, and an optional custom theme.</Text><Pressable onPress={newProfile} style={styles.primaryButton}><Text style={styles.primaryText}>CREATE PROFILE</Text></Pressable></View>
        : profiles.map((profile) => {
          const itemPreset = RULES_PRESETS.find((item) => item.id === profile.presetId) ?? RULES_PRESETS[0];
          const theme = customThemes.find((item) => getCustomThemeId(item) === profile.themeId);
          const accent = theme?.colors.accent ?? (profile.manaColors.length ? MANA_THEME_COLORS[profile.manaColors[profile.manaColors.length - 1]] : MANA_THEME_COLORS.C);
          return <View key={profile.id} style={styles.profileCard}>
            {!!theme?.assets.previewImage.uri && <Image source={{ uri: theme.assets.previewImage.uri }} style={styles.profileThumb} />}
            <View style={styles.profileInfo}><Text style={styles.profileName}>{profile.name}</Text><Text style={[styles.profileMeta, { color: accent }]}>{itemPreset.game} · {itemPreset.mode}</Text><Text style={styles.profileDetails}>{profile.preferredCounters.length} counter suggestions{profile.manaColors.length ? ` · ${profile.manaColors.join('/')} mana` : ''}{theme ? ` · ${theme.name}` : ' · Mana Default'}</Text></View>
            <Pressable onPress={() => editProfile(profile)} style={styles.smallButton}><Text style={styles.smallButtonText}>EDIT</Text></Pressable>
            <Pressable onPress={() => removeProfile(profile)} style={styles.deleteButton}><Text style={styles.deleteText}>×</Text></Pressable>
          </View>;
        })}
      </ScrollView>
    </SafeAreaView>;
  }

  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}>
      <Pressable onPress={() => setEditing(false)} style={styles.backButton}><Text style={styles.backText}>‹ PROFILES</Text></Pressable>
      <View><Text style={styles.title}>{profiles.some((item) => item.id === draft.id) ? 'Edit Profile' : 'New Deck Profile'}</Text><Text style={styles.subtitle}>This profile carries its selected theme into games.</Text></View>
      <View style={{ width: 92 }} />
    </View>

    <ScrollView contentContainerStyle={styles.editor}>
      <Text style={styles.sectionLabel}>PROFILE</Text>
      <View style={styles.inputRow}>
        <TextInput value={draft.name} onChangeText={(name) => setDraft((current) => ({ ...current, name }))} placeholder="Deck name" placeholderTextColor="#676D7D" style={styles.input} />
        <TextInput value={draft.playerName} onChangeText={(playerName) => setDraft((current) => ({ ...current, playerName }))} placeholder="Player name (optional)" placeholderTextColor="#676D7D" style={styles.input} />
      </View>

      <Text style={styles.sectionLabel}>RULES PRESET</Text>
      <View style={styles.grid}>{RULES_PRESETS.map((item) => <Pressable key={item.id} onPress={() => choosePreset(item)} style={[styles.optionCard, item.id === draft.presetId && [styles.selected, { borderColor: selectedAccent }]]}><Text style={[styles.optionEyebrow, item.id === draft.presetId && { color: selectedAccent }]}>{item.game}</Text><Text style={styles.optionTitle}>{item.mode}</Text><Text style={styles.optionMeta}>{item.players} players · {item.startingValue} {item.metric}</Text></Pressable>)}</View>

      {rules.supportsMana && <><Text style={styles.sectionLabel}>MANA COLORS</Text><Text style={styles.helpText}>Mana colors are still gameplay data and become the fallback visual theme.</Text><View style={styles.chipRow}>{MANA_COLORS.map((color) => <Pressable key={color} onPress={() => toggleMana(color)} style={[styles.chip, draft.manaColors.includes(color) && styles.selected, draft.manaColors.includes(color) && { borderColor: MANA_THEME_COLORS[color] }]}><Text style={styles.chipText}>{color}</Text></Pressable>)}</View></>}

      <Text style={styles.sectionLabel}>PLAYER THEME</Text>
      <Text style={styles.helpText}>Attach a custom theme to this deck. Mana Default is used when no custom theme is attached.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
        <Pressable onPress={() => chooseTheme()} style={[styles.themeCard, !draft.themeId.startsWith('custom:') && styles.themeSelected]}><View style={styles.manaDefault}><Text style={styles.themeName}>MANA DEFAULT</Text><Text style={styles.themeMeta}>{draft.manaColors.join(' / ') || 'Colorless'}</Text></View></Pressable>
        {customThemes.map((theme) => <Pressable key={theme.id} onPress={() => chooseTheme(theme)} style={[styles.themeCard, draft.themeId === getCustomThemeId(theme) && { borderColor: theme.colors.accent, borderWidth: 3 }]}><View style={[styles.themePreview, { backgroundColor: theme.colors.background }]}>{!!theme.assets.previewImage.uri && <Image source={{ uri: theme.assets.previewImage.uri }} style={StyleSheet.absoluteFillObject} />}<View style={styles.themeWash} /><Text style={[styles.themeName, { color: theme.colors.text }]}>{theme.name}</Text><Text style={[styles.themeMeta, { color: theme.colors.mutedText }]}>{theme.description || 'Custom theme'}</Text></View></Pressable>)}
      </ScrollView>
      {customThemes.length === 0 && <Text style={styles.helpText}>No custom themes yet. Create one from the home screen first.</Text>}

      <Text style={styles.sectionLabel}>COUNTER SUGGESTIONS</Text>
      <Text style={styles.helpText}>These do not get added automatically. They will be prioritized in this player's + Counter menu.</Text>
      <View style={styles.grid}>{availableCounters.map((role) => <Pressable key={role} onPress={() => toggleCounter(role)} style={[styles.counterOption, draft.preferredCounters.includes(role) && [styles.selected, { borderColor: selectedAccent }]]}><Text style={styles.counterName}>{role.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}</Text><Text style={styles.optionMeta}>{COUNTER_KIND[role] === 'stats' ? 'Two values' : COUNTER_KIND[role] === 'toggle' ? 'On / off' : 'Number'}</Text></Pressable>)}</View>
    </ScrollView>

    <View style={styles.footer}><Pressable onPress={() => setEditing(false)} style={styles.cancelButton}><Text style={styles.cancelText}>CANCEL</Text></Pressable><Pressable onPress={saveProfile} style={[styles.saveButton, { backgroundColor: selectedAccent }]}><Text style={styles.saveText}>SAVE PROFILE</Text></Pressable></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080A0F' }, header: { minHeight: 82, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }, backButton: { minWidth: 92, paddingVertical: 10, borderRadius: 12, backgroundColor: '#151820', alignItems: 'center' }, backText: { color: '#AEB3C1', fontSize: 11, fontWeight: '900' }, title: { color: '#F7F8FC', fontSize: 23, fontWeight: '900', textAlign: 'center' }, subtitle: { color: '#7E8494', fontSize: 10, marginTop: 3, textAlign: 'center' }, newButton: { minWidth: 92, paddingVertical: 11, borderRadius: 12, backgroundColor: '#4A5563', alignItems: 'center' }, newButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' }, profileList: { padding: 24, gap: 12 }, emptyCard: { maxWidth: 620, width: '100%', alignSelf: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#2A2F3C', backgroundColor: '#11141B', padding: 28, alignItems: 'center' }, emptyTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' }, emptyBody: { color: '#8E94A6', fontSize: 12, textAlign: 'center', marginTop: 7, marginBottom: 18 }, primaryButton: { backgroundColor: '#4A5563', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 22 }, primaryText: { color: '#FFFFFF', fontWeight: '900' }, profileCard: { width: '100%', maxWidth: 720, alignSelf: 'center', minHeight: 94, borderRadius: 18, borderWidth: 1, borderColor: '#292E3A', backgroundColor: '#11141B', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }, profileThumb: { width: 52, height: 52, borderRadius: 12 }, profileInfo: { flex: 1 }, profileName: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' }, profileMeta: { fontSize: 11, fontWeight: '800', marginTop: 3 }, profileDetails: { color: '#7E8494', fontSize: 10, marginTop: 5 }, smallButton: { borderRadius: 12, backgroundColor: '#252A35', paddingVertical: 12, paddingHorizontal: 14 }, smallButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 10 }, deleteButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3A1B22', alignItems: 'center', justifyContent: 'center' }, deleteText: { color: '#FF7A86', fontSize: 20, fontWeight: '900' }, editor: { paddingHorizontal: 24, paddingBottom: 110 }, sectionLabel: { color: '#717787', fontSize: 9, fontWeight: '900', letterSpacing: 1.7, marginTop: 16, marginBottom: 8 }, inputRow: { flexDirection: 'row', gap: 10 }, input: { flex: 1, borderRadius: 13, borderWidth: 1, borderColor: '#303544', backgroundColor: '#141820', color: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '700' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, optionCard: { width: '31.8%', minHeight: 78, flexGrow: 1, borderRadius: 14, borderWidth: 1, borderColor: '#292E3A', backgroundColor: '#11141B', padding: 12, justifyContent: 'center' }, selected: { borderWidth: 2, backgroundColor: '#1B1F27' }, optionEyebrow: { color: '#9CA3AF', fontSize: 8, fontWeight: '900' }, optionTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', marginTop: 2 }, optionMeta: { color: '#777D8D', fontSize: 8, marginTop: 3 }, chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, chip: { width: 54, height: 48, borderRadius: 13, borderWidth: 1, borderColor: '#303544', backgroundColor: '#151820', alignItems: 'center', justifyContent: 'center' }, chipText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, helpText: { color: '#7E8494', fontSize: 10, marginTop: -3, marginBottom: 8 }, themeRow: { gap: 10, paddingBottom: 2 }, themeCard: { width: 150, height: 92, borderRadius: 14, borderWidth: 1, borderColor: '#343947', overflow: 'hidden' }, themeSelected: { borderWidth: 3, borderColor: '#FFFFFF' }, manaDefault: { flex: 1, backgroundColor: '#1A1E27', padding: 12, justifyContent: 'flex-end' }, themePreview: { flex: 1, padding: 12, justifyContent: 'flex-end' }, themeWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)' }, themeName: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' }, themeMeta: { color: '#B7BDC8', fontSize: 8, marginTop: 3 }, counterOption: { width: '23%', minHeight: 62, flexGrow: 1, borderRadius: 12, borderWidth: 1, borderColor: '#292E3A', backgroundColor: '#11141B', padding: 10, justifyContent: 'center' }, counterName: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' }, footer: { height: 78, borderTopWidth: 1, borderTopColor: '#252A35', backgroundColor: '#0D1016', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, paddingHorizontal: 24 }, cancelButton: { paddingVertical: 12, paddingHorizontal: 18 }, cancelText: { color: '#8E94A6', fontWeight: '900' }, saveButton: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 }, saveText: { color: '#FFFFFF', fontWeight: '900' },
});