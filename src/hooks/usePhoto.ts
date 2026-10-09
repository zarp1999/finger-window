import { useCallback,useEffect,useRef,useState } from 'react';
import type { TranslationKey } from '../i18n';

export function usePhoto() {
  const [result,setResult]=useState<{file:File;url:string}|null>(null);
  const [busy,setBusy]=useState(false),[sharing,setSharing]=useState(false);
  const [error,setError]=useState<TranslationKey|null>(null);
  const saved=useRef<{file:File;url:string}|null>(null),request=useRef(0),mounted=useRef(false),working=useRef(false);
  useEffect(()=>{
    mounted.current=true;
    return ()=>{mounted.current=false;request.current++;if(saved.current)URL.revokeObjectURL(saved.current.url);saved.current=null;};
  },[]);
  const capture=useCallback((canvas:HTMLCanvasElement)=>{
    if(!mounted.current||working.current)return;
    working.current=true;const generation=++request.current;setBusy(true);setError(null);
    try{
      // Copy this exact rendered frame before asynchronous image encoding.
      const frame=document.createElement('canvas');frame.width=canvas.width;frame.height=canvas.height;
      const context=frame.getContext('2d');if(!context)throw Error('canvas');context.drawImage(canvas,0,0);
      frame.toBlob(blob=>{
        working.current=false;
        if(!mounted.current||generation!==request.current)return;
        setBusy(false);if(!blob){setError('photoFailed');return;}
        const file=new File([blob],`finger-window-photo-${new Date().toISOString().replace(/[:.]/g,'-')}.jpg`,{type:blob.type});
        const next={file,url:URL.createObjectURL(file)};
        if(saved.current)URL.revokeObjectURL(saved.current.url);saved.current=next;setResult(next);
      },'image/jpeg',.94);
    }catch{working.current=false;setBusy(false);setError('photoFailed');}
  },[]);
  const canShare=(()=>{try{return !!result&&typeof navigator.canShare==='function'&&navigator.canShare({files:[result.file]});}catch{return false;}})();
  const share=async()=>{
    if(!result||!canShare)return;setSharing(true);setError(null);
    try{await navigator.share({files:[result.file]});}
    catch(reason){if(!(reason instanceof DOMException&&reason.name==='AbortError'))setError('photoShareFailed');}
    finally{if(mounted.current)setSharing(false);}
  };
  return {result,busy,error,capture,canShare,share,sharing};
}
