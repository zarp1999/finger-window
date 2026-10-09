import type { Hand, Point, Settings, WindowMedia } from '../types';
import { drawMediaWarp } from './MediaWarp';
import { convexHull, polygonArea } from '../lib/geometry';
import { EffectRenderer } from './EffectRenderer';
import { FlowerTrail } from './FlowerTrail';


export class WindowRenderer {
  private context: CanvasRenderingContext2D;
  private effect = new EffectRenderer();
  private flowers = new FlowerTrail();
  private fullScreen=false;
  get flowerCount():number {return this.flowers.count;}
  updateFlowers(hands:Hand[],time:number,settings:Settings):void {this.flowers.setEnabled(settings.flowers);this.flowers.update(hands,time,settings.mirror);}
  clearFlowers():void {this.flowers.clear();}
  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    this.context = context;
  }
  resize(video: HTMLVideoElement): void {
    this.canvas.width = Math.min(video.videoWidth, 1280);
    this.canvas.height = Math.round(this.canvas.width*video.videoHeight/video.videoWidth);
    this.effect.resize(this.canvas.width, this.canvas.height);
    this.flowers.resize(this.canvas.width,this.canvas.height);
  }
  private point(p: Point, mirror: boolean): Point {
    return { x: (mirror ? 1-p.x : p.x)*this.canvas.width, y: p.y*this.canvas.height };
  }
  private draw(source: CanvasImageSource, mirror: boolean): void {
    const c = this.context; c.save();
    if (mirror) { c.translate(this.canvas.width, 0); c.scale(-1, 1); }
    c.drawImage(source, 0, 0, this.canvas.width, this.canvas.height); c.restore();
  }
  private path(points: Point[]): void {
    const c = this.context; c.beginPath();
    points.forEach((p,i) => i ? c.lineTo(p.x,p.y) : c.moveTo(p.x,p.y)); c.closePath();
  }
  render(video: HTMLVideoElement, hands: Hand[], settings: Settings, strength = 1, media: WindowMedia | null = null): boolean {
    const c = this.context;
    this.clear(); this.draw(video, settings.mirror);
    const fullScreen=settings.effectScope==='full'&&!settings.flowers&&!media;
    if(fullScreen!==this.fullScreen){this.effect.reset();this.fullScreen=fullScreen;}
    const polygon = hands.length === 2 ? convexHull(hands.flatMap(h => [this.point(h[4],settings.mirror), this.point(h[8],settings.mirror)])) : [];
    const visible = !settings.flowers && (fullScreen || (polygon.length >= (media ? 4 : 3) && polygonArea(polygon) >= this.canvas.width*this.canvas.height*.002));
    if(fullScreen){this.draw(this.effect.render(video,settings.effect,strength),settings.mirror);}
    else if (visible) {
      c.save(); this.path(polygon); c.clip();
      if (media) { this.effect.reset(); drawMediaWarp(c,media,polygon); }
      else this.draw(this.effect.render(video,settings.effect,strength),settings.mirror);
      c.restore();
      this.path(polygon); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
      polygon.forEach(p => { c.beginPath(); c.arc(p.x,p.y,4,0,Math.PI*2); c.fillStyle='#fff';c.fill(); });
    } else this.effect.reset();
    this.flowers.setEnabled(settings.flowers);this.flowers.draw(c,hands,settings.mirror);

    return visible;
  }
  clear(): void { this.context.clearRect(0,0,this.canvas.width,this.canvas.height); }
  reset(): void { this.clear(); this.effect.reset(); this.flowers.resetGesture(); }
  dispose(): void { this.clear(); this.effect.dispose();this.flowers.dispose(); }
}
