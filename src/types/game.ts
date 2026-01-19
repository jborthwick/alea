import { Vector3, Quaternion } from 'three';

export type CardValue = '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export const CARD_VALUES: CardValue[] = ['9', '10', 'J', 'Q', 'K', 'A'];

export interface DieState {
  id: number;
  value: CardValue;
  isHeld: boolean;
  position: Vector3;
  rotation: Quaternion;
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
}

export type GamePhase = 'betting' | 'rolling' | 'scoring';

export interface GameState {
  // Dice
  dice: DieState[];
  rollsRemaining: number;
  isRolling: boolean;

  // Betting
  bankroll: number;
  currentBet: number;
  minBet: number;
  maxBet: number;

  // Game state
  gamePhase: GamePhase;
  currentHand: HandResult | null;
  lastWin: number;

  // Settings
  soundEnabled: boolean;

  // Actions
  rollDice: () => void;
  toggleHold: (id: number) => void;
  setBet: (amount: number) => void;
  increaseBet: () => void;
  decreaseBet: () => void;
  newRound: () => void;
  toggleSound: () => void;
  updateDieValue: (id: number, value: CardValue) => void;
  setRolling: (rolling: boolean) => void;
  finishRoll: () => void;
}
