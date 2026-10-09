import type { TranslationKey } from './i18n';
export const EFFECTS = ['thermal','mono','negative','mosaic','neon','rgb','kaleidoscope','ripple','trail'] as const;
export type Effect = typeof EFFECTS[number];
export function isEffect(value: unknown): value is Effect { return EFFECTS.some(effect => effect === value); }
export interface Point { x: number; y: number }
export interface Landmark extends Point { z: number }
export type Hand = Landmark[] & { side?: 'Left' | 'Right'; confidence?: number };
export interface WindowMedia {
  kind: 'image' | 'video'; element: HTMLImageElement | HTMLVideoElement;
  url: string; name: string; width: number; height: number;
}
export interface Settings { effect: Effect; mirror: boolean; showSkeleton: boolean; flowers: boolean }
export interface CameraState {
  phase: 'idle' | 'loading' | 'live' | 'error';
  hands: number;
  fps: number;
  strength: number;
  flowerCount: number;
  message: TranslationKey;
  hint: TranslationKey;
}
export const DEFAULT_SETTINGS: Settings = { effect: 'thermal', mirror: true, showSkeleton: true, flowers: false };
export const INITIAL_STATE: CameraState = {
  phase: 'idle', hands: 0, fps: 0, strength: .7, flowerCount: 0,
  message: 'ready', hint: 'initialHint',
};
