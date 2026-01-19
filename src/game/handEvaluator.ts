import type { CardValue, HandResult, HandRank } from '../types/game';
import { VALUE_ORDER, PAYOUTS, HAND_NAMES } from './constants';

function countValues(values: CardValue[]): Map<CardValue, number> {
  const counts = new Map<CardValue, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function isStraight(values: CardValue[]): boolean {
  const sorted = [...values].sort((a, b) => VALUE_ORDER[a] - VALUE_ORDER[b]);

  // Check for consecutive values
  for (let i = 1; i < sorted.length; i++) {
    if (VALUE_ORDER[sorted[i]] - VALUE_ORDER[sorted[i - 1]] !== 1) {
      return false;
    }
  }
  return true;
}

export function evaluateHand(values: CardValue[]): HandResult {
  if (values.length !== 5) {
    throw new Error('Must have exactly 5 dice');
  }

  const counts = countValues(values);
  const countArray = Array.from(counts.values()).sort((a, b) => b - a);

  let rank: HandRank;

  // Five of a kind: all same
  if (countArray[0] === 5) {
    rank = 'five-of-a-kind';
  }
  // Four of a kind: 4 + 1
  else if (countArray[0] === 4) {
    rank = 'four-of-a-kind';
  }
  // Full house: 3 + 2
  else if (countArray[0] === 3 && countArray[1] === 2) {
    rank = 'full-house';
  }
  // Straight: all consecutive
  else if (isStraight(values)) {
    rank = 'straight';
  }
  // Three of a kind: 3 + 1 + 1
  else if (countArray[0] === 3) {
    rank = 'three-of-a-kind';
  }
  // Two pair: 2 + 2 + 1
  else if (countArray[0] === 2 && countArray[1] === 2) {
    rank = 'two-pair';
  }
  // One pair: 2 + 1 + 1 + 1
  else if (countArray[0] === 2) {
    rank = 'one-pair';
  }
  // High card: no matches
  else {
    rank = 'high-card';
  }

  return {
    rank,
    displayName: HAND_NAMES[rank],
    payout: PAYOUTS[rank],
  };
}
