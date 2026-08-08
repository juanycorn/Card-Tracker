import { router } from 'expo-router';
import { useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { clearSavedGame } from '../storage/gameSave';
import { hapticLight, hapticMedium } from '../utils/haptics';

// React Native throws when the same animated value switches between native and
// JS drivers. CardSync animates colors and transforms together, so keep this
// screen consistently on the JS driver for Android/New Architecture safety.
const animated = Animated as typeof Animated & {
  spring: typeof Animated.spring;
  timing: typeof Animated.timing;
};

const originalSpring = animated.spring.bind(Animated);
const originalTiming = animated.timing.bind(Animated);

animated.spring = ((value, config) =>
  originalSpring(value, { ...config, useNativeDriver: false })) as typeof Animated.spring;

animated.timing = ((value, config) =>
  originalTiming(value, { ...config, useNativeDriver: false })) as typeof Animated.timing;

const GameScreen = require('./GameScreen').default;

export default function GameScreenSafe() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = () => {
    void hapticLight();
    setSettingsOpen(true);
  };

  const endGame = async () => {
    void hapticMedium();
    await clearSavedGame();
    setSettingsOpen(false);
    router.replace('/');
  };

  return (
    <View style={styles.root}>
      <GameScreen />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Game settings"
        hitSlop={16}
        onPress={openSettings}
        style={({ pressed }) => [styles.settingsOverlay, pressed && styles.pressed]}
      >
        <Text style={styles.settingsText}>⚙</Text>
      </Pressable>

      <Modal transparent visible={settingsOpen} animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>Game Settings</Text>
            <Text style={styles.subtitle}>More game options will live here later.</Text>
            <Pressable onPress={endGame} style={styles.endGameButton}>
              <Text style={styles.endGameText}>END GAME</Text>
            </Pressable>
            <Pressable onPress={() => setSettingsOpen(false)} style={styles.closeButton}>
              <Text style={styles.closeText}>CLOSE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  settingsOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 30,
  },
  pressed: { opacity: 0.55, transform: [{ scale: 0.9 }] },
  settingsText: { color: '#F3F4F7', fontSize: 24, fontWeight: '900' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 22,
    backgroundColor: '#12151D',
    borderWidth: 1,
    borderColor: '#303544',
    padding: 18,
    gap: 12,
  },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  subtitle: { color: '#8E94A6', fontSize: 10, marginBottom: 8 },
  endGameButton: {
    borderRadius: 13,
    backgroundColor: '#4A1E26',
    borderWidth: 1,
    borderColor: '#8B3948',
    paddingVertical: 14,
    alignItems: 'center',
  },
  endGameText: { color: '#FFB5BE', fontSize: 12, fontWeight: '900' },
  closeButton: { paddingVertical: 10, alignItems: 'center' },
  closeText: { color: '#8E94A6', fontSize: 11, fontWeight: '900' },
});
