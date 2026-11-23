/**
 * Pure headless 60Hz deterministic simulation engine for SWITCHBOARD.
 * Zero DOM/WebAudio dependencies so it runs identically in browser and Node verifier.
 *
 * Key mechanics:
 * - Standard brass switches & Copper Auto-Flip (↻) switches (auto-flip 0-cost after 1 train clears)
 * - One-Shot semaphores (GO / 2s 1× / 4s 1×) that clear automatically after holding one train
 * - Safe block queuing behind holding/queued trains on the same track segment
 */

import {
  AUTO_FLIP_CLEAR_DIST,
  CAR_COUNT,
  CAR_SPACING,
  COLLISION_DIST,
  HOLD_CYCLE,
  LINES,
  QUEUE_GAP,
  SWITCH_LOCK_RADIUS
} from './constants.js';
import { TrackMath } from './trackMath.js';

const NOOP_SOUND = {
  switchClack() {},
  autoFlipClick() {},
  lockedClunk() {},
  semaphoreClick() {},
  dispatchChime() {},
  expressHorn() {},
  railClackTick() {},
  brakeHiss() {},
  stationArrive() {},
  crash() {},
  stampThud() {}
};

export class SimulationEngine {
  constructor(sound = null) {
    this.sound = sound || NOOP_SOUND;
    this.shift = null;
    this.nodeMap = new Map();
    this.edgeMap = new Map();
    this.semaphores = [];
    this.crossings = [];
    this.trains = [];
    this.particles = [];
    this.ripples = [];
    this.floaters = [];

    this.phase = 'PLANNING'; // PLANNING | RUNNING | PAUSED | VICTORY | FAULT
    this.isReplay = false;
    this.replayQueue = [];
    this.clock = 0;
    this.speedMult = 1;
    this.liveActions = 0;
    this.planSnapshot = null;
    this.faultInfo = null;
    this.deliveredCount = 0;
    this.shakeTimer = 0;

    this.onStateChange = null;
    this.onFinish = null;
  }

  loadShift(shiftDef) {
    this.shift = structuredClone(shiftDef);
    this.nodeMap.clear();
    this.edgeMap.clear();
    this.isReplay = false;
    this.replayQueue = [];

    for (const n of this.shift.nodes) {
      n.branch = n.defaultBranch ?? 0;
      n.animBranch = n.branch;
      n.lockFlash = 0;
      n.dockGlow = 0;
      n._pendingAutoFlips = [];
      this.nodeMap.set(n.id, n);
    }

    for (const e of this.shift.edges) {
      const built = TrackMath.buildEdgeLUT(e, this.nodeMap);
      e._lut = built.lut;
      e._length = built.length;
      e._cp = built.cp;
      this.edgeMap.set(e.id, e);
    }

    this.crossings = TrackMath.findDiamondCrossings(this.shift.edges);

    this.semaphores = this.shift.semaphores.map((s) => {
      const edge = this.edgeMap.get(s.edgeId);
      const sPos = edge._length * s.at;
      const pos = TrackMath.sampleEdge(edge, sPos);
      // Explicit normal offset keeps signal boxes off neighboring tracks
      const side = s.side ?? -1;
      const nx = -Math.sin(pos.angle) * side;
      const ny = Math.cos(pos.angle) * side;
      const boxDist = 28;
      return {
        ...s,
        holdSeconds: s.defaultHold ?? 0,
        spent: false,
        sPos,
        x: pos.x,
        y: pos.y,
        angle: pos.angle,
        boxX: pos.x + nx * boxDist,
        boxY: pos.y + ny * boxDist
      };
    });

    this.planSnapshot = null;
    this._resetDynamicState();
    this.phase = 'PLANNING';
    this._notify();
  }

  _resetDynamicState() {
    this.clock = 0;
    this.liveActions = 0;
    this.deliveredCount = 0;
    this.faultInfo = null;
    this.particles = [];
    this.ripples = [];
    this.floaters = [];
    this.shakeTimer = 0;

    for (const n of this.shift.nodes) {
      n.lockFlash = 0;
      n.dockGlow = 0;
      n._pendingAutoFlips = [];
    }
    for (const s of this.semaphores) {
      s.spent = false;
    }

    this.trains = this.shift.trains.map((t) => ({
      ...t,
      state: 'waiting', // waiting | running | holding | queued | arrived | crashed
      edgeId: t.edgeId,
      edgeDist: 0,
      totalDist: 0,
      holdRemaining: 0,
      holdDuration: 0,
      pathHistory: [{ edgeId: t.edgeId, startDist: 0 }],
      points: []
    }));
  }

