// Synthesized mridangam + Adi talam claps + tanpura drone (no audio files needed)
const SYL = ['Thai', 'ya', 'Thai', 'hi'];
const KRIYA = ['clap', 'f', 'f', 'f', 'clap', 'wave', 'clap', 'wave'];   // Adi talam: 8 beats
const DRONE = [207.65, 277.18, 277.18, 138.59];                           // Pa, Sa', Sa', Sa (C# sruti)

export class Music {
  constructor(cfg) { this.cfg = cfg; this.ctx = null; this.droneOn = false; this.cur = null; }

  // Must be called inside a click handler (browser audio rule)
  init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.master.gain.value = this.cfg.musicVolume;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nextPluck = 0; this.pluckIdx = 0;
    this.timer = setInterval(() => this._tick(), 25);
    return this.ctx.resume();
  }

  setVolume(v) { this.master.gain.value = Math.max(0, Math.min(1, v)); }
  get volume() { return this.master.gain.value; }

  perfAt(at) {
    const outLat = (this.ctx.outputLatency || this.ctx.baseLatency || 0) * 1000;
    return performance.now() + (at - this.ctx.currentTime) * 1000 + outLat;
  }

  // ---- sound building blocks ----
  _gain(t, peak, decay) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    g.connect(this.master);
    return g;
  }
  _osc(type, f, t, dur, dest) {
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t);
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  _noise(t, dur, dest) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.connect(dest); s.start(t); s.stop(t + dur);
  }
  _band(f, q) { const b = this.ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; return b; }

  thom(t, v) { const g = this._gain(t, v, 0.45); const o = this._osc('sine', 130, t, 0.5, g); o.frequency.exponentialRampToValueAtTime(55, t + 0.3); }
  tha(t, v) { const g = this._gain(t, v, 0.07); const b = this._band(2200, 1.2); b.connect(g); this._noise(t, 0.08, b); }
  nam(t, v) {
    for (const [f, a] of [[330, 1], [660, 0.5], [990, 0.25], [1320, 0.12]]) this._osc('sine', f, t, 0.85, this._gain(t, v * a, 0.8));
    this.tha(t, v * 0.3);
  }
  clap(t, v) { const g = this._gain(t, v, 0.12); const b = this._band(1200, 0.7); b.connect(g); this._noise(t, 0.13, b); }
  tick(t, v, f = 1800) { this._osc('sine', f, t, 0.06, this._gain(t, v, 0.05)); }
  pluck(t, f, v) {
    const g = this._gain(t, v, 1.8);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(500, t + 1.2);
    lp.connect(g);
    this._osc('sawtooth', f, t, 1.9, lp); this._osc('sawtooth', f * 1.003, t, 1.9, lp);
  }
  chime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    [784, 988, 1319].forEach((f, i) => this._osc('triangle', f, t + i * 0.09, 0.65, this._gain(t + i * 0.09, 0.22, 0.6)));
  }

  startDrone() { if (!this.droneOn) { this.droneOn = true; this.nextPluck = this.ctx.currentTime + 0.05; } }
  stopDrone() { this.droneOn = false; }

  // Plays count-in + `beats` dance beats. Returns { done: Promise, stopped }.
  play({ bpm, countIn = 4, beats, onSchedule, onBeat }) {
    this.stop();
    const p = { spb: 60 / bpm, i: -countIn, countIn, total: beats, next: this.ctx.currentTime + 0.3,
      stopped: false, onSchedule, onBeat, timeouts: [] };
    p.done = new Promise(r => (p.resolve = r));
    this.cur = p;
    return p;
  }
  stop() {
    const p = this.cur; if (!p) return;
    p.stopped = true; p.timeouts.forEach(clearTimeout);
    this.cur = null; p.resolve();
  }

  _tick() {
    const ctx = this.ctx, ahead = ctx.currentTime + 0.15;
    if (this.droneOn) {
      while (this.nextPluck < ahead) {
        this.pluck(this.nextPluck, DRONE[this.pluckIdx % 4], 0.05);
        this.pluckIdx++; this.nextPluck += 0.62;
      }
    }
    const p = this.cur; if (!p) return;
    while (p.next < ahead) {
      if (p.i >= p.total) {                     // finished: resolve after the last beat rings
        const ms = (p.next - ctx.currentTime) * 1000;
        this.cur = null;
        setTimeout(() => p.resolve(), Math.max(0, ms));
        return;
      }
      const t = p.next, i = p.i, perf = this.perfAt(t);
      let info;
      if (i < 0) {
        this.tick(t, 0.5, 2200);
        info = { countIn: i + p.countIn + 1, perf, beatMs: p.spb * 1000 };
      } else {
        const syl = i % 4, pos = i % 8;
        if (syl === 0 || syl === 2) { this.thom(t, 0.9); this.tha(t, 0.45); }
        else if (syl === 1) this.nam(t, 0.45);
        else { this.nam(t, 0.35); this.thom(t, 0.3); }
        const k = KRIYA[pos];
        if (k === 'clap') this.clap(t, 0.3); else this.tick(t, 0.12, k === 'f' ? 1400 : 1000);
        const foot = i % 2 === 0 ? 'R' : 'L';
        info = { i, pos, syllable: SYL[syl], foot, perf, beatMs: p.spb * 1000, last: i === p.total - 1 };
        p.onSchedule?.({ idx: i, t: perf, foot });
      }
      p.timeouts.push(setTimeout(() => { if (!p.stopped) p.onBeat?.(info); }, Math.max(0, perf - performance.now())));
      p.i++; p.next += p.spb;
    }
  }
}
