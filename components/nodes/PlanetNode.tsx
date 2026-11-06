// ============================================================
// IdeMap — Celestial Planet Node Component
// ============================================================
"use client";

import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import type { Planet, ComputedPlanetHealth } from "@/lib/types";
import { healthColorHex } from "@/lib/health";

interface PlanetNodeProps {
  planet: Planet;
  health: ComputedPlanetHealth;
  computedLevel?: number;
  size?: number; // exact disc diameter in px
  isFocus?: boolean;
  isParent?: boolean;
  childCount?: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
}

/** SVG Radial Health Ring Gauge */
function HealthRingArc({
  score,
  color,
  size,
  strainActive,
  isFocus,
}: {
  score: number;
  color: "green" | "amber" | "red";
  size: number;
  strainActive: boolean;
  isFocus: boolean;
}) {
  const strokeColor = healthColorHex(color);
  const pad = isFocus ? 18 : 14;
  const r = size / 2 + (isFocus ? 9 : 7);
  const strokeW = isFocus ? 3.5 : 2.75;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  const svgDim = size + pad * 2;
  const center = svgDim / 2;

  return (
    <svg
      className="absolute pointer-events-none"
      width={svgDim}
      height={svgDim}
      style={{ top: -pad, left: -pad }}
      aria-hidden
    >
      {/* Outer decorative astrolabe ring on Focus node */}
      {isFocus && (
        <circle
          cx={center}
          cy={center}
          r={r + 8}
          fill="none"
          stroke="rgba(45, 212, 191, 0.18)"
          strokeWidth="1"
          strokeDasharray="3 7"
        />
      )}

      {/* Ring background track */}
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth={strokeW}
      />

      {/* Active Health Arc */}
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeW}
        strokeDasharray={`${filled} ${Math.max(0, circumference - filled)}`}
        strokeDashoffset={circumference / 4}
        strokeLinecap="round"
        style={{
          transition: "stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          filter: `drop-shadow(0 0 6px ${strokeColor}88)`,
        }}
        className={strainActive ? "strain-pulse" : undefined}
      />

      {/* Pulsing Crimson Strain Segment */}
      {strainActive && (
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="#EF4444"
          strokeWidth={strokeW + 0.8}
          strokeDasharray={`${circumference * 0.22} ${circumference * 0.78}`}
          strokeDashoffset={circumference * 0.15}
          strokeLinecap="round"
          className="strain-pulse"
          style={{ filter: "drop-shadow(0 0 8px #EF4444)" }}
        />
      )}
    </svg>
  );
}

