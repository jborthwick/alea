import { useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { GameCanvas } from './GameCanvas';
import { GameUI } from './GameUI';
import { useGameStore } from '../../store/gameStore';
import { useShakeDetection } from '../../hooks/useShakeDetection';
import { useAudio } from '../../hooks/useAudio';
import { useHaptics } from '../../hooks/useHaptics';
import './Game.css';

export function Game() {
  const [rollTrigger, setRollTrigger] = useState(0);
  const [rollIntensity, setRollIntensity] = useState(0.7);
  const [throwDirection, setThrowDirection] = useState<THREE.Vector2 | null>(null);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);

  const rollDice = useGameStore((state) => state.rollDice);
  const isRolling = useGameStore((state) => state.isRolling);
  const opponentIsRolling = useGameStore((state) => state.opponentIsRolling);
  const isShaking = useGameStore((state) => state.isShaking);
  const rollsRemaining = useGameStore((state) => state.rollsRemaining);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const bankroll = useGameStore((state) => state.bankroll);
  const currentBet = useGameStore((state) => state.currentBet);

  // canRoll — same logic as GameUI
  const canRoll =
    !isRolling &&
    !opponentIsRolling &&
    rollsRemaining > 0 &&
    (gamePhase === 'betting' ? (currentBet === 0 || bankroll >= currentBet) : true);

  // Audio/haptics for gesture-triggered rolls
  const { playRoll, initAudio } = useAudio();
  const { vibrateRoll } = useHaptics();

  // Handle roll action (button, shake, or throw)
  const handleRoll = useCallback(
    (intensity: number = 0.7, direction?: THREE.Vector2) => {
      rollDice();
      setRollIntensity(intensity);
      setThrowDirection(direction ?? null);
      setRollTrigger((prev) => prev + 1);
    },
    [rollDice]
  );

  // Handle grab-and-throw from canvas gesture
  const handleThrow = useCallback(
    (intensity: number, direction: THREE.Vector2) => {
      initAudio();
      playRoll();
      vibrateRoll();
      handleRoll(intensity, direction);
    },
    [initAudio, playRoll, vibrateRoll, handleRoll]
  );

  // Handle shake detection
  useShakeDetection({
    onShake: (intensity) => {
      if (!isRolling) {
        handleRoll(intensity);
      }
    },
  });

  // Device orientation for tilt-based lighting
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta !== null && event.gamma !== null) {
        // Normalize tilt values to -1 to 1 range
        setTiltX(Math.max(-1, Math.min(1, event.gamma / 45)));
        setTiltY(Math.max(-1, Math.min(1, (event.beta - 45) / 45)));
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return (
    <div className={`game-container ${sceneReady ? 'game-container-ready' : ''}`}>
      <GameCanvas
        rollTrigger={rollTrigger}
        intensity={rollIntensity}
        throwDirection={throwDirection}
        tiltX={tiltX}
        tiltY={tiltY}
        onReady={() => setSceneReady(true)}
        onThrow={handleThrow}
        canRoll={canRoll}
        isShaking={isShaking}
      />
      <GameUI onRoll={handleRoll} />
    </div>
  );
}
