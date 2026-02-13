import { Vector3, Quaternion } from 'three';
import type { TableId } from '../game/constants';

export type CardValue = '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export const CARD_VALUES: CardValue[] = ['9', '10', 'J', 'Q', 'K', 'A'];

export interface DieState {
  id: number;
  value: CardValue;
  isHeld: boolean;
  position: Vector3;
  rotation: Quaternion;
}

export interface OpponentDieState {
  id: number;
  value: CardValue;
  isHeld: boolean;
}

export type HandRank =
  | 'five-of-a-kind'
  | 'four-of-a-kind'
  | 'full-house'
  | 'straight'
  | 'three-of-a-kind'
  | 'two-pair'
  | 'one-pair'
  | 'high-card';

export interface HandResult {
  rank: HandRank;
  displayName: string;
  payout: number;
  primaryCards: CardValue[]; // Cards sorted by importance for tiebreakers
}

export type GamePhase = 'betting' | 'rolling' | 'scoring';

export type RoundOutcome = 'win' | 'lose' | 'tie';

export interface GameState {
  // Player dice
  dice: DieState[];
  rollsRemaining: number;
  isRolling: boolean;

  // Opponent dice
  opponentDice: OpponentDieState[];
  pendingOpponentDice: OpponentDieState[] | null;
  opponentHand: HandResult | null;
  opponentIsRolling: boolean;
  roundOutcome: RoundOutcome | null;

  // Table & Betting
  selectedTable: TableId | null;
  bankroll: number;
  currentBet: number;

  // Game state
  gamePhase: GamePhase;
  currentHand: HandResult | null;
  lastWin: number;

  // Settings
  soundEnabled: boolean;
  shakeEnabled: boolean;
  showFPS: boolean;

  // Actions
  selectTable: (tableId: TableId) => void;
  returnToLobby: () => void;
  rollDice: () => void;
  toggleHold: (id: number) => void;
  newRound: () => void;
  toggleSound: () => void;
  toggleShake: () => void;
  toggleFPS: () => void;
  resetBankroll: () => void;
  updateDieValue: (id: number, value: CardValue) => void;
  setRolling: (rolling: boolean) => void;
  finishRoll: () => void;
}
