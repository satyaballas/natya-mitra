// The on-screen teacher: voice (Telugu + English), speech bubble and facial expressions.
export class Teacher {
  constructor({ svg, wrap, bubbleTe, bubbleEn, phrases, rate = 0.9 }) {
    Object.assign(this, { svg, wrap, bubbleTe, bubbleEn, phrases, rate });
    this.mode = 'mix'; this.name = ''; this.pending = 0; this.busy = false;
    this.teVoice = null; this.enVoice = null; this.activeSpeech = new Set();
  }

  async initVoices() {
    const get = () => speechSynthesis.getVoices();
    if (!get().length) {
      await new Promise(r => {
        const t = setTimeout(r, 2500);
        speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(t); r(); }, { once: true });
      });
    }
    const vs = get();
    const score = v => (/natural/i.test(v.name) ? 4 : 0) + (/online/i.test(v.name) ? 2 : 0) + (/shruti|neerja|swara|heera/i.test(v.name) ? 1 : 0);
    const best = pred => vs.filter(pred).sort((a, b) => score(b) - score(a))[0] || null;
    this.teVoice = best(v => v.lang.toLowerCase().startsWith('te'));
    this.enVoice = best(v => v.lang.toLowerCase() === 'en-in') || best(v => v.lang.toLowerCase().startsWith('en-gb'))
      || best(v => v.lang.toLowerCase().startsWith('en'));
    return { te: this.teVoice?.name || null, en: this.enVoice?.name || null };
  }

  _fill(s, vars) { return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? (k === 'name' ? this.name : '')); }

  text(key) { const p = this.phrases[key]; return Array.isArray(p) ? p[0] : p; }

  say(key, { interrupt = false, ifIdle = false, vars = {} } = {}) {
    const p = this.phrases[key];
    if (!p) { console.warn('Missing phrase', key); return Promise.resolve(); }
    if (ifIdle && this.busy) return Promise.resolve();
    if (interrupt) this.stop();
    const one = Array.isArray(p);
    const v = one ? p[Math.floor(Math.random() * p.length)] : p;
    let mode = this.mode;
    if (!this.teVoice && mode !== 'en') mode = 'en';           // no Telugu voice installed → English only
    let segs;
    if (mode === 'te') segs = [['te', v.te]];
    else if (mode === 'en') segs = [['en', v.en]];
    else segs = one ? [Math.random() < 0.5 ? ['te', v.te] : ['en', v.en]] : [['te', v.te], ['en', v.en]];
    segs = segs.map(([l, t]) => [l, this._fill(t, vars)]);
    this.bubbleTe.textContent = this._fill(v.te, vars);
    this.bubbleEn.textContent = this._fill(v.en, vars);
    return this._speak(segs);
  }

  _speak(segs) {
    this.pending++; this.busy = true; this.svg.classList.add('talking');
    return new Promise(resolve => {
      let finished = false;
      const len = segs.reduce((a, [, t]) => a + t.length, 0);
      const done = () => {
        if (finished) return; finished = true; clearTimeout(timer);
        this.activeSpeech.delete(done);
        this.pending = Math.max(0, this.pending - 1);
        if (!this.pending) { this.busy = false; this.svg.classList.remove('talking'); }
        resolve();
      };
      const timer = setTimeout(done, 3000 + len * 150 + this.pending * 3000);   // safety if onend never fires
      this.activeSpeech.add(done);
      segs.forEach(([lang, text], i) => {
        const u = new SpeechSynthesisUtterance(text);
        const voice = lang === 'te' ? this.teVoice : this.enVoice;
        if (voice) u.voice = voice;
        u.lang = voice?.lang || (lang === 'te' ? 'te-IN' : 'en-IN');
        u.rate = this.rate; u.pitch = 1.1;
        if (i === segs.length - 1) { u.onend = done; u.onerror = done; }
        speechSynthesis.speak(u);
      });
    });
  }

  stop() {
    speechSynthesis.cancel();
    for (const done of [...this.activeSpeech]) done();
  }

  _applyExpr(e) {
    this.svg.classList.remove('expr-neutral', 'expr-happy', 'expr-surprised', 'expr-sad', 'expr-lookA', 'expr-lookB');
    this.svg.classList.add('expr-' + e);
  }
  setExpression(e = 'neutral') { this.expr = e; if (!this.celebrating) this._applyExpr(e); }

  celebrate() {                       // brief happy bounce, then back to whatever the lesson needs
    this.celebrating = true; this._applyExpr('happy');
    this.wrap.classList.remove('bounce'); void this.wrap.offsetWidth; this.wrap.classList.add('bounce');
    clearTimeout(this._celT);
    this._celT = setTimeout(() => { this.celebrating = false; this._applyExpr(this.expr || 'neutral'); }, 1200);
  }
}
