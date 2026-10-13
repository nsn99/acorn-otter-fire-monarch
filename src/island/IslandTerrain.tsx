import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { tideHeight } from "./config";
import { useParams } from "./params";
import { useQuality } from "./quality";
import { CAUSTIC_GLSL } from "./shaders";
import { buildIslandGeometry } from "./terrain";

const VERT_INJECT = /* glsl */ `
attribute float aHeight;
attribute float aSlope;
varying float vHeight;
varying float vSlope;
varying vec3 vWpos;
`;

export function IslandTerrain() {
  const { settings } = useQuality();
  const params = useParams();
  const shaderRef = useRef<{
    uniforms: { uTide: { value: number }; uTime: { value: number } };
  } | null>(null);

  const geometry = useMemo(() => buildIslandGeometry(settings.islandSeg), [settings.islandSeg]);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.9,
      metalness: 0.02,
      color: "#ffffff",
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTide = { value: tideHeight(0.58) };
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = VERT_INJECT + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vHeight = aHeight;
        vSlope = aSlope;
        vWpos = (modelMatrix * vec4(position, 1.0)).xyz;`,
      );
      shader.fragmentShader =
        `varying float vHeight;
         varying float vSlope;
         varying vec3 vWpos;
         uniform float uTide;
         uniform float uTime;
         ${CAUSTIC_GLSL}
        ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec3 sand = vec3(0.74, 0.62, 0.40);
        vec3 wet = vec3(0.42, 0.36, 0.24);
        vec3 grass = vec3(0.34, 0.50, 0.20);
        vec3 moss = vec3(0.20, 0.36, 0.15);
        vec3 rock = vec3(0.46, 0.42, 0.37);
        vec3 cliff = vec3(0.30, 0.27, 0.25);
        float slope = clamp(vSlope, 0.0, 1.0);
        vec3 col = mix(sand, grass, smoothstep(0.12, 0.28, vHeight));
        col = mix(col, moss, smoothstep(0.34, 0.62, vHeight) * (1.0 - slope));
        col = mix(col, rock, smoothstep(0.22, 0.58, slope));
        col = mix(col, cliff, smoothstep(0.55, 0.95, slope) * smoothstep(0.25, 0.7, vHeight));
        float strata = 0.5 + 0.5 * sin(vHeight * 46.0 + vWpos.x * 5.0);
        col = mix(col, col * vec3(0.82, 0.8, 0.76), smoothstep(0.4, 0.85, slope) * strata);
        float wetness = (1.0 - smoothstep(uTide - 0.015, uTide + 0.055, vHeight)) * (1.0 - smoothstep(0.25, 0.62, slope));
        col = mix(col, wet, wetness);
        float under = 1.0 - smoothstep(uTide - 0.08, uTide + 0.01, vHeight);
        col *= mix(1.0, 0.62, under);
        float cau = caustics(vWpos.xz * 4.8, uTime * 0.8);
        col += cau * under * (1.0 - slope) * 0.22 * vec3(0.7, 1.0, 0.9);
        float grain = fract(sin(dot(vWpos.xz, vec2(27.1, 91.7))) * 43758.5453);
        col *= 0.93 + 0.09 * grain;
        diffuseColor.rgb *= col;`,
      );
      shaderRef.current = shader as unknown as typeof shaderRef.current;
    };
    mat.customProgramCacheKey = () => "island-v1";
    return mat;
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((state) => {
    const shader = shaderRef.current;
    if (!shader) return;
    shader.uniforms.uTide.value = tideHeight(params.tide);
    shader.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return <mesh geometry={geometry} material={material} />;
}
