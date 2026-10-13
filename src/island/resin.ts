import * as THREE from "three";

const EPS = 0.00001;

function roundedProfile(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const r = Math.max(radius - EPS, EPS);
  shape.absarc(EPS, EPS, EPS, -Math.PI / 2, -Math.PI, true);
  shape.absarc(EPS, height - r * 2, EPS, Math.PI, Math.PI / 2, true);
  shape.absarc(width - r * 2, height - r * 2, EPS, Math.PI / 2, 0, true);
  shape.absarc(width - r * 2, EPS, EPS, 0, -Math.PI / 2, true);
  return shape;
}

/** Rounded box with the top faces removed so the water surface can sit in the opening. */
export function createOpenResinGeometry(width: number, height: number, depth: number, radius: number) {
  const shape = roundedProfile(width, height, radius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(depth - radius * 2, 0.05),
    bevelEnabled: true,
    bevelThickness: radius,
    bevelSize: Math.max(radius - EPS, EPS),
    bevelSegments: 2,
    bevelOffset: 0,
    curveSegments: 3,
    steps: 1,
  });
  geo.center();

  const non = geo.index ? geo.toNonIndexed() : geo;
  geo.dispose();
  const pos = non.getAttribute("position");
  const uv = non.getAttribute("uv");
  const nextPos: number[] = [];
  const nextUv: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    const ny = n.y / (n.length() || 1);
    if (ny > 0.52) continue;
    for (let k = 0; k < 3; k++) {
      nextPos.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
      if (uv) nextUv.push(uv.getX(i + k), uv.getY(i + k));
    }
  }

  const open = new THREE.BufferGeometry();
  open.setAttribute("position", new THREE.Float32BufferAttribute(nextPos, 3));
  if (nextUv.length) open.setAttribute("uv", new THREE.Float32BufferAttribute(nextUv, 2));
  open.computeVertexNormals();
  non.dispose();
  return open;
}