  getPlannedActions() {
    let count = 0;
    for (const n of this.shift.nodes) {
      if (n.type === 'switch' && n.branch !== (n.defaultBranch ?? 0)) count++;
    }
    for (const s of this.semaphores) {
      if (s.holdSeconds !== (s.defaultHold ?? 0)) count++;
    }
    return count;
  }

  getTotalActions() {
    if (this.phase === 'PLANNING') return this.getPlannedActions();
    return (this.planSnapshot ? this.planSnapshot.plannedActions : 0) + this.liveActions;
  }

  getSwitchChoicesSnapshot() {
    const choices = {};
    for (const n of this.shift.nodes) {
      if (n.type === 'switch') {
        const val = this.planSnapshot ? this.planSnapshot.switches[n.id] : n.branch;
        choices[n.id] = val !== (n.defaultBranch ?? 0) ? 1 : 0;
      }
    }
    for (const s of this.semaphores) {
      const val = this.planSnapshot ? this.planSnapshot.semaphores[s.id] : s.holdSeconds;
      choices[s.id] = val;
    }
    return choices;
  }

  snapshotPlan() {
    const switches = {};
    const semaphores = {};
    for (const n of this.shift.nodes) if (n.type === 'switch') switches[n.id] = n.branch;
    for (const s of this.semaphores) semaphores[s.id] = s.holdSeconds;
    this.planSnapshot = {
      switches,
      semaphores,
      plannedActions: this.getPlannedActions()
    };
  }

  applyPlan(plan) {
    for (const n of this.shift.nodes) {
      if (n.type === 'switch') {
        const b = plan?.switches?.[n.id] !== undefined ? plan.switches[n.id] : (n.defaultBranch ?? 0);
        n.branch = b;
        n.animBranch = b;
      }
    }
    for (const s of this.semaphores) {
      s.holdSeconds = plan?.semaphores?.[s.id] !== undefined ? plan.semaphores[s.id] : (s.defaultHold ?? 0);
    }
  }

  restorePlanSnapshot() {
    this.isReplay = false;
    this.replayQueue = [];
    if (this.planSnapshot) {
      this.applyPlan(this.planSnapshot);
    }
    this._resetDynamicState();
    this.phase = 'PLANNING';
    this._notify();
  }

  clearToDefaults() {
    this.isReplay = false;
    this.replayQueue = [];
    this.applyPlan({});
    this.planSnapshot = null;
    this._resetDynamicState();
    this.phase = 'PLANNING';
    this.sound.switchClack(false);
    this._notify();
  }

  startParReplay() {
    const rep = this.shift.parReplay;
    if (!rep) return false;
    this.applyPlan(rep.plan || {});
    this._resetDynamicState();
    this.snapshotPlan();
    this.isReplay = true;
    this.replayQueue = (rep.events || []).map((e) => ({ ...e, fired: false }));
    this.phase = 'RUNNING';
    this.sound.dispatchChime();
    this._notify();
    return true;
  }

  toggleReplayPause() {
    if (!this.isReplay) return;
    if (this.phase === 'RUNNING') {
      this.phase = 'PAUSED';
      this._notify();
    } else if (this.phase === 'PAUSED') {
      this.phase = 'RUNNING';
      this._notify();
    }
  }

  startOrPause() {
    if (this.isReplay) {
      this.toggleReplayPause();
      return;
    }
    if (this.phase === 'PLANNING') {
      this.snapshotPlan();
      this.phase = 'RUNNING';
      this.sound.dispatchChime();
      this._notify();
    } else if (this.phase === 'RUNNING') {
      this.phase = 'PAUSED';
      this._notify();
    } else if (this.phase === 'PAUSED') {
      this.phase = 'RUNNING';
      this._notify();
    } else {
      this.restorePlanSnapshot();
    }
  }

  isSwitchOccupied(node) {
    for (const tr of this.trains) {
      if (tr.state !== 'running' && tr.state !== 'holding' && tr.state !== 'queued') continue;
      for (const pt of tr.points) {
        if (Math.hypot(pt.x - node.x, pt.y - node.y) < SWITCH_LOCK_RADIUS) return true;
      }
    }
    return false;
  }

