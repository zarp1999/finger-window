import { useEffect, useState } from 'react';
import { useWindowMedia } from './hooks/useWindowMedia';
import { MediaPanel } from './components/MediaPanel';
import { useRecording } from './hooks/useRecording';
import { RecordingPanel } from './components/RecordingPanel';
import { usePhoto } from './hooks/usePhoto';
import { PhotoPanel } from './components/PhotoPanel';
import { CameraStage } from './components/CameraStage';
import { BottomSheet } from './components/BottomSheet';
import { QuickControls } from './components/QuickControls';
import { useHandCamera } from './hooks/useHandCamera';
import { useWebMcp } from './hooks/useWebMcp';
import { DEFAULT_SETTINGS,EFFECTS } from './types';
import { useLanguage } from './hooks/useLanguage';

type Sheet='effects'|'options'|'help'|'saved'|null;
export function App() {
  const [settings,setSettings]=useState(DEFAULT_SETTINGS),[sheet,setSheet]=useState<Sheet>(null);
  const photo=usePhoto();
  const camera=useHandCamera(settings,effect=>setSettings(previous=>({...previous,effect})),photo.capture,scope=>setSettings(previous=>({...previous,effectScope:scope})));
  const content=useWindowMedia(camera.state.phase==='live');
  const recording=useRecording(camera.canvasRef,camera.state.phase==='live',content.media);
  useEffect(()=>{camera.setMedia(content.media);if(content.media)setSettings(previous=>({...previous,flowers:false,pen:false}));},[camera.setMedia,content.media]);
  useEffect(()=>{if(photo.result)setSheet('saved');},[photo.result]);
  useEffect(()=>{if(recording.state.url)setSheet('saved');},[recording.state.url]);
  useEffect(()=>{if(photo.error)setSheet('saved');},[photo.error]);
  const {language,setLanguage,t}=useLanguage();
  useWebMcp({state:camera.state,settings,onEffect:effect=>{content.clear();setSettings(previous=>({...previous,effect,flowers:false,pen:false}));},onStop:camera.stop});
  const sheetTitle=t(sheet==='effects'?'effect':sheet==='help'?'howTo':sheet==='saved'?'savedMedia':'controls');
  const currentEffect=settings.pen?t('penMode')+(camera.state.penPaused?' · '+t('flowersPaused'):''):settings.flowers?t('flowerMode')+(camera.state.flowerPaused?' · '+t('flowersPaused'):''):content.media?content.media.name:t(settings.effect);
  return <div className={`app compact-app${camera.state.phase==='live'?' live':''}`}>
    <header><a className="brand" href="./" aria-label={t('home')}><span className="mark">⌑</span> FINGER WINDOW</a><div className="language-switch" role="group" aria-label={t('language')}><button lang="ja" aria-pressed={language==='ja'} onClick={()=>setLanguage('ja')}>日本語</button><button lang="mn" aria-pressed={language==='mn'} onClick={()=>setLanguage('mn')}>Монгол</button></div></header>
    <main>
      <section className="camera-area" aria-label={t('workspace')}>
        <CameraStage videoRef={camera.videoRef} canvasRef={camera.canvasRef} state={camera.state} onStart={camera.start} onStop={camera.stop} t={t} effectScope={!settings.flowers&&!settings.pen&&!content.media?settings.effectScope:null}/>
        {(photo.busy||recording.state.phase==='stopping'||recording.state.message)&&<div className="camera-notice" role="status">{t(photo.busy?'photoPreparing':recording.state.phase==='stopping'?'recordFinishing':recording.state.message!)}</div>}
      </section>
      <QuickControls settings={settings} state={camera.state} photo={photo} recording={recording} effectLabel={currentEffect} onSettings={setSettings} onCapture={camera.capturePhoto}
        onEffects={()=>setSheet('effects')} onOptions={()=>setSheet('options')} onHelp={()=>setSheet('help')} onSaved={()=>setSheet('saved')}
        onFlowers={()=>{content.clear();setSettings(previous=>({...previous,flowers:!previous.flowers,pen:false}));}} t={t}/>
    </main>
    <BottomSheet open={sheet!==null} title={sheetTitle} closeLabel={t('close')} onClose={()=>setSheet(null)}>
      {sheet==='effects'&&<div className="effects" role="group" aria-label={t('effectGroup')}>{EFFECTS.map(effect=>
        <button key={effect} className={`effect${settings.effect===effect&&!settings.flowers&&!settings.pen&&!content.media?' active':''}`} data-effect={effect} aria-pressed={settings.effect===effect&&!settings.flowers&&!settings.pen&&!content.media} onClick={()=>{content.clear();setSettings(previous=>({...previous,effect,flowers:false,pen:false}));setSheet(null);}}><span className={`swatch ${effect}`}/>{t(effect)}</button>
      )}</div>}
      {sheet==='options'&&<>
        <section className="sheet-section">
          <label className="toggle">{t('mirror')}<input id="mirror" type="checkbox" checked={settings.mirror} onChange={event=>setSettings(previous=>({...previous,mirror:event.target.checked}))}/><span className="switch"/></label>
          <label className="toggle">{t('photoAutomatic')}<input id="autoPhoto" type="checkbox" checked={settings.autoPhoto} onChange={event=>setSettings(previous=>({...previous,autoPhoto:event.target.checked}))}/><span className="switch"/></label>
          <p className="note">{t('photoHelp')}</p>
        </section>
        <section className="sheet-section"><label className="toggle">{t('penMode')}<input id="penMode" type="checkbox" checked={settings.pen} onChange={event=>{content.clear();setSettings(previous=>({...previous,pen:event.target.checked,flowers:false}));}}/><span className="switch"/></label>{settings.pen&&<><label className="pen-control">{t('penColor')}<input id="penColor" type="color" value={settings.penColor} onChange={event=>setSettings(previous=>({...previous,penColor:event.target.value}))}/></label><label className="pen-control">{t('penSize')}<input id="penSize" type="range" min="2" max="16" value={settings.penSize} onChange={event=>setSettings(previous=>({...previous,penSize:Number(event.target.value)}))}/></label><p className="note">{t('penHelp')}</p></>}{(settings.pen||camera.state.penCount>0)&&<button id="clearPen" className="secondary" disabled={!camera.state.penCount} onClick={camera.clearPen}>{t('clearPen')}</button>}</section>
        <MediaPanel content={content} live={camera.state.phase==='live'} t={t}/>
        {(settings.flowers||camera.state.flowerCount>0)&&<section className="sheet-section"><p className="control-label">{t('flowerMode')}</p><div className="status-row"><span>{t('flowerCount')}</span><strong id="flowerCount">{camera.state.flowerCount}</strong></div><button id="clearFlowers" className="secondary" disabled={!camera.state.flowerCount} onClick={camera.clearFlowers}>{t('clearFlowers')}</button></section>}
      </>}
      {sheet==='help'&&<>
        <section className="sheet-section"><h3>{t('photoTitle')}</h3><p>{t('photoHelp')}</p><p>{t('photoRelease')}</p><p>{t('photoBoothHelp')}</p></section>
        <section className="sheet-section"><h3>{t('effect')}</h3><p>{t('gestureHelp')}</p><p>{t('modeGestureHelp')}</p></section>
        <section className="sheet-section"><h3>{t('penMode')}</h3><p>{t('penHelp')}</p></section>
        <section className="sheet-section"><h3>{t('flowerMode')}</h3><p>{t('flowerHelp')}</p><div className="flower-palette">🌸 🌹 🌻 🌷 🌼 🌺</div></section>
        <section className="sheet-section"><h3>{t('recordTitle')}</h3><p>{t('recordHelp')}</p>{!recording.supported&&<p>{t('recordUnsupported')}</p>}</section>
        <section className="sheet-section"><h3>{t('tipLabel')}</h3><p>{t('tip')}</p><p>{t('privacy')}</p></section>
      </>}
      {sheet==='saved'&&<>
        {!photo.result&&!recording.state.url&&!photo.busy&&!photo.error&&<p className="empty-saved">{t('noSavedMedia')}</p>}
        {(photo.result||photo.busy||photo.error)&&<PhotoPanel resultOnly photo={photo} state={camera.state} settings={settings} onSettings={setSettings} onCapture={camera.capturePhoto} t={t}/>}
        {(recording.state.url||recording.state.message||recording.shareError)&&<RecordingPanel resultOnly recording={recording} live={camera.state.phase==='live'} t={t}/>}
      </>}
    </BottomSheet>
  </div>;
}
