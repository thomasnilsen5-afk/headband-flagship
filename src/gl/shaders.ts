/**
 * Liquid chrome + thin-film interference, with no texture or HDR downloads: the environment
 * is a procedural studio (soft top light, two tinted strip lights, a horizon glint), so the
 * whole object costs zero network bytes beyond the JS.
 */

// 3D simplex noise, Ashima Arts / Stefan Gustavson (MIT).
const noise = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`

export const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uBreath;
uniform vec3 uRipplePos;
uniform float uRipple;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying float vNoise;

${noise}

void main() {
  vec3 p = position;
  // Slow breathing: the surface is never quite still.
  float n = snoise(p * 1.4 + vec3(0.0, uTime * 0.11, 0.0));
  float n2 = snoise(p * 4.2 - vec3(uTime * 0.06));
  // A ripple travelling out from where the pointer touched the band.
  float d = distance(p, uRipplePos);
  float ripple = uRipple * sin(d * 22.0 - uTime * 5.0) * exp(-d * 3.2);
  p += normal * ((n * 0.02 + n2 * 0.005) * uBreath + ripple * 0.018);

  vNoise = n;
  vUv = uv;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uBase;
uniform float uChrome;
uniform float uFilm;
uniform float uRough;
uniform float uKnit;
uniform float uTint;
uniform vec3 uAccentA;
uniform vec3 uAccentB;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying float vNoise;

// Procedural studio environment. Direction in, radiance out.
vec3 studio(vec3 r) {
  float y = r.y;
  vec3 col = mix(vec3(0.006, 0.008, 0.014), vec3(0.03, 0.036, 0.05), smoothstep(-0.7, 0.5, y));
  col += vec3(0.92, 0.95, 1.0) * smoothstep(0.5, 0.97, y) * 1.6;                 // softbox
  float a = atan(r.z, r.x) + uTime * 0.035;
  float s1 = smoothstep(0.16, 0.0, abs(sin(a + 0.7))) * smoothstep(-0.25, 0.35, y);
  float s2 = smoothstep(0.1, 0.0, abs(sin(a - 1.4))) * smoothstep(-0.5, 0.1, y) * (1.0 - smoothstep(0.2, 0.7, y));
  float s3 = smoothstep(0.05, 0.0, abs(sin(a * 2.0 + 2.2))) * (1.0 - smoothstep(-0.1, 0.5, abs(y)));
  col += uAccentA * s1 * 2.2;                                                    // ichor strip
  col += uAccentB * s2 * 1.8;                                                    // ultraviolet strip
  col += vec3(1.0) * s3 * 1.4;                                                   // thin white strip
  col += vec3(0.85, 0.9, 1.0) * smoothstep(0.7, 0.98, r.x) * 0.9;                // key light, right
  col += vec3(1.0, 0.97, 0.92) * exp(-abs(y + 0.04) * 42.0) * 0.55;              // horizon glint
  return col;
}

// Thin-film interference (film n≈1.45 over a metal), per RGB wavelength.
vec3 thinFilm(float cosI, float thicknessNm) {
  float nFilm = 1.45;
  float sinT = sqrt(max(0.0, 1.0 - cosI * cosI)) / nFilm;
  float cosT = sqrt(max(0.0, 1.0 - sinT * sinT));
  float opd = 2.0 * nFilm * thicknessNm * cosT;
  vec3 phase = 6.2831853 * opd / vec3(650.0, 532.0, 450.0);
  return 0.5 + 0.5 * cos(phase);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  if (!gl_FrontFacing) N = -N;

  // Knit microstructure: interlocking rows bend the normal slightly.
  if (uKnit > 0.0) {
    float rows = sin(vUv.y * 70.0);
    float loops = sin(vUv.x * 900.0 + rows * 1.6);
    N = normalize(N + uKnit * 0.18 * vec3(loops * 0.6, rows * 0.4, loops * 0.3));
  }

  float NdV = clamp(dot(N, V), 0.0, 1.0);
  vec3 R = reflect(-V, N);
  vec3 env = mix(studio(R), studio(N) * 0.55 + 0.02, uRough);
  float fresnel = pow(1.0 - NdV, 5.0);

  // Film thickness swirls over the surface and slowly in time.
  float thickness = 380.0 + 240.0 * vNoise + 140.0 * sin(vUv.x * 12.566 + uTime * 0.18 + vUv.y * 3.0);
  vec3 film = thinFilm(NdV, thickness);

  vec3 metal = env * mix(vec3(0.96), film * 1.55, uFilm);
  metal *= mix(vec3(1.0), uBase * 1.7 + 0.08, uTint);
  float lambert = max(dot(N, normalize(vec3(0.3, 1.0, 0.45))), 0.0);
  vec3 fabric = uBase * (0.12 + 0.88 * lambert) * 0.55 + env * mix(0.03, 0.9, fresnel);
  vec3 col = mix(fabric, metal, uChrome);

  // Bioluminescent rim: the edge glows in the accent colours, drifting around the loop.
  float drift = 0.5 + 0.5 * sin(uTime * 0.12 + vUv.x * 6.2831853);
  col += mix(uAccentA, uAccentB, drift) * pow(1.0 - NdV, 3.0) * 0.4;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`
