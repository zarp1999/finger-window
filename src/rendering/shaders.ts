export const vertexShader = `attribute vec2 position; varying vec2 uv;
void main(){uv=(position+1.0)*0.5;gl_Position=vec4(position,0.,1.);}`;
export const fragmentShader = `precision mediump float;
varying vec2 uv; uniform sampler2D image; uniform int mode;
void main(){vec3 c=texture2D(image,uv).rgb;float l=dot(c,vec3(.299,.587,.114));vec3 result;
if(mode==1){result=vec3(l);}else if(mode==2){result=1.0-c;}else{
float t=clamp(l*1.35,0.0,1.0);
if(t<.25)result=mix(vec3(.06,.02,.28),vec3(.05,.25,1.),t*4.);
else if(t<.5)result=mix(vec3(.05,.25,1.),vec3(.05,1.,.55),(t-.25)*4.);
else if(t<.75)result=mix(vec3(.05,1.,.55),vec3(1.,.95,.05),(t-.5)*4.);
else result=mix(vec3(1.,.95,.05),vec3(1.,.02,.25),(t-.75)*4.);
}gl_FragColor=vec4(result,1.);}`;
