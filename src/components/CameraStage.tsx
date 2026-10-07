import type { RefObject } from 'react';
import type { CameraState } from '../types';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  state: CameraState;
  onStart: () => void;
}
export function CameraStage({ videoRef, canvasRef, state, onStart }: Props) {
  const live = state.phase === 'live', loading = state.phase === 'loading';
  return <div className="stage" id="stage">
    <video ref={videoRef} id="video" autoPlay muted playsInline aria-hidden="true" />
    <canvas ref={canvasRef} id="output" width="960" height="540" aria-label="手の追跡とエフェクトを重ねたカメラ映像" />
    <div className="stage-top"><span id="modeLabel">{live ? 'LIVE / HAND TRACKING' : 'CAMERA STANDBY'}</span><span id="fps">{state.fps || '—'} FPS</span></div>
    <div id="welcome" className="welcome" hidden={live}>
      <span className="window-icon" aria-hidden="true" /><h2>両手で、窓をひらこう。</h2>
      <p>親指と人差し指を開いて、両手をカメラへ。<br />4つの指先に囲まれた映像の色が変わります。</p>
      <button id="start" className="primary" onClick={onStart} disabled={loading}>{loading ? '準備しています…' : state.phase === 'error' ? 'もう一度試す' : 'カメラを開始'}</button>
      <p className="privacy">映像はこのブラウザ内で処理されます。</p>
    </div>
    <div className="stage-bottom"><span id="hint">{state.hint}</span><span className="corner">LIVE WINDOW</span></div>
  </div>;
}