  toggleSwitch(nodeId, fromReplay = false) {
    if (this.isReplay && !fromReplay) return false;
    if (this.phase === 'VICTORY' || this.phase === 'FAULT') return false;
    const node = this.nodeMap.get(nodeId);
    if (!node || node.type !== 'switch') return false;

    if (this.phase === 'RUNNING' || this.phase === 'PAUSED') {
      if (this.isSwitchOccupied(node)) {
        node.lockFlash = 1.0;
        this.sound.lockedClunk();
        this._spawnFloater(node.x, node.y - 24, 'LOCKED', '#cf3d2e');
        return false;
      }
      this.liveActions++;
    }

    node.branch = (node.branch + 1) % node.out.length;
    this.sound.switchClack(node.branch === 0);
    this._spawnSparks(node.x, node.y, node.autoFlip ? '#e39b62' : '#f0ca75', 8);
    this._spawnRipple(node.x, node.y, fromReplay ? '#64b5f6' : '#e5b860', 34);
    this._notify();
    return true;
  }

  toggleSemaphore(semId, fromReplay = false) {
    if (this.isReplay && !fromReplay) return false;
    if (this.phase === 'VICTORY' || this.phase === 'FAULT') return false;
    const sem = this.semaphores.find((s) => s.id === semId);
    if (!sem) return false;

    if (this.phase === 'RUNNING' || this.phase === 'PAUSED') {
      const waiting = this.trains.find(
        (t) => t.state === 'holding' && t.edgeId === sem.edgeId && Math.abs(t.edgeDist - sem.sPos) < 12
      );
      if (waiting) {
        waiting.holdRemaining = 0;
        waiting.state = 'running';
        this.liveActions++;
        this.sound.semaphoreClick(0);
        this._spawnSparks(sem.x, sem.y, '#5ee38c', 8);
        this._spawnFloater(sem.boxX, sem.boxY - 16, 'RELEASED', '#267545');
        this._notify();
        return true;
      }
      if (sem.spent) {
        sem.spent = false;
      }
      this.liveActions++;
    }

    const nextIdx = (HOLD_CYCLE.indexOf(sem.holdSeconds) + 1) % HOLD_CYCLE.length;
    sem.holdSeconds = HOLD_CYCLE[nextIdx];
    this.sound.semaphoreClick(nextIdx);
    this._spawnRipple(sem.boxX, sem.boxY, '#f0ca75', 24);
    this._notify();
    return true;
  }

  step(dt) {
    // Visual animations run in all phases
    for (const n of this.shift.nodes) {
      if (n.type === 'switch') {
        n.animBranch += (n.branch - n.animBranch) * Math.min(1, dt * 20);
        if (n.lockFlash > 0) n.lockFlash = Math.max(0, n.lockFlash - dt * 3.4);
      }
      if (n.dockGlow > 0) n.dockGlow = Math.max(0, n.dockGlow - dt * 2.2);
    }
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.t += dt;
      if (r.t >= r.dur) this.ripples.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.y -= 22 * dt;
      f.life -= dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }

    if (this.phase !== 'RUNNING') return;

    this.clock += dt;

    // 1. Fire scripted Par Replay events
    if (this.isReplay) {
      for (const ev of this.replayQueue) {
        if (!ev.fired && this.clock >= ev.at) {
          ev.fired = true;
          if (ev.type === 'switch') this.toggleSwitch(ev.id, true);
          else if (ev.type === 'semaphore') this.toggleSemaphore(ev.id, true);
        }
      }
    }

    // 2. Process trains
    let movingCount = 0;

