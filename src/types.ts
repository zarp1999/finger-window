import type { TranslationKey } from './i18n';
export const EFFECTS = ['thermal','mono','negative','mosaic','neon','rgb','kaleidoscope','ripple','trail','sprite','fatpixel','bootleg','mixed','phosphor','raster','stipple','xerox','softclub'] as const;
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
export interface Settings { effect: Effect; mirror: boolean; showSkeleton: boolean; flowers: boolean; autoPhoto: boolean; photoCount:1|3; effectScope: EffectScope }
export interface CameraState {
  phase: 'idle' | 'loading' | 'live' | 'error';
  hands: number;
  fps: number;
  flowerCount: number;
  photoCountdown: number | null;
  photoLocked: boolean;
  photoShot: number | null;
  message: TranslationKey;
  hint: TranslationKey;
}
export const DEFAULT_SETTINGS: Settings = { effect: 'thermal', mirror: true, showSkeleton: true, flowers: false, autoPhoto: true, photoCount:1, effectScope:'window' };
export const INITIAL_STATE: CameraState = {
  phase: 'idle', hands: 0, fps: 0, flowerCount: 0, photoCountdown: null, photoLocked: false, photoShot:null,
  message: 'ready', hint: 'initialHint',
};
