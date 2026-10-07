import { DEFAULT_SETTINGS, INITIAL_STATE } from '../types';
import type { CameraState, Hand, Settings } from '../types';
import { CameraSource, cameraErrorMessage } from './CameraSource';
import { HandTracker } from '../tracking/HandTracker';
import { WindowRenderer } from '../rendering/WindowRenderer';

/** Frame data stays here; React subscribers receive only changed status values. */
export class CameraSession {
  private source: CameraSource;
  private tracker = new HandTracker();
  private renderer: WindowRenderer;
  private state = INITIAL_STATE;
  private settings = DEFAULT_SETTINGS;
  private generation = 0;
  private disposed = false;
  private frameId = 0;
  private lastVideo = -1;
  private lastDetection = 0;
  private fpsFrames = 0;
  private fpsTime = 0;
  private hands: Hand[] = [];

  constructor(private video: HTMLVideoElement, canvas: HTMLCanvasElement, private onChange: (state: CameraState) => void) {
    this.source = new CameraSource(video); this.renderer = new WindowRenderer(canvas);
  }
  setSettings(settings: Settings): void { this.settings = settings; }
  private publish(patch: Partial<CameraState>): void {
    if (this.disposed) return;
    const next = { ...this.state, ...patch };
    if ((Object.keys(next) as (keyof CameraState)[]).some(key => next[key] !== this.state[key])) {
      this.state = next; this.onChange(next);
    }
  }
  async start(): Promise<void> {
    if (this.disposed || this.state.phase === 'live' || this.state.phase === 'loading') return;
    const request = ++this.generation;
    this.publish({ phase: 'loading', message: 'カメラへのアクセスを許可してください' });
    try {
      const active = await this.source.start(() => { if (request === this.generation) this.fail('カメラが切断されました。再接続して開始してください。'); });
      if (!active || request !== this.generation || this.disposed) return;
      this.publish({ message: '手の追跡を読み込んでいます · 初回は少し時間がかかります' });
      await this.tracker.load();
      if (request !== this.generation || this.disposed) return;
      this.renderer.resize(this.video); this.tracker.reset(); this.hands = [];
      this.lastVideo = -1; this.lastDetection = 0; this.fpsFrames = 0; this.fpsTime = performance.now();
      this.publish({ phase: 'live', message: '両手をカメラに映してください' });
      this.frameId = requestAnimationFrame(this.render);
    } catch (error) { if (request === this.generation && !this.disposed) this.fail(cameraErrorMessage(error)); }
  }
  stop(): void {
    this.generation++; cancelAnimationFrame(this.frameId); this.source.stop(); this.tracker.reset(); this.hands = [];
    this.renderer.clear(); this.publish({ ...INITIAL_STATE, message: 'カメラを停止しました' });
  }
  private fail(message: string): void { this.stop(); this.publish({ phase: 'error', message }); }
  private render = (time: number): void => {
    if (this.disposed || this.state.phase !== 'live') return;
    try {
      if (this.video.readyState >= 2) {
        if (this.video.currentTime !== this.lastVideo && time-this.lastDetection >= 33) {
          this.lastVideo = this.video.currentTime; this.lastDetection = time;
          this.hands = this.tracker.detect(this.video, time);
        }
        const visible = this.renderer.render(this.video,this.hands,this.settings);
        const count = this.hands.length;
        this.publish({ hands: count,
          message: count === 2 ? (visible ? '追跡中 · 指先で窓を動かせます' : '親指と人差し指をもう少し開いてください') : count ? '片手を検出 · もう片方の手も映してください' : '手を探しています · 手全体を明るく映してください',
          hint: count === 2 ? (visible ? '両手の指先に窓が追従しています' : '指を開いて、窓を広げてください') : count ? 'もう片方の手を映してください' : '両手の親指と人差し指を開いてください',
        });
        this.fpsFrames++;
        if (time-this.fpsTime > 1000) { this.publish({ fps: Math.round(this.fpsFrames*1000/(time-this.fpsTime)) });this.fpsFrames=0;this.fpsTime=time; }
      }
      this.frameId = requestAnimationFrame(this.render);
    } catch { this.fail('追跡処理が止まりました。カメラを再開してください。'); }
  };
  dispose(): void { this.disposed = true; this.stop(); this.tracker.dispose(); this.renderer.dispose(); }
}
