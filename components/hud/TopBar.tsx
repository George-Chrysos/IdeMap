// ============================================================
// IdeMap — Floating Spatial Top HUD Navigation
// ============================================================
"use client";

import { ChevronRight } from "lucide-react";
import { useIdeMapStore } from "@/lib/store";
import { playFocus, playLevelUp, setMuted } from "@/lib/audio";

export default function TopBar() {
  const {
    universe,
    focusPlanetId,
    setFocusPlanet,
    soundEnabled,
    toggleSound,
  } = useIdeMapStore();

  // Ancestor breadcrumb trail from root "Life" down to focusPlanetId
  const breadcrumbTrail: { id: string | null; name: string }[] = [
    { id: null, name: universe.name },
  ];

  if (focusPlanetId) {
    const chain: { id: string; name: string }[] = [];
    let currId: string | null = focusPlanetId;
    while (currId && universe.planets[currId]) {
      const p: { id: string; name: string; parentId: string | null } =
        universe.planets[currId];
      chain.unshift({ id: p.id, name: p.name });
      currId = p.parentId;
    }
    breadcrumbTrail.push(...chain);
  }

  function handleToggleAudio() {
    setMuted(soundEnabled);
    toggleSound();
  }

  function handleDemoClick() {
    if (soundEnabled) playLevelUp();
    if (focusPlanetId === "planet-cultivation") {
      setFocusPlanet(null);
    } else {
      setFocusPlanet("planet-cultivation");
    }
  }

  return (
    <header className="fixed top-6 left-6 z-40 flex flex-wrap items-center gap-3 pointer-events-none">
      {/* Primary Brand & Interactive Orbital Breadcrumb Pill */}
      <div className="hud-panel px-5 py-2.5 flex items-center gap-3 pointer-events-auto shadow-2xl">
        <button
          onClick={() => {
            if (soundEnabled) playFocus();
            setFocusPlanet(null);
          }}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-teal-400/10 border border-teal-400/30 flex items-center justify-center group-hover:border-teal-400 transition-colors">
            <span className="text-teal-400 text-sm">✦</span>
          </div>
          <span
            className="text-xl font-semibold tracking-wide text-slate-100 group-hover:text-teal-300 transition-colors"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Idemap
          </span>
        </button>

        <div className="h-4 w-[1px] bg-teal-400/20 mx-1" />

        {/* Breadcrumb Path */}
        <nav className="flex items-center gap-1.5" aria-label="Orbital hierarchy">
          {breadcrumbTrail.map((item, idx) => {
            const isLast = idx === breadcrumbTrail.length - 1;
            return (
              <div key={item.id ?? "root"} className="flex items-center gap-1.5">
                {idx > 0 && (
                  <ChevronRight size={13} className="text-slate-600" />
                )}
                <button
                  onClick={() => {
                    if (!isLast) {
                      if (soundEnabled) playFocus();
                      setFocusPlanet(item.id);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs xl:text-sm font-outfit transition-all cursor-pointer ${
                    isLast
                      ? "bg-teal-400/15 border border-teal-400/40 text-teal-200 font-medium"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  {item.name}
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Focus Cultivation & Audio Controls */}
      <div className="hud-panel px-3 py-2 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={handleDemoClick}
          className="px-3 py-1 rounded-full text-xs xl:text-sm border border-teal-400/25 hover:border-teal-400/55 text-slate-300 hover:text-teal-300 transition-all font-outfit cursor-pointer"
        >
          {focusPlanetId === "planet-cultivation"
            ? "View Life Core"
            : "Focus Cultivation"}
        </button>

        <button
          onClick={handleToggleAudio}
          className="px-3 py-1 rounded-full text-xs xl:text-sm border border-white/10 hover:border-teal-400/40 text-teal-300 transition-all font-outfit cursor-pointer"
        >
          {soundEnabled ? "🔊 Audio On" : "🔇 Muted"}
        </button>
      </div>
    </header>
  );
}
