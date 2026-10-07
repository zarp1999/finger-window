import type { CameraState, Effect, Settings } from '../types';

interface Props { settings: Settings; state: CameraState; onSettings: (settings: Settings) => void; onStop: () => void }
const effects: { value: Effect; label: string }[] = [{value:'thermal',label:'サーモ'},{value:'mono',label:'モノクロ'},{value:'negative',label:'反転'}];

export function ControlPanel({ settings, state, onSettings, onStop }: Props) {
  return <aside>
    <div className="panel-title"><span>CONTROLS</span><span>01—03</span></div>
    <section className="control"><p className="control-label"><span>01</span> エフェクト</p>
      <div className="effects" role="group" aria-label="映像エフェクト">{effects.map(({value,label}) =>
        <button key={value} className={`effect${settings.effect===value?' active':''}`} data-effect={value} aria-pressed={settings.effect===value} onClick={() => onSettings({...settings,effect:value})}><span className={`swatch ${value}`} />{label}</button>
      )}</div><p className="note">サーモは色の表現です。温度測定ではありません。</p>
    </section>
    <section className="control"><p className="control-label"><span>02</span> 表示</p>
      <label className="toggle">手の点と線を表示<input id="skeleton" type="checkbox" checked={settings.showSkeleton} onChange={e => onSettings({...settings,showSkeleton:e.target.checked})} /><span className="switch" /></label>
      <label className="toggle">鏡のように左右反転<input id="mirror" type="checkbox" checked={settings.mirror} onChange={e => onSettings({...settings,mirror:e.target.checked})} /><span className="switch" /></label>
    </section>
    <section className="control"><p className="control-label"><span>03</span> 動作状況</p>
      <div className="status-row"><span>カメラ</span><strong id="cameraStatus">{state.phase==='live'?'使用中':state.phase==='loading'?'準備中':'停止中'}</strong></div>
      <div className="status-row"><span>手の検出</span><strong id="handsStatus">{state.hands} / 2</strong></div>
      <p id="status" className={`status${state.phase==='error'?' error':''}`} role="status" aria-live="polite">{state.message}</p>
      <button id="stop" className="secondary" onClick={onStop} disabled={state.phase!=='live'&&state.phase!=='loading'}>カメラを停止</button>
    </section>
    <div className="tips"><span className="tips-label">TRACKING TIP</span><p>明るい場所で、手全体を映します。両手を離し、指先が重ならないようにしてください。</p></div>
  </aside>;
}
