// Activity runners: sequence (poses / faces), rhythm (foot stamps), break.
import { CHECKS } from './poses.js';
import { BeatJudge } from './rhythm.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

class BaseRunner {
  constructor(act, d) { this.act = act; this.d = d; this.cfg = d.cfg; this.skipped = false; this.stopping = false; }
  skip() { this.skipped = true; this.onSkip?.(); }
  stop() { this.stopping = true; this.onStop?.(); }
  wantsFace() { return false; }
  onFrame() {}
  onPause() {}
  async waitUnpaused() { while (this.d.state.paused && !this.skipped && !this.stopping) await sleep(200); }
}

// ------------------------------------------------------------------
export class SequenceRunner extends BaseRunner {
  wantsFace() { return this.act.needs === 'face'; }

  async run() {
    const { teacher, demo } = this.d;
    this.mem = {}; this.results = [];
    const steps = this.act.steps, reps = this.act.repeat || 1;
    if (this.act.intro) {
      steps[0].emoji ? demo.setEmoji(steps[0].emoji) : demo.setPose(steps[0].demo || 'stand');
      await teacher.say(this.act.intro);
    }
    for (let r = 0; r < reps && !this.skipped && !this.stopping; r++) {
      for (let i = 0; i < steps.length && !this.skipped && !this.stopping; i++) {
        await this.waitUnpaused();
        this.results.push(await this.runStep(steps[i], r));
      }
    }
    this.st = null;
    teacher.setExpression('neutral');
    this.d.ui.setHold(0); this.d.ui.setBadge(null); this.d.ui.setGate(null);
    if (this.act.outro && !this.skipped && !this.stopping) await teacher.say(this.act.outro);
    return this.result();
  }

  runStep(step, rep) {
    const { teacher, demo } = this.d;
    step.emoji ? demo.setEmoji(step.emoji) : demo.setPose(step.demo || 'stand');
    teacher.setExpression(step.expr || 'neutral');
    const key = rep > 0 && step.cue ? step.cue : step.say;
    if (key) teacher.say(key);
    return new Promise(resolve => {
      this.st = { step, check: CHECKS[step.check], holdStart: null, notOkSince: null, active: 0, last: null,
        lastHint: performance.now(), frames: 0, scoreSum: 0, hints: {}, resolve, done: false };
      this.onSkip = () => this.finishStep(false, true);
    });
  }

  stop() {
    super.stop();
    if (this.st) this.finishStep(false);
  }

  onFrame(m, now) {
    const st = this.st; if (!st || st.done) return;
    const { ui, teacher } = this.d, cfg = this.cfg;
    const dt = st.last ? Math.min(now - st.last, 200) : 0; st.last = now;
    if (this.d.state.paused) return;

    const needFace = this.act.needs === 'face';
    if (needFace ? !m.face : !m.fullBody) {              // can't see her properly → wait patiently
      st.holdStart = null; ui.setHold(0); ui.setMeter(0); ui.setBadge(null);
      const k = needFace ? 'comeClose' : 'stepBack';
      ui.setGate(k);
      if (now - st.lastHint > cfg.hintEveryMs) { teacher.say(k, { ifIdle: true }); st.lastHint = now; }
      return;
    }
    ui.setGate(null);
    st.active += dt;

    const r = st.check(m, cfg.T, this.mem);
    st.frames++; st.scoreSum += r.score;
    ui.setMeter(r.score); ui.setBadge(r.ok ? 'good' : 'try');
    if (r.ok) {
      st.notOkSince = null;
      if (st.holdStart === null) st.holdStart = now;
      const p = (now - st.holdStart) / (st.step.hold || 1000);
      ui.setHold(p);
      if (p >= 1) return this.finishStep(true);
    } else {
      if (st.holdStart !== null) {
        if (st.notOkSince === null) st.notOkSince = now;
        if (now - st.notOkSince > cfg.graceMs) { st.holdStart = null; ui.setHold(0); }
      }
      if (r.hint && now - st.lastHint > cfg.hintEveryMs) {
        teacher.say(r.hint, { ifIdle: true });
        st.lastHint = now; st.hints[r.hint] = (st.hints[r.hint] || 0) + 1;
      }
    }
    if (st.active > (st.step.timeoutMs || cfg.stepTimeoutMs)) {
      teacher.say('nextOne', { interrupt: true });
      this.finishStep(false);
    }
  }

  finishStep(done, skipped = false) {
    const st = this.st; if (!st || st.done) return;
    st.done = true;
    const { ui, teacher, music } = this.d;
    ui.setHold(0);
    if (done) { music.chime(); ui.sparkle(); teacher.celebrate(); if (Math.random() < 0.5) teacher.say('praise'); }
    st.resolve({ check: st.step.check, done, skipped, timeMs: Math.round(st.active),
      quality: st.frames ? st.scoreSum / st.frames : 0, hints: st.hints });
  }

  result() {
    const s = this.results.filter(x => !x.skipped), n = s.length || 1;
    const score = s.length ? s.reduce((a, x) => a + (x.done ? 0.6 + 0.4 * x.quality : 0.3 * x.quality), 0) / n : null;
    const hints = {};
    for (const x of s) for (const k in x.hints) hints[k] = (hints[k] || 0) + x.hints[k];
    return { id: this.act.id, title: this.act.title, type: 'sequence', score, skipped: this.skipped,
      stepsDone: s.filter(x => x.done).length, steps: s.length, hints, partial: this.stopping };
  }
}

