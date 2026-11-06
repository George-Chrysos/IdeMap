// ============================================================
// IdeMap — Contextual Celestial Satellite Forge Modal
// ============================================================
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Orbit } from "lucide-react";
import { useIdeMapStore } from "@/lib/store";
import { playLevelUp } from "@/lib/audio";
import { DynamicIcon } from "@/components/nodes/PlanetNode";

const ICON_OPTIONS = [
  "Sprout",
  "Dumbbell",
  "BookOpen",
  "Home",
  "Briefcase",
  "Radio",
  "Gamepad2",
  "Heart",
  "Users",
  "Compass",
  "Flame",
  "Zap",
  "Globe",
  "Target",
  "Rocket",
  "Brain",
  "Music",
  "Coffee",
];

const COLOR_OPTIONS = [
  "#3B7A57",
  "#C04A4A",
  "#7A853B",
  "#4A6FA5",
  "#6B4A8A",
  "#2D7A8A",
  "#8A6B2D",
  "#8A2D5A",
  "#2D5A8A",
  "#0F766E",
  "#B45309",
  "#4F46E5",
];

interface AddPlanetModalProps {
  open: boolean;
  onClose: () => void;
  targetParentId: string | null;
}

export default function AddPlanetModal({
  open,
  onClose,
  targetParentId,
}: AddPlanetModalProps) {
  const { universe, addPlanet, soundEnabled } = useIdeMapStore();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Compass");
  const [color, setColor] = useState("#3B7A57");

  useEffect(() => {
    if (open) {
      setName("");
    }
  }, [open]);

  const parentPlanet = targetParentId
    ? universe.planets[targetParentId]
    : null;
  const parentName = parentPlanet ? parentPlanet.name : universe.name;

  function handleCreate() {
    if (!name.trim()) return;
    addPlanet(name.trim(), icon, color, targetParentId);
    if (soundEnabled) playLevelUp();
    setName("");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="fixed z-50 inset-0 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="hud-panel p-6 xl:p-7 w-full max-w-md pointer-events-auto shadow-[0_0_60px_rgba(0,0,0,0.85)]">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-outfit uppercase tracking-wider text-teal-400">
                    <Orbit size={13} />
                    <span>Orbiting {parentName}</span>
                  </div>
                  <h2
                    className="text-xl font-semibold text-slate-100 mt-1"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    Launch Celestial Node
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-100 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Live Preview Orb */}
              <div className="mb-5 p-4 rounded-2xl bg-white/[0.025] border border-white/10 flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    background: color,
                    boxShadow: `0 0 24px ${color}88, inset 0 2px 4px rgba(255,255,255,0.25)`,
                  }}
                >
                  <DynamicIcon name={icon} size={26} color="white" />
                </div>
                <div>
                  <p
                    className="text-lg text-slate-100 font-semibold"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    {name.trim() || "Unnamed Satellite"}
                  </p>
                  <p className="text-xs text-slate-400 font-outfit mt-0.5">
                    100% Health · Level 1.0 · Orbiting {parentName}
                  </p>
                </div>
              </div>

              {/* Name Input */}
              <div className="mb-5">
                <label className="text-xs text-slate-400 font-outfit uppercase tracking-wider">
                  Sector / Planet Name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder={`e.g. ${
                    targetParentId ? "Strength, Meditation, Deep Work" : "Ventures, Finance, Art"
                  }`}
                  className="mt-1.5 w-full bg-white/5 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-outfit focus:outline-none focus:border-teal-400 placeholder-slate-500"
                />
              </div>

              {/* Domain Hue Picker */}
              <div className="mb-5">
                <label className="text-xs text-slate-400 font-outfit uppercase tracking-wider">
                  Domain Accent Hue
                </label>
                <div className="flex flex-wrap gap-2.5 mt-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110 cursor-pointer"
                      style={{
                        background: c,
                        boxShadow: color === c ? `0 0 14px ${c}` : "none",
                        outline:
                          color === c
                            ? "2px solid rgba(255, 255, 255, 0.9)"
                            : "none",
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Grid */}
              <div className="mb-6">
                <label className="text-xs text-slate-400 font-outfit uppercase tracking-wider">
                  Celestial Emblem
                </label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {ICON_OPTIONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        icon === ic
                          ? "bg-teal-400/20 text-teal-300 border border-teal-400/60 shadow-[0_0_12px_rgba(45,212,191,0.25)]"
                          : "bg-white/5 text-slate-400 border border-white/10 hover:border-white/25 hover:text-slate-200"
                      }`}
                      title={ic}
                    >
                      <DynamicIcon
                        name={ic}
                        size={18}
                        color={icon === ic ? "#2DD4BF" : "#cbd5e1"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  disabled={!name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold font-outfit transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: "#E5A93C", color: "#0D0F0E" }}
                >
                  <Sparkles size={15} />
                  <span>Launch into {parentName} Orbit</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full text-sm border border-slate-700 text-slate-300 hover:border-slate-500 font-outfit cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
