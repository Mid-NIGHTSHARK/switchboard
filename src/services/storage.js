/**
 * Persistence and community stats boundary.
 * Runs against LocalStorage in standalone mode and maps 1:1 to
 * Devvit Redis endpoints (/api/state, /api/submit) when deployed to Reddit.
 */

const STORAGE_KEY = 'switchboard_v3_state';

export const SwitchboardStore = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        cleared: {},
        streak: 0,
        communityRuns: {}
      };
    } catch {
      return { cleared: {}, streak: 0, communityRuns: {} };
    }
  },

  saveResult(shiftId, result) {
    if (shiftId.startsWith('custom-')) return this.load();
    const data = this.load();
    const prev = data.cleared[shiftId];
    const rank = { bronze: 1, silver: 2, gold: 3 };

    if (
      !prev ||
      rank[result.stamp] > rank[prev.stamp] ||
      (result.stamp === prev.stamp && result.actions < prev.actions) ||
      (result.stamp === prev.stamp && result.actions === prev.actions && result.time < prev.time)
    ) {
      data.cleared[shiftId] = {
        stamp: result.stamp,
        actions: result.actions,
        time: Number(result.time.toFixed(2))
      };
    }

    data.streak = Object.keys(data.cleared).length;
    if (!data.communityRuns[shiftId]) data.communityRuns[shiftId] = [];
    data.communityRuns[shiftId].push({
      stamp: result.stamp,
      actions: result.actions,
      choices: result.choices || {}
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
    return data;
  },

  getCommunityBreakdown(shift) {
    const seed = shift.seedStats || { goldPct: 30, silverPct: 30, bronzePct: 20, crashPct: 20 };
    const data = this.load();
    const localRuns = data.communityRuns[shift.id] || [];
    if (!localRuns.length) return seed;

    // Blend real recorded local runs into the baseline distribution
    const baseWeight = 20;
    const counts = {
      gold: (seed.goldPct / 100) * baseWeight,
      silver: (seed.silverPct / 100) * baseWeight,
      bronze: (seed.bronzePct / 100) * baseWeight,
      crash: (seed.crashPct / 100) * baseWeight
    };
    for (const r of localRuns) {
      if (counts[r.stamp] !== undefined) counts[r.stamp] += 1;
    }
    const total = counts.gold + counts.silver + counts.bronze + counts.crash || 1;
    const goldPct = Math.round((counts.gold / total) * 100);
    const silverPct = Math.round((counts.silver / total) * 100);
    const bronzePct = Math.round((counts.bronze / total) * 100);
    const crashPct = Math.max(0, 100 - goldPct - silverPct - bronzePct);

    return { ...seed, goldPct, silverPct, bronzePct, crashPct };
  }
};
