export function convexHull(points) {
  const p=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y);
  if(p.length<3)return p;
  const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
  const lower=[],upper=[];
  for(const point of p){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),point)<=0)lower.pop();lower.push(point);}
  for(const point of p.slice().reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),point)<=0)upper.pop();upper.push(point);}
  return lower.slice(0,-1).concat(upper.slice(0,-1));
}
export function polygonArea(points){return Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0))/2;}
export function thermalColor(luminance){
  const stops=[[.06,.02,.28],[.05,.25,1],[.05,1,.55],[1,.95,.05],[1,.02,.25]];
  const t=Math.max(0,Math.min(1,luminance*1.35))*4,i=Math.min(3,Math.floor(t)),f=t-i;
  return stops[i].map((v,c)=>Math.round((v+(stops[i+1][c]-v)*f)*255));
}
