import type { TranslationKey } from '../i18n';
import type { useWindowMedia } from '../hooks/useWindowMedia';

interface Props { content: ReturnType<typeof useWindowMedia>; live: boolean; t:(key:TranslationKey)=>string }
export function MediaPanel({content,live,t}:Props) {
  return <section className="media-control">
    <p className="control-label">{t('windowContent')}</p>
    <label className="media-picker">{t('chooseMedia')}<input id="mediaFile" type="file" accept="image/*,video/*" onChange={event=>{const file=event.target.files?.[0];if(file)void content.select(file);event.target.value='';}} /></label>
    {content.loading&&<p className="status" role="status">{t('mediaLoading')}</p>}
    {content.error&&<p className="status error" role="alert">{t(content.error)}</p>}
    {content.media&&<><p className="media-name">{content.media.name}</p><div className="media-actions">
      {content.media.kind==='video'&&<button className="secondary" id="mediaPlay" disabled={!live} onClick={content.toggle}>{t(content.playing&&live?'pauseMedia':'playMedia')}</button>}
      <button className="secondary" id="clearMedia" onClick={content.clear}>{t('cameraEffects')}</button>
    </div><p className="note">{t('mediaGestureNote')}</p></>}
  </section>;
}
