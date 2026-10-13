import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Tier = "high" | "low";

export type QualitySettings = {
  tier: Tier;
  dpr: [number, number];
  sim: number;
  waterSeg: number;
  islandSeg: number;
  samples: number;
  transmissionRes: number;
  vegetation: number;
  rocks: number;
  contactRes: number;
  antialias: boolean;
  bloom: boolean;
  calm: boolean;
};

function detectTier(): Tier {
  if (typeof window === "undefined") return "high";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 760;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if ((coarse && narrow) || mem <= 2) return "low";
  return "high";
}

function calmMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function settingsFor(tier: Tier, calm: boolean): QualitySettings {
  if (tier === "low") {
    return {
      tier,
      dpr: [1, 1.15],
      sim: 128,
      waterSeg: 48,
      islandSeg: 52,
      samples: 2,
      transmissionRes: 224,
      vegetation: 64,
      rocks: 16,
      contactRes: 256,
      antialias: false,
      bloom: false,
      calm,
    };
  }
  return {
    tier,
    dpr: [1, 1.5],
    sim: 256,
    waterSeg: 96,
    islandSeg: 84,
    samples: 4,
    transmissionRes: 320,
    vegetation: 150,
    rocks: 28,
    contactRes: 512,
    antialias: true,
    bloom: true,
    calm,
  };
}

const QualityContext = createContext<{
  settings: QualitySettings;
  downgrade: () => void;
} | null>(null);

export function QualityProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<Tier>(() => detectTier());
  const calm = useMemo(() => calmMotion(), []);
  const settings = useMemo(() => settingsFor(tier, calm), [tier, calm]);
  const downgrade = useCallback(() => setTier("low"), []);
  const value = useMemo(() => ({ settings, downgrade }), [settings, downgrade]);
  return <QualityContext.Provider value={value}>{children}</QualityContext.Provider>;
}

export function useQuality() {
  const ctx = useContext(QualityContext);
  if (!ctx) throw new Error("useQuality outside provider");
  return ctx;
}