// ------------------------------------------------------------------
export class RhythmRunner extends BaseRunner {
  async run() {
    const { teacher, music, ui, demo, progress, stampDetector } = this.d, cfg = this.cfg, a = this.act;
    this.rounds = [];
    demo.setPose('stand');
    await teacher.say(a.intro || 'tattuIntro');
    let attempts = 0;
    for (let r = 0; r < (a.rounds || 2) && !this.skipped && !this.stopping && attempts < 6; r++, attempts++) {
      await this.waitUnpaused();
      await this.waitVisible();
      if (this.skipped || this.stopping) break;
      const bpm = progress.getTempo();
      ui.showBeatbar(true);
      await teacher.say('tattuReady');
      if (this.skipped || this.stopping) break;
      this.judge = new BeatJudge(cfg.rhythm.windowMs, cfg.latencyMs);
      stampDetector.reset();
      music.startDrone();
      this.listening = true;
      const play = music.play({
        bpm, countIn: cfg.rhythm.countInBeats, beats: (a.cycles || 2) * 8,
        onSchedule: b => this.judge.addBeat(b),
        onBeat: info => this.onBeat(info),
      });
      this.play = play;
      await play.done;
      this.listening = false;
      music.stopDrone();
      for (const j of this.judge.evaluateDue(this.stopping ? performance.now() : Infinity)) ui.markBeat(j.beat.idx % 8, j.hit);
      if (!this.stopping) await sleep(600);
      ui.showBeatbar(false); demo.setPose('stand');
      if (this.skipped) break;
      if (this.stopping) {
        const partial = this.judge.summary();
        if (partial.total) this.rounds.push({ bpm, ...partial, partial: true });
        break;
      }
      if (play.stopped) { r--; continue; }          // paused mid-round → redo this round
      const sum = this.judge.summary();
      this.rounds.push({ bpm, ...sum });
      const acc = sum.total ? sum.hits / sum.total : 0;
      if (acc >= cfg.tempo.passAccuracy) {
        music.chime(); ui.sparkle(); teacher.celebrate();
        if (progress.getTempo() < cfg.tempo.max) { progress.bumpTempo(+1); await teacher.say('fasterNext'); }
        else await teacher.say('praise');
      } else if (sum.stamps < sum.total * 0.3) await teacher.say('liftFoot');
      else await teacher.say(acc < 0.4 ? 'listenBeat' : 'sameSpeed');
    }
    return this.result();
  }

  async waitVisible() {
    let since = null, lastHint = 0;
    while (!this.skipped && !this.stopping) {
      const now = performance.now();
      if (this.lastFull) { since ??= now; if (now - since > 800) break; } else since = null;
      if (!this.lastFull && now - lastHint > this.cfg.hintEveryMs) { this.d.teacher.say('stepBack', { ifIdle: true }); lastHint = now; }
      await sleep(100);
    }
    this.d.ui.setGate(null);
  }

  onBeat(info) {
    const { ui, demo } = this.d;
    if (info.countIn) {
      ui.beatCount(info.countIn);
      if (info.countIn === this.cfg.rhythm.countInBeats) setTimeout(() => demo.setPose('stampR'), info.beatMs * 0.5);
      return;
    }
    ui.beatActive(info.pos, info.syllable, info.foot);
    demo.setPose('stand'); demo.flashFoot(info.foot);
    if (!info.last) setTimeout(() => demo.setPose(info.foot === 'R' ? 'stampL' : 'stampR'), info.beatMs * 0.5);
  }

  onFrame(m, now, stamps) {
    this.lastFull = m.fullBody;
    if (!this.listening) { if (!m.fullBody) this.d.ui.setGate('stepBack'); else this.d.ui.setGate(null); return; }
    this.d.ui.setGate(m.fullBody ? null : 'stepBack');
    if (stamps.length) this.judge.addStamps(stamps);
    for (const j of this.judge.evaluateDue(now)) this.d.ui.markBeat(j.beat.idx % 8, j.hit);
  }

  onPause() { this.d.music.stop(); }
  onSkip() { this.d.music.stop(); }
  onStop() { this.d.music.stop(); this.d.music.stopDrone(); }

  result() {
    const R = this.rounds, n = R.length;
    const acc = n ? R.reduce((a, r) => a + (r.total ? r.hits / r.total : 0), 0) / n : null;
    const foot = n ? R.reduce((a, r) => a + (r.total ? r.footOk / r.total : 0), 0) / n : null;
    return { id: this.act.id, title: this.act.title, type: 'rhythm', score: acc, footAcc: foot,
      skipped: this.skipped, rounds: R, bpmMax: n ? Math.max(...R.map(r => r.bpm)) : null, partial: this.stopping };
  }
}

// ------------------------------------------------------------------
export class BreakRunner extends BaseRunner {
  async run() {
    const { teacher, ui } = this.d, a = this.act;
    ui.showBreak(true, a.title);
    teacher.setExpression('happy');
    teacher.say(a.say || 'waterBreak');
    let left = a.secs || 90;
    ui.setBreakCount(left);
    while (left > 0 && !this.skipped && !this.stopping) {
      await sleep(1000);
      if (!this.d.state.paused) left--;
      ui.setBreakCount(left);
      if (left === 10) teacher.say('breakEnding');
    }
    ui.showBreak(false);
    teacher.setExpression('neutral');
    if (!this.skipped && !this.stopping) await teacher.say('letsContinue');
    return { id: this.act.id, title: a.title, type: 'break', score: null, secs: (a.secs || 90) - left, skipped: this.skipped, partial: this.stopping };
  }
}
