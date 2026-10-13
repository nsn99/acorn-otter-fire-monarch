import { fbm, hash01 } from "./noise";
import { terrainHeight, terrainSlope } from "./terrain";

export type ScatterPoint = {
  x: number;
  y: number;
  z: number;
  rot: number;
  scale: number;
  tint: number;
  variant: number;
};

function rockGeometryVariant(seed: number) {
  return seed % 3;
}

export function scatterRocks(count: number): ScatterPoint[] {
  const out: ScatterPoint[] = [];
  let guard = 0;
  let i = 0;
  while (out.length < count && guard < 4000) {
    guard++;
    const x = (hash01(i, 1) - 0.5) * 2.2;
    const z = (hash01(i, 2) - 0.5) * 2.2;
    i++;
    if (Math.abs(x) > 1.12 || Math.abs(z) > 1.12) continue;
    const h = terrainHeight(x, z);
    const slope = terrainSlope(x, z);
    if (h > 0.42 || slope > 0.5) continue;
    const hero = hash01(i, 4) > 0.9;
    const scale = (hero ? 0.22 : 0.045) + hash01(i, 3) * (hero ? 0.14 : 0.08);
    out.push({
      x,
      z,
      y: h + scale * 0.18,
      rot: hash01(i, 5) * Math.PI * 2,
      scale,
      tint: hash01(i, 6),
      variant: rockGeometryVariant(i),
    });
  }
  return out;
}

export function scatterPlants(count: number): { trees: ScatterPoint[]; bushes: ScatterPoint[] } {
  const trees: ScatterPoint[] = [];
  const bushes: ScatterPoint[] = [];
  let guard = 0;
  let i = 0;
  while (trees.length + bushes.length < count && guard < 5000) {
    guard++;
    const x = -1.15 + hash01(i, 11) * 1.85;
    const z = -1.15 + hash01(i, 12) * 1.75;
    i++;
    const h = terrainHeight(x, z);
    const slope = terrainSlope(x, z);
    if (h < 0.28 || h > 1.06 || slope > 0.55) continue;
    const n = fbm(x * 3.0, z * 3.0, 3);
    if (n < 0.38) continue;
    const tree = h > 0.55 && slope < 0.32 && hash01(i, 13) > 0.38;
    const point: ScatterPoint = {
      x,
      y: h,
      z,
      rot: hash01(i, 14) * Math.PI * 2,
      scale: tree ? 0.85 + hash01(i, 15) * 0.55 : 0.55 + hash01(i, 16) * 0.45,
      tint: hash01(i, 17),
      variant: 0,
    };
    if (tree && trees.length < count * 0.42) trees.push(point);
    else bushes.push(point);
  }
  return { trees, bushes };
}
