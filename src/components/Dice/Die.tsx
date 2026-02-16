import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { getFaceValue } from '../../physics/faceDetection';
import { calculateRollImpulse, calculateThrowImpulse } from '../../physics/impulseCalculator';
import { createDiceMaterials, createDiceGeometry, releaseDiceMaterials, applyGlassOverrides } from './DiceGeometry';
import { GlowOverlay } from './GlowOverlay';
import { DICE_SIZE, TABLE_WIDTH, TABLE_DEPTH, TABLE_CONFIGS, DICE_SET_MATERIALS } from '../../game/constants';
import type { DiceSetId } from '../../game/constants';
import type { DiceMaterialPreset } from './DiceGeometry';
import { usePhysicsDebug } from '../../hooks/usePhysicsDebug';
import { useGlassDebug } from '../../hooks/useGlassDebug';

interface DieProps {
  id: number;
  onSettle: (id: number, value: string) => void;
  rollTrigger: number;
  intensity?: number;
  throwDirection?: THREE.Vector2 | null;
  canHold: boolean;
  onHold: (id: number) => void;
  isGrabbing?: boolean;
  grabTargetRef?: React.RefObject<THREE.Vector3 | null>;
}

// Ace face up: -Y axis points up, so rotate PI on X
const ACE_UP_EULER: [number, number, number] = [Math.PI, 0, 0];
const ACE_UP_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(...ACE_UP_EULER));

// Reusable objects for useFrame hot path (avoid per-frame GC pressure)
const _quat = new THREE.Quaternion();
const _quatInv = new THREE.Quaternion();
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _upWorld = new THREE.Vector3(0, 1, 0);
const _faceAxes = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];

