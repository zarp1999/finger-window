import type { TranslationKey } from '../i18n';
/** Owns camera tracks. Late permission responses are released after cancellation. */
export class CameraSource {
  private stream: MediaStream | null = null;
  private generation = 0;
  constructor(private video: HTMLVideoElement) {}

  async start(onEnded: () => void): Promise<boolean> {
    const request = ++this.generation;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error('Secure context required'), { name: 'InsecureContext' });
    }
    const acquired = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: 'user', frameRate: { ideal: 30, max: 30 } }, audio: false,
    });
    if (request !== this.generation) { acquired.getTracks().forEach(track => track.stop()); return false; }
    this.stream = acquired;
    acquired.getVideoTracks()[0]?.addEventListener('ended', onEnded, { once: true });
    this.video.srcObject = acquired;
    await this.video.play();
    return request === this.generation;
  }
  stop(): void {
    this.generation++;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    this.video.pause(); this.video.srcObject = null;
  }
}

export function cameraErrorMessage(error: unknown): TranslationKey {
  const name = error instanceof Error ? error.name : '';
  const messages: Record<string, TranslationKey> = {
    NotAllowedError: 'denied',
    NotFoundError: 'notFound',
    NotReadableError: 'notReadable',
    InsecureContext: 'insecure',
  };
  return messages[name] ?? 'loadError';
}
