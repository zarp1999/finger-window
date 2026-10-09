import type { Hand, Landmark, Point } from '../types';

export const FLOWERS = ['🌸','🌹','🌻','🌷','🌼','🌺'] as const;
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
  private sprites=FLOWERS.map(flower=>{
    const sprite=document.createElement('canvas');sprite.width=96;sprite.height=96;
    const c=sprite.getContext('2d')!;c.font='76px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    c.textAlign='center';c.textBaseline='middle';c.fillText(flower,48,49);return sprite;
  });
  private last=new Map<string,Point>();
  private fistSince:number|null=null;
  private latched=false;
  private enabled=false;
  private leftSince:number|null=null;
  private leftReleased:number|null=null;
  private leftLatched=false;
  paused=false;
  count=0;
  resize(width:number,height:number):void {
    if(this.layer.width===width&&this.layer.height===height)return;
    const previous=document.createElement('canvas');previous.width=this.layer.width;previous.height=this.layer.height;
    previous.getContext('2d')!.drawImage(this.layer,0,0);
    this.layer.width=width;this.layer.height=height;this.context.drawImage(previous,0,0,width,height);
    this.resetGesture();
  }
  resetGesture():void {this.last.clear();this.fistSince=null;this.latched=false;this.leftSince=null;this.leftReleased=null;this.leftLatched=false;}
  clear():void {this.context.clearRect(0,0,this.layer.width,this.layer.height);this.count=0;this.last.clear();}
  setEnabled(enabled:boolean):void {if(enabled!==this.enabled){this.resetGesture();this.paused=false;}this.enabled=enabled;}
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
      if(time-this.fistSince>=400&&!this.latched){this.clear();this.latched=true;}
      // Suppress both hands while clearing, so left-hand flowers cannot reappear.
      this.last.clear();return;
    }
    this.fistSince=null;this.latched=false;
    if(this.paused||leftClosed){this.last.clear();return;}
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
        this.stamp(point,this.count%FLOWERS.length,true);this.count++;this.last.set(key,point);
      }
    });
    for(const key of this.last.keys())if(!present.has(key))this.last.delete(key);
  }
  private stamp(point:Point,index:number,persistent:boolean,target=this.context):void {
    const size=Math.max(30,Math.min(64,this.layer.width*.06));
    target.save();target.translate(point.x,point.y);
    if(persistent)target.rotate(((this.count%7)-3)*.08);
    target.drawImage(this.sprites[index],-size/2,-size/2,size,size);target.restore();
  }
  draw(context:CanvasRenderingContext2D,hands:Hand[],mirror:boolean):void {
    if(!this.enabled)return;
    context.drawImage(this.layer,0,0);
    if(this.tool==='pen')return;
    if(this.paused||this.leftSince!==null||this.fistSince!==null)return;
    hands.filter(hand=>indexExtended(hand,this.layer.width/this.layer.height)).forEach(hand=>this.stamp(this.point(hand,mirror),this.count%FLOWERS.length,false,context));
  }
  dispose():void {this.clear();this.layer.width=0;this.layer.height=0;this.sprites.forEach(sprite=>{sprite.width=0;sprite.height=0;});}
}
