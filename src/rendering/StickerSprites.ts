import type { StickerSet } from '../types';

export const FLOWERS=['🌸','🌹','🌻','🌷','🌼','🌺'] as const;
const HEARTS=['❤️','🩷','🧡','💛','💚','💙','💜'];
const SPACE=['🌙','🪐','🌍','🚀','👽','☄️'];
export const STICKER_PALETTES:Record<StickerSet,number[]>={
  flowers:[0,1,2,3,4,5],sparkles:[6,7,8,9,10,11],hearts:[12,13,14,15,16,17,18],space:[19,20,21,22,23,24],
};
function sprite():HTMLCanvasElement{const c=document.createElement('canvas');c.width=128;c.height=128;return c;}
function emoji(glyph:string):HTMLCanvasElement{
  const c=sprite(),ctx=c.getContext('2d')!;
  ctx.font='100px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(glyph,64,65);return c;
}
function sparkle(color:string,index:number):HTMLCanvasElement{
  const c=sprite(),ctx=c.getContext('2d')!;
  const glow=ctx.createRadialGradient(64,64,0,64,64,60);
  glow.addColorStop(0,'#ffffffa0');glow.addColorStop(.2,color+'60');glow.addColorStop(.55,color+'18');glow.addColorStop(1,color+'00');
  ctx.fillStyle=glow;ctx.fillRect(0,0,128,128);
  ctx.save();ctx.translate(64,64);ctx.rotate(index%2?Math.PI/4:0);
  ctx.beginPath();ctx.moveTo(0,-46);ctx.bezierCurveTo(3,-12,12,-3,46,0);ctx.bezierCurveTo(12,3,3,12,0,46);ctx.bezierCurveTo(-3,12,-12,3,-46,0);ctx.bezierCurveTo(-12,-3,-3,-12,0,-46);
  const shine=ctx.createLinearGradient(-20,-42,24,44);shine.addColorStop(0,'#ffffff');shine.addColorStop(.4,'#fffef9');shine.addColorStop(1,color);
  ctx.fillStyle=shine;ctx.shadowColor=color;ctx.shadowBlur=12;ctx.fill();ctx.restore();
  if(index%3===0){ctx.fillStyle='#ffffffdd';ctx.beginPath();ctx.arc(27,25,2,0,Math.PI*2);ctx.fill();}
  return c;
}
export function createStickerSprites():HTMLCanvasElement[]{
  return [...FLOWERS.map(emoji),...['#ffffff','#ffe5a3','#dcefff','#ffe4ef','#eadfff','#fff1cf'].map(sparkle),...HEARTS.map(emoji),...SPACE.map(emoji)];
}
