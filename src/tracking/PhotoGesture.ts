import type { Hand,Point } from '../types';
import { convexHull,polygonArea } from '../lib/geometry';

/** Four fingertip corners must form a roughly rectangular, non-degenerate frame. */
export function photoFrame(hands:Hand[],aspect:number):boolean {
  if(hands.length!==2)return false;
  const points=hands.flatMap(h=>[h[4],h[8]]).map(p=>({x:p.x*aspect,y:p.y}));
  const hull=convexHull(points);
  if(hull.length!==4||polygonArea(hull)<.02*aspect)return false;
  const edge=(a:Point,b:Point)=>({x:b.x-a.x,y:b.y-a.y});
  const edges=hull.map((p,i)=>edge(p,hull[(i+1)%4]));
  const lengths=edges.map(e=>Math.hypot(e.x,e.y));
  if(Math.min(...lengths)<.08||Math.max(...lengths)/Math.min(...lengths)>3)return false;
  const cosine=(a:number,b:number)=>Math.abs((edges[a].x*edges[b].x+edges[a].y*edges[b].y)/(lengths[a]*lengths[b]));
  if(cosine(0,2)<.8||cosine(1,3)<.8||edges.some((_,i)=>cosine(i,(i+1)%4)>.6))return false;
  // The two tips from each hand must be neighboring corners, never diagonals.
  return [0,2].every(i=>{
    const a=hull.indexOf(points[i]),b=hull.indexOf(points[i+1]);return Math.abs(a-b)===1||Math.abs(a-b)===3;
  });
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
    const frame=photoFrame(hands,aspect);
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
