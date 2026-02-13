import { useState, useCallback, useEffect } from 'react';
import { GameCanvas } from './GameCanvas';
import { GameUI } from './GameUI';
import { useGameStore } from '../../store/gameStore';
import { useShakeDetection } from '../../hooks/useShakeDetection';
import './Game.css';

export function Game() {
  const [rollTrigger, setRollTrigger] = useState(0);
  const [rollIntensity, setRollIntensity] = useState(0.7);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);

  const rollDice = useGameStore((state) => state.rollDice);
  const isRolling = useGameStore((state) => state.isRolling);

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

  return (
    <div className={`game-container ${sceneReady ? 'game-container-ready' : ''}`}>
      <GameCanvas
        rollTrigger={rollTrigger}
        intensity={rollIntensity}
        tiltX={tiltX}
        tiltY={tiltY}
        onReady={() => setSceneReady(true)}
      />
      <GameUI onRoll={handleRoll} />
    </div>
  );
}
