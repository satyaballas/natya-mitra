// Animated "do like this" dancer figure, drawn on a canvas.
import { POSES } from './demo_poses.js';

const SKIN = '#c98b5e', COSTUME = '#8e1b4a', GOLD = '#f2b134', HAIR = '#1d1414';

export class Demo {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.target = POSES.stand; this.cur = clone(POSES.stand);
    this.emoji = null; this.flash = null;
    const loop = () => { this.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  setPose(key) { this.emoji = null; this.target = POSES[key] || POSES.stand; }
  setEmoji(e) { this.emoji = e; }
  flashFoot(foot) { this.flash = { key: foot === 'R' ? 'rAn' : 'lAn', until: performance.now() + 250 }; }

  draw() {
    const { ctx, c } = this;
    ctx.clearRect(0, 0, c.width, c.height);
    if (this.emoji) {
      ctx.font = '170px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.emoji, c.width / 2, c.height / 2);
      return;
    }
    for (const k in this.target) {                      // ease toward the target pose
      this.cur[k][0] += (this.target[k][0] - this.cur[k][0]) * 0.22;
      this.cur[k][1] += (this.target[k][1] - this.cur[k][1]) * 0.22;
    }
    const p = this.cur, sx = c.width / 300, sy = c.height / 400;
    ctx.save(); ctx.scale(sx, sy);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const line = (pts, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
    const poly = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); };

    // legs (costume pyjama) and feet
    for (const s of ['l', 'r']) {
      line([p[s + 'Hip'], p[s + 'Kn'], p[s + 'An']], 18, COSTUME);
      line([p[s + 'An'], p[s + 'Toe']], 10, SKIN);
      ctx.fillStyle = GOLD;                                   // ankle bells (salangai)
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(p[s + 'An'][0] + i * 6, p[s + 'An'][1] - 4, 3, 0, 7); ctx.fill(); }
    }
    // pleated fan between the knees
    const kneeMid = [(p.lKn[0] + p.rKn[0]) / 2, Math.max(p.lKn[1], p.rKn[1]) + 10];
    poly([p.lHip, p.rHip, p.rKn, kneeMid, p.lKn], GOLD);
    ctx.strokeStyle = '#d18f12'; ctx.lineWidth = 2;
    for (let i = 1; i < 5; i++) { const t = i / 5; ctx.beginPath(); ctx.moveTo(p.lHip[0] + (p.rHip[0] - p.lHip[0]) * t, p.lHip[1]); ctx.lineTo(p.lKn[0] + (p.rKn[0] - p.lKn[0]) * t, kneeMid[1] - 6); ctx.stroke(); }
    // torso + waist belt
    poly([p.lSh, p.rSh, p.rHip, p.lHip], COSTUME);
    line([p.lHip, p.rHip], 7, GOLD);
    // arms
    for (const s of ['l', 'r']) line([p[s + 'Sh'], p[s + 'El'], p[s + 'Wr']], 12, SKIN);
    // neck + head
    line([p.neck, [(p.lSh[0] + p.rSh[0]) / 2, (p.lSh[1] + p.rSh[1]) / 2]], 12, SKIN);
    const [hx, hy] = p.head;
    ctx.fillStyle = HAIR; ctx.beginPath(); ctx.arc(hx, hy - 4, 29, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(hx, hy - 34, 12, 0, 7); ctx.fill();                       // bun
    ctx.fillStyle = '#fffaf0'; for (let a = -1.2; a <= 1.2; a += 0.4) { ctx.beginPath(); ctx.arc(hx + Math.sin(a) * 15, hy - 34 - Math.cos(a) * 13, 3, 0, 7); ctx.fill(); }  // jasmine
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(hx, hy + 2, 24, 0, 7); ctx.fill();
    ctx.fillStyle = '#d7263d'; ctx.beginPath(); ctx.arc(hx, hy - 10, 3, 0, 7); ctx.fill();   // bindi
    ctx.fillStyle = '#2b1a12'; ctx.beginPath(); ctx.arc(hx - 8, hy, 2.6, 0, 7); ctx.arc(hx + 8, hy, 2.6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8b2c2c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hx, hy + 6, 8, 0.2, Math.PI - 0.2); ctx.stroke();
    // foot flash on the beat
    if (this.flash && performance.now() < this.flash.until) {
      const [fx, fy] = p[this.flash.key];
      ctx.fillStyle = 'rgba(255,230,80,0.85)';
      for (let a = 0; a < 6.28; a += 0.785) { ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 20, fy + Math.sin(a) * 12, 4, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
}

function clone(p) { const o = {}; for (const k in p) o[k] = [...p[k]]; return o; }
