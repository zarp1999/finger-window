import type { Hand, Landmark, Point, StickerSet } from '../types';

import { createStickerSprites,STICKER_PALETTES } from './StickerSprites';
export { FLOWERS } from './StickerSprites';
interface FlowerStamp extends Point {index:number;size:number;angle:number}
function distance(a:Landmark,b:Landmark,aspect:number):number {
  return Math.hypot((a.x-b.x)*aspect,a.y-b.y,(a.z-b.z)*aspect);
}
export function indexExtended(hand:Hand,aspect:number):boolean {
  return distance(hand[8],hand[0],aspect)>distance(hand[6],hand[0],aspect)*1.12 &&
    distance(hand[8],hand[5],aspect)>distance(hand[6],hand[5],aspect)*1.35;
}
export function closedFist(hand:Hand,aspect:number):boolean {
  const palm=Math.max(.02,distance(hand[0],hand[9],aspect));
  return [8,12,16,20].every(tip=>distance(hand[tip],hand[tip-3],aspect)<palm*.85 &&
    distance(hand[tip],hand[0],aspect)<distance(hand[tip-2],hand[0],aspect)*1.08);
}

/** Persistent raster layer: flowers never expire and memory stays bounded. */
export class FlowerTrail {
  constructor(private tool:'flowers'|'pen'='flowers'){}
  color='#ffda73';
  size=5;
  private layer=document.createElement('canvas');
  private context=this.layer.getContext('2d')!;
  private sprites=createStickerSprites();
  private palette=STICKER_PALETTES.flowers;
  private sequence=0;
  setPalette(set:StickerSet):void{if(this.palette!==STICKER_PALETTES[set]){this.palette=STICKER_PALETTES[set];this.sequence=0;this.last.clear();}}
  private last=new Map<string,Point>();
  private fistSince:number|null=null;
  private latched=false;
  private enabled=false;
  private leftSince:number|null=null;
  private leftReleased:number|null=null;
  private leftLatched=false;
  private stamps:FlowerStamp[]=[];
  private baked:HTMLCanvasElement|null=null;
  private falling:FlowerStamp[]=[];
  private fallingBaked:HTMLCanvasElement|null=null;
  private fallSince:number|null=null;
  paused=false;
  count=0;
  resize(width:number,height:number):void {
    if(this.layer.width===width&&this.layer.height===height)return;
    const previous=document.createElement('canvas');previous.width=this.layer.width;previous.height=this.layer.height;
    const sx=width/this.layer.width,sy=height/this.layer.height;
    this.stamps.forEach(f=>{f.x*=sx;f.y*=sy;f.size*=sx;});
    if(this.baked){const copy=document.createElement('canvas');copy.width=width;copy.height=height;copy.getContext('2d')!.drawImage(this.baked,0,0,width,height);this.baked=copy;}
    this.falling=[];this.fallingBaked=null;this.fallSince=null;
    previous.getContext('2d')!.drawImage(this.layer,0,0);
    this.layer.width=width;this.layer.height=height;this.context.drawImage(previous,0,0,width,height);
    this.resetGesture();
  }
  resetGesture():void {this.last.clear();this.fistSince=null;this.latched=false;this.leftSince=null;this.leftReleased=null;this.leftLatched=false;}
  clear():void {this.context.clearRect(0,0,this.layer.width,this.layer.height);this.count=0;this.sequence=0;this.last.clear();this.stamps=[];this.baked=null;this.falling=[];this.fallingBaked=null;this.fallSince=null;}
  private drop(time:number):void {
    if(this.fallSince!==null||!this.count)return;
    this.falling=this.stamps;this.fallingBaked=this.baked;this.fallSince=time;
    this.stamps=[];this.baked=null;this.context.clearRect(0,0,this.layer.width,this.layer.height);this.count=0;this.sequence=0;this.last.clear();
  }
  setEnabled(enabled:boolean):void {if(enabled!==this.enabled){this.resetGesture();this.paused=false;this.falling=[];this.fallingBaked=null;this.fallSince=null;}this.enabled=enabled;}
  private point(hand:Hand,mirror:boolean):Point {return{x:(mirror?1-hand[8].x:hand[8].x)*this.layer.width,y:hand[8].y*this.layer.height};}
  update(hands:Hand[],time:number,mirror:boolean):void {
    if(!this.enabled)return;
    const aspect=this.layer.width/this.layer.height;
    const left=hands.find(hand=>hand.side==='Left'&&(hand.confidence??0)>=.75);
    const leftClosed=!!left&&closedFist(left,aspect);
    if(leftClosed){
      this.leftReleased=null;this.leftSince??=time;
      if(time-this.leftSince>=400&&!this.leftLatched){this.paused=!this.paused;this.leftLatched=true;this.last.clear();}
    }else{
      this.leftSince=null;this.leftReleased??=time;
      if(time-this.leftReleased>=350)this.leftLatched=false;
    }
    const right=hands.find(hand=>hand.side==='Right'&&(hand.confidence??0)>=.75);
    if(right&&closedFist(right,aspect)){
      this.fistSince??=time;
      if(time-this.fistSince>=400&&!this.latched){if(this.tool==='flowers')this.drop(time);else this.clear();this.latched=true;}
      // Suppress both hands while clearing, so left-hand flowers cannot reappear.
      this.last.clear();return;
    }
    this.fistSince=null;this.latched=false;
    if(this.paused||leftClosed||this.fallSince!==null){this.last.clear();return;}
    const present=new Set<string>();
    hands.forEach((hand,index)=>{
      const key=hand.side??String(index);present.add(key);
      if(!indexExtended(hand,aspect)){this.last.delete(key);return;}
      // A V sign is reserved for photographs; lift the pen for this pose.
      if(this.tool==='pen'&&distance(hand[12],hand[0],aspect)>distance(hand[10],hand[0],aspect)*1.12){this.last.delete(key);return;}
      const point=this.point(hand,mirror),last=this.last.get(key);
      if(this.tool==='pen'){
        const gap=last?Math.hypot(point.x-last.x,point.y-last.y):Infinity;
        const next=last&&gap<this.layer.width*.25?{x:last.x+(point.x-last.x)*.65,y:last.y+(point.y-last.y)*.65}:point;
        const c=this.context;c.strokeStyle=this.color;c.fillStyle=this.color;c.lineWidth=this.size;c.lineCap='round';c.lineJoin='round';
        if(!last||gap>=this.layer.width*.25){c.beginPath();c.arc(next.x,next.y,this.size/2,0,Math.PI*2);c.fill();this.count++;}
        else if(gap>.5){c.beginPath();c.moveTo(last.x,last.y);c.lineTo(next.x,next.y);c.stroke();}
        this.last.set(key,next);return;
      }
      const spacing=Math.max(22,Math.min(38,this.layer.width*.04));
      if(!last||Math.hypot(point.x-last.x,point.y-last.y)>=spacing){
        this.stamp(point,this.palette[this.sequence%this.palette.length],true);this.sequence++;this.count++;this.last.set(key,point);
      }
    });
    for(const key of this.last.keys())if(!present.has(key))this.last.delete(key);
  }
  private stamp(point:Point,index:number,persistent:boolean,target=this.context):void {
    const size=Math.max(30,Math.min(64,this.layer.width*.06))*(index>=6&&index<=11?[1,.8,1.15,.7,.95,.85][index-6]:1);
    const angle=persistent?((this.count%7)-3)*.08:0;
    if(persistent){
      // Keep particle metadata bounded; older flowers remain in a raster snapshot.
      if(this.stamps.length===1000){const baked=document.createElement('canvas');baked.width=this.layer.width;baked.height=this.layer.height;baked.getContext('2d')!.drawImage(this.layer,0,0);this.baked=baked;this.stamps=[];}
      this.stamps.push({...point,index,size,angle});
    }
    target.save();target.translate(point.x,point.y);
    if(persistent)target.rotate(angle);
    target.drawImage(this.sprites[index],-size/2,-size/2,size,size);target.restore();
  }
  draw(context:CanvasRenderingContext2D,hands:Hand[],mirror:boolean,time=performance.now()):void {
    if(!this.enabled)return;
    context.drawImage(this.layer,0,0);
    if(this.tool==='pen')return;
    if(this.fallSince!==null){
      const elapsed=Math.max(0,(time-this.fallSince)/1000);
      if(elapsed>=1.6){this.falling=[];this.fallingBaked=null;this.fallSince=null;return;}
      context.save();context.globalAlpha=Math.min(1,(1.6-elapsed)/.5);
      if(this.fallingBaked)context.drawImage(this.fallingBaked,0,this.layer.height*(.06*elapsed+.85*elapsed*elapsed));
      this.falling.forEach((f,i)=>{
        const t=Math.max(0,elapsed-(i%7)*.025),phase=i*2.4;
        const x=f.x+(Math.sin(phase+t*3)-Math.sin(phase))*f.size*.3;
        const y=f.y+this.layer.height*(.06*t+.85*t*t);
        if(y-f.size>this.layer.height)return;
        context.save();context.translate(x,y);context.rotate(f.angle+Math.sin(phase)*t*1.5);context.drawImage(this.sprites[f.index],-f.size/2,-f.size/2,f.size,f.size);context.restore();
      });context.restore();return;
    }
    if(this.paused||this.leftSince!==null||this.fistSince!==null)return;
    hands.filter(hand=>indexExtended(hand,this.layer.width/this.layer.height)).forEach(hand=>this.stamp(this.point(hand,mirror),this.palette[this.sequence%this.palette.length],false,context));
  }
  dispose():void {this.clear();this.layer.width=0;this.layer.height=0;this.sprites.forEach(sprite=>{sprite.width=0;sprite.height=0;});}
}
