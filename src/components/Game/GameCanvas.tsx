import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Environment } from '@react-three/drei';
import { Leva } from 'leva';
import { Suspense, useRef, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GrabGestureLayer } from '../Dice/GrabGestureLayer';
import { OpponentDiceGroup } from '../Dice/OpponentDice';
import { PlaySurface } from '../Environment/PlaySurface';
import { Lighting } from '../Environment/Lighting';
import { useGameStore } from '../../store/gameStore';
import { usePhysicsDebug } from '../../hooks/usePhysicsDebug';
import { useLightingDebug } from '../../hooks/useLightingDebug';
import { useOutlineEffect } from '../../hooks/useOutlineEffect';
import { OutlineProvider } from '../../contexts/OutlineContext';

interface GameCanvasProps {
  rollTrigger: number;
  intensity?: number;
  throwDirection?: THREE.Vector2 | null;
  tiltX?: number;
  tiltY?: number;
  onReady?: () => void;
  onThrow?: (intensity: number, direction: THREE.Vector2) => void;
  canRoll?: boolean;
  isShaking?: boolean;
}

// Fires onReady after the first frame renders (scene fully composed)
function ReadyNotifier({ onReady }: { onReady?: () => void }) {
  const firedRef = useRef(false);
  useFrame(() => {
    if (!firedRef.current && onReady) {
      firedRef.current = true;
      onReady();
    }
  });
  return null;
}

// Inner scene component that can use leva hooks inside Canvas
function Scene({ rollTrigger, intensity, throwDirection, tiltX, tiltY, onReady, onThrow, canRoll = false, isShaking = false }: GameCanvasProps) {
  const { gravity } = usePhysicsDebug();
  const lighting = useLightingDebug();
  const { addObject, removeObject } = useOutlineEffect();

  const outlineCtx = useMemo(() => ({ addObject, removeObject }), [addObject, removeObject]);

  return (
    <OutlineProvider value={outlineCtx}>
      <Environment preset={lighting.envPreset as 'night'} environmentIntensity={lighting.envIntensity} />
      <Physics gravity={[0, gravity, 0]} timeStep="vary">
        <Lighting tiltX={tiltX} tiltY={tiltY} debug={lighting} />
        <PlaySurface tableEmissive={lighting.tableEmissive} />
        <GrabGestureLayer
          rollTrigger={rollTrigger}
          intensity={intensity}
          throwDirection={throwDirection}
          canRoll={canRoll}
          onThrow={onThrow ?? (() => {})}
          isShaking={isShaking}
        />
        <OpponentDiceGroup />
        <ReadyNotifier onReady={onReady} />
      </Physics>
    </OutlineProvider>
  );
}

export function GameCanvas({ rollTrigger, intensity, throwDirection, tiltX, tiltY, onReady, onThrow, canRoll, isShaking }: GameCanvasProps) {
  const showDebugPanel = useGameStore((state) => state.showDebugPanel);

  // Use wider FOV on mobile to prevent dice cutoff
  const isMobile = window.innerWidth <= 768;
  const fov = isMobile ? 58 : 45;

  // Stable ref callback to avoid re-renders
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const handleReady = useCallback(() => onReadyRef.current?.(), []);

  return (
    <>
      <Leva hidden={!showDebugPanel} collapsed titleBar={{ title: 'Debug Panel' }} theme={{ sizes: { rootWidth: '380px', controlWidth: '200px' } }} />
      <Canvas
        shadows={{ type: THREE.VSMShadowMap }}
        gl={{ alpha: true, powerPreference: 'high-performance' }}
        camera={{
          position: [0, 12, 0],
          fov,
          near: 0.1,
          far: 100,
        }}
        style={{ background: 'rgb(var(--bg))' }}
      >
        <Suspense fallback={null}>
          <Scene rollTrigger={rollTrigger} intensity={intensity} throwDirection={throwDirection} tiltX={tiltX} tiltY={tiltY} onReady={handleReady} onThrow={onThrow} canRoll={canRoll} isShaking={isShaking} />
        </Suspense>
      </Canvas>
    </>
  );
}
