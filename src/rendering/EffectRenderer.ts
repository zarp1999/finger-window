import type { Effect } from '../types';
import { EFFECTS } from '../types';
import { thermalColor } from '../lib/geometry';
import { vertexShader, fragmentShader } from './shaders';

/** Processes a video frame on the GPU, with a small CPU canvas as fallback. */
export class EffectRenderer {
  private canvas = document.createElement('canvas');
  private fallback = document.createElement('canvas');
  private context = this.fallback.getContext('2d', { willReadFrequently: true })!;
  private gl = this.canvas.getContext('webgl', { alpha: false, preserveDrawingBuffer: true });
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private shaders: WebGLShader[] = [];
  private mode: WebGLUniformLocation | null = null;
  private resolution: WebGLUniformLocation | null = null;
  private time: WebGLUniformLocation | null = null;
  private trail = document.createElement('canvas');
  private trailContext = this.trail.getContext('2d')!;
  private historyReady = false;
  private lastTime = 0;
  private lastEffect: Effect | null = null;

  constructor() {
    const gl = this.gl;
    if (!gl) return;
    try {
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type)!; this.shaders.push(shader);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
        return shader;
      };
      const program = gl.createProgram()!; this.program = program;
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader link failed');
      gl.useProgram(program);
      this.buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      this.texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.uniform1i(gl.getUniformLocation(program, 'image'), 0);
      this.mode = gl.getUniformLocation(program, 'mode');
      this.resolution = gl.getUniformLocation(program, 'resolution');
      this.time = gl.getUniformLocation(program, 'time');
    } catch { this.dispose(); this.gl = null; }
  }
  resize(width: number, height: number): void {
    this.canvas.width = width; this.canvas.height = height;
    this.fallback.width = Math.min(480, width);
    this.fallback.height = Math.round(this.fallback.width*height/width);
    this.trail.width = width; this.trail.height = height; this.reset();
  }
  reset(): void {
    if (this.historyReady) this.trailContext.clearRect(0,0,this.trail.width,this.trail.height);
    this.historyReady = false; this.lastTime = 0; this.lastEffect = null;
  }
  render(video: HTMLVideoElement, effect: Effect): HTMLCanvasElement {
    if (this.lastEffect !== effect) { this.reset(); this.lastEffect = effect; }
    const now = performance.now();
    if (effect === 'trail') {
      const delta = Math.min(100,Math.max(1,now-this.lastTime));
      this.trailContext.globalAlpha = this.historyReady ? 1-Math.exp(-delta/240) : 1;
      this.trailContext.drawImage(video,0,0,this.trail.width,this.trail.height);
      this.trailContext.globalAlpha = 1; this.historyReady = true; this.lastTime = now;
      return this.trail;
    }
    const gl = this.gl;
    if (gl && this.program && !gl.isContextLost()) {
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.useProgram(this.program); gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.uniform1i(this.mode, EFFECTS.indexOf(effect));
      gl.uniform2f(this.resolution,this.canvas.width,this.canvas.height);
      gl.uniform1f(this.time,now/1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return this.canvas;
    }
    this.context.drawImage(video, 0, 0, this.fallback.width, this.fallback.height);
    const image = this.context.getImageData(0, 0, this.fallback.width, this.fallback.height);
    const source = image.data.slice(), w = this.fallback.width, h = this.fallback.height;
    const sample = (x: number,y: number,c: number) => source[(Math.max(0,Math.min(h-1,Math.floor(y)))*w+Math.max(0,Math.min(w-1,Math.floor(x))))*4+c];
    const light = (x: number,y: number) => (.299*sample(x,y,0)+.587*sample(x,y,1)+.114*sample(x,y,2))/255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y*w+x)*4, l = light(x,y)*255;
      let rgb: number[];
      if (effect === 'thermal') rgb = thermalColor(l/255);
      else if (effect === 'mono') rgb = [l,l,l];
      else if (effect === 'negative') rgb = [255-source[i],255-source[i+1],255-source[i+2]];
      else if (effect === 'mosaic') {
        const block = Math.max(2,Math.round(24*w/this.canvas.width));
        rgb = [0,1,2].map(c => sample(Math.floor(x/block)*block+block/2,Math.floor(y/block)*block+block/2,c));
      } else if (effect === 'neon') {
        const dx = light(x+1,y)-light(x-1,y),dy = light(x,y+1)-light(x,y-1);
        const edge = Math.min(1,Math.hypot(dx,dy)*4), t = x/w;
        rgb = [3+edge*(20+235*t),4+edge*(255-230*t),10+edge*216];
      } else if (effect === 'rgb') rgb = [sample(x+w*.015,y+h*.004,0),source[i+1],sample(x-w*.015,y-h*.004,2)];
      else {
        const u = (x+.5)/w, v = (y+.5)/h,px = u-.5,py = v-.5,aspect = w/h;
        let qx: number,qy: number;
        if (effect === 'kaleidoscope') {
          const sector = Math.PI/3,a = Math.abs(((Math.atan2(py,px*aspect)%sector+sector)%sector)-sector/2),r = Math.hypot(px*aspect,py);
          qx = ((Math.cos(a)*r/aspect+.5)*1.8)%1; qy = ((Math.sin(a)*r+.5)*1.8)%1;
        } else {
          const time = now/1000, radius = Math.hypot(px*aspect,py),length = Math.hypot(px+.0001,py+.0001);
          const wave = Math.sin(radius*48-time*3.5)*.017;
          qx = u+(px+.0001)/length*wave+Math.sin(v*24+time*1.7)*.007;
          qy = v+(py+.0001)/length*wave+Math.cos(u*18-time*1.3)*.007;
        }
        rgb = [0,1,2].map(c => sample(qx*w,qy*h,c));
      }
      image.data[i] = rgb[0]; image.data[i+1] = rgb[1]; image.data[i+2] = rgb[2];
    }
    this.context.putImageData(image, 0, 0); return this.fallback;
  }
  dispose(): void {
    this.reset();
    const gl = this.gl;
    if (!gl) return;
    this.shaders.forEach(shader => gl.deleteShader(shader)); this.shaders = [];
    gl.deleteBuffer(this.buffer); gl.deleteTexture(this.texture); gl.deleteProgram(this.program);
    this.program = null;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
