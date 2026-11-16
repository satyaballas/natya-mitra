// Pure pose / face logic (no DOM) – testable with Node.
// Landmark indices follow MediaPipe Pose (person's own left/right).

export const LM = {
  NOSE: 0, LSH: 11, RSH: 12, LEL: 13, REL: 14, LWR: 15, RWR: 16,
  LHIP: 23, RHIP: 24, LKN: 25, RKN: 26, LAN: 27, RAN: 28, LHEEL: 29, RHEEL: 30, LTOE: 31, RTOE: 32,
};

export const CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32],
];

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function angle(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
  const d = (v1.x * v2.x + v1.y * v2.y) / ((Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)) || 1);
  return Math.acos(clamp(d, -1, 1)) * 180 / Math.PI;
}

// Exponential smoothing to calm landmark jitter
export function smooth(prev, cur, a = 0.5) {
  if (!cur) return null;
  if (!prev || prev.length !== cur.length) return cur.map(p => ({ ...p }));
  return cur.map((p, i) => ({
    x: prev[i].x + a * (p.x - prev[i].x),
    y: prev[i].y + a * (p.y - prev[i].y),
    z: p.z, visibility: p.visibility,
  }));
}

export function faceMetrics(blend) {
  if (!blend) return null;
  const g = n => blend[n] || 0;
  return {
    smile: (g('mouthSmileLeft') + g('mouthSmileRight')) / 2,
    jawOpen: g('jawOpen'),
    eyeWide: (g('eyeWideLeft') + g('eyeWideRight')) / 2,
    browUp: Math.max(g('browInnerUp'), (g('browOuterUpLeft') + g('browOuterUpRight')) / 2),
    frown: (g('mouthFrownLeft') + g('mouthFrownRight')) / 2,
    lookA: (g('eyeLookOutLeft') + g('eyeLookInRight')) / 2,
    lookB: (g('eyeLookInLeft') + g('eyeLookOutRight')) / 2,
  };
}

// lm: 33 normalized landmarks (or null); W,H: frame size in px
export function computeMetrics(lm, W, H, blend, T) {
  const m = { hasBody: false, fullBody: false, face: faceMetrics(blend) };
  if (!lm) return m;
  const P = i => ({ x: lm[i].x * W, y: lm[i].y * H, v: lm[i].visibility ?? 1 });
  const nose = P(0), lSh = P(11), rSh = P(12), lWr = P(15), rWr = P(16),
    lHip = P(23), rHip = P(24), lKn = P(25), rKn = P(26), lAn = P(27), rAn = P(28), lHe = P(29), rHe = P(30);

  const shW = dist(lSh, rSh) || 1;
  const shMid = mid(lSh, rSh), hipMid = mid(lHip, rHip);
  const torso = dist(shMid, hipMid) || 1;

  m.hasBody = [nose, lSh, rSh, lHip, rHip].every(p => p.v > T.vis);
  m.fullBody = m.hasBody && [lKn, rKn, lAn, rAn].every(p => p.v > T.vis && p.y < H * 0.995 && p.y > 0);

  m.shW = shW; m.torso = torso;
  // + = upper body leans toward image right (= the person's left side)
  m.lean = Math.atan2(shMid.x - hipMid.x, hipMid.y - shMid.y) * 180 / Math.PI;
  m.kneeL = angle(lHip, lKn, lAn);
  m.kneeR = angle(rHip, rKn, rAn);
  m.ankleGap = dist(lAn, rAn) / shW;
  m.kneeGap = dist(lKn, rKn) / shW;
  m.wristGap = dist(lWr, rWr) / shW;
  m.waistL = dist(lWr, lHip) / shW;
  m.waistR = dist(rWr, rHip) / shW;
  m.wristUpL = (shMid.y - lWr.y) / torso;
  m.wristUpR = (shMid.y - rWr.y) / torso;
  const kneeY = (lKn.y + rKn.y) / 2;
  m.wristsBelowKnees = Math.min(lWr.y - kneeY, rWr.y - kneeY) / torso;
  m.wristsNearEyes = Math.max(dist(lWr, nose), dist(rWr, nose)) / shW;
  const top = shMid.y - 0.2 * torso, bottom = hipMid.y - 0.1 * torso;
  m.wristsChest = [lWr, rWr].every(w => w.y > top && w.y < bottom);
  m.kneeLift = (lKn.y - rKn.y) / torso;          // + = right knee higher
  m.footL = ((lAn.y + lHe.y) / 2) / torso;        // bigger = lower in image
  m.footR = ((rAn.y + rHe.y) / 2) / torso;
  return m;
}

