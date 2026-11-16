import { CONFIG } from '../js/config.js';
import { computeMetrics, CHECKS, StampDetector } from '../js/poses.js';
import { POSES, poseToLandmarks } from '../js/demo_poses.js';
import { BeatJudge } from '../js/rhythm.js';
const T = CONFIG.T; let fails = 0;
const M = k => computeMetrics(poseToLandmarks(POSES[k]), 300, 400, null, T);
function expect(pose, check, want, mem = {}) {
  const r = CHECKS[check](M(pose), T, mem);
  const ok = r.ok === want; if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${pose.padEnd(10)} ${check.padEnd(13)} ok=${r.ok} hint=${r.hint} score=${r.score.toFixed(2)}`);
}
expect('stand','visible',true);
expect('stand','samapadam',true); expect('aramandi','samapadam',false);
expect('aramandi','aramandi',true); expect('stand','aramandi',false);
expect('anjali','anjali',true); expect('touchEyes','anjali',false); expect('stand','anjali',false);
expect('touchEyes','touchEyes',true); expect('anjali','touchEyes',false);
expect('touchFloor','touchFloor',true); expect('stand','touchFloor',false);
expect('armsUp','armsUp',true); expect('stand','armsUp',false); expect('armsDown','armsDown',true);
expect('stand','standStraight',true); expect('aramandi','standStraight',false); expect('touchFloor','standStraight',false); expect('armsDown','standStraight',true);
const mem={}; expect('leanL','leanEither',true,mem); expect('leanR','leanOther',true,mem); expect('leanL','leanOther',false,mem);
const mk={}; expect('kneeUpR','kneeUpEither',true,mk); expect('kneeUpL','kneeUpOther',true,mk); expect('kneeUpR','kneeUpOther',false,mk); expect('stand','kneeUpEither',false);
// stamp detection
const sd = new StampDetector(T); let t=0; const st=[];
const seq = ['stand','stand','stand','stampR','stampR','stand','stand','stampL','stand','stand'];
for (let rep=0; rep<3; rep++) for (const k of seq) { t+=100; st.push(...sd.update(M(k), t)); }
console.log('stamps:', st.map(s=>s.foot).join(''), st.length===6 && st.map(s=>s.foot).join('')==='RLRLRL' ? 'PASS':'FAIL'); if (st.length!==6) fails++;
// beat judge
const j = new BeatJudge(350, 150);
[0,1500,3000,4500].forEach((tt,i)=>j.addBeat({idx:i,t:tt,foot:i%2?'L':'R'}));
j.addStamps([{foot:'R',t:200},{foot:'R',t:1700},{foot:'L',t:3900}]);
j.evaluateDue(1e9); const s=j.summary(); console.log('judge', JSON.stringify(s), s.hits===2&&s.footOk===1?'PASS':'FAIL'); if(!(s.hits===2&&s.footOk===1)) fails++;
console.log(fails? `${fails} FAILED` : 'ALL PASS'); process.exit(fails?1:0);
