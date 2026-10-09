import { EFFECTS } from '../types';
import type { ReactNode } from 'react';
import type { CameraState, Settings } from '../types';
import type { TranslationKey } from '../i18n';

interface Props { settings: Settings; state: CameraState; onSettings: (settings: Settings) => void; onStop: () => void; onClearFlowers:()=>void; t: (key: TranslationKey)=>string; mediaPanel: ReactNode }

export function ControlPanel({ settings, state, onSettings, onStop, onClearFlowers, t, mediaPanel }: Props) {
  return <aside>
    <div className="panel-title"><span>{t('controls')}</span><span>01—03</span></div>
    {mediaPanel}
    <section className="flower-control">
      <button id="flowerMode" className={`secondary${settings.flowers?' selected':''}`} aria-pressed={settings.flowers} onClick={()=>onSettings({...settings,flowers:!settings.flowers})}>{t('flowerMode')}</button>
      {settings.flowers&&<><div className="flower-palette" aria-label={t('flowerTypes')}>🌸 🌹 🌻 🌷 🌼 🌺</div><p className="note">{t('flowerHelp')}</p>
      <div className="status-row"><span>{t('flowerCount')}</span><strong id="flowerCount">{state.flowerCount}</strong></div>
      <button id="clearFlowers" className="secondary" onClick={onClearFlowers} disabled={!state.flowerCount}>{t('clearFlowers')}</button></>}
    </section>
    <section className="control"><p className="control-label"><span>01</span> {t('effect')}</p>
      <p className="note">{t('modeGestureHelp')}</p>
      <div className="effects" role="group" aria-label={t('effectGroup')}>{EFFECTS.map(value =>
        <button key={value} className={`effect${settings.effect===value&&!settings.flowers?' active':''}`} data-effect={value} aria-pressed={settings.effect===value&&!settings.flowers} onClick={() => onSettings({...settings,effect:value,flowers:false})}><span className={`swatch ${value}`} />{t(value)}</button>
      )}</div>{!settings.flowers&&<p className="note">{t('gestureHelp')}</p>}
    </section>
    <section className="control"><p className="control-label"><span>02</span> {t('display')}</p>
      <label className="toggle">{t('skeleton')}<input id="skeleton" type="checkbox" checked={settings.showSkeleton} onChange={e => onSettings({...settings,showSkeleton:e.target.checked})} /><span className="switch" /></label>
      <label className="toggle">{t('mirror')}<input id="mirror" type="checkbox" checked={settings.mirror} onChange={e => onSettings({...settings,mirror:e.target.checked})} /><span className="switch" /></label>
    </section>
    <section className="control"><p className="control-label"><span>03</span> {t('state')}</p>
      <div className="status-row"><span>{t('camera')}</span><strong id="cameraStatus">{t(state.phase==='live'?'active':state.phase==='loading'?'preparing':'stopped')}</strong></div>
      <div className="status-row"><span>{t('hands')}</span><strong id="handsStatus">{state.hands} / 2</strong></div>
      <p id="status" className={`status${state.phase==='error'?' error':''}`} role="status" aria-live="polite">{t(state.message)}</p>
      <button id="stop" className="secondary" onClick={onStop} disabled={state.phase!=='live'&&state.phase!=='loading'}>{t('stop')}</button>
    </section>
    <div className="tips"><span className="tips-label">{t('tipLabel')}</span><p>{t('tip')}</p></div>
  </aside>;
}
