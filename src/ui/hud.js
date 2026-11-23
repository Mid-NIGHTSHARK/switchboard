/**
 * Zero-thrash VFD telemetry & in-place patched departure manifest HUD.
 */

import { LINES } from '../engine/constants.js';

export class HudController {
  constructor(els) {
    this.els = els;
    this.cardEls = new Map();
    this.builtShiftKey = '';
  }

  render(engine, storeData) {
    const sh = engine.shift;
    const actions = engine.getTotalActions();

    this.els.vfdTrains.textContent = `${engine.deliveredCount}/${engine.trains.length}`;
    this.els.vfdActions.textContent = `${actions}`;
    this.els.vfdPar.textContent = `/${sh.par}`;
    this.els.vfdActions.className =
      'vfd-val ' + (actions <= sh.par ? 'good' : actions <= sh.par + 2 ? 'warn' : 'bad');
    this.els.vfdClock.textContent = `${engine.clock.toFixed(1).padStart(4, '0')}s`;

    // Status LED
    if (engine.isReplay) {
      this.els.statusLed.className = 'led replay';
      this.els.statusText.textContent = 'PAR REPLAY';
    } else if (engine.phase === 'RUNNING') {
      this.els.statusLed.className = 'led live';
      this.els.statusText.textContent = 'LIVE DISPATCH';
    } else if (engine.phase === 'FAULT') {
      this.els.statusLed.className = 'led fault';
      this.els.statusText.textContent = 'INCIDENT';
    } else {
      this.els.statusLed.className = 'led';
      this.els.statusText.textContent = engine.phase;
    }

    // Dispatch button
    if (engine.isReplay) {
      this.els.btnDispatch.textContent = engine.phase === 'PAUSED' ? '▶ RESUME REPLAY' : '⏸ PAUSE REPLAY';
      this.els.btnDispatch.className = 'btn-dispatch running';
    } else if (engine.phase === 'PLANNING') {
      this.els.btnDispatch.textContent = '▶ DISPATCH';
      this.els.btnDispatch.className = 'btn-dispatch';
    } else if (engine.phase === 'RUNNING') {
      this.els.btnDispatch.textContent = '⏸ PAUSE';
      this.els.btnDispatch.className = 'btn-dispatch running';
    } else if (engine.phase === 'PAUSED') {
      this.els.btnDispatch.textContent = '▶ RESUME';
      this.els.btnDispatch.className = 'btn-dispatch running';
    } else if (engine.phase === 'VICTORY') {
      this.els.btnDispatch.textContent = '✓ CLEARED';
      this.els.btnDispatch.className = 'btn-dispatch success';
    } else {
      this.els.btnDispatch.textContent = '↺ RETRY';
      this.els.btnDispatch.className = 'btn-dispatch';
    }

    const isCleared = Boolean(storeData?.cleared?.[sh.id]) || (engine.phase === 'VICTORY' && !engine.isReplay);
    this.els.btnMapQuick.style.display = isCleared && sh.seedStats ? 'inline-block' : 'none';

    this._syncManifestCards(engine);
  }

  _syncManifestCards(engine) {
    const key = `${engine.shift.id}_${engine.trains.length}`;
    if (this.builtShiftKey !== key) {
      this.builtShiftKey = key;
      this.cardEls.clear();
      this.els.manifestStrip.innerHTML = '';

      for (const tr of engine.trains) {
        const info = LINES[tr.line];
        const card = document.createElement('div');
        card.className = 'manifest-card';
        card.innerHTML = `
          <span class="badge-swatch sw-${tr.line}">${info.code}</span>
          <strong>${tr.id}</strong>
          ${tr.express ? '<span class="exp-pill">EXP</span>' : ''}
          <span class="m-status" style="color:#a79a8b"></span>
          <span class="manifest-prog"></span>
        `;
        this.els.manifestStrip.appendChild(card);
        this.cardEls.set(tr.id, {
          card,
          status: card.querySelector('.m-status'),
          prog: card.querySelector('.manifest-prog')
        });
      }
    }

    for (const tr of engine.trains) {
      const ref = this.cardEls.get(tr.id);
      if (!ref) continue;

      ref.card.className =
        'manifest-card' +
        (tr.state === 'running' ? ' live' : '') +
        (tr.state === 'holding' ? ' holding' : '') +
        (tr.state === 'queued' ? ' queued' : '') +
        (tr.state === 'arrived' ? ' arrived' : '') +
        (tr.state === 'crashed' ? ' crashed' : '');

      ref.status.textContent =
        tr.state === 'arrived' ? 'DOCKED' :
        tr.state === 'crashed' ? 'FAULT' :
        tr.state === 'holding' ? `HOLD ${tr.holdRemaining.toFixed(1)}s` :
        tr.state === 'queued' ? 'QUEUED' :
        tr.state === 'running' ? 'EN ROUTE' :
        `T+${tr.spawnAt.toFixed(1)}s`;

      const pct =
        tr.state === 'arrived' ? 100 :
        tr.state === 'waiting' ? Math.min(22, (engine.clock / Math.max(0.1, tr.spawnAt)) * 22) :
        Math.min(95, 22 + (tr.totalDist / 540) * 73);
      ref.prog.style.width = `${pct.toFixed(0)}%`;
    }
  }
}