export function Die({ id, onSettle, rollTrigger, intensity = 0.7, throwDirection, canHold, onHold, isGrabbing = false, grabTargetRef }: DieProps) {
  const { mass, restitution, friction, angularDamping, linearDamping, diceSize, diceMaterial, diceSet: debugDiceSet } = usePhysicsDebug();
  const glassDebug = useGlassDebug();
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
  const selectedTable = useGameStore((state) => state.selectedTable);
  const die = dice.find((d) => d.id === id);
  const isHeld = die?.isHeld ?? false;

  // Table config for glow color and dice set
  const tableId = selectedTable ?? 'owl';
  const tableConfig = TABLE_CONFIGS[tableId];
  const diceSet = (debugDiceSet || tableConfig.diceSet) as DiceSetId;
  const effectiveMaterial = (diceMaterial || DICE_SET_MATERIALS[diceSet]) as DiceMaterialPreset;

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

  // Get shared materials from cache (all dice with same preset+set reuse these)
  const materials = useMemo(() => createDiceMaterials(effectiveMaterial, diceSet),
    [effectiveMaterial, diceSet]);

  // Release ref-counted materials on unmount or when preset/set changes
  useEffect(() => {
    return () => releaseDiceMaterials(effectiveMaterial, diceSet);
  }, [effectiveMaterial, diceSet]);

  // Apply glass debug overrides in-place (no texture recreation, just property updates)
  useEffect(() => {
    if (effectiveMaterial === 'glass' && glassDebug) {
      applyGlassOverrides(materials, glassDebug);
    }
  }, [glassDebug, effectiveMaterial, materials]);

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
    z: 1.8,
  }), [id]);

  // Handle roll trigger
  useEffect(() => {
    if (rollTrigger !== lastRollTrigger.current && !isHeld) {
      lastRollTrigger.current = rollTrigger;
      queueMicrotask(() => setIsSettled(false));
      isPhysicsActive.current = true;

      const rb = rigidBodyRef.current;
      if (rb) {
        // Wake up the body first
        rb.wakeUp();

        // Calculate impulse — use directional throw if flick direction provided
        const currentPos = rb.translation();
        const impulse = throwDirection
          ? calculateThrowImpulse(
              intensity,
              throwDirection,
              id,
              new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z),
            )
          : calculateRollImpulse(intensity, id);

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
  }, [rollTrigger, isHeld, id, intensity, throwDirection]);

  // Sync debug slider values to Rapier (only when values change, not every frame)
  useEffect(() => {
    const rb = rigidBodyRef.current;
    if (!rb) return;
    rb.setLinearDamping(linearDamping);
    rb.setAngularDamping(angularDamping);
    const collider = rb.collider(0);
    if (collider) {
      collider.setRestitution(restitution);
      collider.setFriction(friction);
      collider.setMass(mass);
    }
  }, [linearDamping, angularDamping, restitution, friction, mass]);

  // Main frame loop: handles parking, transitions, and physics settling
  useFrame((_, delta) => {
    const rb = rigidBodyRef.current;
    if (!rb) return;

    // Update mesh scale for dice size + hover changes
    if (meshRef.current) {
      const scale = (diceSize / DICE_SIZE) * (canHold && isHovered ? 1.08 : 1);
      meshRef.current.scale.setScalar(scale);
    }

    // Grab-and-throw: float dice upward and loosely track pointer
    const grabTarget = grabTargetRef?.current;
    if (isGrabbing && !isHeld && grabTarget) {
      // Target: spread dice around the grab point by die index
      const offsetX = (id - 2) * 0.7;
      const targetX = grabTarget.x + offsetX;
      const targetY = 2.0; // hover height
      const targetZ = grabTarget.z;

      const pos = rb.translation();
      const lerpFactor = 0.08; // low = loose/floaty

      rb.setTranslation({
        x: pos.x + (targetX - pos.x) * lerpFactor,
        y: pos.y + (targetY - pos.y) * lerpFactor,
        z: pos.z + (targetZ - pos.z) * lerpFactor,
      }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);

      // Gentle wobble for visual polish
      const time = performance.now() / 1000;
      rb.setAngvel({
        x: Math.sin(time * 1.5 + id) * 0.5,
        y: Math.cos(time * 1.05 + id) * 0.3,
        z: Math.sin(time * 1.95 + id * 2) * 0.4,
      }, true);

      // Cancel any in-progress transition
      isTransitioning.current = false;
      return;
    }

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

      // Interpolate position (reuse module-level temp objects)
      const targetPos = (isHeld || shouldBeInHoldTray) ? heldPosition : settledPosition.current;
      _vec3A.set(targetPos.x, targetPos.y, targetPos.z);
      _vec3B.lerpVectors(transitionStartPos.current, _vec3A, t);

      // Interpolate rotation (slerp for quaternions)
      _quat.slerpQuaternions(transitionStartRot.current, settledRotation.current, t);

      rb.setTranslation({ x: _vec3B.x, y: _vec3B.y, z: _vec3B.z }, true);
      rb.setRotation({ x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w }, true);
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

    // Out-of-bounds recovery: teleport die back if it escapes the play area
    const oobMargin = 1;
    const halfW = TABLE_WIDTH / 2 + oobMargin;
    const halfD = TABLE_DEPTH / 2 + oobMargin;
    if (pos.y < -2 || Math.abs(pos.x) > halfW || Math.abs(pos.z) > halfD) {
      rb.setTranslation({ x: (id - 2) * 0.9, y: 3, z: 0 }, true);
      rb.setLinvel({ x: 0, y: -5, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      rb.wakeUp();
      return;
    }

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
      _quat.set(rotation.x, rotation.y, rotation.z, rotation.w);

      // Transform world up into local space to find nearest face
      _quatInv.copy(_quat).invert();
      _vec3A.copy(_upWorld).applyQuaternion(_quatInv);

      let bestAxis = _faceAxes[0];
      let bestDot = -Infinity;
      for (const axis of _faceAxes) {
        const dot = axis.dot(_vec3A);
        if (dot > bestDot) {
          bestDot = dot;
          bestAxis = axis;
        }
      }

      if (bestDot < 0.99) {
        _vec3B.crossVectors(bestAxis, _vec3A);
        const torqueStrength = (1 - bestDot) * 2;
        _vec3B.applyQuaternion(_quat).multiplyScalar(torqueStrength);
        rb.applyTorqueImpulse({ x: _vec3B.x, y: _vec3B.y, z: _vec3B.z }, true);
      }
    }

    // Check if die has settled
    if (linearSpeed < 0.1 && angularSpeed < 0.1 && pos.y <= maxValidHeight) {
      const rotation = rb.rotation();
      _quat.set(rotation.x, rotation.y, rotation.z, rotation.w);
      const faceValue = getFaceValue(_quat);

      settledRotation.current.copy(_quat);
      settledPosition.current.set(pos.x, pos.y, pos.z);
      isPhysicsActive.current = false;
      setIsSettled(true);
      onSettle(id, faceValue);
    }
  });

  // Start at the pre-roll parking position (not mid-air) to avoid visual pop on load
  const initialPosition: [number, number, number] = [preRollPosition.x, preRollPosition.y, preRollPosition.z];

  // Common mesh props for interactivity
  // onPointerDown stopPropagation prevents the grab gesture from starting when tapping a die
  const interactiveProps = canHold
    ? {
        onClick: handleClick,
        onPointerDown: (e: { stopPropagation: () => void }) => e.stopPropagation(),
        onPointerOver: () => setIsHovered(true),
        onPointerOut: () => setIsHovered(false),
        style: { cursor: 'pointer' },
      }
    : {};

  // Scale up slightly when hovered and can hold
  const hoverScale = canHold && isHovered ? 1.08 : 1;

  // Always render the RigidBody — never unmount it
  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        position={initialPosition}
        rotation={ACE_UP_EULER}
        colliders={false}
        restitution={restitution}
        friction={friction}
        angularDamping={angularDamping}
        linearDamping={linearDamping}
        mass={mass}
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
      <GlowOverlay
        dieMeshRef={meshRef}
        visible={isHeld || shouldBeInHoldTray}
      />
    </>
  );
}
