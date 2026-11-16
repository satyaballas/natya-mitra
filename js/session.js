// Runs a whole class: plan → activities → breaks → report.
import { SequenceRunner, RhythmRunner, BreakRunner } from './lessons.js';

export class Session {
  constructor(d, settings) {
    this.d = d; this.settings = settings;
    this.results = []; this.stars = 0; this.ended = false;
    this.pausedMs = 0; this.pauseStart = null;
  }

  elapsed() {
    const now = performance.now();
    return now - this.t0 - this.pausedMs - (this.pauseStart ? now - this.pauseStart : 0);
  }
  get totalMs() { return this.settings.minutes * 60000; }

  async run() {
    const { cfg, teacher } = this.d;
    const plan = cfg.plans[String(this.settings.minutes)] || cfg.plans['30'];
    this.t0 = performance.now(); this.lastBreak = this.t0;
    this.tempoStart = this.d.progress.getTempo();

    for (const id of plan.main) {
      if (this.ended || this.elapsed() > this.totalMs - 2 * 60000) break;
      await this.runId(id);
    }
    let k = 0;
    while (!this.ended && plan.loop?.length && this.elapsed() < this.totalMs - 4 * 60000) {
      await this.runId(plan.loop[k++ % plan.loop.length]);
    }
    if (!this.ended) await this.runId('closing');
    if (!this.ended) { this.d.ui.confetti(); await teacher.say('sessionDone'); }
    return this.buildReport();
  }

  async runId(id) {
    const { cfg, teacher } = this.d;
    const act = { ...cfg.activities[id], id };
    if (act.type !== 'break' && (performance.now() - this.lastBreak) / 60000 > cfg.hydrationEveryMin) {
      await this.runAct({ ...cfg.activities.autoBreak, id: 'autoBreak' });
    }
    if (this.ended) return;
    const res = await this.runAct(act);
    // tiredness check: two weak activities in a row → short rest
    const scored = this.results.filter(r => r.type === 'sequence' && r.score != null && !r.skipped);
    const last = scored.slice(-2);
    if (!this.ended && res.type === 'sequence' && last.length === 2 && last.every(r => r.score < 0.4) && !last[1].restGiven) {
      last[1].restGiven = true;
      await teacher.say('restSuggest');
      await this.runAct({ ...cfg.activities.restBreak, id: 'restBreak' });
    }
  }

  async runAct(act) {
    const { ui } = this.d;
    const R = act.type === 'rhythm' ? RhythmRunner : act.type === 'break' ? BreakRunner : SequenceRunner;
    const runner = new R(act, this.d);
    this.current = runner;
    ui.setActivity(act.title);
    const res = await runner.run();
    this.current = null;
    if (act.type === 'break') this.lastBreak = performance.now();
    else if (res.score != null && !res.skipped) {
      res.stars = res.score >= 0.85 ? 3 : res.score >= 0.7 ? 2 : 1;   // always at least 1 star for trying
      this.stars += res.stars; ui.setStars(this.stars);
      if (res.stars >= 2) ui.confetti();
    }
    this.results.push(res);
    return res;
  }

  onFrame(m, now, stamps) { this.current?.onFrame(m, now, stamps); }
  wantsFace() { return !!this.current?.wantsFace(); }
  skip() { this.d.teacher.stop(); this.current?.skip(); }
  end() {
    this.ended = true;
    this.d.teacher.stop(); this.d.music.stop(); this.d.music.stopDrone();
    this.current?.stop();
  }

  togglePause(force) {
    const st = this.d.state;
    const p = force ?? !st.paused;
    if (p === st.paused) return;
    st.paused = p;
    if (p) { this.pauseStart = performance.now(); this.d.teacher.stop(); this.current?.onPause(); }
    else { this.pausedMs += performance.now() - this.pauseStart; this.pauseStart = null; }
  }

  buildReport() {
    const acts = this.results.filter(r => r.type !== 'break' && !r.skipped && r.score != null);
    const overall = acts.length ? acts.reduce((a, r) => a + r.score, 0) / acts.length : 0;
    const hints = {};
    for (const r of acts) for (const k in (r.hints || {})) hints[k] = (hints[k] || 0) + r.hints[k];
    const tattu = acts.filter(r => r.type === 'rhythm');
    const tAcc = tattu.length ? tattu.reduce((a, r) => a + r.score, 0) / tattu.length : null;
    return {
      version: 1, date: new Date().toISOString(), child: this.settings.child,
      plannedMin: this.settings.minutes, durationMin: Math.round(this.elapsed() / 6000) / 10,
      stars: this.stars, overall: Math.round(overall * 100),
      tattuAccuracy: tAcc == null ? null : Math.round(tAcc * 100),
      tempoStart: this.tempoStart, tempoEnd: this.d.progress.getTempo(),
      breaks: this.results.filter(r => r.type === 'break').length,
      corrections: Object.entries(hints).sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count })),
      activities: this.results.map(r => ({ ...r, score: r.score == null ? null : Math.round(r.score * 100) })),
      endedEarly: this.ended,
    };
  }
}
