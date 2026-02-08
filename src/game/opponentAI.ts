import type { CardValue, OpponentDieState } from '../types/game';
import { CARD_VALUES } from '../types/game';
import { VALUE_ORDER } from './constants';

/**
 * Determines which opponent dice to hold using basic smart strategy.
 */
export function decideHolds(dice: OpponentDieState[]): boolean[] {
  const values = dice.map(d => d.value);
  const counts = new Map<CardValue, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }

  // Sort by count descending, then by card value descending
  const sorted = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return VALUE_ORDER[b[0]] - VALUE_ORDER[a[0]];
  });

  const bestCount = sorted[0][1];
  const bestValue = sorted[0][0];

  const holds = new Array<boolean>(5).fill(false);

  // Check for straight
  const uniqueSorted = [...new Set(values)].sort((a, b) => VALUE_ORDER[a] - VALUE_ORDER[b]);
  const isStraight = uniqueSorted.length === 5 &&
    VALUE_ORDER[uniqueSorted[4]] - VALUE_ORDER[uniqueSorted[0]] === 4;

  // Five of a kind or four of a kind: hold the group
  if (bestCount >= 4) {
    for (let i = 0; i < 5; i++) {
      if (dice[i].value === bestValue) holds[i] = true;
    }
    return holds;
  }

  // Full house: hold everything
  if (bestCount === 3 && sorted.length >= 2 && sorted[1][1] === 2) {
    return holds.map(() => true);
  }

  // Straight: hold everything
  if (isStraight) {
    return holds.map(() => true);
  }

  // Three of a kind: hold the three
  if (bestCount === 3) {
    for (let i = 0; i < 5; i++) {
      if (dice[i].value === bestValue) holds[i] = true;
    }
    return holds;
  }

  // Two pair: hold both pairs
  if (bestCount === 2 && sorted.length >= 2 && sorted[1][1] === 2) {
    const pair1 = sorted[0][0];
    const pair2 = sorted[1][0];
    for (let i = 0; i < 5; i++) {
      if (dice[i].value === pair1 || dice[i].value === pair2) holds[i] = true;
    }
    return holds;
  }

  // One pair: hold the pair
  if (bestCount === 2) {
    for (let i = 0; i < 5; i++) {
      if (dice[i].value === bestValue) holds[i] = true;
    }
    return holds;
  }

  // High card: hold nothing, re-roll everything
  return holds;
}

/**
 * Generate new random values for non-held opponent dice.
 */
export function rollOpponentValues(dice: OpponentDieState[]): OpponentDieState[] {
  return dice.map(d => {
    if (d.isHeld) return d;
    return {
      ...d,
      value: CARD_VALUES[Math.floor(Math.random() * CARD_VALUES.length)],
    };
  });
}
