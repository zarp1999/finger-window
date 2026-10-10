import type { TranslationKey } from '../i18n';
import type { useRecording } from '../hooks/useRecording';

export function RecordingPanel({recording,live,t,resultOnly=false}:{recording:ReturnType<typeof useRecording>;live:boolean;t:(key:TranslationKey)=>string;resultOnly?:boolean}) {
  const {state}=recording,busy=state.phase==='recording'||state.phase==='stopping';
  const elapsed=`${Math.floor(state.seconds/60).toString().padStart(2,'0')}:${(state.seconds%60).toString().padStart(2,'0')}`;
  return <section className="record-control">

    {!resultOnly&&<p className="note">{t('recordHelp')}</p>}
    {!recording.supported?<p className="status error">{t('recordUnsupported')}</p>:<>
      {!resultOnly&&<div className="media-actions"><button id="recordStart" className="secondary" disabled={!live||busy||recording.sharing} onClick={recording.start}>{t('recordStart')}</button>
      <button id="recordStop" className="secondary" disabled={state.phase!=='recording'} onClick={recording.stop}>{t('recordStop')}</button></div>}
      {busy&&<p className="record-state" role="status">{t(state.phase==='stopping'?'recordFinishing':'recordActive')} {elapsed}</p>}
      {state.url&&state.file&&<div className="record-result">
        <video className="record-preview" src={state.url} controls playsInline preload="metadata" aria-label={t('recordPreview')} />
        <p className="note">{state.file.name.endsWith('.mp4')?'MP4':'WebM'} · {(state.file.size/1024/1024).toFixed(1)} MB</p>
        <div className="media-actions"><a id="recordDownload" className="secondary" href={state.url} download={state.file.name}>{t('recordDownload')}</a>
        {recording.canShare&&<button id="recordShare" className="secondary" disabled={recording.sharing} onClick={()=>void recording.share()}>{t('recordShare')}</button>}</div>

      </div>}
    </>}
    {state.message&&<p className="status" role="status">{t(state.message)}</p>}
    {recording.shareError&&<p className="status error" role="alert">{t('recordShareError')}</p>}
  </section>;
}