    for (const tr of this.trains) {
      if (tr.state === 'waiting') {
        if (this.clock >= tr.spawnAt) {
          tr.state = 'running';
          const edge = this.edgeMap.get(tr.edgeId);
          const pt = TrackMath.sampleEdge(edge, 0);
          this._spawnSparks(pt.x, pt.y, LINES[tr.line].color, 7);
          if (tr.express) this.sound.expressHorn();
          this._notify();
        } else {
          continue;
        }
      }

      if (tr.state === 'holding') {
        tr.holdRemaining -= dt;
        if (tr.holdRemaining <= 0) {
          tr.holdRemaining = 0;
          tr.state = 'running';
        }
        this._updateTrainPoints(tr);
        continue;
      }

      // Check safe block queuing behind a holding/queued train on the same edge
      if (tr.state === 'running' || tr.state === 'queued') {
        const blockedByStoppedLead = this.trains.some(
          (other) =>
            other !== tr &&
            other.edgeId === tr.edgeId &&
            (other.state === 'holding' || other.state === 'queued') &&
            other.edgeDist > tr.edgeDist &&
            other.edgeDist - tr.edgeDist <= QUEUE_GAP
        );
        if (blockedByStoppedLead) {
          if (tr.state === 'running') {
            tr.state = 'queued';
            this.sound.brakeHiss();
          }
          this._updateTrainPoints(tr);
          continue;
        } else if (tr.state === 'queued') {
          tr.state = 'running';
        }
      }

      if (tr.state !== 'running') continue;
      movingCount++;

      // Occasional Express roof pantograph spark
      if (tr.express && tr.points[0] && Math.random() < 0.08) {
        this.particles.push({
          x: tr.points[0].x,
          y: tr.points[0].y,
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 40,
          r: 1.7,
          color: '#fff0a8',
          life: 0.16,
          maxLife: 0.16
        });
      }

      let move = tr.speed * dt;
      let edge = this.edgeMap.get(tr.edgeId);

      // One-Shot Semaphore check
      for (const sem of this.semaphores) {
        if (
          sem.edgeId === tr.edgeId &&
          sem.holdSeconds > 0 &&
          !sem.spent &&
          tr.edgeDist <= sem.sPos &&
          tr.edgeDist + move >= sem.sPos
        ) {
          const delta = sem.sPos - tr.edgeDist;
          tr.edgeDist = sem.sPos;
          tr.totalDist += delta;
          sem.spent = true;
          tr.state = 'holding';
          tr.holdRemaining = sem.holdSeconds;
          tr.holdDuration = sem.holdSeconds;
          move = 0;
          this.sound.brakeHiss();
          this._spawnSparks(sem.x, sem.y, '#ece4d6', 6);
          break;
        }
      }

      while (move > 0 && tr.state === 'running') {
        const remaining = edge._length - tr.edgeDist;
        if (move < remaining) {
          tr.edgeDist += move;
          tr.totalDist += move;
          move = 0;
        } else {
          tr.totalDist += remaining;
          move -= remaining;
          const target = this.nodeMap.get(edge.to);

          if (target.type === 'station') {
            if (target.line === tr.line) {
              tr.state = 'arrived';
              target.dockGlow = 1.0;
              this.deliveredCount++;
              this.sound.stationArrive(this.deliveredCount - 1);
              this._spawnSparks(target.x, target.y, '#5ee38c', 18);
              this._spawnRipple(target.x, target.y, '#5ee38c', 44);
              this._spawnFloater(target.x, target.y - 30, `${tr.id} OK`, '#267545');
              this._notify();
            } else {
              tr.state = 'crashed';
              this._triggerFault(
                'MISROUTED TRAIN',
                `${tr.id} (${LINES[tr.line].name} ${LINES[tr.line].code}) entered Platform ${LINES[target.line].code}.`,
                target.x,
                target.y
              );
              return;
            }
            move = 0;
          } else if (target.type === 'switch') {
            const nextId = target.out[target.branch];
            if (target.autoFlip) {
              target._pendingAutoFlips.push({ trainId: tr.id, passDist: tr.totalDist });
            }
            tr.edgeId = nextId;
            tr.edgeDist = 0;
            tr.pathHistory.push({ edgeId: nextId, startDist: tr.totalDist });
            edge = this.edgeMap.get(nextId);
          } else if (target.out && target.out.length) {
            const nextId = target.out[0];
            tr.edgeId = nextId;
            tr.edgeDist = 0;
            tr.pathHistory.push({ edgeId: nextId, startDist: tr.totalDist });
            edge = this.edgeMap.get(nextId);
          } else {
            tr.state = 'crashed';
            this._triggerFault('DERAILED', `${tr.id} reached a buffer stop.`, target.x, target.y);
            return;
          }
        }
      }

      if (tr.state === 'running' || tr.state === 'holding' || tr.state === 'queued') {
        this._updateTrainPoints(tr);
      }
    }

    // 3. Fire pending Auto-Flip (↻) switches once the triggering train's tail clears
    for (const n of this.shift.nodes) {
      if (n.type !== 'switch' || !n.autoFlip || !n._pendingAutoFlips.length) continue;
      for (let i = n._pendingAutoFlips.length - 1; i >= 0; i--) {
        const item = n._pendingAutoFlips[i];
        const tr = this.trains.find((t) => t.id === item.trainId);
        const cleared = !tr || tr.state === 'arrived' || (tr.totalDist - item.passDist >= AUTO_FLIP_CLEAR_DIST);
        if (cleared) {
          n._pendingAutoFlips.splice(i, 1);
          n.branch = (n.branch + 1) % n.out.length;
          this.sound.autoFlipClick();
          this._spawnRipple(n.x, n.y, '#e39b62', 30);
          this._spawnFloater(n.x, n.y - 24, '↻ AUTO', '#b8682c');
        }
      }
    }

