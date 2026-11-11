"use client";

import React, { useState } from "react";
import {
  Activity,
  Compass,
  Layers,
  Shield,
  Sparkles,
  Command,
  ChevronRight,
  ArrowUpRight,
  Sliders,
  BarChart3,
  Clock,
  CheckCircle2,
  Orbit,
  Bell,
  Search,
  Zap,
} from "lucide-react";

/**
 * Reusable Glassmorphism Token Classes:
 * -------------------------------------------------------------
 * glass-surface:
 *   - Fill: bg-white/[0.04] to bg-white/[0.07]
 *   - Filter: backdrop-blur-xl (16-24px) + backdrop-saturate-150
 *   - Refraction Border: 1px border with bright top highlight (border-t-white/25 vs border-white/10)
 *   - Specular Shadow: dual-layer ambient shadow + inset top bevel highlight
 */
const GLASS_BASE =
  "bg-white/[0.05] hover:bg-white/[0.07] backdrop-blur-xl backdrop-saturate-150 border border-white/10 border-t-white/25 shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.18)] transition-all duration-300";

const GLASS_HERO =
  "bg-white/[0.04] backdrop-blur-2xl backdrop-saturate-150 border border-white/10 border-t-white/30 shadow-[0_30px_70px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.22)]";

const GLASS_PILL =
  "bg-white/[0.06] hover:bg-white/[0.10] backdrop-blur-lg backdrop-saturate-150 border border-white/15 border-t-white/30 shadow-[0_8px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.25)] transition-all duration-200";