/** Dynamic Lucide Icon / Symbol Renderer */
export function DynamicIcon({
  name,
  size,
  color = "white",
}: {
  name: string;
  size: number;
  color?: string;
}) {
  // If name is an emoji or symbol character
  if (name && (/^\p{Emoji}|\p{Extended_Pictographic}/u.test(name) || name.length <= 2)) {
    return (
      <span style={{ fontSize: Math.round(size * 0.92), lineHeight: 1 }}>
        {name}
      </span>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (LucideIcons as any)[name] as
    | React.FC<{ size: number; color: string; strokeWidth?: number }>
    | undefined;
  if (!Icon) return <LucideIcons.Sparkles size={size} color={color} strokeWidth={1.8} />;
  return <Icon size={size} color={color} strokeWidth={1.8} />;
}

export default function PlanetNode({
  planet,
  health,
  computedLevel,
  size = 76,
  isFocus = false,
  isParent = false,
  childCount = 0,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className = "",
}: PlanetNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const displayLevel = computedLevel ?? planet.level;

  const triggerGlow = useCallback(() => {
    const el = nodeRef.current;
    if (!el) return;
    el.classList.remove("planet-glow-pulse");
    void el.offsetWidth;
    el.classList.add("planet-glow-pulse");
    const cleanup = () => el.classList.remove("planet-glow-pulse");
    el.addEventListener("animationend", cleanup, { once: true });
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      triggerGlow();
      onClick?.();
    },
    [onClick, triggerGlow]
  );

  const glowColor =
    health.color === "green"
      ? "rgba(45, 212, 191, 0.34)"
      : health.color === "amber"
      ? "rgba(245, 158, 11, 0.34)"
      : "rgba(239, 68, 68, 0.38)";

  return (
    <motion.div
      className={`group relative flex items-center justify-center cursor-pointer no-select ${className}`}
      style={{ width: size, height: size }}
      whileHover={{ scale: isFocus ? 1.04 : 1.12 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Ambient diffuse radial node glow */}
      <div
        className="absolute rounded-full pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-85"
        style={{
          width: size * 1.9,
          height: size * 1.9,
          top: -(size * 0.45),
          left: -(size * 0.45),
          background: `radial-gradient(circle, ${planet.color}55 0%, ${glowColor} 38%, transparent 72%)`,
        }}
      />

      {/* Mini revolving moon indicators if this orbiting planet has children */}
      {!isFocus && !isParent && childCount > 0 && (
        <div
          className="absolute rounded-full border border-teal-400/20 pointer-events-none animate-spin"
          style={{
            width: size + 28,
            height: size + 28,
            top: -14,
            left: -14,
            animationDuration: "14s",
          }}
        >
          <span
            className="absolute w-2.5 h-2.5 rounded-full bg-teal-300 shadow-[0_0_8px_#2DD4BF]"
            style={{ top: -5, left: "50%", transform: "translateX(-50%)" }}
          />
          {childCount > 1 && (
            <span
              className="absolute w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_#F59E0B]"
              style={{ bottom: -4, left: "50%", transform: "translateX(-50%)" }}
            />
          )}
        </div>
      )}

      {/* Core Node Disc + Radial Health Ring */}
      <div
        ref={nodeRef}
        className="relative w-full h-full flex items-center justify-center"
        style={{ color: planet.color }}
      >
        <HealthRingArc
          score={health.score}
          color={health.color}
          size={size}
          strainActive={health.strainActive}
          isFocus={isFocus}
        />

        {/* Solid clean circular disc */}
        <div
          className="w-full h-full rounded-full flex items-center justify-center transition-shadow duration-300"
          style={{
            background: `radial-gradient(circle at 32% 28%, ${planet.color}ee, ${planet.color} 68%, #0D0F0E 140%)`,
            boxShadow: `0 0 26px ${glowColor}, inset 0 2px 4px rgba(255, 255, 255, 0.25), inset 0 -3px 6px rgba(0, 0, 0, 0.45)`,
          }}
        >
          <DynamicIcon
            name={planet.icon}
            size={Math.round(size * 0.42)}
            color="white"
          />
        </div>
      </div>

      {/* Fraunces Display Title & Badge (positioned below the disc without offsetting the disc center) */}
      <div className="absolute top-full mt-2 flex flex-col items-center pointer-events-none left-1/2 -translate-x-1/2 whitespace-nowrap z-30">
        <span
          className="text-center text-slate-100 tracking-wide whitespace-nowrap transition-colors group-hover:text-teal-300"
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: isFocus ? 21 : isParent ? 14 : 16,
            fontWeight: isFocus ? 600 : 500,
            textShadow: "0 2px 12px rgba(0, 0, 0, 0.95)",
          }}
        >
          {isParent ? `← ${planet.name}` : planet.name}
        </span>

        {/* Telemetry Micro-Pill */}
        <div className="mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/70 border border-white/10 backdrop-blur-sm">
          <span
            className="font-medium font-outfit"
            style={{
              color: healthColorHex(health.color),
              fontSize: isFocus ? 12 : 11,
            }}
          >
            {health.score}%
          </span>
          <span className="text-slate-600 text-[10px]">·</span>
          <span
            className="text-amber-300/90 font-outfit"
            style={{ fontSize: isFocus ? 12 : 11 }}
          >
            Lv {displayLevel.toFixed(1)}
          </span>
          {childCount > 0 && !isFocus && (
            <>
              <span className="text-slate-600 text-[10px]">·</span>
              <span className="text-teal-300/90 font-outfit text-[11px]">
                {childCount} in orbit
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
