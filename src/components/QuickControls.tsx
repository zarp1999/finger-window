import type { CameraState,Settings } from '../types';
import type { TranslationKey } from '../i18n';
import type { useRecording } from '../hooks/useRecording';
import type { usePhoto } from '../hooks/usePhoto';

type IconName='record'|'sparkles'|'hearts'|'space'|'flower'|'pen'|'effects'|'settings'|'help'|'saved';
function Icon({name}:{name:IconName}){
  const paths:Record<IconName,string>={
    record:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M8 8h8v8H8z',
    sparkles:'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
    hearts:'M12 20S3 14 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 12-9 12z',
    space:'M18 6a8 8 0 1 1-12 12 8 8 0 0 1 12-12 M3 16c-5 7 9 4 17-4s1-8-4-5',
    flower:'M12 9c-7-9-11 0-5 3-8 5 0 11 5 3 5 8 13 2 5-3 6-3 2-12-5-3 M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
    pen:'M4 20l1-5L16 4l4 4L9 19z M14 6l4 4 M4 20l5-1',
    effects:'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
    settings:'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
    help:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 16v1',
    saved:'M4 4h16v16H4z M7 15l3-3 3 3 3-5 4 6 M8 8h.01',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
export function QuickControls({settings,state,photo,recording,effectLabel,onSettings,onCapture,onEffects,onOptions,onHelp,onSaved,onFlowers,onPen,t}:{
  settings:Settings;state:CameraState;photo:ReturnType<typeof usePhoto>;recording:ReturnType<typeof useRecording>;effectLabel:string;
  onSettings:(settings:Settings)=>void;onCapture:()=>void;onEffects:()=>void;onOptions:()=>void;onHelp:()=>void;onSaved:()=>void;onFlowers:()=>void;onPen:()=>void;t:(key:TranslationKey)=>string;
}){
  const live=state.phase==='live',shooting=state.photoShot!==null||state.photoCountdown!==null;
  const recordingNow=recording.state.phase==='recording',stopping=recording.state.phase==='stopping';
  return <section className="camera-controls" aria-label={t('controls')}>
    <div className="camera-tools">
      <button id="openEffects" className="hud-icon" onClick={onEffects} aria-label={t('effect')} title={t('effect')} aria-haspopup="dialog"><Icon name="effects"/></button>
      <button id="flowerMode" className="hud-icon" aria-pressed={settings.flowers} onClick={onFlowers} aria-label={t(settings.stickerSet==='flowers'?'flowerMode':settings.stickerSet)} title={t(settings.stickerSet==='flowers'?'flowerMode':settings.stickerSet)}><Icon name={settings.stickerSet==='flowers'?'flower':settings.stickerSet}/></button>
      <button id="penToggle" className="hud-icon" aria-pressed={settings.pen} onClick={onPen} aria-label={t('penMode')} title={t('penMode')}><Icon name="pen"/></button>
      <button id="openSettings" className="hud-icon" onClick={onOptions} aria-label={t('controls')} title={t('controls')} aria-haspopup="dialog"><Icon name="settings"/></button>
      <button id="openHelp" className="hud-icon" onClick={onHelp} aria-label={t('howTo')} title={t('howTo')} aria-haspopup="dialog"><Icon name="help"/></button>
    </div>
    <div className="capture-dock">
      <div className="quick-photo-modes" role="group" aria-label={t('photoMode')}>
        {([1,3] as const).map(count=><button key={count} id={count===1?'photoSingle':'photoBooth'} aria-label={t(count===1?'photoSingle':'photoBooth')} aria-pressed={settings.photoCount===count} disabled={shooting||photo.busy} onClick={()=>onSettings({...settings,photoCount:count})}>{t(count===1?'oneShotShort':'threeShotShort')}</button>)}
      </div>
      <div className="capture-row">
        <button id="openSaved" className="hud-icon saved-button" onClick={onSaved} aria-label={t('savedMedia')} title={t('savedMedia')} aria-haspopup="dialog"><Icon name="saved"/>{(photo.result||recording.state.url)&&<span className="saved-dot" aria-hidden="true"/>}</button>
        <button id="photoCapture" className="shutter" disabled={!live||shooting||photo.busy||photo.sharing} onClick={onCapture} aria-label={t('photoCapture')} title={t('photoCapture')}><span/></button>
        <button id="recordToggle" className={`hud-icon${recordingNow?' recording-action':''}`} disabled={!recording.supported||stopping||recording.sharing||(!live&&!recordingNow)} onClick={recordingNow?recording.stop:recording.start} aria-label={t(recordingNow?'recordStop':'recordStart')} title={t(recordingNow?'recordStop':'recordStart')}><Icon name="record"/></button>
      </div>
      <div id="currentEffect" className="capture-caption" role="status">{recordingNow?`${Math.floor(recording.state.seconds/60)}:${(recording.state.seconds%60).toString().padStart(2,'0')}`:effectLabel}</div>
    </div>
  </section>;
}
