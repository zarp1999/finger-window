import type { Effect } from '../types';

export const STYLE_EFFECTS: Effect[] = ['sprite','fatpixel','bootleg','mixed','phosphor','raster','stipple','xerox','softclub'];
type Sample = (x:number,y:number,channel:number)=>number;
const clamp = (v:number)=>Math.max(0,Math.min(1,v));
const noise = (x:number,y:number)=>{const v=Math.sin(x*12.9898+y*78.233)*43758.5453;return v-Math.floor(v);};

/** Canvas fallback uses the same spatial scales and palettes as the shader. */
export function stylePixel(effect:Effect,x:number,y:number,w:number,h:number,outputWidth:number,sample:Sample,time:number):number[] {
  const scale=w/outputWidth, u=(x+.5)/w,v=(y+.5)/h;
  const color=(px=x,py=y)=>[0,1,2].map(c=>sample(px,py,c)/255);
  const luminance=(c:number[])=>c[0]*.299+c[1]*.587+c[2]*.114;
  const c=color(), l=luminance(c);
  const n=noise(Math.floor(x/scale),Math.floor(y/scale));
  let result:number[];
  if(['sprite','fatpixel','bootleg'].includes(effect)){
    const block=Math.max(1,(effect==='fatpixel'?18:effect==='bootleg'?9:5)*scale);
    const shift=effect==='bootleg'?(noise(Math.floor(y/(block*3)),Math.floor(time*2))-.5)*block*2:0;
    const q=color(Math.floor((x+shift)/block)*block+block/2,Math.floor(y/block)*block+block/2);
    const levels=effect==='sprite'?7:effect==='fatpixel'?5:3;
    const d=(Math.floor(x/block)+Math.floor(y/block))%2===0?.018:-.018;
    result=q.map(value=>Math.floor(clamp(value+d)*levels+.5)/levels);
    if(effect==='bootleg'){result[0]=clamp(result[0]*1.12+.04);result[2]=clamp(result[2]*.85+.08);}
  }else if(effect==='softclub'){
    const radius=5*scale;
    const blur=[0,1,2].map(channel=>(sample(x-radius,y,channel)+sample(x+radius,y,channel)+sample(x,y-radius,channel)+sample(x,y+radius,channel)+sample(x,y,channel)*4)/(8*255));
    const b=luminance(blur), glow=Math.max(0,b-.55)*.24;
    result=blur.map((value,i)=>clamp((value*.58+b*.42)*.9+[.035,.09,.125][i]+glow+(n-.5)*.025));
  }else if(effect==='phosphor'){
    const scan=.86+.14*Math.cos(y/scale*Math.PI);
    result=[.035+l*.28,.06+l*1.08,.08+l*.7].map(value=>value*scan);
  }else if(effect==='raster'){
    const scan=.73+.27*Math.cos(y/scale*Math.PI*.5);
    const mask=Math.floor(x/scale)%3;
    result=c.map((value,i)=>value*scan*(i===mask?1:.87));
  }else if(effect==='stipple'){
    const dot=n<1-l;
    result=dot?[.11,.15,.31]:[1,.78,.56];
  }else if(effect==='xerox'){
    const value=clamp((l-.5)*2.5+.55+(n-.5)*.22);
    const band=Math.floor(v*7)%3===0;
    const offset=band?6*scale:0;
    const q=luminance(color(x+offset,y));
    const ink=clamp(value*.6+clamp((q-.5)*2.5+.55)*.4);
    result=[.1+ink*.84,.09+ink*.82,.085+ink*.77];
  }else{
    const d=2*scale, edge=clamp(Math.hypot(luminance(color(x+d,y))-luminance(color(x-d,y)),luminance(color(x,y+d))-luminance(color(x,y-d)))*3);
    const paper=[.94,.89,.8];
    const poster=c.map(value=>Math.floor(value*4+.5)/4);
    const right=u>.54+.025*Math.sin(v*37);
    result=poster.map((value,i)=>(right?paper[i]*(.3+l*.7):value*.8+paper[i]*.2)*(1-edge*.78)+(n-.5)*.06);
    if(right&&Math.floor(x/scale)%5===0&&Math.floor(y/scale)%5===0)result=result.map(value=>value*(.45+l*.55));
  }
  return result.map(value=>clamp(value)*255);
}
