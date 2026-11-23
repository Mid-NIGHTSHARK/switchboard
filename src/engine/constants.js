/**
 * Core geometric, physics, and accessibility constants for SWITCHBOARD.
 * Uses a near-square 640x640 world space so mobile portrait and desktop
 * Reddit viewports both render crisp, thumb-friendly boards.
 */

export const BOARD_W = 640;
export const BOARD_H = 640;

export const FIXED_DT = 1 / 60;
export const CAR_SPACING = 22;
export const CAR_COUNT = 3;

export const COLLISION_DIST = 19.5;
export const SWITCH_LOCK_RADIUS = 30;
export const AUTO_FLIP_CLEAR_DIST = 52; // Tail (44px) + 8px safety buffer
export const QUEUE_GAP = 70;            // Head-to-head spacing behind a holding train
export const HIT_RADIUS = 38;           // Generous mobile thumb target

export const HOLD_CYCLE = [0, 2, 4];

/**
 * Dual-encoded line definitions: distinct hue + shape + single-letter code
 * for colorblind accessibility.
 */
export const LINES = {
  red: {
    code: 'A',
    shape: 'circle',
    name: 'Crimson',
    color: '#cf3d2e',
    dark: '#851f15',
    light: '#f6a79e',
    roof: '#e65b4c',
    emoji: '🟥'
  },
  blue: {
    code: 'B',
    shape: 'square',
    name: 'Cobalt',
    color: '#2564a1',
    dark: '#143c63',
    light: '#98c4ec',
    roof: '#3a7fc0',
    emoji: '🟦'
  },
  amber: {
    code: 'C',
    shape: 'triangle',
    name: 'Amber',
    color: '#d48617',
    dark: '#854f07',
    light: '#f8d28e',
    roof: '#e89d31',
    emoji: '🟨'
  }
};
