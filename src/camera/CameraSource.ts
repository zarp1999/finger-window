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

export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  const messages: Record<string, string> = {
    NotAllowedError: 'カメラが許可されていません。ブラウザのサイト設定でカメラを許可し、再試行してください。',
    NotFoundError: 'カメラが見つかりません。Webカメラを接続してください。',
    NotReadableError: 'カメラを使用できません。他のカメラアプリを閉じて再試行してください。',
    InsecureContext: 'カメラを使うにはHTTPSまたはlocalhostで開いてください。',
  };
  return messages[name] ?? '読み込みに失敗しました。ネット接続を確認して、もう一度お試しください。';
}
