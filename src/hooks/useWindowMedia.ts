import { useCallback, useEffect, useRef, useState } from 'react';
import type { WindowMedia } from '../types';
import type { TranslationKey } from '../i18n';

function release(media: WindowMedia | null): void {
  if (!media) return;
  if (media.element instanceof HTMLVideoElement) { media.element.pause(); media.element.removeAttribute('src'); media.element.load(); }
  else media.element.src = '';
  URL.revokeObjectURL(media.url);
}

export function useWindowMedia(live: boolean) {
  const [media,setMedia]=useState<WindowMedia|null>(null);
  const [loading,setLoading]=useState(false), [error,setError]=useState<TranslationKey|null>(null);
  const [playing,setPlaying]=useState(true);
  const active=useRef<WindowMedia|null>(null), pending=useRef<AbortController|null>(null);
  const clear=useCallback(()=>{
    pending.current?.abort();pending.current=null;release(active.current);active.current=null;
    setMedia(null);setLoading(false);setError(null);setPlaying(true);
  },[]);
  useEffect(()=>()=>{pending.current?.abort();release(active.current);active.current=null;},[]);
  const select=useCallback(async(file:File)=>{
    pending.current?.abort();pending.current=null;
    const kind=file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':null;
    if(!kind){setLoading(false);setError('mediaUnsupported');return;}
    const controller=new AbortController();pending.current=controller;
    setLoading(true);setError(null);
    const url=URL.createObjectURL(file);
    const element=kind==='image'?new Image():document.createElement('video');
    const resource:WindowMedia={kind,element,url,name:file.name,width:0,height:0};
    if(element instanceof HTMLVideoElement){element.muted=true;element.loop=true;element.playsInline=true;element.preload='auto';}
    try {
      await new Promise<void>((resolve,reject)=>{
        const event=kind==='image'?'load':'loadeddata';
        const cleanup=()=>{element.removeEventListener(event,ready);element.removeEventListener('error',fail);controller.signal.removeEventListener('abort',abort);};
        const ready=()=>{cleanup();resolve();},fail=()=>{cleanup();reject(new Error('mediaLoadError'));},abort=()=>{cleanup();reject(new DOMException('Cancelled','AbortError'));};
        element.addEventListener(event,ready,{once:true});element.addEventListener('error',fail,{once:true});controller.signal.addEventListener('abort',abort,{once:true});
        element.src=url;
      });
      if(controller.signal.aborted) {release(resource);return;}
      resource.width=element instanceof HTMLVideoElement?element.videoWidth:element.naturalWidth;
      resource.height=element instanceof HTMLVideoElement?element.videoHeight:element.naturalHeight;
      if(!resource.width||!resource.height)throw Error('mediaLoadError');
      release(active.current);active.current=resource;setMedia(resource);setPlaying(true);
    }catch{release(resource);if(!controller.signal.aborted)setError('mediaLoadError');}
    finally{if(pending.current===controller){pending.current=null;setLoading(false);}}
  },[]);
  useEffect(()=>{
    if(!(media?.element instanceof HTMLVideoElement))return;
    const video=media.element;let cancelled=false;
    if(live&&playing) void video.play().catch(()=>{if(!cancelled){setPlaying(false);setError('mediaPlayError');}});
    else video.pause();
    return ()=>{cancelled=true;video.pause();};
  },[media,live,playing]);
  const toggle=()=>{setError(null);setPlaying(p=>!p);};
  return {media,loading,error,playing,select,clear,toggle};
}
