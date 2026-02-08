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
  'full-house': 8,
  'straight': 10,
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
export const DICE_SIZE = 0.65;
export const DICE_EDGE_RADIUS = 0.065;

// Play area (portrait orientation - taller than wide for mobile)
export const TABLE_WIDTH = 5;   // X dimension (narrower)
export const TABLE_DEPTH = 6;   // Z dimension (taller) - reduced to leave room for opponent dice above
export const WALL_HEIGHT = 0.6;  // Visible rail height
export const CEILING_HEIGHT = 4; // Invisible ceiling to contain dice

// Playable area offset - keeps dice away from bottom UI
// Positive Z is toward the camera (bottom of screen)
export const PLAY_AREA_Z_OFFSET = -0.8;  // Shift play area toward back of table
export const PLAY_AREA_DEPTH = 4.5;      // Reduced depth for playable area

// Roll parameters
export const MIN_ANGULAR_VELOCITY = 30;
export const MAX_ANGULAR_VELOCITY = 55;
export const BASE_IMPULSE = 22;
export const IMPULSE_VARIANCE = 0.35;

// Hand rank numeric values for comparison (higher = better)
export const HAND_RANK_VALUES: Record<HandRank, number> = {
  'five-of-a-kind': 8,
  'four-of-a-kind': 7,
  'straight': 6,
  'full-house': 5,
  'three-of-a-kind': 4,
  'two-pair': 3,
  'one-pair': 2,
  'high-card': 1,
};

// Opponent dice layout
export const OPPONENT_DICE_SIZE = 0.45;
export const OPPONENT_DICE_Y = 0.3;
export const OPPONENT_DICE_Z = -3.8;
export const OPPONENT_DICE_SPACING = 0.7;
