import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { TABLE_CONFIGS } from '../../game/constants';
import type { LightingDebugValues } from '../../hooks/useLightingDebug';

interface LightingProps {
  tiltX?: number;
  tiltY?: number;
  debug: LightingDebugValues;
}

export function Lighting({ tiltX = 0, tiltY = 0, debug }: LightingProps) {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const selectedTable = useGameStore((state) => state.selectedTable);

  // Get table-specific lighting colors (default to owl's neutral palette)
  const tableId = selectedTable ?? 'owl';
  const tableConfig = TABLE_CONFIGS[tableId];

  // Animate light position based on device tilt (for mobile)
  useFrame(() => {
    if (directionalLightRef.current && (tiltX !== 0 || tiltY !== 0)) {
      // Subtle light movement based on tilt
      directionalLightRef.current.position.x = debug.mainPosX + tiltX * 2;
      directionalLightRef.current.position.y = debug.mainPosY;
      directionalLightRef.current.position.z = debug.mainPosZ + tiltY * 2;
    }
  });

  return (
    <>
      {/* Ambient light - color from table theme */}
      <ambientLight intensity={debug.ambientIntensity} color={tableConfig.ambientColor} />

      {/* Main directional light with shadows */}
      <directionalLight
        ref={directionalLightRef}
        position={[debug.mainPosX, debug.mainPosY, debug.mainPosZ]}
        intensity={debug.mainIntensity}
        color={debug.mainColor}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />

      {/* Fill light - color from table theme */}
      <directionalLight
        position={[debug.fillPosX, debug.fillPosY, debug.fillPosZ]}
        intensity={debug.fillIntensity}
        color={tableConfig.fillColor}
      />

      {/* Overhead spotlight - color from table theme */}
      <spotLight
        position={[0, debug.spotHeight, 0]}
        angle={debug.spotAngle}
        penumbra={debug.spotPenumbra}
        intensity={debug.spotIntensity}
        color={tableConfig.spotColor}
        castShadow={false}
        decay={debug.spotDecay}
        target-position={[0, 0, 0]}
      />

    </>
  );
}
