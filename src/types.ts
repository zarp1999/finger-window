export type Effect = 'thermal' | 'mono' | 'negative';
export interface Point { x: number; y: number }
export interface Landmark extends Point { z: number }
export type Hand = Landmark[];
export interface Settings { effect: Effect; mirror: boolean; showSkeleton: boolean }
export interface CameraState {
  phase: 'idle' | 'loading' | 'live' | 'error';
  hands: number;
  fps: number;
  message: string;
  hint: string;
}
export const DEFAULT_SETTINGS: Settings = { effect: 'thermal', mirror: true, showSkeleton: true };
export const INITIAL_STATE: CameraState = {
  phase: 'idle', hands: 0, fps: 0,
  message: '準備できています', hint: 'カメラを開始して、両手を映してください',
};
