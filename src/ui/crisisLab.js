/**
 * Crisis Lab UGC Builder — create custom schedules on any sector chassis,
 * validate spawn headway spacing, playtest to verify solvability, and
 * generate compact SWB3 share codes for Reddit posts/comments.
 */

import { LINES } from '../engine/constants.js';
import { SHIFTS } from '../data/shifts.js';

export class CrisisLabController {
  constructor(els, callbacks) {
    this.els = els;
    this.cb = callbacks;
    this.draftTrains = [];
    this.verified = false;
  }

  open(defaultChassisIdx = 0) {
    this.els.labChassis.value = String(defaultChassisIdx);
    if (!this.draftTrains.length) {
      this.populateFromChassis(defaultChassisIdx);
    } else {
      this.renderRows();
    }
    this.els.labOverlay.classList.add('show');
  }

  close() {
    this.els.labOverlay.classList.remove('show');
  }

  markVerified(flag) {
    this.verified = flag;
    this.els.labVerifyPill.textContent = flag ? '✓ PLAYTEST VERIFIED' : 'UNVERIFIED (CLEAR TO VERIFY)';
    this.els.labVerifyPill.style.color = flag ? '#246b40' : '#8c4b22';
  }

  populateFromChassis(chassisIdx) {
    const base = SHIFTS[chassisIdx];
    this.draftTrains = base.trains.map((t) => ({
      line: t.line,
      portal: t.portal,
      spawnAt: t.spawnAt,
      express: t.express
    }));
    this.markVerified(false);
    this.renderRows();
  }

  renderRows() {
    const base = SHIFTS[Number(this.els.labChassis.value)];
    const portals = base.nodes.filter((n) => n.type === 'portal');
    const lines = [...new Set(base.nodes.filter((n) => n.type === 'station').map((n) => n.line))];
    this.els.labTrains.innerHTML = '';

    this.draftTrains.forEach((tr, i) => {
      const row = document.createElement('div');
      row.className = 'lab-row';
      row.innerHTML = `
        <strong>T${i + 1}</strong>
        <select data-f="portal">${portals.map((p) => `<option value="${p.id}" ${p.id === tr.portal ? 'selected' : ''}>${p.label || p.id}</option>`).join('')}</select>
        <select data-f="line">${lines.map((l) => `<option value="${l}" ${l === tr.line ? 'selected' : ''}>→${LINES[l].code}</option>`).join('')}</select>
        <input data-f="spawnAt" type="number" step="0.5" min="0.2" max="15" value="${tr.spawnAt}" style="width:52px" />
        <select data-f="express"><option value="0" ${!tr.express ? 'selected' : ''}>Local</option><option value="1" ${tr.express ? 'selected' : ''}>Exp⚡</option></select>
        <button data-del="1" style="border:none;background:none;color:#cf3d2e;font-weight:900;cursor:pointer;">✕</button>
      `;
      row.querySelector('[data-f="portal"]').onchange = (e) => {
        tr.portal = e.target.value;
        this.markVerified(false);
      };
      row.querySelector('[data-f="line"]').onchange = (e) => {
        tr.line = e.target.value;
        this.markVerified(false);
      };
      row.querySelector('[data-f="spawnAt"]').onchange = (e) => {
        tr.spawnAt = Math.max(0.2, Number(e.target.value) || 0.5);
        this.markVerified(false);
      };
      row.querySelector('[data-f="express"]').onchange = (e) => {
        tr.express = e.target.value === '1';
        this.markVerified(false);
      };
      row.querySelector('[data-del]').onclick = () => {
        if (this.draftTrains.length > 1) {
          this.draftTrains.splice(i, 1);
          this.markVerified(false);
          this.renderRows();
        }
      };
      this.els.labTrains.appendChild(row);
    });
  }

  addTrain() {
    if (this.draftTrains.length >= 7) {
      this.cb.onToast('Max 7 trains in Crisis Lab');
      return;
    }
    const base = SHIFTS[Number(this.els.labChassis.value)];
    const portals = base.nodes.filter((n) => n.type === 'portal');
    const stations = base.nodes.filter((n) => n.type === 'station');
    const portal = portals[this.draftTrains.length % portals.length].id;

    // Ensure safe minimum headway (1.6s) on the same portal
    const samePortalTimes = this.draftTrains.filter((t) => t.portal === portal).map((t) => t.spawnAt);
    const nextTime = samePortalTimes.length ? Math.max(...samePortalTimes) + 2.2 : 0.4;

    this.draftTrains.push({
      portal,
      line: stations[this.draftTrains.length % stations.length].line,
      spawnAt: Number(nextTime.toFixed(1)),
      express: false
    });
    this.markVerified(false);
    this.renderRows();
  }

  validateHeadways() {
    const byPortal = new Map();
    for (const t of this.draftTrains) {
      if (!byPortal.has(t.portal)) byPortal.set(t.portal, []);
      byPortal.get(t.portal).push(t.spawnAt);
    }
    for (const [pid, times] of byPortal.entries()) {
      times.sort((a, b) => a - b);
      for (let i = 1; i < times.length; i++) {
        if (times[i] - times[i - 1] < 1.2) {
          return `Trains at ${pid} must depart at least 1.2s apart.`;
        }
      }
    }
    return null;
  }

  buildCustomShift() {
    const err = this.validateHeadways();
    if (err) {
      this.cb.onToast(err);
      return null;
    }
    const idx = Number(this.els.labChassis.value);
    const base = structuredClone(SHIFTS[idx]);
    const pEdge = new Map();
    base.edges.forEach((e) => {
      const from = base.nodes.find((n) => n.id === e.from);
      if (from && from.type === 'portal') pEdge.set(from.id, e.id);
    });

    base.id = `custom-${idx}`;
    base.code = 'CRISIS LAB';
    base.name = `Custom Sector 0${idx + 1}`;
    base.par = Math.max(2, this.draftTrains.length);
    base.hint = 'Player-authored custom crisis.';
    base.seedStats = null;
    base.parReplay = null;
    base.trains = this.draftTrains.map((t, i) => ({
      id: `T${i + 1}`,
      line: t.line,
      portal: t.portal,
      edgeId: pEdge.get(t.portal),
      spawnAt: t.spawnAt,
      speed: t.express ? 175 : 115,
      express: t.express
    }));
    return base;
  }

  exportCode() {
    const payload = {
      c: Number(this.els.labChassis.value),
      v: this.verified ? 1 : 0,
      t: this.draftTrains
    };
    const code = 'SWB3:' + btoa(JSON.stringify(payload));
    this.els.labCode.value = code;
    navigator.clipboard?.writeText(code).then(
      () => this.cb.onToast(this.verified ? 'Verified Shift Code copied!' : 'Draft Shift Code copied!'),
      () => this.cb.onToast('Code generated — copy manually.')
    );
  }

  importCode() {
    try {
      const raw = this.els.labCode.value.trim().replace(/^SWB[123]:/, '');
      const p = JSON.parse(atob(raw));
      if (typeof p.c !== 'number' || !Array.isArray(p.t) || !SHIFTS[p.c]) throw new Error('Invalid');
      this.els.labChassis.value = String(p.c);
      this.draftTrains = p.t;
      this.markVerified(Boolean(p.v));
      this.renderRows();
      this.cb.onToast('Custom Shift loaded!');
    } catch {
      this.cb.onToast('Invalid Shift Code');
    }
  }
}
