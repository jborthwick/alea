import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Die } from './Die';
import { useGameStore } from '../../store/gameStore';
import type { CardValue } from '../../types/game';
import { useAudio } from '../../hooks/useAudio';
import { useHaptics } from '../../hooks/useHaptics';

interface DiceGroupProps {
  rollTrigger: number;
  intensity?: number;
  throwDirection?: THREE.Vector2 | null;
  isGrabbing?: boolean;
  grabTargetRef?: React.RefObject<THREE.Vector3 | null>;
  isShaking?: boolean;
}

export function DiceGroup({ rollTrigger, intensity = 0.7, throwDirection, isGrabbing, grabTargetRef, isShaking }: DiceGroupProps) {
  const dice = useGameStore((state) => state.dice);
  const updateDieValue = useGameStore((state) => state.updateDieValue);
  const finishRoll = useGameStore((state) => state.finishRoll);
  const isRolling = useGameStore((state) => state.isRolling);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const rollsRemaining = useGameStore((state) => state.rollsRemaining);
  const toggleHold = useGameStore((state) => state.toggleHold);

  const { playCollision, playHold } = useAudio();
  const { vibrateCollision, vibrateHold } = useHaptics();

  // Can hold dice when in rolling phase, not mid-roll, and at least one roll has been made
  const canHold = gamePhase === 'rolling' && !isRolling && rollsRemaining < 3;

  const handleHold = useCallback(
    (id: number) => {
      playHold();
      vibrateHold();
      toggleHold(id);
    },
    [playHold, vibrateHold, toggleHold]
  );

  const settledDiceRef = useRef<Set<number>>(new Set());
  const prevRollTrigger = useRef(rollTrigger);
  const finishRollCalledForTrigger = useRef(-1);

  // Reset settled state when a new roll starts
  useEffect(() => {
    if (rollTrigger !== prevRollTrigger.current) {
      prevRollTrigger.current = rollTrigger;
      // Only reset for dice that aren't held
      const heldIds = dice.filter((d) => d.isHeld).map((d) => d.id);
      settledDiceRef.current = new Set(heldIds);

      // If all 5 dice are held, finish the roll immediately
      if (heldIds.length === 5 && finishRollCalledForTrigger.current !== rollTrigger) {
        const currentIsRolling = useGameStore.getState().isRolling;
        if (currentIsRolling) {
          finishRollCalledForTrigger.current = rollTrigger;
          setTimeout(() => {
            finishRoll();
          }, 100);
        }
      }
    }
  }, [rollTrigger, dice, finishRoll]);

  const handleSettle = useCallback(
    (id: number, value: string) => {
      // Update the die value in the store
      updateDieValue(id, value as CardValue);

      // Play collision sound and haptic feedback
      playCollision();
      vibrateCollision();

      // Track that this die has settled
      settledDiceRef.current.add(id);

      // Only finish roll if we're actually rolling (prevents counting initial settle on mount)
      // Check if all dice have settled and we haven't already finished this roll
      const currentIsRolling = useGameStore.getState().isRolling;
      if (settledDiceRef.current.size === 5 && finishRollCalledForTrigger.current !== rollTrigger && currentIsRolling) {
        finishRollCalledForTrigger.current = rollTrigger;
        // Small delay to let physics fully settle
        setTimeout(() => {
          finishRoll();
        }, 100);
      }
    },
    [updateDieValue, finishRoll, playCollision, vibrateCollision, rollTrigger]
  );

  return (
    <group>
      {dice.map((die) => (
        <Die
          key={die.id}
          id={die.id}
          onSettle={handleSettle}
          rollTrigger={rollTrigger}
          intensity={intensity}
          throwDirection={throwDirection}
          canHold={canHold}
          onHold={handleHold}
          isGrabbing={isGrabbing}
          grabTargetRef={grabTargetRef}
          isShaking={isShaking}
        />
      ))}
    </group>
  );
}
