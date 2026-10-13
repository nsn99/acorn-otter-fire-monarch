import * as THREE from "three";
import { fbm, saturate, smoother } from "./noise";

/**
 * Cliff island in the back-left of the block.
 * Plateau stays above the tide; a short face drops to a crescent beach.
 */
export function terrainHeight(x: number, z: number) {
  const n = fbm(x * 2.3 + 1.4, z * 2.3 + 3.1);

  // Steep mesa, back-left, facing the camera on its front lip.
  const mx = (x + 0.16) / 0.58;
  const mz = (z + 0.34) / 0.46;
  const mr = Math.hypot(mx, mz);
  const mesa = smoother(1.02, 0.74, mr);
  let h = mesa * (1.0 + n * 0.06);

  // Crescent beach in front of the cliff, higher against the rock, fading into the seabed.
  const bx = (x - 0.05) / 1.0;
  const bz = (z + 0.02) / 0.78;
  const br = Math.hypot(bx, bz);
  const inFront = saturate((z + 0.12) * 1.15 + (x - 0.05) * 0.35);
  const beachMask = smoother(1.02, 0.28, br) * smoother(0.02, 0.5, inFront) * (1 - mesa);
  const beachH = 0.07 + (1 - smoother(0.35, 0.92, br)) * 0.5 + n * 0.02;
  h += beachMask * beachH;

  // Bite a cove so the shoreline bends.
  const cove = Math.exp(-((x - 0.42) * (x - 0.42)) / 0.05 - ((z - 0.18) * (z - 0.18)) / 0.035);
  h *= 1 - cove * beachMask * 0.75;

  return Math.max(0, h);
}

export function terrainSlope(x: number, z: number) {
  const e = 0.045;
  const hL = terrainHeight(x - e, z);
  const hR = terrainHeight(x + e, z);
  const hD = terrainHeight(x, z - e);
  const hU = terrainHeight(x, z + e);
  return Math.min(1, Math.hypot((hR - hL) / (e * 2), (hU - hD) / (e * 2)) * 0.72);
}

export const ISLAND_BOUNDS = {
  x0: -1.2,
  x1: 0.78,
  z0: -1.22,
  z1: 0.7,
};

export function buildIslandGeometry(segments: number) {
  const { x0, x1, z0, z1 } = ISLAND_BOUNDS;
  const w = x1 - x0;
  const d = z1 - z0;
  const geo = new THREE.PlaneGeometry(w, d, segments, segments);
  geo.rotateX(-Math.PI / 2);
  geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);

  const pos = geo.attributes.position;
  const gridX = segments + 1;
  const gridY = segments + 1;
  const heights = new Float32Array(pos.count);
  const slopes = new Float32Array(pos.count);

  for (let i = 0; i < pos.count; i++) {
    const h = terrainHeight(pos.getX(i), pos.getZ(i));
    heights[i] = h;
    pos.setY(i, h);
  }

  const sx = w / segments;
  const sz = d / segments;
  for (let iy = 0; iy < gridY; iy++) {
    for (let ix = 0; ix < gridX; ix++) {
      const i = iy * gridX + ix;
      const iL = iy * gridX + Math.max(0, ix - 1);
      const iR = iy * gridX + Math.min(gridX - 1, ix + 1);
      const iD = Math.max(0, iy - 1) * gridX + ix;
      const iU = Math.min(gridY - 1, iy + 1) * gridX + ix;
      const dx = (heights[iR] - heights[iL]) / (sx * (ix === 0 || ix === gridX - 1 ? 1 : 2));
      const dz = (heights[iU] - heights[iD]) / (sz * (iy === 0 || iy === gridY - 1 ? 1 : 2));
      slopes[i] = Math.min(1, Math.hypot(dx, dz) * 0.8);
    }
  }

  geo.setAttribute("aHeight", new THREE.BufferAttribute(heights, 1));
  geo.setAttribute("aSlope", new THREE.BufferAttribute(slopes, 1));
  geo.computeVertexNormals();
  pos.needsUpdate = true;
  return geo;
}

export function buildTerrainTexture(width: number, depth: number, res: number) {
  const data = new Float32Array(res * res * 4);
  for (let iy = 0; iy < res; iy++) {
    for (let ix = 0; ix < res; ix++) {
      const u = ix / (res - 1);
      const v = iy / (res - 1);
      const x = (u - 0.5) * width;
      const z = (0.5 - v) * depth;
      const h = terrainHeight(x, z);
      const o = (iy * res + ix) * 4;
      data[o] = h;
      data[o + 1] = h;
      data[o + 2] = 0;
      data[o + 3] = 1;
    }
  }
  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.FloatType);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
