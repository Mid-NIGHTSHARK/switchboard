/**
 * Headless 60Hz verifier for SWITCHBOARD.
 * Runs every shift's Par Replay deterministically in Node and fails non-zero
 * if any shift collides, misroutes, stalls, or exceeds Par actions.
 *
 * Usage: npm run verify
 */

import { FIXED_DT } from '../src/engine/constants.js';
import { SimulationEngine } from '../src/engine/simulation.js';
import { SHIFTS } from '../src/data/shifts.js';

let passed = 0;
let failed = 0;

console.log('\n🚂 SWITCHBOARD — Headless 60Hz Shift Verifier\n');

for (const shift of SHIFTS) {
  const engine = new SimulationEngine();
  engine.loadShift(shift);

  let outcome = null;
  engine.onFinish = (res) => {
    outcome = res;
  };

  if (!engine.startParReplay()) {
    console.error(`❌ ${shift.code} (${shift.name}): Missing parReplay definition`);
    failed++;
    continue;
  }

  // Simulate up to 45 simulated seconds at exact 60Hz
  const maxSteps = 45 * 60;
  for (let i = 0; i < maxSteps && !outcome; i++) {
    engine.step(FIXED_DT);
  }

  if (!outcome) {
    console.error(`❌ ${shift.code} (${shift.name}): Timed out (>45s) — delivered ${engine.deliveredCount}/${engine.trains.length}`);
    failed++;
  } else if (!outcome.win) {
    console.error(`❌ ${shift.code} (${shift.name}): ${outcome.title} — ${outcome.message}`);
    failed++;
  } else if (outcome.actions > shift.par) {
    console.error(`❌ ${shift.code} (${shift.name}): Cleared in ${outcome.actions} actions (exceeds Par ${shift.par})`);
    failed++;
  } else {
    console.log(
      `✅ ${shift.code} — ${shift.name.padEnd(18)} | ${outcome.stamp.toUpperCase().padEnd(4)} | ` +
      `Actions: ${outcome.actions}/${shift.par} | Time: ${outcome.time.toFixed(2)}s | ` +
      `Crossings: ${engine.crossings.length}`
    );
    passed++;
  }
}

console.log(`\nResult: ${passed}/${SHIFTS.length} shifts verified.`);
if (failed > 0) {
  process.exit(1);
}
