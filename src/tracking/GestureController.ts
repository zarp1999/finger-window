import type { Hand } from '../types';

/** A released pose arms the gesture; a held pinch fires once until release. */
export class GestureController {
  private armed = false;
  private pinchSince: number | null = null;
  private releaseSince: number | null = null;
  private previousTime = 0;
  private strength = .7;
  reset(): void {
    this.armed = false; this.pinchSince = null; this.releaseSince = null;
    this.previousTime = 0; this.strength = .7;
  }
  update(hands: Hand[], time: number, aspect: number): { next: boolean; strength: number } {
    const distance = (a: Hand[number], b: Hand[number]) => Math.hypot((a.x-b.x)*aspect,a.y-b.y);
    if (hands.length !== 2) {
      this.armed = false; this.pinchSince = null; this.releaseSince = null;
      this.previousTime = time;
      return { next: false, strength: this.strength };
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
    // Normalize by palm size so moving toward the camera changes strength less.
    const palm = hands.reduce((sum,h) => sum+distance(h[0],h[9]),0)/2;
    const separation = distance(hands[0][9],hands[1][9])/Math.max(.025,palm);
    const target = Math.max(.15,Math.min(1,(separation-1.2)/4));
    const delta = this.previousTime ? Math.min(100,time-this.previousTime) : 33;
    this.strength += (target-this.strength)*(1-Math.exp(-delta/180));
    this.previousTime = time;
    return { next, strength: this.strength };
  }
}
