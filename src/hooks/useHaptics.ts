import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

// Check if vibration is supported
// Note: The Vibration API is only supported on Android browsers.
// iOS Safari does not support navigator.vibrate - haptics will gracefully degrade.
function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

// Vibrate with a pattern (milliseconds)
function vibrate(pattern: number | number[]): void {
  if (canVibrate()) {
    navigator.vibrate(pattern);
  }
}

export interface HapticsHook {
  vibrateCollision: () => void;
  vibrateRoll: () => void;
  vibrateHold: () => void;
  vibrateGrab: () => void;
  vibrateWin: () => void;
  vibrateLose: () => void;
  isSupported: boolean;
}

export function useHaptics(): HapticsHook {
  const soundEnabled = useGameStore((state) => state.soundEnabled);

  // Light tap for dice collision
  const vibrateCollision = useCallback(() => {
    if (!soundEnabled) return;
    vibrate(15);
  }, [soundEnabled]);

  // Quick burst for starting a roll
  const vibrateRoll = useCallback(() => {
    if (!soundEnabled) return;
    vibrate([30, 20, 30, 20, 30]);
  }, [soundEnabled]);

  // Single tap for hold action
  const vibrateHold = useCallback(() => {
    if (!soundEnabled) return;
    vibrate(25);
  }, [soundEnabled]);

  // Short pulse for grab pickup
  const vibrateGrab = useCallback(() => {
    if (!soundEnabled) return;
    vibrate(20);
  }, [soundEnabled]);

  // Happy pattern for winning
  const vibrateWin = useCallback(() => {
    if (!soundEnabled) return;
    vibrate([50, 50, 50, 50, 100]);
  }, [soundEnabled]);

  // Longer buzz for losing
  const vibrateLose = useCallback(() => {
    if (!soundEnabled) return;
    vibrate(100);
  }, [soundEnabled]);

  return {
    vibrateCollision,
    vibrateRoll,
    vibrateHold,
    vibrateGrab,
    vibrateWin,
    vibrateLose,
    isSupported: canVibrate(),
  };
}
