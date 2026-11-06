// ============================================================
// IdeMap — Orbital Layout Hook
// ============================================================
"use client";

import { useMemo } from "react";
import type { OrbitalPosition } from "@/lib/types";

interface UseOrbitalLayoutOptions {
  childrenIds: string[];
  radius?: number;
  startAngleDeg?: number;
}

export function useOrbitalLayout({
  childrenIds,
  radius = 220,
  startAngleDeg = -90,
}: UseOrbitalLayoutOptions): OrbitalPosition[] {
  return useMemo(() => {
    const n = childrenIds.length;
    if (n === 0) return [];

    return childrenIds.map((id, i) => {
      const angle = startAngleDeg + (360 / n) * i;
      const rad = (angle * Math.PI) / 180;
      return {
        planetId: id,
        x: Math.round(Math.cos(rad) * radius),
        y: Math.round(Math.sin(rad) * radius),
        angle,
      };
    });
  }, [childrenIds, radius, startAngleDeg]);
}
