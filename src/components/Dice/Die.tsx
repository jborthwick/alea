import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { getFaceValue } from '../../physics/faceDetection';
import { calculateRollImpulse } from '../../physics/impulseCalculator';
import { createDiceMaterials, createDiceGeometry } from './DiceGeometry';
import { DICE_SIZE, ANGULAR_DAMPING, LINEAR_DAMPING } from '../../game/constants';

interface DieProps {
  id: number;
  onSettle: (id: number, value: string) => void;
  rollTrigger: number;
  intensity?: number;
  canHold: boolean;
  onHold: (id: number) => void;
}

export function Die({ id, onSettle, rollTrigger, intensity = 0.7, canHold, onHold }: DieProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [isSettled, setIsSettled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const lastRollTrigger = useRef(rollTrigger);
  // Store the rotation when die settles so held dice keep their orientation
  const settledRotation = useRef<THREE.Quaternion>(new THREE.Quaternion());

  const dice = useGameStore((state) => state.dice);
  const die = dice.find((d) => d.id === id);
  const isHeld = die?.isHeld ?? false;

  // Handle click on die
  const handleClick = () => {
    if (canHold) {
      onHold(id);
    }
  };

  // Create geometry once
  const geometry = useMemo(() => createDiceGeometry(), []);

  // Create materials (update when held state changes)
  const materials = useMemo(() => createDiceMaterials(isHeld), [isHeld]);

  // Generate a random initial rotation (stable per die)
  const initialRotation = useMemo((): [number, number, number] => [
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
  ], []);

  // Handle roll trigger
  useEffect(() => {
    if (rollTrigger !== lastRollTrigger.current && !isHeld) {
      lastRollTrigger.current = rollTrigger;
      setIsSettled(false);

      const rb = rigidBodyRef.current;
      if (rb) {
        // Calculate impulse for this roll
        const impulse = calculateRollImpulse(intensity, id);

        // Reset position and wake up the body
        rb.setTranslation(
          { x: impulse.startPosition.x, y: impulse.startPosition.y, z: impulse.startPosition.z },
          true
        );
        rb.setRotation(
          { x: Math.random() * Math.PI, y: Math.random() * Math.PI, z: Math.random() * Math.PI, w: 1 },
          true
        );

        // Apply impulses
        rb.setLinvel(
          { x: impulse.linearImpulse.x, y: impulse.linearImpulse.y, z: impulse.linearImpulse.z },
          true
        );
        rb.setAngvel(
          { x: impulse.angularImpulse.x, y: impulse.angularImpulse.y, z: impulse.angularImpulse.z },
          true
        );

        rb.wakeUp();
      }
    }
  }, [rollTrigger, isHeld, id, intensity]);

  // Check for settling and apply corrective torque
  useFrame(() => {
    const rb = rigidBodyRef.current;
    if (!rb || isSettled || isHeld) return;

    const linvel = rb.linvel();
    const angvel = rb.angvel();

    const linearSpeed = Math.sqrt(
      linvel.x * linvel.x + linvel.y * linvel.y + linvel.z * linvel.z
    );
    const angularSpeed = Math.sqrt(
      angvel.x * angvel.x + angvel.y * angvel.y + angvel.z * angvel.z
    );

    // When die is slow but not settled, apply corrective torque to snap to nearest face
    if (linearSpeed < 2 && angularSpeed < 3) {
      const rotation = rb.rotation();
      const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);

      // Find the up vector in local space
      const upWorld = new THREE.Vector3(0, 1, 0);
      const upLocal = upWorld.clone().applyQuaternion(quaternion.clone().invert());

      // Find which face axis is closest to pointing up
      const axes = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1),
      ];

      let bestAxis = axes[0];
      let bestDot = -Infinity;
      for (const axis of axes) {
        const dot = axis.dot(upLocal);
        if (dot > bestDot) {
          bestDot = dot;
          bestAxis = axis;
        }
      }

      // If not already aligned (dot < 0.99), apply corrective torque
      if (bestDot < 0.99) {
        // Calculate the torque needed to align bestAxis with up
        const cross = new THREE.Vector3().crossVectors(bestAxis, upLocal);
        const torqueStrength = (1 - bestDot) * 2; // Stronger when more misaligned

        // Transform torque to world space and apply
        const torqueWorld = cross.applyQuaternion(quaternion).multiplyScalar(torqueStrength);
        rb.applyTorqueImpulse({ x: torqueWorld.x, y: torqueWorld.y, z: torqueWorld.z }, true);
      }
    }

    // Check if die has settled (very low velocity)
    if (linearSpeed < 0.1 && angularSpeed < 0.1) {
      const rotation = rb.rotation();
      const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
      const faceValue = getFaceValue(quaternion);

      // Save the rotation so held dice maintain their orientation
      settledRotation.current.copy(quaternion);

      setIsSettled(true);
      onSettle(id, faceValue);
    }
  });

  // For held dice, use a static position
  const heldPosition: [number, number, number] = [(id - 2) * 1.2, 0.5, -2.5];
  const initialPosition: [number, number, number] = [(id - 2) * 1.2, 2.5, 0];

  // Common mesh props for interactivity
  const interactiveProps = canHold
    ? {
        onClick: handleClick,
        onPointerOver: () => setIsHovered(true),
        onPointerOut: () => setIsHovered(false),
        style: { cursor: 'pointer' },
      }
    : {};

  // Scale up slightly when hovered and can hold
  const hoverScale = canHold && isHovered ? 1.08 : 1;

  if (isHeld) {
    // Render held die without physics (static), preserving its rotation
    return (
      <mesh
        ref={meshRef}
        position={heldPosition}
        quaternion={settledRotation.current}
        scale={hoverScale}
        geometry={geometry}
        material={materials}
        castShadow
        receiveShadow
        {...interactiveProps}
      />
    );
  }

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={initialPosition}
      rotation={initialRotation}
      colliders={false}
      restitution={0.3}
      friction={0.5}
      angularDamping={ANGULAR_DAMPING}
      linearDamping={LINEAR_DAMPING}
      mass={1}
    >
      <CuboidCollider args={[DICE_SIZE / 2, DICE_SIZE / 2, DICE_SIZE / 2]} />
      <mesh
        ref={meshRef}
        scale={hoverScale}
        geometry={geometry}
        material={materials}
        castShadow
        receiveShadow
        {...interactiveProps}
      />
    </RigidBody>
  );
}
