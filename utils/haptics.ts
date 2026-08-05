import * as Haptics from 'expo-haptics';

let lastHapticAt = 0;
const MIN_INTERVAL_MS = 35;

function canTrigger() {
  const now = Date.now();
  if (now - lastHapticAt < MIN_INTERVAL_MS) return false;
  lastHapticAt = now;
  return true;
}

async function safelyTrigger(action: () => Promise<void>) {
  if (!canTrigger()) return;
  try {
    await action();
  } catch {
    // Haptics may be unavailable on some devices or platforms.
  }
}

export function hapticLight() {
  void safelyTrigger(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticMedium() {
  void safelyTrigger(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticSuccess() {
  void safelyTrigger(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
