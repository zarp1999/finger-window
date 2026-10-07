import { useState } from 'react';
import { CameraStage } from './components/CameraStage';
import { ControlPanel } from './components/ControlPanel';
import { useHandCamera } from './hooks/useHandCamera';
import { useWebMcp } from './hooks/useWebMcp';
import { DEFAULT_SETTINGS } from './types';

export function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const camera = useHandCamera(settings);
  useWebMcp({state:camera.state,settings,onEffect:effect=>setSettings(previous=>({...previous,effect})),onStop:camera.stop});
  return <div className={`app${camera.state.phase==='live'?' live':''}`}>
    <header><a className="brand" href="./" aria-label="Finger Window ホーム"><span className="mark">⌑</span> FINGER WINDOW</a><span className="edition">INTERACTIVE CAMERA / 01</span></header>
    <main>
      <div className="heading"><div><p className="eyebrow">指先でつくる、映像の窓。</p><h1>手の間に、もうひとつの色。</h1></div><span className="tag">HAND TRACKING</span></div>
      <section className="workspace" aria-label="カメラエフェクト">
        <CameraStage videoRef={camera.videoRef} canvasRef={camera.canvasRef} state={camera.state} onStart={camera.start} />
        <ControlPanel settings={settings} state={camera.state} onSettings={setSettings} onStop={camera.stop} />
      </section>
      <div className="guide"><span className="guide-number">HOW TO</span><p><b>1</b> カメラを許可 <span>/</span> <b>2</b> 両手の親指と人差し指を開く <span>/</span> <b>3</b> 手を動かして窓を変形</p></div>
    </main>
    <footer><span>FINGER WINDOW / REAL-TIME VISUAL EXPERIMENT</span><span>カメラ映像の保存・送信なし</span></footer>
  </div>;
}
