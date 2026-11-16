// All DOM updates for the class screen.
const $ = id => document.getElementById(id);

export class UI {
  constructor(phrases) {
    this.phrases = phrases;
    this.hold = 0; this.status = 'none';
    this.el = {
      title: $('act-title'), stars: $('stars-count'), clock: $('clock'), timebar: $('timebar-fill'),
      badge: $('badge'), meter: $('meter-fill'), gate: $('gate-msg'),
      beatbar: $('beatbar'), beats: $('beats'), syllable: $('syllable'), footL: $('foot-l'), footR: $('foot-r'), count: $('count-in'),
      brk: $('break-overlay'), brkText: $('break-text'), brkCount: $('break-count'),
      pause: $('pause-overlay'), loading: $('loading-overlay'), loadingText: $('loading-text'),
      debug: $('debug'), confetti: $('confetti'),
    };
  }
  setActivity(t) { this.el.title.textContent = t; this.setGate(null); this.setMeter(0); this.setBadge(null); this.status = 'none'; }
  setStars(n) { this.el.stars.textContent = n; }
  setClock(ms, totalMs) {
    const s = Math.floor(ms / 1000);
    this.el.clock.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    this.el.timebar.style.width = Math.min(100, (ms / totalMs) * 100) + '%';
  }
  setBadge(kind) {
    this.status = kind || 'none';
    this.el.badge.className = 'badge ' + (kind || '');
    this.el.badge.textContent = kind === 'good' ? '✓' : kind === 'try' ? '…' : '';
  }
  setMeter(v) { this.el.meter.style.width = Math.round(Math.max(0, Math.min(1, v)) * 100) + '%'; }
  setHold(p) { this.hold = Math.max(0, Math.min(1, p)); }
  setGate(key) {
    if (!key) { this.el.gate.hidden = true; return; }
    const p = this.phrases[key];
    this.el.gate.innerHTML = `<div>${key === 'comeClose' ? '🙂' : '👣'}</div><div>${p.te}</div><div class="en">${p.en}</div>`;
    this.el.gate.hidden = false;
  }

  // ---- rhythm ----
  showBeatbar(show) {
    this.el.beatbar.hidden = !show;
    if (show) {
      this.el.beats.innerHTML = '';
      for (let i = 0; i < 8; i++) {
        const d = document.createElement('div');
        d.className = 'beat' + ([0, 4, 6].includes(i) ? ' clap' : '');
        d.innerHTML = `<span>${['Thai', 'ya', 'Thai', 'hi'][i % 4]}</span>`;
        this.el.beats.appendChild(d);
      }
      this.el.syllable.textContent = '';
      this.el.count.textContent = '';
    }
  }
  beatCount(n) { this.el.count.textContent = n; this.el.count.classList.remove('pop'); void this.el.count.offsetWidth; this.el.count.classList.add('pop'); }
  beatActive(pos, syl, foot) {
    this.el.count.textContent = '';
    const kids = [...this.el.beats.children];
    if (pos === 0) kids.forEach(k => k.classList.remove('hit', 'miss'));
    kids.forEach((k, i) => k.classList.toggle('active', i === pos));
    this.el.syllable.textContent = syl;
    this.el.footR.classList.toggle('active', foot === 'R');
    this.el.footL.classList.toggle('active', foot === 'L');
  }
  markBeat(pos, hit) { const k = this.el.beats.children[pos]; if (k) k.classList.add(hit ? 'hit' : 'miss'); }

  // ---- overlays ----
  showBreak(show, text = 'Water break!') { this.el.brk.hidden = !show; this.el.brkText.textContent = text; }
  setBreakCount(s) { this.el.brkCount.textContent = s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  showPause(show) { this.el.pause.hidden = !show; }
  showLoading(text) { this.el.loading.hidden = !text; if (text) this.el.loadingText.textContent = text; }
  setDebug(text) { this.el.debug.hidden = text == null; if (text != null) this.el.debug.textContent = text; }

  sparkle() { this._burst(8, ['✨', '⭐'], true); }
  confetti() { this._burst(40, ['⭐', '🌸', '✨', '🪷', '🎉'], false); }
  _burst(n, chars, small) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = small ? 'spark' : 'conf';
      s.textContent = chars[i % chars.length];
      s.style.left = (small ? 20 + Math.random() * 40 : Math.random() * 100) + 'vw';
      s.style.animationDelay = Math.random() * (small ? 0.2 : 0.8) + 's';
      this.el.confetti.appendChild(s);
      setTimeout(() => s.remove(), 3500);
    }
  }
}
