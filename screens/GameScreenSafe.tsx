import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

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

// Add a brief direction color to the large life/HP total while preserving its
// existing bounce animation. Positive changes flash green, negative changes red.
const OriginalAnimatedText = Animated.Text;
const AnimatedTextWithLifeColor = (props: React.ComponentProps<typeof OriginalAnimatedText>) => {
  const numericValue = typeof props.children === 'number' ? props.children : null;
  const flattenedStyle = StyleSheet.flatten(props.style);
  const isLifeTotal = numericValue !== null && flattenedStyle?.fontSize === 43;
  const previousValue = useRef(numericValue);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  useEffect(() => {
    if (!isLifeTotal || numericValue === null) return;

    const previous = previousValue.current;
    previousValue.current = numericValue;
    if (previous === null || previous === numericValue) return;

    setFlashColor(numericValue > previous ? '#4ADE80' : '#FF5F6D');
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setFlashColor(null), 420);

    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, [isLifeTotal, numericValue]);

  return <OriginalAnimatedText {...props} style={[props.style, flashColor ? { color: flashColor } : null]} />;
};

(Animated as typeof Animated & { Text: typeof OriginalAnimatedText }).Text =
  AnimatedTextWithLifeColor as typeof OriginalAnimatedText;

const GameScreen = require('./GameScreen').default;

export default GameScreen;
