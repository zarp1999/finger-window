import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { WindowMedia } from '../types';
import { CanvasRecorder, EMPTY_RECORDING, recordingSupported } from '../recording/CanvasRecorder';

export function useRecording(canvas:RefObject<HTMLCanvasElement|null>,live:boolean,media:WindowMedia|null) {
  const session=useRef<CanvasRecorder|null>(null);
  const [state,setState]=useState(EMPTY_RECORDING),[sharing,setSharing]=useState(false);
  useEffect(()=>{
    const recorder=new CanvasRecorder(setState);session.current=recorder;
    const hidden=()=>{if(document.hidden)recorder.stop();};
    const stop=()=>recorder.stop();document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',stop);
    return ()=>{document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',stop);recorder.dispose();session.current=null;};
  },[]);
  useEffect(()=>{session.current?.setVideo(media?.element instanceof HTMLVideoElement?media.element:null);},[media]);
  useEffect(()=>{if(!live)session.current?.stop();},[live]);
  const start=useCallback(()=>{if(live&&canvas.current)session.current?.start(canvas.current);},[live,canvas]);
  const stop=useCallback(()=>session.current?.stop(),[]);
  const canShare=!!state.file && typeof navigator.canShare==='function' && navigator.canShare({files:[state.file]});
  const share=async()=>{
    if(!state.file||!canShare)return;
    setSharing(true);setShareError(false);
    try{await navigator.share({files:[state.file]});}
    catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))setShareError(true);}
    finally{setSharing(false);}
  };
  const [shareError,setShareError]=useState(false);
  useEffect(()=>setShareError(false),[state.file]);
  return {state,supported:recordingSupported(),start,stop,canShare,share,sharing,shareError};
}
