import { convexHull, polygonArea, thermalColor } from './geometry.mjs';

const $ = id => document.getElementById(id);
const video = $('video'), canvas = $('output'), ctx = canvas.getContext('2d');
const effectCanvas = document.createElement('canvas');
const fallbackCanvas = document.createElement('canvas');
const fallback = fallbackCanvas.getContext('2d', { willReadFrequently: true });
const connections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
let tracker, stream, frameId, running = false, generation = 0, lastVideo = -1, lastDetect = 0;
let hands = [], polygon = [], effect = 'thermal', mirror = true, showSkeleton = true;
let gl, program, texture, modeUniform, fpsFrames = 0, fpsTime = 0, count = 0;
let lastStatus = '';

function status(text, error = false) {
  if (lastStatus !== text) { $('status').textContent = text; lastStatus = text; }
  $('status').classList.toggle('error', error);
}

function initRenderer() {
  gl = effectCanvas.getContext('webgl', { alpha: false, preserveDrawingBuffer: true });
  if (!gl) return;
  const shader = (type, source) => {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  try {
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 position; varying vec2 uv; void main(){uv=(position+1.0)*0.5;gl_Position=vec4(position,0.,1.);}'));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `precision mediump float;
      varying vec2 uv; uniform sampler2D image; uniform int mode;
      void main(){vec3 c=texture2D(image,uv).rgb;float l=dot(c,vec3(.299,.587,.114));vec3 result;
      if(mode==1){result=vec3(l);}else if(mode==2){result=1.0-c;}else{
        float t=clamp(l*1.35,0.0,1.0);
        if(t<.25)result=mix(vec3(.06,.02,.28),vec3(.05,.25,1.),t*4.);
        else if(t<.5)result=mix(vec3(.05,.25,1.),vec3(.05,1.,.55),(t-.25)*4.);
        else if(t<.75)result=mix(vec3(.05,1.,.55),vec3(1.,.95,.05),(t-.5)*4.);
        else result=mix(vec3(1.,.95,.05),vec3(1.,.02,.25),(t-.75)*4.);
      }gl_FragColor=vec4(result,1.);}`));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader link failed');
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.uniform1i(gl.getUniformLocation(program, 'image'), 0);
    modeUniform = gl.getUniformLocation(program, 'mode');
  } catch { gl = null; }
}
initRenderer();

function transformedDraw(source) {
  ctx.save();
  if (mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function filteredVideo() {
  if (gl && !gl.isContextLost()) {
    gl.viewport(0, 0, effectCanvas.width, effectCanvas.height);
    gl.useProgram(program); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    gl.uniform1i(modeUniform, effect === 'thermal' ? 0 : effect === 'mono' ? 1 : 2);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return effectCanvas;
  }
  fallback.drawImage(video, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
  const image = fallback.getImageData(0, 0, fallbackCanvas.width, fallbackCanvas.height);
  for (let i = 0; i < image.data.length; i += 4) {
    const d = image.data, l = .299*d[i] + .587*d[i+1] + .114*d[i+2];
    const rgb = effect === 'thermal' ? thermalColor(l/255) : effect === 'mono' ? [l,l,l] : [255-d[i],255-d[i+1],255-d[i+2]];
    d[i] = rgb[0]; d[i+1] = rgb[1]; d[i+2] = rgb[2];
  }
  fallback.putImageData(image, 0, 0); return fallbackCanvas;
}

function screen(point) { return { x: (mirror ? 1-point.x : point.x)*canvas.width, y: point.y*canvas.height }; }
function path(points) {
  ctx.beginPath(); points.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y)); ctx.closePath();
}
function updateHands(result) {
  // Sorting by wrist position prevents changes in detector result order from swapping hands.
  const next = result.landmarks.slice().sort((a,b) => a[0].x-b[0].x);
  hands = next.map((hand,i) => hand.map((point,j) => {
    const prev = hands.length === next.length ? hands[i]?.[j] : undefined;
    if (!prev || Math.abs(prev.x-point.x)+Math.abs(prev.y-point.y) > .25) return point;
    return { ...point, x: prev.x*.35+point.x*.65, y: prev.y*.35+point.y*.65 };
  }));
  count = hands.length;
  $('handsStatus').textContent = `${count} / 2`;
  if (count === 2) {
    polygon = convexHull(hands.flatMap(h => [screen(h[4]),screen(h[8])]));
    if (polygon.length < 3 || polygonArea(polygon) < canvas.width*canvas.height*.002) polygon = [];
    status(polygon.length ? '追跡中 · 指先で窓を動かせます' : '親指と人差し指をもう少し開いてください');
    $('hint').textContent = polygon.length ? '両手の指先に窓が追従しています' : '指を開いて、窓を広げてください';
  } else {
    polygon = [];
    status(count ? '片手を検出 · もう片方の手も映してください' : '手を探しています · 手全体を明るく映してください');
    $('hint').textContent = count ? 'もう片方の手を映してください' : '両手の親指と人差し指を開いてください';
  }
}

function render(time) {
  if (!running) return;
  try {
    if (video.readyState >= 2) {
      if (video.currentTime !== lastVideo && time-lastDetect >= 33) {
        lastVideo = video.currentTime; lastDetect = time;
        updateHands(tracker.detectForVideo(video, time));
      }
      ctx.clearRect(0,0,canvas.width,canvas.height);
      transformedDraw(video);
      if (polygon.length) {
        ctx.save(); path(polygon); ctx.clip(); transformedDraw(filteredVideo()); ctx.restore();
        path(polygon); ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
        polygon.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();});
      }
      if (showSkeleton) hands.forEach(hand => {
        ctx.strokeStyle='#80ff91';ctx.lineWidth=1.7;
        connections.forEach(([a,b])=>{const p=screen(hand[a]),q=screen(hand[b]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();});
        hand.forEach((point,i)=>{const p=screen(point);ctx.beginPath();ctx.arc(p.x,p.y,[4,8].includes(i)?4:2.7,0,Math.PI*2);ctx.fillStyle='#ff585f';ctx.fill();});
      });
      fpsFrames++;
      if(time-fpsTime>1000){$('fps').textContent=`${Math.round(fpsFrames*1000/(time-fpsTime))} FPS`;fpsFrames=0;fpsTime=time;}
    }
    frameId=requestAnimationFrame(render);
  } catch(error) { console.error(error); stopCamera(); status('追跡処理が止まりました。カメラを再開してください。',true); }
}

async function loadTracker() {
  if (tracker) return tracker;
  const { FilesetResolver, HandLandmarker } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs');
  const files = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm');
  const options = { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' }, runningMode:'VIDEO', numHands:2, minHandDetectionConfidence:.5, minHandPresenceConfidence:.5, minTrackingConfidence:.5 };
  try { tracker = await HandLandmarker.createFromOptions(files,options); }
  catch { options.baseOptions.delegate='CPU'; tracker = await HandLandmarker.createFromOptions(files,options); }
  return tracker;
}

async function startCamera() {
  if (running || $('start').disabled) return;
  const request = ++generation;
  $('start').disabled=true; $('start').textContent='準備しています…'; $('stop').disabled=false;
  status('カメラへのアクセスを許可してください');
  let acquired;
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(),{name:'InsecureContext'});
    acquired = await navigator.mediaDevices.getUserMedia({video:{width:{ideal:960},height:{ideal:540},facingMode:'user',frameRate:{ideal:30,max:30}},audio:false});
    if (request!==generation) { acquired.getTracks().forEach(t=>t.stop());return; }
    stream=acquired; video.srcObject=stream;
    await video.play();
    status('手の追跡を読み込んでいます · 初回は少し時間がかかります');
    await loadTracker();
    if (request!==generation) return;
    canvas.width=Math.min(video.videoWidth,1280);
    canvas.height=Math.round(canvas.width*video.videoHeight/video.videoWidth);
    effectCanvas.width=canvas.width;effectCanvas.height=canvas.height;
    fallbackCanvas.width=Math.min(480,canvas.width); fallbackCanvas.height=Math.round(fallbackCanvas.width*canvas.height/canvas.width);
    running=true;lastVideo=-1;lastDetect=0;hands=[];polygon=[];
    fpsFrames=0;fpsTime=performance.now();
    $('welcome').hidden=true;document.body.classList.add('live');
    $('modeLabel').textContent='LIVE / HAND TRACKING';$('cameraStatus').textContent='使用中';
    status('両手をカメラに映してください');
    stream.getVideoTracks()[0].addEventListener('ended',()=>{if(running){stopCamera();status('カメラが切断されました。再接続して開始してください。',true);}});
    frameId=requestAnimationFrame(render);
  } catch(error) {
    if(request!==generation)return;
    console.error(error); stopCamera();
    const messages={NotAllowedError:'カメラが許可されていません。ブラウザのサイト設定でカメラを許可し、再試行してください。',NotFoundError:'カメラが見つかりません。Webカメラを接続してください。',NotReadableError:'カメラを使用できません。他のカメラアプリを閉じて再試行してください。',InsecureContext:'カメラを使うにはHTTPSまたはlocalhostで開いてください。'};
    status(messages[error.name]||'読み込みに失敗しました。ネット接続を確認して、もう一度お試しください。',true);
    $('start').textContent='もう一度試す';
  } finally { if(request===generation)$('start').disabled=false; }
}

function stopCamera() {
  generation++;running=false;cancelAnimationFrame(frameId);
  stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;
  hands=[];polygon=[];count=0;ctx.clearRect(0,0,canvas.width,canvas.height);
  $('welcome').hidden=false;document.body.classList.remove('live');
  $('start').disabled=false;$('start').textContent='カメラを開始';$('stop').disabled=true;
  $('cameraStatus').textContent='停止中';$('handsStatus').textContent='0 / 2';$('fps').textContent='— FPS';
  $('modeLabel').textContent='CAMERA STANDBY';$('hint').textContent='カメラを開始して、両手を映してください';
  status('カメラを停止しました');
}

function selectEffect(value) {
  if(!['thermal','mono','negative'].includes(value))throw new Error('Unknown effect');
  effect=value;
  document.querySelectorAll('.effect').forEach(b=>{const active=b.dataset.effect===effect;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
$('start').addEventListener('click',startCamera);
$('stop').addEventListener('click',stopCamera);
document.querySelectorAll('.effect').forEach(b=>b.addEventListener('click',()=>selectEffect(b.dataset.effect)));
$('skeleton').addEventListener('change',e=>showSkeleton=e.target.checked);
$('mirror').addEventListener('change',e=>{mirror=e.target.checked;polygon=[];lastVideo=-1;});
window.addEventListener('pagehide',stopCamera);

// Expose the same controls when the browser supports WebMCP. Camera permission stays on the visible button.
const toolLifetime=new AbortController();
for (const tool of [
  {name:'get_tracking_status',description:'Read camera and detected-hand status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({camera:running?'active':'stopped',hands:count,effect})},
  {name:'set_window_effect',description:'Change the effect inside the finger window.',inputSchema:{type:'object',properties:{effect:{type:'string',enum:['thermal','mono','negative']}},required:['effect'],additionalProperties:false},execute:input=>{selectEffect(input?.effect);return{effect};}},
  {name:'stop_camera',description:'Stop camera capture and return to the start screen.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>{stopCamera();return{camera:'stopped'};}}
]) {
  try {const context=document.modelContext??navigator.modelContext;if(context?.registerTool)Promise.resolve(context.registerTool(tool,{signal:toolLifetime.signal})).catch(()=>{});}catch{}
}
window.addEventListener('pagehide',()=>toolLifetime.abort());
