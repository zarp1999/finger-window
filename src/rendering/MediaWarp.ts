import type { Point, WindowMedia } from '../types';

/** Perspective map from a unit square to a convex quad, drawn as a small mesh. */
export function drawMediaWarp(context: CanvasRenderingContext2D, media: WindowMedia, points: Point[]): void {
  if (points.length !== 4) return;
  // Top left, top right, bottom right, bottom left in screen space.
  let start = 0;
  points.forEach((p,i) => { if (p.x+p.y < points[start].x+points[start].y) start = i; });
  const p = Array.from({length:4},(_,i)=>points[(start+i)%4]);
  const [a,b,c,d] = p;
  const dx1=b.x-c.x, dx2=d.x-c.x, dx3=a.x-b.x+c.x-d.x;
  const dy1=b.y-c.y, dy2=d.y-c.y, dy3=a.y-b.y+c.y-d.y;
  const determinant=dx1*dy2-dx2*dy1;
  if (Math.abs(determinant)<.001) return;
  const g=(dx3*dy2-dx2*dy3)/determinant, h=(dx1*dy3-dx3*dy1)/determinant;
  const map=(u:number,v:number):Point => {
    const z=g*u+h*v+1;
    return {x:((b.x-a.x+g*b.x)*u+(d.x-a.x+h*d.x)*v+a.x)/z,
      y:((b.y-a.y+g*b.y)*u+(d.y-a.y+h*d.y)*v+a.y)/z};
  };
  const triangle=(uv:Point[], dest:Point[]) => {
    const [s0,s1,s2]=uv.map(q=>({x:q.x*media.width,y:q.y*media.height}));
    const [t0,t1,t2]=dest;
    const x1=s1.x-s0.x,x2=s2.x-s0.x,y1=s1.y-s0.y,y2=s2.y-s0.y,det=x1*y2-x2*y1;
    const aa=((t1.x-t0.x)*y2-(t2.x-t0.x)*y1)/det;
    const bb=((t1.y-t0.y)*y2-(t2.y-t0.y)*y1)/det;
    const cc=((t2.x-t0.x)*x1-(t1.x-t0.x)*x2)/det;
    const dd=((t2.y-t0.y)*x1-(t1.y-t0.y)*x2)/det;
    context.save();context.beginPath();
    // Expand internal edges slightly to avoid hairline gaps; outer quad clips them.
    const center={x:(t0.x+t1.x+t2.x)/3,y:(t0.y+t1.y+t2.y)/3};
    const edgeDistance=Math.min(...dest.map((q,i)=>{
      const next=dest[(i+1)%3], dx=next.x-q.x,dy=next.y-q.y;
      return Math.abs(dx*(center.y-q.y)-dy*(center.x-q.x))/Math.max(.001,Math.hypot(dx,dy));
    }));
    const expansion=1+.9/Math.max(.01,edgeDistance);
    dest.forEach((q,i)=>{
      const x=center.x+(q.x-center.x)*expansion,y=center.y+(q.y-center.y)*expansion;
      if(i)context.lineTo(x,y);else context.moveTo(x,y);});
    context.closePath();context.clip();
    context.setTransform(aa,bb,cc,dd,t0.x-aa*s0.x-cc*s0.y,t0.y-bb*s0.x-dd*s0.y);
    context.drawImage(media.element,0,0,media.width,media.height);context.restore();
  };
  const divisions=12;
  for(let y=0;y<divisions;y++) for(let x=0;x<divisions;x++) {
    const uv=[{x:x/divisions,y:y/divisions},{x:(x+1)/divisions,y:y/divisions},
      {x:(x+1)/divisions,y:(y+1)/divisions},{x:x/divisions,y:(y+1)/divisions}];
    const dest=uv.map(q=>map(q.x,q.y));
    triangle([uv[0],uv[1],uv[2]],[dest[0],dest[1],dest[2]]);
    triangle([uv[0],uv[2],uv[3]],[dest[0],dest[2],dest[3]]);
  }
}
