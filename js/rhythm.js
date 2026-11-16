// Pure beat-vs-stamp judging (no DOM) – testable with Node.
export class BeatJudge {
  constructor(windowMs, latencyMs) {
    this.windowMs = windowMs; this.latencyMs = latencyMs;
    this.beats = []; this.stamps = []; this.judged = [];
  }
  addBeat(b) { this.beats.push({ ...b, judged: false }); }      // { idx, t (perf ms), foot }
  addStamps(arr) { for (const s of arr) this.stamps.push({ ...s, used: false }); }

  // Judge every beat whose window has fully passed.
  evaluateDue(now) {
    const out = [];
    for (const b of this.beats) {
      if (b.judged) continue;
      const target = b.t + this.latencyMs;
      if (target + this.windowMs > now) continue;
      let best = null, bestD = Infinity;
      for (const s of this.stamps) {
        if (s.used) continue;
        const d = Math.abs(s.t - target);
        if (d <= this.windowMs && d < bestD) { best = s; bestD = d; }
      }
      b.judged = true;
      const j = { beat: b, hit: !!best, footOk: !!best && best.foot === b.foot, offset: best ? best.t - target : null };
      if (best) best.used = true;
      this.judged.push(j); out.push(j);
    }
    return out;
  }

  summary() {
    const total = this.judged.length;
    const hits = this.judged.filter(j => j.hit).length;
    const footOk = this.judged.filter(j => j.footOk).length;
    const offs = this.judged.filter(j => j.hit).map(j => j.offset);
    const meanOffset = offs.length ? Math.round(offs.reduce((a, b) => a + b, 0) / offs.length) : null;
    return { total, hits, footOk, stamps: this.stamps.length, meanOffset };
  }
}
