import type { Hand,Point } from '../types';

/** A released pose arms the gesture; a held pinch fires once until release. */
export class GestureController {
  private armed = false;
  private point:Point|null=null;
  private pinchSince: number | null = null;
  private releaseSince: number | null = null;
  reset(): void {
    this.armed = false; this.pinchSince = null; this.releaseSince = null;
  }
  update(hands: Hand[], time: number, aspect: number): { next: boolean;point:Point|null } {
    const distance = (a: Hand[number], b: Hand[number]) => Math.hypot((a.x-b.x)*aspect,a.y-b.y);
    if (hands.length === 0) {
      this.armed = false; this.pinchSince = null; this.releaseSince = null;
      return { next: false,point:null };
    }
    const ratios = hands.map(h => distance(h[4],h[8])/Math.max(.025,distance(h[0],h[9])));
    const pinched = ratios.some(r => r < .28), released = ratios.every(r => r > .48);
    let next = false;
    if (released) {
      this.pinchSince = null;
      this.releaseSince ??= time;
      if (time-this.releaseSince >= 180) this.armed = true;
    } else {
      this.releaseSince = null;
      if (pinched && this.armed) {
        if(this.pinchSince===null){this.pinchSince=time;const h=hands[ratios.findIndex(r=>r<.28)];this.point={x:(h[4].x+h[8].x)/2,y:(h[4].y+h[8].y)/2};}
        if (time-this.pinchSince >= 220) { next = true; this.armed = false; this.pinchSince = null; }
      } else this.pinchSince = null;
    }
    return { next,point:next?this.point:null };
  }
}
