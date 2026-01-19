import type { CardValue, HandRank } from '../types/game';

// Card value order (low to high)
export const VALUE_ORDER: Record<CardValue, number> = {
  '9': 0,
  '10': 1,
  'J': 2,
  'Q': 3,
  'K': 4,
  'A': 5,
};

// Payout multipliers for each hand rank
export const PAYOUTS: Record<HandRank, number> = {
  'five-of-a-kind': 100,
  'four-of-a-kind': 25,
  'full-house': 10,
  'straight': 8,
  'three-of-a-kind': 5,
  'two-pair': 3,
  'one-pair': 1,
  'high-card': 0,
};

// Display names for hand ranks
export const HAND_NAMES: Record<HandRank, string> = {
  'five-of-a-kind': 'Five of a Kind!',
  'four-of-a-kind': 'Four of a Kind!',
  'full-house': 'Full House!',
  'straight': 'Straight!',
  'three-of-a-kind': 'Three of a Kind',
  'two-pair': 'Two Pair',
  'one-pair': 'One Pair',
  'high-card': 'High Card',
};

// Initial bankroll
export const INITIAL_BANKROLL = 1000;

// Bet limits
export const MIN_BET = 10;
export const MAX_BET = 500;
export const BET_INCREMENT = 10;

// Physics constants
export const GRAVITY = -55;
export const DICE_RESTITUTION = 0.4;  // More bouncy
export const DICE_FRICTION = 0.6;
export const ANGULAR_DAMPING = 0.4;
export const LINEAR_DAMPING = 0.15;

// Dice appearance
export const DICE_SIZE = 0.8;
export const DICE_EDGE_RADIUS = 0.08;

// Play area
export const TABLE_SIZE = 6;
export const WALL_HEIGHT = 0.6;  // Visible rail height
export const CEILING_HEIGHT = 4; // Invisible ceiling to contain dice

// Roll parameters
export const MIN_ANGULAR_VELOCITY = 30;
export const MAX_ANGULAR_VELOCITY = 55;
export const BASE_IMPULSE = 22;
export const IMPULSE_VARIANCE = 0.35;
