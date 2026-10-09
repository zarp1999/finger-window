import type { Hand } from '../types';
import { victorySign } from './EffectModeGesture';

/** Both hands must hold a V pose to start photography. */
export function photoPose(hands:Hand[],aspect:number):boolean {
  return hands.length===2&&hands.every(hand=>victorySign(hand,aspect));
}

export class PhotoGesture {
  private stableSince:number|null=null;
  private countdownSince:number|null=null;
  private releasedSince:number|null=null;
  private locked=false;
  get active():boolean{return this.countdownSince!==null;}
  reset():void {this.stableSince=null;this.countdownSince=null;this.releasedSince=null;this.locked=false;}
  start(time:number):void{this.reset();this.countdownSince=time;}
  cancel():void {this.reset();this.locked=true;}
  update(hands:Hand[],time:number,aspect:number):{countdown:number|null;capture:boolean;locked:boolean} {
    const frame=photoPose(hands,aspect);
    if(this.locked){
      if(frame)this.releasedSince=null;
      else{this.releasedSince??=time;if(time-this.releasedSince>=600){this.reset();}}
      return {countdown:null,capture:false,locked:this.locked};
    }
    if(frame){
      this.stableSince??=time;
      if(this.countdownSince===null&&time-this.stableSince>=450)this.countdownSince=time;
    }else{
      this.stableSince=null;
    }
    if(this.countdownSince===null)return {countdown:null,capture:false,locked:this.locked};
    const elapsed=time-this.countdownSince;
    if(elapsed>=3000){this.cancel();return {countdown:null,capture:true,locked:true};}
    return {countdown:Math.max(1,3-Math.floor(elapsed/1000)),capture:false,locked:false};
  }
}
