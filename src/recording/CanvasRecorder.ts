import type { TranslationKey } from '../i18n';

export interface RecordingState {
  phase: 'idle' | 'recording' | 'stopping' | 'ready';
  seconds: number; url: string | null; file: File | null; message: TranslationKey | null;
}
export const EMPTY_RECORDING: RecordingState = {phase:'idle',seconds:0,url:null,file:null,message:null};
export function recordingSupported(): boolean {
  return typeof MediaRecorder!=='undefined' && typeof HTMLCanvasElement.prototype.captureStream==='function';
}

/** Owns only recording tracks. Camera tracks remain owned by CameraSession. */
export class CanvasRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private bytes = 0;
  private timer = 0;
  private started = 0;
  private state = EMPTY_RECORDING;
  private disposed = false;
  private audio: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private video: HTMLVideoElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private nodes = new WeakMap<HTMLVideoElement,MediaElementAudioSourceNode>();
  constructor(private change:(state:RecordingState)=>void) {}
  private publish(patch:Partial<RecordingState>):void {
    this.state={...this.state,...patch};if(!this.disposed)this.change(this.state);
  }
  private volume = ():void => { if(this.gain&&this.video)this.gain.gain.value=this.video.muted?0:this.video.volume; };
  setVideo(video: HTMLVideoElement | null):void {
    if(this.video===video)return;
    this.video?.removeEventListener('volumechange',this.volume);
    this.source?.disconnect();this.gain?.disconnect();this.source=null;this.gain=null;this.video=video;
    if(video&&this.audio&&this.destination){
      try{
        this.source=this.nodes.get(video)??this.audio.createMediaElementSource(video);this.nodes.set(video,this.source);
        this.gain=this.audio.createGain();this.volume();
        this.source.connect(this.gain);this.gain.connect(this.audio.destination);this.gain.connect(this.destination);
        video.addEventListener('volumechange',this.volume);
      }catch{this.publish({message:'recordAudioUnavailable'});}
    }
  }
  private initializeAudio():MediaStreamTrack[] {
    try{
      if(!this.audio){
        this.audio=new AudioContext();this.destination=this.audio.createMediaStreamDestination();
        const video=this.video;this.video=null;this.setVideo(video);
      }
      void this.audio.resume().catch(()=>{this.publish({message:'recordAudioUnavailable'});});
      return this.destination!.stream.getAudioTracks().map(track=>track.clone());
    }catch{this.publish({message:'recordAudioUnavailable'});return [];}
  }
  start(canvas:HTMLCanvasElement):void {
    if(this.disposed||this.recorder)return;
    if(!recordingSupported()){this.publish({message:'recordUnsupported'});return;}
    this.publish({message:null});
    try{
      this.stream=canvas.captureStream(30);
      this.initializeAudio().forEach(track=>this.stream!.addTrack(track));
      const types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
      let recorder:MediaRecorder|null=null;
      for(const mimeType of [...types.filter(type=>MediaRecorder.isTypeSupported(type)),'']){
        try{recorder=new MediaRecorder(this.stream,{...(mimeType?{mimeType}:{}),videoBitsPerSecond:2500000});break;}catch{/* Try another supported encoder. */}
      }
      if(!recorder)throw Error('encoder');
      this.recorder=recorder;this.chunks=[];this.bytes=0;
      recorder.ondataavailable=event=>{
        if(event.data.size){this.chunks.push(event.data);this.bytes+=event.data.size;}
        if(this.bytes>=80*1024*1024){this.publish({message:'recordLimit'});this.stop();}
      };
      recorder.onerror=()=>{this.publish({message:'recordFailed'});this.stop();};
      recorder.onstop=()=>this.finish(recorder);
      recorder.start(1000);
      if(this.state.url)URL.revokeObjectURL(this.state.url);
      this.started=performance.now();this.publish({phase:'recording',seconds:0,url:null,file:null});
      this.timer=window.setInterval(()=>{
        const seconds=Math.floor((performance.now()-this.started)/1000);this.publish({seconds});
        if(seconds>=180){this.publish({message:'recordLimit'});this.stop();}
      },500);
    }catch{
      this.recorder=null;this.cleanupTracks();this.publish({phase:this.state.file?'ready':'idle',message:'recordFailed'});
    }
  }
  stop():void {
    if(!this.recorder||this.state.phase==='stopping')return;
    clearInterval(this.timer);this.publish({phase:'stopping'});
    if(this.recorder.state!=='inactive')this.recorder.stop();
  }
  private finish(recorder:MediaRecorder):void {
    clearInterval(this.timer);this.recorder=null;this.cleanupTracks();
    if(this.disposed){this.chunks=[];return;}
    const type=recorder.mimeType||this.chunks[0]?.type||'video/webm';
    const blob=new Blob(this.chunks,{type});this.chunks=[];
    if(!blob.size){this.publish({phase:'idle',message:'recordFailed'});return;}
    const extension=type.includes('mp4')?'mp4':'webm';
    const name=`finger-window-${new Date().toISOString().replace(/[:.]/g,'-')}.${extension}`;
    const file=new File([blob],name,{type});
    this.publish({phase:'ready',file,url:URL.createObjectURL(file)});
  }
  private cleanupTracks():void {this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;}
  dispose():void {
    this.disposed=true;clearInterval(this.timer);
    if(this.recorder?.state!=='inactive')this.recorder?.stop();this.cleanupTracks();
    this.video?.removeEventListener('volumechange',this.volume);this.source?.disconnect();this.gain?.disconnect();
    if(this.state.url)URL.revokeObjectURL(this.state.url);
    this.destination?.stream.getTracks().forEach(track=>track.stop());void this.audio?.close().catch(()=>{});
  }
}
