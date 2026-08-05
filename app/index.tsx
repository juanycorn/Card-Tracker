import { router } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundOrbOne} />
      <View style={styles.backgroundOrbTwo} />

      <View style={styles.container}>
        <View style={styles.brandBlock}>
          <Text style={styles.eyebrow}>TABLETOP COMPANION</Text>
          <Text style={styles.logo}>Card<Text style={styles.logoAccent}>Sync</Text></Text>
          <Text style={styles.tagline}>Your game. Your deck. Your theme.</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/setup')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryButtonText}>NEW GAME</Text>
            <Text style={styles.primaryButtonHint}>Choose a game and play mode</Text>
          </Pressable>

          <View style={styles.secondaryRow}>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.secondaryButtonText}>THEMES</Text>
              <Text style={styles.comingSoon}>COMING SOON</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.secondaryButtonText}>SETTINGS</Text>
              <Text style={styles.comingSoon}>COMING SOON</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.version}>CARDSYNC · FIRST PLAYABLE BUILD</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080A0F', overflow: 'hidden' },
  container: { flex: 1, paddingHorizontal: 48, paddingVertical: 30, justifyContent: 'space-between' },
  backgroundOrbOne: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: '#5B3DF5', opacity: 0.18, top: -190, right: -80 },
  backgroundOrbTwo: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: '#19B8A5', opacity: 0.12, bottom: -220, left: -80 },
  brandBlock: { alignItems: 'center', marginTop: 16 },
  eyebrow: { color: '#8E94A6', fontSize: 12, fontWeight: '800', letterSpacing: 4 },
  logo: { color: '#F7F8FC', fontSize: 66, lineHeight: 76, fontWeight: '900', letterSpacing: -3 },
  logoAccent: { color: '#8F7CFF' },
  tagline: { color: '#B6BAC8', fontSize: 18, marginTop: 4 },
  actions: { width: '100%', maxWidth: 620, alignSelf: 'center', gap: 14 },
  primaryButton: { backgroundColor: '#7560FF', borderRadius: 22, paddingVertical: 20, paddingHorizontal: 24, alignItems: 'center', shadowColor: '#7560FF', shadowOpacity: 0.35, shadowRadius: 18, elevation: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: 1.5 },
  primaryButtonHint: { color: '#DDD8FF', fontSize: 13, marginTop: 4, fontWeight: '600' },
  secondaryRow: { flexDirection: 'row', gap: 14 },
  secondaryButton: { flex: 1, minHeight: 82, borderRadius: 18, borderWidth: 1, borderColor: '#2B2F3A', backgroundColor: '#11141B', justifyContent: 'center', alignItems: 'center' },
  secondaryButtonText: { color: '#E8E9EF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  comingSoon: { color: '#676D7D', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 5 },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  version: { alignSelf: 'center', color: '#4E5360', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
});
