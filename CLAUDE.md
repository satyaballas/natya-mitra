# Natya Mitra – project context for Claude

## What this is
A Bharatanatyam practice trainer for my daughter (4.8 years old; complete beginner).
- Runs in Microsoft Edge on a Windows laptop (8 GB RAM, 2 GB GPU) and shows on an Android TV over HDMI (Win+P → Duplicate).
- An Android phone is the webcam via DroidCam or Iriun.
- She sees a mirror image of herself with a skeleton overlay. An animated teacher (SVG) talks to her in Telugu and English, and a "Do like this" dancer figure demonstrates each pose.
- At the end of class there's a report: stars and stickers for her, plus a parent summary and history.
- So far her class has taught namaskaram, basic warm-ups and foot stamps (thattu).

## How I want to work
- **Clarify with me first, and change things in small steps.** Before any large code change, explain the plan and ask questions.
- I'm a developer (IBM BAW background, Python and JS are fine). Keep explanations concise.
- Gentle, encouraging teaching is a hard requirement: corrections at most every 6 s, never negative words, and protect her knees in Aramandi (`aramandiMinKnee`).

## Run / test
- Run: `start.bat` (python -m http.server 8000, then Edge at http://localhost:8000). ES modules need a server; file:// won't work.
- Logic tests: `node tests/test_logic.mjs`. They're pure Node: real poses.js/rhythm.js checks against the demo figure's keyframes.
- MediaPipe loads from a CDN: `@mediapipe/tasks-vision@1.2.3` (jsdelivr). Models come from storage.googleapis.com, so the first run needs internet.
- Edge's online "Natural" voices give Telugu (Shruti, te-IN) and English (Neerja, en-IN). Chrome usually has no Telugu voice.
- In the browser console, `window.natya` exposes demo, teacher, ui, progress, session and metrics for debugging.

## Architecture (all vanilla JS ES modules, no build step)
| File | Role |
|---|---|
| `js/config.js` | **All tunables**: thresholds `T`, timings, tempo, activities, plans (30/45/60 min), `PHRASES` (te + en). Edit here first. |
| `js/poses.js` | Pure logic. `computeMetrics()` turns landmarks into angles and ratios (normalized by shoulder width or torso length). `CHECKS` = check functions returning `{ok, score, hint}`. `StampDetector` detects foot lift → land. |
| `js/rhythm.js` | `BeatJudge` matches expected beats to detected stamps (±`windowMs`, plus `latencyMs`). |
| `js/vision.js` | MediaPipe PoseLandmarker (full) and FaceLandmarker (blendshapes). GPU first, CPU fallback. Face only runs when needed. |
| `js/audio.js` | Web Audio synth: mridangam (thom/tha/nam), Adi talam kriya (clap/finger/wave), tanpura plucks (C# sruti). A lookahead scheduler gives `onSchedule` (beat times) and `onBeat` (UI). |
| `js/teacher.js` | speechSynthesis queue, voice pick, mix mode (object = te then en; array = random single phrase), SVG expressions, `celebrate()`. |
| `js/demo.js` + `js/demo_poses.js` | Canvas dancer. Keyframes are in a 300×400 **mirror view** (her right = screen right). `poseToLandmarks()` converts them to camera landmarks for tests. |
| `js/lessons.js` | Runners. `SequenceRunner` handles hold steps with grace, hints, timeout, and gating (`stepBack`/`comeClose`). `RhythmRunner` runs count-in, cycles, judging and tempo adaptation. `BreakRunner`. |
| `js/session.js` | Plan: `main`, then `loop` until near time, then `closing`. Adds an auto water break every 15 min and a fatigue rest (2 weak activities). Builds the report. |
| `js/ui.js`, `js/report.js`, `js/storage.js`, `js/main.js` | DOM, report and history (localStorage `natyaMitra.v1`), boot, render loop, parent keys. |

Parent keys: Space pause, B break, N skip, E end, D debug overlay, +/- tempo, M music, F fullscreen.

Landmark conventions: MediaPipe indices use the person's own left/right. The camera image is unmirrored (her left = image right). Only the drawing is mirrored. `m.lean` > 0 means leaning toward image-right.

## Status
- v1 is complete. A headless-Chrome smoke test with a fake tracker passed the full class flow: 16/16 beats hit, tempo adapts, report renders.
- **Not yet verified with the real camera and the real child.** Thresholds in `config.js` `T` will likely need tuning with the D overlay.

## Backlog (v2 ideas, confirm with me before starting)
1. Tune thresholds from real-session feedback (D overlay numbers).
2. Use the phone mic (DroidCam audio) to sharpen stamp timing, with vision deciding which foot. Watch for the music bleeding into the mic.
3. Mudras with HandLandmarker (Pataka, Tripataka…), depending on what her teacher teaches next.
4. Adavus in Aramandi stance, then Tatta Adavu 2+ and a level/unlock system.
5. A latency calibration activity (clap with the beat) to set `latencyMs` automatically.
6. Progress charts in history; teacher name and custom stickers.
