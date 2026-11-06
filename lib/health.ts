// ============================================================
// IdeMap — Health, Level & Telemetry Calculation Engine
// ============================================================

import type { Planet, Universe, ComputedPlanetHealth } from "./types";

const OVERDUE_PENALTY = 15; // points per overdue task
const STRAIN_PENALTY = 25; // points per active strain flag

export function isTaskOverdue(dueDate: string | undefined): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

/** Compute health for a leaf planet (no children) */
function computeLeafHealth(planet: Planet): number {
  const openTasks = planet.tasks.filter((t) => !t.completed);
  const overdueTasks = openTasks.filter((t) => isTaskOverdue(t.dueDate));
  let score = 100;
  score -= overdueTasks.length * OVERDUE_PENALTY;
  if (planet.strainFlags.financial) score -= STRAIN_PENALTY;
  if (planet.strainFlags.psychological) score -= STRAIN_PENALTY;
  return Math.max(0, Math.min(100, score));
}

/** Compute health for a parent planet (average of direct children, minus own strain flags) */
function computeParentHealth(planet: Planet, universe: Universe): number {
  const children = planet.childrenIds
    .map((id) => universe.planets[id])
    .filter(Boolean);
  if (children.length === 0) return computeLeafHealth(planet);
  const avg =
    children.reduce((sum, child) => sum + computeRawHealth(child, universe), 0) /
    children.length;
  let score = Math.round(avg);
  if (planet.strainFlags.financial) score -= STRAIN_PENALTY;
  if (planet.strainFlags.psychological) score -= STRAIN_PENALTY;
  return Math.max(0, Math.min(100, score));
}

function computeRawHealth(planet: Planet, universe: Universe): number {
  if (planet.healthOverride !== null) return planet.healthOverride;
  if (planet.childrenIds.length > 0) return computeParentHealth(planet, universe);
  return computeLeafHealth(planet);
}

export function computePlanetHealth(
  planet: Planet,
  universe: Universe
): ComputedPlanetHealth {
  const score = computeRawHealth(planet, universe);
  const childStrain = planet.childrenIds.some((cid) => {
    const c = universe.planets[cid];
    return c && (c.strainFlags.financial || c.strainFlags.psychological);
  });
  const strainActive =
    planet.strainFlags.financial || planet.strainFlags.psychological || childStrain;

  let color: "green" | "amber" | "red";
  if (score >= 70 && !planet.strainFlags.financial && !planet.strainFlags.psychological) {
    color = "green";
  } else if (score >= 45) {
    color = "amber";
  } else {
    color = "red";
  }

  return {
    score,
    color,
    isOverridden: planet.healthOverride !== null,
    strainActive,
  };
}

/** Compute level for a planet (Leaf = own level; Parent = average of direct children's levels) */
export function computePlanetLevel(planet: Planet, universe: Universe): number {
  const children = planet.childrenIds
    .map((id) => universe.planets[id])
    .filter(Boolean);
  if (children.length === 0) {
    return Number(planet.level.toFixed(1));
  }
  const avg =
    children.reduce((sum, child) => sum + computePlanetLevel(child, universe), 0) /
    children.length;
  return Number(avg.toFixed(1));
}

/** Compute overall Universe health (average of top-level planets) */
export function computeUniverseHealth(universe: Universe): ComputedPlanetHealth {
  const topPlanets = universe.planetIds
    .map((id) => universe.planets[id])
    .filter(Boolean);
  if (topPlanets.length === 0) {
    return { score: 100, color: "green", isOverridden: false, strainActive: false };
  }
  const avg = Math.round(
    topPlanets.reduce((sum, p) => sum + computePlanetHealth(p, universe).score, 0) /
      topPlanets.length
  );
  const strainActive = topPlanets.some(
    (p) => computePlanetHealth(p, universe).strainActive
  );
  const color: "green" | "amber" | "red" =
    avg >= 70 ? "green" : avg >= 45 ? "amber" : "red";
  return { score: avg, color, isOverridden: false, strainActive };
}

/** Compute overall Universe level (average of top-level planets) */
export function computeUniverseLevel(universe: Universe): number {
  const topPlanets = universe.planetIds
    .map((id) => universe.planets[id])
    .filter(Boolean);
  if (topPlanets.length === 0) return 1.0;
  const avg =
    topPlanets.reduce((sum, p) => sum + computePlanetLevel(p, universe), 0) /
    topPlanets.length;
  return Number(avg.toFixed(1));
}

export function healthColorHex(color: "green" | "amber" | "red"): string {
  switch (color) {
    case "green":
      return "#2DD4BF";
    case "amber":
      return "#F59E0B";
    case "red":
      return "#EF4444";
  }
}

/** Compute XP earned for completing a task */
export function taskXP(difficulty: 1 | 2 | 3 | 4 | 5): number {
  return difficulty * 12;
}
