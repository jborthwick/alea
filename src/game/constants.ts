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

// Table definitions
export type TableId = 'rooster' | 'bluejay' | 'martin' | 'parrot' | 'owl';

export interface TableConfig {
  id: TableId;
  name: string;
  bet: number;
  accent: string;       // RGB triplet for --accent
  accentDark: string;   // RGB triplet for --accent-dark
  rimColor: string;     // Hex color for table rim
  ambientColor: string; // Hex color for ambient light
  fillColor: string;    // Hex color for fill light
  spotColor: string;    // Hex color for spotlight
}

export const TABLE_CONFIGS: Record<TableId, TableConfig> = {
  rooster: {
    id: 'rooster',
    name: 'Rooster',
    bet: 0,
    accent: '220, 50, 50',
    accentDark: '170, 30, 30',
    rimColor: '#4a0e0e',
    ambientColor: '#FFE0D6',
    fillColor: '#FFD0C0',
    spotColor: '#FFDDCC',
  },
  bluejay: {
    id: 'bluejay',
    name: 'Bluejay',
    bet: 10,
    accent: '70, 140, 220',
    accentDark: '40, 100, 180',
    rimColor: '#0e2a4a',
    ambientColor: '#D6E8FF',
    fillColor: '#C4DEFF',
    spotColor: '#CCE4FF',
  },
  martin: {
    id: 'martin',
    name: 'Martin',
    bet: 50,
    accent: '160, 90, 220',
    accentDark: '120, 60, 180',
    rimColor: '#2e0e4a',
    ambientColor: '#EAD6FF',
    fillColor: '#DEC4FF',
    spotColor: '#E4CCFF',
  },
  parrot: {
    id: 'parrot',
    name: 'Parrot',
    bet: 100,
    accent: '70, 190, 100',
    accentDark: '40, 150, 70',
    rimColor: '#0e4a1a',
    ambientColor: '#D6FFE0',
    fillColor: '#C4FFCC',
    spotColor: '#CCFFDD',
  },
  owl: {
    id: 'owl',
    name: 'Owl',
    bet: 200,
    accent: '170, 170, 180',
    accentDark: '130, 130, 140',
    rimColor: '#2a2a2a',
    ambientColor: '#FFF5E6',
    fillColor: '#FFE4C4',
    spotColor: '#FFFACD',
  },
};

export const TABLE_ORDER: TableId[] = ['rooster', 'bluejay', 'martin', 'parrot', 'owl'];

export function applyTableTheme(tableId: TableId) {
  const config = TABLE_CONFIGS[tableId];
  const root = document.documentElement.style;
  root.setProperty('--accent', config.accent);
  root.setProperty('--accent-dark', config.accentDark);
}

export function resetDefaultTheme() {
  const root = document.documentElement.style;
  root.setProperty('--accent', '242, 170, 29');
  root.setProperty('--accent-dark', '201, 138, 10');
}

// Lighting constants
// Ambient
export const AMBIENT_INTENSITY = 0.35;
// Main directional (shadow-casting)
export const MAIN_LIGHT_INTENSITY = 1.6;
export const MAIN_LIGHT_COLOR = '#FFFAF0';
export const MAIN_LIGHT_POS_X = 6;
export const MAIN_LIGHT_POS_Y = 6;
export const MAIN_LIGHT_POS_Z = -4;
// Fill directional
export const FILL_LIGHT_INTENSITY = 0.3;
export const FILL_LIGHT_POS_X = -3;
export const FILL_LIGHT_POS_Y = 8;
export const FILL_LIGHT_POS_Z = -3;
// Overhead spotlight (vignette)
export const SPOT_INTENSITY = 2.0;
export const SPOT_HEIGHT = 12;
export const SPOT_ANGLE = Math.PI / 6;
export const SPOT_PENUMBRA = 1.0;
export const SPOT_DECAY = 1.5;
// Environment
export const ENV_INTENSITY = 0.8;

// Physics constants
export const GRAVITY = -35;
export const DICE_RESTITUTION = 0.75;
export const DICE_FRICTION = 0.4;
export const DICE_MASS = 0.3;
export const ANGULAR_DAMPING = 0.1;
export const LINEAR_DAMPING = 0.1;

// Dice appearance
export const DICE_SIZE = 0.70;
export const DICE_EDGE_RADIUS = 0.075;

/**
 * Dice material visual style preset
 *
 * Available options:
 * - 'casino': Standard casino dice (roughness: 0.4, metalness: 0.1)
 * - 'glossy': Glossy plastic finish with clearcoat (roughness: 0.2, clearcoat: 0.5)
 * - 'matte': Matte finish (roughness: 0.9, metalness: 0.0)
 * - 'pearlescent': Shiny/pearlescent with high clearcoat (roughness: 0.15, metalness: 0.3, clearcoat: 0.8)
 *
 * To add a new material preset, edit DICE_MATERIAL_PRESETS in DiceGeometry.ts
 */
export const DICE_MATERIAL_STYLE = 'glossy' as const;

// Play area (1:1 square format for easier asset creation)
export const TABLE_WIDTH = 5.5;   // X dimension
export const TABLE_DEPTH = 5.5;   // Z dimension (same as width for 1:1 ratio)
export const WALL_HEIGHT = 0.6;  // Visible rail height
export const CEILING_HEIGHT = 4; // Invisible ceiling to contain dice

// Playable area offset - keeps dice away from bottom UI
// Positive Z is toward the camera (bottom of screen)
export const PLAY_AREA_Z_OFFSET = -0.8;  // Shift play area toward back of table
export const PLAY_AREA_DEPTH = 7.5;      // Greatly expanded invisible barrier for more roll space upward

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

// Held dice outline overlay
export const GLOW_OVERLAY_OPACITY = 0.85;

// Convert table accent RGB triplet (e.g. '220, 50, 50') to hex color string
export function accentToHex(accent: string): string {
  const [r, g, b] = accent.split(',').map(s => parseInt(s.trim()));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Opponent dice layout
export const OPPONENT_DICE_SIZE = 0.55;  // Increased from 0.45 for better visibility
export const OPPONENT_DICE_Y = 0.3;
export const OPPONENT_DICE_Z = -3.8;
export const OPPONENT_DICE_SPACING = 0.8;  // Slightly increased spacing for larger dice
