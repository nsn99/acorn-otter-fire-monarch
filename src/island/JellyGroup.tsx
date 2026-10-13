import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useParams } from "./params";

/** Shear the diorama around its base so the top lags the pointer like jelly. */
export function JellyGroup({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const params = useParams();
  const jelly = useRef(params.jelly);
  jelly.current = params.jelly;
  const target = useRef(new THREE.Vector2());
  const pos = useRef(new THREE.Vector2());
  const vel = useRef(new THREE.Vector2());
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    const move = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      target.current.set(x, -y);
    };
    const reset = () => target.current.set(0, 0);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", move);
    el.addEventListener("pointerleave", reset);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", move);
      el.removeEventListener("pointerleave", reset);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.033);
    const soft = THREE.MathUtils.clamp(jelly.current, 0, 1);
    const stiffness = THREE.MathUtils.lerp(150, 18, soft);
    const damping = THREE.MathUtils.lerp(18, 3.4, soft);
    const amp = THREE.MathUtils.lerp(0.03, 0.15, soft);
    const ax = (target.current.x * amp - pos.current.x) * stiffness - vel.current.x * damping;
    const ay = (target.current.y * amp - pos.current.y) * stiffness - vel.current.y * damping;
    vel.current.x += ax * dt;
    vel.current.y += ay * dt;
    pos.current.x += vel.current.x * dt;
    pos.current.y += vel.current.y * dt;

    const squash = Math.hypot(pos.current.x, pos.current.y) * 0.45;
    g.matrixAutoUpdate = false;
    g.matrix.set(
      1, pos.current.x, 0, 0,
      0, 1 - squash, 0, 0,
      0, pos.current.y, 1, 0,
      0, 0, 0, 1,
    );
    g.updateMatrixWorld(true);
  }, -2);

  return <group ref={group}>{children}</group>;
}
