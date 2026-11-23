import './styles/console.css';
import { FIXED_DT } from './engine/constants.js';
import { SimulationEngine } from './engine/simulation.js';
import { SHIFTS } from './data/shifts.js';
import { getTodayShiftIndex } from './data/daily.js';
import { SoundEngine } from './audio/soundEngine.js';
import { BoardRenderer } from './render/boardRenderer.js';
import { SwitchboardStore } from './services/storage.js';
import { HudController } from './ui/hud.js';
import { ModalController } from './ui/modals.js';
import { CrisisLabController } from './ui/crisisLab.js';

const $ = (id) => document.getElementById(id);

const els = {
  shiftBank: $('shift-bank'),
  hdrCode: $('hdr-code'),
  hdrName: $('hdr-name'),
  streakBadge: $('streak-badge'),
  vfdTrains: $('vfd-trains'),
  vfdActions: $('vfd-actions'),
  vfdPar: $('vfd-par'),
  vfdClock: $('vfd-clock'),
  statusLed: $('status-led'),
  statusText: $('status-text'),
  manifestStrip: $('manifest-strip'),
  btnDispatch: $('btn-dispatch'),
  btnRetry: $('btn-retry'),
  btnClear: $('btn-clear'),
  btnMute: $('btn-mute'),
  btnHelp: $('btn-help'),
  btnLab: $('btn-lab'),
  btnMapQuick: $('btn-map-quick'),
  modeBanner: $('mode-banner'),
  modeBannerText: $('mode-banner-text'),
  btnReplayPause: $('btn-replay-pause'),
  btnExitMode: $('btn-exit-mode'),
  resultOverlay: $('result-overlay'),
  resKicker: $('res-kicker'),
  resTitle: $('res-title'),
  resStamp: $('res-stamp'),
  resDesc: $('res-desc'),
  resActions: $('res-actions'),
  resPar: $('res-par'),
  resTime: $('res-time'),
  resCommunity: $('res-community'),
  resPct: $('res-pct'),
  resBars: $('res-bars'),
  resLegend: $('res-legend'),
  resTicket: $('res-ticket'),
  resButtons: $('res-buttons'),
  helpOverlay: $('help-overlay'),
  labOverlay: $('lab-overlay'),
  labChassis: $('lab-chassis'),
  labTrains: $('lab-trains'),
  labCode: $('lab-code'),
  labVerifyPill: $('lab-verify-pill'),
  toast: $('toast')
};

const sound = new SoundEngine();
const engine = new SimulationEngine(sound);
const canvas = $('board');
const renderer = new BoardRenderer(canvas, engine);
const hud = new HudController(els);

let currentIdx = 0;
let lastResult = null;
let toastTimer = null;

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2300);
}

function setSpeed(spd) {
  engine.speedMult = spd;
  document.querySelectorAll('.speed-opt').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.spd) === spd);
  });
}

function renderShiftBank() {
  const store = SwitchboardStore.load();
  els.streakBadge.textContent = `🔥 ${store.streak}`;
  els.shiftBank.innerHTML = '';

  SHIFTS.forEach((sh, idx) => {
    const btn = document.createElement('button');
    const rec = store.cleared[sh.id];
    btn.className = 'shift-pill' + (idx === currentIdx ? ' active' : '');
    btn.textContent = `0${sh.dayNum}`;
    btn.title = `${sh.code}: ${sh.name}`;
    if (rec) {
      const pip = document.createElement('span');
      pip.className = `pip pip-${rec.stamp}`;
      btn.appendChild(pip);
    }
    btn.onclick = () => selectShift(idx);
    els.shiftBank.appendChild(btn);
  });
}

function exitSpecialModes(showReport = false) {
  renderer.showHeatmap = false;
  if (engine.isReplay) engine.restorePlanSnapshot();
  els.modeBanner.classList.remove('show');
  els.btnReplayPause.style.display = 'none';
  if (showReport && lastResult && lastResult.win) {
    els.resultOverlay.classList.add('show');
  }
  syncAll();
}

