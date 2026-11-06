// ============================================================
// IdeMap — Mobile Orbital Stack (Thumb-Friendly Vertical Orbs)
// ============================================================
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useIdeMapStore } from "@/lib/store";
import {
  computePlanetHealth,
  computePlanetLevel,
  healthColorHex,
} from "@/lib/health";
import { DynamicIcon } from "@/components/nodes/PlanetNode";
import { ChevronRight, Plus, ChevronLeft } from "lucide-react";

interface MobileStackProps {
  onOpenTelemetry: () => void;
  onOpenForgeModal: (parentId: string | null) => void;
}

export default function MobileStack({
  onOpenTelemetry,
  onOpenForgeModal,
}: MobileStackProps) {
  const { universe, focusPlanetId, setFocusPlanet } = useIdeMapStore();

  const focusPlanet = focusPlanetId ? universe.planets[focusPlanetId] : null;
  const displayIds = focusPlanet ? focusPlanet.childrenIds : universe.planetIds;

  return (
    <div className="absolute inset-0 flex flex-col pt-24 pb-8 overflow-y-auto px-4 gap-3 z-20">
      {/* Focused Planet Header Card */}
      <AnimatePresence>
        {focusPlanet && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="hud-panel px-4 py-3.5 flex items-center gap-3"
          >
            <button
              onClick={() => setFocusPlanet(focusPlanet.parentId)}
              className="p-2 rounded-full bg-white/5 text-slate-300 hover:text-teal-300"
            >
              <ChevronLeft size={16} />
            </button>
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: focusPlanet.color,
                boxShadow: `0 0 16px ${focusPlanet.color}88`,
              }}
            >
              <DynamicIcon name={focusPlanet.icon} size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-slate-100 text-base font-semibold truncate"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {focusPlanet.name}
              </p>
              <p className="text-xs text-slate-400 font-outfit">
                {computePlanetHealth(focusPlanet, universe).score}% Health · Lv{" "}
                {computePlanetLevel(focusPlanet, universe).toFixed(1)}
              </p>
            </div>
            <button
              onClick={onOpenTelemetry}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-teal-400/15 text-teal-300 border border-teal-400/30 font-outfit"
            >
              Telemetry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glowing Orb Stack */}
      {displayIds.map((id, i) => {
        const planet = universe.planets[id];
        if (!planet) return null;
        const health = computePlanetHealth(planet, universe);
        const level = computePlanetLevel(planet, universe);
        const hex = healthColorHex(health.color);
        const openTasks = planet.tasks.filter((t) => !t.completed).length;

        return (
          <motion.div
            key={id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => {
              setFocusPlanet(id);
              onOpenTelemetry();
            }}
            className="hud-panel flex items-center gap-3.5 px-4 py-3.5 w-full text-left active:scale-98 transition-transform cursor-pointer"
          >
            <div className="relative flex-shrink-0">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: planet.color,
                  boxShadow: `0 0 16px ${planet.color}66`,
                }}
              >
                <DynamicIcon name={planet.icon} size={22} />
              </div>
              <svg
                className="absolute inset-0 w-12 h-12 -rotate-90"
                viewBox="0 0 48 48"
              >
                <circle
                  cx={24}
                  cy={24}
                  r={22}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={3}
                />
                <circle
                  cx={24}
                  cy={24}
                  r={22}
                  fill="none"
                  stroke={hex}
                  strokeWidth={3}
                  strokeDasharray={`${(health.score / 100) * 138} 138`}
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="text-base text-slate-100 font-semibold truncate"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {planet.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-outfit" style={{ color: hex }}>
                  {health.score}%
                </span>
                <span className="text-xs text-amber-300/90 font-outfit">
                  Lv {level.toFixed(1)}
                </span>
                {openTasks > 0 && (
                  <span className="text-xs text-slate-400 font-outfit">
                    · {openTasks} task{openTasks !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <ChevronRight size={18} className="text-slate-500 flex-shrink-0" />
          </motion.div>
        );
      })}

      {/* Add Satellite Button in Stack */}
      <button
        onClick={() => onOpenForgeModal(focusPlanetId)}
        className="hud-panel py-3 px-4 flex items-center justify-center gap-2 text-xs font-medium text-amber-300 border-dashed border-amber-400/40"
      >
        <Plus size={15} />
        <span>
          Launch Satellite into {focusPlanet ? focusPlanet.name : universe.name}
        </span>
      </button>
    </div>
  );
}
