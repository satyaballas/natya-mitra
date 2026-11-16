// Boot: start screen, camera, render loop, keyboard controls.
import { CONFIG, PHRASES } from './config.js';
import { computeMetrics, smooth, StampDetector, CONNECTIONS } from './poses.js';
import { Music } from './audio.js';
import { Teacher } from './teacher.js';
import { Demo } from './demo.js';
import { UI } from './ui.js';
import { Session } from './session.js';
import { Progress } from './storage.js';
import { renderReport, renderHistory } from './report.js';

const $ = id => document.getElementById(id);
const video = $('cam'), view = $('view'), vctx = view.getContext('2d');
const progress = new Progress(CONFIG);
const ui = new UI(PHRASES);
const teacher = new Teacher({ svg: $('teacher'), wrap: $('teacher-wrap'), bubbleTe: $('bubble-te'), bubbleEn: $('bubble-en'), phrases: PHRASES, rate: CONFIG.speechRate });
const demo = new Demo($('demo'));
const stampDetector = new StampDetector(CONFIG.T);
const state = { paused: false };
let music = null, vision = null, session = null, smoothed = null, lastVT = -1, debug = false, lastM = null, running = false;

function show(screen) {
  for (const id of ['start-screen', 'app', 'report-screen']) $(id).hidden = id !== screen;
}
const status = t => ($('start-status').textContent = t);

// ---------------- start screen ----------------
async function populateCameras() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: true });
    s.getTracks().forEach(t => t.stop());
  } catch (e) { status('⚠ Camera permission is needed: ' + e.message); }
  const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
  const sel = $('camera-select'); sel.innerHTML = '';
  devs.forEach((d, i) => sel.add(new Option(d.label || `Camera ${i + 1}`, d.deviceId)));
  const saved = progress.settings.cameraId;
  const phone = devs.find(d => /droidcam|iriun|camo|virtual/i.test(d.label));
  sel.value = devs.some(d => d.deviceId === saved) ? saved : (phone?.deviceId || devs[0]?.deviceId || '');
  if (!devs.length) status('⚠ No camera found. Start DroidCam / Iriun on the laptop and the phone, then reload.');
}

function loadSettings() {
  const s = progress.settings;
  $('child-name').value = s.child || '';
  $('session-length').value = s.minutes || '30';
  $('voice-mode').value = s.voice || 'mix';
  $('tempo').value = progress.getTempo();
}

$('btn-history').onclick = () => { show('report-screen'); renderHistory($('report-screen'), progress.history, { onHome: () => show('start-screen') }); };

$('btn-test-voice').onclick = async () => {
  const v = await teacher.initVoices();
  teacher.mode = $('voice-mode').value; teacher.name = $('child-name').value || '';
  status(`Voices → Telugu: ${v.te || 'NOT FOUND (use Microsoft Edge)'} | English: ${v.en || 'not found'}`);
  teacher.say('welcome');
};

$('btn-start').onclick = async () => {
  const child = $('child-name').value.trim();
  if (!child) { status("Please enter the child's name so practice is saved to the right history."); $('child-name').focus(); return; }
  const settings = {
    child, minutes: Number($('session-length').value),
    voice: $('voice-mode').value, cameraId: $('camera-select').value,
  };
  progress.saveSettings(settings);
  progress.setTempo(Number($('tempo').value) || CONFIG.tempo.start);
  document.documentElement.requestFullscreen?.().catch(() => {});
  if (!music) { music = new Music(CONFIG); music.init(); }        // inside the click (audio rule)
  $('btn-start').disabled = true;
  try {
    status('Starting camera…');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: settings.cameraId ? { exact: settings.cameraId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      audio: false,
    });
    video.srcObject = stream; await video.play();
    view.width = video.videoWidth || 1280; view.height = video.videoHeight || 720;
    status('Getting the teacher ready…');
    const v = await teacher.initVoices();
    teacher.mode = settings.voice; teacher.name = settings.child;
    if (!v.te && settings.voice !== 'en') console.warn('No Telugu voice found – speaking English. Use Microsoft Edge for Telugu.');
    show('app'); ui.showLoading('Loading…');
    if (!vision) {
      const { Vision } = await import('./vision.js');
      vision = new Vision();
      await vision.init(t => ui.showLoading(t));
    }
    ui.showLoading(null);
    if (!running) { running = true; requestAnimationFrame(loop); }
    startClass(settings);
  } catch (e) {
    console.error(e); show('start-screen');
    status('⚠ Could not start: ' + e.message + ' (check internet for first load, and camera app)');
  } finally { $('btn-start').disabled = false; }
};

async function startClass(settings) {
  state.paused = false; ui.setStars(0);
  session = new Session({ cfg: CONFIG, phrases: PHRASES, teacher, music, ui, demo, progress, stampDetector, state }, settings);
  const clock = setInterval(() => session && ui.setClock(session.elapsed(), session.totalMs), 500);
  const rep = await session.run();
  clearInterval(clock);
  progress.addSession(rep);
  session = null;
  ui.showPause(false); ui.showBreak(false); ui.showLoading(null);
  $('btn-stop').disabled = false;
  music?.stop(); music?.stopDrone();
  video.srcObject?.getTracks().forEach(track => track.stop());
  video.srcObject = null;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  show('report-screen');
  renderReport($('report-screen'), rep, PHRASES, {
    onHome: () => show('start-screen'),
    onHistory: () => renderHistory($('report-screen'), progress.history, { onHome: () => show('start-screen') }),
  });
}

