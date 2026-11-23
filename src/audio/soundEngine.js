/**
 * Procedural Web Audio synthesizer for mechanical brass switches,
 * copper auto-flip relays, Japanese station chimes, express horns,
 * and subtle rail clickety-clack ambience. Zero external audio assets.
 */

const vibrate = (pattern) => {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
};

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.clackAccum = 0;
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {}
  }

  _noise(sec) {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * sec));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  switchClack(high = true) {
    vibrate(10);
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(high ? 375 : 268, t);
    osc.frequency.exponentialRampToValueAtTime(high ? 115 : 88, t + 0.052);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.058);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.062);

    const src = this.ctx.createBufferSource();
    src.buffer = this._noise(0.032);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = high ? 2300 : 1550;
    bp.Q.value = 3.5;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.16, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.032);
    src.connect(bp).connect(ng).connect(this.ctx.destination);
    src.start(t);
  }

  autoFlipClick() {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.045);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  lockedClunk() {
    vibrate([15, 25, 15]);
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(118, t);
    osc.frequency.exponentialRampToValueAtTime(62, t + 0.095);
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.105);
  }

  semaphoreClick(step) {
    vibrate(8);
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const freqs = [523, 659, 440];
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqs[step % 3], t);
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.085);
  }

  dispatchChime() {
    vibrate(14);
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.06);
      g.gain.setValueAtTime(0.001, t + i * 0.06);
      g.gain.linearRampToValueAtTime(0.09, t + i * 0.06 + 0.014);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.28);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.3);
    });
  }

  expressHorn() {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [392.0, 493.88].forEach((f) => {
      const osc = this.ctx.createOscillator();
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1100;
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(lp).connect(g).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  railClackTick(dt, activeMovingCount, speedMult) {
    if (this.muted || !this.ctx || activeMovingCount <= 0) return;
    const interval = Math.max(0.16, 0.36 / Math.max(0.5, speedMult));
    this.clackAccum += dt;
    if (this.clackAccum < interval) return;
    this.clackAccum = 0;

    const t = this.ctx.currentTime;
    [0, 0.075].forEach((off, idx) => {
      const src = this.ctx.createBufferSource();
      src.buffer = this._noise(0.02);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = idx === 0 ? 780 : 620;
      bp.Q.value = 2.4;
      const g = this.ctx.createGain();
      const vol = Math.min(0.045, 0.018 + activeMovingCount * 0.006);
      g.gain.setValueAtTime(vol, t + off);
      g.gain.exponentialRampToValueAtTime(0.0008, t + off + 0.02);
      src.connect(bp).connect(g).connect(this.ctx.destination);
      src.start(t + off);
    });
  }

  brakeHiss() {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise(0.18);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2600, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.065, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    src.connect(hp).connect(g).connect(this.ctx.destination);
    src.start(t);
  }

  stationArrive(combo = 0) {
    vibrate(12);
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 587.33 * Math.pow(1.06, Math.min(combo, 6));
    [base, base * 1.25].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + i * 0.055);
      g.gain.setValueAtTime(0.11, t + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.055 + 0.25);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t + i * 0.055);
      osc.stop(t + i * 0.055 + 0.27);
    });
  }

  crash() {
    vibrate([40, 30, 75]);
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.36);
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);

    const src = this.ctx.createBufferSource();
    src.buffer = this._noise(0.32);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1350, t);
    lp.frequency.exponentialRampToValueAtTime(210, t + 0.31);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.24, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    src.connect(lp).connect(ng).connect(this.ctx.destination);
    src.start(t);
  }

  stampThud(isWin) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isWin ? 155 : 108, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.17);

    if (isWin) {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const o = this.ctx.createOscillator();
        const og = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, t + 0.08 + i * 0.06);
        og.gain.setValueAtTime(0.1, t + 0.08 + i * 0.06);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.08 + i * 0.06 + 0.42);
        o.connect(og).connect(this.ctx.destination);
        o.start(t + 0.08 + i * 0.06);
        o.stop(t + 0.08 + i * 0.06 + 0.44);
      });
    }
  }
}
