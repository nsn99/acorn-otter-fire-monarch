import * as THREE from "three";

export const BLOCK = {
  w: 2.55,
  d: 2.55,
  radius: 0.12,
  inset: 0.1,
  tideMin: 0.46,
  tideMax: 0.82,
};

export function tideHeight(tide: number) {
  return THREE.MathUtils.lerp(BLOCK.tideMin, BLOCK.tideMax, THREE.MathUtils.clamp(tide, 0, 1));
}

export function waterSize() {
  return {
    w: BLOCK.w - BLOCK.inset * 2,
    d: BLOCK.d - BLOCK.inset * 2,
  };
}

/** PlaneGeometry.rotateX(-PI/2) UV: u along +X, v=1 at -Z. */
export function uvToWorld(u: number, v: number, width: number, depth: number) {
  return {
    x: (u - 0.5) * width,
    z: (0.5 - v) * depth,
  };
}

export function sunVector(angle: number, out = new THREE.Vector3()) {
  const az = angle * Math.PI * 2;
  const elev = 1.05 + Math.sin(angle * Math.PI) * 1.35;
  return out.set(Math.cos(az) * 4.4, elev, Math.sin(az) * 4.4);
}