function selectShift(idx, customShift = null) {
  currentIdx = customShift ? -1 : idx;
  const def = customShift || SHIFTS[idx];
  renderer.showHeatmap = false;
  els.modeBanner.classList.remove('show');
  els.btnReplayPause.style.display = 'none';
  modals.hideAll();
  engine.loadShift(def);
  renderer.invalidateBackground();
  els.hdrCode.textContent = `${def.code} • PAR ${def.par}`;
  els.hdrName.textContent = def.name;
  lastResult = null;
  renderShiftBank();
  syncAll();
}

function syncAll() {
  const store = SwitchboardStore.load();
  hud.render(engine, store);
  els.btnMapQuick.classList.toggle('lit', renderer.showHeatmap);
  if (engine.isReplay) {
    els.btnReplayPause.textContent = engine.phase === 'PAUSED' ? 'RESUME' : 'PAUSE';
  }
}

const lab = new CrisisLabController(els, { onToast: showToast });

const modals = new ModalController(els, {
  onOpenHeatmap: () => {
    els.resultOverlay.classList.remove('show');
    renderer.showHeatmap = true;
    els.modeBannerText.textContent = '📊 REDDIT SWITCH HEATMAP';
    els.btnReplayPause.style.display = 'none';
    els.modeBanner.classList.add('show');
    syncAll();
  },
  onStartReplay: () => {
    els.resultOverlay.classList.remove('show');
    renderer.showHeatmap = false;
    setSpeed(1);
    const rep = engine.shift.parReplay;
    els.modeBannerText.textContent = `▶ PAR REPLAY • ${rep.author} (${engine.shift.par} ACTIONS)`;
    els.btnReplayPause.style.display = 'inline-flex';
    els.modeBanner.classList.add('show');
    engine.startParReplay();
  },
  onCopyTicket: (ticket) => {
    navigator.clipboard?.writeText(ticket).then(
      () => showToast('Dispatch Ticket copied for Reddit comments!'),
      () => showToast('Select & copy ticket text above.')
    );
  },
  onRetryPlan: () => {
    els.resultOverlay.classList.remove('show');
    engine.restorePlanSnapshot();
  },
  hasNextShift: () => currentIdx >= 0 && currentIdx < SHIFTS.length - 1,
  onNextShift: () => selectShift(currentIdx + 1),
  onReturnToLab: () => {
    els.resultOverlay.classList.remove('show');
    els.labOverlay.classList.add('show');
  }
});

engine.onStateChange = syncAll;
engine.onFinish = (res) => {
  setTimeout(() => {
    if (res.isReplay) {
      showToast(`Par Replay complete (${res.actions} actions)`);
      setTimeout(() => exitSpecialModes(true), 850);
      return;
    }
    lastResult = res;
    if (res.win) {
      if (engine.shift.id.startsWith('custom-')) {
        lab.markVerified(true);
      } else {
        SwitchboardStore.saveResult(engine.shift.id, res);
        renderShiftBank();
      }
    }
    const stats = res.win ? SwitchboardStore.getCommunityBreakdown(engine.shift) : null;
    modals.showResult(engine, res, stats);
  }, res.win ? 250 : 500);
};

/* ── POINTER EVENTS ── */
canvas.addEventListener('pointerdown', (e) => {
  sound.unlock();
  if (engine.isReplay) return;
  const pt = renderer.clientToBoard(e.clientX, e.clientY);
  const hit = renderer.hitTest(pt.x, pt.y);
  if (!hit) return;
  renderer.showIntroHint = false;
  if (hit.type === 'switch') engine.toggleSwitch(hit.id);
  else if (hit.type === 'semaphore') engine.toggleSemaphore(hit.id);
});

canvas.addEventListener('pointermove', (e) => {
  const pt = renderer.clientToBoard(e.clientX, e.clientY);
  renderer.hoverHit = engine.isReplay ? null : renderer.hitTest(pt.x, pt.y);
  canvas.style.cursor = renderer.hoverHit ? 'pointer' : 'default';
});

canvas.addEventListener('pointerleave', () => {
  renderer.hoverHit = null;
});

/* ── DECK & HEADER BINDINGS ── */
els.btnDispatch.onclick = () => {
  sound.unlock();
  renderer.showIntroHint = false;
  if (renderer.showHeatmap) exitSpecialModes(false);
  engine.startOrPause();
};

els.btnRetry.onclick = () => {
  modals.hideAll();
  exitSpecialModes(false);
  engine.restorePlanSnapshot();
  sound.switchClack(false);
};

