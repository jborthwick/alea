import { Canvas, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Environment } from '@react-three/drei';
import { Leva } from 'leva';
import { Suspense, useRef, useCallback, useMemo, useEffect } from 'react';
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
  onTap?: () => void;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
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

// Calculates FOV and camera height based on current viewport aspect ratio.
//
// Strategy: drive FOV from the desired table coverage rather than from a fixed
// horizontal FOV angle, so the table always fills the screen appropriately.
//
// Portrait  (aspect < 1): make TABLE_WIDTH fill ~90% of screen width.
//   visible_half_width  = camY * tan(hFov/2)
//   target              = (TABLE_WIDTH/2) / 0.90
//   → tan(hFov/2)       = target / camY
//   → vFov              = 2 * atan(tan(hFov/2) / aspect)   [Three.js uses vertical FOV]
//
// Landscape (aspect ≥ 1): size the FOV so the table fits in both dimensions.
//   - Height constraint: TABLE_DEPTH fills ~85% of screen height
//   - Width constraint:  TABLE_WIDTH fills ~85% of screen width
//   Take the larger (more zoomed-out) FOV so both axes fit. This fixes the
//   narrow-desktop-window case where a height-only constraint would zoom in
//   too far horizontally.
//
// A smooth cross-fade between portrait and landscape is applied only for
// actual portrait viewports (aspect < 1). Landscape windows (aspect ≥ 1)
// always use the landscape formula so that resizing a desktop browser
// narrower does not trigger the portrait wide-FOV and crop the top/bottom.
function calcCameraParams() {
  const aspect = window.innerWidth / window.innerHeight;

  // Camera height: keep the existing formula that works well across breakpoints.
  // aspect=0.46 (mobile portrait) → camY≈9.85, aspect=1 → camY=12, aspect≥1 → camY=12
  const camY = 8 + Math.min(1, aspect) * 4;

  const TABLE_HALF = 5.2 / 2; // 2.6 world units

  // Portrait FOV: size so TABLE_WIDTH fills 90% of screen width.
  const portraitTanH  = TABLE_HALF / (camY * 0.90);          // tan(hFov/2)
  const portraitVFov  = 2 * Math.atan(portraitTanH / aspect) * 180 / Math.PI;

  // Landscape FOV: size so TABLE_DEPTH fills ~50% of screen height on desktop.
  // (Table is square; on wide screens it should feel like a focused play area,
  //  not wall-to-wall. ~50% height leaves comfortable room for UI.)
  // Additionally, ensure TABLE_WIDTH fits within 90% of screen width so a
  // narrow desktop window never clips the sides.
  const landscapeTanV = TABLE_HALF / (camY * 0.50);          // tan(vFov/2) from height
  const landscapeVFov_h = 2 * Math.atan(landscapeTanV) * 180 / Math.PI;
  // Width constraint: convert horizontal coverage to vertical FOV.
  const landscapeTanH_w = TABLE_HALF / (camY * 0.90);        // tan(hFov/2) from width
  const landscapeVFov_w = 2 * Math.atan(landscapeTanH_w / aspect) * 180 / Math.PI;
  // Take the larger FOV so the table fits on both axes.
  const landscapeVFov = Math.max(landscapeVFov_h, landscapeVFov_w);

  // Blend weight: 0 = pure portrait, 1 = pure landscape.
  //
  // We blend based on viewport WIDTH, not aspect ratio. This lets us
  // distinguish a desktop browser resized narrow (still ~700px+ tall, so
  // aspect can dip below 1) from a real mobile phone in portrait (≤430px
  // wide). Real phones in portrait are always ≤430 CSS px wide; desktop
  // windows are typically ≥500px wide even when resized small.
  //
  // Blend zone: 390px (phone) → 480px (small tablet / large phone landscape).
  // Below 390px → pure portrait. Above 480px → pure landscape.
  // This means any desktop window (≥500px wide) stays fully in landscape mode.
  const t = Math.max(0, Math.min(1, (window.innerWidth - 390) / (480 - 390)));
  const fov = portraitVFov * (1 - t) + landscapeVFov * t;

  return { fov, camY };
}

// Reactive camera rig — updates FOV and height whenever the window is resized
function CameraRig() {
  const { camera } = useThree();
  const apply = useCallback(() => {
    const { fov, camY } = calcCameraParams();
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = fov;
    cam.position.set(0, camY, 0);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera]);

  useEffect(() => {
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [apply]);

  return null;
}

// Inner scene component that can use leva hooks inside Canvas
function Scene({ rollTrigger, intensity, throwDirection, tiltX, tiltY, onReady, onThrow, onTap, onHoldStart, onHoldEnd, canRoll = false, isShaking = false }: GameCanvasProps) {
  const { gravity } = usePhysicsDebug();
  const lighting = useLightingDebug();
  const { addObject, removeObject } = useOutlineEffect();

  const outlineCtx = useMemo(() => ({ addObject, removeObject }), [addObject, removeObject]);

  return (
    <OutlineProvider value={outlineCtx}>
      <CameraRig />
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
          onTap={onTap}
          onHoldStart={onHoldStart}
          onHoldEnd={onHoldEnd}
          isShaking={isShaking}
        />
        <OpponentDiceGroup />
        <ReadyNotifier onReady={onReady} />
      </Physics>
    </OutlineProvider>
  );
}

export function GameCanvas({ rollTrigger, intensity, throwDirection, tiltX, tiltY, onReady, onThrow, onTap, onHoldStart, onHoldEnd, canRoll, isShaking }: GameCanvasProps) {
  const showDebugPanel = useGameStore((state) => state.showDebugPanel);

  // Camera FOV and height are managed reactively by CameraRig inside the scene.

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
          fov: 48,
          near: 0.1,
          far: 100,
        }}
        style={{ background: 'rgb(var(--bg))' }}
      >
        <Suspense fallback={null}>
          <Scene rollTrigger={rollTrigger} intensity={intensity} throwDirection={throwDirection} tiltX={tiltX} tiltY={tiltY} onReady={handleReady} onThrow={onThrow} onTap={onTap} onHoldStart={onHoldStart} onHoldEnd={onHoldEnd} canRoll={canRoll} isShaking={isShaking} />
        </Suspense>
      </Canvas>
    </>
  );
}
