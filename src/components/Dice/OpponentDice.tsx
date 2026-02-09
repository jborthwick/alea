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

// Map a CardValue to the quaternion that shows that face on top with proper orientation.
// Based on faceDetection.ts: +Y=9, -Y=A, +X=10, -X=K, +Z=J, -Z=Q
// For face cards (A, K, Q, J), we ensure the corner letters are oriented upright
// by avoiding Y-axis rotation (letters would appear sideways otherwise)
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
      // Snap to show the correct face value
      const targetQ = VALUE_QUATERNIONS[die.value];
      if (targetQ) {
        meshRef.current.quaternion.copy(targetQ);
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
