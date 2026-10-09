import type { Hand,Landmark } from '../types';

export function victorySign(hand:Hand,aspect:number):boolean {
  const distance=(a:Landmark,b:Landmark)=>Math.hypot((a.x-b.x)*aspect,a.y-b.y,(a.z-b.z)*aspect);
  const palm=Math.max(.025,distance(hand[0],hand[9]));
  const extended=(tip:number)=>distance(hand[tip],hand[0])>distance(hand[tip-2],hand[0])*1.1 &&
    distance(hand[tip],hand[tip-3])>distance(hand[tip-2],hand[tip-3])*1.35;
  const folded=(tip:number)=>distance(hand[tip],hand[tip-3])<palm*.9 &&
    distance(hand[tip],hand[0])<distance(hand[tip-2],hand[0])*1.1;
  return extended(8)&&extended(12)&&folded(16)&&folded(20)&&distance(hand[8],hand[12])>palm*.2;
}

/** A one-second V pose toggles once; release is required before another toggle. */
export class EffectModeGesture {
  private heldSince:number|null=null;
  private releasedSince:number|null=null;
  private locked=false;
  private key:string|null=null;
  private lastTime=0;
  reset():void {this.heldSince=null;this.releasedSince=null;this.locked=false;this.key=null;this.lastTime=0;}
  update(hands:Hand[],time:number,aspect:number):{active:boolean;toggle:boolean} {
    if(this.lastTime&&time-this.lastTime>250)this.heldSince=null;
    this.lastTime=time;
    const index=hands.findIndex(hand=>victorySign(hand,aspect));
    if(index<0){
      this.heldSince=null;this.key=null;this.releasedSince??=time;
      if(time-this.releasedSince>=350)this.locked=false;
      return {active:false,toggle:false};
    }
    this.releasedSince=null;
    const key=hands[index].side??String(index);
    if(this.key!==key){this.heldSince=null;this.key=key;}
    if(this.locked)return {active:true,toggle:false};
    this.heldSince??=time;
    if(time-this.heldSince>=1000){this.locked=true;return {active:true,toggle:true};}
    return {active:true,toggle:false};
  }
}
