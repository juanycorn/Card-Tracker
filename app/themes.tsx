import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ThemeAnimation } from '../themes';
import { createCustomThemeDraft, deleteCustomTheme, loadCustomThemes, upsertCustomTheme, type CustomTheme } from '../storage/customThemes';

const ANIMATIONS: ThemeAnimation[] = ['none', 'pulse', 'shake', 'spring', 'glow'];

export default function ThemesScreen() {
  const [themes, setThemes] = useState<CustomTheme[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CustomTheme>(createCustomThemeDraft());

  useFocusEffect(useCallback(() => {
    let active = true;
    loadCustomThemes().then((items) => { if (active) setThemes(items); });
    return () => { active = false; };
  }, []));

  const newTheme = () => { setDraft(createCustomThemeDraft()); setEditing(true); };
  const editTheme = (theme: CustomTheme) => { setDraft(theme); setEditing(true); };

  const saveTheme = async () => {
    const name = draft.name.trim();
    if (!name) {
      Alert.alert('Theme name required', 'Give your theme a name first.');
      return;
    }
    const saved = { ...draft, name, description: draft.description.trim(), updatedAt: Date.now() };
    setThemes(await upsertCustomTheme(saved));
    setEditing(false);
  };

  const removeTheme = (theme: CustomTheme) => Alert.alert('Delete theme?', theme.name, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => setThemes(await deleteCustomTheme(theme.id)) },
  ]);

  const setColor = (key: keyof CustomTheme['colors'], value: string) => setDraft((current) => ({
    ...current,
    colors: { ...current.colors, [key]: value },
  }));

  const setAnimation = (key: keyof CustomTheme['animations'], value: ThemeAnimation) => setDraft((current) => ({
    ...current,
    animations: { ...current.animations, [key]: value },
  }));

  if (!editing) {
    return <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ HOME</Text></Pressable>
        <View><Text style={styles.title}>Theme Creator</Text><Text style={styles.subtitle}>Build and save custom player themes.</Text></View>
        <Pressable onPress={newTheme} style={styles.newButton}><Text style={styles.newButtonText}>＋ NEW</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {themes.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No custom themes yet</Text><Text style={styles.emptyBody}>Create a theme now. Image and audio importing will plug into the asset slots next.</Text><Pressable onPress={newTheme} style={styles.primaryButton}><Text style={styles.primaryText}>CREATE THEME</Text></Pressable></View>
        : themes.map((theme) => <View key={theme.id} style={[styles.themeCard, { borderColor: theme.colors.accent, backgroundColor: theme.colors.surface }]}>
            <View style={[styles.previewBlock, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.themeInfo}><Text style={[styles.themeName, { color: theme.colors.text }]}>{theme.name}</Text><Text style={[styles.themeDescription, { color: theme.colors.mutedText }]}>{theme.description || 'Custom CardSync theme'}</Text></View>
            <Pressable onPress={() => editTheme(theme)} style={styles.smallButton}><Text style={styles.smallButtonText}>EDIT</Text></Pressable>
            <Pressable onPress={() => removeTheme(theme)} style={styles.deleteButton}><Text style={styles.deleteText}>×</Text></Pressable>
          </View>)}
      </ScrollView>
    </SafeAreaView>;
  }

  return <SafeAreaView style={[styles.safeArea, { backgroundColor: draft.colors.background }]}>
    <View style={styles.header}>
      <Pressable onPress={() => setEditing(false)} style={styles.backButton}><Text style={styles.backText}>‹ THEMES</Text></Pressable>
      <View><Text style={styles.title}>{themes.some((item) => item.id === draft.id) ? 'Edit Theme' : 'New Theme'}</Text><Text style={styles.subtitle}>Customize the visual and motion foundation.</Text></View>
      <View style={{ width: 92 }} />
    </View>

    <ScrollView contentContainerStyle={styles.editor}>
      <View style={[styles.livePreview, { backgroundColor: draft.colors.surface, borderColor: draft.colors.accent }]}>
        <View style={[styles.previewAccent, { backgroundColor: draft.colors.primary }]} />
        <Text style={[styles.previewTitle, { color: draft.colors.text }]}>{draft.name || 'Theme Preview'}</Text>
        <Text style={[styles.previewMeta, { color: draft.colors.mutedText }]}>Player turn · Counter added · Life change</Text>
        <Text style={[styles.previewLife, { color: draft.colors.text }]}>40</Text>
        <View style={styles.previewLifeRow}><Text style={{ color: draft.colors.lifeGain }}>+ LIFE</Text><Text style={{ color: draft.colors.lifeLoss }}>− LIFE</Text></View>
      </View>

      <Text style={styles.sectionLabel}>BASICS</Text>
      <TextInput value={draft.name} onChangeText={(name) => setDraft((current) => ({ ...current, name }))} placeholder="Theme name" placeholderTextColor="#676D7D" style={styles.input} />
      <TextInput value={draft.description} onChangeText={(description) => setDraft((current) => ({ ...current, description }))} placeholder="Description (optional)" placeholderTextColor="#676D7D" style={styles.input} />

      <Text style={styles.sectionLabel}>COLORS</Text>
      <Text style={styles.helpText}>Use hex colors for now. A visual picker can come later.</Text>
      <View style={styles.grid}>{(Object.keys(draft.colors) as (keyof CustomTheme['colors'])[]).map((key) => <View key={key} style={styles.colorField}><Text style={styles.fieldLabel}>{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</Text><View style={[styles.colorDot, { backgroundColor: draft.colors[key] }]} /><TextInput value={draft.colors[key]} onChangeText={(value) => setColor(key, value)} autoCapitalize="characters" style={styles.colorInput} /></View>)}</View>

      <Text style={styles.sectionLabel}>ANIMATIONS</Text>
      {(Object.keys(draft.animations) as (keyof CustomTheme['animations'])[]).map((key) => <View key={key} style={styles.animationRow}><Text style={styles.animationLabel}>{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.animationChoices}>{ANIMATIONS.map((animation) => <Pressable key={animation} onPress={() => setAnimation(key, animation)} style={[styles.animationChip, draft.animations[key] === animation && { borderColor: draft.colors.accent, backgroundColor: draft.colors.surface }]}><Text style={styles.animationChipText}>{animation.toUpperCase()}</Text></Pressable>)}</ScrollView></View>)}

      <Text style={styles.sectionLabel}>ASSETS</Text>
      <Text style={styles.helpText}>These slots are saved with the theme now. File picking and persistent app storage are the next implementation step.</Text>
      <View style={styles.assetGrid}>{[
        ['Background Image', draft.assets.backgroundImage],
        ['Preview Image', draft.assets.previewImage],
        ['Damage Sound', draft.assets.damageSound],
        ['Heal Sound', draft.assets.healSound],
        ['Counter Sound', draft.assets.counterSound],
        ['Turn Sound', draft.assets.turnSound],
        ['Music', draft.assets.music],
      ].map(([label, asset]) => <View key={label as string} style={styles.assetCard}><Text style={styles.assetTitle}>{label as string}</Text><Text style={styles.assetMeta}>{(asset as CustomTheme['assets']['music']).name || 'Not selected'}</Text><View style={styles.assetPlaceholder}><Text style={styles.assetPlaceholderText}>IMPORT NEXT</Text></View></View>)}</View>
    </ScrollView>

    <View style={styles.footer}><Pressable onPress={() => setEditing(false)} style={styles.cancelButton}><Text style={styles.cancelText}>CANCEL</Text></Pressable><Pressable onPress={saveTheme} style={[styles.saveButton, { backgroundColor: draft.colors.primary }]}><Text style={styles.saveText}>SAVE THEME</Text></Pressable></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080A0F' },
  header: { minHeight: 82, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  backButton: { minWidth: 92, paddingVertical: 10, borderRadius: 12, backgroundColor: '#151820', alignItems: 'center' },
  backText: { color: '#AEB3C1', fontSize: 11, fontWeight: '900' },
  title: { color: '#F7F8FC', fontSize: 23, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#8A909D', fontSize: 10, marginTop: 3, textAlign: 'center' },
  newButton: { minWidth: 92, paddingVertical: 11, borderRadius: 12, backgroundColor: '#E7E8EB', alignItems: 'center' },
  newButtonText: { color: '#111318', fontSize: 11, fontWeight: '900' },
  list: { padding: 24, gap: 12 },
  emptyCard: { maxWidth: 620, width: '100%', alignSelf: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#2A2F3C', backgroundColor: '#11141B', padding: 28, alignItems: 'center' },
  emptyTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  emptyBody: { color: '#8E94A6', fontSize: 12, textAlign: 'center', marginTop: 7, marginBottom: 18 },
  primaryButton: { backgroundColor: '#E7E8EB', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 22 },
  primaryText: { color: '#111318', fontWeight: '900' },
  themeCard: { width: '100%', maxWidth: 720, alignSelf: 'center', minHeight: 94, borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewBlock: { width: 44, height: 44, borderRadius: 12 },
  themeInfo: { flex: 1 },
  themeName: { fontSize: 18, fontWeight: '900' },
  themeDescription: { fontSize: 10, marginTop: 4 },
  smallButton: { borderRadius: 12, backgroundColor: '#252A35', paddingVertical: 12, paddingHorizontal: 14 },
  smallButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 10 },
  deleteButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3A1B22', alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#FF7A86', fontSize: 20, fontWeight: '900' },
  editor: { paddingHorizontal: 24, paddingBottom: 120 },
  livePreview: { minHeight: 190, borderRadius: 20, borderWidth: 2, padding: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  previewAccent: { width: '48%', height: 8, borderRadius: 4, marginBottom: 12 },
  previewTitle: { fontSize: 22, fontWeight: '900' },
  previewMeta: { fontSize: 10, marginTop: 4 },
  previewLife: { fontSize: 52, fontWeight: '900', marginTop: 8 },
  previewLifeRow: { flexDirection: 'row', gap: 24 },
  sectionLabel: { color: '#A5ABB7', fontSize: 9, fontWeight: '900', letterSpacing: 1.7, marginTop: 18, marginBottom: 8 },
  helpText: { color: '#7E8494', fontSize: 10, marginBottom: 8 },
  input: { borderRadius: 13, borderWidth: 1, borderColor: '#303544', backgroundColor: '#141820', color: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  colorField: { width: '48%', flexGrow: 1, borderRadius: 13, backgroundColor: '#11141B', borderWidth: 1, borderColor: '#2B303C', padding: 10 },
  fieldLabel: { color: '#8A909D', fontSize: 8, fontWeight: '900', marginBottom: 6 },
  colorDot: { width: '100%', height: 18, borderRadius: 7, marginBottom: 7 },
  colorInput: { borderRadius: 9, backgroundColor: '#1A1E27', color: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 8, fontWeight: '800' },
  animationRow: { marginBottom: 10 },
  animationLabel: { color: '#A5ABB7', fontSize: 9, fontWeight: '900', marginBottom: 6 },
  animationChoices: { gap: 7 },
  animationChip: { borderRadius: 11, borderWidth: 1, borderColor: '#303544', backgroundColor: '#151820', paddingVertical: 9, paddingHorizontal: 12 },
  animationChipText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  assetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  assetCard: { width: '31%', flexGrow: 1, minHeight: 108, borderRadius: 14, borderWidth: 1, borderColor: '#2B303C', backgroundColor: '#11141B', padding: 12 },
  assetTitle: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  assetMeta: { color: '#7E8494', fontSize: 8, marginTop: 4 },
  assetPlaceholder: { marginTop: 10, minHeight: 36, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#454B58', alignItems: 'center', justifyContent: 'center' },
  assetPlaceholderText: { color: '#747B89', fontSize: 8, fontWeight: '900' },
  footer: { height: 78, borderTopWidth: 1, borderTopColor: '#252A35', backgroundColor: '#0D1016', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 18 },
  cancelText: { color: '#8E94A6', fontWeight: '900' },
  saveButton: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 },
  saveText: { color: '#FFFFFF', fontWeight: '900' },
});