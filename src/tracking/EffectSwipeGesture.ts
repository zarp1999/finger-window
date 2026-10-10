import type { Hand,Point } from '../types';
import { closedFist } from '../rendering/FlowerTrail';

/** Grip and drag in displayed coordinates, then open the same hand to rearm. */
export class EffectSwipeGesture {
  private origin:Point|null=null;
  private since=0;
  private lastTime=0;
  private key:string|null=null;
  private locked=false;
  private released:number|null=null;
  reset():void {this.origin=null;this.since=0;this.lastTime=0;this.key=null;this.locked=false;this.released=null;}
  update(hands:Hand[],time:number,aspect:number,mirror:boolean,previewAspect=aspect):-1|0|1 {
    const valid=hands.filter(h=>!!h.side&&(h.confidence??0)>=.75);
    const current=valid.find(h=>h.side===this.key);
    if(this.locked){
      if(current&&!closedFist(current,aspect)){this.released??=time;if(time-this.released>=200)this.reset();}
      else this.released=null;
      return 0;
    }
    const hand=current&&closedFist(current,aspect)?current:valid.find(h=>closedFist(h,aspect));
    if(!hand){this.origin=null;this.key=null;return 0;}
    const center=[0,5,9,13,17].reduce((p,i)=>({x:p.x+hand[i].x/5,y:p.y+hand[i].y/5}),{x:0,y:0});
    const point={x:(mirror?1-center.x:center.x)/Math.min(1,previewAspect/aspect),y:center.y/Math.min(1,aspect/previewAspect)};
    if(!this.origin||this.key!==hand.side||time-this.lastTime>200||time-this.since>1200){this.origin=point;this.since=time;this.key=hand.side!;}
    this.lastTime=time;
    const dx=point.x-this.origin.x,dy=point.y-this.origin.y;
    if(time-this.since>=100&&Math.abs(dx)>=.18&&Math.abs(dx)>Math.abs(dy)*1.5){this.locked=true;this.origin=null;return dx<0?1:-1;}
    return 0;
  }
}