export default function GlassConsole() {
  const [activeNav, setActiveNav] = useState("overview");

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#080A0B] text-slate-100 font-sans selection:bg-emerald-400 selection:text-black">
      {/* ============================================================
          1. ATMOSPHERE: Biophilic Ink Backdrop with 2 Ambient Light-Wells
          ============================================================ */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {/* Light-Well 1: Deep biophilic emerald-cyan glow (top-left) */}
        <div className="absolute -top-[15%] -left-[10%] w-[680px] h-[680px] sm:w-[850px] sm:h-[850px] rounded-full bg-emerald-500/[0.13] blur-[130px] transform-gpu" />

        {/* Light-Well 2: Deep celestial cyan-azure glow (bottom-right) */}
        <div className="absolute -bottom-[15%] -right-[10%] w-[700px] h-[700px] sm:w-[900px] sm:h-[900px] rounded-full bg-cyan-500/[0.11] blur-[150px] transform-gpu" />

        {/* Subtle mid-ground warm amber resonance to enrich specular dispersion */}
        <div className="absolute top-[35%] right-[20%] w-[450px] h-[450px] rounded-full bg-amber-500/[0.04] blur-[110px] transform-gpu" />

        {/* Subtle micro-grid texture for depth perception */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* ============================================================
          2. MAIN RESPONSIVE CONTAINER & SHELL
          ============================================================ */}
      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row p-3 sm:p-5 lg:p-7 gap-5 max-w-[1720px] mx-auto">
        
        {/* ============================================================
            3. SIDEBAR: Frosted Glass Command Dock
            ============================================================ */}
        <aside className={`w-full lg:w-72 xl:w-80 flex-shrink-0 flex flex-col rounded-3xl ${GLASS_HERO} p-5 lg:p-6 justify-between`}>
          <div className="space-y-7">
            {/* Brand Anchor */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-black font-bold shadow-[0_0_24px_rgba(52,211,153,0.45)]">
                  <Orbit className="w-5 h-5 text-[#080A0B]" />
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                    Aether OS
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </h1>
                  <p className="text-xs font-mono text-slate-400">v4.8 // Bio-Console</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <a
                  href="/"
                  className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                  title="Return to 2D Orbital Solar System Atlas"
                >
                  <span>🪐 Atlas</span>
                </a>
                <button className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300">
                  <Command className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Context Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                readOnly
                placeholder="Jump to node (⌘K)..."
                className="w-full pl-9.5 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 cursor-pointer shadow-inner"
              />
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1.5">
              {[
                { id: "overview", label: "Frontier Overview", icon: Compass, count: "Active" },
                { id: "telemetry", label: "Vitality Telemetry", icon: Activity, count: "98%" },
                { id: "missions", label: "Orbit Workspaces", icon: Layers, count: "7" },
                { id: "sovereignty", label: "Sovereignty Ledger", icon: Shield, count: null },
                { id: "automation", label: "Cognitive Workers", icon: Zap, count: "3" },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-white/[0.12] text-white border border-white/25 border-t-white/40 shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.3)] font-semibold"
                        : "text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? "text-emerald-300" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.count && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/30"
                            : "bg-white/5 text-slate-400 border border-white/5"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Telemetry Health Capsule */}
          <div className="pt-6 border-t border-white/10 mt-6 lg:mt-0">
            <div className={`p-3.5 rounded-2xl ${GLASS_BASE}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Core Equilibrium</span>
                <span className="text-xs font-mono font-bold text-emerald-300">94.8%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 w-[94.8%]" />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                All 6 planetary nodes in sync
              </p>
            </div>
          </div>
        </aside>

        {/* ============================================================
            4. MAIN WORKSPACE CONTENT: HERO CONTAINER + CARDS
            ============================================================ */}
        <main className="flex-1 flex flex-col gap-5 min-w-0">
          
          {/* ============================================================
              4A. HERO CONTAINER: High-Contrast Frosted Command Center
              ============================================================ */}
          <section className={`relative rounded-3xl ${GLASS_HERO} p-6 sm:p-8 lg:p-10 overflow-hidden`}>
            {/* Top specular refraction highlight line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            {/* Corner ambient glow accent */}
            <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/[0.12] rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-2xl space-y-3">
                {/* Status Eyebrow Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/25 text-emerald-300 text-xs font-mono font-medium shadow-[0_0_16px_rgba(16,185,129,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>BIOPHILIC CONSOLE // ONLINE</span>
                </div>

                {/* Primary Hero Heading */}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Calibrated High-Altitude Intelligence
                </h2>

                {/* Secondary Copy (WCAG AA Legible) */}
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                  Synthesize multi-frontier project orbits, cognitive strain metrics, and daily energy allocation through real-time diffused sensory optics.
                </p>
              </div>

              {/* Quick Hero Actions */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                <button className="px-5 py-3 rounded-2xl bg-white text-[#080A0B] hover:bg-slate-100 font-semibold text-xs sm:text-sm shadow-[0_12px_30px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-pointer flex items-center gap-2 active:scale-95">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Synthesize Pulse</span>
                </button>
                <button className={`px-4 py-3 rounded-2xl ${GLASS_PILL} text-white font-medium text-xs sm:text-sm flex items-center gap-2 cursor-pointer active:scale-95`}>
                  <Sliders className="w-4 h-4 text-slate-300" />
                  <span>Calibrate Horizon</span>
                </button>
              </div>
            </div>

            {/* Tabular Telemetry Ribbon */}
            <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Active Orbit Mass", val: "14.2 AU", delta: "+8% velocity" },
                { label: "Cognitive Load", val: "38%", delta: "-12% strain" },
                { label: "Sovereignty Score", val: "4.8 / 5", delta: "Peak autonomy" },
                { label: "Mission Velocity", val: "192 XP", delta: "7 completed" },
              ].map((stat, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
                  <p className="text-lg sm:text-xl font-bold font-mono text-white tabular-nums tracking-tight">
                    {stat.val}
                  </p>
                  <p className="text-[11px] text-emerald-400 font-mono">{stat.delta}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ============================================================
              4B. RESPONSIVE FROSTED GLASS CARDS
              ============================================================ */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            
            {/* CARD 1: Vitality & Energy Flux */}
            <article className={`rounded-3xl ${GLASS_BASE} p-6 flex flex-col justify-between space-y-6 group`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-300">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide">Vitality Horizon</h3>
                      <p className="text-[11px] text-slate-400">Sleep & Restorative Balance</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                    Live
                  </span>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold font-mono text-white tracking-tight">4.2</span>
                    <span className="text-xs font-mono text-emerald-300 font-semibold">+0.6 vs 7d avg</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden mt-3">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 w-[84%]" />
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Circadian recovery is above baseline. Optimal window for deep architectural execution open until 16:00.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> 7.8 hrs sleep logged
                </span>
                <span className="text-emerald-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1">
                  Details <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </article>

            {/* CARD 2: Active Gravitational Frontier */}
            <article className={`rounded-3xl ${GLASS_BASE} p-6 flex flex-col justify-between space-y-6 group`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide">Prime Frontier</h3>
                      <p className="text-[11px] text-slate-400">Sector: Core Engine V4</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-200">
                    Orbit High
                  </span>
                </div>

                {/* Sub-item stack */}
                <div className="space-y-2 pt-2">
                  {[
                    { task: "Refactor Shader pipeline", done: true, time: "45m" },
                    { task: "Verify WCAG 2.1 AA tokens", done: true, time: "30m" },
                    { task: "Ship frosted glass layout", done: false, time: "15m" },
                  ].map((sub, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs"
                    >
                      <span className={`flex items-center gap-2 ${sub.done ? "text-slate-400 line-through" : "text-white font-medium"}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${sub.done ? "text-emerald-400" : "text-slate-500"}`} />
                        {sub.task}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{sub.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>2 of 3 milestones sealed</span>
                <span className="text-cyan-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1">
                  Advance <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </article>

            {/* CARD 3: Cognitive Allocation & Sovereignty */}
            <article className={`rounded-3xl ${GLASS_BASE} p-6 flex flex-col justify-between space-y-6 group md:col-span-2 xl:col-span-1`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide">Sovereignty Shield</h3>
                      <p className="text-[11px] text-slate-400">Autonomy & Deep Work Ratio</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-200">
                    Defended
                  </span>
                </div>

                <div className="pt-2 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">Deep Work vs Reactive Meetings</span>
                      <span className="font-mono font-bold text-white">82%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-amber-400 w-[82%]" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">Context Switching Resistance</span>
                      <span className="font-mono font-bold text-white">91%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-teal-400 w-[91%]" />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Zero calendar collisions registered today. Uninterrupted flow-state maintained for 3h 40m.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-emerald-400">+18% vs Last Cycle</span>
                <span className="text-amber-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1">
                  Audit <BarChart3 className="w-3.5 h-3.5" />
                </span>
              </div>
            </article>

          </div>
        </main>
      </div>
    </div>
  );
}
