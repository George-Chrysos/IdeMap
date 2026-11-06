// ============================================================
// IdeMap — Tailwind CSS v4 config  (extend design tokens)
// ============================================================
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#0D0F0E",
        "hud-bg": "rgba(15,19,21,0.88)",
        "arc-cyan": "rgba(45,212,191,0.12)",
        "arc-amber": "rgba(234,179,8,0.08)",
        gold: "#E5A93C",
        "health-green": "#2DD4BF",
        "health-amber": "#F59E0B",
        "health-red": "#EF4444",
      },
      fontFamily: {
        fraunces: ["Fraunces", "Georgia", "serif"],
        outfit: ["Outfit", "system-ui", "sans-serif"],
      },
      backdropBlur: {
        hud: "12px",
      },
      boxShadow: {
        planet: "0 0 20px rgba(45,212,191,0.25)",
        "planet-amber": "0 0 20px rgba(234,179,8,0.25)",
        "planet-red": "0 0 20px rgba(239,68,68,0.25)",
      },
      animation: {
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
        "spin-slow": "spin 20s linear infinite",
        "glow-pulse": "glow-pulse 0.3s ease-out forwards",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "glow-pulse": {
          "0%": { filter: "brightness(1)" },
          "50%": { filter: "brightness(2)" },
          "100%": { filter: "brightness(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
