import { DEFAULT_SETTINGS, INITIAL_STATE, EFFECTS } from '../types';
import type { CameraState, Hand, Settings, Effect, WindowMedia, EffectScope } from '../types';
import { CameraSource, cameraErrorMessage } from './CameraSource';
import { GestureController } from '../tracking/GestureController';
import { PhotoGesture, photoPose } from '../tracking/PhotoGesture';
import { PhotoStrip } from './PhotoStrip';
import { EffectModeGesture } from '../tracking/EffectModeGesture';
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
  private media: WindowMedia | null = null;
  private photoGesture = new PhotoGesture();
  private photoStrip = new PhotoStrip();
  private modeGesture = new EffectModeGesture();
  private modeHolding=false;

  constructor(private video: HTMLVideoElement, private canvas: HTMLCanvasElement, private onChange: (state: CameraState) => void, private onEffect: (effect: Effect) => void = () => {}, private onPhoto:(canvas:HTMLCanvasElement)=>void = ()=>{}, private onScope:(scope:EffectScope)=>void = ()=>{}) {
    this.source = new CameraSource(video); this.renderer = new WindowRenderer(canvas);
  }
  setSettings(settings: Settings): void {
    if(settings.photoCount!==this.settings.photoCount||(!settings.autoPhoto&&this.settings.autoPhoto)){this.cancelPhoto();}
    if(settings.autoPhoto!==this.settings.autoPhoto){this.photoGesture.reset();this.publish({photoCountdown:null,photoLocked:false});}
    this.settings = settings;
    if(settings.flowers||this.media){this.modeGesture.reset();this.modeHolding=false;}
  }
  cancelPhoto():void {this.photoStrip.cancel();this.photoGesture.cancel();this.publish({photoCountdown:null,photoLocked:true,photoShot:null});}
  capturePhoto():void {
    if(this.state.phase!=='live'||this.photoStrip.active||this.photoGesture.active||document.hidden)return;
    this.cancelPhoto();
    if(this.settings.photoCount===3){this.photoGesture.start(performance.now());this.publish({photoCountdown:3,photoLocked:false});}
    else this.takePhoto(performance.now());
  }
  private takePhoto(time:number):void {
    if(this.settings.photoCount===1){this.onPhoto(this.canvas);return;}
    const strip=this.photoStrip.capture(this.canvas,time);
    this.publish({photoShot:strip?null:this.photoStrip.count,photoCountdown:strip?null:3});
    if(strip){this.photoGesture.cancel();this.publish({photoLocked:true});this.onPhoto(strip);}
  }
  clearFlowers():void {this.renderer.clearFlowers();this.publish({flowerCount:0});}
  setMedia(media: WindowMedia | null): void { this.media = media; this.gestures.reset();this.modeGesture.reset();this.modeHolding=false; }
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
    this.photoStrip.cancel();
    this.generation++; cancelAnimationFrame(this.frameId); this.source.stop(); this.tracker.reset(); this.hands = [];
    this.gestures.reset(); this.photoGesture.reset();this.modeGesture.reset();this.modeHolding=false; this.renderer.reset(); this.publish({ ...INITIAL_STATE, flowerCount:this.renderer.flowerCount, message: 'cameraStopped' });
  }
  private fail(message: CameraState['message']): void { this.stop(); this.publish({ phase: 'error', message }); }
  private render = (time: number): void => {
    if (this.disposed || this.state.phase !== 'live') return;
    try {
      if (this.video.readyState >= 2) {
        let takePhoto=false;
        if (this.video.currentTime !== this.lastVideo && time-this.lastDetection >= 33) {
          this.lastVideo = this.video.currentTime; this.lastDetection = time;
          this.hands = this.tracker.detect(this.video, time);
          if(!this.media&&!this.settings.flowers&&!document.hidden){
            const mode=this.modeGesture.update(this.hands,time,this.video.videoWidth/this.video.videoHeight);
            this.modeHolding=mode.active;
            if(mode.toggle){
              const effectScope:EffectScope=this.settings.effectScope==='full'?'window':'full';
              this.settings={...this.settings,effectScope};this.onScope(effectScope);
            }
          }else{this.modeGesture.reset();this.modeHolding=false;}
          const gesture = this.gestures.update(this.hands,time,this.video.videoWidth/this.video.videoHeight);
          if (gesture.next && !this.media && !this.settings.flowers && !this.modeHolding && !photoPose(this.hands,this.video.videoWidth/this.video.videoHeight) && this.state.photoCountdown===null) {
            const effect = EFFECTS[(EFFECTS.indexOf(this.settings.effect)+1)%EFFECTS.length];
            this.settings = { ...this.settings, effect }; this.onEffect(effect);
          }
          this.renderer.updateFlowers(this.hands,time,this.settings);
          this.publish({ flowerCount:this.renderer.flowerCount,flowerPaused:this.renderer.flowerPaused });
        }
        if(!document.hidden){
          if(this.photoStrip.active)this.publish({photoCountdown:this.photoStrip.countdown(time)});
          else if(this.settings.autoPhoto||this.photoGesture.active){
            const photo=this.photoGesture.update(this.hands,time,this.video.videoWidth/this.video.videoHeight);
            takePhoto=photo.capture;this.publish({photoCountdown:photo.countdown,photoLocked:photo.locked});
          }
        }
        const visible = this.renderer.render(this.video,this.hands,this.settings,.7,this.media);
        if(!document.hidden&&(takePhoto||this.photoStrip.due(time)))this.takePhoto(time);
        const count = this.hands.length;
        const fullScreen=this.settings.effectScope==='full'&&!this.media&&!this.settings.flowers;
        this.publish({ hands: count,
          message: this.settings.flowers ? (count?'flowersTracking':'flowersSearching') : fullScreen ? 'fullEffectActive' : count === 2 ? (visible ? 'tracking' : 'openFingers') : count ? 'oneHand' : 'searching',
          hint: this.modeHolding ? 'modeReleaseHint' : this.settings.flowers ? (this.renderer.flowerPaused?'flowersPausedHint':'flowersHint') : fullScreen ? 'fullEffectHint' : count === 2 ? (visible ? 'windowFollowing' : 'widenWindow') : count ? 'showOtherHand' : 'openBoth',
        });
        this.fpsFrames++;
        if (time-this.fpsTime > 1000) { this.publish({ fps: Math.round(this.fpsFrames*1000/(time-this.fpsTime)) });this.fpsFrames=0;this.fpsTime=time; }
      }
      this.frameId = requestAnimationFrame(this.render);
    } catch { this.fail('trackingError'); }
  };
  dispose(): void { this.disposed = true; this.stop(); this.tracker.dispose(); this.renderer.dispose(); }
}
