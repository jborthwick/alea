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

// Ace face up: -Y axis points up, so rotate PI on X
const ACE_UP_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0));

export function Die({ id, onSettle, rollTrigger, intensity = 0.7, canHold, onHold }: DieProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [isSettled, setIsSettled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const lastRollTrigger = useRef(rollTrigger);
  // Store the rotation when die settles so held dice keep their orientation
  const settledRotation = useRef<THREE.Quaternion>(new THREE.Quaternion());
  // Store the position when die settles
  const settledPosition = useRef<THREE.Vector3>(new THREE.Vector3());

  // Track whether dice are actively rolling (cleared by roll trigger, set false by settle)
  const isPhysicsActive = useRef(false);

  // Animation state for hold/unhold transitions
  const isTransitioning = useRef(false);
  const transitionProgress = useRef(0);
  const transitionStartPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const transitionStartRot = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const wasHeld = useRef(false);
  const lastRollsRemaining = useRef(3);

  const dice = useGameStore((state) => state.dice);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const rollsRemaining = useGameStore((state) => state.rollsRemaining);
  const die = dice.find((d) => d.id === id);
  const isHeld = die?.isHeld ?? false;

  // After third roll, all dice should move to hold tray
  const shouldBeInHoldTray = (gamePhase === 'rolling' || gamePhase === 'scoring') && rollsRemaining === 0;

  // Detect hold state changes and start transition
  useEffect(() => {
    // Don't transition during betting phase - let parking logic handle it
    if (gamePhase === 'betting') {
      wasHeld.current = isHeld;
      isTransitioning.current = false;
      lastRollsRemaining.current = rollsRemaining;
      return;
    }

    // Detect if we just reached 0 rolls remaining (just finished third roll)
    const justFinishedLastRoll = lastRollsRemaining.current === 1 && rollsRemaining === 0;

    const shouldTransition = ((isHeld !== wasHeld.current) || (justFinishedLastRoll && !isHeld)) && isSettled;

    if (shouldTransition) {
      const rb = rigidBodyRef.current;
      if (!rb) return;

      // Start transition
      isTransitioning.current = true;
      transitionProgress.current = 0;

      // Store current position and rotation as start of transition
      const pos = rb.translation();
      transitionStartPos.current.set(pos.x, pos.y, pos.z);
      const rot = rb.rotation();
      transitionStartRot.current.set(rot.x, rot.y, rot.z, rot.w);

      wasHeld.current = isHeld || shouldBeInHoldTray;
    }

    lastRollsRemaining.current = rollsRemaining;
  }, [isHeld, isSettled, gamePhase, shouldBeInHoldTray, rollsRemaining]);

  // Handle click on die
  const handleClick = () => {
    if (canHold) {
      onHold(id);
    }
  };

  // Create geometry once
  const geometry = useMemo(() => createDiceGeometry(), []);

  // Create materials based on held state - memoize to prevent constant recreation
  const materials = useMemo(() => createDiceMaterials(isHeld), [isHeld]);

  // Generate a random initial rotation (stable per die)
  const initialRotation = useMemo((): [number, number, number] => [
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
  ], []);

  // Pre-roll resting position near bottom of play area
  const preRollPosition = useMemo((): { x: number; y: number; z: number } => ({
    x: (id - 2) * 0.9,
    y: DICE_SIZE / 2,
    z: 1.5,
  }), [id]);

  // For held dice, use a static position (positive Z = toward camera/bottom of screen)
  const heldPosition = useMemo((): { x: number; y: number; z: number } => ({
    x: (id - 2) * 0.9,
    y: 0.5,
    z: 2.2,
  }), [id]);

  // Handle roll trigger
  useEffect(() => {
    if (rollTrigger !== lastRollTrigger.current && !isHeld) {
      lastRollTrigger.current = rollTrigger;
      setIsSettled(false);
      isPhysicsActive.current = true;

      const rb = rigidBodyRef.current;
      if (rb) {
        // Wake up the body first
        rb.wakeUp();

        // Calculate impulse for this roll
        const impulse = calculateRollImpulse(intensity, id);

        // Reset position
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

  // Main frame loop: handles parking, transitions, and physics settling
  useFrame((_, delta) => {
    const rb = rigidBodyRef.current;
    if (!rb) return;

    // Handle hold/unhold transitions
    if (isTransitioning.current) {
      transitionProgress.current += delta * 3; // 3 = speed (higher = faster)

      if (transitionProgress.current >= 1) {
        // Transition complete
        transitionProgress.current = 1;
        isTransitioning.current = false;
      }

      // Ease-in-out function for smooth animation
      const easeInOutCubic = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };
      const t = easeInOutCubic(transitionProgress.current);

      // Interpolate position
      const targetPos = (isHeld || shouldBeInHoldTray) ? heldPosition : settledPosition.current;
      const currentPos = new THREE.Vector3().lerpVectors(
        transitionStartPos.current,
        new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z),
        t
      );

      // Interpolate rotation (slerp for quaternions)
      const targetRot = settledRotation.current;
      const currentRot = new THREE.Quaternion().slerpQuaternions(
        transitionStartRot.current,
        targetRot,
        t
      );

      rb.setTranslation({ x: currentPos.x, y: currentPos.y, z: currentPos.z }, true);
      rb.setRotation({ x: currentRot.x, y: currentRot.y, z: currentRot.z, w: currentRot.w }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    // Determine if we should park this frame (computed inline, no effect delay)
    const shouldPark = gamePhase === 'betting' || ((isHeld || shouldBeInHoldTray) && !isPhysicsActive.current);

    if (shouldPark) {
      const pos = gamePhase === 'betting' ? preRollPosition : heldPosition;
      const quat = gamePhase === 'betting' ? ACE_UP_QUAT : settledRotation.current;
      rb.setTranslation(pos, true);
      rb.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      isPhysicsActive.current = false;
      return;
    }

    // Skip physics checks if already settled
    if (isSettled || isHeld) return;

    const linvel = rb.linvel();
    const angvel = rb.angvel();
    const pos = rb.translation();

    const linearSpeed = Math.sqrt(
      linvel.x * linvel.x + linvel.y * linvel.y + linvel.z * linvel.z
    );
    const angularSpeed = Math.sqrt(
      angvel.x * angvel.x + angvel.y * angvel.y + angvel.z * angvel.z
    );

    // Detect if die is stacked on another (too high off the table)
    const maxValidHeight = DICE_SIZE * 1.2;
    if (pos.y > maxValidHeight && linearSpeed < 1) {
      const nudgeX = (Math.random() - 0.5) * 3;
      const nudgeZ = (Math.random() - 0.5) * 3;
      rb.applyImpulse({ x: nudgeX, y: 0, z: nudgeZ }, true);
      return;
    }

    // When die is slow but not settled, apply corrective torque to snap to nearest face
    if (linearSpeed < 2 && angularSpeed < 3) {
      const rotation = rb.rotation();
      const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);

      const upWorld = new THREE.Vector3(0, 1, 0);
      const upLocal = upWorld.clone().applyQuaternion(quaternion.clone().invert());

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

      if (bestDot < 0.99) {
        const cross = new THREE.Vector3().crossVectors(bestAxis, upLocal);
        const torqueStrength = (1 - bestDot) * 2;
        const torqueWorld = cross.applyQuaternion(quaternion).multiplyScalar(torqueStrength);
        rb.applyTorqueImpulse({ x: torqueWorld.x, y: torqueWorld.y, z: torqueWorld.z }, true);
      }
    }

    // Check if die has settled
    if (linearSpeed < 0.1 && angularSpeed < 0.1 && pos.y <= maxValidHeight) {
      const rotation = rb.rotation();
      const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
      const faceValue = getFaceValue(quaternion);

      settledRotation.current.copy(quaternion);
      settledPosition.current.set(pos.x, pos.y, pos.z);
      isPhysicsActive.current = false;
      setIsSettled(true);
      onSettle(id, faceValue);
    }
  });

  const initialPosition: [number, number, number] = [(id - 2) * 0.9, 2.5, 0];

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

  // Always render the RigidBody — never unmount it
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