    // 4. Subtle rail ambience
    this.sound.railClackTick(dt, movingCount, this.speedMult);

    // 5. Pairwise collision checks
    const active = this.trains.filter(
      (t) => (t.state === 'running' || t.state === 'holding' || t.state === 'queued') && t.totalDist > 12
    );
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const b = active[j];
        for (const pa of a.points) {
          for (const pb of b.points) {
            if (Math.hypot(pa.x - pb.x, pa.y - pb.y) < COLLISION_DIST) {
              a.state = 'crashed';
              b.state = 'crashed';
              this._triggerFault(
                'TRACK COLLISION',
                `${a.id} and ${b.id} collided at ${this.clock.toFixed(1)}s. Use a 1× semaphore hold or bypass loop.`,
                (pa.x + pb.x) / 2,
                (pa.y + pb.y) / 2
              );
              return;
            }
          }
        }
      }
    }

    // 6. Victory check
    if (this.deliveredCount === this.trains.length && this.trains.length > 0) {
      this.phase = 'VICTORY';
      const actions = this.getTotalActions();
      const par = this.shift.par;
      const stamp = actions <= par ? 'gold' : actions <= par + 2 ? 'silver' : 'bronze';
      this.sound.stampThud(true);
      this._notify();
      if (this.onFinish) {
        this.onFinish({
          win: true,
          isReplay: this.isReplay,
          stamp,
          actions,
          par,
          time: this.clock,
          choices: this.getSwitchChoicesSnapshot()
        });
      }
    }
  }

  _updateTrainPoints(tr) {
    const pts = [];
    for (let c = 0; c < CAR_COUNT; c++) {
      const d = tr.totalDist - c * CAR_SPACING;
      if (d < 0) continue;
      let seg = tr.pathHistory[0];
      for (let i = tr.pathHistory.length - 1; i >= 0; i--) {
        if (d >= tr.pathHistory[i].startDist) {
          seg = tr.pathHistory[i];
          break;
        }
      }
      const edge = this.edgeMap.get(seg.edgeId);
      const local = Math.min(edge._length, Math.max(0, d - seg.startDist));
      pts.push(TrackMath.sampleEdge(edge, local));
    }
    tr.points = pts;
  }

  _triggerFault(title, message, x, y) {
    this.phase = 'FAULT';
    this.faultInfo = { title, message, x, y };
    this.shakeTimer = 0.45;
    this.sound.crash();
    this._spawnSparks(x, y, '#ff5947', 28);
    this._spawnSparks(x, y, '#ffd166', 16);
    this._spawnRipple(x, y, '#cf3d2e', 56);
    this._notify();
    if (this.onFinish) {
      this.onFinish({
        win: false,
        isReplay: this.isReplay,
        stamp: 'fault',
        title,
        message,
        actions: this.getTotalActions(),
        par: this.shift.par,
        time: this.clock
      });
    }
  }

  _spawnSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 145;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 1.8 + Math.random() * 2.3,
        color,
        life: 0.24 + Math.random() * 0.3,
        maxLife: 0.54
      });
    }
  }

  _spawnRipple(x, y, color, maxR) {
    this.ripples.push({ x, y, color, maxR, t: 0, dur: 0.42 });
  }

  _spawnFloater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  traceFromPortal(portalId) {
    const firstTrain = this.shift.trains.find((t) => t.portal === portalId);
    if (!firstTrain) return null;
    const edges = [];
    let currId = firstTrain.edgeId;
    let destStation = null;
    let guard = 0;
    while (currId && guard++ < 16) {
      const edge = this.edgeMap.get(currId);
      if (!edge) break;
      edges.push(edge);
      const toNode = this.nodeMap.get(edge.to);
      if (!toNode) break;
      if (toNode.type === 'station') {
        destStation = toNode;
        break;
      }
      if (toNode.type === 'switch') currId = toNode.out[toNode.branch];
      else if (toNode.out && toNode.out.length) currId = toNode.out[0];
      else break;
    }
    return { line: firstTrain.line, edges, destStation };
  }

  _notify() {
    if (this.onStateChange) this.onStateChange();
  }
}
