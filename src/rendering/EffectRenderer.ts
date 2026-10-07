import type { Effect } from '../types';
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
    } catch { this.dispose(); this.gl = null; }
  }
  resize(width: number, height: number): void {
    this.canvas.width = width; this.canvas.height = height;
    this.fallback.width = Math.min(480, width);
    this.fallback.height = Math.round(this.fallback.width*height/width);
  }
  render(video: HTMLVideoElement, effect: Effect): HTMLCanvasElement {
    const gl = this.gl;
    if (gl && this.program && !gl.isContextLost()) {
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.useProgram(this.program); gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.uniform1i(this.mode, effect === 'thermal' ? 0 : effect === 'mono' ? 1 : 2);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return this.canvas;
    }
    this.context.drawImage(video, 0, 0, this.fallback.width, this.fallback.height);
    const image = this.context.getImageData(0, 0, this.fallback.width, this.fallback.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const d = image.data, l = .299*d[i]+.587*d[i+1]+.114*d[i+2];
      const rgb = effect === 'thermal' ? thermalColor(l/255) : effect === 'mono' ? [l,l,l] : [255-d[i],255-d[i+1],255-d[i+2]];
      d[i] = rgb[0]; d[i+1] = rgb[1]; d[i+2] = rgb[2];
    }
    this.context.putImageData(image, 0, 0); return this.fallback;
  }
  dispose(): void {
    const gl = this.gl;
    if (!gl) return;
    this.shaders.forEach(shader => gl.deleteShader(shader)); this.shaders = [];
    gl.deleteBuffer(this.buffer); gl.deleteTexture(this.texture); gl.deleteProgram(this.program);
    this.program = null;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
