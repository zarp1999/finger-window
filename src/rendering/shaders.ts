export const vertexShader = `attribute vec2 position; varying vec2 uv;
void main(){uv=(position+1.0)*0.5;gl_Position=vec4(position,0.,1.);}`;
export const fragmentShader = `precision mediump float;
varying vec2 uv; uniform sampler2D image; uniform int mode; uniform vec2 resolution; uniform float time; uniform float strength;
float light(vec2 p){return dot(texture2D(image,clamp(p,0.0,1.0)).rgb,vec3(.299,.587,.114));}
float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec3 c=texture2D(image,uv).rgb;float l=dot(c,vec3(.299,.587,.114));vec3 result;
if(mode==1){result=vec3(l);}else if(mode==2){result=1.0-c;}
else if(mode==3){vec2 grid=max(floor(resolution/(3.0+strength*21.0)),vec2(1.));result=texture2D(image,(floor(uv*grid)+.5)/grid).rgb;}
else if(mode==5){vec2 offset=vec2(.015,.004)*strength;result=vec3(texture2D(image,uv+offset).r,c.g,texture2D(image,uv-offset).b);}
else if(mode==7){vec2 p=uv-.5;float radius=length(p*vec2(resolution.x/resolution.y,1.));vec2 q=uv+normalize(p+vec2(.0001))*sin(radius*48.-time*3.5)*.017*strength+vec2(sin(uv.y*24.+time*1.7),cos(uv.x*18.-time*1.3))*.007*strength;result=texture2D(image,clamp(q,0.,1.)).rgb;}
else if(mode==9){
float block=5.;vec2 grid=max(floor(resolution/block),vec2(1.));
vec2 p=uv;
vec2 cell=floor(p*grid);vec3 q=texture2D(image,clamp((cell+.5)/grid,0.,1.)).rgb;
float levels=7.;float d=mod(cell.x+cell.y,2.)<1.?.018:-.018;
result=floor(clamp(q+d,0.,1.)*levels+.5)/levels;
}
else if(mode==12){
vec2 d=2./resolution;float edge=clamp(length(vec2(light(uv+vec2(d.x,0.))-light(uv-vec2(d.x,0.)),light(uv+vec2(0.,d.y))-light(uv-vec2(0.,d.y))))*3.,0.,1.);
vec3 paper=vec3(.94,.89,.8);bool right=uv.x>.54+.025*sin(uv.y*37.);
result=(right?paper*(.3+l*.7):floor(c*4.+.5)/4.*.8+paper*.2)*(1.-edge*.78)+(noise(floor(uv*resolution))-.5)*.06;
if(right&&mod(floor(uv.x*resolution.x),5.)<1.&&mod(floor(uv.y*resolution.y),5.)<1.)result*=.45+l*.55;
}
else if(mode==14){float scan=.73+.27*cos(uv.y*resolution.y*1.5707963);float mask=mod(floor(uv.x*resolution.x),3.);result=c*scan*vec3(mask<1.?1.:.87,mask>=1.&&mask<2.?1.:.87,mask>=2.?1.:.87);}
else if(mode==15){result=noise(floor(uv*resolution))<1.-l?vec3(.11,.15,.31):vec3(1.,.78,.56);}
else if(mode==17){
vec2 d=1.5/resolution;
float soft=l*.6+(light(uv+vec2(d.x,0.))+light(uv-vec2(d.x,0.))+light(uv+vec2(0.,d.y))+light(uv-vec2(0.,d.y)))*.1;
float tone=.09+.83*smoothstep(.035,.97,soft);
float vignette=1.-.24*smoothstep(.18,.70,length(uv-.5));
float grain=(noise(floor(uv*resolution*.65))-.5)*.05;
result=clamp(vec3(tone*vignette+grain)*vec3(1.,.985,.96),0.,1.);
}
else if(mode==16){
float n=noise(floor(uv*resolution));float value=clamp((l-.5)*2.5+.55+(n-.5)*.22,0.,1.);
float offset=mod(floor(uv.y*7.),3.)<1.?6./resolution.x:0.;float q=light(uv+vec2(offset,0.));
float ink=value*.6+clamp((q-.5)*2.5+.55,0.,1.)*.4;result=vec3(.1,.09,.085)+ink*vec3(.84,.82,.77);
}
else{
float t=clamp(l*1.35,0.0,1.0);
if(t<.25)result=mix(vec3(.06,.02,.28),vec3(.05,.25,1.),t*4.);
else if(t<.5)result=mix(vec3(.05,.25,1.),vec3(.05,1.,.55),(t-.25)*4.);
else if(t<.75)result=mix(vec3(.05,1.,.55),vec3(1.,.95,.05),(t-.5)*4.);
else result=mix(vec3(1.,.95,.05),vec3(1.,.02,.25),(t-.75)*4.);
}if(mode==0||mode==1||mode==2){result=mix(c,result,strength);}gl_FragColor=vec4(result,1.);}`;
