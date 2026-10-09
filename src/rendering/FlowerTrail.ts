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
  count=0;
  resize(width:number,height:number):void {
    if(this.layer.width===width&&this.layer.height===height)return;
    const previous=document.createElement('canvas');previous.width=this.layer.width;previous.height=this.layer.height;
    previous.getContext('2d')!.drawImage(this.layer,0,0);
    this.layer.width=width;this.layer.height=height;this.context.drawImage(previous,0,0,width,height);
    this.resetGesture();
  }
  resetGesture():void {this.last.clear();this.fistSince=null;this.latched=false;}
  clear():void {this.context.clearRect(0,0,this.layer.width,this.layer.height);this.count=0;this.last.clear();}
  setEnabled(enabled:boolean):void {if(enabled!==this.enabled)this.resetGesture();this.enabled=enabled;}
  private point(hand:Hand,mirror:boolean):Point {return{x:(mirror?1-hand[8].x:hand[8].x)*this.layer.width,y:hand[8].y*this.layer.height};}
  update(hands:Hand[],time:number,mirror:boolean):void {
    if(!this.enabled)return;
    const aspect=this.layer.width/this.layer.height;
    const right=hands.find(hand=>hand.side==='Right'&&(hand.confidence??0)>=.75);
    if(right&&closedFist(right,aspect)){
      this.fistSince??=time;
      if(time-this.fistSince>=400&&!this.latched){this.clear();this.latched=true;}
      // Suppress both hands while clearing, so left-hand flowers cannot reappear.
      this.last.clear();return;
    }
    this.fistSince=null;this.latched=false;
    const present=new Set<string>();
    hands.forEach((hand,index)=>{
      const key=hand.side??String(index);present.add(key);
      if(!indexExtended(hand,aspect)){this.last.delete(key);return;}
      const point=this.point(hand,mirror),last=this.last.get(key);
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
    if(this.fistSince!==null)return;
    hands.filter(hand=>indexExtended(hand,this.layer.width/this.layer.height)).forEach(hand=>this.stamp(this.point(hand,mirror),this.count%FLOWERS.length,false,context));
  }
  dispose():void {this.clear();this.layer.width=0;this.layer.height=0;this.sprites.forEach(sprite=>{sprite.width=0;sprite.height=0;});}
}
