import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Stats, Environment } from '@react-three/drei';
import { Leva } from 'leva';
import { Suspense } from 'react';
import * as THREE from 'three';
import { DiceGroup } from '../Dice/DiceGroup';
import { OpponentDiceGroup } from '../Dice/OpponentDice';
import { PlaySurface } from '../Environment/PlaySurface';
import { Lighting } from '../Environment/Lighting';
import { useGameStore } from '../../store/gameStore';
import { usePhysicsDebug } from '../../hooks/usePhysicsDebug';

interface GameCanvasProps {
  rollTrigger: number;
  intensity?: number;
  tiltX?: number;
  tiltY?: number;
}

// Inner scene component that can use leva hooks inside Canvas
function Scene({ rollTrigger, intensity, tiltX, tiltY }: GameCanvasProps) {
  const { gravity } = usePhysicsDebug();

  return (
    <>
      <Environment preset="night" environmentIntensity={0.8} />
      <Physics gravity={[0, gravity, 0]} timeStep="vary">
        <Lighting tiltX={tiltX} tiltY={tiltY} />
        <PlaySurface />
        <DiceGroup rollTrigger={rollTrigger} intensity={intensity} />
        <OpponentDiceGroup />
      </Physics>
    </>
  );
}

export function GameCanvas({ rollTrigger, intensity, tiltX, tiltY }: GameCanvasProps) {
  const showFPS = useGameStore((state) => state.showFPS);

  // Use wider FOV on mobile to prevent dice cutoff
  const isMobile = window.innerWidth <= 768;
  const fov = isMobile ? 50 : 45;

  return (
    <>
      <Leva collapsed titleBar={{ title: 'Physics Debug' }} theme={{ sizes: { rootWidth: '380px', controlWidth: '200px' } }} />
      <Canvas
        shadows={{ type: THREE.VSMShadowMap }}
        camera={{
          position: [0, 12, 2],
          fov,
          near: 0.1,
          far: 100,
        }}
        style={{ background: 'rgb(18, 16, 12)' }}
      >
        {showFPS && <Stats showPanel={0} className="stats-panel" />}
        <Suspense fallback={null}>
          <Scene rollTrigger={rollTrigger} intensity={intensity} tiltX={tiltX} tiltY={tiltY} />
        </Suspense>
      </Canvas>
    </>
  );
}
