import type { TranslationKey } from '../i18n';
import type { CameraState,Settings } from '../types';
import type { usePhoto } from '../hooks/usePhoto';

export function PhotoPanel({photo,state,settings,onSettings,onCapture,t,resultOnly=false}:{photo:ReturnType<typeof usePhoto>;state:CameraState;settings:Settings;onSettings:(settings:Settings)=>void;onCapture:()=>void;t:(key:TranslationKey)=>string;resultOnly?:boolean}) {
  return <section className="photo-control">
    <p className="control-label">{t('photoTitle')}</p>
    {!resultOnly&&<>
    <div className="photo-modes" role="group" aria-label={t('photoMode')}>
      {([1,3] as const).map(count=><button key={count} id={count===1?'photoSingle':'photoBooth'} className={settings.photoCount===count?'selected':''} aria-pressed={settings.photoCount===count} disabled={photo.busy||state.photoShot!==null||state.photoCountdown!==null} onClick={()=>onSettings({...settings,photoCount:count})}>{t(count===1?'photoSingle':'photoBooth')}</button>)}
    </div>
    <label className="toggle">{t('photoAutomatic')}<input id="autoPhoto" type="checkbox" checked={settings.autoPhoto} onChange={event=>onSettings({...settings,autoPhoto:event.target.checked})}/><span className="switch"/></label>
    <p className="note">{t('photoHelp')}</p>
    {settings.photoCount===3&&<p className="note">{t('photoBoothHelp')}</p>}
    {state.photoShot!==null&&<p role="status">{t('photoBoothProgress')} {state.photoShot} / 3</p>}
    {state.photoCountdown!==null&&<p role="status">{t('photoCountdown')} {state.photoCountdown}</p>}
    {settings.autoPhoto&&state.photoLocked&&state.photoShot===null&&<p className="note" role="status">{t('photoRelease')}</p>}
    <button id="photoCapture" className="secondary" disabled={state.phase!=='live'||photo.busy||photo.sharing||state.photoCountdown!==null||state.photoShot!==null} onClick={onCapture}>{t('photoCapture')}</button>
    </>}
    {photo.busy&&<p className="note" role="status">{t('photoPreparing')}</p>}
    {photo.result&&<div className="photo-result"><img id="photoPreview" className="photo-preview" src={photo.result.url} alt={t('photoPreview')}/>
      <p className="note" role="status">{t('photoReady')}</p>
      <div className="media-actions"><a id="photoDownload" className="secondary" href={photo.result.url} download={photo.result.file.name}>{t('photoDownload')}</a>
      {photo.canShare&&<button id="photoShare" className="secondary" disabled={photo.sharing||photo.busy} onClick={()=>void photo.share()}>{t('recordShare')}</button>}</div>
      <p className="note">{t('photoSaveHelp')}</p></div>}
    {photo.error&&<p className="status error" role="alert">{t(photo.error)}</p>}
  </section>;
}
