import { MeshTransmissionMaterial, RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { BLOCK, tideHeight } from "./config";
import { useParams } from "./params";
import { useQuality } from "./quality";

export function ResinBlock() {
  const { settings } = useQuality();
  const { tide, waterColor, jelly } = useParams();
  const height = tideHeight(tide);
  const attenuation = useMemo(
    () => new THREE.Color(waterColor).lerp(new THREE.Color("#0c4c50"), 0.42),
    [waterColor],
  );
  const paper = useMemo(() => new THREE.Color("#f3efe6"), []);

  return (
    <RoundedBox
      args={[BLOCK.w, height, BLOCK.d]}
      radius={BLOCK.radius}
      smoothness={4}
      bevelSegments={3}
      position={[0, height / 2, 0]}
    >
      <MeshTransmissionMaterial
        backside
        backsideThickness={0.28}
        samples={settings.samples}
        resolution={settings.transmissionRes}
        transmission={1}
        roughness={0.035}
        thickness={Math.max(0.55, height * 0.85)}
        ior={1.4}
        chromaticAberration={0.025}
        anisotropy={0.06}
        distortion={0.08 + jelly * 0.12}
        distortionScale={0.22}
        temporalDistortion={settings.calm ? 0.01 : 0.04 + jelly * 0.03}
        attenuationDistance={1.85}
        attenuationColor={attenuation}
        color="#f7fffd"
        background={paper}
      />
    </RoundedBox>
  );
}