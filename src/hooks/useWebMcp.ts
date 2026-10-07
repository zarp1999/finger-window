import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { CameraState, Effect, Settings } from '../types';
import { EFFECTS, isEffect } from '../types';

interface Tool { name: string; description: string; inputSchema: object; annotations?: { readOnlyHint: boolean }; execute: (input: unknown) => unknown }
interface ModelContext { registerTool: (tool: Tool, options: {signal: AbortSignal}) => void | Promise<void> }
interface Props { state: CameraState; settings: Settings; onEffect: (effect: Effect) => void; onStop: () => void }

export function useWebMcp(props: Props) {
  const current = useRef(props);
  useEffect(() => { current.current = props; }, [props]);
  useEffect(() => {
    const context = (document as Document & {modelContext?: ModelContext}).modelContext ?? (navigator as Navigator & {modelContext?: ModelContext}).modelContext;
    if (!context?.registerTool) return;
    const lifetime = new AbortController();
    const empty = {type:'object',properties:{},additionalProperties:false};
    const tools: Tool[] = [
      {name:'get_tracking_status',description:'Read camera and detected-hand status.',inputSchema:empty,annotations:{readOnlyHint:true},execute:() => ({camera:current.current.state.phase==='live'?'active':'stopped',hands:current.current.state.hands,effect:current.current.settings.effect})},
      {name:'set_window_effect',description:'Change the effect inside the finger window.',inputSchema:{type:'object',properties:{effect:{type:'string',enum:[...EFFECTS]}},required:['effect'],additionalProperties:false},execute: input => {
        const effect = (input as {effect?: unknown} | null)?.effect;
        if(!isEffect(effect))throw new Error('Unknown effect');
        flushSync(() => current.current.onEffect(effect));return{effect};
      }},
      {name:'stop_camera',description:'Stop camera capture and return to the start screen.',inputSchema:empty,execute:() => {flushSync(() => current.current.onStop());return{camera:'stopped'};}},
    ];
    for (const tool of tools) { try { void Promise.resolve(context.registerTool(tool,{signal:lifetime.signal})).catch(()=>{}); } catch { /* Optional API unavailable. */ } }
    return () => lifetime.abort();
  }, []);
}
