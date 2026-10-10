import {useEffect,useRef,useState} from 'react';
import type {PointerEvent} from 'react';
import type {TranslationKey} from '../i18n';
import {createStickerSprites,STICKER_PALETTES} from '../rendering/StickerSprites';
import type {StickerSet} from '../types';

type Point={x:number;y:number};
type Item={kind:'stamp'|'text';x:number;y:number;size:number;angle:number;index:number;text:string;color:string}|{kind:'line';points:Point[];size:number;color:string};
export function PhotoEditor({url,t,onSave,onCancel,busy}:{url:string;t:(key:TranslationKey)=>string;onSave:(canvas:HTMLCanvasElement)=>void;onCancel:()=>void;busy:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),image=useRef<HTMLImageElement|null>(null),sprites=useRef<HTMLCanvasElement[]>([]);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[items,setItems]=useState<Item[]>([]),[history,setHistory]=useState<Item[][]>([]),[selected,setSelected]=useState<number|null>(null);
 const [tool,setTool]=useState<'move'|'pen'>('move'),[color,setColor]=useState('#ff72a8'),[width,setWidth]=useState(6),[text,setText]=useState(''),[set,setSet]=useState<StickerSet>('hearts');
 const drag=useRef<{id:number;index:number;start:Point;original:Point}|null>(null);
 useEffect(()=>{let active=true;const img=new Image();sprites.current=createStickerSprites();img.onload=()=>{if(!active)return;image.current=img;setReady(true);};img.onerror=()=>{if(active)setFailed(true);};img.src=url;return()=>{active=false;};},[url]);
 function paint(target:HTMLCanvasElement){const img=image.current;if(!img)return;target.width=img.naturalWidth;target.height=img.naturalHeight;const ctx=target.getContext('2d')!;ctx.drawImage(img,0,0);for(const item of items){ctx.save();if(item.kind==='line'){ctx.strokeStyle=item.color;ctx.lineWidth=item.size*target.width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();item.points.forEach((p,i)=>{if(i)ctx.lineTo(p.x*target.width,p.y*target.height);else{ctx.moveTo(p.x*target.width,p.y*target.height);ctx.lineTo(p.x*target.width+.01,p.y*target.height);}});ctx.stroke();}else{ctx.translate(item.x*target.width,item.y*target.height);ctx.rotate(item.angle*Math.PI/180);const size=item.size*target.width;if(item.kind==='stamp')ctx.drawImage(sprites.current[item.index],-size/2,-size/2,size,size);else{ctx.font=`bold ${size}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=item.color;ctx.fillText(item.text,0,0);}}ctx.restore();}}
 useEffect(()=>{if(ready&&canvas.current)paint(canvas.current);},[items,ready]);
 function checkpoint(){setHistory(h=>[...h.slice(-39),items]);}
 function add(item:Item){checkpoint();setItems(v=>[...v,item]);setSelected(items.length);setTool('move');}
 function point(e:PointerEvent<HTMLCanvasElement>):Point{const r=e.currentTarget.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};}
 function down(e:PointerEvent<HTMLCanvasElement>){if(!ready||busy||drag.current)return;e.preventDefault();const p=point(e);e.currentTarget.setPointerCapture(e.pointerId);if(tool==='pen'){checkpoint();const index=items.length;setItems(v=>[...v,{kind:'line',points:[p],size:width/(canvas.current?.clientWidth||300),color}]);setSelected(null);drag.current={id:e.pointerId,index,start:p,original:p};return;}
 const reversed=items.slice().reverse().findIndex(item=>{if(item.kind==='line')return false;const aspect=(canvas.current?.height||1)/(canvas.current?.width||1);return Math.hypot(item.x-p.x,(item.y-p.y)*aspect)<item.size*(item.kind==='text'?Math.max(1,item.text.length*.3):.7);});const index=reversed<0?-1:items.length-1-reversed;setSelected(index<0?null:index);if(index>=0){const item=items[index];if(item.kind!=='line'){checkpoint();drag.current={id:e.pointerId,index,start:p,original:{x:item.x,y:item.y}};}}}
 function move(e:PointerEvent<HTMLCanvasElement>){const d=drag.current;if(!d||d.id!==e.pointerId)return;const p=point(e);setItems(v=>v.map((item,i)=>i!==d.index?item:item.kind==='line'?{...item,points:[...item.points,p]}:{...item,x:Math.max(0,Math.min(1,d.original.x+p.x-d.start.x)),y:Math.max(0,Math.min(1,d.original.y+p.y-d.start.y))}));}
 function finish(e:PointerEvent<HTMLCanvasElement>){if(drag.current?.id===e.pointerId)drag.current=null;}
 function change(patch:Partial<Item>){if(selected===null)return;setItems(v=>v.map((item,i)=>i===selected?{...item,...patch} as Item:item));}
 const active=selected===null?null:items[selected];
 return <div className="photo-editor">
  <div className="editor-preview"><canvas id="editCanvas" ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} aria-label={t('editPhoto')}/></div>
  {failed&&<p role="alert">{t('photoFailed')}</p>}
  <div className="editor-actions"><button onClick={()=>setTool('move')} aria-pressed={tool==='move'}>{t('editMove')}</button><button onClick={()=>{setTool('pen');setSelected(null);}} aria-pressed={tool==='pen'}>{t('editDraw')}</button><button disabled={!history.length||busy} onClick={()=>{setItems(history[history.length-1]);setHistory(h=>h.slice(0,-1));setSelected(null);}}>{t('editUndo')}</button><button disabled={selected===null||busy} onClick={()=>{checkpoint();setItems(v=>v.filter((_,i)=>i!==selected));setSelected(null);}}>{t('editDelete')}</button></div>
  <div className="editor-actions"><label>{t('penColor')}<input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label>{tool==='pen'&&<label>{t('penSize')}<input type="range" min="2" max="18" value={width} onChange={e=>setWidth(Number(e.target.value))}/></label>}</div>
  <div className="editor-actions">{(['flowers','sparkles','hearts','space'] as const).map(s=><button key={s} aria-pressed={set===s} onClick={()=>setSet(s)}>{t(s==='flowers'?'flowersShort':s)}</button>)}</div>
  <div className="editor-stamps">{STICKER_PALETTES[set].map(index=><button key={index} disabled={!ready||busy} aria-label={`${t('stickers')} ${index+1}`} onClick={()=>add({kind:'stamp',index,x:.5,y:.5,size:.22,angle:0,text:'',color})}><Stamp index={index}/></button>)}</div>
  <form className="editor-actions" onSubmit={e=>{e.preventDefault();if(text.trim()){add({kind:'text',text:text.trim(),color,x:.5,y:.5,size:.075,angle:0,index:0});setText('');}}}><input id="editText" maxLength={80} value={text} placeholder={t('editText')} aria-label={t('editText')} onChange={e=>setText(e.target.value)}/><button disabled={!ready||!text.trim()||busy}>{t('editAdd')}</button></form>
  {active&&active.kind!=='line'&&<div className="editor-actions"><label>{t('editSize')}<input type="range" min=".025" max=".7" step=".005" value={active.size} onPointerDown={checkpoint} onChange={e=>change({size:Number(e.target.value)})}/></label><label>{t('editRotate')}<input type="range" min="-180" max="180" value={active.angle} onPointerDown={checkpoint} onChange={e=>change({angle:Number(e.target.value)})}/></label></div>}
  <div className="editor-actions"><button id="editSave" disabled={!ready||busy} onClick={()=>{const output=document.createElement('canvas');paint(output);onSave(output);}}>{t('editApply')}</button><button disabled={busy} onClick={onCancel}>{t('editCancel')}</button></div>
 </div>;
}
function Stamp({index}:{index:number}){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{const c=ref.current;if(c){c.width=c.height=128;c.getContext('2d')!.drawImage(createStickerSprites()[index],0,0);}},[index]);return <canvas ref={ref} aria-hidden="true"/>;}
