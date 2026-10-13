import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BLOCK } from "./config";
import { CAUSTIC_GLSL } from "./shaders";

export function Seabed() {
  const shaderRef = useRef<{ uniforms: { uTime: { value: number } } } | null>(null);
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(BLOCK.w - 0.08, BLOCK.d - 0.08, 1, 1);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.94,
      metalness: 0,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vWpos = (modelMatrix * vec4(position, 1.0)).xyz;`,
      );
      shader.vertexShader = "varying vec3 vWpos;\n" + shader.vertexShader;
      shader.fragmentShader =
        `varying vec3 vWpos;
         uniform float uTime;
         ${CAUSTIC_GLSL}
        ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float n = fract(sin(dot(vWpos.xz, vec2(19.7, 47.3))) * 43758.5453);
        float blot = fract(sin(dot(floor(vWpos.xz * 4.0), vec2(12.9, 33.1))) * 23421.631);
        vec3 sand = mix(vec3(0.78, 0.69, 0.48), vec3(0.66, 0.57, 0.39), blot);
        sand *= 0.92 + 0.1 * n;
        float cau = caustics(vWpos.xz * 5.2, uTime * 0.75);
        sand += cau * 0.42 * vec3(0.75, 1.0, 0.92);
        diffuseColor.rgb *= sand;`,
      );
      shaderRef.current = shader as unknown as typeof shaderRef.current;
    };
    mat.customProgramCacheKey = () => "seabed-v1";
    return mat;
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((state) => {
    if (shaderRef.current) shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return <mesh geometry={geometry} material={material} position={[0, 0.012, 0]} />;
}
