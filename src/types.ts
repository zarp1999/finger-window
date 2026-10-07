import type { TranslationKey } from './i18n';
export const EFFECTS = ['thermal','mono','negative','mosaic','neon','rgb','kaleidoscope','ripple','trail'] as const;
export type Effect = typeof EFFECTS[number];
export function isEffect(value: unknown): value is Effect { return EFFECTS.some(effect => effect === value); }
export interface Point { x: number; y: number }
export interface Landmark extends Point { z: number }
export type Hand = Landmark[];
export interface Settings { effect: Effect; mirror: boolean; showSkeleton: boolean }
export interface CameraState {
  phase: 'idle' | 'loading' | 'live' | 'error';
  hands: number;
  fps: number;
  message: TranslationKey;
  hint: TranslationKey;
}
export const DEFAULT_SETTINGS: Settings = { effect: 'thermal', mirror: true, showSkeleton: true };
export const INITIAL_STATE: CameraState = {
  phase: 'idle', hands: 0, fps: 0,
  message: 'ready', hint: 'initialHint',
};
