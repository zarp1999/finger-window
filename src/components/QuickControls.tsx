import type { CameraState,Settings } from '../types';
import type { TranslationKey } from '../i18n';
import type { useRecording } from '../hooks/useRecording';
import type { usePhoto } from '../hooks/usePhoto';

type IconName='camera'|'record'|'flower'|'settings'|'help'|'saved';
function Icon({name}:{name:IconName}){
  const paths:Record<IconName,string>={
    camera:'M3 7h4l2-3h6l2 3h4v13H3z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    record:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M8 8h8v8H8z',
    flower:'M12 9c-7-9-11 0-5 3-8 5 0 11 5 3 5 8 13 2 5-3 6-3 2-12-5-3 M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
    settings:'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
    help:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 16v1',
    saved:'M4 4h16v16H4z M7 15l3-3 3 3 3-5 4 6 M8 8h.01',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
export function QuickControls({settings,state,photo,recording,effectLabel,onSettings,onCapture,onEffects,onOptions,onHelp,onSaved,onFlowers,t}:{
  settings:Settings;state:CameraState;photo:ReturnType<typeof usePhoto>;recording:ReturnType<typeof useRecording>;effectLabel:string;
  onSettings:(settings:Settings)=>void;onCapture:()=>void;onEffects:()=>void;onOptions:()=>void;onHelp:()=>void;onSaved:()=>void;onFlowers:()=>void;t:(key:TranslationKey)=>string;
}){
  const live=state.phase==='live',shooting=state.photoShot!==null||state.photoCountdown!==null;
  const recordingNow=recording.state.phase==='recording',stopping=recording.state.phase==='stopping';
  return <section className="quick-controls" aria-label={t('controls')}>
    <div className="quick-top">
      <button id="openEffects" className="effect-picker" onClick={onEffects} aria-haspopup="dialog"><small>{t('effect')}</small><strong>{effectLabel}</strong><span aria-hidden="true">⌄</span></button>
      <div className="quick-photo-modes" role="group" aria-label={t('photoMode')}>
        {([1,3] as const).map(count=><button key={count} id={count===1?'photoSingle':'photoBooth'} aria-label={t(count===1?'photoSingle':'photoBooth')} aria-pressed={settings.photoCount===count} disabled={shooting||photo.busy} onClick={()=>onSettings({...settings,photoCount:count})}>{t(count===1?'oneShotShort':'threeShotShort')}</button>)}
      </div>
      <button id="openSaved" className="saved-button" onClick={onSaved} aria-label={t('savedMedia')} aria-haspopup="dialog"><Icon name="saved"/>{(photo.result||recording.state.url)&&<span className="saved-dot" aria-hidden="true"/>}</button>
    </div>
    <div className="quick-actions">
      <button id="photoCapture" className="capture-action" disabled={!live||shooting||photo.busy||photo.sharing} onClick={onCapture}><Icon name="camera"/><span>{t('captureShort')}</span></button>
      <button id="recordToggle" className={recordingNow?'recording-action':''} disabled={!recording.supported||stopping||recording.sharing||(!live&&!recordingNow)} onClick={recordingNow?recording.stop:recording.start} aria-label={t(recordingNow?'recordStop':'recordStart')}><Icon name="record"/><span>{recordingNow?`${Math.floor(recording.state.seconds/60)}:${(recording.state.seconds%60).toString().padStart(2,'0')}`:t('recordShort')}</span></button>
      <button id="flowerMode" aria-pressed={settings.flowers} onClick={onFlowers}><Icon name="flower"/><span>{t('flowersShort')}</span></button>
      <button id="openSettings" onClick={onOptions} aria-label={t('controls')} aria-haspopup="dialog"><Icon name="settings"/><span>{t('settingsShort')}</span></button>
      <button id="openHelp" onClick={onHelp} aria-haspopup="dialog" aria-label={t('howTo')}><Icon name="help"/><span>{t('helpShort')}</span></button>
    </div>
  </section>;
}
