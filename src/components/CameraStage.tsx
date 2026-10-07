import type { RefObject } from 'react';
import type { CameraState } from '../types';
import type { TranslationKey } from '../i18n';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  state: CameraState;
  onStart: () => void;
  t: (key: TranslationKey) => string;
}
export function CameraStage({ videoRef, canvasRef, state, onStart, t }: Props) {
  const live = state.phase === 'live', loading = state.phase === 'loading';
  return <div className="stage" id="stage">
    <video ref={videoRef} id="video" autoPlay muted playsInline aria-hidden="true" />
    <canvas ref={canvasRef} id="output" width="960" height="540" aria-label={t('output')} />
    <div className="stage-top"><span id="modeLabel">{t(live ? 'live' : 'standby')}</span><span id="fps">{state.fps || '—'} FPS</span></div>
    <div id="welcome" className="welcome" hidden={live}>
      <span className="window-icon" aria-hidden="true" /><h2>{t('welcome')}</h2>
      <p>{t('instruction1')}<br />{t('instruction2')}</p>
      <button id="start" className="primary" onClick={onStart} disabled={loading}>{t(loading ? 'loading' : state.phase === 'error' ? 'retry' : 'start')}</button>
      <p className="privacy">{t('privacy')}</p>
    </div>
    <div className="stage-bottom"><span id="hint">{t(state.hint)}</span><span className="corner">{t('liveWindow')}</span></div>
  </div>;
}
