import { Animated } from 'react-native';

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

export default GameScreen;
