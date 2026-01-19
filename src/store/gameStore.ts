import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Vector3, Quaternion } from 'three';
import type { GameState, DieState, CardValue } from '../types/game';
import { CARD_VALUES } from '../types/game';
import { evaluateHand } from '../game/handEvaluator';
import {
  INITIAL_BANKROLL,
  MIN_BET,
  MAX_BET,
  BET_INCREMENT,
} from '../game/constants';

function createInitialDice(): DieState[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i,
    value: CARD_VALUES[Math.floor(Math.random() * CARD_VALUES.length)],
    isHeld: false,
    position: new Vector3((i - 2) * 1.2, 3, 0),
    rotation: new Quaternion(),
  }));
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial state
      dice: createInitialDice(),
      rollsRemaining: 3,
      isRolling: false,
      bankroll: INITIAL_BANKROLL,
      currentBet: MIN_BET,
      minBet: MIN_BET,
      maxBet: MAX_BET,
      gamePhase: 'betting',
      currentHand: null,
      lastWin: 0,
      soundEnabled: true,
      shakeEnabled: true,

      // Actions
      rollDice: () => {
        const state = get();

        // Can't roll if already rolling or no rolls left
        if (state.isRolling || state.rollsRemaining <= 0) return;

        // If in betting phase, deduct bet and move to rolling phase
        if (state.gamePhase === 'betting') {
          if (state.bankroll < state.currentBet) return;
          set({
            bankroll: state.bankroll - state.currentBet,
            gamePhase: 'rolling',
            currentHand: null,
            lastWin: 0,
          });
        }

        set({ isRolling: true });
      },

      setRolling: (rolling: boolean) => {
        set({ isRolling: rolling });
      },

      finishRoll: () => {
        const state = get();
        const newRollsRemaining = state.rollsRemaining - 1;

        // Evaluate hand
        const values = state.dice.map((d) => d.value);
        const handResult = evaluateHand(values);

        // If no rolls left, score the hand
        if (newRollsRemaining === 0) {
          const winnings = state.currentBet * handResult.payout;
          set({
            rollsRemaining: 0,
            isRolling: false,
            gamePhase: 'scoring',
            currentHand: handResult,
            bankroll: state.bankroll + winnings,
            lastWin: winnings,
          });
        } else {
          set({
            rollsRemaining: newRollsRemaining,
            isRolling: false,
            currentHand: handResult,
          });
        }
      },

      toggleHold: (id: number) => {
        const state = get();
        // Can only hold during rolling phase and not mid-roll
        if (state.gamePhase !== 'rolling' || state.isRolling) return;
        // Can't hold if no rolls made yet (rollsRemaining === 3 means first roll not done)
        if (state.rollsRemaining === 3) return;

        set({
          dice: state.dice.map((die) =>
            die.id === id ? { ...die, isHeld: !die.isHeld } : die
          ),
        });
      },

      updateDieValue: (id: number, value: CardValue) => {
        set({
          dice: get().dice.map((die) =>
            die.id === id ? { ...die, value } : die
          ),
        });
      },

      setBet: (amount: number) => {
        const state = get();
        if (state.gamePhase !== 'betting') return;
        const clampedBet = Math.max(
          state.minBet,
          Math.min(state.maxBet, Math.min(amount, state.bankroll))
        );
        set({ currentBet: clampedBet });
      },

      increaseBet: () => {
        const state = get();
        if (state.gamePhase !== 'betting') return;
        const newBet = Math.min(
          state.maxBet,
          Math.min(state.currentBet + BET_INCREMENT, state.bankroll)
        );
        set({ currentBet: newBet });
      },

      decreaseBet: () => {
        const state = get();
        if (state.gamePhase !== 'betting') return;
        const newBet = Math.max(state.minBet, state.currentBet - BET_INCREMENT);
        set({ currentBet: newBet });
      },

      newRound: () => {
        const state = get();

        // Reset dice but keep bankroll
        set({
          dice: createInitialDice(),
          rollsRemaining: 3,
          isRolling: false,
          gamePhase: 'betting',
          currentHand: null,
          lastWin: 0,
          // Adjust bet if bankroll is too low
          currentBet: Math.min(state.currentBet, state.bankroll, state.maxBet),
        });
      },

      toggleSound: () => {
        set({ soundEnabled: !get().soundEnabled });
      },

      toggleShake: () => {
        set({ shakeEnabled: !get().shakeEnabled });
      },

      resetBankroll: () => {
        set({
          dice: createInitialDice(),
          rollsRemaining: 3,
          isRolling: false,
          bankroll: INITIAL_BANKROLL,
          currentBet: MIN_BET,
          gamePhase: 'betting',
          currentHand: null,
          lastWin: 0,
        });
      },
    }),
    {
      name: 'dice-poker-storage',
      partialize: (state) => ({
        bankroll: state.bankroll,
        currentBet: state.currentBet,
        soundEnabled: state.soundEnabled,
        shakeEnabled: state.shakeEnabled,
      }),
    }
  )
);

// Hook to check if store has been hydrated from localStorage
export const useStoreHydrated = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Check if already hydrated
    const unsubFinishHydration = useGameStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // If rehydration already happened before this component mounted
    if (useGameStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => {
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
};
