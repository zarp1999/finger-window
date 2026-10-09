import type { Hand } from '../types';
import { victorySign } from './EffectModeGesture';

/** Both hands must hold a V pose to start photography. */
export function photoPose(hands:Hand[],aspect:number):boolean {
  return hands.length===2&&hands.every(hand=>victorySign(hand,aspect));
}

export class PhotoGesture {
  private stableSince:number|null=null;
  private countdownSince:number|null=null;
  private lastValid=0;
  private releasedSince:number|null=null;
  private locked=false;
  reset():void {this.stableSince=null;this.countdownSince=null;this.lastValid=0;this.releasedSince=null;this.locked=false;}
  cancel():void {this.reset();this.locked=true;}
  update(hands:Hand[],time:number,aspect:number):{countdown:number|null;capture:boolean;locked:boolean} {
    const frame=photoPose(hands,aspect);
    if(this.locked){
      if(frame)this.releasedSince=null;
      else{this.releasedSince??=time;if(time-this.releasedSince>=600){this.reset();}}
      return {countdown:null,capture:false,locked:this.locked};
    }
    if(frame){
      this.lastValid=time;this.stableSince??=time;
      if(this.countdownSince===null&&time-this.stableSince>=450)this.countdownSince=time;
    }else{
      this.stableSince=null;
      if(this.countdownSince!==null&&time-this.lastValid>300){this.cancel();this.releasedSince=time;}
    }
    if(this.countdownSince===null)return {countdown:null,capture:false,locked:this.locked};
    const elapsed=time-this.countdownSince;
    if(elapsed>=3000&&frame){this.cancel();return {countdown:null,capture:true,locked:true};}
    return {countdown:Math.max(1,3-Math.floor(elapsed/1000)),capture:false,locked:false};
  }
}
