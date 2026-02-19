import { useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { useGrabAndThrow } from '../../hooks/useGrabAndThrow';
import { useAudio } from '../../hooks/useAudio';
import { useHaptics } from '../../hooks/useHaptics';
import { DiceGroup } from './DiceGroup';
import { TABLE_WIDTH, TABLE_DEPTH } from '../../game/constants';
import type { ThreeEvent } from '@react-three/fiber';

interface GrabGestureLayerProps {
  rollTrigger: number;
  intensity?: number;
  throwDirection?: THREE.Vector2 | null;
  canRoll: boolean;
  onThrow: (intensity: number, direction: THREE.Vector2) => void;
  isShaking?: boolean;
}

export function GrabGestureLayer({
  rollTrigger,
  intensity,
  throwDirection,
  canRoll,
  onThrow,
  isShaking,
}: GrabGestureLayerProps) {
  const dice = useGameStore((s) => s.dice);
  const hasNonHeldDice = useMemo(() => dice.some((d) => !d.isHeld), [dice]);

  const { playGrab, initAudio } = useAudio();
  const { vibrateGrab } = useHaptics();

  const handleGrabStart = useCallback(() => {
    initAudio();
    playGrab();
    vibrateGrab();
  }, [initAudio, playGrab, vibrateGrab]);

  const { gesturePhase, grabTargetRef, handlePointerDown } = useGrabAndThrow({
    canRoll,
    hasNonHeldDice,
    onGrabStart: handleGrabStart,
    onThrow,
  });

  const isGrabbing = gesturePhase === 'grabbing';

  // Hit plane pointer down — forward to gesture hook
  const onPlanePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      // Only respond to the table plane, not dice (dice stopPropagation when canHold)
      handlePointerDown(
        e.point.clone(),
        e.nativeEvent.clientX,
        e.nativeEvent.clientY,
        e.nativeEvent.pointerId,
      );
    },
    [handlePointerDown],
  );

  return (
    <group>
      {/* Invisible hit plane — sits just above table surface, catches pointer events
          that miss the dice. Transparent material keeps it raycastable but invisible. */}
      <mesh
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={onPlanePointerDown}
      >
        <planeGeometry args={[TABLE_WIDTH, TABLE_DEPTH]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <DiceGroup
        rollTrigger={rollTrigger}
        intensity={intensity}
        throwDirection={throwDirection}
        isGrabbing={isGrabbing}
        grabTargetRef={grabTargetRef}
        isShaking={isShaking}
      />
    </group>
  );
}
