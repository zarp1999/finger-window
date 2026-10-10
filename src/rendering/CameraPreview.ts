/** Center crop shared by the on-screen preview, photos and recording canvas. */
export function drawCameraPreview(source:HTMLCanvasElement,target:HTMLCanvasElement,width:number,height:number):void {
  const scale=Math.min(1.5,1280/Math.max(width,height));
  const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
  if(target.width!==w||target.height!==h){target.width=w;target.height=h;}
  const ratio=w/h,sourceRatio=source.width/source.height;
  const sw=sourceRatio>ratio?source.height*ratio:source.width;
  const sh=sourceRatio>ratio?source.height:source.width/ratio;
  target.getContext('2d')!.drawImage(source,(source.width-sw)/2,(source.height-sh)/2,sw,sh,0,0,w,h);
}
