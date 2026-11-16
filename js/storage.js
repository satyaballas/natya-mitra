// Saves settings, rhythm speed and session history in the browser (localStorage).
const KEY = 'natyaMitra.v1';

export class Progress {
  constructor(cfg) { this.cfg = cfg; this.data = this._load(); }
  _load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { console.warn(e); } }
  get settings() { return (this.data.settings ||= {}); }
  saveSettings(s) { this.data.settings = { ...this.settings, ...s }; this.save(); }
  getTempo() { return this.data.tempo || this.cfg.tempo.start; }
  setTempo(v) {
    const t = this.cfg.tempo;
    this.data.tempo = Math.max(t.min, Math.min(t.max, Math.round(v)));
    this.save(); return this.data.tempo;
  }
  bumpTempo(dir) { return this.setTempo(this.getTempo() + dir * this.cfg.tempo.step); }
  addSession(r) { (this.data.history ||= []).push(r); if (this.data.history.length > 300) this.data.history.shift(); this.save(); }
  get history() { return this.data.history || []; }
}
