// ============================================================
// IdeMap — Deep Space Background Canvas (Isolated Layer)
// ============================================================
"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  o: number;
  speed: number;
  tint: string;
}

interface SpaceBackgroundProps {
  centerX?: number;
  centerY?: number;
  accentColor?: string;
}

export default function SpaceBackground({
  centerX,
  centerY,
  accentColor = "#2DD4BF",
}: SpaceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ centerX, centerY, accentColor });

  useEffect(() => {
    propsRef.current = { centerX, centerY, accentColor };
  }, [centerX, centerY, accentColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let stars: Star[] = [];

    const tints = [
      "226, 232, 240",
      "226, 232, 240",
      "153, 246, 228",
      "253, 230, 138",
    ];

    function buildStars() {
      if (!canvas) return;
      const count = Math.min(260, Math.floor((canvas.width * canvas.height) / 7000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.45 + 0.25,
        o: Math.random() * 0.55 + 0.12,
        speed: Math.random() * 0.0012 + 0.0003,
        tint: tints[Math.floor(Math.random() * tints.length)],
      }));
    }

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      buildStars();
    }

    let tick = 0;
    function draw() {
      if (!canvas || !ctx) return;
      tick += 0.012;

      // 1. Deep Void Obsidian-Charcoal (#0D0F0E)
      ctx.fillStyle = "#0D0F0E";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = propsRef.current.centerX ?? canvas.width * 0.42;
      const cy = propsRef.current.centerY ?? canvas.height * 0.5;
      const maxDim = Math.max(canvas.width, canvas.height);

      // 2. Ultra-soft radial ambient glow behind active celestial cluster
      const outerGlow = ctx.createRadialGradient(
        cx,
        cy,
        10,
        cx,
        cy,
        maxDim * 0.52
      );
      outerGlow.addColorStop(0, "rgba(45, 212, 191, 0.065)");
      outerGlow.addColorStop(0.35, "rgba(45, 212, 191, 0.025)");
      outerGlow.addColorStop(0.7, "rgba(234, 179, 8, 0.01)");
      outerGlow.addColorStop(1, "transparent");
      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Secondary warm core nebula glow
      const innerGlow = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        maxDim * 0.22
      );
      innerGlow.addColorStop(0, `${propsRef.current.accentColor}16`);
      innerGlow.addColorStop(0.6, `${propsRef.current.accentColor}06`);
      innerGlow.addColorStop(1, "transparent");
      ctx.fillStyle = innerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3. Twinkling starfield
      for (const star of stars) {
        const twinkle =
          star.o * (0.65 + 0.35 * Math.sin(tick * star.speed * 1000 + star.x));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.tint}, ${twinkle})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden
    />
  );
}
