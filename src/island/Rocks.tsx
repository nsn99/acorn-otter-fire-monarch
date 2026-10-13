import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useQuality } from "./quality";
import { fbm } from "./noise";
import { scatterRocks } from "./scatter";

function makeRock(seed: number) {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const n = fbm(v.x * 1.8 + seed, v.y * 1.8 + seed * 1.7, 4);
    const s = 0.68 + n * 0.62;
    v.multiplyScalar(s);
    pos.setXYZ(i, v.x, v.y * (0.72 + (seed % 3) * 0.06), v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function Rocks() {
  const { settings } = useQuality();
  const points = useMemo(() => scatterRocks(settings.rocks), [settings.rocks]);
  const geometries = useMemo(() => [makeRock(1.2), makeRock(4.8), makeRock(9.1)], []);
  const groups = useMemo(() => {
    return [0, 1, 2].map((variant) => points.filter((p) => p.variant === variant));
  }, [points]);

  return (
    <>
      {groups.map((group, variant) => (
        <RockInstances key={variant} points={group} geometry={geometries[variant]} />
      ))}
    </>
  );
}

function RockInstances({
  points,
  geometry,
}: {
  points: ReturnType<typeof scatterRocks>;
  geometry: THREE.BufferGeometry;
}) {
  const mesh = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.84,
      metalness: 0.04,
      color: "#8d867e",
    });
    const inst = new THREE.InstancedMesh(geometry, mat, Math.max(points.length, 1));
    inst.count = points.length;
    return inst;
  }, [geometry, points.length]);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    points.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.tint * 0.4, p.rot, p.tint * 0.2);
      const s = p.scale;
      dummy.scale.set(s * (0.85 + p.tint * 0.3), s, s * (0.9 + (1 - p.tint) * 0.25));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.set("#a3988c").lerp(new THREE.Color("#5e584f"), p.tint);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [mesh, points]);

  if (points.length === 0) return null;
  return <primitive object={mesh} />;
}
