import { DEFAULT_SETTINGS, INITIAL_STATE, EFFECTS } from '../types';
import type { CameraState, Hand, Settings, Effect, WindowMedia } from '../types';
import { CameraSource, cameraErrorMessage } from './CameraSource';
import { GestureController } from '../tracking/GestureController';
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
  private gestures = new GestureController();
  private strength = .7;
  private media: WindowMedia | null = null;

  constructor(private video: HTMLVideoElement, canvas: HTMLCanvasElement, private onChange: (state: CameraState) => void, private onEffect: (effect: Effect) => void = () => {}) {
    this.source = new CameraSource(video); this.renderer = new WindowRenderer(canvas);
  }
  setSettings(settings: Settings): void { this.settings = settings; }
  setMedia(media: WindowMedia | null): void { this.media = media; this.gestures.reset(); }
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
    this.publish({ phase: 'loading', message: 'permission' });
    try {
      const active = await this.source.start(() => { if (request === this.generation) this.fail('disconnected'); });
      if (!active || request !== this.generation || this.disposed) return;
      this.publish({ message: 'modelLoading' });
      await this.tracker.load();
      if (request !== this.generation || this.disposed) return;
      this.renderer.resize(this.video); this.tracker.reset(); this.hands = [];
      this.lastVideo = -1; this.lastDetection = 0; this.fpsFrames = 0; this.fpsTime = performance.now();
      this.publish({ phase: 'live', message: 'showHands' });
      this.frameId = requestAnimationFrame(this.render);
    } catch (error) { if (request === this.generation && !this.disposed) this.fail(cameraErrorMessage(error)); }
  }
  stop(): void {
    this.generation++; cancelAnimationFrame(this.frameId); this.source.stop(); this.tracker.reset(); this.hands = [];
    this.gestures.reset(); this.strength = .7; this.renderer.reset(); this.publish({ ...INITIAL_STATE, message: 'cameraStopped' });
  }
  private fail(message: CameraState['message']): void { this.stop(); this.publish({ phase: 'error', message }); }
  private render = (time: number): void => {
    if (this.disposed || this.state.phase !== 'live') return;
    try {
      if (this.video.readyState >= 2) {
        if (this.video.currentTime !== this.lastVideo && time-this.lastDetection >= 33) {
          this.lastVideo = this.video.currentTime; this.lastDetection = time;
          this.hands = this.tracker.detect(this.video, time);
          const gesture = this.gestures.update(this.hands,time,this.video.videoWidth/this.video.videoHeight);
          this.strength = gesture.strength;
          if (gesture.next && !this.media) {
            const effect = EFFECTS[(EFFECTS.indexOf(this.settings.effect)+1)%EFFECTS.length];
            this.settings = { ...this.settings, effect }; this.onEffect(effect);
          }
          this.publish({ strength: Math.round(this.strength*100)/100 });
        }
        const visible = this.renderer.render(this.video,this.hands,this.settings,this.strength,this.media);
        const count = this.hands.length;
        this.publish({ hands: count,
          message: count === 2 ? (visible ? 'tracking' : 'openFingers') : count ? 'oneHand' : 'searching',
          hint: count === 2 ? (visible ? 'windowFollowing' : 'widenWindow') : count ? 'showOtherHand' : 'openBoth',
        });
        this.fpsFrames++;
        if (time-this.fpsTime > 1000) { this.publish({ fps: Math.round(this.fpsFrames*1000/(time-this.fpsTime)) });this.fpsFrames=0;this.fpsTime=time; }
      }
      this.frameId = requestAnimationFrame(this.render);
    } catch { this.fail('trackingError'); }
  };
  dispose(): void { this.disposed = true; this.stop(); this.tracker.dispose(); this.renderer.dispose(); }
}
