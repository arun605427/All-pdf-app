export function useHaptic() {
  const triggerHaptic = (duration: number = 15) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(duration);
      }
    } catch {
      // Haptics not supported or ignored
    }
  };

  const successHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([20, 50, 20]);
      }
    } catch {
      // Ignore
    }
  };

  return { triggerHaptic, successHaptic };
}
