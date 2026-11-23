/**
 * Curated 640x640 daily railway dispatch shifts.
 * Every shift + Par Replay is verified headlessly by `npm run verify`.
 */

export const SHIFTS = [
  /* ── DAY #01: MORNING RUSH (Intro: Brass Switches + 1× Semaphore) ── */
  {
    id: 'day-01',
    dayNum: 1,
    code: 'DAY #01',
    name: 'Morning Rush',
    sector: 'CENTRAL DIAMOND',
    backdrop: 'blocks',
    trees: [
      { x: 148, y: 112, kind: 'sakura' },
      { x: 492, y: 110, kind: 'cedar' },
      { x: 142, y: 525, kind: 'cedar' },
      { x: 498, y: 530, kind: 'sakura' }
    ],
    par: 3,
    hint: 'Flip both brass switches to cross tracks, then set SIG1 to 2s so the trains clear the diamond.',
    nodes: [
      { id: 'P1',   x: 72,  y: 190, type: 'portal',  label: 'W1' },
      { id: 'P2',   x: 72,  y: 450, type: 'portal',  label: 'W2' },
      { id: 'S1',   x: 215, y: 190, type: 'switch',  out: ['e_s1_m1', 'e_s1_m2'], defaultBranch: 0 },
      { id: 'S2',   x: 215, y: 450, type: 'switch',  out: ['e_s2_m1', 'e_s2_m2'], defaultBranch: 1 },
      { id: 'M1',   x: 435, y: 190, type: 'merge',   out: ['e_m1_a'] },
      { id: 'M2',   x: 435, y: 450, type: 'merge',   out: ['e_m2_b'] },
      { id: 'ST_A', x: 568, y: 190, type: 'station', line: 'red',  label: 'KANDA' },
      { id: 'ST_B', x: 568, y: 450, type: 'station', line: 'blue', label: 'GINZA' }
    ],
    edges: [
      { id: 'e_p1_s1', from: 'P1', to: 'S1' },
      { id: 'e_p2_s2', from: 'P2', to: 'S2' },
      { id: 'e_s1_m1', from: 'S1', to: 'M1' },
      { id: 'e_s1_m2', from: 'S1', to: 'M2' },
      { id: 'e_s2_m1', from: 'S2', to: 'M1' },
      { id: 'e_s2_m2', from: 'S2', to: 'M2' },
      { id: 'e_m1_a',  from: 'M1', to: 'ST_A' },
      { id: 'e_m2_b',  from: 'M2', to: 'ST_B' }
    ],
    semaphores: [
      { id: 'SIG1', edgeId: 'e_p2_s2', at: 0.52, defaultHold: 0, side: 1 }
    ],
    trains: [
      { id: 'T1', line: 'blue', portal: 'P1', edgeId: 'e_p1_s1', spawnAt: 0.3, speed: 115, express: false },
      { id: 'T2', line: 'red',  portal: 'P2', edgeId: 'e_p2_s2', spawnAt: 0.3, speed: 115, express: false }
    ],
    parReplay: {
      author: 'u/shinkansen_pro',
      plan: { switches: { S1: 1, S2: 0 }, semaphores: { SIG1: 2 } },
      events: []
    },
    seedStats: {
      goldPct: 52, silverPct: 24, bronzePct: 11, crashPct: 13,
      heatmap: { S1: '96% flipped', S2: '95% flipped', SIG1: '89% held 2s' }
    }
  },

  /* ── DAY #02: SHIBUYA SPLIT (Introduces Copper Auto-Flip ↻ Switch) ── */
  {
    id: 'day-02',
    dayNum: 2,
    code: 'DAY #02',
    name: 'Shibuya Split',
    sector: 'BAYFRONT JUNCTION',
    backdrop: 'bay',
    trees: [
      { x: 145, y: 115, kind: 'cedar' },
      { x: 445, y: 185, kind: 'sakura' },
      { x: 140, y: 550, kind: 'sakura' }
    ],
    par: 3,
    hint: 'S1 is a Copper Auto-Flip (↻) switch — it flips automatically after T1 passes! Aim S2→C, S3→B, and hold SIG1 2s.',
    nodes: [
      { id: 'P1',   x: 68,  y: 200, type: 'portal',  label: 'N1' },
      { id: 'P2',   x: 68,  y: 465, type: 'portal',  label: 'S1' },
      { id: 'S1',   x: 200, y: 200, type: 'switch',  autoFlip: true, out: ['e_s1_a', 'e_s1_s2'], defaultBranch: 0 },
      { id: 'S2',   x: 335, y: 310, type: 'switch',  out: ['e_s2_mb', 'e_s2_mc'], defaultBranch: 0 },
      { id: 'S3',   x: 225, y: 465, type: 'switch',  out: ['e_s3_mb', 'e_s3_mc'], defaultBranch: 1 },
      { id: 'M_B',  x: 465, y: 310, type: 'merge',   out: ['e_mb_b'] },
      { id: 'M_C',  x: 465, y: 465, type: 'merge',   out: ['e_mc_c'] },
      { id: 'ST_A', x: 572, y: 130, type: 'station', line: 'red',   label: 'HARAJUKU' },
      { id: 'ST_B', x: 572, y: 310, type: 'station', line: 'blue',  label: 'SHIBUYA' },
      { id: 'ST_C', x: 572, y: 465, type: 'station', line: 'amber', label: 'EBISU' }
    ],
    edges: [
      { id: 'e_p1_s1', from: 'P1',  to: 'S1' },
      { id: 'e_s1_a',  from: 'S1',  to: 'ST_A', cp: { x: 360, y: 125 } },
      { id: 'e_s1_s2', from: 'S1',  to: 'S2',   cp: { x: 265, y: 285 } },
      { id: 'e_s2_mb', from: 'S2',  to: 'M_B' },
      { id: 'e_s2_mc', from: 'S2',  to: 'M_C' },
      { id: 'e_p2_s3', from: 'P2',  to: 'S3' },
      { id: 'e_s3_mb', from: 'S3',  to: 'M_B' },
      { id: 'e_s3_mc', from: 'S3',  to: 'M_C' },
      { id: 'e_mb_b',  from: 'M_B', to: 'ST_B' },
      { id: 'e_mc_c',  from: 'M_C', to: 'ST_C' }
    ],
    semaphores: [
      { id: 'SIG1', edgeId: 'e_p2_s3', at: 0.50, defaultHold: 0, side: 1 },
      { id: 'SIG2', edgeId: 'e_s1_s2', at: 0.54, defaultHold: 0, side: -1 }
    ],
    trains: [
      { id: 'T1', line: 'red',   portal: 'P1', edgeId: 'e_p1_s1', spawnAt: 0.3, speed: 118, express: false },
      { id: 'T2', line: 'amber', portal: 'P1', edgeId: 'e_p1_s1', spawnAt: 3.8, speed: 118, express: false },
      { id: 'T3', line: 'blue',  portal: 'P2', edgeId: 'e_p2_s3', spawnAt: 4.1, speed: 118, express: false }
    ],
    parReplay: {
      author: 'u/yamanote_ace',
      plan: { switches: { S2: 1, S3: 0 }, semaphores: { SIG1: 2 } },
      events: []
    },
    seedStats: {
      goldPct: 36, silverPct: 28, bronzePct: 16, crashPct: 20,
      heatmap: { S1: '92% kept ↻', S2: '89% → C', S3: '94% → B', SIG1: '78% held 2s', SIG2: '19% held' }
    }
  },

  /* ── DAY #03: MONSOON BYPASS (Express Overtake + Triple Auto-Flip Clockwork) ── */
  {
    id: 'day-03',
    dayNum: 3,
    code: 'DAY #03',
    name: 'Monsoon Bypass',
    sector: 'SUMIDA VIADUCT',
    backdrop: 'river',
    trees: [
      { x: 138, y: 175, kind: 'cedar' },
      { x: 472, y: 120, kind: 'sakura' },
      { x: 145, y: 560, kind: 'cedar' }
    ],
    par: 3,
    hint: 'Shunt slow T1 onto the upper loop (S1→Loop), merge T3 (S3→Up), and hold T3 4s at SIG2 so S2 alternates A→B→A automatically!',
    nodes: [
      { id: 'P1',   x: 66,  y: 295, type: 'portal',  label: 'MAIN' },
      { id: 'P2',   x: 66,  y: 485, type: 'portal',  label: 'SOUTH' },
      { id: 'S1',   x: 176, y: 295, type: 'switch',  autoFlip: true, out: ['e_loop_in', 'e_express'], defaultBranch: 1 },
      { id: 'W1',   x: 315, y: 145, type: 'merge',   out: ['e_loop_out'] },
      { id: 'M1',   x: 435, y: 295, type: 'merge',   out: ['e_m1_s2'] },
      { id: 'S2',   x: 492, y: 295, type: 'switch',  autoFlip: true, out: ['e_s2_a', 'e_s2_b'], defaultBranch: 0 },
      { id: 'S3',   x: 215, y: 485, type: 'switch',  autoFlip: true, out: ['e_s3_m1', 'e_s3_c'], defaultBranch: 1 },
      { id: 'ST_A', x: 574, y: 172, type: 'station', line: 'red',   label: 'TOKYO' },
      { id: 'ST_B', x: 574, y: 392, type: 'station', line: 'blue',  label: 'UENO' },
      { id: 'ST_C', x: 574, y: 495, type: 'station', line: 'amber', label: 'AKIBA' }
    ],
    edges: [
      { id: 'e_p1_s1',    from: 'P1', to: 'S1' },
      { id: 'e_loop_in',  from: 'S1', to: 'W1', cp: { x: 215, y: 155 } },
      { id: 'e_loop_out', from: 'W1', to: 'M1', cp: { x: 405, y: 155 } },
      { id: 'e_express',  from: 'S1', to: 'M1' },
      { id: 'e_m1_s2',    from: 'M1', to: 'S2' },
      { id: 'e_s2_a',     from: 'S2', to: 'ST_A', cp: { x: 530, y: 192 } },
      { id: 'e_s2_b',     from: 'S2', to: 'ST_B', cp: { x: 530, y: 375 } },
      { id: 'e_p2_s3',    from: 'P2', to: 'S3' },
      { id: 'e_s3_m1',    from: 'S3', to: 'M1', cp: { x: 345, y: 415 } },
      { id: 'e_s3_c',     from: 'S3', to: 'ST_C' }
    ],
    semaphores: [
      { id: 'SIG1', edgeId: 'e_loop_out', at: 0.48, defaultHold: 0, side: -1 },
      { id: 'SIG2', edgeId: 'e_s3_m1',    at: 0.46, defaultHold: 0, side: 1 }
    ],
    trains: [
      { id: 'T1', line: 'blue',  portal: 'P1', edgeId: 'e_p1_s1', spawnAt: 0.2, speed: 90,  express: false },
      { id: 'T2', line: 'red',   portal: 'P1', edgeId: 'e_p1_s1', spawnAt: 2.5, speed: 180, express: true  },
      { id: 'T3', line: 'red',   portal: 'P2', edgeId: 'e_p2_s3', spawnAt: 0.5, speed: 110, express: false },
      { id: 'T4', line: 'amber', portal: 'P2', edgeId: 'e_p2_s3', spawnAt: 4.4, speed: 115, express: false }
    ],
    parReplay: {
      author: 'u/express_siding',
      plan: { switches: { S1: 0, S3: 0 }, semaphores: { SIG2: 4 } },
      events: []
    },
    seedStats: {
      goldPct: 24, silverPct: 30, bronzePct: 18, crashPct: 28,
      heatmap: { S1: '86% loop shunt', S2: '91% auto ↻', S3: '84% → M1', SIG1: '18% held', SIG2: '79% held 4s' }
    }
  },

  /* ── DAY #04: THE GOLDEN HOUR (3 Corridors + 5 Trains) ── */
  {
    id: 'day-04',
    dayNum: 4,
    code: 'DAY #04',
    name: 'The Golden Hour',
    sector: 'SHINJUKU EXCHANGE',
    backdrop: 'contours',
    trees: [
      { x: 330, y: 82,  kind: 'sakura' },
      { x: 410, y: 556, kind: 'cedar' },
      { x: 120, y: 562, kind: 'sakura' }
    ],
    par: 4,
    hint: 'Cross T1 & T2 with S1 and S2, hold C1 2s at SIG2, and route T3 up via S4 — the Auto-Flip switches handle wave 2!',
    nodes: [
      { id: 'P1',   x: 64,  y: 145, type: 'portal',  label: 'N1' },
      { id: 'P2',   x: 64,  y: 320, type: 'portal',  label: 'C1' },
      { id: 'P3',   x: 64,  y: 495, type: 'portal',  label: 'S1' },
      { id: 'S1',   x: 190, y: 145, type: 'switch',  autoFlip: true, out: ['e_s1_m1', 'e_s1_m2'], defaultBranch: 0 },
      { id: 'S2',   x: 190, y: 320, type: 'switch',  autoFlip: true, out: ['e_s2_m1', 'e_s2_s3'], defaultBranch: 1 },
      { id: 'S4',   x: 190, y: 495, type: 'switch',  out: ['e_s4_s3', 'e_s4_m3'], defaultBranch: 1 },
      { id: 'S3',   x: 335, y: 405, type: 'switch',  autoFlip: true, out: ['e_s3_m2', 'e_s3_m3'], defaultBranch: 0 },
      { id: 'M1',   x: 460, y: 145, type: 'merge',   out: ['e_m1_a'] },
      { id: 'M2',   x: 460, y: 320, type: 'merge',   out: ['e_m2_b'] },
      { id: 'M3',   x: 460, y: 495, type: 'merge',   out: ['e_m3_c'] },
      { id: 'ST_A', x: 574, y: 145, type: 'station', line: 'red',   label: 'IKEBUKURO' },
      { id: 'ST_B', x: 574, y: 320, type: 'station', line: 'blue',  label: 'SHINJUKU' },
      { id: 'ST_C', x: 574, y: 495, type: 'station', line: 'amber', label: 'NAKANO' }
    ],
    edges: [
      { id: 'e_p1_s1', from: 'P1', to: 'S1' },
      { id: 'e_p2_s2', from: 'P2', to: 'S2' },
      { id: 'e_p3_s4', from: 'P3', to: 'S4' },
      { id: 'e_s1_m1', from: 'S1', to: 'M1' },
      { id: 'e_s1_m2', from: 'S1', to: 'M2' },
      { id: 'e_s2_m1', from: 'S2', to: 'M1' },
      { id: 'e_s2_s3', from: 'S2', to: 'S3' },
      { id: 'e_s4_s3', from: 'S4', to: 'S3' },
      { id: 'e_s4_m3', from: 'S4', to: 'M3' },
      { id: 'e_s3_m2', from: 'S3', to: 'M2' },
      { id: 'e_s3_m3', from: 'S3', to: 'M3' },
      { id: 'e_m1_a',  from: 'M1', to: 'ST_A' },
      { id: 'e_m2_b',  from: 'M2', to: 'ST_B' },
      { id: 'e_m3_c',  from: 'M3', to: 'ST_C' }
    ],
    semaphores: [
      { id: 'SIG1', edgeId: 'e_p1_s1', at: 0.50, defaultHold: 0, side: -1 },
      { id: 'SIG2', edgeId: 'e_p2_s2', at: 0.50, defaultHold: 0, side: 1 }
    ],
    trains: [
      { id: 'T1', line: 'blue',  portal: 'P1', edgeId: 'e_p1_s1', spawnAt: 0.3, speed: 115, express: false },
      { id: 'T2', line: 'red',   portal: 'P2', edgeId: 'e_p2_s2', spawnAt: 0.3, speed: 115, express: false },
      { id: 'T3', line: 'blue',  portal: 'P3', edgeId: 'e_p3_s4', spawnAt: 1.5, speed: 115, express: false },
      { id: 'T4', line: 'amber', portal: 'P2', edgeId: 'e_p2_s2', spawnAt: 4.8, speed: 120, express: false },
      { id: 'T5', line: 'red',   portal: 'P1', edgeId: 'e_p1_s1', spawnAt: 5.0, speed: 155, express: true  }
    ],
    parReplay: {
      author: 'u/golden_signal',
      plan: { switches: { S1: 1, S2: 0, S4: 0 }, semaphores: { SIG2: 2 } },
      events: []
    },
    seedStats: {
      goldPct: 18, silverPct: 29, bronzePct: 22, crashPct: 31,
      heatmap: { S1: '92% → M2', S2: '89% → M1', S3: '85% auto ↻', S4: '94% → B', SIG1: '28% held', SIG2: '72% held 2s' }
    }
  },

  /* ── DAY #05: MIDNIGHT EXPRESS (6-Train Grand Switchyard Finale) ── */
  {
    id: 'day-05',
    dayNum: 5,
    code: 'DAY #05',
    name: 'Midnight Express',
    sector: 'GRAND SWITCHYARD',
    backdrop: 'yard',
    trees: [
      { x: 116, y: 92,  kind: 'cedar' },
      { x: 522, y: 92,  kind: 'sakura' },
      { x: 118, y: 564, kind: 'cedar' },
      { x: 525, y: 564, kind: 'cedar' }
    ],
    par: 5,
    hint: 'Set wave-1 directions on S1, S2, S3, and S5, plus a 2s hold at SIG1 — then watch all 6 trains auto-weave across the yard!',
    nodes: [
      { id: 'P1',   x: 64,  y: 175, type: 'portal',  label: 'N1' },
      { id: 'P2',   x: 64,  y: 330, type: 'portal',  label: 'C1' },
      { id: 'P3',   x: 64,  y: 485, type: 'portal',  label: 'S1' },
      { id: 'S1',   x: 176, y: 175, type: 'switch',  autoFlip: true, out: ['e_top_in', 'e_s1_s2'], defaultBranch: 0 },
      { id: 'W_T',  x: 320, y: 88,  type: 'merge',   out: ['e_top_out'] },
      { id: 'S3',   x: 176, y: 330, type: 'switch',  autoFlip: true, out: ['e_s3_s2', 'e_s3_s4'], defaultBranch: 1 },
      { id: 'S5',   x: 176, y: 485, type: 'switch',  autoFlip: true, out: ['e_s5_s4', 'e_s5_m3'], defaultBranch: 1 },
      { id: 'S2',   x: 322, y: 265, type: 'switch',  autoFlip: true, out: ['e_s2_m1', 'e_s2_m2'], defaultBranch: 0 },
      { id: 'S4',   x: 322, y: 425, type: 'switch',  autoFlip: true, out: ['e_s4_m2', 'e_s4_m3'], defaultBranch: 0 },
      { id: 'M1',   x: 462, y: 175, type: 'merge',   out: ['e_m1_a'] },
      { id: 'M2',   x: 462, y: 330, type: 'merge',   out: ['e_m2_b'] },
      { id: 'M3',   x: 462, y: 485, type: 'merge',   out: ['e_m3_c'] },
      { id: 'ST_A', x: 574, y: 175, type: 'station', line: 'red',   label: 'SHINAGAWA' },
      { id: 'ST_B', x: 574, y: 330, type: 'station', line: 'blue',  label: 'OSAKI' },
      { id: 'ST_C', x: 574, y: 485, type: 'station', line: 'amber', label: 'TAMACHI' }
    ],
    edges: [
      { id: 'e_p1_s1',   from: 'P1',  to: 'S1' },
      { id: 'e_top_in',  from: 'S1',  to: 'W_T', cp: { x: 235, y: 88 } },
      { id: 'e_top_out', from: 'W_T', to: 'M1',  cp: { x: 405, y: 88 } },
      { id: 'e_s1_s2',   from: 'S1',  to: 'S2' },
      { id: 'e_p2_s3',   from: 'P2',  to: 'S3' },
      { id: 'e_s3_s2',   from: 'S3',  to: 'S2' },
      { id: 'e_s3_s4',   from: 'S3',  to: 'S4' },
      { id: 'e_p3_s5',   from: 'P3',  to: 'S5' },
      { id: 'e_s5_s4',   from: 'S5',  to: 'S4' },
      { id: 'e_s5_m3',   from: 'S5',  to: 'M3' },
      { id: 'e_s2_m1',   from: 'S2',  to: 'M1' },
      { id: 'e_s2_m2',   from: 'S2',  to: 'M2' },
      { id: 'e_s4_m2',   from: 'S4',  to: 'M2' },
      { id: 'e_s4_m3',   from: 'S4',  to: 'M3' },
      { id: 'e_m1_a',    from: 'M1',  to: 'ST_A' },
      { id: 'e_m2_b',    from: 'M2',  to: 'ST_B' },
      { id: 'e_m3_c',    from: 'M3',  to: 'ST_C' }
    ],
    semaphores: [
      { id: 'SIG1', edgeId: 'e_p2_s3', at: 0.50, defaultHold: 0, side: 1 },
      { id: 'SIG2', edgeId: 'e_s4_m2', at: 0.48, defaultHold: 0, side: -1 }
    ],
    trains: [
      { id: 'T1', line: 'blue',  portal: 'P1', edgeId: 'e_p1_s1', spawnAt: 0.2, speed: 110, express: false },
      { id: 'T2', line: 'red',   portal: 'P1', edgeId: 'e_p1_s1', spawnAt: 3.1, speed: 175, express: true  },
      { id: 'T3', line: 'red',   portal: 'P2', edgeId: 'e_p2_s3', spawnAt: 0.8, speed: 115, express: false },
      { id: 'T4', line: 'blue',  portal: 'P3', edgeId: 'e_p3_s5', spawnAt: 1.5, speed: 115, express: false },
      { id: 'T5', line: 'amber', portal: 'P2', edgeId: 'e_p2_s3', spawnAt: 5.6, speed: 120, express: false },
      { id: 'T6', line: 'amber', portal: 'P3', edgeId: 'e_p3_s5', spawnAt: 4.8, speed: 130, express: false }
    ],
    parReplay: {
      author: 'u/midnight_chief',
      plan: { switches: { S1: 1, S2: 1, S3: 0, S5: 0 }, semaphores: { SIG1: 2 } },
      events: []
    },
    seedStats: {
      goldPct: 14, silverPct: 25, bronzePct: 23, crashPct: 38,
      heatmap: { S1: '91% → S2', S2: '88% → B', S3: '85% → S2', S4: '90% auto ↻', S5: '92% → S4', SIG1: '84% held 2s', SIG2: '22% held' }
    }
  }
];
