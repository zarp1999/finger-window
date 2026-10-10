import { useEffect,useState } from 'react';
import { translate } from '../i18n';
import type { Language,TranslationKey } from '../i18n';
export function useLanguage() {
  const [language,setLanguage]=useState<Language>(()=>{try{return localStorage.getItem('finger-window-language')==='ja'?'ja':'mn';}catch{return'mn';}});
  useEffect(()=>{
    document.documentElement.lang=language;document.title=translate(language,'title');
    document.querySelector('meta[name="description"]')?.setAttribute('content',translate(language,'description'));
    try{localStorage.setItem('finger-window-language',language);}catch{/* Storage may be disabled. */}
  },[language]);
  return{language,setLanguage,t:(key:TranslationKey)=>translate(language,key)};
}
