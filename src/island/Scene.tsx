import { Leva } from "leva";
import { IslandCanvas } from "./Stage";
import { ParamsProvider } from "./params";
import { QualityProvider, useQuality } from "./quality";

function Panel() {
  const { settings } = useQuality();
  return (
    <Leva
      collapsed={settings.tier === "low"}
      titleBar={{ title: "调参", drag: true, filter: false }}
      theme={{
        colors: {
          elevation1: "#f7f4ee",
          elevation2: "#fffdf8",
          elevation3: "#efeae2",
          accent1: "#146e68",
          accent2: "#146e68",
          accent3: "#0e4f4b",
          highlight1: "#241f1b",
          highlight2: "#241f1b",
          highlight3: "#6d655c",
          vivid1: "#c4553a",
        },
        sizes: {
          titleBarHeight: "28px",
          controlWidth: "160px",
        },
        fontSizes: {
          root: "13px",
        },
      }}
    />
  );
}

export function Scene() {
  return (
    <QualityProvider>
      <ParamsProvider>
        <div className="absolute inset-0">
          <IslandCanvas />
        </div>
        <Panel />
      </ParamsProvider>
    </QualityProvider>
  );
}
