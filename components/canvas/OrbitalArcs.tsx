// ============================================================
// IdeMap — Ethereal Vector Orbital Arcs & Astrolabe Geometry
// ============================================================
"use client";

import type { OrbitalPosition } from "@/lib/types";

interface OrbitalArcsProps {
  positions: OrbitalPosition[];
  centerX: number;
  centerY: number;
  orbitRadius: number;
  width: number;
  height: number;
  waybackPos?: { x: number; y: number } | null;
  forgeSlotPos?: { x: number; y: number; angle: number } | null;
}

export default function OrbitalArcs({
  positions,
  centerX,
  centerY,
  orbitRadius,
  width,
  height,
  waybackPos,
  forgeSlotPos,
}: OrbitalArcsProps) {
  const innerRadius = Math.round(orbitRadius * 0.42);
  const outerRadius = Math.round(orbitRadius * 1.24);

  // 36 degree ticks around the main orbital ring
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const deg = i * 10;
    const rad = (deg * Math.PI) / 180;
    const isMajor = i % 3 === 0;
    const r1 = orbitRadius - (isMajor ? 7 : 3);
    const r2 = orbitRadius + (isMajor ? 7 : 3);
    return {
      x1: centerX + Math.cos(rad) * r1,
      y1: centerY + Math.sin(rad) * r1,
      x2: centerX + Math.cos(rad) * r2,
      y2: centerY + Math.sin(rad) * r2,
      isMajor,
    };
  });

  return (
    <svg
      className="absolute inset-0 pointer-events-none no-select"
      width={width}
      height={height}
      style={{ zIndex: 1 }}
      aria-hidden
    >
      <defs>
        <radialGradient id="coreCorona" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(45, 212, 191, 0.14)" />
          <stop offset="55%" stopColor="rgba(45, 212, 191, 0.04)" />
          <stop offset="100%" stopColor="rgba(45, 212, 191, 0)" />
        </radialGradient>
        <linearGradient id="cyanArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(45, 212, 191, 0.28)" />
          <stop offset="100%" stopColor="rgba(45, 212, 191, 0.08)" />
        </linearGradient>
        <linearGradient id="amberArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(234, 179, 8, 0.22)" />
          <stop offset="100%" stopColor="rgba(234, 179, 8, 0.06)" />
        </linearGradient>
      </defs>

      {/* Ambient core corona disc */}
      <circle
        cx={centerX}
        cy={centerY}
        r={innerRadius * 1.35}
        fill="url(#coreCorona)"
      />

      {/* Subtle crosshair axes */}
      <line
        x1={centerX - outerRadius * 1.08}
        y1={centerY}
        x2={centerX + outerRadius * 1.08}
        y2={centerY}
        stroke="rgba(45, 212, 191, 0.04)"
        strokeWidth="1"
        strokeDasharray="3 9"
      />
      <line
        x1={centerX}
        y1={centerY - outerRadius * 1.08}
        x2={centerX}
        y2={centerY + outerRadius * 1.08}
        stroke="rgba(45, 212, 191, 0.04)"
        strokeWidth="1"
        strokeDasharray="3 9"
      />

      {/* Inner harmonic astrolabe ring */}
      <circle
        cx={centerX}
        cy={centerY}
        r={innerRadius}
        fill="none"
        stroke="rgba(45, 212, 191, 0.09)"
        strokeWidth="1"
        strokeDasharray="2 6"
      />

      {/* Primary orbital path ring */}
      <circle
        cx={centerX}
        cy={centerY}
        r={orbitRadius}
        fill="none"
        stroke="rgba(45, 212, 191, 0.14)"
        strokeWidth="1.25"
      />

      {/* Secondary offset amber orbital ring */}
      <circle
        cx={centerX}
        cy={centerY}
        r={orbitRadius + 10}
        fill="none"
        stroke="rgba(234, 179, 8, 0.07)"
        strokeWidth="1"
        strokeDasharray="8 14"
      />

      {/* Outer celestial boundary ring */}
      <circle
        cx={centerX}
        cy={centerY}
        r={outerRadius}
        fill="none"
        stroke="rgba(45, 212, 191, 0.05)"
        strokeWidth="1"
      />

      {/* Degree ticks on primary orbital track */}
      {ticks.map((t, idx) => (
        <line
          key={idx}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke={
            t.isMajor ? "rgba(45, 212, 191, 0.22)" : "rgba(45, 212, 191, 0.08)"
          }
          strokeWidth={t.isMajor ? "1.2" : "0.8"}
        />
      ))}

      {/* Parent Wayback sweeping orbital arc */}
      {waybackPos && (
        <g>
          {/* Wide sweeping parent horizon arc */}
          <path
            d={`M ${waybackPos.x} ${waybackPos.y} Q ${
              centerX - orbitRadius * 0.75
            } ${waybackPos.y + (centerY - waybackPos.y) * 0.65} ${centerX} ${centerY}`}
            fill="none"
            stroke="rgba(234, 179, 8, 0.22)"
            strokeWidth="1.75"
            strokeDasharray="6 8"
            className="arc-animated"
          />
          <path
            d={`M ${waybackPos.x - 60} ${waybackPos.y + 140} Q ${waybackPos.x} ${
              waybackPos.y
            } ${waybackPos.x + 180} ${waybackPos.y - 50}`}
            fill="none"
            stroke="rgba(45, 212, 191, 0.12)"
            strokeWidth="1.2"
          />
        </g>
      )}

      {/* Sweeping Bezier Arcs from Center Focus Planet to each Orbiting Child */}
      {positions.map((pos, i) => {
        const ex = centerX + pos.x;
        const ey = centerY + pos.y;
        const mx = (centerX + ex) / 2;
        const my = (centerY + ey) / 2;
        const perpRad = ((pos.angle + 90) * Math.PI) / 180;
        const sweep = orbitRadius * 0.34;
        const cpx = mx + Math.cos(perpRad) * sweep;
        const cpy = my + Math.sin(perpRad) * sweep;
        const isCyan = i % 2 === 0;

        return (
          <g key={pos.planetId}>
            {/* Soft background glow curve */}
            <path
              d={`M ${centerX} ${centerY} Q ${cpx} ${cpy} ${ex} ${ey}`}
              fill="none"
              stroke={
                isCyan
                  ? "rgba(45, 212, 191, 0.14)"
                  : "rgba(234, 179, 8, 0.10)"
              }
              strokeWidth="2"
            />
            {/* Animated flowing telemetry stream along the arc */}
            <path
              d={`M ${centerX} ${centerY} Q ${cpx} ${cpy} ${ex} ${ey}`}
              fill="none"
              stroke={
                isCyan
                  ? "rgba(45, 212, 191, 0.32)"
                  : "rgba(234, 179, 8, 0.26)"
              }
              strokeWidth="1.5"
              className="arc-animated"
            />
          </g>
        );
      })}

      {/* Subtle arc to the in-orbit Forge Slot */}
      {forgeSlotPos && (
        <path
          d={`M ${centerX} ${centerY} L ${centerX + forgeSlotPos.x} ${
            centerY + forgeSlotPos.y
          }`}
          fill="none"
          stroke="rgba(229, 169, 60, 0.12)"
          strokeWidth="1"
          strokeDasharray="3 7"
        />
      )}
    </svg>
  );
}
