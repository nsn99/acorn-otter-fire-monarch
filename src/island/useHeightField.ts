import { useEffect, useMemo } from "react";
import * as THREE from "three";

const SIM_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const SIM_FRAG = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform float uDamping;
uniform float uSpeed;
uniform vec2 uDropPos;
uniform float uDropRadius;
uniform float uDropStrength;
uniform float uHasDrop;

void main() {
  vec4 prev = texture2D(uPrev, vUv);
  float h = prev.r;
  float vel = prev.g;

  float l = texture2D(uPrev, vUv + vec2(-uTexel.x, 0.0)).r;
  float r = texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).r;
  float u = texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).r;
  float d = texture2D(uPrev, vUv + vec2(0.0, -uTexel.y)).r;

  vel += (l + r + u + d - 4.0 * h) * uSpeed;
  vel *= uDamping;
  h += vel;

  float edge = smoothstep(0.0, 0.07, vUv.x) * smoothstep(0.0, 0.07, vUv.y);
  edge *= smoothstep(0.0, 0.07, 1.0 - vUv.x) * smoothstep(0.0, 0.07, 1.0 - vUv.y);
  h *= mix(0.8, 1.0, edge);
  vel *= mix(0.68, 1.0, edge);

  if (uHasDrop > 0.5) {
    float dist = distance(vUv, uDropPos);
    h += uDropStrength * exp(-dist * dist / max(uDropRadius, 1e-5));
  }

  gl_FragColor = vec4(clamp(h, -1.0, 1.0), clamp(vel, -1.0, 1.0), 0.0, 1.0);
}
`;

function makeTarget(size: number) {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
  rt.texture.colorSpace = THREE.NoColorSpace;
  return rt;
}

export type HeightFieldApi = {
  texture: THREE.Texture;
  texel: number;
  drop: (u: number, v: number, radius: number, strength: number) => void;
  /** Advance one step. Returns the texture the surface should sample. */
  step: (gl: THREE.WebGLRenderer) => THREE.Texture;
};

/**
 * GPU wave-equation height field. R = height, G = velocity.
 * Call `step` from useFrame before the beauty pass; it restores the previous target.
 */
export function useHeightField(size: number): HeightFieldApi {
  const sim = useMemo(() => {
    const targets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] = [
      makeTarget(size),
      makeTarget(size),
    ];
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPrev: { value: targets[0].texture },
        uTexel: { value: new THREE.Vector2(1 / size, 1 / size) },
        uDamping: { value: 0.984 },
        uSpeed: { value: 0.17 },
        uDropPos: { value: new THREE.Vector2(0.5, 0.5) },
        uDropRadius: { value: 0.0016 },
        uDropStrength: { value: 0 },
        uHasDrop: { value: 0 },
      },
      vertexShader: SIM_VERT,
      fragmentShader: SIM_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    return { targets, material, scene, camera, mesh, read: 0 };
  }, [size]);

  useEffect(() => {
    const { material, targets, mesh } = sim;
    return () => {
      material.dispose();
      targets[0].dispose();
      targets[1].dispose();
      mesh.geometry.dispose();
    };
  }, [sim]);

  return useMemo<HeightFieldApi>(() => {
    const pending = { u: 0.5, v: 0.5, radius: 0.002, strength: 0, armed: false };
    return {
      texture: sim.targets[0].texture,
      texel: 1 / size,
      drop(u, v, radius, strength) {
        pending.u = THREE.MathUtils.clamp(u, 0.02, 0.98);
        pending.v = THREE.MathUtils.clamp(v, 0.02, 0.98);
        pending.radius = radius;
        pending.strength = strength;
        pending.armed = true;
      },
      step(gl) {
        const src = sim.read;
        const dst = src === 0 ? 1 : 0;
        const uniforms = sim.material.uniforms;
        uniforms.uPrev.value = sim.targets[src].texture;
        uniforms.uHasDrop.value = pending.armed ? 1 : 0;
        (uniforms.uDropPos.value as THREE.Vector2).set(pending.u, pending.v);
        uniforms.uDropRadius.value = pending.radius;
        uniforms.uDropStrength.value = pending.strength;
        pending.armed = false;

        const prev = gl.getRenderTarget();
        const prevClear = gl.autoClear;
        gl.autoClear = true;
        gl.setRenderTarget(sim.targets[dst]);
        gl.render(sim.scene, sim.camera);
        gl.setRenderTarget(prev);
        gl.autoClear = prevClear;

        sim.read = dst;
        const next = sim.targets[dst].texture;
        this.texture = next;
        return next;
      },
    };
  }, [sim, size]);
}
