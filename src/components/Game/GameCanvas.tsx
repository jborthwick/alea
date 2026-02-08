import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense } from 'react';
import { DiceGroup } from '../Dice/DiceGroup';
import { OpponentDiceGroup } from '../Dice/OpponentDice';
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
        position: [0, 12, 2],
        fov: 45,
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
          <OpponentDiceGroup />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
