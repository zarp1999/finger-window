import type { RefObject } from 'react';
import { useEffect,useState } from 'react';
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
}
export function CameraStage({ videoRef, canvasRef, state, onStart, onStop, t, effectScope }: Props) {
  const live = state.phase === 'live', loading = state.phase === 'loading';
  const [flash,setFlash]=useState(false);
  useEffect(()=>{
    if(!live||!state.photoFlash){setFlash(false);return;}
    setFlash(true);const timeout=setTimeout(()=>setFlash(false),240);
    return ()=>clearTimeout(timeout);
  },[state.photoFlash,live]);
  return <div className="stage" id="stage">
    <video ref={videoRef} id="video" autoPlay muted playsInline aria-hidden="true" />
    <canvas ref={canvasRef} id="output" width="960" height="540" aria-label={t('output')} />
    {flash&&<div key={state.photoFlash} id="shutterFlash" className="shutter-flash" aria-hidden="true"/>}
    {live&&state.photoCountdown!==null&&<div id="photoCountdown" className="photo-countdown" role="status" aria-live="assertive" aria-atomic="true"><span key={state.photoCountdown}>{state.photoCountdown}</span><small>{t('photoHold')}</small></div>}
    {live&&state.photoShot!==null&&<div id="photoShot" className="photo-shot" role="status" aria-live="polite">{t('photoBoothProgress')} {state.photoShot} / 3 · {t('photoPose')}</div>}
    <div className="stage-top"><span id="modeLabel">{t(live ? 'live' : 'standby')}</span><span id="fps">{state.fps || '—'} FPS</span></div>
    {live&&effectScope&&<div id="effectScope" className="effect-scope" role="status" aria-live="polite">{t(effectScope==='full'?'fullMode':'windowMode')}</div>}
    {(live||loading)&&<button id="stop" className="camera-stop" onClick={onStop} aria-label={t('stop')} title={t('stop')}><span aria-hidden="true">×</span></button>}
    <div id="welcome" className="welcome" hidden={live}>
      <span className="window-icon" aria-hidden="true" /><h2>{t('welcome')}</h2>
      <p>{t('instruction1')}<br />{t('instruction2')}</p>
      {state.phase==='error'&&<p className="status error" role="alert">{t(state.message)}</p>}
      <button id="start" className="primary" onClick={onStart} disabled={loading}>{t(loading ? 'loading' : state.phase === 'error' ? 'retry' : 'start')}</button>
      <p className="privacy">{t('privacy')}</p>
    </div>
    {live&&<div className="stage-bottom"><span id="hint">{t(state.hint)}</span><span className="corner">{t('liveWindow')}</span></div>}
  </div>;
}
