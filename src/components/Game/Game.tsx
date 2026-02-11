import { useState, useCallback, useEffect } from 'react';
import { GameCanvas } from './GameCanvas';
import { GameUI } from './GameUI';
import { useGameStore } from '../../store/gameStore';
import { useShakeDetection } from '../../hooks/useShakeDetection';
import { preloadDicePNGs } from '../Dice/DiceGeometry';
import './Game.css';

export function Game() {
  const [rollTrigger, setRollTrigger] = useState(0);
  const [rollIntensity, setRollIntensity] = useState(0.7);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [svgsLoaded, setSvgsLoaded] = useState(false);

  const rollDice = useGameStore((state) => state.rollDice);
  const isRolling = useGameStore((state) => state.isRolling);

  // Preload PNGs on mount
  useEffect(() => {
    preloadDicePNGs().then(() => {
      setSvgsLoaded(true);
    });
  }, []);

  // Handle roll action
  const handleRoll = useCallback(
    (intensity: number = 0.7) => {
      rollDice();
      setRollIntensity(intensity);
      setRollTrigger((prev) => prev + 1);
    },
    [rollDice]
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

  // Show loading state until SVGs are loaded
  if (!svgsLoaded) {
    return (
      <div className="game-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgb(var(--text))', fontSize: '24px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <GameCanvas
        rollTrigger={rollTrigger}
        intensity={rollIntensity}
        tiltX={tiltX}
        tiltY={tiltY}
      />
      <GameUI onRoll={handleRoll} />
    </div>
  );
}
