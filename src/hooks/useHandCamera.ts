import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraSession } from '../camera/CameraSession';
import { INITIAL_STATE } from '../types';
import type { Settings, Effect, WindowMedia } from '../types';

export function useHandCamera(settings: Settings, onEffect: (effect: Effect) => void) {
  const videoRef = useRef<HTMLVideoElement>(null), canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<CameraSession | null>(null);
  const settingsRef = useRef(settings);
  const effectRef = useRef(onEffect); effectRef.current = onEffect;
  const [state, setState] = useState(INITIAL_STATE);
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const session = new CameraSession(videoRef.current, canvasRef.current, setState, effect => effectRef.current(effect));
    sessionRef.current = session; session.setSettings(settingsRef.current);
    const stop = () => session.stop(); window.addEventListener('pagehide', stop);
    return () => { window.removeEventListener('pagehide',stop); session.dispose(); sessionRef.current = null; };
  }, []);
  useEffect(() => { settingsRef.current = settings; sessionRef.current?.setSettings(settings); }, [settings]);
  const start = useCallback(() => { void sessionRef.current?.start(); }, []);
  const stop = useCallback(() => sessionRef.current?.stop(), []);
  const setMedia = useCallback((media: WindowMedia | null) => sessionRef.current?.setMedia(media), []);
  const clearFlowers = useCallback(()=>sessionRef.current?.clearFlowers(),[]);
  return { videoRef, canvasRef, state, start, stop, setMedia, clearFlowers };
}
