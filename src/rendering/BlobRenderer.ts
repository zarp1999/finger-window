interface Blob {id:number;x:number;y:number;w:number;h:number;cx:number;cy:number;area:number;seen:number}
type Region=Omit<Blob,'id'|'seen'>;

/** Bright connected regions, sampled at 15 Hz, with short-lived stable IDs. */
export class BlobRenderer {
  private sample=document.createElement('canvas');
  private sampling=this.sample.getContext('2d',{willReadFrequently:true})!;
  private canvas=document.createElement('canvas');
  private context=this.canvas.getContext('2d')!;
  private tracks:Blob[]=[];
  private nextId=1;
  private lastAnalysis=-Infinity;
  private mask=new Uint8Array(0);
  private queue=new Int32Array(0);
  resize(width:number,height:number):void {
    this.canvas.width=width;this.canvas.height=height;
    this.sample.width=Math.min(192,width);this.sample.height=Math.max(1,Math.round(this.sample.width*height/width));
    this.mask=new Uint8Array(this.sample.width*this.sample.height);this.queue=new Int32Array(this.mask.length);this.reset();
  }
  reset():void{this.tracks=[];this.nextId=1;this.lastAnalysis=-Infinity;}
  private analyze(video:HTMLVideoElement,time:number):void {
    const w=this.sample.width,h=this.sample.height;
    this.sampling.drawImage(video,0,0,w,h);
    const pixels=this.sampling.getImageData(0,0,w,h).data,histogram=new Uint32Array(256);
    for(let i=0;i<this.mask.length;i++){const l=Math.round(pixels[i*4]*.299+pixels[i*4+1]*.587+pixels[i*4+2]*.114);this.mask[i]=l;histogram[l]++;}
    let sum=0,threshold=180;
    for(let i=0;i<256;i++){sum+=histogram[i];if(sum>=this.mask.length*.82){threshold=Math.max(180,Math.min(235,i));break;}}
    for(let i=0;i<this.mask.length;i++)this.mask[i]=this.mask[i]>=threshold?1:0;
    const regions:Region[]=[];
    for(let i=0;i<this.mask.length;i++){
      if(!this.mask[i])continue;
      let start=0,end=1,count=0,minX=w,minY=h,maxX=0,maxY=0,sx=0,sy=0;
      this.queue[0]=i;this.mask[i]=0;
      while(start<end){
        const index=this.queue[start++],x=index%w,y=Math.floor(index/w);
        count++;sx+=x;sy+=y;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
        const add=(n:number)=>{if(this.mask[n]){this.mask[n]=0;this.queue[end++]=n;}};
        if(x>0)add(index-1);if(x<w-1)add(index+1);if(y>0)add(index-w);if(y<h-1)add(index+w);
      }
      if(count<Math.max(8,w*h*.0007)||count>w*h*.4||maxX-minX<2||maxY-minY<2)continue;
      regions.push({x:minX/w,y:minY/h,w:(maxX-minX+1)/w,h:(maxY-minY+1)/h,cx:sx/count/w,cy:sy/count/h,area:count/(w*h)});
    }
    regions.sort((a,b)=>b.area-a.area);
    const available=this.tracks.filter(track=>time-track.seen<350),used=new Set<number>(),next:Blob[]=[];
    for(const region of regions.slice(0,20)){
      let best:Blob|undefined,distance=.13;
      for(const track of available){if(used.has(track.id))continue;const d=Math.hypot(track.cx-region.cx,(track.cy-region.cy)*h/w);if(d<distance&&region.area/track.area>.25&&region.area/track.area<4){distance=d;best=track;}}
      if(best){used.add(best.id);const smooth=(key:'x'|'y'|'w'|'h'|'cx'|'cy')=>best![key]*.3+region[key]*.7;next.push({...region,x:smooth('x'),y:smooth('y'),w:smooth('w'),h:smooth('h'),cx:smooth('cx'),cy:smooth('cy'),id:best.id,seen:time});}
      else next.push({...region,id:this.nextId++,seen:time});
    }
    this.tracks=next;this.lastAnalysis=time;
  }
  render(video:HTMLVideoElement,time:number,mirrorLabels=false):HTMLCanvasElement {
    if(time-this.lastAnalysis>=1000/15)this.analyze(video,time);
    const c=this.context,w=this.canvas.width,h=this.canvas.height;
    c.drawImage(video,0,0,w,h);
    const size=Math.max(11,Math.round(w/65));
    c.lineWidth=Math.max(1,w/800);c.strokeStyle='#a9ffce';c.fillStyle='#a9ffce';
    // Each point connects to its closest neighbor; deduplicate edges.
    const edges=new Set<string>();
    for(const blob of this.tracks){
      const other=this.tracks.filter(b=>b!==blob).sort((a,b)=>Math.hypot(a.cx-blob.cx,a.cy-blob.cy)-Math.hypot(b.cx-blob.cx,b.cy-blob.cy))[0];
      if(!other)continue;const key=[blob.id,other.id].sort((a,b)=>a-b).join(':');if(edges.has(key))continue;edges.add(key);
      c.save();c.globalAlpha=.4;c.beginPath();c.moveTo(blob.cx*w,blob.cy*h);c.lineTo(other.cx*w,other.cy*h);c.stroke();c.restore();
    }
    for(const blob of this.tracks){
      const x=blob.x*w,y=blob.y*h,bw=blob.w*w,bh=blob.h*h,cx=blob.cx*w,cy=blob.cy*h;
      c.strokeRect(x,y,bw,bh);c.beginPath();c.arc(cx,cy,Math.max(2,w/400),0,Math.PI*2);c.fill();
      c.beginPath();c.moveTo(cx-5,cy);c.lineTo(cx+5,cy);c.moveTo(cx,cy-5);c.lineTo(cx,cy+5);c.stroke();
      c.save();c.translate(mirrorLabels?x+bw-3:x+3,Math.max(size+4,y-4));if(mirrorLabels)c.scale(-1,1);
      c.font=`500 ${size}px monospace`;const label=`ID ${blob.id.toString().padStart(2,'0')}`,labelWidth=c.measureText(label).width;
      c.fillStyle='#071b13dd';c.fillRect(0,-size-3,labelWidth+8,size+6);c.fillStyle='#a9ffce';c.fillText(label,4,0);c.restore();
    }
    return this.canvas;
  }
}
