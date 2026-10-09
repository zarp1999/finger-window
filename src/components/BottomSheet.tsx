import { useEffect,useRef } from 'react';
import type { ReactNode } from 'react';

/** Native dialog keeps keyboard focus inside the sheet and restores it on close. */
export function BottomSheet({open,title,closeLabel,onClose,children}:{open:boolean;title:string;closeLabel:string;onClose:()=>void;children:ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const dialog=ref.current;if(!dialog)return;
    if(open&&!dialog.open)dialog.showModal();
    else if(!open&&dialog.open)dialog.close();
  },[open]);
  return <dialog ref={ref} className="bottom-sheet" aria-labelledby="sheetTitle" onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{
    if(event.target!==ref.current)return;
    const rect=event.currentTarget.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose();
  }}>
    <div className="sheet-header"><h2 id="sheetTitle">{title}</h2><button id="closeSheet" onClick={onClose} aria-label={closeLabel}>×</button></div>
    <div className="sheet-content">{children}</div>
  </dialog>;
}
