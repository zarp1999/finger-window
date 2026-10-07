import type { HandLandmarker } from '@mediapipe/tasks-vision';
import type { Hand } from '../types';

/** Lazy model loading; the npm package and WASM runtime use the same pinned version. */
export class HandTracker {
  private detector: HandLandmarker | null = null;
  private pending: Promise<void> | null = null;
  private disposed = false;
  private hands: Hand[] = [];

  async load(): Promise<void> {
    if (this.disposed) throw new Error('Tracker disposed');
    if (this.detector) return;
    if (!this.pending) this.pending = this.initialize().finally(() => { this.pending = null; });
    return this.pending;
  }
  private async initialize(): Promise<void> {
    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
    const files = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm');
    const options = {
      baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' as 'GPU' | 'CPU' },
      runningMode: 'VIDEO' as const, numHands: 2,
      minHandDetectionConfidence: .5, minHandPresenceConfidence: .5, minTrackingConfidence: .5,
    };
    let detector: HandLandmarker;
    try { detector = await HandLandmarker.createFromOptions(files, options); }
    catch { options.baseOptions.delegate = 'CPU'; detector = await HandLandmarker.createFromOptions(files, options); }
    if (this.disposed) { detector.close(); return; }
    this.detector = detector;
  }
  detect(video: HTMLVideoElement, time: number): Hand[] {
    if (!this.detector) return [];
    const next = this.detector.detectForVideo(video, time).landmarks.slice().sort((a,b) => a[0].x-b[0].x);
    this.hands = next.map((hand, i) => hand.map((point, j) => {
      const prev = this.hands.length === next.length ? this.hands[i]?.[j] : undefined;
      if (!prev || Math.abs(prev.x-point.x)+Math.abs(prev.y-point.y) > .25) return point;
      return { ...point, x: prev.x*.35+point.x*.65, y: prev.y*.35+point.y*.65 };
    }));
    return this.hands;
  }
  reset(): void { this.hands = []; }
  dispose(): void { this.disposed = true; this.detector?.close(); this.detector = null; this.reset(); }
}
