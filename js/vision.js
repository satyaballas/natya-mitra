// MediaPipe body + face tracking (runs in the browser, on the laptop GPU if possible)
import { FilesetResolver, PoseLandmarker, FaceLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

async function create(Cls, fileset, opts) {
  try {
    return await Cls.createFromOptions(fileset, { ...opts, baseOptions: { ...opts.baseOptions, delegate: 'GPU' } });
  } catch (e) {
    console.warn('GPU delegate failed, using CPU', e);
    return await Cls.createFromOptions(fileset, { ...opts, baseOptions: { ...opts.baseOptions, delegate: 'CPU' } });
  }
}

export class Vision {
  async init(status = () => {}) {
    status('Loading vision engine…');
    const fileset = await FilesetResolver.forVisionTasks(WASM);
    status('Loading body tracker…');
    this.pose = await create(PoseLandmarker, fileset, {
      baseOptions: { modelAssetPath: POSE_MODEL }, runningMode: 'VIDEO', numPoses: 1,
      minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
    });
    status('Loading face tracker…');
    this.face = await create(FaceLandmarker, fileset, {
      baseOptions: { modelAssetPath: FACE_MODEL }, runningMode: 'VIDEO', numFaces: 1,
      outputFaceBlendshapes: true,
    });
    this.lastTs = 0;
  }

  detect(video, ts, wantFace) {
    if (ts <= this.lastTs) ts = this.lastTs + 1;
    this.lastTs = ts;
    const pr = this.pose.detectForVideo(video, ts);
    const pose = pr.landmarks?.[0] || null;
    let blend = null;
    if (wantFace) {
      const fr = this.face.detectForVideo(video, ts);
      const cats = fr.faceBlendshapes?.[0]?.categories;
      if (cats) { blend = {}; for (const c of cats) blend[c.categoryName] = c.score; }
    }
    return { pose, blend };
  }
}
