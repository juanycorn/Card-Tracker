import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { loadSavedGame, type SavedGame } from '../storage/gameSave';

export default function HomeScreen() {
  const [savedGame, setSavedGame] = useState<SavedGame | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadSavedGame().then((save) => {
        if (active) setSavedGame(save);
      });
      return () => { active = false; };
    }, []),
  );

  const continueGame = () => {
    if (!savedGame) return;
    const { config } = savedGame;
    router.push({
      pathname: '/game',
      params: {
        game: config.game,
        mode: config.mode,
        players: String(config.players),
        start: String(config.start),
        metric: config.metric,
        step: String(config.step),
        theme: config.theme,
        resume: '1',
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundOrbOne} />
      <View style={styles.backgroundOrbTwo} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.brandBlock}>
          <Text style={styles.eyebrow}>TABLETOP COMPANION</Text>
          <Text style={styles.logo}>Card<Text style={styles.logoAccent}>Sync</Text></Text>
          <Text style={styles.tagline}>Your game. Your deck. Your theme.</Text>
        </View>

        <View style={styles.actions}>
          {savedGame && (
            <Pressable onPress={continueGame} style={({ pressed }) => [styles.continueButton, pressed && styles.buttonPressed]}>
              <Text style={styles.continueButtonText}>CONTINUE GAME</Text>
              <Text style={styles.continueHint}>{savedGame.config.game} · {savedGame.config.mode} · {savedGame.state.players.length} players</Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/setup')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryButtonText}>NEW GAME</Text>
            <Text style={styles.primaryButtonHint}>Choose a game and play mode</Text>
          </Pressable>

          <View style={styles.secondaryRow}>
            <Pressable onPress={() => router.push('/profiles')} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.secondaryButtonText}>DECK PROFILES</Text>
              <Text style={styles.availableNow}>CREATE · SAVE · PLAY</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/themes')} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.secondaryButtonText}>THEME CREATOR</Text>
              <Text style={styles.availableNow}>CREATE · SAVE · EDIT</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.version}>CARDSYNC · FIRST PLAYABLE BUILD</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080A0F', overflow: 'hidden' },
  scroll: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28, justifyContent: 'center', gap: 26 },
  backgroundOrbOne: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: '#5B3DF5', opacity: 0.18, top: -190, right: -80 },
  backgroundOrbTwo: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: '#19B8A5', opacity: 0.12, bottom: -220, left: -80 },
  brandBlock: { alignItems: 'center' },
  eyebrow: { color: '#8E94A6', fontSize: 10, fontWeight: '800', letterSpacing: 3 },
  logo: { color: '#F7F8FC', fontSize: 56, lineHeight: 64, fontWeight: '900', letterSpacing: -3 },
  logoAccent: { color: '#8F7CFF' },
  tagline: { color: '#B6BAC8', fontSize: 16, marginTop: 2, textAlign: 'center' },
  actions: { width: '100%', maxWidth: 620, alignSelf: 'center', gap: 12 },
  continueButton: { backgroundColor: '#142923', borderWidth: 1, borderColor: '#43B79C', borderRadius: 19, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  continueButtonText: { color: '#D8FFF5', fontSize: 17, fontWeight: '900', letterSpacing: 1.2 },
  continueHint: { color: '#82CDBB', fontSize: 10, marginTop: 3, fontWeight: '700', textAlign: 'center' },
  primaryButton: { backgroundColor: '#7560FF', borderRadius: 22, paddingVertical: 18, paddingHorizontal: 22, alignItems: 'center', shadowColor: '#7560FF', shadowOpacity: 0.35, shadowRadius: 18, elevation: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  primaryButtonHint: { color: '#DDD8FF', fontSize: 12, marginTop: 4, fontWeight: '600' },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondaryButton: { flex: 1, minHeight: 68, borderRadius: 18, borderWidth: 1, borderColor: '#2B2F3A', backgroundColor: '#11141B', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  secondaryButtonText: { color: '#E8E9EF', fontSize: 14, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center' },
  availableNow: { color: '#57C7B6', fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 5, textAlign: 'center' },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  version: { alignSelf: 'center', color: '#4E5360', fontSize: 9, fontWeight: '700', letterSpacing: 1.6, textAlign: 'center' },
});