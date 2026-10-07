import { useEffect, useState } from 'react';
import { useWindowMedia } from './hooks/useWindowMedia';
import { MediaPanel } from './components/MediaPanel';
import { CameraStage } from './components/CameraStage';
import { ControlPanel } from './components/ControlPanel';
import { useHandCamera } from './hooks/useHandCamera';
import { useWebMcp } from './hooks/useWebMcp';
import { DEFAULT_SETTINGS } from './types';
import { useLanguage } from './hooks/useLanguage';

export function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const camera = useHandCamera(settings, effect => setSettings(previous => ({...previous,effect})));
  const content = useWindowMedia(camera.state.phase==='live');
  useEffect(()=>{camera.setMedia(content.media);},[camera.setMedia,content.media]);
  const { language, setLanguage, t } = useLanguage();
  useWebMcp({state:camera.state,settings,onEffect:effect=>{content.clear();setSettings(previous=>({...previous,effect}));},onStop:camera.stop});
  return <div className={`app${camera.state.phase==='live'?' live':''}`}>
    <header><a className="brand" href="./" aria-label={t('home')}><span className="mark">⌑</span> FINGER WINDOW</a><div className="header-controls"><span className="edition">{t('edition')}</span><div className="language-switch" role="group" aria-label={t('language')}><button lang="ja" aria-pressed={language==='ja'} onClick={()=>setLanguage('ja')}>日本語</button><button lang="mn" aria-pressed={language==='mn'} onClick={()=>setLanguage('mn')}>Монгол</button></div></div></header>
    <main>
      <section className="workspace" aria-label={t('workspace')}>
        <CameraStage videoRef={camera.videoRef} canvasRef={camera.canvasRef} state={camera.state} onStart={camera.start} t={t} />
        <ControlPanel settings={settings} state={camera.state} onSettings={next=>{if(next.effect!==settings.effect)content.clear();setSettings(next);}} onStop={camera.stop} t={t} mediaPanel={<MediaPanel content={content} live={camera.state.phase==='live'} t={t}/>} />
      </section>
      <div className="guide"><span className="guide-number">{t('howTo')}</span><p><b>1</b> {t('step1')} <span>/</span> <b>2</b> {t('step2')} <span>/</span> <b>3</b> {t('step3')}</p></div>
    </main>
    <footer><span>{t('footer')}</span><span>{t('noUpload')}</span></footer>
  </div>;
}
