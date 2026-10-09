/** Keep only three frozen frames; white margins are encoded into the saved image. */
export class PhotoStrip {
  private frames:HTMLCanvasElement[]=[];
  private nextAt=0;
  get count():number{return this.frames.length;}
  get active():boolean{return this.count>0;}
  cancel():void{this.frames=[];this.nextAt=0;}
  due(time:number):boolean{return this.active&&time>=this.nextAt;}
  capture(source:HTMLCanvasElement,time:number):HTMLCanvasElement|null {
    const frame=document.createElement('canvas');
    const scale=Math.min(1,800/source.width,1000/source.height);
    frame.width=Math.max(1,Math.round(source.width*scale));frame.height=Math.max(1,Math.round(source.height*scale));
    frame.getContext('2d')!.drawImage(source,0,0,frame.width,frame.height);
    this.frames.push(frame);this.nextAt=time+2000;
    if(this.count<3)return null;
    const margin=Math.max(12,Math.round(frame.width*.04)),strip=document.createElement('canvas');
    strip.width=frame.width+margin*2;strip.height=frame.height*3+margin*4;
    const ctx=strip.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,strip.width,strip.height);
    this.frames.forEach((image,index)=>ctx.drawImage(image,margin,margin+index*(frame.height+margin),frame.width,frame.height));
    this.cancel();return strip;
  }
}
