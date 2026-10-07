export const vertexShader = `attribute vec2 position; varying vec2 uv;
void main(){uv=(position+1.0)*0.5;gl_Position=vec4(position,0.,1.);}`;
export const fragmentShader = `precision mediump float;
varying vec2 uv; uniform sampler2D image; uniform int mode; uniform vec2 resolution; uniform float time;
float light(vec2 p){return dot(texture2D(image,clamp(p,0.0,1.0)).rgb,vec3(.299,.587,.114));}
void main(){vec3 c=texture2D(image,uv).rgb;float l=dot(c,vec3(.299,.587,.114));vec3 result;
if(mode==1){result=vec3(l);}else if(mode==2){result=1.0-c;}
else if(mode==3){vec2 grid=max(floor(resolution/24.0),vec2(1.));result=texture2D(image,(floor(uv*grid)+.5)/grid).rgb;}
else if(mode==4){vec2 d=2.0/resolution;
float gx=light(uv+vec2(d.x,-d.y))+2.0*light(uv+vec2(d.x,0.))+light(uv+d)-light(uv-d)-2.0*light(uv-vec2(d.x,0.))-light(uv+vec2(-d.x,d.y));
float gy=light(uv+vec2(-d.x,d.y))+2.0*light(uv+vec2(0.,d.y))+light(uv+d)-light(uv-d)-2.0*light(uv-vec2(0.,d.y))-light(uv+vec2(d.x,-d.y));
float edge=smoothstep(.08,.85,length(vec2(gx,gy)));result=vec3(.012,.016,.04)+edge*mix(vec3(.08,1.,.85),vec3(1.,.1,.85),uv.x);}
else if(mode==5){vec2 offset=vec2(.015,.004);result=vec3(texture2D(image,uv+offset).r,c.g,texture2D(image,uv-offset).b);}
else if(mode==6){float aspect=resolution.x/resolution.y;vec2 p=(uv-.5)*vec2(aspect,1.);float r=length(p);float a=abs(mod(atan(p.y,p.x),1.04719755)-.52359877);vec2 q=vec2(cos(a),sin(a))*r/vec2(aspect,1.)+.5;result=texture2D(image,fract(q*1.8)).rgb;}
else if(mode==7){vec2 p=uv-.5;float radius=length(p*vec2(resolution.x/resolution.y,1.));vec2 q=uv+normalize(p+vec2(.0001))*sin(radius*48.-time*3.5)*.017+vec2(sin(uv.y*24.+time*1.7),cos(uv.x*18.-time*1.3))*.007;result=texture2D(image,clamp(q,0.,1.)).rgb;}
else{
float t=clamp(l*1.35,0.0,1.0);
if(t<.25)result=mix(vec3(.06,.02,.28),vec3(.05,.25,1.),t*4.);
else if(t<.5)result=mix(vec3(.05,.25,1.),vec3(.05,1.,.55),(t-.25)*4.);
else if(t<.75)result=mix(vec3(.05,1.,.55),vec3(1.,.95,.05),(t-.5)*4.);
else result=mix(vec3(1.,.95,.05),vec3(1.,.02,.25),(t-.75)*4.);
}gl_FragColor=vec4(result,1.);}`;
