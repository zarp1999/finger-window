import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraSession } from '../camera/CameraSession';
import { INITIAL_STATE } from '../types';
import type { Settings, Effect, WindowMedia, EffectScope } from '../types';

export function useHandCamera(settings: Settings, onEffect: (effect: Effect) => void, onPhoto:(canvas:HTMLCanvasElement)=>void, onScope:(scope:EffectScope)=>void) {
  const videoRef = useRef<HTMLVideoElement>(null), canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<CameraSession | null>(null);
  const settingsRef = useRef(settings);
  const effectRef = useRef(onEffect); effectRef.current = onEffect;
  const photoRef = useRef(onPhoto);photoRef.current=onPhoto;
  const scopeRef=useRef(onScope);scopeRef.current=onScope;
  const [state, setState] = useState(INITIAL_STATE);
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const session = new CameraSession(videoRef.current, canvasRef.current, setState, effect => effectRef.current(effect),canvas=>photoRef.current(canvas),scope=>scopeRef.current(scope));
    sessionRef.current = session; session.setSettings(settingsRef.current);
    const stop = () => session.stop(); window.addEventListener('pagehide', stop);
    const hidden=()=>{if(document.hidden)session.cancelPhoto();};document.addEventListener('visibilitychange',hidden);
    return () => { document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',stop); session.dispose(); sessionRef.current = null; };
  }, []);
  useEffect(() => { settingsRef.current = settings; sessionRef.current?.setSettings(settings); }, [settings]);
  const start = useCallback(() => { void sessionRef.current?.start(); }, []);
  const stop = useCallback(() => sessionRef.current?.stop(), []);
  const setMedia = useCallback((media: WindowMedia | null) => sessionRef.current?.setMedia(media), []);
  const clearPen = useCallback(()=>sessionRef.current?.clearPen(),[]);
  const clearFlowers = useCallback(()=>sessionRef.current?.clearFlowers(),[]);
  const capturePhoto = useCallback(()=>sessionRef.current?.capturePhoto(),[]);
  return { videoRef, canvasRef, state, start, stop, setMedia, clearPen, clearFlowers, capturePhoto };
}
