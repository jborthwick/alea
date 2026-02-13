import { useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

// Audio context for managing sounds
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const WindowWithWebkit = window as Window & { webkitAudioContext?: typeof AudioContext };
    const CtxClass = window.AudioContext || WindowWithWebkit.webkitAudioContext;
    audioContext = new CtxClass!();
  }
  return audioContext;
}

// Generate sounds programmatically (no external files needed)
function createNoiseBuffer(duration: number): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  return buffer;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
): void {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume: number = 0.1): void {
  const ctx = getAudioContext();
  const buffer = createNoiseBuffer(duration);
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, ctx.currentTime);

  source.buffer = buffer;

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(ctx.currentTime);
}

export interface AudioHook {
  playRoll: () => void;
  playCollision: () => void;
  playHold: () => void;
  playWin: () => void;
  playLose: () => void;
  initAudio: () => void;
}

export function useAudio(): AudioHook {
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const initialized = useRef(false);

  const initAudio = useCallback(() => {
    if (initialized.current) return;
    // Initialize audio context on first user interaction
    getAudioContext();
    initialized.current = true;
  }, []);

  const playRoll = useCallback(() => {
    if (!soundEnabled) return;
    // Dice rolling sound: multiple quick rattling sounds
    playNoise(0.15, 0.15);
    setTimeout(() => playNoise(0.1, 0.1), 50);
    setTimeout(() => playNoise(0.08, 0.08), 100);
  }, [soundEnabled]);

  const playCollision = useCallback(() => {
    if (!soundEnabled) return;
    // Quick thud for collision
    playNoise(0.05, 0.08);
    playTone(150, 0.05, 'sine', 0.1);
  }, [soundEnabled]);

  const playHold = useCallback(() => {
    if (!soundEnabled) return;
    // Click sound for hold
    playTone(800, 0.08, 'sine', 0.2);
  }, [soundEnabled]);

  const playWin = useCallback(() => {
    if (!soundEnabled) return;
    // Happy ascending tones
    playTone(440, 0.15, 'sine', 0.3);
    setTimeout(() => playTone(550, 0.15, 'sine', 0.3), 100);
    setTimeout(() => playTone(660, 0.2, 'sine', 0.3), 200);
    setTimeout(() => playTone(880, 0.3, 'sine', 0.4), 300);
  }, [soundEnabled]);

  const playLose = useCallback(() => {
    if (!soundEnabled) return;
    // Sad descending tones
    playTone(400, 0.2, 'sine', 0.2);
    setTimeout(() => playTone(300, 0.3, 'sine', 0.15), 200);
  }, [soundEnabled]);

  return {
    playRoll,
    playCollision,
    playHold,
    playWin,
    playLose,
    initAudio,
  };
}
