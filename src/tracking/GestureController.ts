import type { Hand } from '../types';

/** A released pose arms the gesture; a held pinch fires once until release. */
export class GestureController {
  private armed = false;
  private pinchSince: number | null = null;
  private releaseSince: number | null = null;
  reset(): void {
    this.armed = false; this.pinchSince = null; this.releaseSince = null;
  }
  update(hands: Hand[], time: number, aspect: number): { next: boolean } {
    const distance = (a: Hand[number], b: Hand[number]) => Math.hypot((a.x-b.x)*aspect,a.y-b.y);
    if (hands.length === 0) {
      this.armed = false; this.pinchSince = null; this.releaseSince = null;
      return { next: false };
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
        this.pinchSince ??= time;
        if (time-this.pinchSince >= 220) { next = true; this.armed = false; this.pinchSince = null; }
      } else this.pinchSince = null;
    }
    return { next };
  }
}
