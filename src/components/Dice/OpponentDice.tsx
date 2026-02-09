import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { createDiceGeometry, createDiceMaterials } from './DiceGeometry';
import {
  DICE_SIZE,
  OPPONENT_DICE_SIZE,
  OPPONENT_DICE_Y,
  OPPONENT_DICE_Z,
  OPPONENT_DICE_SPACING,
} from '../../game/constants';

// Map a CardValue to the quaternion that shows that face on top.
// Based on faceDetection.ts: +Y=9, -Y=A, +X=10, -X=K, +Z=J, -Z=Q
// The correction logic in useFrame ensures corner letters are oriented upright
const VALUE_QUATERNIONS: Record<string, THREE.Quaternion> = {
  '9':  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)), // +Y face
  'A':  new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)), // -Y face (flipped)
  '10': new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2)), // +X face
  'K':  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), // -X face
  'J':  new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), // +Z face
  'Q':  new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), // -Z face
};

function OpponentDie({ id }: { id: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const die = useGameStore(state => state.opponentDice[id]);
  const opponentIsRolling = useGameStore(state => state.opponentIsRolling);

  const scale = OPPONENT_DICE_SIZE / DICE_SIZE;
  const xPos = (id - 2) * OPPONENT_DICE_SPACING;

  const geometry = useMemo(() => createDiceGeometry(), []);
  const materials = useMemo(() => createDiceMaterials(die.isHeld), [die.isHeld]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (opponentIsRolling && !die.isHeld) {
      // Spin rapidly on multiple axes
      meshRef.current.rotation.x += delta * 12;
      meshRef.current.rotation.y += delta * 9;
      meshRef.current.rotation.z += delta * 6;
    } else {
      // Snap to show the correct face value with upright orientation
      const targetQ = VALUE_QUATERNIONS[die.value];
      if (targetQ) {
        // First, set the base rotation to show the correct face
        meshRef.current.quaternion.copy(targetQ);

        // Then, find the rotation around the Y axis (viewing axis) to make letters upright
        // We want to minimize the rotation of the texture around the viewing direction
        const upVector = new THREE.Vector3(0, 1, 0);

        // Use the texture's up direction (the direction of the letters on the die face)
        // For most faces, this is aligned with the die's local +Y in the texture space
        const textureUpVector = new THREE.Vector3(0, 1, 0).applyQuaternion(meshRef.current.quaternion);

        // Project onto the XZ plane to find how the texture is rotated around viewing axis
        textureUpVector.y = 0;

        if (textureUpVector.length() > 0.01) {
          textureUpVector.normalize();

          // Calculate the angle from the world Z-axis (toward camera)
          const angle = Math.atan2(textureUpVector.x, textureUpVector.z);

          // Round to nearest 90 degrees to keep it axis-aligned
          const snappedAngle = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);

          // Apply additional Y rotation to correct the orientation
          const correctionQ = new THREE.Quaternion().setFromAxisAngle(upVector, -snappedAngle);
          meshRef.current.quaternion.premultiply(correctionQ);
        }
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[xPos, OPPONENT_DICE_Y, OPPONENT_DICE_Z]}
      scale={[scale, scale, scale]}
      geometry={geometry}
      material={materials}
      castShadow
      receiveShadow
    />
  );
}

export function OpponentDiceGroup() {
  return (
    <group>
      {[0, 1, 2, 3, 4].map(id => (
        <OpponentDie key={id} id={id} />
      ))}
    </group>
  );
}
