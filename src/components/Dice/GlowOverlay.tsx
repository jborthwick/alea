import { useRef, useMemo, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createDiceGeometry } from './DiceGeometry';
import { GLOW_OVERLAY_OPACITY } from '../../game/constants';

interface GlowOverlayProps {
  /** Static position (for opponent dice) */
  position?: [number, number, number];
  /** Dynamic position ref updated each frame (for player dice inside RigidBody) */
  positionRef?: MutableRefObject<[number, number, number]>;
  /** Dynamic rotation ref updated each frame (for player dice inside RigidBody) */
  rotationRef?: MutableRefObject<[number, number, number, number]>;
  color: string;           // hex color
  visible: boolean;        // controlled by isHeld
  scaleFactor?: number;    // extra scale for opponent dice
  /** Ref to opponent mesh to copy rotation from */
  meshRef?: MutableRefObject<THREE.Mesh | null>;
}

export function GlowOverlay({
  position, positionRef, rotationRef,
  color, visible, scaleFactor = 1, meshRef: sourceMeshRef,
}: GlowOverlayProps) {
  const outlineMeshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => createDiceGeometry(), []);

  // Outline is slightly larger than the die
  const outlineScale = 1.08 * scaleFactor;

  // Keep position/rotation in sync every frame
  useFrame(() => {
    if (!outlineMeshRef.current) return;

    if (positionRef) {
      const [x, y, z] = positionRef.current;
      outlineMeshRef.current.position.set(x, y, z);
    }
    if (rotationRef) {
      const [qx, qy, qz, qw] = rotationRef.current;
      outlineMeshRef.current.quaternion.set(qx, qy, qz, qw);
    }
    if (sourceMeshRef?.current) {
      outlineMeshRef.current.quaternion.copy(sourceMeshRef.current.quaternion);
    }
  });

  if (!visible) return null;

  return (
    <mesh
      ref={outlineMeshRef}
      geometry={geometry}
      position={position}
      scale={[outlineScale, outlineScale, outlineScale]}
      renderOrder={999}
    >
      <meshBasicMaterial
        color={color}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        opacity={GLOW_OVERLAY_OPACITY}
      />
    </mesh>
  );
}
