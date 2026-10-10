import type { Effect } from '../types';

export const STYLE_EFFECTS: Effect[] = ['sprite','raster','stipple','retro'];
type Sample = (x:number,y:number,channel:number)=>number;
const clamp = (v:number)=>Math.max(0,Math.min(1,v));
const noise = (x:number,y:number)=>{const v=Math.sin(x*12.9898+y*78.233)*43758.5453;return v-Math.floor(v);};

/** Canvas fallback uses the same spatial scales and palettes as the shader. */
export function stylePixel(effect:Effect,x:number,y:number,w:number,h:number,outputWidth:number,sample:Sample):number[] {
  const scale=w/outputWidth;
  const color=(px=x,py=y)=>[0,1,2].map(c=>sample(px,py,c)/255);
  const luminance=(c:number[])=>c[0]*.299+c[1]*.587+c[2]*.114;
  const c=color(), l=luminance(c);
  const n=noise(Math.floor(x/scale),Math.floor(y/scale));
  let result:number[];
  if(effect==='sprite'){
    const block=Math.max(1,5*scale),levels=7;
    const q=color(Math.floor(x/block)*block+block/2,Math.floor(y/block)*block+block/2);
    const d=(Math.floor(x/block)+Math.floor(y/block))%2===0?.018:-.018;
    result=q.map(value=>Math.floor(clamp(value+d)*levels+.5)/levels);
  }else if(effect==='raster'){
    const scan=.73+.27*Math.cos(y/scale*Math.PI*.5);
    const mask=Math.floor(x/scale)%3;
    result=c.map((value,i)=>value*scan*(i===mask?1:.87));
  }else if(effect==='stipple'){
    const dot=n<1-l;
    result=dot?[.11,.15,.31]:[1,.78,.56];
  }else if(effect==='retro'){
    const smooth=(a:number,b:number,value:number)=>{const t=clamp((value-a)/(b-a));return t*t*(3-2*t);};
    const d=1.5*scale;
    const soft=l*.6+(luminance(color(x+d,y))+luminance(color(x-d,y))+luminance(color(x,y+d))+luminance(color(x,y-d)))*.1;
    const tone=.09+.83*smooth(.035,.97,soft);
    const vignette=1-.24*smooth(.18,.70,Math.hypot((x+.5)/w-.5,(y+.5)/h-.5));
    const grain=(noise(Math.floor((x+.5)/scale*.65),Math.floor((y+.5)/scale*.65))-.5)*.05;
    result=[1,.985,.96].map(tint=>(tone*vignette+grain)*tint);
  }else result=c;
  return result.map(value=>clamp(value)*255);
}
