export const CAUSTIC_GLSL = /* glsl */ `
float causticCell(vec2 p, float t) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float m = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(
        fract(sin(dot(i + g, vec2(127.1, 311.7))) * 43758.5453),
        fract(sin(dot(i + g, vec2(269.5, 183.3))) * 43758.5453)
      );
      o = 0.5 + 0.5 * sin(t + 6.28318 * o);
      m = min(m, length(g + o - f));
    }
  }
  return m;
}
float caustics(vec2 p, float t) {
  float c = min(causticCell(p, t), causticCell(p + 9.2, t * 1.15 + 2.0));
  return pow(1.0 - smoothstep(0.0, 0.48, c), 5.0);
}
`;

export const WATER_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vH;
uniform sampler2D uHeight;
uniform float uWave;
uniform float uTime;
uniform float uStep;
uniform float uUvStep;

float idleWave(vec2 p, float t) {
  float w = sin(p.x * 2.15 + t * 0.62) * 0.46;
  w += sin(p.y * 1.62 - t * 0.48 + 1.7) * 0.3;
  w += sin((p.x + p.y) * 2.7 + t * 0.33) * 0.2;
  return w;
}

float sampleH(vec2 uv, vec2 xz) {
  return texture2D(uHeight, uv).r * uWave + idleWave(xz, uTime) * uWave * 0.42;
}

void main() {
  vUv = uv;
  vec2 xz = position.xz;
  float h = sampleH(uv, xz);
  float hX1 = sampleH(uv + vec2(uUvStep, 0.0), xz + vec2(uStep, 0.0));
  float hX0 = sampleH(uv - vec2(uUvStep, 0.0), xz - vec2(uStep, 0.0));
  float hZ1 = sampleH(uv + vec2(0.0, -uUvStep), xz + vec2(0.0, uStep));
  float hZ0 = sampleH(uv + vec2(0.0, uUvStep), xz - vec2(0.0, uStep));
  float dhdx = (hX1 - hX0) / (2.0 * uStep);
  float dhdz = (hZ1 - hZ0) / (2.0 * uStep);
  vec3 transformed = position;
  transformed.y += h;
  vH = h;
  vec3 objectNormal = normalize(vec3(-dhdx, 1.0, -dhdz));
  vNormal = normalize(mat3(modelMatrix) * objectNormal);
  vec4 world = modelMatrix * vec4(transformed, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const WATER_FRAG = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vH;
uniform sampler2D uTerrain;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uSunDir;
uniform float uTide;
uniform float uTime;

${CAUSTIC_GLSL}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uSunDir);
  vec3 H = normalize(L + V);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 4.0);

  float terrain = texture2D(uTerrain, vUv).r;
  float depth = clamp(uTide - terrain, 0.0, 1.4);
  float land = smoothstep(uTide - 0.008, uTide + 0.02, terrain);
  float depthT = smoothstep(0.015, 0.5, depth);

  vec3 waterCol = mix(uShallow, uDeep, depthT);
  float cau = caustics(vWorld.xz * 4.6, uTime * 0.85);
  waterCol += cau * (1.0 - depthT) * 0.28 * vec3(0.75, 1.0, 0.92);

  vec3 R = reflect(-V, N);
  float sky = clamp(R.y * 0.55 + 0.45, 0.0, 1.0);
  vec3 refl = mix(vec3(0.62, 0.74, 0.72), vec3(0.97, 0.96, 0.93), sky);
  refl = mix(refl, vec3(1.0, 0.9, 0.78), pow(1.0 - abs(R.y), 5.0) * 0.28);

  float spec = pow(clamp(dot(N, H), 0.0, 1.0), mix(48.0, 160.0, ndv));
  float wrap = pow(clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0), 2.0);

  float shore = 1.0 - smoothstep(0.0, 0.055, abs(terrain - uTide));
  float coast = smoothstep(0.015, 0.07, terrain);
  float crest = smoothstep(0.008, 0.04, vH) * coast;
  float grain = caustics(vWorld.xz * 2.4 + 4.0, uTime * 0.7);
  float foam = clamp(shore * coast * (0.7 + grain) + crest * 0.85, 0.0, 1.0);

  vec3 col = waterCol * (0.72 + 0.28 * wrap);
  col = mix(col, refl, fres * 0.78 + 0.05);
  col += spec * vec3(1.0, 0.97, 0.9) * 0.9;
  col = mix(col, vec3(0.96, 0.98, 0.97), foam);

  float alpha = mix(0.04, 0.42, depthT);
  alpha = mix(alpha, 0.5, fres * 0.55);
  alpha = mix(alpha, 0.88, foam);
  alpha *= 1.0 - land;
  if (alpha < 0.015) discard;

  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