const res = (ok, score, hint) => ({ ok, score: clamp(score), hint: ok ? null : hint });

function fromConds(c, order) {
  const keys = Object.keys(c);
  const met = keys.filter(k => c[k]).length;
  const first = order.find(k => !c[k]);
  return { ok: !first, score: met / keys.length, hint: first || null, conds: c };
}

const handsWaist = (m, T) => m.waistL < T.waistDist && m.waistR < T.waistDist;
const noFace = () => res(false, 0, 'comeClose');

// Each check: (metrics, thresholds, memory) → { ok, score 0..1, hint }
export const CHECKS = {
  rest: () => res(true, 1),
  visible: m => res(m.fullBody, m.fullBody ? 1 : 0, 'stepBack'),

  armsUp: (m, T) => { const v = Math.min(m.wristUpL, m.wristUpR); return res(v > T.armsUp, (v + 0.5) / (T.armsUp + 0.5), 'armsHigher'); },
  armsDown: (m, T) => { const v = Math.max(m.wristUpL, m.wristUpR); return res(v < T.armsDown, v < T.armsDown ? 1 : 0.5, 'armsDown'); },

  leanEither: (m, T, mem) => {
    const ok = Math.abs(m.lean) > T.lean; if (ok) mem.lean = Math.sign(m.lean);
    return res(ok, Math.abs(m.lean) / T.lean, 'bendMore');
  },
  leanOther: (m, T, mem) => {
    const v = mem.lean ? -mem.lean * m.lean : Math.abs(m.lean);
    return res(v > T.lean, v / T.lean, 'leanOther');
  },
  kneeUpEither: (m, T, mem) => {
    const ok = Math.abs(m.kneeLift) > T.kneeLift; if (ok) mem.knee = Math.sign(m.kneeLift);
    return res(ok, Math.abs(m.kneeLift) / T.kneeLift, 'kneeUp');
  },
  kneeUpOther: (m, T, mem) => {
    const v = mem.knee ? -mem.knee * m.kneeLift : Math.abs(m.kneeLift);
    return res(v > T.kneeLift, v / T.kneeLift, 'kneeOther');
  },
  toeTouch: (m, T) => res(m.wristsBelowKnees > T.toeTouch, (m.wristsBelowKnees + 1) / (T.toeTouch + 1), 'bendMore'),
  touchFloor: (m, T) => res(m.wristsBelowKnees > T.toeTouch, (m.wristsBelowKnees + 1) / (T.toeTouch + 1), 'touchFloor'),
  standStraight: (m, T) => {
    const ok = m.kneeL > T.straightKnee && m.kneeR > T.straightKnee && Math.abs(m.lean) < T.upright + 5 && m.wristsBelowKnees < -0.5;
    return res(ok, ok ? 1 : 0.5, 'standStraight');
  },
  anjali: (m, T) => res(m.wristGap < T.anjaliGap && m.wristsChest, 1 - m.wristGap / 2, 'handsChest'),
  touchEyes: (m, T) => res(m.wristsNearEyes < T.eyeDist && m.wristUpL > 0 && m.wristUpR > 0, 1 - (m.wristsNearEyes - T.eyeDist) / 2, 'handsEyes'),

  samapadam: (m, T) => fromConds({
    feetTogether: m.ankleGap < T.feetTogether,
    kneesStraight: m.kneeL > T.straightKnee && m.kneeR > T.straightKnee,
    handsWaist: handsWaist(m, T),
    standStraight: Math.abs(m.lean) < T.upright,
  }, ['feetTogether', 'kneesStraight', 'handsWaist', 'standStraight']),

  aramandi: (m, T) => {
    const kMax = Math.max(m.kneeL, m.kneeR), kMin = Math.min(m.kneeL, m.kneeR);
    if (kMin < T.aramandiMinKnee) return res(false, 0.6, 'tooLow');   // protect little knees
    const r = fromConds({
      bendKnees: kMax < T.aramandiMaxKnee,
      kneesOut: m.kneeGap > m.ankleGap + T.kneesOutExtra,
      heelsTogether: m.ankleGap < T.heelsTogether,
      handsWaist: handsWaist(m, T),
      standStraight: Math.abs(m.lean) < T.upright,
    }, ['bendKnees', 'kneesOut', 'heelsTogether', 'handsWaist', 'standStraight']);
    const depth = clamp((T.aramandiMaxKnee - kMax) / (T.aramandiMaxKnee - T.aramandiGoodKnee));
    r.score = r.score * 0.6 + depth * 0.4;
    return r;
  },

  smile: (m, T) => m.face ? res(m.face.smile > T.smile, m.face.smile / T.smile, 'smileMore') : noFace(),
  surprised: (m, T) => {
    const f = m.face; if (!f) return noFace();
    const n = (f.eyeWide > T.eyeWide) + (f.jawOpen > T.jawOpen) + (f.browUp > T.browUp);
    return res(n >= 2, n / 2, 'bigEyes');
  },
  sad: (m, T) => {
    const f = m.face; if (!f) return noFace();
    const v = Math.max(f.frown / T.frown, (f.browUp > T.browUp * 0.8 && f.smile < 0.1) ? 1 : 0);
    return res(v >= 1, v, 'sadMore');
  },
  eyesEither: (m, T, mem) => {
    const f = m.face; if (!f) return noFace();
    const v = Math.max(f.lookA, f.lookB), ok = v > T.look;
    if (ok) mem.look = f.lookA > f.lookB ? 'A' : 'B';
    return res(ok, v / T.look, 'eyesMore');
  },
  eyesOther: (m, T, mem) => {
    const f = m.face; if (!f) return noFace();
    const v = mem.look === 'A' ? f.lookB : mem.look === 'B' ? f.lookA : Math.max(f.lookA, f.lookB);
    return res(v > T.look, v / T.look, 'lookOther');
  },
};

// Detects foot stamps: a foot lifts (rises in the image) and comes back down.
export class StampDetector {
  constructor(T) { this.T = T; this.reset(); }
  reset() {
    this.hist = { L: [], R: [] };
    this.state = { L: { up: false, peak: 0, last: 0 }, R: { up: false, peak: 0, last: 0 } };
    this.lift = { L: 0, R: 0 };
  }
  update(m, t) {
    const out = [];
    if (!m.fullBody) return out;
    for (const f of ['L', 'R']) {
      const y = f === 'L' ? m.footL : m.footR;
      const h = this.hist[f];
      h.push({ t, y });
      while (h.length && t - h[0].t > 2000) h.shift();
      let base = -Infinity; for (const s of h) if (s.y > base) base = s.y;   // floor level
      const lift = base - y; this.lift[f] = lift;
      const s = this.state[f];
      if (!s.up) {
        if (lift > this.T.lift) { s.up = true; s.peak = lift; }
      } else {
        s.peak = Math.max(s.peak, lift);
        if (lift < this.T.liftDown) {
          s.up = false;
          if (t - s.last > 250) { out.push({ foot: f, t, peak: s.peak }); s.last = t; }
        }
      }
    }
    return out;
  }
}
