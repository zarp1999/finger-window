import type {Hand,Point} from '../types';
import {convexHull,polygonArea} from '../lib/geometry';

/** A stationary four-corner window toggles once, then requires a release. */
export class WindowLockGesture{
 polygon:Point[]|null=null;
 progress=0;
 private anchor:Point[]|null=null;
 private since:number|null=null;
 private latched=false;
 private released:number|null=null;
 private last:number|null=null;
 reset():void{this.polygon=null;this.progress=0;this.anchor=null;this.since=null;this.latched=false;this.released=null;this.last=null;}
 cancelHold():void{this.progress=0;this.anchor=null;this.since=null;this.last=null;}
 update(hands:Hand[],time:number,aspect:number,enabled:boolean):void{
  const distance=(a:Point,b:Point)=>Math.hypot((a.x-b.x)*aspect,a.y-b.y);
  let points=hands.length===2?convexHull(hands.flatMap(h=>[h[4],h[8]]).map(p=>({x:p.x,y:p.y}))):[];
  const pose=points.length===4&&polygonArea(points)>.01&&hands.every(h=>distance(h[4],h[8])>Math.max(.025,distance(h[0],h[9]))*.5);
  if(!enabled){this.cancelHold();return;}
  if(this.latched){
   if(pose)this.released=null;
   else{this.released??=time;if(time-this.released>=400){this.latched=false;this.released=null;}}
   this.cancelHold();return;
  }
  if(!pose){this.cancelHold();return;}
  if(this.anchor){
   const rotations=points.map((_,offset)=>points.slice(offset).concat(points.slice(0,offset)));
   points=rotations.reduce((best,current)=>current.reduce((sum,p,i)=>sum+distance(p,this.anchor![i]),0)<best.reduce((sum,p,i)=>sum+distance(p,this.anchor![i]),0)?current:best);
  }
  const moved=!this.anchor||points.some((p,i)=>distance(p,this.anchor![i])>.025);
  if(moved||this.last===null||time-this.last>250){this.anchor=points;this.since=time;this.progress=0;}
  this.last=time;
  this.progress=Math.min(1,(time-this.since!)/3000);
  if(this.progress>=1){this.polygon=this.polygon?null:points.map(p=>({...p}));this.latched=true;this.cancelHold();}
 }
}