function stopClass() {
  if (!session || !confirm('Stop practice now and save the progress so far?')) return;
  $('btn-stop').disabled = true;
  session.end();
}

$('btn-stop').onclick = stopClass;

// ---------------- render loop ----------------
function loop() {
  const now = performance.now();
  if (vision && video.readyState >= 2 && video.currentTime !== lastVT) {
    lastVT = video.currentTime;
    const r = vision.detect(video, now, session?.wantsFace() || debug);
    smoothed = smooth(smoothed, r.pose, 0.5);
    const m = computeMetrics(smoothed, view.width, view.height, r.blend, CONFIG.T);
    lastM = m;
    const stamps = stampDetector.update(m, now);
    session?.onFrame(m, now, stamps);
    if (debug) showDebug(m, stamps);
  }
  draw();
  requestAnimationFrame(loop);
}

function draw() {
  const W = view.width, H = view.height;
  vctx.save(); vctx.translate(W, 0); vctx.scale(-1, 1);          // mirror like a real mirror
  vctx.drawImage(video, 0, 0, W, H);
  vctx.restore();
  if (smoothed) {
    const col = ui.status === 'good' ? '#3ddc97' : ui.status === 'try' ? '#ffb347' : '#9ecbff';
    const X = p => (1 - p.x) * W, Y = p => p.y * H;
    vctx.lineWidth = Math.max(4, W / 220); vctx.strokeStyle = col; vctx.lineCap = 'round';
    for (const [a, b] of CONNECTIONS) {
      const p = smoothed[a], q = smoothed[b];
      if ((p.visibility ?? 1) < 0.4 || (q.visibility ?? 1) < 0.4) continue;
      vctx.beginPath(); vctx.moveTo(X(p), Y(p)); vctx.lineTo(X(q), Y(q)); vctx.stroke();
    }
    vctx.fillStyle = '#fff';
    for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
      const p = smoothed[i]; if ((p.visibility ?? 1) < 0.4) continue;
      vctx.beginPath(); vctx.arc(X(p), Y(p), Math.max(5, W / 180), 0, 7); vctx.fill();
    }
  }
  if (ui.hold > 0) {                                               // hold-the-pose ring
    const r = H * 0.08, cx = W - r * 1.6, cy = r * 1.6;
    vctx.lineWidth = r * 0.28;
    vctx.strokeStyle = 'rgba(255,255,255,0.3)'; vctx.beginPath(); vctx.arc(cx, cy, r, 0, 7); vctx.stroke();
    vctx.strokeStyle = '#ffd34d'; vctx.beginPath(); vctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + ui.hold * Math.PI * 2); vctx.stroke();
  }
}

function showDebug(m, stamps) {
  const f = x => (typeof x === 'number' ? x.toFixed(2) : x);
  const lines = [
    `fullBody ${m.fullBody}  hasBody ${m.hasBody}`,
    `knee L/R ${f(m.kneeL)} / ${f(m.kneeR)}   lean ${f(m.lean)}`,
    `ankleGap ${f(m.ankleGap)}  kneeGap ${f(m.kneeGap)}  wristGap ${f(m.wristGap)}`,
    `waist L/R ${f(m.waistL)} / ${f(m.waistR)}  wristUp L/R ${f(m.wristUpL)} / ${f(m.wristUpR)}`,
    `belowKnees ${f(m.wristsBelowKnees)}  nearEyes ${f(m.wristsNearEyes)}  chest ${m.wristsChest}  kneeLift ${f(m.kneeLift)}`,
    `foot lift L/R ${f(stampDetector.lift.L)} / ${f(stampDetector.lift.R)}  ${stamps.map(s => 'STAMP ' + s.foot).join(' ')}`,
    m.face ? `face smile ${f(m.face.smile)} jaw ${f(m.face.jawOpen)} wide ${f(m.face.eyeWide)} brow ${f(m.face.browUp)} frown ${f(m.face.frown)} lookA ${f(m.face.lookA)} lookB ${f(m.face.lookB)}` : 'face: –',
    `tempo ${progress.getTempo()} bpm   volume ${music ? music.volume.toFixed(1) : '-'}`,
  ];
  ui.setDebug(lines.join('\n'));
}

// ---------------- parent keyboard controls ----------------
let manualBreak = false;
document.addEventListener('keydown', e => {
  if (!session) return;
  switch (e.key) {
    case ' ': e.preventDefault();
      if (manualBreak) { manualBreak = false; ui.showBreak(false); }
      session.togglePause(); ui.showPause(state.paused); break;
    case 'n': case 'N': session.skip(); break;
    case 'b': case 'B':
      if (!state.paused) { session.togglePause(true); manualBreak = true; ui.showBreak(true, 'Water break 🥤 (Space to continue)'); ui.setBreakCount(null); teacher.say('waterBreak'); }
      break;
    case 'e': case 'E': case 'Escape': stopClass(); break;
    case 'd': case 'D': debug = !debug; if (!debug) ui.setDebug(null); break;
    case '+': case '=': progress.bumpTempo(+1); break;
    case '-': progress.bumpTempo(-1); break;
    case 'm': case 'M': music?.setVolume(music.volume > 0 ? 0 : CONFIG.musicVolume); break;
    case 'f': case 'F': document.documentElement.requestFullscreen?.().catch(() => {}); break;
  }
});

// handy for debugging from the browser console (F12)
window.natya = { demo, teacher, ui, progress, CONFIG, get session() { return session; }, get metrics() { return lastM; } };

loadSettings();
populateCameras();
