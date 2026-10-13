import { ContactShadows, Environment } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { sunVector, tideHeight } from "./config";
import { IslandTerrain } from "./IslandTerrain";
import { JellyGroup } from "./JellyGroup";
import { useParams } from "./params";
import { useQuality } from "./quality";
import { ResinBlock } from "./ResinBlock";
import { Rocks } from "./Rocks";
import { Seabed } from "./Seabed";
import { Vegetation } from "./Vegetation";
import { WaterSurface } from "./WaterSurface";

class EnvBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const look = useMemo(() => new THREE.Vector3(0, 0.32, 0), []);
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const p = state.pointer;
    const cam = camera as THREE.PerspectiveCamera;
    const tx = 4.55 + p.x * 0.22;
    const ty = 7.35 + p.y * 0.12;
    const tz = 5.35 - p.y * 0.16;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, tx, 2.4, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, ty, 2.4, dt);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, tz, 2.4, dt);
    cam.lookAt(look);
  });
  return null;
}

function Sun() {
  const light = useRef<THREE.DirectionalLight>(null);
  const params = useParams();
  const dir = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!light.current) return;
    sunVector(params.sun, dir);
    light.current.position.copy(dir);
  });
  return (
    <>
      <ambientLight intensity={0.22} color="#f4f0e8" />
      <hemisphereLight args={["#e7f4f2", "#e4d3b8", 0.38]} />
      <directionalLight ref={light} intensity={1.65} color="#fff6ea" position={[3.2, 2.4, 1.4]} />
      <directionalLight intensity={0.28} color="#d5ebe8" position={[-2.4, 1.6, -1.2]} />
    </>
  );
}

function Focus() {
  const params = useParams();
  const focusRange = THREE.MathUtils.lerp(2.8, 0.42, params.dof);
  const bokeh = THREE.MathUtils.lerp(0.2, 3.4, params.dof);
  return (
    <DepthOfField
      target={[0, 0.34, 0]}
      focusRange={focusRange}
      bokehScale={bokeh}
      resolutionScale={0.6}
    />
  );
}

function Adaptive() {
  const { settings, downgrade } = useQuality();
  const acc = useRef({ frames: 0, time: 0, cool: 4 });
  useFrame((_, delta) => {
    if (settings.tier === "low") return;
    const d = Math.min(delta, 0.1);
    acc.current.cool -= d;
    if (acc.current.cool > 0) return;
    acc.current.frames += 1;
    acc.current.time += d;
    if (acc.current.time < 1.4) return;
    const fps = acc.current.frames / acc.current.time;
    acc.current.frames = 0;
    acc.current.time = 0;
    if (fps < 28) downgrade();
  });
  return null;
}

function Diorama() {
  const { settings } = useQuality();
  const tide = useParams().tide;
  return (
    <>
      <color attach="background" args={["#f3efe6"]} />
      <CameraRig />
      <Sun />
      <Adaptive />
      <Suspense fallback={null}>
        <EnvBoundary>
          <Environment preset="studio" environmentIntensity={0.48} />
        </EnvBoundary>
      </Suspense>
      <JellyGroup>
        <Seabed />
        <IslandTerrain />
        <Rocks />
        <Vegetation />
        <ResinBlock />
        <WaterSurface />
      </JellyGroup>
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.38}
        scale={12}
        blur={2.5}
        far={Math.max(1.2, tideHeight(tide) + 0.4)}
        color="#6a6158"
        resolution={settings.contactRes}
      />
      <EffectComposer multisampling={settings.antialias ? 2 : 0} enableNormalPass={false}>
        <Focus />
        {settings.bloom ? <Bloom intensity={0.18} luminanceThreshold={0.86} mipmapBlur /> : null}
        <Vignette eskil={false} offset={0.22} darkness={0.48} />
      </EffectComposer>
    </>
  );
}

export function IslandCanvas() {
  const { settings } = useQuality();
  return (
    <Canvas
      className="block h-full w-full"
      dpr={settings.dpr}
      performance={{ min: 0.55, debounce: 250 }}
      camera={{ fov: 20, position: [4.55, 7.35, 5.35], near: 0.1, far: 48 }}
      gl={{
        antialias: settings.antialias,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.96,
      }}
    >
      <Diorama />
    </Canvas>
  );
}
