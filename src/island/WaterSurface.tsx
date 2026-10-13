import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { tideHeight, waterSize } from "./config";
import { useParams } from "./params";
import { useQuality } from "./quality";
import { WATER_FRAG, WATER_VERT } from "./shaders";
import { buildTerrainTexture } from "./terrain";
import { useHeightField } from "./useHeightField";

function shadeWater(hex: string, shallow: THREE.Color, deep: THREE.Color) {
  const base = new THREE.Color(hex);
  shallow.copy(base).lerp(new THREE.Color("#e7fff8"), 0.74);
  deep.copy(base).lerp(new THREE.Color("#06363a"), 0.62);
}

export function WaterSurface() {
  const { settings } = useQuality();
  const params = useParams();
  const field = useHeightField(settings.sim);
  const { w, d } = waterSize();
  const mesh = useRef<THREE.Mesh>(null);
  const idle = useRef(0);
  const sun = useMemo(() => new THREE.Vector3(), []);
  const shallow = useMemo(() => new THREE.Color(), []);
  const deep = useMemo(() => new THREE.Color(), []);

  const terrain = useMemo(() => buildTerrainTexture(w, d, settings.tier === "low" ? 96 : 160), [w, d, settings.tier]);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(w, d, settings.waterSeg, settings.waterSeg);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [w, d, settings.waterSeg]);

  const material = useMemo(() => {
    shadeWater("#1aa39a", shallow, deep);
    return new THREE.ShaderMaterial({
      uniforms: {
        uHeight: { value: field.texture },
        uTerrain: { value: terrain },
        uWave: { value: 0.085 },
        uTime: { value: 0 },
        uStep: { value: 0.045 },
        uUvStep: { value: 0.045 / w },
        uShallow: { value: shallow.clone() },
        uDeep: { value: deep.clone() },
        uSunDir: { value: new THREE.Vector3(0.4, 1, 0.3) },
        uTide: { value: 0.6 },
      },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      transparent: true,
      depthWrite: true,
      toneMapped: true,
    });
  }, [field.texture, field.texel, terrain, shallow, deep]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      terrain.dispose();
    };
  }, [geometry, material, terrain]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const tex = field.step(state.gl);
    const u = material.uniforms;
    u.uHeight.value = tex;
    u.uWave.value = params.waveHeight;
    u.uTime.value = state.clock.elapsedTime;
    u.uTide.value = tideHeight(params.tide);
    shadeWater(params.waterColor, u.uShallow.value as THREE.Color, u.uDeep.value as THREE.Color);
    const az = params.sun * Math.PI * 2;
    const elev = 1.05 + Math.sin(params.sun * Math.PI) * 1.35;
    sun.set(Math.cos(az) * 4.4, elev, Math.sin(az) * 4.4).normalize();
    (u.uSunDir.value as THREE.Vector3).copy(sun);

    const y = tideHeight(params.tide) - 0.012;
    if (mesh.current) mesh.current.position.y = y;

    if (!settings.calm) {
      idle.current -= dt;
      if (idle.current <= 0) {
        idle.current = 1.6 + Math.random() * 1.8;
        field.drop(0.25 + Math.random() * 0.5, 0.25 + Math.random() * 0.5, 0.0014, 0.12 * params.ripple);
      }
    }
  }, -1);

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      position={[0, tideHeight(params.tide) - 0.012, 0]}
      onPointerMove={(event) => {
        if (!event.uv) return;
        event.stopPropagation();
        const strength = 0.22 * params.ripple * (event.pointerType === "touch" ? 1.35 : 1);
        field.drop(event.uv.x, event.uv.y, 0.0011 + params.ripple * 0.0016, strength);
      }}
    />
  );
}
