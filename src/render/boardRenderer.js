/**
 * 60fps dynamic board renderer: animated water shimmer, swaying trees,
 * pivoting brass & copper Auto-Flip (↻) switch rail blades, planning ribbons,
 * one-shot semaphores, articulated trains, and Reddit switch heatmaps.
 */

import { BOARD_H, BOARD_W, HIT_RADIUS, LINES } from '../engine/constants.js';
import { TrackMath } from '../engine/trackMath.js';
import { buildStaticDiorama, drawShapeEmblem, roundRect } from './terrain.js';

export class BoardRenderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.dpr = 1;
    this.hoverHit = null;
    this.showHeatmap = false;
    this.showIntroHint = true;
    this.bgCache = document.createElement('canvas');
    this.bgKey = '';
    this.animTime = 0;
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * this.dpr));

    const pad = 8;
    const aw = Math.max(100, rect.width - pad * 2);
    const ah = Math.max(100, rect.height - pad * 2);
    this.scale = Math.min(aw / BOARD_W, ah / BOARD_H);
    this.offsetX = (rect.width - BOARD_W * this.scale) / 2;
    this.offsetY = (rect.height - BOARD_H * this.scale) / 2;
  }

  clientToBoard(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (cx - r.left - this.offsetX) / this.scale,
      y: (cy - r.top - this.offsetY) / this.scale
    };
  }

  hitTest(bx, by) {
    for (const n of this.engine.shift.nodes) {
      if (n.type === 'switch' && Math.hypot(bx - n.x, by - n.y) <= HIT_RADIUS) {
        return { type: 'switch', id: n.id, node: n };
      }
    }
    for (const s of this.engine.semaphores) {
      if (
        Math.hypot(bx - s.boxX, by - s.boxY) <= HIT_RADIUS ||
        Math.hypot(bx - s.x, by - s.y) <= 22
      ) {
        return { type: 'semaphore', id: s.id, sem: s };
      }
    }
    return null;
  }

  invalidateBackground() {
    this.bgKey = '';
  }

  _ensureCache() {
    const key = `${this.engine.shift.id}_${this.engine.shift.edges.length}`;
    if (this.bgKey === key) return;
    this.bgKey = key;
    buildStaticDiorama(this.bgCache, this.engine);
  }

  _strokeEdge(c, edge, color, width) {
    const a = this.engine.nodeMap.get(edge.from);
    const b = this.engine.nodeMap.get(edge.to);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.quadraticCurveTo(edge._cp.x, edge._cp.y, b.x, b.y);
    c.stroke();
  }

  render(dt) {
    this.animTime += dt;
    this._ensureCache();

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const vw = this.canvas.width / this.dpr;
    const vh = this.canvas.height / this.dpr;
    ctx.clearRect(0, 0, vw, vh);

    let sx = 0;
    let sy = 0;
    if (this.engine.shakeTimer > 0) {
      const mag = this.engine.shakeTimer * 18;
      sx = (Math.random() - 0.5) * mag;
      sy = (Math.random() - 0.5) * mag;
    }

    ctx.translate(this.offsetX + sx, this.offsetY + sy);
    ctx.scale(this.scale, this.scale);

    // 1. Static cached diorama
    ctx.drawImage(this.bgCache, 0, 0, BOARD_W, BOARD_H);

    // 2. Subtle animated water ripples & swaying diorama trees
    this._drawAmbientLife(ctx);

    // 3. Active switch branch highlights + hover alternate preview
    for (const n of this.engine.shift.nodes) {
      if (n.type !== 'switch') continue;
      const activeEdge = this.engine.edgeMap.get(n.out[n.branch]);
      if (activeEdge) {
        this._strokeEdge(ctx, activeEdge, 'rgba(201, 151, 62, 0.25)', 11);
      }
      if (this.hoverHit && this.hoverHit.id === n.id && this.engine.phase !== 'VICTORY') {
        const altEdge = this.engine.edgeMap.get(n.out[(n.branch + 1) % n.out.length]);
        if (altEdge) {
          ctx.save();
          ctx.setLineDash([5, 7]);
          this._strokeEdge(ctx, altEdge, 'rgba(201, 151, 62, 0.58)', 3.2);
          ctx.restore();
        }
      }
    }

    // 4. Planning-phase live route preview ribbons
    if (this.engine.phase === 'PLANNING') {
      const seenPortals = new Set();
      for (const tr of this.engine.shift.trains) {
        if (seenPortals.has(tr.portal)) continue;
        seenPortals.add(tr.portal);
        const trace = this.engine.traceFromPortal(tr.portal);
        if (!trace) continue;
        const isMatch = trace.destStation && trace.destStation.line === trace.line;
        ctx.save();
        ctx.strokeStyle = LINES[trace.line].color;
        ctx.globalAlpha = isMatch ? 0.55 : 0.34;
        ctx.lineWidth = isMatch ? 3.2 : 2.6;
        ctx.setLineDash([7, 11]);
        ctx.lineDashOffset = -this.animTime * 46;
        for (const e of trace.edges) {
          const a = this.engine.nodeMap.get(e.from);
          const b = this.engine.nodeMap.get(e.to);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(e._cp.x, e._cp.y, b.x, b.y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 5. Station arrival glow halos
    for (const n of this.engine.shift.nodes) {
      if (n.type === 'station' && n.dockGlow > 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(94, 227, 140, ${n.dockGlow * 0.85})`;
        ctx.lineWidth = 4;
        roundRect(ctx, n.x - 29, n.y - 31, 62, 62, 10);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 6. Portal departure queues
    this._drawPortalQueues(ctx);

    // 7. Interactive Brass & Copper Auto-Flip (↻) Switches
    for (const n of this.engine.shift.nodes) {
      if (n.type === 'switch') this._drawSwitch(ctx, n);
    }

    // 8. One-Shot Semaphores
    for (const sem of this.engine.semaphores) this._drawSemaphore(ctx, sem);

    // 9. Articulated Trains
    for (const tr of this.engine.trains) {
      if (['running', 'holding', 'queued', 'crashed'].includes(tr.state)) {
        this._drawTrain(ctx, tr);
      }
    }

    // 10. Ripples, Sparks & Floating Badges
    for (const r of this.engine.ripples) {
      const p = r.t / r.dur;
      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = 1 - p;
      ctx.lineWidth = 3 * (1 - p);
      ctx.beginPath();
      ctx.arc(r.x, r.y, 12 + r.maxR * p, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const p of this.engine.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const f of this.engine.floaters) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.life / (f.maxLife * 0.4));
      ctx.font = '900 10px ui-monospace, monospace';
      const w = ctx.measureText(f.text).width + 10;
      ctx.fillStyle = f.color;
      roundRect(ctx, f.x - w / 2, f.y - 9, w, 17, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }

    // 11. Collision Crosshair
    if (this.engine.phase === 'FAULT' && this.engine.faultInfo) {
      const { x, y } = this.engine.faultInfo;
      const pulse = 1 + Math.sin(this.animTime * 12) * 0.14;
      ctx.save();
      ctx.fillStyle = 'rgba(207, 61, 46, 0.2)';
      ctx.beginPath(); ctx.arc(x, y, 26 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#cf3d2e';
      ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.arc(x, y, 21 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#cf3d2e';
      ctx.font = '900 16px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✕', x, y + 1);
      ctx.restore();
    }

    // 12. Diegetic Onboarding Callouts on Day #01
    if (this.showIntroHint && this.engine.shift.id === 'day-01' && this.engine.phase === 'PLANNING') {
      const s1 = this.engine.nodeMap.get('S1');
      const sig = this.engine.semaphores[0];
      if (s1) this._drawCallout(ctx, s1.x, s1.y - 44, '1. FLIP SWITCHES', s1.x, s1.y);
      if (sig) this._drawCallout(ctx, sig.boxX + 36, sig.boxY + 26, '2. HOLD 2s', sig.boxX, sig.boxY);
    }

    // 13. Post-Solve Reddit Switch Heatmap Overlay
    if (this.showHeatmap && this.engine.shift.seedStats?.heatmap) {
      this._drawHeatmapOverlay(ctx, this.engine.shift.seedStats.heatmap);
    }

    ctx.restore();
  }

  _drawAmbientLife(ctx) {
    // Water shimmer lines for river/bay sectors
    if (this.engine.shift.backdrop === 'river') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) {
        const y = ((this.animTime * 22 + i * 155) % 580) + 30;
        const x = 312 + Math.sin(y * 0.015) * 14;
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.quadraticCurveTo(x, y - 3, x + 10, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Gently swaying miniature diorama trees
    const trees = this.engine.shift.trees || [];
    for (let i = 0; i < trees.length; i++) {
      const tr = trees[i];
      const sway = Math.sin(this.animTime * 1.8 + i * 1.7) * 1.6;
      ctx.save();
      ctx.translate(tr.x, tr.y);
      ctx.fillStyle = 'rgba(24, 18, 12, 0.14)';
      ctx.beginPath();
      ctx.ellipse(2, 5, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(sway, 0);
      if (tr.kind === 'sakura') {
        ctx.fillStyle = '#e7a4b0';
        ctx.beginPath(); ctx.arc(-4, -2, 7.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f2bcc6';
        ctx.beginPath(); ctx.arc(4, -3, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#dc8d9c';
        ctx.beginPath(); ctx.arc(0, 2, 7.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#4f7356';
        ctx.beginPath(); ctx.arc(0, 0, 10.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#688f6f';
        ctx.beginPath(); ctx.arc(-2, -2, 6.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  _drawCallout(ctx, tx, ty, label, ringX, ringY) {
    const pulse = 22 + Math.sin(this.animTime * 5) * 3.5;
    ctx.save();
    ctx.strokeStyle = '#cf3d2e';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(ringX, ringY, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '800 9.5px ui-monospace, monospace';
    const w = ctx.measureText(label).width + 14;
    ctx.fillStyle = '#1f1b17';
    roundRect(ctx, tx - w / 2, ty - 10, w, 20, 4);
    ctx.fill();
    ctx.strokeStyle = '#e5b860';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#faf5ea';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, tx, ty + 0.5);
    ctx.restore();
  }

  _drawPortalQueues(ctx) {
    const byPortal = new Map();
    for (const tr of this.engine.trains) {
      if (tr.state === 'waiting') {
        if (!byPortal.has(tr.portal)) byPortal.set(tr.portal, []);
        byPortal.get(tr.portal).push(tr);
      }
    }
    for (const [pid, list] of byPortal.entries()) {
      const p = this.engine.nodeMap.get(pid);
      if (!p) continue;
      const trace = this.engine.phase === 'PLANNING' ? this.engine.traceFromPortal(pid) : null;

      list.slice(0, 2).forEach((tr, idx) => {
        const rem = Math.max(0, tr.spawnAt - this.engine.clock);
        const bx = Math.max(54, p.x + 12);
        const by = p.y - 34 - idx * 21;
        const info = LINES[tr.line];
        const matchIcon = idx === 0 && trace?.destStation
          ? (trace.destStation.line === tr.line ? ' ✓' : ' !')
          : '';

        ctx.save();
        ctx.fillStyle = info.color;
        roundRect(ctx, bx - 32, by - 9.5, 64, 19, 4);
        ctx.fill();
        ctx.strokeStyle = '#1c1814';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '800 9.5px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tag = tr.express ? '⚡' : '';
        ctx.fillText(`${tag}${info.code} ${rem.toFixed(1)}s${matchIcon}`, bx, by + 0.5);
        ctx.restore();
      });
    }
  }

  _drawSwitch(ctx, n) {
    const isHovered = this.hoverHit && this.hoverHit.id === n.id;
    const isOccupied = this.engine.phase === 'RUNNING' && this.engine.isSwitchOccupied(n);
    const isChanged = n.branch !== (n.defaultBranch ?? 0);
    const isAuto = Boolean(n.autoFlip);

    const e0 = this.engine.edgeMap.get(n.out[0]);
    const e1 = this.engine.edgeMap.get(n.out[1]);
    const a0 = TrackMath.sampleEdge(e0, 26).angle;
    const a1 = TrackMath.sampleEdge(e1, 26).angle;
    let da = a1 - a0;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    const curAngle = a0 + da * n.animBranch;

    ctx.save();
    ctx.translate(n.x, n.y);

    if (isHovered || isChanged) {
      ctx.fillStyle = isHovered ? 'rgba(201, 151, 62, 0.36)' : 'rgba(201, 151, 62, 0.16)';
      ctx.beginPath();
      ctx.arc(0, 0, isHovered ? 27 : 22, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shadow
    ctx.fillStyle = 'rgba(20, 15, 10, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 2, 17.5, 0, Math.PI * 2);
    ctx.fill();

    // Housing (Warm Copper for Auto-Flip ↻, Charcoal for manual)
    ctx.fillStyle = n.lockFlash > 0 ? '#cf3d2e' : (isOccupied ? '#6d645a' : (isAuto ? '#472b1b' : '#25201b'));
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isOccupied ? '#9c9082' : (isAuto ? '#eb9c5c' : (isChanged ? '#f0ca75' : '#c9973e'));
    ctx.lineWidth = isChanged ? 3 : 2.2;
    ctx.stroke();

    // Pivoting switch blade arrow
    ctx.save();
    ctx.rotate(curAngle);
    ctx.strokeStyle = '#faf5ea';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(9, 0);
    ctx.stroke();

    ctx.fillStyle = isOccupied ? '#bfb3a4' : (isAuto ? '#ffbe85' : '#f0ca75');
    ctx.beginPath();
    ctx.moveTo(13.5, 0);
    ctx.lineTo(4.5, -5.8);
    ctx.lineTo(4.5, 5.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Auto-Flip (↻) miniature badge at top-right of housing
    if (isAuto) {
      ctx.fillStyle = '#d97b38';
      ctx.beginPath();
      ctx.arc(13, -13, 6.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e1610';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '900 8.5px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↻', 13, -12.6);
    }

    ctx.restore();

    // Stencil ID
    ctx.fillStyle = isAuto ? '#8f4c1e' : '#5c5145';
    ctx.font = '800 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isAuto ? `${n.id}↻` : n.id, n.x, n.y + 28);
  }

  _drawSemaphore(ctx, sem) {
    const isHovered = this.hoverHit && this.hoverHit.id === sem.id;
    const hold = sem.holdSeconds;
    const isSpent = sem.spent;
    const color = isSpent || hold === 0 ? '#2e8552' : hold === 2 ? '#d98a18' : '#cf3d2e';

    ctx.save();

    // Track stop-bar
    ctx.save();
    ctx.translate(sem.x, sem.y);
    ctx.rotate(sem.angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(0, 11);
    ctx.stroke();
    ctx.restore();

    // Connecting mast from track to normal-offset box
    ctx.strokeStyle = '#241f1a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(sem.x, sem.y);
    ctx.lineTo(sem.boxX, sem.boxY);
    ctx.stroke();

    ctx.translate(sem.boxX, sem.boxY);
    if (isHovered) {
      ctx.fillStyle = 'rgba(201, 151, 62, 0.3)';
      roundRect(ctx, -24, -14, 48, 28, 7);
      ctx.fill();
    }

    ctx.fillStyle = '#211d1a';
    roundRect(ctx, -21, -10.5, 42, 21, 5);
    ctx.fill();
    ctx.strokeStyle = !isSpent && hold > 0 ? color : '#7a7064';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(-11, 0, 4.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#faf5ea';
    ctx.font = '800 9.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lbl = isSpent || hold === 0 ? 'GO' : `${hold}s`;
    ctx.fillText(lbl, 6, 0.5);

    ctx.restore();
  }

  _drawTrain(ctx, tr) {
    const info = LINES[tr.line];
    const pts = tr.points;
    if (!pts.length) return;

    // Coupler bars
    if (pts.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#1f1a16';
      ctx.lineWidth = 3.5;
      for (let i = 0; i < pts.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (let i = pts.length - 1; i >= 0; i--) {
      const pt = pts[i];
      const isHead = i === 0;
      const isTail = i === pts.length - 1;
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.angle);

      if (isHead && tr.state !== 'crashed') {
        const grad = ctx.createLinearGradient(10, 0, 46, 0);
        grad.addColorStop(0, 'rgba(255, 240, 175, 0.52)');
        grad.addColorStop(1, 'rgba(255, 240, 175, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(10, -4); ctx.lineTo(46, -14); ctx.lineTo(46, 14); ctx.lineTo(10, 4);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(18, 13, 8, 0.28)';
      roundRect(ctx, -10, -4.5, 21, 13, 3);
      ctx.fill();

      ctx.fillStyle = info.color;
      if (isHead && tr.express) {
        ctx.beginPath();
        ctx.moveTo(-10, -6.5);
        ctx.lineTo(6, -6.5);
        ctx.quadraticCurveTo(16, 0, 6, 6.5);
        ctx.lineTo(-10, 6.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1b1714';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = '#f5cb69';
        ctx.fillRect(-9, -1.5, 16, 3);
        ctx.fillStyle = '#1f2833';
        ctx.beginPath();
        ctx.ellipse(5, 0, 2.4, 3.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        roundRect(ctx, -10, -6.5, 20, 13, isHead ? 4 : 2.5);
        ctx.fill();
        ctx.strokeStyle = '#1b1714';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = isHead ? '#faf5ea' : info.light;
        roundRect(ctx, -6.5, -3.2, 13, 6.4, 1.5);
        ctx.fill();
        if (i === 1 && tr.express) {
          ctx.strokeStyle = '#2d2722';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(-4, 0); ctx.lineTo(0, -3.5); ctx.lineTo(4, 0); ctx.lineTo(0, 3.5);
          ctx.closePath();
          ctx.stroke();
        }
      }

      if (isTail && tr.state !== 'crashed') {
        ctx.fillStyle = '#ff6b5e';
        ctx.beginPath(); ctx.arc(-9.5, -3, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-9.5,  3, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // Colorblind-safe shape emblem + countdown ring above locomotive
    const h = pts[0];
    if (tr.state === 'holding' && tr.holdDuration > 0) {
      const frac = Math.max(0, tr.holdRemaining / tr.holdDuration);
      ctx.save();
      ctx.translate(h.x, h.y - 22);
      ctx.fillStyle = 'rgba(24, 20, 16, 0.92)';
      ctx.beginPath(); ctx.arc(0, 0, 11.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffbe55';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, 9.2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '800 8px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tr.holdRemaining.toFixed(1), 0, 0.5);
      ctx.restore();
    } else if (tr.state === 'running' || tr.state === 'queued') {
      drawShapeEmblem(ctx, info.shape, h.x, h.y - 16, 6.5, info.color, '#faf5ea');
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.font = '900 7.5px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(info.code, h.x, h.y - (info.shape === 'triangle' ? 14.5 : 15.8));
      ctx.restore();
    }
  }

  _drawHeatmapOverlay(ctx, heatmap) {
    ctx.save();
    ctx.fillStyle = 'rgba(24, 20, 16, 0.36)';
    roundRect(ctx, 10, 10, BOARD_W - 20, BOARD_H - 20, 9);
    ctx.fill();

    const drawPill = (x, y, text) => {
      ctx.font = '800 10px ui-monospace, monospace';
      const w = ctx.measureText(text).width + 14;
      ctx.fillStyle = '#1c1814';
      roundRect(ctx, x - w / 2, y - 38, w, 20, 4);
      ctx.fill();
      ctx.strokeStyle = '#f0ca75';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#ffe5a3';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y - 28);
    };
    for (const n of this.engine.shift.nodes) if (heatmap[n.id]) drawPill(n.x, n.y, heatmap[n.id]);
    for (const s of this.engine.semaphores) if (heatmap[s.id]) drawPill(s.boxX, s.boxY + 12, heatmap[s.id]);
    ctx.restore();
  }
}
