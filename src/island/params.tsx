import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useControls } from "leva";
import { useQuality } from "./quality";

export type SceneParams = {
  waterColor: string;
  waveHeight: number;
  ripple: number;
  sun: number;
  tide: number;
  jelly: number;
  dof: number;
};

const ParamsContext = createContext<SceneParams | null>(null);

export function ParamsProvider({ children }: { children: ReactNode }) {
  const { settings } = useQuality();
  const controls = useControls(
    "树脂块",
    {
      waterColor: { value: "#1aa39a", label: "水色" },
      waveHeight: {
        value: settings.calm ? 0.03 : 0.085,
        min: 0,
        max: 0.2,
        step: 0.005,
        label: "浪高",
      },
      ripple: { value: settings.calm ? 0.2 : 0.62, min: 0, max: 1, step: 0.01, label: "涟漪强度" },
      sun: { value: 0.16, min: 0, max: 1, step: 0.01, label: "太阳角度" },
      tide: { value: 0.48, min: 0, max: 1, step: 0.01, label: "潮位" },
      jelly: { value: settings.calm ? 0.15 : 0.46, min: 0, max: 1, step: 0.01, label: "果冻软硬" },
      dof: { value: settings.calm ? 0.05 : 0.16, min: 0, max: 1, step: 0.01, label: "景深" },
    },
    { persist: false },
  );

  const value = useMemo<SceneParams>(
    () => ({
      waterColor: controls.waterColor,
      waveHeight: controls.waveHeight,
      ripple: controls.ripple,
      sun: controls.sun,
      tide: controls.tide,
      jelly: controls.jelly,
      dof: controls.dof,
    }),
    [controls],
  );

  return <ParamsContext.Provider value={value}>{children}</ParamsContext.Provider>;
}

export function useParams() {
  const ctx = useContext(ParamsContext);
  if (!ctx) throw new Error("useParams outside provider");
  return ctx;
}
