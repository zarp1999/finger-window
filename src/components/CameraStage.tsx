import type { RefObject } from 'react';
import { useEffect,useState,useRef } from 'react';
import type {PointerEvent} from 'react';
import type { CameraState,EffectScope } from '../types';
import type { TranslationKey } from '../i18n';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  state: CameraState;
  onStart: () => void;
  onStop: () => void;
  t: (key: TranslationKey) => string;
  effectScope:EffectScope|null;
  onToggleScope:()=>void;
  zoom:number;
  onZoom:(zoom:number)=>void;
}
export function CameraStage({ videoRef, canvasRef, state, onStart, onStop, t, effectScope, onToggleScope,zoom,onZoom }: Props) {
  const live = state.phase === 'live', loading = state.phase === 'loading';
  const [flash,setFlash]=useState(false);
  const touches=useRef(new Map<number,{x:number;y:number}>());
  const pinch=useRef<{distance:number;zoom:number}|null>(null);
  const distance=()=>{const points=[...touches.current.values()];return points.length===2?Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y):0;};
  useEffect(()=>{if(!live){touches.current.clear();pinch.current=null;}},[live]);
  const down=(event:PointerEvent<HTMLCanvasElement>)=>{
    if(!live||event.pointerType!=='touch'||touches.current.size>=2)return;
    event.currentTarget.setPointerCapture(event.pointerId);touches.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const d=distance();if(d>0)pinch.current={distance:d,zoom};
  };
  const move=(event:PointerEvent<HTMLCanvasElement>)=>{
    if(!touches.current.has(event.pointerId))return;
    touches.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pinch.current&&touches.current.size===2)onZoom(Math.max(1,Math.min(3,pinch.current.zoom*distance()/pinch.current.distance)));
  };
  const up=(event:PointerEvent<HTMLCanvasElement>)=>{touches.current.delete(event.pointerId);pinch.current=null;};
  useEffect(()=>{
    if(!live||!state.photoFlash){setFlash(false);return;}
    setFlash(true);const timeout=setTimeout(()=>setFlash(false),240);
    return ()=>clearTimeout(timeout);
  },[state.photoFlash,live]);
  return <div className="stage" id="stage">
    <video ref={videoRef} id="video" autoPlay muted playsInline aria-hidden="true" />
    <canvas ref={canvasRef} id="output" width="960" height="540" aria-label={t('output')} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}/>
    {live&&<button className="camera-zoom" onClick={()=>onZoom(1)} aria-label={`${t('zoomReset')} (${zoom.toFixed(1)}×)`}>{zoom.toFixed(1)}×</button>}
    {flash&&<div key={state.photoFlash} id="shutterFlash" className="shutter-flash" aria-hidden="true"/>}
    {live&&state.photoCountdown!==null&&<div id="photoCountdown" className="photo-countdown" role="status" aria-live="assertive" aria-atomic="true"><span key={state.photoCountdown}>{state.photoCountdown}</span></div>}
    <div className="stage-top"><span id="modeLabel">{t(live ? 'live' : 'standby')}</span><span id="fps">{state.fps || '—'} FPS</span></div>
    {live&&effectScope&&<button type="button" id="effectScope" className="effect-scope" onClick={onToggleScope} aria-pressed={effectScope==='full'}>{t(effectScope==='full'?'fullMode':'windowMode')}</button>}
    {(live||loading)&&<button id="stop" className="camera-stop" onClick={onStop} aria-label={t('stop')} title={t('stop')}><span aria-hidden="true">×</span></button>}
    <div id="welcome" className="welcome" hidden={live}>
      <span className="window-icon" aria-hidden="true" /><h2>{t('welcome')}</h2>
      <p>{t('instruction1')}<br />{t('instruction2')}</p>
      {state.phase==='error'&&<p className="status error" role="alert">{t(state.message)}</p>}
      <button id="start" className="primary" onClick={onStart} disabled={loading}>{t(loading ? 'loading' : state.phase === 'error' ? 'retry' : 'start')}</button>
      {t('privacy')&&<p className="privacy">{t('privacy')}</p>}
    </div>
    {live&&<div className="stage-bottom"><span id="hint">{t(state.hint)}</span><span className="corner">{t('liveWindow')}</span></div>}
  </div>;
}
