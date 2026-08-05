import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import GameScreen from './game-v3';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PolishedGameScreen() {
  const lastFeedbackAt = useRef(0);

  const handleTouchStart = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const now = Date.now();
    if (now - lastFeedbackAt.current < 90) return;
    lastFeedbackAt.current = now;
    void Haptics.selectionAsync();
  };

  return (
    <View style={styles.container} onTouchStart={handleTouchStart}>
      <GameScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
