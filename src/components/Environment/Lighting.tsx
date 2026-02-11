import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LightingProps {
  tiltX?: number;
  tiltY?: number;
}

export function Lighting({ tiltX = 0, tiltY = 0 }: LightingProps) {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);

  // Animate light position based on device tilt (for mobile)
  useFrame(() => {
    if (directionalLightRef.current && (tiltX !== 0 || tiltY !== 0)) {
      // Subtle light movement based on tilt
      const baseX = 6;
      const baseY = 6;
      const baseZ = -4;
      directionalLightRef.current.position.x = baseX + tiltX * 2;
      directionalLightRef.current.position.y = baseY;
      directionalLightRef.current.position.z = baseZ + tiltY * 2;
    }
  });

  return (
    <>
      {/* Warm ambient light - kept low for vignette contrast */}
      <ambientLight intensity={0.2} color="#FFF5E6" />

      {/* Main directional light with shadows - from top right at lower angle for longer shadows */}
      <directionalLight
        ref={directionalLightRef}
        position={[6, 6, -4]}
        intensity={0.8}
        color="#FFFAF0"
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

      {/* Fill light from the opposite side */}
      <directionalLight
        position={[-3, 8, -3]}
        intensity={0.3}
        color="#FFE4C4"
      />

      {/* Subtle rim light for depth */}
      <pointLight
        position={[0, 5, -5]}
        intensity={0.2}
        color="#FFF8DC"
        distance={15}
      />

      {/* Main overhead spotlight - tight cone with soft falloff for vignette effect */}
      <spotLight
        position={[0, 12, 0]}
        angle={Math.PI / 6}
        penumbra={1.0}
        intensity={2.0}
        color="#FFFACD"
        castShadow={false}
        decay={1.5}
        target-position={[0, 0, 0]}
      />
    </>
  );
}
