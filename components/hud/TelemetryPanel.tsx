// ============================================================
// IdeMap — Right Telemetry & Drawer HUD Panel (Matching Preview Spec)
// ============================================================
"use client";

import { useState } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useIdeMapStore } from "@/lib/store";
import {
  computePlanetHealth,
  computePlanetLevel,
  computeUniverseHealth,
  computeUniverseLevel,
  healthColorHex,
} from "@/lib/health";
import { playFocus, playTaskComplete } from "@/lib/audio";
import { DynamicIcon } from "@/components/nodes/PlanetNode";

interface TelemetryPanelProps {
  planetId: string | null; // null = Universe "Life" Core
  onOpenForgeModal: (parentId: string | null) => void;
}

/** Circular Radial Health Metric Gauge (SVG) */
function HealthGauge({
  score,
  color,
}: {
  score: number;
  color: "green" | "amber" | "red";
}) {
  const hex = healthColorHex(color);
  const size = 90;
  const r = 36;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;

  return (
    <div className="relative w-[90px] h-[90px] flex items-center justify-center flex-shrink-0">
      <svg className="w-[90px] h-[90px] -rotate-90">
        <circle
          cx={45}
          cy={45}
          r={r}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={6}
        />
        <circle
          cx={45}
          cy={45}
          r={r}
          fill="none"
          stroke={hex}
          strokeWidth={6}
          strokeDasharray={`${filled} ${Math.max(0, c - filled)}`}
          strokeDashoffset={c / 4}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 8px ${hex}88)`,
            transition: "stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="text-2xl font-semibold leading-none font-outfit"
          style={{ color: hex }}
        >
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5 font-outfit">
          Health
        </span>
      </div>
    </div>
  );
}

export default function TelemetryPanel({
  planetId,
  onOpenForgeModal,
}: TelemetryPanelProps) {
  const {
    universe,
    setFocusPlanet,
    completeTask,
    toggleStrain,
    soundEnabled,
  } = useIdeMapStore();

  const planet = planetId ? universe.planets[planetId] : null;
  const isUniverseRoot = planet === null;

  // Computed telemetry for either the focused planet or the "Life" root core
  const health = planet
    ? computePlanetHealth(planet, universe)
    : computeUniverseHealth(universe);
  const level = planet
    ? computePlanetLevel(planet, universe)
    : computeUniverseLevel(universe);

  const childrenIds = planet ? planet.childrenIds : universe.planetIds;
  const childPlanets = childrenIds
    .map((cid) => universe.planets[cid])
    .filter(Boolean);

  // Direct tasks
  const openTasks = planet ? planet.tasks.filter((t) => !t.completed) : [];

  // Child tasks in orbit
  const childTasks = childrenIds.flatMap((cid) => {
    const cp = universe.planets[cid];
    if (!cp) return [];
    return cp.tasks.filter((t) => !t.completed);
  });

  // All tasks to display in the single continuous feed
  const allTasksToDisplay = [
    ...(planet ? planet.tasks.map((t) => ({ ...t, pName: planet.name, pColor: planet.color })) : []),
    ...childrenIds.flatMap((cid) => {
      const cp = universe.planets[cid];
      if (!cp) return [];
      return cp.tasks.map((t) => ({ ...t, pName: cp.name, pColor: cp.color }));
    }),
  ];

  const displayName = planet ? planet.name : universe.name;
  const displayColor = planet ? planet.color : "#0F766E";
  const displayIcon = planet ? planet.icon : "☀️";
  const parentPlanet = planet?.parentId
    ? universe.planets[planet.parentId]
    : null;

  function handleCheckTask(tPlanetId: string, taskId: string, isChecked: boolean) {
    if (isChecked) {
      completeTask(tPlanetId, taskId);
      if (soundEnabled) playTaskComplete();
    }
  }

  return (
    <motion.aside
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="hud-panel fixed right-6 top-6 bottom-6 w-[370px] xl:w-[420px] z-40 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]"
    >
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-teal-400/15 bg-white/[0.015]">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-base flex-shrink-0"
            style={{
              background: displayColor,
              boxShadow: `0 0 16px ${displayColor}88`,
            }}
          >
            <DynamicIcon name={displayIcon} size={18} color="white" />
          </div>
          <div className="min-w-0">
            <h2
              className="text-xl font-semibold text-slate-100 font-fraunces truncate"
            >
              {displayName}
            </h2>
            <p className="text-xs text-slate-400 font-outfit">
              {isUniverseRoot
                ? "Solar System Core · Overview"
                : parentPlanet
                ? `Orbiting ${parentPlanet.name}`
                : `Orbiting ${universe.name}`}
            </p>
          </div>
        </div>

        {/* Back up one orbital level button when inside a planet */}
        {!isUniverseRoot && (
          <button
            onClick={() => {
              if (soundEnabled) playFocus();
              setFocusPlanet(planet?.parentId ?? null);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 hover:bg-teal-400/15 border border-white/10 hover:border-teal-400/40 text-xs text-slate-300 hover:text-teal-300 transition-all cursor-pointer font-outfit"
          >
            <ChevronLeft size={13} />
            <span>Back</span>
          </button>
        )}
      </div>

      {/* 2. Telemetry Header Card */}
      <div className="px-6 py-5 border-b border-teal-400/15">
        <div className="flex items-center gap-5">
          <HealthGauge score={health.score} color={health.color} />

          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-[11px] text-slate-400 font-outfit uppercase tracking-wider">
                  HEALTH
                </p>
                <p
                  className="text-2xl font-semibold font-outfit mt-0.5"
                  style={{ color: healthColorHex(health.color) }}
                >
                  {health.score}
                </p>
              </div>
              <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-[11px] text-slate-400 font-outfit uppercase tracking-wider">
                  LEVEL
                </p>
                <p className="text-2xl font-semibold font-outfit text-amber-400 mt-0.5">
                  {level.toFixed(1)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] uppercase tracking-wider text-teal-400/80 font-outfit font-semibold">
                NOW
              </span>
              <span className="text-xs text-slate-300 font-outfit">
                {openTasks.length} here · {childTasks.length} in orbit
              </span>
            </div>

            {/* Accent Health Indicator Bar */}
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${health.score}%`,
                  background: healthColorHex(health.color),
                  boxShadow: `0 0 10px ${healthColorHex(health.color)}`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Strain Flags (when inside a planet) */}
        {planet && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              onClick={() => toggleStrain(planet.id, "financial")}
              className={`px-3 py-1 rounded-full text-xs border transition-all font-outfit cursor-pointer ${
                planet.strainFlags.financial
                  ? "bg-red-500/20 border-red-500/60 text-red-300 font-semibold shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                  : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              }`}
            >
              $ Financial Strain
            </button>

            <button
              onClick={() => toggleStrain(planet.id, "psychological")}
              className={`px-3 py-1 rounded-full text-xs border transition-all font-outfit cursor-pointer ${
                planet.strainFlags.psychological
                  ? "bg-red-500/20 border-red-500/60 text-red-300 font-semibold shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                  : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              }`}
            >
              🧠 Psyche Strain
            </button>
          </div>
        )}
      </div>

      {/* 3. Orbiting Satellites Strip */}
      <div className="px-6 py-3.5 border-b border-teal-400/15 bg-white/[0.01]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-outfit">
            Orbiting {displayName} ({childPlanets.length})
          </span>
          <button
            onClick={() => onOpenForgeModal(planetId)}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 transition-all cursor-pointer font-outfit"
          >
            + Add Satellite
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 hud-scroll">
          {childPlanets.map((cp) => (
            <button
              key={cp.id}
              onClick={() => {
                if (soundEnabled) playFocus();
                setFocusPlanet(cp.id);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-teal-400/15 border border-white/10 text-xs text-slate-200 flex items-center gap-2 flex-shrink-0 cursor-pointer transition-colors"
            >
              <span>{cp.icon}</span>
              <span className="font-fraunces">{cp.name}</span>
              <span className="text-teal-400 font-semibold">→</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Tasks List (Single Clean Direct Scrollable Feed) */}
      <div className="flex-1 overflow-y-auto hud-scroll px-5 py-4 space-y-2.5">
        {allTasksToDisplay.length > 0 ? (
          allTasksToDisplay.map((t) => (
            <div
              key={t.id}
              className={`p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3 transition-opacity ${
                t.completed ? "opacity-45" : "hover:border-teal-400/30"
              }`}
            >
              <input
                type="checkbox"
                checked={t.completed}
                onChange={(e) => handleCheckTask(t.planetId, t.id, e.target.checked)}
                className="w-4 h-4 accent-teal-400 cursor-pointer rounded"
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm text-slate-100 font-outfit ${
                    t.completed ? "line-through text-slate-500" : ""
                  }`}
                >
                  {t.title}
                </p>
                <span className="text-xs text-teal-400/80 font-outfit">
                  {t.pName} · Diff {t.difficulty}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500 italic text-center py-8 font-outfit">
            No tasks assigned in this orbital sector.
          </p>
        )}
      </div>
    </motion.aside>
  );
}
