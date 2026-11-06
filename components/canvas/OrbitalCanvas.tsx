// ============================================================
// IdeMap — 2D Focused Orbital Engine & Spatial Canvas
// ============================================================
"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Pause, Play, Sparkles, Compass } from "lucide-react";
import { useIdeMapStore } from "@/lib/store";
import {
  computePlanetHealth,
  computePlanetLevel,
  computeUniverseHealth,
  computeUniverseLevel,
} from "@/lib/health";
import { playFocus } from "@/lib/audio";
import PlanetNode from "@/components/nodes/PlanetNode";
import OrbitalArcs from "@/components/canvas/OrbitalArcs";
import type { Planet, OrbitalPosition } from "@/lib/types";

interface OrbitalCanvasProps {
  onOpenForgeModal: (parentId: string | null) => void;
  onCenterChange?: (cx: number, cy: number, accent: string) => void;
}

function useWindowSize() {
  const [size, setSize] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    function update() {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

export default function OrbitalCanvas({
  onOpenForgeModal,
  onCenterChange,
}: OrbitalCanvasProps) {
  const { universe, focusPlanetId, setFocusPlanet, soundEnabled } =
    useIdeMapStore();
  const { w, h } = useWindowSize();

  // Orbital animation state
  const [orbitAngleOffset, setOrbitAngleOffset] = useState(0);
  const [isOrbitPaused, setIsOrbitPaused] = useState(false);
  const isHoveringRef = useRef(false);

  // Continuous smooth orbital revolution around the central Focus Planet
  useEffect(() => {
    let rafId: number;
    let lastTime = performance.now();

    function animate(now: number) {
      const dt = now - lastTime;
      lastTime = now;
      if (!isOrbitPaused && !isHoveringRef.current) {
        // ~3.5 degrees per second -> identical to preview speed
        setOrbitAngleOffset((prev) => (prev + dt * 0.0035) % 360);
      }
      rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isOrbitPaused]);

  // Determine focused planet (null = "Life" Universe Core)
  const focusPlanet = focusPlanetId ? universe.planets[focusPlanetId] : null;
  const parentPlanet = focusPlanet?.parentId
    ? universe.planets[focusPlanet.parentId]
    : null;

  // Virtual Planet object for "Life" Universe Core when at root level
  const lifeCorePlanet: Planet = useMemo(
    () => ({
      id: "life",
      name: universe.name,
      icon: "☀️",
      color: "#0F766E",
      parentId: null,
      childrenIds: universe.planetIds,
      healthOverride: null,
      strainFlags: { financial: false, psychological: false },
      level: computeUniverseLevel(universe),
      xp: 0,
      tasks: [],
      notes: [],
      timeline: [],
      createdAt: universe.createdAt,
    }),
    [universe]
  );

  const activeFocusNode = focusPlanet ?? lifeCorePlanet;
  const activeFocusHealth = focusPlanet
    ? computePlanetHealth(focusPlanet, universe)
    : computeUniverseHealth(universe);
  const activeFocusLevel = focusPlanet
    ? computePlanetLevel(focusPlanet, universe)
    : computeUniverseLevel(universe);

  // Children orbiting the current Focus Planet
  const childrenIds = focusPlanet ? focusPlanet.childrenIds : universe.planetIds;

  // Exact center math matching the preview: right panel is fixed at ~420px width
  const cx = Math.round((w - 420) / 2);
  const cy = Math.round(h / 2 + 12);

  // Radius matching the preview formula:
  const orbitRadius = Math.round(
    Math.max(185, Math.min(370, Math.min(w - 430, h - 100) * 0.35))
  );

  // Planet disc sizes matching the preview exactly
  const focusDiscSize = 112;
  const childDiscSize = 76;
  const parentDiscSize = 62;

  // Notify background canvas of orbital center & active color
  useEffect(() => {
    onCenterChange?.(cx, cy, activeFocusNode.color);
  }, [cx, cy, activeFocusNode.color, onCenterChange]);

  // Compute live orbital positions for children
  const positions: OrbitalPosition[] = useMemo(() => {
    const n = childrenIds.length;
    if (n === 0) return [];
    return childrenIds.map((id, i) => {
      const angle = -90 + (360 / n) * i + orbitAngleOffset;
      const rad = (angle * Math.PI) / 180;
      return {
        planetId: id,
        x: Math.cos(rad) * orbitRadius,
        y: Math.sin(rad) * orbitRadius,
        angle,
      };
    });
  }, [childrenIds, orbitRadius, orbitAngleOffset]);

  // In-orbit contextual Forge Slot position on the orbital ring
  const forgeSlotPos = useMemo(() => {
    const n = childrenIds.length;
    const baseAngle =
      n === 0
        ? -45 + orbitAngleOffset
        : -90 + (360 / n) * (n - 0.5) + orbitAngleOffset;
    const rad = (baseAngle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * orbitRadius,
      y: Math.sin(rad) * orbitRadius,
      angle: baseAngle,
    };
  }, [childrenIds.length, orbitRadius, orbitAngleOffset]);

  // Peripheral Parent Wayback coordinates (upper-left sector)
  const waybackPos = useMemo(() => {
    if (!focusPlanet) return null;
    return {
      x: Math.max(95, Math.round(cx - orbitRadius * 1.12)),
      y: Math.max(115, Math.round(cy - orbitRadius * 0.78)),
    };
  }, [focusPlanet, cx, cy, orbitRadius]);

  const handleDiveIntoPlanet = useCallback(
    (id: string | null) => {
      if (soundEnabled) playFocus();
      isHoveringRef.current = false;
      setFocusPlanet(id);
    },
    [setFocusPlanet, soundEnabled]
  );

  return (
    <div className="absolute inset-0 no-select overflow-hidden" style={{ zIndex: 2 }}>
      {/* Layer 1: Ethereal SVG Orbital Arcs & Astrolabe Rings */}
      <OrbitalArcs
        positions={positions}
        centerX={cx}
        centerY={cy}
        orbitRadius={orbitRadius}
        width={w}
        height={h}
        waybackPos={waybackPos}
        forgeSlotPos={forgeSlotPos}
      />

      {/* Layer 2: Spatial Celestial Nodes */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 2A. Peripheral Parent Wayback Node (when focused inside a planet) */}
        <AnimatePresence>
          {focusPlanet && waybackPos && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30"
              style={{ left: waybackPos.x, top: waybackPos.y }}
            >
              <motion.div
                key={`wayback-${parentPlanet ? parentPlanet.id : "life"}`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
              >
                {parentPlanet ? (
                  <PlanetNode
                    planet={parentPlanet}
                    health={computePlanetHealth(parentPlanet, universe)}
                    computedLevel={computePlanetLevel(parentPlanet, universe)}
                    size={parentDiscSize}
                    isParent
                    onMouseEnter={() => {
                      isHoveringRef.current = true;
                    }}
                    onMouseLeave={() => {
                      isHoveringRef.current = false;
                    }}
                    onClick={() => handleDiveIntoPlanet(parentPlanet.id)}
                  />
                ) : (
                  <PlanetNode
                    planet={lifeCorePlanet}
                    health={computeUniverseHealth(universe)}
                    computedLevel={computeUniverseLevel(universe)}
                    size={parentDiscSize}
                    isParent
                    onMouseEnter={() => {
                      isHoveringRef.current = true;
                    }}
                    onMouseLeave={() => {
                      isHoveringRef.current = false;
                    }}
                    onClick={() => handleDiveIntoPlanet(null)}
                  />
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 2B. Centered Focus Planet ("Life" Core or Focused Planet) */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20"
          style={{ left: cx, top: cy }}
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`focus-${activeFocusNode.id}`}
              initial={{ scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.35, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
            >
              <PlanetNode
                planet={activeFocusNode}
                health={activeFocusHealth}
                computedLevel={activeFocusLevel}
                size={focusDiscSize}
                isFocus
                childCount={childrenIds.length}
                onMouseEnter={() => {
                  isHoveringRef.current = true;
                }}
                onMouseLeave={() => {
                  isHoveringRef.current = false;
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 2C. Orbiting Child Planets */}
        <AnimatePresence>
          {positions.map((pos) => {
            const planet = universe.planets[pos.planetId];
            if (!planet) return null;
            const health = computePlanetHealth(planet, universe);
            const level = computePlanetLevel(planet, universe);

            return (
              <div
                key={pos.planetId}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20"
                style={{
                  left: cx + pos.x,
                  top: cy + pos.y,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.35 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.35 }}
                  transition={{
                    type: "spring",
                    stiffness: 240,
                    damping: 22,
                  }}
                >
                  <PlanetNode
                    planet={planet}
                    health={health}
                    computedLevel={level}
                    size={childDiscSize}
                    childCount={planet.childrenIds.length}
                    onMouseEnter={() => {
                      isHoveringRef.current = true;
                    }}
                    onMouseLeave={() => {
                      isHoveringRef.current = false;
                    }}
                    onClick={() => handleDiveIntoPlanet(pos.planetId)}
                  />
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>

        {/* 2D. Contextual In-Orbit Satellite Forge Node */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20"
          style={{
            left: cx + forgeSlotPos.x,
            top: cy + forgeSlotPos.y,
          }}
        >
          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.94 }}
            onMouseEnter={() => {
              isHoveringRef.current = true;
            }}
            onMouseLeave={() => {
              isHoveringRef.current = false;
            }}
            onClick={() => onOpenForgeModal(focusPlanetId)}
            className="group flex flex-col items-center cursor-pointer focus:outline-none"
            title={`Launch new planet into ${activeFocusNode.name} orbit`}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center border border-dashed border-amber-400/50 bg-[#0D0F0E]/85 text-amber-300 group-hover:scale-110 group-hover:border-amber-300 transition-all shadow-[0_0_20px_rgba(229,169,60,0.2)]"
            >
              <Plus size={18} />
            </div>
            <span
              className="mt-1.5 px-2 py-0.5 rounded-full bg-black/60 border border-amber-400/25 text-amber-300 text-[11px] font-outfit whitespace-nowrap"
            >
              + Orbit {activeFocusNode.name}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Layer 3: Bottom-Left Spatial Compass & Orbit Controls */}
      <div className="fixed bottom-6 left-6 z-30 flex items-center gap-3 pointer-events-auto">
        <div className="hud-panel px-4 py-2.5 flex items-center gap-3.5 text-xs text-slate-300 font-outfit">
          <div className="flex items-center gap-2">
            <span className="text-teal-400">🧭</span>
            <span className="text-slate-400">Focus:</span>
            <span
              className="text-slate-100 font-semibold text-sm font-fraunces"
            >
              {activeFocusNode.name}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          <span className="text-teal-400/90 font-outfit">
            {childrenIds.length} {childrenIds.length === 1 ? "body" : "bodies"} in orbit
          </span>

          <span className="text-slate-700">|</span>

          <button
            onClick={() => setIsOrbitPaused((p) => !p)}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-teal-400/15 border border-white/10 text-slate-300 hover:text-teal-300 transition-all cursor-pointer font-outfit"
          >
            {isOrbitPaused ? "▶ Resume Orbit" : "⏸ Pause Orbit"}
          </button>
        </div>

        <button
          onClick={() => onOpenForgeModal(focusPlanetId)}
          className="hud-panel px-4 py-2.5 flex items-center gap-2 text-xs font-medium text-amber-300 hover:text-amber-200 hover:border-amber-400/50 transition-all cursor-pointer hover:scale-105 font-outfit"
        >
          <span>✨</span>
          <span>New Satellite in {activeFocusNode.name}</span>
        </button>
      </div>
    </div>
  );
}
