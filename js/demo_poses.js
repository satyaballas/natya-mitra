// Demo figure keyframes in a 300×400 box, drawn as the child's MIRROR image
// (her right side appears on the screen's right, like a real mirror).

const UPPER = ['head', 'neck', 'lSh', 'rSh', 'lEl', 'rEl', 'lWr', 'rWr'];

export const BASE = {
  head: [150, 58], neck: [150, 92],
  lSh: [118, 104], rSh: [182, 104],
  lEl: [88, 148], rEl: [212, 148],
  lWr: [122, 182], rWr: [178, 182],          // hands on waist
  lHip: [130, 200], rHip: [170, 200],
  lKn: [136, 282], rKn: [164, 282],
  lAn: [143, 360], rAn: [157, 360],
  lToe: [128, 372], rToe: [172, 372],
};

const P = (over = {}, from = BASE) => {
  const p = {}; for (const k in from) p[k] = [...from[k]];
  for (const k in over) p[k] = [...over[k]];
  return p;
};

function shiftUpper(p, dy) { for (const k of UPPER) p[k][1] += dy; return p; }

function rotateUpper(p, deg, c = [150, 200]) {
  const a = deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
  for (const k of UPPER) {
    const dx = p[k][0] - c[0], dy = p[k][1] - c[1];
    p[k] = [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs];
  }
  return p;
}

const aramandiBase = shiftUpper(P({
  lHip: [130, 228], rHip: [170, 228],
  lKn: [100, 292], rKn: [200, 292],
  lAn: [143, 360], rAn: [157, 360],
  lToe: [118, 366], rToe: [182, 366],
}), 28);

export const POSES = {
  stand: P(),
  armsDown: P({ lEl: [108, 155], rEl: [192, 155], lWr: [104, 205], rWr: [196, 205] }),
  armsUp: P({ lEl: [106, 58], rEl: [194, 58], lWr: [118, 14], rWr: [182, 14] }),
  anjali: P({ lEl: [112, 165], rEl: [188, 165], lWr: [146, 140], rWr: [154, 140] }),
  touchEyes: P({ lEl: [100, 120], rEl: [200, 120], lWr: [136, 62], rWr: [164, 62] }),
  touchFloor: P({
    head: [150, 215], neck: [150, 182], lSh: [120, 182], rSh: [180, 182],
    lEl: [122, 270], rEl: [178, 270], lWr: [132, 352], rWr: [168, 352],
  }),
  aramandi: aramandiBase,
  leanL: rotateUpper(P({ rEl: [196, 60], rWr: [166, 22] }), -18),   // bend to her left, right arm over head
  leanR: rotateUpper(P({ lEl: [104, 60], lWr: [134, 22] }), 18),
  kneeUpR: P({ rKn: [178, 214], rAn: [172, 290], rToe: [186, 296] }),
  kneeUpL: P({ lKn: [122, 214], lAn: [128, 290], lToe: [114, 296] }),
  stampR: P({ rKn: [164, 266], rAn: [160, 332], rToe: [174, 342] }),
  stampL: P({ lKn: [136, 266], lAn: [140, 332], lToe: [126, 342] }),
};

// Map demo joints → MediaPipe landmark indices (used by tests to fake a camera frame)
export const JOINT_TO_LM = {
  head: 0, lSh: 11, rSh: 12, lEl: 13, rEl: 14, lWr: 15, rWr: 16,
  lHip: 23, rHip: 24, lKn: 25, rKn: 26, lAn: 27, rAn: 28, lToe: 31, rToe: 32,
};

// Convert a mirror-view demo pose to un-mirrored normalized camera landmarks.
export function poseToLandmarks(pose, W = 300, H = 400) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.1, z: 0, visibility: 1 }));
  for (const k in JOINT_TO_LM) {
    const [x, y] = pose[k];
    lm[JOINT_TO_LM[k]] = { x: (W - x) / W, y: y / H, z: 0, visibility: 1 };
  }
  lm[29] = { ...lm[27], y: lm[27].y + 6 / H };   // heels just below ankles
  lm[30] = { ...lm[28], y: lm[28].y + 6 / H };
  return lm;
}
