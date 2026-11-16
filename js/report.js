// End-of-class report (child view + parent view) and progress history.
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STICKERS = ['🪷', '🦚', '🌸', '🐘', '🌟', '🦋', '🌼', '🐰', '🎀', '🌈'];

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function detail(a) {
  if (a.type === 'break') return `${Math.round(a.secs / 6) / 10} min${a.partial ? ' (stopped)' : ''}`;
  if (a.skipped) return 'skipped';
  if (a.type === 'rhythm') {
    const r = a.rounds || [];
    return `${r.length} round(s), on-beat ${a.score ?? '–'}%, correct foot ${a.footAcc == null ? '–' : Math.round(a.footAcc * 100)}%, up to ${a.bpmMax ?? '–'} bpm${a.partial ? ' (partial)' : ''}`;
  }
  return `${a.stepsDone}/${a.steps} steps held${a.partial ? ' (partial)' : ''}`;
}

export function renderReport(el, rep, phrases, { onHome, onHistory }) {
  const n = Math.min(rep.stars, 20);
  const stickers = Array.from({ length: Math.max(1, n) }, (_, i) => STICKERS[i % STICKERS.length]).join(' ');
  const acts = rep.activities.filter(a => a.type !== 'break' && !a.skipped && a.score != null);
  const strong = [...acts].sort((a, b) => b.score - a.score).slice(0, 2);
  const weak = [...acts].filter(a => a.score < 70).sort((a, b) => a.score - b.score).slice(0, 2);
  const fixes = rep.corrections.slice(0, 3).map(c => `${esc(phrases[c.key]?.en || c.key)} <small>(×${c.count})</small>`);

  el.innerHTML = `
    <div class="report-child">
      <h1>${rep.endedEarly ? `Great practice, ${esc(rep.child || 'dancer')}!` : `${esc(rep.child || 'Super dancer')}, you earned`}</h1>
      <div class="big-stars">⭐ ${rep.stars}</div>
      <div class="stickers">${stickers}</div>
      <p class="te">${rep.endedEarly ? 'You did a lovely job practising today!' : esc(phrases.sessionDone.te)}</p>
    </div>
    <div class="report-parent">
      <h2>Parent summary – ${esc(rep.child || 'Unknown child')} – ${new Date(rep.date).toLocaleString()}</h2>
      <div class="kpis">
        <div><b>${rep.durationMin}</b><span>minutes</span></div>
        <div><b>${rep.overall}%</b><span>overall</span></div>
        <div><b>${rep.tattuAccuracy ?? '–'}${rep.tattuAccuracy != null ? '%' : ''}</b><span>stamps on beat</span></div>
        <div><b>${rep.tempoStart}→${rep.tempoEnd}</b><span>rhythm bpm</span></div>
        <div><b>${rep.breaks}</b><span>breaks</span></div>
      </div>
      <div class="cols">
        <div><h3>👍 Did well</h3><ul>${strong.map(a => `<li>${esc(a.title)} – ${a.score}%</li>`).join('') || '<li>–</li>'}</ul></div>
        <div><h3>🎯 Practise next</h3><ul>${weak.map(a => `<li>${esc(a.title)} – ${a.score}%</li>`).join('') || '<li>All good!</li>'}</ul></div>
        <div><h3>🗣 Most common corrections</h3><ul>${fixes.map(f => `<li>${f}</li>`).join('') || '<li>None</li>'}</ul></div>
      </div>
      <table><thead><tr><th>Activity</th><th>Score</th><th>Stars</th><th>Details</th></tr></thead><tbody>
        ${rep.activities.map(a => `<tr><td>${esc(a.title)}</td><td>${a.score ?? '–'}${a.score != null ? '%' : ''}</td><td>${'⭐'.repeat(a.stars || 0)}</td><td>${esc(detail(a))}</td></tr>`).join('')}
      </tbody></table>
      ${rep.endedEarly ? '<p class="note">Class was ended early.</p>' : ''}
      <div class="buttons">
        <button id="rp-json">⬇ Download report (JSON)</button>
        <button id="rp-print">🖨 Print</button>
        <button id="rp-hist">📒 Progress history</button>
        <button id="rp-home">🏠 Back to start</button>
      </div>
    </div>`;
  el.querySelector('#rp-json').onclick = () => download(`natya-report-${rep.date.slice(0, 10)}.json`, JSON.stringify(rep, null, 2), 'application/json');
  el.querySelector('#rp-print').onclick = () => window.print();
  el.querySelector('#rp-hist').onclick = onHistory;
  el.querySelector('#rp-home').onclick = onHome;
}

export function renderHistory(el, history, { onHome }) {
  const rows = [...history].reverse();
  el.innerHTML = `
    <div class="report-parent">
      <h2>📒 Progress history (${rows.length} sessions)</h2>
      <table><thead><tr><th>Child</th><th>Date</th><th>Minutes</th><th>Stars</th><th>Overall</th><th>Stamps on beat</th><th>Rhythm bpm</th><th>Practise next</th></tr></thead><tbody>
      ${rows.map(r => {
        const weak = r.activities.filter(a => a.type !== 'break' && a.score != null && !a.skipped && a.score < 70).map(a => a.title).slice(0, 2).join(', ');
        return `<tr><td>${esc(r.child || 'Unknown child')}</td><td>${new Date(r.date).toLocaleDateString()}</td><td>${r.durationMin}${r.endedEarly ? ' (stopped)' : ''}</td><td>${r.stars}</td><td>${r.overall}%</td><td>${r.tattuAccuracy ?? '–'}${r.tattuAccuracy != null ? '%' : ''}</td><td>${r.tempoStart}→${r.tempoEnd}</td><td>${esc(weak || '–')}</td></tr>`;
      }).join('') || '<tr><td colspan="8">No sessions yet</td></tr>'}
      </tbody></table>
      <div class="buttons">
        <button id="hs-csv">⬇ Download CSV</button>
        <button id="hs-home">🏠 Back to start</button>
      </div>
    </div>`;
  el.querySelector('#hs-csv').onclick = () => {
    const csv = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const head = 'child,date,minutes,stars,overall,tattu_on_beat,bpm_start,bpm_end,ended_early\n';
    const body = history.map(r => [r.child || 'Unknown child', r.date, r.durationMin, r.stars, r.overall, r.tattuAccuracy ?? '', r.tempoStart, r.tempoEnd, r.endedEarly].map(csv).join(',')).join('\n');
    download('natya-history.csv', head + body, 'text/csv');
  };
  el.querySelector('#hs-home').onclick = onHome;
}
