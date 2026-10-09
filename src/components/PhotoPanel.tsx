import type { TranslationKey } from '../i18n';
import type { CameraState,Settings } from '../types';
import type { usePhoto } from '../hooks/usePhoto';

export function PhotoPanel({photo,state,settings,onSettings,onCapture,t}:{photo:ReturnType<typeof usePhoto>;state:CameraState;settings:Settings;onSettings:(settings:Settings)=>void;onCapture:()=>void;t:(key:TranslationKey)=>string}) {
  return <section className="photo-control">
    <p className="control-label">{t('photoTitle')}</p>
    <label className="toggle">{t('photoAutomatic')}<input id="autoPhoto" type="checkbox" checked={settings.autoPhoto} onChange={event=>onSettings({...settings,autoPhoto:event.target.checked})}/><span className="switch"/></label>
    <p className="note">{t('photoHelp')}</p>
    {state.photoCountdown!==null&&<p role="status">{t('photoCountdown')} {state.photoCountdown}</p>}
    {settings.autoPhoto&&state.photoLocked&&<p className="note" role="status">{t('photoRelease')}</p>}
    <button id="photoCapture" className="secondary" disabled={state.phase!=='live'||photo.busy||photo.sharing||state.photoCountdown!==null} onClick={onCapture}>{t('photoCapture')}</button>
    {photo.busy&&<p className="note" role="status">{t('photoPreparing')}</p>}
    {photo.result&&<div className="photo-result"><img id="photoPreview" className="photo-preview" src={photo.result.url} alt={t('photoPreview')}/>
      <p className="note" role="status">{t('photoReady')}</p>
      <div className="media-actions"><a id="photoDownload" className="secondary" href={photo.result.url} download={photo.result.file.name}>{t('photoDownload')}</a>
      {photo.canShare&&<button id="photoShare" className="secondary" disabled={photo.sharing||photo.busy} onClick={()=>void photo.share()}>{t('recordShare')}</button>}</div>
      <p className="note">{t('photoSaveHelp')}</p></div>}
    {photo.error&&<p className="status error" role="alert">{t(photo.error)}</p>}
  </section>;
}
