import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Stats } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';
import { DiceGroup } from '../Dice/DiceGroup';
import { OpponentDiceGroup } from '../Dice/OpponentDice';
import { PlaySurface } from '../Environment/PlaySurface';
import { Lighting } from '../Environment/Lighting';
import { GRAVITY } from '../../game/constants';
import { useGameStore } from '../../store/gameStore';

interface GameCanvasProps {
  rollTrigger: number;
  intensity?: number;
  tiltX?: number;
  tiltY?: number;
}

export function GameCanvas({ rollTrigger, intensity, tiltX, tiltY }: GameCanvasProps) {
  const showFPS = useGameStore((state) => state.showFPS);

  // Use wider FOV on mobile to prevent dice cutoff
  const isMobile = window.innerWidth <= 768;
  const fov = isMobile ? 50 : 45;

  return (
    <Canvas
      shadows={{ type: THREE.VSMShadowMap }}
      camera={{
        position: [0, 12, 2],
        fov,
        near: 0.1,
        far: 100,
      }}
      style={{ background: 'rgb(48, 48, 46)' }}
    >
      {showFPS && <Stats showPanel={0} className="stats-panel" />}
      <Suspense fallback={null}>
        <Physics gravity={[0, GRAVITY, 0]} timeStep="vary">
          <Lighting tiltX={tiltX} tiltY={tiltY} />
          <PlaySurface />
          <DiceGroup rollTrigger={rollTrigger} intensity={intensity} />
          <OpponentDiceGroup />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
