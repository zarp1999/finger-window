import type { Hand, Point, Settings, WindowMedia } from '../types';
import { drawMediaWarp } from './MediaWarp';
import { convexHull, polygonArea } from '../lib/geometry';
import { EffectRenderer } from './EffectRenderer';

const CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];

export class WindowRenderer {
  private context: CanvasRenderingContext2D;
  private effect = new EffectRenderer();
  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    this.context = context;
  }
  resize(video: HTMLVideoElement): void {
    this.canvas.width = Math.min(video.videoWidth, 1280);
    this.canvas.height = Math.round(this.canvas.width*video.videoHeight/video.videoWidth);
    this.effect.resize(this.canvas.width, this.canvas.height);
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
    const polygon = hands.length === 2 ? convexHull(hands.flatMap(h => [this.point(h[4],settings.mirror), this.point(h[8],settings.mirror)])) : [];
    const visible = polygon.length >= (media ? 4 : 3) && polygonArea(polygon) >= this.canvas.width*this.canvas.height*.002;
    if (visible) {
      c.save(); this.path(polygon); c.clip();
      if (media) { this.effect.reset(); drawMediaWarp(c,media,polygon); }
      else this.draw(this.effect.render(video,settings.effect,strength),settings.mirror);
      c.restore();
      this.path(polygon); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
      polygon.forEach(p => { c.beginPath(); c.arc(p.x,p.y,4,0,Math.PI*2); c.fillStyle='#fff';c.fill(); });
    } else this.effect.reset();
    if (settings.showSkeleton) hands.forEach(hand => {
      c.strokeStyle = '#80ff91'; c.lineWidth = 1.7;
      CONNECTIONS.forEach(([a,b]) => { const p=this.point(hand[a],settings.mirror),q=this.point(hand[b],settings.mirror); c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke(); });
      hand.forEach((p,i) => { const point=this.point(p,settings.mirror); c.beginPath();c.arc(point.x,point.y,[4,8].includes(i)?4:2.7,0,Math.PI*2);c.fillStyle='#ff585f';c.fill(); });
    });
    return visible;
  }
  clear(): void { this.context.clearRect(0,0,this.canvas.width,this.canvas.height); }
  reset(): void { this.clear(); this.effect.reset(); }
  dispose(): void { this.clear(); this.effect.dispose(); }
}
