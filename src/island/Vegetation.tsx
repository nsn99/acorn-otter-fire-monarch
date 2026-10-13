import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useQuality } from "./quality";
import { scatterPlants, type ScatterPoint } from "./scatter";

function makeTree() {
  const trunk = new THREE.CylinderGeometry(0.012, 0.02, 0.16, 5);
  trunk.translate(0, 0.08, 0);
  const crown = new THREE.ConeGeometry(0.09, 0.22, 6);
  crown.translate(0, 0.24, 0);
  const geo = mergePair(trunk, crown);
  trunk.dispose();
  crown.dispose();
  return geo;
}

function makeBush() {
  const a = new THREE.IcosahedronGeometry(0.055, 0);
  a.translate(0, 0.05, 0);
  a.scale(1.2, 0.75, 1.1);
  const b = new THREE.IcosahedronGeometry(0.04, 0);
  b.translate(0.03, 0.07, 0.02);
  const geo = mergePair(a, b);
  a.dispose();
  b.dispose();
  return geo;
}

function mergePair(a: THREE.BufferGeometry, b: THREE.BufferGeometry) {
  const ag = a.index ? a.toNonIndexed() : a;
  const bg = b.index ? b.toNonIndexed() : b;
  const pa = ag.getAttribute("position");
  const pb = bg.getAttribute("position");
  const na = ag.getAttribute("normal");
  const nb = bg.getAttribute("normal");
  const count = pa.count + pb.count;
  const pos = new Float32Array(count * 3);
  const norm = new Float32Array(count * 3);
  for (let i = 0; i < pa.count; i++) {
    pos[i * 3] = pa.getX(i);
    pos[i * 3 + 1] = pa.getY(i);
    pos[i * 3 + 2] = pa.getZ(i);
    norm[i * 3] = na.getX(i);
    norm[i * 3 + 1] = na.getY(i);
    norm[i * 3 + 2] = na.getZ(i);
  }
  const o = pa.count;
  for (let i = 0; i < pb.count; i++) {
    pos[(o + i) * 3] = pb.getX(i);
    pos[(o + i) * 3 + 1] = pb.getY(i);
    pos[(o + i) * 3 + 2] = pb.getZ(i);
    norm[(o + i) * 3] = nb.getX(i);
    norm[(o + i) * 3 + 1] = nb.getY(i);
    norm[(o + i) * 3 + 2] = nb.getZ(i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(norm, 3));
  if (ag !== a) ag.dispose();
  if (bg !== b) bg.dispose();
  return geo;
}

export function Vegetation() {
  const { settings } = useQuality();
  const plants = useMemo(() => scatterPlants(settings.vegetation), [settings.vegetation]);
  const treeGeo = useMemo(() => makeTree(), []);
  const bushGeo = useMemo(() => makeBush(), []);

  return (
    <>
      <PlantInstances
        points={plants.trees}
        geometry={treeGeo}
        colorA="#2c5a34"
        colorB="#1d4124"
      />
      <PlantInstances
        points={plants.bushes}
        geometry={bushGeo}
        colorA="#6a8a3c"
        colorB="#3d5c28"
      />
    </>
  );
}

function PlantInstances({
  points,
  geometry,
  colorA,
  colorB,
}: {
  points: ScatterPoint[];
  geometry: THREE.BufferGeometry;
  colorA: string;
  colorB: string;
}) {
  const mesh = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.78,
      metalness: 0,
      color: "#ffffff",
    });
    const inst = new THREE.InstancedMesh(geometry, mat, Math.max(points.length, 1));
    inst.count = points.length;
    return inst;
  }, [geometry, points.length]);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const a = new THREE.Color(colorA);
    const b = new THREE.Color(colorB);
    points.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.copy(a).lerp(b, p.tint));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [mesh, points, colorA, colorB]);

  if (points.length === 0) return null;
  return <primitive object={mesh} />;
}