els.btnClear.onclick = () => {
  modals.hideAll();
  exitSpecialModes(false);
  engine.clearToDefaults();
  showToast('Switches reset to shift defaults');
};

document.querySelectorAll('.speed-opt').forEach((b) => {
  b.onclick = () => setSpeed(Number(b.dataset.spd));
});

els.btnMute.onclick = () => {
  sound.muted = !sound.muted;
  els.btnMute.textContent = sound.muted ? 'MUTE' : 'SFX';
  els.btnMute.classList.toggle('lit', sound.muted);
};

els.btnMapQuick.onclick = () => {
  renderer.showHeatmap = !renderer.showHeatmap;
  els.modeBannerText.textContent = '📊 REDDIT SWITCH HEATMAP';
  els.btnReplayPause.style.display = 'none';
  els.modeBanner.classList.toggle('show', renderer.showHeatmap);
  syncAll();
};

els.btnReplayPause.onclick = () => engine.toggleReplayPause();
els.btnExitMode.onclick = () => exitSpecialModes(true);
els.btnHelp.onclick = () => els.helpOverlay.classList.add('show');
$('btn-close-help').onclick = () => els.helpOverlay.classList.remove('show');
$('btn-help-ok').onclick = () => els.helpOverlay.classList.remove('show');

/* ── CRISIS LAB BINDINGS ── */
els.btnLab.onclick = () => lab.open(currentIdx >= 0 ? currentIdx : 0);
$('btn-close-lab').onclick = () => lab.close();
els.labChassis.onchange = () => lab.populateFromChassis(Number(els.labChassis.value));
$('btn-lab-add').onclick = () => lab.addTrain();
$('btn-lab-export').onclick = () => lab.exportCode();
$('btn-lab-import').onclick = () => lab.importCode();
$('btn-lab-play').onclick = () => {
  const custom = lab.buildCustomShift();
  if (!custom) return;
  lab.close();
  selectShift(-1, custom);
  showToast('Clear your shift once to mark it Verified!');
};

/* ── KEYBOARD SHORTCUTS ── */
window.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

  if (e.key === 'Escape') {
    modals.hideAll();
    if (renderer.showHeatmap || engine.isReplay) exitSpecialModes(false);
    return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
    if (els.resultOverlay.classList.contains('show')) {
      els.resultOverlay.classList.remove('show');
      engine.restorePlanSnapshot();
    } else {
      engine.startOrPause();
    }
    return;
  }

  if (e.key === 'r' || e.key === 'R') {
    modals.hideAll();
    exitSpecialModes(false);
    engine.restorePlanSnapshot();
    return;
  }

  if (e.key === 'c' || e.key === 'C') {
    modals.hideAll();
    exitSpecialModes(false);
    engine.clearToDefaults();
    return;
  }

  if (e.key === 'm' || e.key === 'M') {
    els.btnMute.click();
    return;
  }

  // Number keys 1..9 flip switches S1..S9
  if (/^[1-9]$/.test(e.key) && !engine.isReplay) {
    const switches = engine.shift.nodes.filter((n) => n.type === 'switch');
    const target = switches[Number(e.key) - 1];
    if (target) {
      sound.unlock();
      renderer.showIntroHint = false;
      engine.toggleSwitch(target.id);
    }
  }
});

/* ── MAIN 60HZ FIXED-TIMESTEP LOOP ── */
let lastTs = performance.now();
let acc = 0;

function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  acc += dt * (engine.phase === 'RUNNING' ? engine.speedMult : 1);

  let steps = 0;
  while (acc >= FIXED_DT && steps < 6) {
    engine.step(FIXED_DT);
    acc -= FIXED_DT;
    steps++;
  }

  // Smooth per-frame HUD progress & countdown updates while live
  if (engine.phase === 'RUNNING') {
    syncAll();
  }

  renderer.render(dt);
  requestAnimationFrame(loop);
}

window.addEventListener('resize', () => renderer.resize());

// Boot onto Day #01 (or UTC daily shift if past launch day)
const startShiftIdx = Math.min(SHIFTS.length - 1, getTodayShiftIndex());
selectShift(startShiftIdx);
renderer.resize();
requestAnimationFrame(loop);
