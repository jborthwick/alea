import { useCallback, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Vector3, Quaternion } from 'three';
import type { GameState, DieState, CardValue, OpponentDieState } from '../types/game';
import { evaluateHand, compareHands } from '../game/handEvaluator';
import { decideHolds, rollOpponentValues } from '../game/opponentAI';
import {
  INITIAL_BANKROLL,
  TABLE_CONFIGS,
  applyTableTheme,
  resetDefaultTheme,
} from '../game/constants';
import type { TableId } from '../game/constants';

function createInitialDice(): DieState[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i,
    value: 'A' as CardValue,
    isHeld: false,
    position: new Vector3((i - 2) * 1.2, 3, 0),
    rotation: new Quaternion(),
  }));
}

function createInitialOpponentDice(): OpponentDieState[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i,
    value: 'A' as CardValue,
    isHeld: false,
  }));
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial state
      dice: createInitialDice(),
      rollsRemaining: 3,
      isRolling: false,
      selectedTable: null,
      bankroll: INITIAL_BANKROLL,
      currentBet: 0,
      gamePhase: 'betting',
      currentHand: null,
      lastWin: 0,
      soundEnabled: true,
      shakeEnabled: false, // Starts off; user must enable each session (iOS doesn't persist permission)
      showDebugPanel: import.meta.env.DEV,

      // Opponent state
      opponentDice: createInitialOpponentDice(),
      pendingOpponentDice: null,
      opponentHand: null,
      opponentIsRolling: false,
      roundOutcome: null,

      // Actions
      selectTable: (tableId: TableId) => {
        const config = TABLE_CONFIGS[tableId];
        applyTableTheme(tableId);
        set({
          selectedTable: tableId,
          currentBet: config.bet,
          gamePhase: 'betting',
        });
      },

      returnToLobby: () => {
        const state = get();
        resetDefaultTheme();

        const resetDice = state.dice.map((d) => ({
          ...d,
          value: 'A' as CardValue,
          isHeld: false,
        }));
        const resetOpponentDice = state.opponentDice.map((d) => ({
          ...d,
          value: 'A' as CardValue,
          isHeld: false,
        }));

        set({
          selectedTable: null,
          dice: resetDice,
          rollsRemaining: 3,
          isRolling: false,
          gamePhase: 'betting',
          currentHand: null,
          lastWin: 0,
          currentBet: 0,
          opponentDice: resetOpponentDice,
          pendingOpponentDice: null,
          opponentHand: null,
          opponentIsRolling: false,
          roundOutcome: null,
        });
      },

      rollDice: () => {
        const state = get();

        // Can't roll if already rolling, opponent is resolving, or no rolls left
        if (state.isRolling || state.opponentIsRolling || state.rollsRemaining <= 0) return;

        // If in betting phase, deduct bet and move to rolling phase
        if (state.gamePhase === 'betting') {
          // For paid tables, check bankroll
          if (state.currentBet > 0 && state.bankroll < state.currentBet) return;
          set({
            bankroll: state.bankroll - state.currentBet,
            gamePhase: 'rolling',
            currentHand: null,
            opponentHand: null,
            lastWin: 0,
            roundOutcome: null,
          });
        }

        // Pre-determine opponent's new dice values (applied when spin starts in finishRoll)
        const currentState = get();
        const newOpponentDice = rollOpponentValues(currentState.opponentDice);

        set({ isRolling: true, pendingOpponentDice: newOpponentDice });
      },

      setRolling: (rolling: boolean) => {
        set({ isRolling: rolling });
      },

      finishRoll: () => {
        const state = get();
        const newRollsRemaining = state.rollsRemaining - 1;

        // Evaluate player hand immediately
        const playerValues = state.dice.map((d) => d.value);
        const playerHandResult = evaluateHand(playerValues);

        // Player dice are done; apply pending opponent values and start spin
        const pending = state.pendingOpponentDice;
        set({
          isRolling: false,
          currentHand: playerHandResult,
          opponentIsRolling: true,
          ...(pending ? { opponentDice: pending, pendingOpponentDice: null } : {}),
        });

        // After 500ms, stop opponent spin and resolve
        setTimeout(() => {
          const s = get();
          const opponentValues = s.opponentDice.map((d) => d.value);
          const opponentHandResult = evaluateHand(opponentValues);

          if (newRollsRemaining === 0) {
            const outcome = compareHands(playerValues, opponentValues);
            const tableConfig = s.selectedTable ? TABLE_CONFIGS[s.selectedTable] : null;
            const fixedPayout = tableConfig?.payout;
            let winnings = 0;
            if (outcome === 'win') winnings = fixedPayout ?? s.currentBet * 2;
            else if (outcome === 'tie') winnings = s.currentBet;

            set({
              rollsRemaining: 0,
              opponentIsRolling: false,
              gamePhase: 'scoring',
              opponentHand: opponentHandResult,
              roundOutcome: outcome,
              bankroll: s.bankroll + winnings,
              lastWin: outcome === 'win' ? winnings : 0,
            });
          } else {
            const aiHolds = decideHolds(s.opponentDice);
            const updatedOpponentDice = s.opponentDice.map((d, i) => ({
              ...d,
              isHeld: aiHolds[i],
            }));

            set({
              rollsRemaining: newRollsRemaining,
              opponentIsRolling: false,
              opponentHand: opponentHandResult,
              opponentDice: updatedOpponentDice,
            });
          }
        }, 500);
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

      newRound: () => {
        const state = get();

        // Reset dice values in place (avoids destroying/recreating Rapier physics bodies)
        const resetDice = state.dice.map((d) => ({
          ...d,
          value: 'A' as CardValue,
          isHeld: false,
        }));
        const resetOpponentDice = state.opponentDice.map((d) => ({
          ...d,
          value: 'A' as CardValue,
          isHeld: false,
        }));

        set({
          dice: resetDice,
          rollsRemaining: 3,
          isRolling: false,
          gamePhase: 'betting',
          currentHand: null,
          lastWin: 0,
          // Reset opponent state
          opponentDice: resetOpponentDice,
          pendingOpponentDice: null,
          opponentHand: null,
          opponentIsRolling: false,
          roundOutcome: null,
        });
      },

      toggleSound: () => {
        set({ soundEnabled: !get().soundEnabled });
      },

      toggleShake: () => {
        set({ shakeEnabled: !get().shakeEnabled });
      },

      toggleDebugPanel: () => {
        set({ showDebugPanel: !get().showDebugPanel });
      },

      resetBankroll: () => {
        const state = get();
        resetDefaultTheme();

        const resetDice = state.dice.map((d) => ({
          ...d,
          value: 'A' as CardValue,
          isHeld: false,
        }));
        const resetOpponentDice = state.opponentDice.map((d) => ({
          ...d,
          value: 'A' as CardValue,
          isHeld: false,
        }));

        set({
          selectedTable: null,
          dice: resetDice,
          rollsRemaining: 3,
          isRolling: false,
          bankroll: INITIAL_BANKROLL,
          currentBet: 0,
          gamePhase: 'betting',
          currentHand: null,
          lastWin: 0,
          opponentDice: resetOpponentDice,
          pendingOpponentDice: null,
          opponentHand: null,
          opponentIsRolling: false,
          roundOutcome: null,
        });
      },
    }),
    {
      name: 'dice-poker-storage',
      partialize: (state) => ({
        bankroll: state.bankroll,
        selectedTable: state.selectedTable,
        soundEnabled: state.soundEnabled,
        // Note: shakeEnabled is intentionally NOT persisted because iOS Safari
        // doesn't persist DeviceMotion permission across page reloads
      }),
      onRehydrateStorage: () => (state) => {
        // Re-apply table theme after hydration
        if (state?.selectedTable) {
          applyTableTheme(state.selectedTable);
          state.currentBet = TABLE_CONFIGS[state.selectedTable].bet;
        }
      },
    }
  )
);

// Hook to check if store has been hydrated from localStorage
export const useStoreHydrated = () => {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const unsub = useGameStore.persist.onFinishHydration(onStoreChange);
    return unsub;
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => useGameStore.persist.hasHydrated(),
    () => false,
  );
};
