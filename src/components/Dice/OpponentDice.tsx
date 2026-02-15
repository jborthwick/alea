import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { createDiceGeometry, createDiceMaterials } from './DiceGeometry';
import { GlowOverlay } from './GlowOverlay';
import {
  DICE_SIZE,
  OPPONENT_DICE_SIZE,
  OPPONENT_DICE_Y,
  OPPONENT_DICE_Z,
  OPPONENT_DICE_SPACING,
  TABLE_CONFIGS,
  DICE_SET_MATERIALS,
  accentToHex,
} from '../../game/constants';
import type { DiceSetId } from '../../game/constants';
import type { DiceMaterialPreset } from './DiceGeometry';
import { usePhysicsDebug } from '../../hooks/usePhysicsDebug';
import { useGlassDebug } from '../../hooks/useGlassDebug';

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
  const targetQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const die = useGameStore(state => state.opponentDice[id]);
  const opponentIsRolling = useGameStore(state => state.opponentIsRolling);
  const selectedTable = useGameStore(state => state.selectedTable);
  const { diceMaterial, diceSet: debugDiceSet } = usePhysicsDebug();
  const glassDebug = useGlassDebug();
  const scale = OPPONENT_DICE_SIZE / DICE_SIZE;
  const xPos = (id - 2) * OPPONENT_DICE_SPACING;

  // Table config for glow color and dice set
  const tableId = selectedTable ?? 'owl';
  const tableConfig = TABLE_CONFIGS[tableId];
  const glowColor = accentToHex(tableConfig.accent);
  const diceSet = (debugDiceSet || tableConfig.diceSet) as DiceSetId;
  const effectiveMaterial = (diceMaterial || DICE_SET_MATERIALS[diceSet]) as DiceMaterialPreset;

  const geometry = useMemo(() => createDiceGeometry(), []);
  // Create materials (rebuild when dice set, material, or glass debug values change)
  const materials = useMemo(() => createDiceMaterials(effectiveMaterial, diceSet, glassDebug), [effectiveMaterial, diceSet, glassDebug]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (opponentIsRolling && !die.isHeld) {
      // Spin rapidly on multiple axes
      meshRef.current.rotation.x += delta * 12;
      meshRef.current.rotation.y += delta * 9;
      meshRef.current.rotation.z += delta * 6;
    } else {
      // Smoothly interpolate to the correct face value with upright orientation
      const baseTargetQ = VALUE_QUATERNIONS[die.value];
      if (baseTargetQ) {
        // Calculate the target quaternion with orientation correction
        const upVector = new THREE.Vector3(0, 1, 0);
        const tempQ = baseTargetQ.clone();

        // Find the texture up direction
        const textureUpVector = new THREE.Vector3(0, 1, 0).applyQuaternion(tempQ);
        textureUpVector.y = 0;

        if (textureUpVector.length() > 0.01) {
          textureUpVector.normalize();
          const angle = Math.atan2(textureUpVector.x, textureUpVector.z);
          const snappedAngle = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
          const correctionQ = new THREE.Quaternion().setFromAxisAngle(upVector, -snappedAngle);
          tempQ.premultiply(correctionQ);
        }

        // Store the final target quaternion
        targetQuatRef.current.copy(tempQ);

        // Smoothly interpolate (slerp) from current to target
        // Higher alpha = faster settling (0.15 gives a nice smooth deceleration)
        meshRef.current.quaternion.slerp(targetQuatRef.current, Math.min(delta * 8, 0.15));
      }
    }
  });

  return (
    <>
      <mesh
        ref={meshRef}
        position={[xPos, OPPONENT_DICE_Y, OPPONENT_DICE_Z]}
        scale={[scale, scale, scale]}
        geometry={geometry}
        material={materials}
        castShadow
        receiveShadow
      />
      <GlowOverlay
        position={[xPos, OPPONENT_DICE_Y, OPPONENT_DICE_Z]}
        meshRef={meshRef}
        color={glowColor}
        visible={die.isHeld}
        scaleFactor={OPPONENT_DICE_SIZE / DICE_SIZE}
      />
    </>
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
