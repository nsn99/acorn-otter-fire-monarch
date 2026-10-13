import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [Scene, setScene] = useState<ComponentType | null>(null);

  useEffect(() => {
    let alive = true;
    void import("@/island/Scene").then((mod) => {
      if (alive) setScene(() => mod.Scene);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="stage fixed inset-0 bg-paper text-ink">
      {Scene ? <Scene /> : <div className="absolute inset-0 bg-paper" />}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-6 p-5 sm:p-8">
        <div className="max-w-sm">
          <p className="font-sans text-xs font-medium tracking-widest text-tide uppercase">
            Resin diorama
          </p>
          <h1 className="mt-1 font-display text-3xl leading-none font-medium text-ink sm:text-5xl">
            树脂块微缩岛屿
          </h1>
          <p className="mt-3 max-w-xs font-sans text-sm leading-relaxed text-muted">
            移动指针，整块像果冻一样晃。划过水面会起涟漪，闲下来时水也轻轻呼吸。
          </p>
        </div>
      </div>
    </main>
  );
}
