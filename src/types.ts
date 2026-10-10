import type { TranslationKey } from './i18n';
export const EFFECTS = ['none','thermal','mono','negative','mosaic','rgb','ripple','trail','sprite','raster','stipple','blob'] as const;
export type Effect = typeof EFFECTS[number];
export function isEffect(value: unknown): value is Effect { return EFFECTS.some(effect => effect === value); }
export interface Point { x: number; y: number }
export interface Landmark extends Point { z: number }
export type Hand = Landmark[] & { side?: 'Left' | 'Right'; confidence?: number };
export interface WindowMedia {
  kind: 'image' | 'video'; element: HTMLImageElement | HTMLVideoElement;
  url: string; name: string; width: number; height: number;
}
export type EffectScope = 'window' | 'full';
export interface Settings { effect: Effect; mirror: boolean; flowers: boolean; pen:boolean; penColor:string; penSize:number; autoPhoto: boolean; photoCount:1|3; effectScope: EffectScope }
export interface CameraState {
  phase: 'idle' | 'loading' | 'live' | 'error';
  hands: number;
  fps: number;
  flowerCount: number;
  flowerPaused:boolean;
  penCount:number;
  penPaused:boolean;
  photoCountdown: number | null;
  photoLocked: boolean;
  photoShot: number | null;
  photoFlash:number;
  message: TranslationKey;
  hint: TranslationKey;
}
export const DEFAULT_SETTINGS: Settings = { effect: 'thermal', mirror: true, flowers: false, pen:false,penColor:'#ffda73',penSize:5,autoPhoto: true, photoCount:1, effectScope:'window' };
export const INITIAL_STATE: CameraState = {
  phase: 'idle', hands: 0, fps: 0, flowerCount: 0, flowerPaused:false,penCount:0,penPaused:false, photoCountdown: null, photoLocked: false, photoShot:null,photoFlash:0,
  message: 'ready', hint: 'initialHint',
};
