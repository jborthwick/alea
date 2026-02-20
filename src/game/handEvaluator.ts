import type { CardValue, HandResult, HandRank, RoundOutcome } from '../types/game';
import { VALUE_ORDER, PAYOUTS, HAND_NAMES, HAND_RANK_VALUES } from './constants';

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

// Get the card values sorted by importance for tiebreakers
// For pairs/sets: the matched cards come first, then kickers by value
// For straights/high card: all cards sorted by value
function getPrimaryCards(counts: Map<CardValue, number>): CardValue[] {
  // Get the values sorted by count (descending) then by value (descending)
  const sortedEntries = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // Sort by count first (pairs/sets)
    return VALUE_ORDER[b[0]] - VALUE_ORDER[a[0]]; // Then by value (high to low)
  });

  return sortedEntries.map(([value]) => value);
}

// Evaluate a partial hand (1–5 dice) based only on the provided values.
// Returns null if fewer than 2 dice (not enough to form a meaningful hand label).
export function evaluatePartialHand(values: CardValue[]): HandResult | null {
  if (values.length < 2) return null;

  const counts = countValues(values);
  const countArray = Array.from(counts.values()).sort((a, b) => b - a);

  let rank: HandRank;

  if (values.length === 5 && countArray[0] === 5) {
    rank = 'five-of-a-kind';
  } else if (countArray[0] === 4) {
    rank = 'four-of-a-kind';
  } else if (countArray[0] === 3 && countArray[1] === 2) {
    rank = 'full-house';
  } else if (values.length === 5 && isStraight(values)) {
    rank = 'straight';
  } else if (countArray[0] === 3) {
    rank = 'three-of-a-kind';
  } else if (countArray[0] === 2 && countArray[1] === 2) {
    rank = 'two-pair';
  } else if (countArray[0] === 2) {
    rank = 'one-pair';
  } else {
    return null; // No meaningful hand from held dice alone
  }

  return {
    rank,
    displayName: HAND_NAMES[rank],
    payout: PAYOUTS[rank],
    primaryCards: getPrimaryCards(counts),
  };
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
    primaryCards: getPrimaryCards(counts),
  };
}

export function compareHands(
  playerValues: CardValue[],
  opponentValues: CardValue[]
): RoundOutcome {
  const playerHand = evaluateHand(playerValues);
  const opponentHand = evaluateHand(opponentValues);

  const playerRank = HAND_RANK_VALUES[playerHand.rank];
  const opponentRank = HAND_RANK_VALUES[opponentHand.rank];

  if (playerRank > opponentRank) return 'win';
  if (playerRank < opponentRank) return 'lose';

  // Same hand rank - compare high cards
  // Compare cards in order of importance (pairs first, then kickers)
  for (let i = 0; i < playerHand.primaryCards.length; i++) {
    const playerCardValue = VALUE_ORDER[playerHand.primaryCards[i]];
    const opponentCardValue = VALUE_ORDER[opponentHand.primaryCards[i]];

    if (playerCardValue > opponentCardValue) return 'win';
    if (playerCardValue < opponentCardValue) return 'lose';
  }

  // Truly equal hands (very rare) = tie
  return 'tie';
}
