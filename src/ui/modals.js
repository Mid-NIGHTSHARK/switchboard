/**
 * Victory / Incident stamp card, Reddit Dispatch Ticket formatter,
 * and Operator Manual modal controller.
 */

import { LINES } from '../engine/constants.js';
import { getTodayUtcDateKey } from '../data/daily.js';

export class ModalController {
  constructor(els, callbacks) {
    this.els = els;
    this.cb = callbacks;
  }

  buildTicket(engine, res) {
    const sh = engine.shift;
    const medal = res.stamp === 'gold' ? '🥇 GOLD' : res.stamp === 'silver' ? '🥈 SILVER' : '🥉 BRONZE';
    const pips = engine.trains.map((t) => LINES[t.line].emoji).join('');
    const dateTag = getTodayUtcDateKey();
    return `🚂 SWITCHBOARD ${sh.code} (${dateTag})\n${sh.name} • ${medal}\n${res.actions} Actions (Par ${res.par}) • ${res.time.toFixed(1)}s\n${pips} 0 Crashes • r/Switchboard`;
  }

  showResult(engine, res, communityStats) {
    const sh = engine.shift;
    this.els.resKicker.textContent = `${sh.code} • ${sh.name.toUpperCase()}`;
    this.els.resActions.textContent = res.actions;
    this.els.resPar.textContent = res.par;
    this.els.resTime.textContent = `${res.time.toFixed(1)}s`;

    if (res.win) {
      this.els.resTitle.textContent = 'SHIFT CLEARED';
      this.els.resStamp.textContent = `${res.stamp.toUpperCase()} STAMP`;
      this.els.resStamp.className = `stamp stamp-${res.stamp}`;
      this.els.resDesc.textContent =
        res.stamp === 'gold'
          ? 'Precision dispatch. Every train docked safely at or under Par interventions.'
          : `All trains delivered safely! Shave off ${res.actions - res.par} action(s) to earn the Gold Stamp.`;

      if (communityStats) {
        this.els.resCommunity.style.display = 'block';
        const c = communityStats;
        const pct =
          res.stamp === 'gold' ? `TOP ${Math.max(4, Math.round(c.goldPct * 0.55))}%` :
          res.stamp === 'silver' ? `TOP ${c.goldPct + Math.round(c.silverPct * 0.5)}%` :
          `TOP ${c.goldPct + c.silverPct + Math.round(c.bronzePct * 0.6)}%`;
        this.els.resPct.textContent = pct;
        this.els.resBars.innerHTML = `
          <div class="bar-g" style="width:${c.goldPct}%"></div>
          <div class="bar-s" style="width:${c.silverPct}%"></div>
          <div class="bar-b" style="width:${c.bronzePct}%"></div>
          <div class="bar-c" style="width:${c.crashPct}%"></div>`;
        this.els.resLegend.innerHTML = `<span>🥇 ${c.goldPct}%</span><span>🥈 ${c.silverPct}%</span><span>🥉 ${c.bronzePct}%</span><span>💥 ${c.crashPct}%</span>`;
      } else {
        this.els.resCommunity.style.display = 'none';
      }

      const ticket = this.buildTicket(engine, res);
      this.els.resTicket.style.display = 'block';
      this.els.resTicket.textContent = ticket;

      this.els.resButtons.innerHTML = '';

      if (communityStats) {
        const hm = document.createElement('button');
        hm.className = 'btn-paper brass';
        hm.textContent = '📊 REDDIT HEATMAP';
        hm.onclick = () => this.cb.onOpenHeatmap();
        this.els.resButtons.appendChild(hm);
      }

      if (sh.parReplay) {
        const rep = document.createElement('button');
        rep.className = 'btn-paper';
        rep.textContent = '▶ WATCH PAR REPLAY';
        rep.onclick = () => this.cb.onStartReplay();
        this.els.resButtons.appendChild(rep);
      }

      const cp = document.createElement('button');
      cp.className = 'btn-paper';
      cp.textContent = 'COPY TICKET';
      cp.onclick = () => this.cb.onCopyTicket(ticket);
      this.els.resButtons.appendChild(cp);

      const opt = document.createElement('button');
      opt.className = 'btn-paper';
      opt.textContent = 'OPTIMIZE ↺';
      opt.onclick = () => this.cb.onRetryPlan();
      this.els.resButtons.appendChild(opt);

      if (this.cb.hasNextShift()) {
        const nxt = document.createElement('button');
        nxt.className = 'btn-paper primary span2';
        nxt.textContent = `NEXT DAILY SHIFT →`;
        nxt.onclick = () => this.cb.onNextShift();
        this.els.resButtons.appendChild(nxt);
      } else if (sh.id.startsWith('custom-')) {
        const backLab = document.createElement('button');
        backLab.className = 'btn-paper primary span2';
        backLab.textContent = 'RETURN TO LAB & COPY VERIFIED CODE';
        backLab.onclick = () => this.cb.onReturnToLab();
        this.els.resButtons.appendChild(backLab);
      }
    } else {
      this.els.resTitle.textContent = res.title || 'DISPATCH FAULT';
      this.els.resStamp.textContent = 'INCIDENT';
      this.els.resStamp.className = 'stamp stamp-fault';
      this.els.resDesc.textContent = `${res.message} Tip: ${sh.hint}`;
      this.els.resCommunity.style.display = 'none';
      this.els.resTicket.style.display = 'none';

      this.els.resButtons.innerHTML = '';
      const retry = document.createElement('button');
      retry.className = 'btn-paper primary span2';
      retry.textContent = '↺ TWEAK PLAN & RETRY';
      retry.onclick = () => this.cb.onRetryPlan();
      this.els.resButtons.appendChild(retry);
    }

    this.els.resultOverlay.classList.add('show');
  }

  hideAll() {
    this.els.resultOverlay.classList.remove('show');
    this.els.helpOverlay.classList.remove('show');
    this.els.labOverlay.classList.remove('show');
  }
}
