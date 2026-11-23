/**
 * UTC date-seeded daily shift resolver.
 * Maps calendar days deterministically onto the verified shift catalog
 * and exposes clean date labels for the Reddit Dispatch Ticket.
 */

import { SHIFTS } from './shifts.js';

const EPOCH_UTC_MS = Date.UTC(2026, 10, 23); // Nov 23, 2026 — Launch Day #01
const DAY_MS = 86_400_000;

export function getTodayUtcDateKey(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayShiftIndex(now = new Date()) {
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysSinceLaunch = Math.max(0, Math.floor((utcMidnight - EPOCH_UTC_MS) / DAY_MS));
  return daysSinceLaunch % SHIFTS.length;
}

export function getDailyNumber(now = new Date()) {
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(1, Math.floor((utcMidnight - EPOCH_UTC_MS) / DAY_MS) + 1);
}
