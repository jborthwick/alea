import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import { DiceGroup } from '../Dice/DiceGroup';
import { PlaySurface } from '../Environment/PlaySurface';
import { Lighting } from '../Environment/Lighting';
import { GRAVITY } from '../../game/constants';

interface GameCanvasProps {
  rollTrigger: number;
  intensity?: number;
  tiltX?: number;
  tiltY?: number;
}

export function GameCanvas({ rollTrigger, intensity, tiltX, tiltY }: GameCanvasProps) {
  return (
    <Canvas
      shadows
      camera={{
        position: [0, 8, 6],
        fov: 50,
        near: 0.1,
        far: 100,
      }}
      style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}
    >
      <Suspense fallback={null}>
        <Physics gravity={[0, GRAVITY, 0]} timeStep="vary">
          <Lighting tiltX={tiltX} tiltY={tiltY} />
          <PlaySurface />
          <DiceGroup rollTrigger={rollTrigger} intensity={intensity} />
        </Physics>

        {/* Camera controls - limited for game view */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={5}
          maxDistance={15}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.5}
          target={[0, 0, 0]}
        />
      </Suspense>
    </Canvas>
  );
}
